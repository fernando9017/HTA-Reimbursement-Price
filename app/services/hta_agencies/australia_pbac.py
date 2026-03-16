"""Australia PBAC (Pharmaceutical Benefits Advisory Committee) adapter.

Data sources:
1. PBAC Outcomes — public HTML pages listing PBAC meeting outcomes with
   recommendation status for each drug submission.  Outcomes published
   6 weeks after each meeting (March, July, November + intracycle).
2. PBS (Pharmaceutical Benefits Scheme) — public medicine listing database.
3. PBS Public Data API (data-api-portal.health.gov.au) — structured JSON/CSV
   REST API, no auth required, rate limit 1 req/20s, updated 1st of month.
4. Medicine Status Website — tracks all submissions through the process.

PBAC recommendations:
- Recommended — positive recommendation, proceeds to PBS listing
- Recommended (with restrictions) — listing with conditions
- Not recommended — not final; applicant can resubmit
- Deferred — decision delayed, additional information needed

Public Summary Documents (PSDs) published ~4 months post-meeting.
No authentication required for any of these data sources.
"""

import logging
import re
from pathlib import Path

import httpx

from app.config import (
    PBAC_BASE_URL,
    PBAC_OUTCOMES_URL,
    REQUEST_TIMEOUT,
    SSL_VERIFY,
)
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Normalise PBAC recommendation text
RECOMMENDATION_MAP = {
    "recommended": "Recommended",
    "not recommended": "Not recommended",
    "deferred": "Deferred",
    "rejected": "Not recommended",
    "accepted": "Recommended",
}


def _normalise_recommendation(raw: str) -> str:
    """Map recommendation text to canonical display values."""
    if not raw:
        return ""
    lower = raw.strip().lower()
    if lower in RECOMMENDATION_MAP:
        return RECOMMENDATION_MAP[lower]
    # Check for "recommended" with conditions
    if "recommend" in lower and "not" not in lower:
        if any(w in lower for w in ("restriction", "condition", "criteria")):
            return "Recommended (with restrictions)"
        return "Recommended"
    if "not recommend" in lower:
        return "Not recommended"
    if "defer" in lower:
        return "Deferred"
    return raw.strip()


