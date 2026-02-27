"""UK NICE (National Institute for Health and Care Excellence) adapter.

Data sources (tried in order of preference):
1. NICE API — structured JSON endpoint for published guidance.
2. NICE HTML listing — paginated HTML pages scraped for TA/HST guidance.
3. Gap-filling — individual guidance pages fetched for any TA/HST numbers
   discovered to be missing after the listing scrape, ensuring comprehensive
   coverage of all ~750+ TAs and ~35+ HSTs published to date.

No API key required for public website pages or the API endpoint.
"""

import asyncio
import json
import logging
import re
from pathlib import Path

import httpx

from app.config import (
    NICE_API_URL,
    NICE_BASE_URL,
    NICE_GAP_FILL_CONCURRENCY,
    NICE_GUIDANCE_BASE_URL,
    NICE_HST_MAX_NUMBER,
    NICE_MAX_PAGES,
    NICE_PROGRAMME_TYPES,
    NICE_PUBLISHED_URL,
    NICE_TA_MAX_NUMBER,
    REQUEST_TIMEOUT,
    SSL_VERIFY,
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
        # Brand ↔ substance mappings (populated from EMA data)
        self._brand_to_substance: dict[str, str] = {}  # "keytruda" → "pembrolizumab"
        self._substance_to_brands: dict[str, set[str]] = {}  # "pembrolizumab" → {"keytruda"}

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

    def set_brand_mapping(self, ema_medicines: list[dict]) -> None:
        """Build brand ↔ substance mappings from EMA medicine data.

        This allows the adapter to resolve brand names (e.g. "Keytruda")
        to INN substances (e.g. "pembrolizumab") and vice-versa, enabling
        search by either molecule or brand name.
        """
        brand_to_sub: dict[str, str] = {}
        sub_to_brands: dict[str, set[str]] = {}

        for med in ema_medicines:
            substance = (med.get("activeSubstance") or "").lower().strip()
            name = (med.get("medicineName") or med.get("name") or "").lower().strip()
            if not substance or not name:
                continue
            # Skip entries where name == substance (no brand info)
            if name == substance:
                continue
            brand_to_sub[name] = substance
            sub_to_brands.setdefault(substance, set()).add(name)

        self._brand_to_substance = brand_to_sub
        self._substance_to_brands = sub_to_brands
        if brand_to_sub:
            logger.info(
                "NICE brand mapping loaded: %d brand→substance entries",
                len(brand_to_sub),
            )

    async def load_data(self) -> None:
        """Fetch NICE guidance data using API, HTML listing, and gap-filling.

        Strategy:
        1. Try the NICE JSON API first (fastest, most reliable).
        2. Fall back to HTML listing page scraping.
        3. Gap-fill any missing TA/HST numbers by fetching individual pages.
        """
        all_guidance: list[dict] = []

        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            verify=SSL_VERIFY,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        ) as client:
            # Strategy 1: Try NICE API (JSON)
            api_guidance = await self._fetch_guidance_api(client)
            if api_guidance:
                all_guidance.extend(api_guidance)
                logger.info(
                    "NICE API returned %d guidance entries", len(api_guidance),
                )

            # Strategy 2: HTML listing page scraping (supplements API or acts as fallback)
            html_guidance = []
            for programme_type in NICE_PROGRAMME_TYPES:
                guidance = await self._fetch_guidance_listing(client, programme_type)
                html_guidance.extend(guidance)

            if html_guidance:
                # Merge HTML results with API results, avoiding duplicates
                existing_refs = {g["reference"] for g in all_guidance}
                new_items = [g for g in html_guidance if g["reference"] not in existing_refs]
                all_guidance.extend(new_items)
                logger.info(
                    "NICE HTML listing returned %d items (%d new after dedup)",
                    len(html_guidance), len(new_items),
                )

            # Strategy 3: Gap-fill missing TA/HST numbers
            gap_filled = await self._fill_guidance_gaps(client, all_guidance)
            if gap_filled:
                all_guidance.extend(gap_filled)
                logger.info(
                    "NICE gap-filling added %d additional guidance entries",
                    len(gap_filled),
                )

        if not all_guidance:
            raise RuntimeError(
                "NICE data fetch returned 0 guidance entries — "
                "the website structure may have changed or the pages "
                "could not be fetched. Check "
                "https://www.nice.org.uk/guidance/published"
            )

        self._guidance_list = all_guidance
        self._loaded = True
        ta_count = sum(1 for g in all_guidance if g.get("reference", "").startswith("TA"))
        hst_count = sum(1 for g in all_guidance if g.get("reference", "").startswith("HST"))
        logger.info(
            "UK NICE data loaded: %d total guidance entries (%d TAs, %d HSTs)",
            len(self._guidance_list), ta_count, hst_count,
        )

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find NICE Technology Appraisals matching the given substance or product.

        Searches the guidance title **and** the URL slug to catch cases
        where a drug name appears in the URL but not the display title.
        Also consults the brand-name mapping (populated from EMA data) so
        that users can search by either INN (molecule) or brand name,
        matching the behaviour of the Germany G-BA adapter.

        When matches are found but the recommendation is missing from the
        listing data, this method makes one extra HTTP call per matched
        guidance to fetch the individual guidance page and extract the
        recommendation directly.
        """
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        # Resolve brand name → INN via mapping (e.g. "Keytruda" → "pembrolizumab")
        extra_terms: set[str] = set()
        if substance_lower in self._brand_to_substance:
            extra_terms.add(self._brand_to_substance[substance_lower])
        if product_lower and product_lower in self._brand_to_substance:
            extra_terms.add(self._brand_to_substance[product_lower])
        # Also resolve INN → brand names
        if substance_lower in self._substance_to_brands:
            extra_terms.update(self._substance_to_brands[substance_lower])
        if product_lower and product_lower in self._substance_to_brands:
            extra_terms.update(self._substance_to_brands[product_lower])

        matched: list[dict] = []
        for g in self._guidance_list:
            title_lower = g.get("title", "").lower()
            url_lower = g.get("url", "").lower()

            # Search title and URL slug
            substance_match = (
                substance_lower in title_lower
                or substance_lower in url_lower
            )
            product_match = product_lower and (
                product_lower in title_lower
                or product_lower in url_lower
            )
            # Also try resolved brand/substance terms
            extra_match = any(
                term in title_lower or term in url_lower
                for term in extra_terms
            ) if extra_terms else False

            if substance_match or product_match or extra_match:
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
                verify=SSL_VERIFY,
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

    # ── Strategy 1: NICE API (JSON) ───────────────────────────────────

    async def _fetch_guidance_api(self, client: httpx.AsyncClient) -> list[dict]:
        """Try the NICE JSON API endpoint for published guidance data.

        The NICE API returns structured JSON with guidance metadata including
        title, reference, published date, and recommendation status.  This is
        faster and more reliable than HTML scraping.
        """
        all_items: list[dict] = []

        for programme_type in NICE_PROGRAMME_TYPES:
            try:
                items = await self._fetch_api_programme_type(client, programme_type)
                all_items.extend(items)
            except Exception:
                logger.debug(
                    "NICE API not available for %s — will fall back to HTML",
                    programme_type,
                )

        return all_items

    async def _fetch_api_programme_type(
        self, client: httpx.AsyncClient, programme_type: str,
    ) -> list[dict]:
        """Fetch all pages of a programme type from the NICE API."""
        items: list[dict] = []
        seen_refs: set[str] = set()

        for page in range(1, NICE_MAX_PAGES + 1):
            params = {
                "ngt": programme_type,
                "ps": "50",
                "page": str(page),
            }
            try:
                resp = await client.get(
                    NICE_API_URL,
                    params=params,
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "VAP-Global-Resources/0.1 (research tool)",
                    },
                )
                resp.raise_for_status()
                data = resp.json()
            except (httpx.HTTPStatusError, json.JSONDecodeError):
                # API not available or returned non-JSON — stop trying this source
                if page == 1:
                    raise  # Re-raise so caller can fall back
                break
            except Exception:
                if page == 1:
                    raise
                break

            # Parse the JSON response — handle multiple possible structures
            page_items = self._parse_api_response(data, programme_type, seen_refs)
            if not page_items:
                break

            items.extend(page_items)
            logger.debug("NICE API %s page %d: %d items", programme_type, page, len(page_items))

        return items

    def _parse_api_response(
        self, data: dict | list, programme_type: str, seen_refs: set[str],
    ) -> list[dict]:
        """Parse a NICE API JSON response into guidance items.

        Handles multiple known response structures:
        - {"results": [...]} — paginated list
        - [{"guidanceReference": "TA123", ...}, ...] — direct list
        - {"data": {"results": [...]}} — wrapped format
        """
        results_list: list = []

        if isinstance(data, list):
            results_list = data
        elif isinstance(data, dict):
            results_list = (
                data.get("results")
                or data.get("data", {}).get("results")
                or data.get("guidance")
                or data.get("items")
                or []
            )

        if not results_list:
            return []

        items: list[dict] = []
        for entry in results_list:
            if not isinstance(entry, dict):
                continue

            # Extract reference (TA/HST number)
            ref = (
                entry.get("guidanceReference", "")
                or entry.get("reference", "")
                or entry.get("id", "")
            )
            if not ref:
                # Try to extract from URL
                url = entry.get("url", "") or entry.get("links", {}).get("self", "")
                ref_match = re.search(r"(ta|hst)(\d+)", url, re.IGNORECASE)
                if ref_match:
                    ref = f"{ref_match.group(1).upper()}{ref_match.group(2)}"

            if not ref or ref in seen_refs:
                continue

            # Only accept TA/HST references
            if not re.match(r"^(TA|HST)\d+$", ref, re.IGNORECASE):
                continue

            seen_refs.add(ref)

            title = (
                entry.get("title", "")
                or entry.get("guidanceTitle", "")
                or entry.get("name", "")
            )

            url = entry.get("url", "") or entry.get("links", {}).get("self", "")
            if not url:
                url = f"{NICE_BASE_URL}/guidance/{ref.lower()}"
            elif not url.startswith("http"):
                url = NICE_BASE_URL + url

            # Date
            pub_date = (
                entry.get("publishedDate", "")
                or entry.get("lastModified", "")
                or entry.get("datePublished", "")
            )
            if pub_date and "T" in pub_date:
                pub_date = pub_date[:10]  # Extract YYYY-MM-DD from ISO datetime

            # Recommendation
            recommendation = (
                entry.get("recommendation", "")
                or entry.get("recommendationStatus", "")
                or entry.get("status", "")
            )

            items.append({
                "reference": ref.upper(),
                "title": title,
                "url": url,
                "published_date": pub_date,
                "guidance_type": programme_type,
                "recommendation": recommendation.lower() if recommendation else "",
            })

        return items

    # ── Strategy 2: HTML listing scraping ─────────────────────────────

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

        # Pattern 4: React/Vue-style data attributes and aria labels
        # Modern NICE pages may use data-* attributes with guidance info
        if not items:
            data_pattern = re.compile(
                r'data-(?:guidance-)?(?:ref|id)="(ta|hst)(\d+)"',
                re.IGNORECASE,
            )
            for match in data_pattern.finditer(html):
                gtype = match.group(1)
                number = match.group(2)
                ref = f"{gtype.upper()}{number}"
                if ref in seen_refs:
                    continue
                seen_refs.add(ref)

                path = f"/guidance/{gtype.lower()}{number}"
                url = NICE_BASE_URL + path
                title = self._extract_title_near(html, path) or ref
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

        return items

    # ── Strategy 3: Gap-filling ───────────────────────────────────────

    async def _fill_guidance_gaps(
        self,
        client: httpx.AsyncClient,
        existing: list[dict],
    ) -> list[dict]:
        """Identify missing TA/HST numbers and fetch individual pages to fill gaps.

        Compares the TA/HST numbers already collected against the known maximum
        range, then concurrently fetches individual guidance pages for any gaps.
        This ensures near-100% coverage of all published NICE guidance.
        """
        existing_refs = {g["reference"] for g in existing}

        # Determine which TA/HST numbers we're missing
        missing_tas: list[int] = []
        for n in range(1, NICE_TA_MAX_NUMBER + 1):
            ref = f"TA{n}"
            if ref not in existing_refs:
                missing_tas.append(n)

        missing_hsts: list[int] = []
        for n in range(1, NICE_HST_MAX_NUMBER + 1):
            ref = f"HST{n}"
            if ref not in existing_refs:
                missing_hsts.append(n)

        total_missing = len(missing_tas) + len(missing_hsts)
        if total_missing == 0:
            return []

        logger.info(
            "NICE gap-fill: %d existing, %d missing TAs + %d missing HSTs to check",
            len(existing_refs), len(missing_tas), len(missing_hsts),
        )

        # Build list of (reference, url) pairs to fetch
        to_fetch: list[tuple[str, str]] = []
        for n in missing_tas:
            ref = f"TA{n}"
            url = f"{NICE_BASE_URL}/guidance/ta{n}"
            to_fetch.append((ref, url))
        for n in missing_hsts:
            ref = f"HST{n}"
            url = f"{NICE_BASE_URL}/guidance/hst{n}"
            to_fetch.append((ref, url))

        # Fetch in batches with concurrency control
        semaphore = asyncio.Semaphore(NICE_GAP_FILL_CONCURRENCY)
        found: list[dict] = []

        async def fetch_one(ref: str, url: str) -> dict | None:
            async with semaphore:
                try:
                    resp = await client.get(url)
                    if resp.status_code == 404:
                        return None  # This TA/HST number doesn't exist
                    resp.raise_for_status()
                    html = resp.text

                    # Verify this is actually a TA/HST page (not a redirect to generic page)
                    if f"/guidance/{ref.lower()}" not in resp.url.path.lower():
                        return None

                    rec, date = _extract_from_guidance_page(html)
                    title = _extract_title_from_page(html)

                    if not title:
                        return None  # Not a valid guidance page

                    gtype = "Technology appraisal guidance" if ref.startswith("TA") else "Highly specialised technologies guidance"

                    return {
                        "reference": ref,
                        "title": title,
                        "url": url,
                        "published_date": date,
                        "guidance_type": gtype,
                        "recommendation": rec,
                    }
                except Exception:
                    return None

        # Run all fetches concurrently
        tasks = [fetch_one(ref, url) for ref, url in to_fetch]
        results = await asyncio.gather(*tasks)

        for result in results:
            if result is not None:
                found.append(result)

        return found

    # ── HTML extraction helpers ───────────────────────────────────────

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
        self._safe_write_json_file(data_file, self._make_envelope(self._guidance_list))
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


def _extract_title_from_page(html: str) -> str:
    """Extract the guidance title from an individual NICE guidance page.

    Tries multiple approaches: <title> tag, <h1>, and meta og:title.
    """
    # Try <title> tag first — typically "Title | Guidance | NICE"
    title_match = re.search(r"<title[^>]*>(.+?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match:
        raw = _clean_html_text(title_match.group(1))
        # Strip common NICE suffixes
        for suffix in [" | Guidance | NICE", " | NICE", " - NICE"]:
            if raw.endswith(suffix):
                raw = raw[:-len(suffix)]
        if raw and len(raw) > 5:
            return raw

    # Try <h1>
    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    if h1_match:
        title = _clean_html_text(h1_match.group(1))
        if title and len(title) > 5:
            return title

    # Try og:title meta tag
    og_match = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', html, re.IGNORECASE)
    if og_match:
        return _clean_html_text(og_match.group(1))

    return ""


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
