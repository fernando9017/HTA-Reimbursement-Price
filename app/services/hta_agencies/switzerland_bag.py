"""Switzerland BAG (Bundesamt für Gesundheit / Federal Office of Public Health) adapter.

Data sources:
1. Spezialitätenliste (SL) — the positive list of reimbursed medicines in
   Switzerland's mandatory health insurance (OKP/KVG).  Searchable at
   spezialitaetenliste.ch.  Available as Excel/XML downloads.
2. BAG drug pricing decisions — new listings, price changes, and
   limitation modifications published on the BAG website.
3. ePL (Elektronische Plattform Leistungen) — new FHIR-based platform
   at sl.bag.admin.ch (live since Jan 5, 2026).  After April 1, 2026,
   XML/Excel will cease; FHIR (IDMP-based) will be the only format.

Medicines must meet WZW criteria for SL listing:
- Wirksamkeit (effectiveness)
- Zweckmäßigkeit (appropriateness)
- Wirtschaftlichkeit (cost-effectiveness via foreign price comparison
  and therapeutic cross-comparison)

SL listing outcomes:
- Listed (on the SL, reimbursed)
- Listed with limitation (reimbursed under specific conditions)
- Not listed (not on the SL)
- Delisted (removed from the SL)

No authentication required for the public website.
"""

import logging
import re
from pathlib import Path

import httpx

from app.config import (
    BAG_BASE_URL,
    BAG_DRUGS_URL,
    REQUEST_TIMEOUT,
    SL_BASE_URL,
    SL_SEARCH_URL,
    SSL_VERIFY,
)
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Normalise SL listing status
LISTING_MAP = {
    "gelistet": "Listed (SL)",
    "listed": "Listed (SL)",
    "aufgenommen": "Listed (SL)",
    "limitiert": "Listed with limitation",
    "limitation": "Listed with limitation",
    "nicht gelistet": "Not listed",
    "not listed": "Not listed",
    "gestrichen": "Delisted",
    "delisted": "Delisted",
}


def _normalise_listing(raw: str) -> str:
    """Map listing text to canonical display values."""
    if not raw:
        return ""
    lower = raw.strip().lower()
    if lower in LISTING_MAP:
        return LISTING_MAP[lower]
    if "limit" in lower:
        return "Listed with limitation"
    if "list" in lower or "aufgenommen" in lower:
        return "Listed (SL)"
    if "nicht" in lower or "not" in lower:
        return "Not listed"
    if "gestrich" in lower:
        return "Delisted"
    return raw.strip()


