"""Canada CADTH / CDA-AMC (Canada's Drug Agency) adapter.

Data sources:
1. CDA-AMC Reimbursement Reviews — HTML listing of drug reviews with
   recommendations.  Covers both oncology (pCODR) and non-oncology drugs.
2. Individual review pages — scraped for recommendation details.

Note: CADTH rebranded to CDA-AMC (Canada's Drug Agency) but the CADTH
name remains widely used.  Both URLs (cadth.ca, cda-amc.ca) are supported.

CADTH/CDA-AMC recommendations:
- Reimburse
- Reimburse with clinical criteria and/or conditions
- Do not reimburse
- Time-limited recommendation (conditional early access, reassessment pending)
- Unable to recommend

No authentication required for the public website.
"""

import logging
import re
from pathlib import Path

import httpx

from app.config import (
    CADTH_BASE_URL,
    CADTH_REVIEWS_URL,
    REQUEST_TIMEOUT,
    SSL_VERIFY,
)
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Normalise recommendation text to standard display values
RECOMMENDATION_MAP = {
    "reimburse": "Reimburse",
    "recommend": "Reimburse",
    "recommended": "Reimburse",
    "reimburse with clinical criteria": (
        "Reimburse with clinical criteria and/or conditions"
    ),
    "reimburse with conditions": (
        "Reimburse with clinical criteria and/or conditions"
    ),
    "reimburse with clinical criteria and/or conditions": (
        "Reimburse with clinical criteria and/or conditions"
    ),
    "conditional": "Reimburse with clinical criteria and/or conditions",
    "do not reimburse": "Do not reimburse",
    "do not recommend": "Do not reimburse",
    "not recommended": "Do not reimburse",
    "unable to recommend": "Unable to recommend",
    "not reimbursed": "Do not reimburse",
    "time-limited": "Time-limited recommendation",
    "time-limited recommendation": "Time-limited recommendation",
    "time limited": "Time-limited recommendation",
}


def _normalise_recommendation(raw: str) -> str:
    """Map various recommendation wordings to canonical display values."""
    if not raw:
        return ""
    lower = raw.strip().lower()
    # Try exact match first
    if lower in RECOMMENDATION_MAP:
        return RECOMMENDATION_MAP[lower]
    # Try substring match
    for key, value in RECOMMENDATION_MAP.items():
        if key in lower:
            return value
    return raw.strip()


