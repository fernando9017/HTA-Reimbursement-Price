"""UK NICE (National Institute for Health and Care Excellence) adapter.

Data source: NICE published guidance listing pages (public HTML).
Fetches Technology Appraisal (TA) and Highly Specialised Technology (HST)
guidance from the NICE website and parses the HTML to extract guidance
metadata and recommendation outcomes.

No API key required for public website pages.
"""

import logging
import re
from pathlib import Path

import httpx

from app.config import (
    NICE_BASE_URL,
    NICE_GUIDANCE_BASE_URL,
    NICE_MAX_PAGES,
    NICE_PROGRAMME_TYPES,
    NICE_PUBLISHED_URL,
    REQUEST_TIMEOUT,
)
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Map NICE recommendation keywords to standardised display values
RECOMMENDATION_DISPLAY = {
    "recommended": "Recommended",
    "recommended for use in the nhs": "Recommended",
    "optimised": "Recommended with restrictions (Optimised)",
    "recommended with restrictions": "Recommended with restrictions (Optimised)",
    "recommended for use within its marketing authorisation": "Recommended",
    "recommended as an option": "Recommended",
    "not recommended": "Not recommended",
    "only in research": "Only in research",
    "terminated appraisal": "Terminated appraisal",
    "awaiting development": "Awaiting development",
}


