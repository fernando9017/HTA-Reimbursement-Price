"""Service for fetching and searching EMA (European Medicines Agency) medicine data.

Data source: EMA public JSON data file, updated twice daily.
No authentication required.
"""

import logging
import re
from difflib import SequenceMatcher

import httpx

from app.config import EMA_MEDICINES_URL, REQUEST_TIMEOUT
from app.models import MedicineResult

logger = logging.getLogger(__name__)


class EMAService:
    """Handles fetching, caching, and searching EMA medicine data."""

    def __init__(self) -> None:
        self._medicines: list[dict] = []
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def medicine_count(self) -> int:
        return len(self._medicines)

    @property
    def raw_medicines(self) -> list[dict]:
        """Return the raw medicine dicts (used by AnalogueService)."""
        return self._medicines

    async def load_data(self) -> None:
        """Download and parse the EMA medicines JSON file."""
        logger.info("Fetching EMA medicines data from %s", EMA_MEDICINES_URL)
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(EMA_MEDICINES_URL)
            response.raise_for_status()
            data = response.json()

        # The JSON may be a list directly or wrapped in an object
        if isinstance(data, list):
            self._medicines = data
        elif isinstance(data, dict):
            # Try common wrapper keys
            for key in ("data", "medicines", "results"):
                if key in data and isinstance(data[key], list):
                    self._medicines = data[key]
                    break
            else:
                # If it's a dict of records, convert to list
                self._medicines = list(data.values()) if data else []
        else:
            self._medicines = []

        self._loaded = True
        logger.info("Loaded %d medicines from EMA", len(self._medicines))

    def search(self, query: str, limit: int = 20) -> list[MedicineResult]:
        """Search medicines by name or active substance.

        Uses case-insensitive substring matching with relevance scoring.
        """
        if not self._loaded:
            return []

        query_lower = query.lower().strip()
        if not query_lower:
            return []

        scored_results: list[tuple[float, MedicineResult]] = []

        for med in self._medicines:
            name = _get_str(med, "medicineName", "name_of_medicine", "medicine_name")
            substance = _get_str(
                med,
                "activeSubstance",
                "active_substance",
                "inn_common_name",
                "internationalNonProprietaryNameINN",
            )
            indication = _get_str(
                med,
                "therapeuticIndication",
                "therapeutic_indication",
                "condition_indication",
            )
            status = _get_str(
                med,
                "authorisationStatus",
                "authorisation_status",
                "marketing_authorisation_status",
            )
            ema_number = _get_str(
                med,
                "emaNumber",
                "ema_product_number",
                "product_number",
            )
            condition = _get_str(
                med,
                "condition",
                "therapeutic_area",
                "therapeutic_area_mesh",
            )
            url = _get_str(med, "url", "URL", "productUrl", "product_page_url", "ema_url")
            if not url and name:
                brand = re.split(r"[\s,/]", name)[0].lower()
                brand = re.sub(r"[^a-z0-9-]", "", brand)
                if len(brand) >= 2:
                    url = f"https://www.ema.europa.eu/en/medicines/human/EPAR/{brand}"

            name_lower = name.lower()
            substance_lower = substance.lower()

            # Score the match
            score = 0.0

            # Exact match on name
            if query_lower == name_lower:
                score = 1.0
            # Exact match on substance
            elif query_lower == substance_lower:
                score = 0.95
            # Name starts with query
            elif name_lower.startswith(query_lower):
                score = 0.9
            # Substance starts with query
            elif substance_lower.startswith(query_lower):
                score = 0.85
            # Query is contained in name
            elif query_lower in name_lower:
                score = 0.7
            # Query is contained in substance
            elif query_lower in substance_lower:
                score = 0.65
            # Fuzzy match
            else:
                name_ratio = SequenceMatcher(None, query_lower, name_lower).ratio()
                subst_ratio = SequenceMatcher(None, query_lower, substance_lower).ratio()
                best_ratio = max(name_ratio, subst_ratio)
                if best_ratio > 0.6:
                    score = best_ratio * 0.5

            if score > 0:
                result = MedicineResult(
                    name=name,
                    active_substance=substance,
                    therapeutic_indication=indication,
                    authorisation_status=status,
                    ema_number=ema_number,
                    condition=condition,
                    url=url,
                )
                scored_results.append((score, result))

        # Sort by score descending, then by name
        scored_results.sort(key=lambda x: (-x[0], x[1].name))
        return [r for _, r in scored_results[:limit]]


def _get_str(data: dict, *keys: str) -> str:
    """Try multiple possible key names and return the first non-empty string value."""
    for key in keys:
        val = data.get(key)
        if val is not None:
            return str(val).strip()
    return ""
