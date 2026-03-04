"""Italy AIFA (Agenzia Italiana del Farmaco) adapter.

Data sources:
1. AIFA Transparency Lists — CSV files listing Class A and Class H medicines
   reimbursed by the Italian National Health Service (SSN).  Published monthly,
   semicolon-delimited, with a header row.
2. AIFA Class A/H tables page — scraped to find current CSV download URLs.

Reimbursement classes in Italy:
- Class A: medicines dispensed by community pharmacies, fully reimbursed by SSN.
- Class H: hospital-only medicines, reimbursed by SSN.
- Class C: not reimbursed by SSN (not included in these lists).

No authentication required.
"""

import csv
import io
import logging
import re
from pathlib import Path

import httpx

from app.config import (
    AIFA_BASE_URL,
    AIFA_CLASS_A_CSV_PATTERN,
    AIFA_CLASS_H_CSV_PATTERN,
    AIFA_LISTS_PAGE_URL,
    AIFA_TRANSPARENCY_PAGE_URL,
    REQUEST_TIMEOUT,
    SSL_VERIFY,
)
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Expected CSV columns (semicolon-separated, with header row).
# The actual header text varies slightly between editions; we map by position.
# Columns:
#  0: Principio Attivo (active substance)
#  1: Descrizione Gruppo Equivalenza (equivalence group / dosage form)
#  2: Denominazione e Confezione (trade name and packaging)
#  3: Prezzo al pubblico (public price, €)
#  4: Titolare AIC / Ditta (MAH)
#  5: Codice AIC (AIC code)
#  6: Codice Gruppo Equivalenza (equivalence group code)
#  ...remaining columns vary (transparency flag, regional list, etc.)
COL_PRINCIPIO_ATTIVO = 0
COL_GRUPPO_EQUIV = 1
COL_DENOMINAZIONE = 2
COL_PREZZO = 3
COL_TITOLARE = 4
COL_AIC = 5