class CanadaCADTH(HTAAgency):
    """CADTH (Canadian Agency for Drugs and Technologies in Health)."""

    def __init__(self) -> None:
        self._reviews: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "CA"

    @property
    def country_name(self) -> str:
        return "Canada"

    @property
    def agency_abbreviation(self) -> str:
        return "CADTH"

    @property
    def agency_full_name(self) -> str:
        return "Canadian Agency for Drugs and Technologies in Health"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch CADTH reimbursement review listing pages.

        Strategy:
        1. Fetch the CADTH reimbursement reviews listing page.
        2. Parse review entries from the HTML.
        3. Extract drug name, recommendation, and review URL.
        """
        all_reviews: list[dict] = []

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
            # Fetch the listing page (and paginated pages)
            for page in range(0, 20):
                url = CADTH_REVIEWS_URL
                if page > 0:
                    url = f"{CADTH_REVIEWS_URL}?page={page}"

                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    html = resp.text
                except Exception:
                    if page == 0:
                        raise RuntimeError(
                            "CADTH: failed to fetch reimbursement reviews listing"
                        )
                    break  # End of pagination

                reviews = _parse_cadth_listing(html)
                if not reviews:
                    break  # No more results
                all_reviews.extend(reviews)

        if not all_reviews:
            raise RuntimeError(
                "CADTH data fetch returned 0 reviews. "
                "The website structure may have changed."
            )

        self._reviews = all_reviews
        self._loaded = True
        logger.info("Canada CADTH data loaded: %d reviews", len(self._reviews))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find CADTH reviews matching the given substance or product name."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results: list[AssessmentResult] = []
        seen: set[str] = set()

        for review in self._reviews:
            title_lower = review.get("title", "").lower()
            substance_in_title = substance_lower in title_lower
            product_in_title = product_lower and product_lower in title_lower

            if not substance_in_title and not product_in_title:
                continue

            # Deduplicate by URL
            url = review.get("url", "")
            dedup_key = url or review.get("title", "")
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            recommendation = _normalise_recommendation(
                review.get("recommendation", "")
            )
            review_type = review.get("review_type", "")

            summary_parts: list[str] = []
            if recommendation:
                summary_parts.append(recommendation)
            if review_type:
                summary_parts.append(review_type)

            results.append(
                AssessmentResult(
                    product_name=review.get("title", "")
                    or product_name
                    or active_substance,
                    evaluation_reason=review_type or "CADTH Reimbursement Review",
                    opinion_date=review.get("date", ""),
                    assessment_url=url,
                    cadth_recommendation=recommendation,
                    cadth_review_type=review_type,
                    cadth_project_number=review.get("project_number", ""),
                    summary_en=" | ".join(summary_parts) if summary_parts else "",
                )
            )

        return results

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._reviews = payload["data"]
        self._loaded = bool(self._reviews)
        if self._loaded:
            logger.info(
                "%s loaded %d reviews from %s",
                self.agency_abbreviation, len(self._reviews), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._safe_write_json_file(data_file, self._make_envelope(self._reviews))
        logger.info(
            "%s saved %d reviews to %s",
            self.agency_abbreviation, len(self._reviews), data_file,
        )


# ── HTML parsing helpers ─────────────────────────────────────────────


def _parse_cadth_listing(html: str) -> list[dict]:
    """Parse CADTH reimbursement review entries from an HTML listing page.

    Looks for review cards / table rows containing:
    - Drug title (brand + generic name)
    - Recommendation status
    - Review type (pCODR / non-oncology)
    - Publication date
    - Link to the review detail page
    """
    reviews: list[dict] = []

    # Pattern 1: <a> links with review titles containing drug names
    # CADTH listing typically uses structured cards or table rows
    link_pattern = re.compile(
        r'<a[^>]*href="(/reimbursement-reviews/[^"]*)"[^>]*>(.*?)</a>',
        re.DOTALL | re.IGNORECASE,
    )

    for match in link_pattern.finditer(html):
        href = match.group(1)
        title_html = match.group(2)
        title = _strip_html(title_html).strip()
        if not title or len(title) < 3:
            continue

        url = f"{CADTH_BASE_URL}{href}" if not href.startswith("http") else href

        # Try to extract recommendation from nearby context
        # Look for recommendation text in a ~500 char window after the link
        pos = match.end()
        context = html[pos: pos + 500]
        recommendation = _extract_recommendation(context)
        review_type = _extract_review_type(context, title)
        date = _extract_date(context)
        project_num = _extract_project_number(context)

        reviews.append({
            "title": title,
            "url": url,
            "recommendation": recommendation,
            "review_type": review_type,
            "date": date,
            "project_number": project_num,
        })

    # Pattern 2: structured data/table format
    if not reviews:
        row_pattern = re.compile(
            r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE
        )
        for row_match in row_pattern.finditer(html):
            row_html = row_match.group(1)
            link_match = re.search(
                r'href="([^"]*)"[^>]*>(.*?)</a>', row_html, re.DOTALL
            )
            if not link_match:
                continue

            href = link_match.group(1)
            title = _strip_html(link_match.group(2)).strip()
            if not title or len(title) < 3:
                continue

            url = (
                f"{CADTH_BASE_URL}{href}"
                if not href.startswith("http")
                else href
            )
            recommendation = _extract_recommendation(row_html)
            review_type = _extract_review_type(row_html, title)
            date = _extract_date(row_html)

            reviews.append({
                "title": title,
                "url": url,
                "recommendation": recommendation,
                "review_type": review_type,
                "date": date,
                "project_number": "",
            })

    return reviews


def _strip_html(text: str) -> str:
    """Remove HTML tags from text."""
    return re.sub(r"<[^>]+>", "", text).strip()


def _extract_recommendation(context: str) -> str:
    """Try to extract a CADTH recommendation from nearby HTML context."""
    # Look for common recommendation phrases
    patterns = [
        r"(?:recommendation|final\s+recommendation)[:\s]*([^<\n]{5,60})",
        r"(?:reimburse\s+with\s+clinical\s+criteria[^<]*)",
        r"(?:do\s+not\s+reimburse)",
        r"(?:reimburse(?!\s+with))",
        r"(?:unable\s+to\s+recommend)",
    ]
    for pattern in patterns:
        match = re.search(pattern, context, re.IGNORECASE)
        if match:
            return _strip_html(match.group(0)).strip()
    return ""


def _extract_review_type(context: str, title: str = "") -> str:
    """Determine if this is a pCODR (oncology) or non-oncology review."""
    combined = f"{title} {context}".lower()
    if "pcodr" in combined or "oncology" in combined:
        return "pCODR (Oncology)"
    if "non-oncology" in combined:
        return "Non-oncology"
    return "Reimbursement Review"


def _extract_date(context: str) -> str:
    """Extract a date from context (various formats)."""
    # YYYY-MM-DD
    match = re.search(r"(\d{4}-\d{2}-\d{2})", context)
    if match:
        return match.group(1)
    # Month DD, YYYY
    match = re.search(
        r"((?:January|February|March|April|May|June|July|August|September|"
        r"October|November|December)\s+\d{1,2},?\s+\d{4})",
        context, re.IGNORECASE,
    )
    if match:
        return match.group(1)
    return ""


def _extract_project_number(context: str) -> str:
    """Extract CADTH project number like SR0711-000."""
    match = re.search(r"(SR\d{4}-\d{3})", context)
    if match:
        return match.group(1)
    return ""
