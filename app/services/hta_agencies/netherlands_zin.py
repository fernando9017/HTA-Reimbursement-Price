"""Netherlands ZIN (Zorginstituut Nederland) adapter.

Data sources:
1. ZIN Pakketadviezen — package advice (assessment reports) published by
   the National Health Care Institute for drugs seeking GVS reimbursement.
2. GVS (Geneesmiddelen Vergoedings Systeem) — the drug reimbursement
   system listing (via medicijnkosten.nl).

ZIN assessment outcomes:
- Positive (included in basic package)
- Positive with conditions
- Negative (not included)
- Conditionally included (outcomes research required)

No authentication required for the public website.
"""

import logging
import re
from pathlib import Path

import httpx

from app.config import (
    GVS_SEARCH_URL,
    MEDICIJNKOSTEN_URL,
    REQUEST_TIMEOUT,
    SSL_VERIFY,
    ZIN_ASSESSMENTS_URL,
    ZIN_BASE_URL,
)
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Normalise ZIN/GVS recommendation text
RECOMMENDATION_MAP = {
    "positief": "Positive",
    "positive": "Positive",
    "negatief": "Negative",
    "negative": "Negative",
    "voorwaardelijk": "Conditionally included",
    "conditional": "Conditionally included",
    "included": "Positive",
    "not included": "Negative",
    "vergoed": "Reimbursed (GVS)",
    "niet vergoed": "Not reimbursed",
    "reimbursed": "Reimbursed (GVS)",
    "not reimbursed": "Not reimbursed",
}


def _normalise_recommendation(raw: str) -> str:
    """Map recommendation text to canonical display values."""
    if not raw:
        return ""
    lower = raw.strip().lower()
    if lower in RECOMMENDATION_MAP:
        return RECOMMENDATION_MAP[lower]
    if "positief" in lower or "positive" in lower:
        if "voorwaardelijk" in lower or "conditional" in lower:
            return "Conditionally included"
        return "Positive"
    if "negatief" in lower or "negative" in lower:
        return "Negative"
    return raw.strip()