class ItalyAIFA(HTAAgency):
    """AIFA (Agenzia Italiana del Farmaco) — Italy's medicines agency."""

    def __init__(self) -> None:
        self._drug_list: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "IT"

    @property
    def country_name(self) -> str:
        return "Italy"

    @property
    def agency_abbreviation(self) -> str:
        return "AIFA"

    @property
    def agency_full_name(self) -> str:
        return "Agenzia Italiana del Farmaco"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch and parse AIFA transparency list CSVs for Class A and H.

        Strategy:
        1. Scrape the AIFA lists page to find current CSV download URLs.
        2. Download each CSV (Class A, Class H).
        3. Parse and deduplicate by AIC code.
        """
        all_items: list[dict] = []
        seen_aic: set[str] = set()

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
            # Find CSV download URLs from the AIFA pages
            csv_urls = await self._find_csv_urls(client)

            if not csv_urls:
                raise RuntimeError(
                    "AIFA: could not find transparency list CSV download URLs. "
                    "Check https://www.aifa.gov.it/en/liste-farmaci-a-h and "
                    "https://www.aifa.gov.it/en/liste-di-trasparenza"
                )

            for csv_url, drug_class in csv_urls:
                items = await self._download_and_parse_csv(
                    client, csv_url, drug_class, seen_aic,
                )
                all_items.extend(items)
                logger.info(
                    "AIFA %s CSV: %d items from %s",
                    drug_class, len(items), csv_url[:80],
                )

        if not all_items:
            raise RuntimeError(
                "AIFA data fetch returned 0 entries. "
                "The CSV format may have changed."
            )

        self._drug_list = all_items
        self._loaded = True
        logger.info("Italy AIFA data loaded: %d medicines", len(self._drug_list))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find AIFA reimbursement entries matching the given substance or product."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results = []
        for drug in self._drug_list:
            pa_lower = drug.get("principio_attivo", "").lower()
            name_lower = drug.get("denominazione", "").lower()

            substance_match = substance_lower in pa_lower
            product_match = product_lower and product_lower in name_lower

            if not substance_match and not product_match:
                continue

            drug_class = drug.get("class", "A")
            class_display = _class_display(drug_class)
            price = drug.get("prezzo", "")
            price_str = f"€{price}" if price else ""

            summary_parts: list[str] = [f"Class {drug_class} ({class_display})"]
            if price_str:
                summary_parts.append(price_str)
            mah = drug.get("titolare", "")
            if mah:
                summary_parts.append(mah)

            results.append(
                AssessmentResult(
                    product_name=drug.get("denominazione", "")
                    or product_name
                    or active_substance,
                    evaluation_reason=f"SSN Reimbursement — {class_display}",
                    opinion_date=drug.get("list_date", ""),
                    assessment_url=_build_aifa_url(drug.get("aic_code", "")),
                    aifa_class=drug_class,
                    aifa_aic_code=drug.get("aic_code", ""),
                    aifa_price=price_str,
                    summary_en=" | ".join(summary_parts),
                )
            )

        # Deduplicate by AIC code, keeping first occurrence
        seen: set[str] = set()
        unique: list[AssessmentResult] = []
        for r in results:
            key = r.aifa_aic_code or r.product_name
            if key not in seen:
                seen.add(key)
                unique.append(r)

        return unique

    # ── CSV URL discovery ──────────────────────────────────────────────

    async def _find_csv_urls(
        self, client: httpx.AsyncClient,
    ) -> list[tuple[str, str]]:
        """Scrape AIFA pages to find current CSV download URLs.

        Returns a list of (url, class) tuples where class is "A" or "H".
        """
        csv_urls: list[tuple[str, str]] = []

        # Try both the Class A/H tables page and the transparency lists page
        for page_url in [AIFA_LISTS_PAGE_URL, AIFA_TRANSPARENCY_PAGE_URL]:
            try:
                resp = await client.get(page_url)
                resp.raise_for_status()
                html = resp.text
            except Exception:
                logger.warning("AIFA: failed to fetch %s", page_url)
                continue

            # Look for CSV download links
            # Pattern: href="...Classe_A_per_Principio_Attivo...csv"
            for match in re.finditer(r'href="([^"]*\.csv[^"]*)"', html, re.IGNORECASE):
                url = match.group(1)
                if not url.startswith("http"):
                    url = AIFA_BASE_URL + (url if url.startswith("/") else "/" + url)

                if AIFA_CLASS_A_CSV_PATTERN.lower() in url.lower():
                    csv_urls.append((url, "A"))
                elif AIFA_CLASS_H_CSV_PATTERN.lower() in url.lower():
                    csv_urls.append((url, "H"))

            # Also look for links in href attributes pointing to documents
            for match in re.finditer(
                r'href="([^"]*documents[^"]*\.csv[^"]*)"', html, re.IGNORECASE,
            ):
                url = match.group(1)
                if not url.startswith("http"):
                    url = AIFA_BASE_URL + (url if url.startswith("/") else "/" + url)
                url_lower = url.lower()
                if "classe_a" in url_lower and url not in [u for u, _ in csv_urls]:
                    csv_urls.append((url, "A"))
                elif "classe_h" in url_lower and url not in [u for u, _ in csv_urls]:
                    csv_urls.append((url, "H"))

            if csv_urls:
                break  # Found URLs, no need to try other pages

        return csv_urls

    # ── CSV download and parsing ───────────────────────────────────────

    async def _download_and_parse_csv(
        self,
        client: httpx.AsyncClient,
        csv_url: str,
        drug_class: str,
        seen_aic: set[str],
    ) -> list[dict]:
        """Download a CSV file and parse it into drug records."""
        try:
            resp = await client.get(csv_url, timeout=120.0)
            resp.raise_for_status()
        except Exception:
            logger.warning("AIFA: failed to download CSV from %s", csv_url)
            return []

        # CSVs may be encoded in various ways; try UTF-8 first, then Latin-1
        content = resp.content
        for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
            try:
                text = content.decode(encoding)
                break
            except (UnicodeDecodeError, ValueError):
                continue
        else:
            logger.warning("AIFA: could not decode CSV from %s", csv_url)
            return []

        # Extract list date from the URL or filename
        list_date = _extract_date_from_url(csv_url)

        items: list[dict] = []
        reader = csv.reader(io.StringIO(text), delimiter=";")

        # Skip header row
        header = next(reader, None)
        if not header:
            return []

        # Detect column indices from header (in case order varies)
        col_map = _detect_columns(header)

        for row in reader:
            if len(row) < 4:
                continue

            pa = _clean(row[col_map["principio_attivo"]]) if col_map["principio_attivo"] < len(row) else ""
            denom = _clean(row[col_map["denominazione"]]) if col_map["denominazione"] < len(row) else ""
            prezzo = _clean(row[col_map["prezzo"]]) if col_map["prezzo"] < len(row) else ""
            titolare = _clean(row[col_map["titolare"]]) if col_map["titolare"] < len(row) else ""
            aic = _clean(row[col_map["aic"]]) if col_map["aic"] < len(row) else ""

            if not pa and not denom:
                continue

            # Deduplicate by AIC code
            if aic and aic in seen_aic:
                continue
            if aic:
                seen_aic.add(aic)

            items.append({
                "principio_attivo": pa,
                "denominazione": denom,
                "prezzo": prezzo,
                "titolare": titolare,
                "aic_code": aic,
                "class": drug_class,
                "list_date": list_date,
            })

        return items

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._drug_list = payload["data"]
        self._loaded = bool(self._drug_list)
        if self._loaded:
            logger.info(
                "%s loaded %d medicines from %s",
                self.agency_abbreviation, len(self._drug_list), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._safe_write_json_file(data_file, self._make_envelope(self._drug_list))
        logger.info(
            "%s saved %d medicines to %s",
            self.agency_abbreviation, len(self._drug_list), data_file,
        )


# ── Helpers ───────────────────────────────────────────────────────────


def _clean(text: str) -> str:
    """Strip whitespace and normalize."""
    return text.strip().strip('"').strip()


def _class_display(drug_class: str) -> str:
    """Human-readable display for an AIFA reimbursement class."""
    return {
        "A": "SSN Reimbursed — Community Pharmacy",
        "H": "SSN Reimbursed — Hospital Only",
        "C": "Not Reimbursed",
    }.get(drug_class, drug_class)


def _build_aifa_url(aic_code: str) -> str:
    """Build a link to the AIFA medicines database for a given AIC code."""
    if not aic_code:
        return ""
    # Zero-pad AIC to 9 digits for the AIFA search
    aic_padded = aic_code.zfill(9)
    return f"https://medicinali.aifa.gov.it/#/it/farmaco/{aic_padded}"


def _extract_date_from_url(url: str) -> str:
    """Extract a date from a CSV URL like '...15.05.2017.csv' → '2017-05-15'."""
    match = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", url)
    if match:
        day, month, year = match.group(1), match.group(2), match.group(3)
        return f"{year}-{int(month):02d}-{int(day):02d}"
    # Try alternate patterns: DD/MM/YYYY or YYYY-MM-DD
    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", url)
    if match:
        return match.group(0)
    return ""


def _detect_columns(header: list[str]) -> dict[str, int]:
    """Detect column indices from the CSV header row.

    Returns a mapping of logical field name → column index.
    Falls back to positional defaults if headers don't match.
    """
    col_map = {
        "principio_attivo": COL_PRINCIPIO_ATTIVO,
        "denominazione": COL_DENOMINAZIONE,
        "prezzo": COL_PREZZO,
        "titolare": COL_TITOLARE,
        "aic": COL_AIC,
    }

    for i, col in enumerate(header):
        col_lower = col.strip().lower()
        if "principio attivo" in col_lower:
            col_map["principio_attivo"] = i
        elif "denominazione" in col_lower or "confezione" in col_lower:
            col_map["denominazione"] = i
        elif "prezzo" in col_lower:
            col_map["prezzo"] = i
        elif "titolare" in col_lower or "ditta" in col_lower:
            col_map["titolare"] = i
        elif "codice aic" in col_lower or col_lower == "aic":
            col_map["aic"] = i

    return col_map