class UKNICE(HTAAgency):
    """NICE (National Institute for Health and Care Excellence) — UK's HTA agency."""

    def __init__(self) -> None:
        self._guidance_list: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "GB"

    @property
    def country_name(self) -> str:
        return "United Kingdom"

    @property
    def agency_abbreviation(self) -> str:
        return "NICE"

    @property
    def agency_full_name(self) -> str:
        return "National Institute for Health and Care Excellence"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch NICE published guidance listing pages and parse them."""
        all_guidance: list[dict] = []

        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        ) as client:
            for programme_type in NICE_PROGRAMME_TYPES:
                guidance = await self._fetch_guidance_listing(client, programme_type)
                all_guidance.extend(guidance)

        if not all_guidance:
            raise RuntimeError(
                "NICE data fetch returned 0 guidance entries — "
                "the website structure may have changed or the pages "
                "could not be fetched. Check "
                "https://www.nice.org.uk/guidance/published"
            )

        self._guidance_list = all_guidance
        self._loaded = True
        logger.info("UK NICE data loaded: %d guidance entries", len(self._guidance_list))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find NICE Technology Appraisals matching the given substance or product.

        When matches are found but the recommendation is missing from the
        listing data, this method makes one extra HTTP call per matched
        guidance to fetch the individual guidance page and extract the
        recommendation directly.
        """
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        matched: list[dict] = []
        for g in self._guidance_list:
            title_lower = g.get("title", "").lower()

            substance_match = substance_lower in title_lower
            product_match = product_lower and product_lower in title_lower

            if substance_match or product_match:
                matched.append(g)

        if not matched:
            return []

        # For any matched guidance missing its recommendation, fetch the
        # individual guidance page to extract it.  Cap at 5 fetches to
        # avoid excessive network calls.
        needs_fetch = [g for g in matched if not g.get("recommendation")]
        if needs_fetch:
            async with httpx.AsyncClient(
                timeout=REQUEST_TIMEOUT,
                follow_redirects=True,
                headers={
                    "User-Agent": "VAP-Global-Resources/0.1 (research tool)",
                    "Accept": "text/html",
                },
            ) as client:
                for g in needs_fetch[:5]:
                    url = g.get("url", "")
                    if not url:
                        continue
                    try:
                        resp = await client.get(url)
                        resp.raise_for_status()
                        rec, date = _extract_from_guidance_page(resp.text)
                        if rec:
                            g["recommendation"] = rec
                        if date and not g.get("published_date"):
                            g["published_date"] = date
                    except Exception:
                        logger.debug("Failed to fetch NICE guidance page %s", url)

        results = []
        for g in matched:
            recommendation = g.get("recommendation", "")
            rec_display = _normalize_recommendation(recommendation)

            # Build a concise English summary
            summary_parts: list[str] = []
            if rec_display:
                summary_parts.append(f"NICE {g.get('guidance_type', 'TA')}: {rec_display}")
            ref = g.get("reference", "")
            if ref:
                summary_parts.append(ref)

            results.append(
                AssessmentResult(
                    product_name=product_name or active_substance,
                    evaluation_reason=g.get("title", ""),
                    opinion_date=g.get("published_date", ""),
                    assessment_url=g.get("url", ""),
                    nice_recommendation=rec_display,
                    guidance_reference=ref,
                    guidance_type=g.get("guidance_type", ""),
                    summary_en=" | ".join(summary_parts),
                )
            )

        # Sort most recent first
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading helpers ──────────────────────────────────────────

    async def _fetch_guidance_listing(
        self,
        client: httpx.AsyncClient,
        programme_type: str,
    ) -> list[dict]:
        """Fetch all pages of a NICE published guidance listing."""
        all_items: list[dict] = []

        for page in range(1, NICE_MAX_PAGES + 1):
            params = {
                "ngt": programme_type,
                "ndt": "Guidance",
                "ps": "50",
                "page": str(page),
            }
            try:
                resp = await client.get(NICE_PUBLISHED_URL, params=params)
                resp.raise_for_status()
                html = resp.text
            except Exception:
                logger.warning(
                    "Failed to fetch NICE listing page %d for %s",
                    page, programme_type,
                )
                break

            items = self._parse_listing_page(html, programme_type)
            if not items:
                break  # No more results on this page

            all_items.extend(items)
            logger.debug("NICE %s page %d: %d items", programme_type, page, len(items))

        return all_items

    def _parse_listing_page(self, html: str, programme_type: str) -> list[dict]:
        """Parse a NICE published guidance listing page HTML.

        Tries multiple HTML patterns to be resilient against minor layout changes.
        """
        return self._parse_guidance_html(html, programme_type)

    def _parse_guidance_html(self, html: str, programme_type: str) -> list[dict]:
        """Extract guidance items from NICE listing HTML using regex patterns."""
        items: list[dict] = []
        seen_refs: set[str] = set()

        # Pattern 1: Links to /guidance/taXXX or /guidance/hstXXX
        # These appear in various list/table structures on the NICE website
        guidance_links = re.findall(
            r'href="(/guidance/(ta|hst)(\d+))"[^>]*>([^<]+)</a>',
            html, re.IGNORECASE,
        )
        for path, gtype, number, title in guidance_links:
            ref = f"{gtype.upper()}{number}"
            if ref in seen_refs:
                continue
            seen_refs.add(ref)

            title = _clean_html_text(title)
            url = NICE_BASE_URL + path

            # Try to extract date near this item
            date = self._extract_date_near(html, path)

            # Try to extract recommendation from listing context
            recommendation = self._extract_recommendation_near(html, path)

            items.append({
                "reference": ref,
                "title": title,
                "url": url,
                "published_date": date,
                "guidance_type": programme_type,
                "recommendation": recommendation,
            })

        # Pattern 2: Structured list items with data attributes or class names
        # Matches: <h3 class="..."><a href="/guidance/ta123">Title</a></h3>
        # Also handles multi-line link text, e.g. with <span> inside <a>
        if not items:
            pattern = re.compile(
                r'<a\s+href="(/guidance/(ta|hst)(\d+))"[^>]*>\s*'
                r'(.*?)\s*</a>',
                re.IGNORECASE | re.DOTALL,
            )
            for match in pattern.finditer(html):
                path = match.group(1)
                gtype = match.group(2)
                number = match.group(3)
                title_raw = match.group(4)

                ref = f"{gtype.upper()}{number}"
                if ref in seen_refs:
                    continue
                seen_refs.add(ref)

                title = _clean_html_text(title_raw)
                url = NICE_BASE_URL + path
                date = self._extract_date_near(html, path)
                recommendation = self._extract_recommendation_near(html, path)

                items.append({
                    "reference": ref,
                    "title": title,
                    "url": url,
                    "published_date": date,
                    "guidance_type": programme_type,
                    "recommendation": recommendation,
                })

        # Pattern 3: JSON-LD or embedded JSON data (modern NICE pages may
        # embed structured data that includes guidance references)
        if not items:
            json_pattern = re.compile(
                r'"/guidance/(ta|hst)(\d+)"',
                re.IGNORECASE,
            )
            for match in json_pattern.finditer(html):
                gtype = match.group(1)
                number = match.group(2)
                ref = f"{gtype.upper()}{number}"
                if ref in seen_refs:
                    continue
                seen_refs.add(ref)

                path = f"/guidance/{gtype.lower()}{number}"
                url = NICE_BASE_URL + path

                # Try to find a title near this reference in the JSON/HTML
                title = self._extract_title_near(html, path)
                date = self._extract_date_near(html, path)
                recommendation = self._extract_recommendation_near(html, path)

                items.append({
                    "reference": ref,
                    "title": title or ref,
                    "url": url,
                    "published_date": date,
                    "guidance_type": programme_type,
                    "recommendation": recommendation,
                })

        return items

    def _extract_title_near(self, html: str, path: str) -> str:
        """Try to find a title near a guidance path reference."""
        escaped_path = re.escape(path)
        match = re.search(escaped_path, html)
        if match:
            # Look in the surrounding context for title-like text
            start = max(0, match.start() - 200)
            context = html[start:match.end() + 500]

            # Look for title attribute or nearby text content
            title_match = re.search(
                r'title="([^"]+)"',
                context,
            )
            if title_match:
                return _clean_html_text(title_match.group(1))

            # Look for text after the closing tag of the element containing the href
            text_match = re.search(
                r'>([^<]{10,})</(?:a|h\d|span|div)',
                context[context.index(path):] if path in context else context,
            )
            if text_match:
                return _clean_html_text(text_match.group(1))

        return ""

    def _extract_date_near(self, html: str, path: str) -> str:
        """Try to find a published date near a guidance link in the HTML."""
        # Look for date patterns near the link path
        escaped_path = re.escape(path)

        # Try to find a date within ~500 chars after the link
        after_match = re.search(escaped_path, html)
        if after_match:
            context = html[after_match.end():after_match.end() + 500]

            # Pattern: DD Month YYYY
            date_match = re.search(
                r'(\d{1,2})\s+(January|February|March|April|May|June|July|'
                r'August|September|October|November|December)\s+(\d{4})',
                context,
            )
            if date_match:
                return _parse_date_text(
                    date_match.group(1),
                    date_match.group(2),
                    date_match.group(3),
                )

            # Pattern: YYYY-MM-DD
            iso_match = re.search(r'(\d{4}-\d{2}-\d{2})', context)
            if iso_match:
                return iso_match.group(1)

        return ""

    def _extract_recommendation_near(self, html: str, path: str) -> str:
        """Try to find a recommendation status near a guidance link."""
        escaped_path = re.escape(path)
        after_match = re.search(escaped_path, html)
        if after_match:
            context = html[after_match.end():after_match.end() + 800].lower()

            # Look for common recommendation text patterns
            for keyword in [
                "not recommended",
                "recommended for use",
                "recommended with restrictions",
                "recommended as an option",
                "recommended",
                "optimised",
                "only in research",
                "terminated",
            ]:
                if keyword in context:
                    return keyword

        return ""

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._guidance_list = payload["data"]
        self._loaded = bool(self._guidance_list)
        if self._loaded:
            logger.info(
                "%s loaded %d guidance entries from %s",
                self.agency_abbreviation, len(self._guidance_list), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._write_json_file(data_file, self._make_envelope(self._guidance_list))
        logger.info(
            "%s saved %d guidance entries to %s",
            self.agency_abbreviation, len(self._guidance_list), data_file,
        )


def _clean_html_text(text: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&#\d+;", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _parse_date_text(day: str, month_name: str, year: str) -> str:
    """Convert 'DD Month YYYY' to 'YYYY-MM-DD'."""
    months = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
    }
    month = months.get(month_name.lower(), "01")
    return f"{year}-{month}-{int(day):02d}"


def _extract_from_guidance_page(html: str) -> tuple[str, str]:
    """Extract recommendation and date from an individual NICE guidance page.

    Individual guidance pages (e.g. /guidance/ta788) contain structured
    information including recommendation status in well-defined sections,
    which is much more reliable than trying to extract from listing pages.

    Returns (recommendation, published_date) — either may be empty.
    """
    recommendation = ""
    published_date = ""

    lower = html.lower()

    # --- Recommendation ---
    # Pattern 1: Look for recommendation keywords in structured sections
    # NICE pages typically have a section like:
    #   "This guidance recommends..." or "Recommended for use..."
    #   or a badge/label with the recommendation status.

    # Check for "not recommended" before "recommended" to avoid false match
    rec_patterns = [
        (r"not\s+recommended", "not recommended"),
        (r"recommended\s+for\s+use\s+in\s+the\s+nhs", "recommended"),
        (r"recommended\s+with\s+(?:restrictions|managed\s+access)", "recommended with restrictions"),
        (r"recommended\s+as\s+an\s+option", "recommended"),
        (r"terminated\s+appraisal", "terminated"),
        (r"only\s+in\s+research", "only in research"),
        (r"optimised", "optimised"),
    ]

    # First try in metadata / structured markup
    # NICE pages often have: <span class="...">Recommended</span> or similar
    meta_section = ""
    # Look for recommendation in first 20k chars (header/summary area)
    meta_section = lower[:20000]

    for pattern, value in rec_patterns:
        if re.search(pattern, meta_section):
            recommendation = value
            break

    # If not found in meta, try the full page but with stricter context
    if not recommendation:
        # Look for "is recommended" / "is not recommended" patterns
        if re.search(r"\bis\s+not\s+recommended\b", lower):
            recommendation = "not recommended"
        elif re.search(r"\bis\s+recommended\b", lower):
            recommendation = "recommended"

    # --- Published date ---
    date_match = re.search(
        r'(\d{1,2})\s+(January|February|March|April|May|June|July|'
        r'August|September|October|November|December)\s+(\d{4})',
        html,
    )
    if date_match:
        published_date = _parse_date_text(
            date_match.group(1), date_match.group(2), date_match.group(3),
        )

    return recommendation, published_date


def _normalize_recommendation(raw: str) -> str:
    """Normalize a recommendation string to a standard display value."""
    if not raw:
        return ""
    lower = raw.lower().strip()
    # Check longer/more-specific patterns first to avoid false matches
    # (e.g. "not recommended" must be checked before "recommended")
    sorted_keywords = sorted(RECOMMENDATION_DISPLAY.keys(), key=len, reverse=True)
    for keyword in sorted_keywords:
        if keyword in lower:
            return RECOMMENDATION_DISPLAY[keyword]
    return raw.strip().capitalize()