class NetherlandsZIN(HTAAgency):
    """ZIN (Zorginstituut Nederland) — Netherlands' HTA body."""

    def __init__(self) -> None:
        self._assessments: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "NL"

    @property
    def country_name(self) -> str:
        return "Netherlands"

    @property
    def agency_abbreviation(self) -> str:
        return "ZIN"

    @property
    def agency_full_name(self) -> str:
        return "Zorginstituut Nederland"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch ZIN assessment data.

        Strategy:
        1. Fetch the ZIN publications/assessments listing page.
        2. Parse assessment entries from the HTML.
        3. Extract drug name, recommendation, and assessment URL.
        """
        all_assessments: list[dict] = []

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
            # Fetch the publications listing with filter for pakketadvies
            for page in range(0, 15):
                url = ZIN_ASSESSMENTS_URL
                params = {"type": "Pakketadvies"}
                if page > 0:
                    params["page"] = str(page + 1)

                try:
                    resp = await client.get(url, params=params)
                    resp.raise_for_status()
                    html = resp.text
                except Exception:
                    if page == 0:
                        raise RuntimeError(
                            "ZIN: failed to fetch assessments listing"
                        )
                    break

                assessments = _parse_zin_listing(html)
                if not assessments:
                    break
                all_assessments.extend(assessments)

            # Also try to fetch GVS reimbursement data from medicijnkosten
            try:
                resp = await client.get(MEDICIJNKOSTEN_URL)
                if resp.status_code == 200:
                    logger.info("ZIN: medicijnkosten.nl accessible for GVS lookups")
            except Exception:
                logger.info("ZIN: medicijnkosten.nl not accessible (non-critical)")

        if not all_assessments:
            raise RuntimeError(
                "ZIN data fetch returned 0 assessments. "
                "The website structure may have changed."
            )

        self._assessments = all_assessments
        self._loaded = True
        logger.info("Netherlands ZIN data loaded: %d assessments", len(self._assessments))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find ZIN assessments matching the given substance or product name."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results: list[AssessmentResult] = []
        seen: set[str] = set()

        for assessment in self._assessments:
            title_lower = assessment.get("title", "").lower()
            substance_in_title = substance_lower in title_lower

            # Also check drug_name field
            drug_lower = assessment.get("drug_name", "").lower()
            substance_in_drug = substance_lower in drug_lower

            product_match = product_lower and (
                product_lower in title_lower or product_lower in drug_lower
            )

            if not substance_in_title and not substance_in_drug and not product_match:
                continue

            # Deduplicate
            url = assessment.get("url", "")
            dedup_key = url or assessment.get("title", "")
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            recommendation = _normalise_recommendation(
                assessment.get("recommendation", "")
            )
            gvs_cluster = assessment.get("gvs_cluster", "")

            summary_parts: list[str] = []
            if recommendation:
                summary_parts.append(recommendation)
            if gvs_cluster:
                summary_parts.append(f"GVS: {gvs_cluster}")

            results.append(
                AssessmentResult(
                    product_name=assessment.get("title", "")
                    or product_name
                    or active_substance,
                    evaluation_reason=assessment.get("assessment_type", "")
                    or "Pakketadvies (Package Advice)",
                    opinion_date=assessment.get("date", ""),
                    assessment_url=url,
                    zin_recommendation=recommendation,
                    gvs_cluster=gvs_cluster,
                    gvs_reimbursed=assessment.get("gvs_reimbursed", ""),
                    summary_en=" | ".join(summary_parts) if summary_parts else "",
                )
            )

        return results

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._assessments = payload["data"]
        self._loaded = bool(self._assessments)
        if self._loaded:
            logger.info(
                "%s loaded %d assessments from %s",
                self.agency_abbreviation, len(self._assessments), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._safe_write_json_file(
            data_file, self._make_envelope(self._assessments)
        )
        logger.info(
            "%s saved %d assessments to %s",
            self.agency_abbreviation, len(self._assessments), data_file,
        )


# ── HTML parsing helpers ─────────────────────────────────────────────


def _strip_html(text: str) -> str:
    """Remove HTML tags."""
    return re.sub(r"<[^>]+>", "", text).strip()


def _parse_zin_listing(html: str) -> list[dict]:
    """Parse ZIN pakketadvies entries from the publications listing page.

    Looks for publication cards containing drug assessment information.
    """
    assessments: list[dict] = []

    # Pattern 1: structured article/card items
    article_pattern = re.compile(
        r'<article[^>]*>(.*?)</article>', re.DOTALL | re.IGNORECASE
    )
    for article_match in article_pattern.finditer(html):
        article = article_match.group(1)

        # Extract title and link
        link_match = re.search(
            r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', article, re.DOTALL
        )
        if not link_match:
            continue

        href = link_match.group(1)
        title = _strip_html(link_match.group(2)).strip()
        if not title or len(title) < 3:
            continue

        url = f"{ZIN_BASE_URL}{href}" if not href.startswith("http") else href

        # Extract date
        date = _extract_date(article)

        # Extract recommendation/status from metadata
        recommendation = _extract_zin_recommendation(article)

        assessments.append({
            "title": title,
            "drug_name": _extract_drug_name(title),
            "url": url,
            "recommendation": recommendation,
            "assessment_type": "Pakketadvies",
            "date": date,
            "gvs_cluster": "",
            "gvs_reimbursed": "",
        })

    # Pattern 2: list items with links
    if not assessments:
        link_pattern = re.compile(
            r'<a[^>]*href="(/publicaties/[^"]*pakket[^"]*)"[^>]*>(.*?)</a>',
            re.DOTALL | re.IGNORECASE,
        )
        for match in link_pattern.finditer(html):
            href = match.group(1)
            title = _strip_html(match.group(2)).strip()
            if not title or len(title) < 3:
                continue

            url = f"{ZIN_BASE_URL}{href}"
            pos = match.end()
            context = html[pos: pos + 300]

            assessments.append({
                "title": title,
                "drug_name": _extract_drug_name(title),
                "url": url,
                "recommendation": _extract_zin_recommendation(context),
                "assessment_type": "Pakketadvies",
                "date": _extract_date(context),
                "gvs_cluster": "",
                "gvs_reimbursed": "",
            })

    return assessments


def _extract_drug_name(title: str) -> str:
    """Extract the drug/substance name from an assessment title.

    ZIN titles often follow patterns like:
    - "Pakketadvies pembrolizumab (Keytruda) bij ..."
    - "Farmacotherapeutisch rapport nivolumab"
    """
    # Remove common prefixes
    cleaned = re.sub(
        r"^(?:Pakketadvies|Farmacotherapeutisch rapport|GVS-advies)\s+",
        "", title, flags=re.IGNORECASE,
    )
    # Take the first word(s) as the drug name (before prepositions)
    match = re.match(r"([A-Za-z\s\-]+?)(?:\s+(?:bij|voor|voor de|in|als)\s+|\s*\()", cleaned)
    if match:
        return match.group(1).strip()
    # Fallback: first 2-3 words
    words = cleaned.split()
    return " ".join(words[:2]) if words else title


def _extract_date(context: str) -> str:
    """Extract a date from context."""
    # YYYY-MM-DD
    match = re.search(r"(\d{4}-\d{2}-\d{2})", context)
    if match:
        return match.group(1)
    # DD-MM-YYYY (Dutch format)
    match = re.search(r"(\d{1,2})-(\d{1,2})-(\d{4})", context)
    if match:
        return f"{match.group(3)}-{int(match.group(2)):02d}-{int(match.group(1)):02d}"
    # Dutch month names
    dutch_months = {
        "januari": "01", "februari": "02", "maart": "03", "april": "04",
        "mei": "05", "juni": "06", "juli": "07", "augustus": "08",
        "september": "09", "oktober": "10", "november": "11", "december": "12",
    }
    match = re.search(
        r"(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|"
        r"augustus|september|oktober|november|december)\s+(\d{4})",
        context, re.IGNORECASE,
    )
    if match:
        day, month_name, year = match.group(1), match.group(2).lower(), match.group(3)
        month = dutch_months.get(month_name, "01")
        return f"{year}-{month}-{int(day):02d}"
    return ""


def _extract_zin_recommendation(context: str) -> str:
    """Extract ZIN recommendation from context text."""
    lower = context.lower()
    if "positief" in lower:
        if "voorwaardelijk" in lower:
            return "Conditionally included"
        return "Positive"
    if "negatief" in lower:
        return "Negative"
    if "vergoed" in lower and "niet" not in lower:
        return "Reimbursed (GVS)"
    if "niet vergoed" in lower:
        return "Not reimbursed"
    return ""