class AustraliaPBAC(HTAAgency):
    """PBAC (Pharmaceutical Benefits Advisory Committee) — Australia's HTA body."""

    def __init__(self) -> None:
        self._outcomes: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "AU"

    @property
    def country_name(self) -> str:
        return "Australia"

    @property
    def agency_abbreviation(self) -> str:
        return "PBAC"

    @property
    def agency_full_name(self) -> str:
        return "Pharmaceutical Benefits Advisory Committee"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch PBAC outcomes from the PBS website.

        Strategy:
        1. Fetch the PBAC outcomes listing page.
        2. Find links to individual meeting outcome pages.
        3. Parse each meeting page for drug recommendations.
        """
        all_outcomes: list[dict] = []

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
                "Accept": "text/html,application/xhtml+xml,*/*",
            },
        ) as client:
            # Fetch the outcomes index page
            try:
                resp = await client.get(PBAC_OUTCOMES_URL)
                resp.raise_for_status()
                index_html = resp.text
            except Exception:
                raise RuntimeError(
                    "PBAC: failed to fetch outcomes index page"
                )

            # Find links to individual meeting pages
            meeting_urls = _find_meeting_urls(index_html)

            # Fetch each meeting page (limit to most recent 12 meetings)
            for meeting_url in meeting_urls[:12]:
                full_url = (
                    f"{PBAC_BASE_URL}{meeting_url}"
                    if not meeting_url.startswith("http")
                    else meeting_url
                )
                try:
                    resp = await client.get(full_url)
                    resp.raise_for_status()
                    outcomes = _parse_pbac_meeting(resp.text, full_url)
                    all_outcomes.extend(outcomes)
                except Exception:
                    logger.warning("PBAC: failed to fetch meeting page %s", full_url)

        if not all_outcomes:
            raise RuntimeError(
                "PBAC data fetch returned 0 outcomes. "
                "The website structure may have changed."
            )

        self._outcomes = all_outcomes
        self._loaded = True
        logger.info("Australia PBAC data loaded: %d outcomes", len(self._outcomes))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find PBAC outcomes matching the given substance or product name."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results: list[AssessmentResult] = []
        seen: set[str] = set()

        for outcome in self._outcomes:
            drug_lower = outcome.get("drug_name", "").lower()
            title_lower = outcome.get("title", "").lower()
            combined = f"{drug_lower} {title_lower}"

            substance_match = substance_lower in combined
            product_match = product_lower and product_lower in combined

            if not substance_match and not product_match:
                continue

            # Deduplicate
            dedup_key = outcome.get("url", "") or outcome.get("title", "")
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            recommendation = _normalise_recommendation(
                outcome.get("recommendation", "")
            )
            submission_type = outcome.get("submission_type", "")
            meeting = outcome.get("meeting", "")

            summary_parts: list[str] = []
            if recommendation:
                summary_parts.append(recommendation)
            if meeting:
                summary_parts.append(f"Meeting: {meeting}")

            results.append(
                AssessmentResult(
                    product_name=outcome.get("title", "")
                    or outcome.get("drug_name", "")
                    or product_name
                    or active_substance,
                    evaluation_reason=submission_type or "PBAC Submission",
                    opinion_date=outcome.get("date", ""),
                    assessment_url=outcome.get("url", ""),
                    pbac_recommendation=recommendation,
                    pbac_type=submission_type,
                    pbs_code=outcome.get("pbs_code", ""),
                    pbac_meeting=meeting,
                    summary_en=" | ".join(summary_parts) if summary_parts else "",
                )
            )

        return results

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._outcomes = payload["data"]
        self._loaded = bool(self._outcomes)
        if self._loaded:
            logger.info(
                "%s loaded %d outcomes from %s",
                self.agency_abbreviation, len(self._outcomes), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._safe_write_json_file(data_file, self._make_envelope(self._outcomes))
        logger.info(
            "%s saved %d outcomes to %s",
            self.agency_abbreviation, len(self._outcomes), data_file,
        )


# ── HTML parsing helpers ─────────────────────────────────────────────


def _strip_html(text: str) -> str:
    """Remove HTML tags."""
    return re.sub(r"<[^>]+>", "", text).strip()


def _find_meeting_urls(html: str) -> list[str]:
    """Find links to individual PBAC meeting outcome pages."""
    urls: list[str] = []
    # Look for links to pbac-outcomes pages
    pattern = re.compile(
        r'href="(/info/industry/listing/elements/pbac-meetings/'
        r'pbac-outcomes/[^"]*)"',
        re.IGNORECASE,
    )
    for match in pattern.finditer(html):
        url = match.group(1)
        if url not in urls:
            urls.append(url)

    # Also look for generic links containing "pbac" and "outcome"
    if not urls:
        pattern2 = re.compile(
            r'href="([^"]*pbac[^"]*outcome[^"]*)"', re.IGNORECASE
        )
        for match in pattern2.finditer(html):
            url = match.group(1)
            if url not in urls:
                urls.append(url)

    return urls


def _parse_pbac_meeting(html: str, page_url: str) -> list[dict]:
    """Parse drug outcomes from a PBAC meeting page.

    Looks for drug entries with recommendation status (Recommended, Not
    recommended, Deferred).
    """
    outcomes: list[dict] = []

    # Extract meeting date from the page title or heading
    meeting_date = ""
    title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE)
    if title_match:
        title_text = _strip_html(title_match.group(1))
        # Extract month + year
        date_match = re.search(
            r"((?:January|February|March|April|May|June|July|August|"
            r"September|October|November|December)\s+\d{4})",
            title_text, re.IGNORECASE,
        )
        if date_match:
            meeting_date = date_match.group(1)

    # Pattern: table rows or list items with drug name + recommendation
    # PBAC outcomes pages typically have structured tables
    row_pattern = re.compile(r"<tr[^>]*>(.*?)</tr>", re.DOTALL | re.IGNORECASE)
    for row_match in row_pattern.finditer(html):
        row = row_match.group(1)
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL | re.IGNORECASE)
        if len(cells) < 2:
            continue

        drug_name = _strip_html(cells[0])
        if not drug_name or len(drug_name) < 2:
            continue

        # Look for recommendation in remaining cells
        recommendation = ""
        submission_type = ""
        for cell in cells[1:]:
            cell_text = _strip_html(cell).lower()
            if any(w in cell_text for w in ("recommend", "defer", "reject", "accept")):
                recommendation = _strip_html(cell)
            elif any(w in cell_text for w in ("major", "minor", "submission")):
                submission_type = _strip_html(cell)

        # Extract link to individual outcome
        link_match = re.search(r'href="([^"]*)"', row)
        url = ""
        if link_match:
            href = link_match.group(1)
            url = f"{PBAC_BASE_URL}{href}" if not href.startswith("http") else href

        outcomes.append({
            "drug_name": drug_name,
            "title": drug_name,
            "recommendation": recommendation,
            "submission_type": submission_type,
            "meeting": meeting_date,
            "date": meeting_date,
            "url": url or page_url,
            "pbs_code": "",
        })

    # Fallback: list-based format
    if not outcomes:
        # Look for headings followed by lists
        section_pattern = re.compile(
            r"<h[2-4][^>]*>(.*?)</h[2-4]>(.*?)(?=<h[2-4]|$)",
            re.DOTALL | re.IGNORECASE,
        )
        for section_match in section_pattern.finditer(html):
            heading = _strip_html(section_match.group(1))
            content = section_match.group(2)

            # Determine recommendation from section heading
            recommendation = ""
            heading_lower = heading.lower()
            if "recommend" in heading_lower and "not" not in heading_lower:
                recommendation = "Recommended"
            elif "not recommend" in heading_lower:
                recommendation = "Not recommended"
            elif "defer" in heading_lower:
                recommendation = "Deferred"

            if not recommendation:
                continue

            # Find drug names in list items
            for li_match in re.finditer(
                r"<li[^>]*>(.*?)</li>", content, re.DOTALL | re.IGNORECASE
            ):
                drug_name = _strip_html(li_match.group(1))
                if drug_name and len(drug_name) > 2:
                    outcomes.append({
                        "drug_name": drug_name,
                        "title": drug_name,
                        "recommendation": recommendation,
                        "submission_type": "",
                        "meeting": meeting_date,
                        "date": meeting_date,
                        "url": page_url,
                        "pbs_code": "",
                    })

    return outcomes
