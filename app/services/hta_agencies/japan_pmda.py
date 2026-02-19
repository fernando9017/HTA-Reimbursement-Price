"""Japan PMDA (Pharmaceuticals and Medical Devices Agency) adapter.

Data sources (in priority order):
1. Bundled seed dataset — curated JSON of real PMDA approval entries.
   Always available, works offline.
2. PMDA approved drug information listing page (English) — scraped on
   startup when available.

No authentication required.
"""

import json
import logging
import re
import urllib.parse
from pathlib import Path

import httpx

from app.config import PMDA_BASE_URL, PMDA_DRUGS_URL, REQUEST_TIMEOUT
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Path to the bundled seed dataset
SEED_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "pmda_seed_data.json"

# NHI drug price database search URL
NHI_PRICE_SEARCH_URL = "https://www.pmda.go.jp/PmdaSearch/iyakuSearch/"

# Review types for PMDA drug approvals
REVIEW_TYPE_DISPLAY = {
    "new drug": "New Drug Approval",
    "new indication": "New Indication",
    "new dosage": "New Dosage",
    "new route": "New Route of Administration",
    "new combination": "New Combination",
    "biosimilar": "Biosimilar",
    "orphan": "Orphan Drug",
}


class JapanPMDA(HTAAgency):
    """PMDA — Japan regulatory approval and NHI drug price setting."""

    def __init__(self) -> None:
        self._drug_list: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "JP"

    @property
    def country_name(self) -> str:
        return "Japan"

    @property
    def agency_abbreviation(self) -> str:
        return "PMDA"

    @property
    def agency_full_name(self) -> str:
        return "Pharmaceuticals and Medical Devices Agency"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Load PMDA data from seed file and optionally from live sources."""
        # Step 1: Always load bundled seed data (guaranteed to work)
        seed_drugs = self._load_seed_data()

        # Step 2: Try live source for additional/updated data
        live_drugs: list[dict] = []
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
                "Accept-Language": "ja,en;q=0.9",
            },
        ) as client:
            try:
                resp = await client.get(PMDA_DRUGS_URL)
                resp.raise_for_status()
                html = resp.text
                if html:
                    live_drugs = self._parse_listing_page(html)
            except Exception:
                logger.warning("Failed to fetch PMDA drugs listing page (will use seed data)")

        # Step 3: Merge seed + live, deduplicating
        self._drug_list = _merge_drug_entries(seed_drugs, live_drugs)
        self._loaded = True
        logger.info(
            "Japan PMDA data loaded: %d total entries (%d seed, %d live)",
            len(self._drug_list), len(seed_drugs), len(live_drugs),
        )

    def _load_seed_data(self) -> list[dict]:
        """Load the bundled JSON seed dataset."""
        try:
            if SEED_DATA_PATH.exists():
                with open(SEED_DATA_PATH, encoding="utf-8") as f:
                    data = json.load(f)
                logger.info("PMDA seed data loaded: %d entries", len(data))
                return data
            else:
                logger.warning("PMDA seed data file not found at %s", SEED_DATA_PATH)
        except Exception:
            logger.exception("Error loading PMDA seed data")
        return []

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find PMDA regulatory approvals and pricing info for a substance."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results = []
        for drug in self._drug_list:
            inn_lower = drug.get("inn", "").lower()
            brand_lower = drug.get("brand_name", "").lower()
            indication_lower = drug.get("indication", "").lower()

            substance_match = (
                substance_lower in inn_lower
                or inn_lower in substance_lower
                or substance_lower in indication_lower
            )
            product_match = product_lower and (
                product_lower in brand_lower
                or brand_lower in product_lower
            )

            if not substance_match and not product_match:
                continue

            review_type = drug.get("review_type", "")
            review_display = _normalize_review_type(review_type)

            # Build assessment URL: prefer review report, fall back to PMDA search
            assessment_url = drug.get("review_url", "")
            if not assessment_url:
                brand = drug.get("brand_name", "") or product_name or active_substance
                assessment_url = _build_pmda_search_url(brand)

            # Build NHI drug price lookup info
            brand = drug.get("brand_name", "") or product_name or active_substance
            drug_price_info = f"NHI price lookup: {_build_pmda_search_url(brand)}"

            results.append(
                AssessmentResult(
                    product_name=brand,
                    evaluation_reason=drug.get("indication", ""),
                    opinion_date=drug.get("approval_date", ""),
                    assessment_url=assessment_url,
                    pmda_review_type=review_display,
                    drug_price=drug_price_info,
                )
            )

        # Sort most recent first
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading helpers ──────────────────────────────────────────

    def _parse_listing_page(self, html: str) -> list[dict]:
        """Parse the PMDA approved drugs listing page HTML.

        The page typically contains a table with columns:
          Brand Name | INN | Indication | Approval Date | Review Report
        """
        items: list[dict] = []
        seen: set[str] = set()

        # Pattern 1: Table rows with drug data
        # Each row has 4+ <td> cells; capture rest of row for link extraction
        row_pattern = re.compile(
            r'<tr[^>]*>\s*'
            r'<td[^>]*>(.*?)</td>\s*'
            r'<td[^>]*>(.*?)</td>\s*'
            r'<td[^>]*>(.*?)</td>\s*'
            r'<td[^>]*>(.*?)</td>'
            r'(.*?)</tr>',
            re.IGNORECASE | re.DOTALL,
        )
        for match in row_pattern.finditer(html):
            brand = _clean_html_text(match.group(1))
            inn = _clean_html_text(match.group(2))
            indication = _clean_html_text(match.group(3))
            date_text = _clean_html_text(match.group(4))

            # Skip header rows
            if not brand or brand.lower() in ("brand name", "product name", "name"):
                continue

            # Create a dedup key
            key = f"{brand}_{inn}_{date_text}"
            if key in seen:
                continue
            seen.add(key)

            # Try to find review report link in the row
            review_url = ""
            link_match = re.search(
                r'href="([^"]*(?:review|report|pdf)[^"]*)"',
                match.group(0), re.IGNORECASE,
            )
            if link_match:
                review_url = link_match.group(1)
                if review_url and not review_url.startswith("http"):
                    review_url = PMDA_BASE_URL + (
                        review_url if review_url.startswith("/") else "/" + review_url
                    )

            # Detect review type from context
            review_type = _detect_review_type(match.group(0), indication)

            items.append({
                "brand_name": brand,
                "inn": inn,
                "indication": indication,
                "approval_date": _parse_date(date_text),
                "review_url": review_url,
                "review_type": review_type,
            })

        # Pattern 2: Links to drug review pages with drug info
        if not items:
            link_pattern = re.compile(
                r'<a\s+href="([^"]*(?:drugs|review)[^"]*)"[^>]*>\s*(.*?)\s*</a>',
                re.IGNORECASE | re.DOTALL,
            )
            for match in link_pattern.finditer(html):
                url = match.group(1)
                title = _clean_html_text(match.group(2))

                if not title or len(title) < 3:
                    continue

                key = title.lower()
                if key in seen:
                    continue
                seen.add(key)

                if not url.startswith("http"):
                    url = PMDA_BASE_URL + (url if url.startswith("/") else "/" + url)

                # Extract date from nearby context
                date = self._extract_date_near(html, match.group(2))

                items.append({
                    "brand_name": title,
                    "inn": "",
                    "indication": "",
                    "approval_date": date,
                    "review_url": url,
                    "review_type": "",
                })

        return items

    def _extract_date_near(self, html: str, anchor_text: str) -> str:
        """Try to find an approval date near a drug entry in the HTML."""
        escaped = re.escape(anchor_text[:40]) if len(anchor_text) > 40 else re.escape(anchor_text)
        match = re.search(escaped, html, re.IGNORECASE)
        if match:
            context = html[max(0, match.start() - 200):match.end() + 500]

            # Japanese date: YYYY年MM月DD日
            jp_date = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', context)
            if jp_date:
                return f"{jp_date.group(1)}-{int(jp_date.group(2)):02d}-{int(jp_date.group(3)):02d}"

            # English: Month DD, YYYY
            en_date = re.search(
                r'(January|February|March|April|May|June|July|'
                r'August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
                context,
            )
            if en_date:
                return _parse_english_date_parts(
                    en_date.group(2), en_date.group(1), en_date.group(3),
                )

            # ISO: YYYY-MM-DD
            iso_date = re.search(r'(\d{4}-\d{2}-\d{2})', context)
            if iso_date:
                return iso_date.group(1)

        return ""


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


def _parse_date(text: str) -> str:
    """Parse various date formats to YYYY-MM-DD."""
    text = text.strip()
    if not text:
        return ""

    # Already ISO
    if re.match(r"\d{4}-\d{2}-\d{2}", text):
        return text[:10]

    # Japanese: YYYY年MM月DD日
    match = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", text)
    if match:
        return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"

    # English: Month DD, YYYY
    match = re.search(
        r"(January|February|March|April|May|June|July|"
        r"August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})",
        text,
    )
    if match:
        return _parse_english_date_parts(match.group(2), match.group(1), match.group(3))

    # DD/MM/YYYY or MM/DD/YYYY (assume DD/MM for non-US)
    match = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if match:
        return f"{match.group(3)}-{int(match.group(2)):02d}-{int(match.group(1)):02d}"

    return text


def _parse_english_date_parts(day: str, month_name: str, year: str) -> str:
    """Convert English date parts to YYYY-MM-DD."""
    months = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
    }
    month = months.get(month_name.lower(), "01")
    return f"{year}-{month}-{int(day):02d}"


def _detect_review_type(row_html: str, indication: str) -> str:
    """Detect the review type from HTML context and indication text."""
    text = (row_html + " " + indication).lower()

    if "biosimilar" in text:
        return "biosimilar"
    if "orphan" in text:
        return "orphan"
    if "new indication" in text or "additional indication" in text:
        return "new indication"
    if "new dosage" in text or "dosage form" in text:
        return "new dosage"
    if "new combination" in text:
        return "new combination"

    return "new drug"


def _normalize_review_type(raw: str) -> str:
    """Normalize a review type to a display value."""
    if not raw:
        return ""
    lower = raw.lower().strip()
    return REVIEW_TYPE_DISPLAY.get(lower, raw.strip().capitalize())


def _build_pmda_search_url(drug_name: str) -> str:
    """Build a PMDA drug information search URL."""
    encoded = urllib.parse.quote(drug_name)
    return f"{NHI_PRICE_SEARCH_URL}?iYakuKbn=1&iKensaku={encoded}"


def _merge_drug_entries(seed: list[dict], live: list[dict]) -> list[dict]:
    """Merge seed and live drug entries, deduplicating by brand+inn+date."""
    merged = list(seed)
    existing_keys = {
        f"{d.get('brand_name', '')}|{d.get('inn', '')}|{d.get('approval_date', '')}"
        for d in merged
    }

    for d in live:
        key = f"{d.get('brand_name', '')}|{d.get('inn', '')}|{d.get('approval_date', '')}"
        if key not in existing_keys:
            merged.append(d)
            existing_keys.add(key)

    return merged