class SwitzerlandBAG(HTAAgency):
    """BAG (Bundesamt für Gesundheit) — Switzerland's Federal Office of Public Health."""

    def __init__(self) -> None:
        self._medicines: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "CH"

    @property
    def country_name(self) -> str:
        return "Switzerland"

    @property
    def agency_abbreviation(self) -> str:
        return "BAG"

    @property
    def agency_full_name(self) -> str:
        return "Bundesamt für Gesundheit (Federal Office of Public Health)"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch SL (Spezialitätenliste) data.

        Strategy:
        1. Fetch the SL search page to get initial data.
        2. Parse medicine listings from the HTML/XML responses.
        3. Extract drug name, SL status, price, and limitations.
        """
        all_medicines: list[dict] = []

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
            # Fetch the SL search page
            try:
                resp = await client.get(SL_SEARCH_URL)
                resp.raise_for_status()
                html = resp.text
                medicines = _parse_sl_listing(html)
                all_medicines.extend(medicines)
            except Exception:
                logger.warning("BAG: failed to fetch SL search page")

            # Try the BAG drugs information page as fallback
            if not all_medicines:
                try:
                    resp = await client.get(BAG_DRUGS_URL)
                    resp.raise_for_status()
                    medicines = _parse_bag_drugs_page(resp.text)
                    all_medicines.extend(medicines)
                except Exception:
                    logger.warning("BAG: failed to fetch BAG drugs page")

        if not all_medicines:
            raise RuntimeError(
                "BAG data fetch returned 0 medicines. "
                "The website structure may have changed."
            )

        self._medicines = all_medicines
        self._loaded = True
        logger.info("Switzerland BAG data loaded: %d medicines", len(self._medicines))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find SL listings matching the given substance or product name."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results: list[AssessmentResult] = []
        seen: set[str] = set()

        for med in self._medicines:
            name_lower = med.get("name", "").lower()
            substance_field = med.get("substance", "").lower()
            combined = f"{name_lower} {substance_field}"

            substance_match = substance_lower in combined
            product_match = product_lower and product_lower in combined

            if not substance_match and not product_match:
                continue

            # Deduplicate
            dedup_key = med.get("sl_number", "") or med.get("name", "")
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            listing_status = _normalise_listing(med.get("status", "Listed"))
            price = med.get("price", "")
            price_str = f"CHF {price}" if price else ""
            limitation = med.get("limitation", "")
            app_type = med.get("application_type", "")

            summary_parts: list[str] = [listing_status]
            if price_str:
                summary_parts.append(price_str)
            if limitation:
                summary_parts.append(f"Limitation: {limitation[:80]}")

            results.append(
                AssessmentResult(
                    product_name=med.get("name", "")
                    or product_name
                    or active_substance,
                    evaluation_reason=app_type or "Spezialitätenliste (SL)",
                    opinion_date=med.get("date", ""),
                    assessment_url=med.get("url", ""),
                    sl_listed="Yes" if "Listed" in listing_status else "No",
                    sl_price=price_str,
                    sl_limitation=limitation,
                    bag_application_type=app_type,
                    summary_en=" | ".join(summary_parts) if summary_parts else "",
                )
            )

        return results

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._medicines = payload["data"]
        self._loaded = bool(self._medicines)
        if self._loaded:
            logger.info(
                "%s loaded %d medicines from %s",
                self.agency_abbreviation, len(self._medicines), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._safe_write_json_file(data_file, self._make_envelope(self._medicines))
        logger.info(
            "%s saved %d medicines to %s",
            self.agency_abbreviation, len(self._medicines), data_file,
        )


# ── HTML parsing helpers ─────────────────────────────────────────────


def _strip_html(text: str) -> str:
    """Remove HTML tags."""
    return re.sub(r"<[^>]+>", "", text).strip()


def _parse_sl_listing(html: str) -> list[dict]:
    """Parse medicines from the Spezialitätenliste search page.

    The SL web interface uses ASP.NET with structured table output.
    """
    medicines: list[dict] = []

    # Look for table rows containing medicine data
    row_pattern = re.compile(r"<tr[^>]*>(.*?)</tr>", re.DOTALL | re.IGNORECASE)
    for row_match in row_pattern.finditer(html):
        row = row_match.group(1)
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL | re.IGNORECASE)
        if len(cells) < 3:
            continue

        name = _strip_html(cells[0])
        if not name or len(name) < 2:
            continue

        # Skip header rows
        if name.lower() in ("name", "präparat", "preparation"):
            continue

        substance = _strip_html(cells[1]) if len(cells) > 1 else ""
        price = _strip_html(cells[2]) if len(cells) > 2 else ""
        limitation = ""
        if len(cells) > 3:
            limitation = _strip_html(cells[3])

        # Extract link
        link_match = re.search(r'href="([^"]*)"', row)
        url = ""
        if link_match:
            href = link_match.group(1)
            url = f"{SL_BASE_URL}{href}" if not href.startswith("http") else href

        medicines.append({
            "name": name,
            "substance": substance,
            "price": price,
            "limitation": limitation,
            "status": "Listed" if limitation else "Listed",
            "url": url,
            "sl_number": "",
            "date": "",
            "application_type": "SL Listing",
        })

    return medicines


def _parse_bag_drugs_page(html: str) -> list[dict]:
    """Parse drug information from the BAG drugs page.

    Fallback when the SL search is not available.
    """
    medicines: list[dict] = []

    # Look for links to drug-related pages
    link_pattern = re.compile(
        r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', re.DOTALL | re.IGNORECASE
    )
    for match in link_pattern.finditer(html):
        href = match.group(1)
        title = _strip_html(match.group(2))
        if not title or len(title) < 3:
            continue

        # Look for drug-related links
        if any(kw in href.lower() for kw in ("arzneimittel", "spezialitaeten", "sl")):
            url = f"{BAG_BASE_URL}{href}" if not href.startswith("http") else href
            medicines.append({
                "name": title,
                "substance": "",
                "price": "",
                "limitation": "",
                "status": "Listed",
                "url": url,
                "sl_number": "",
                "date": "",
                "application_type": "SL Listing",
            })

    return medicines
