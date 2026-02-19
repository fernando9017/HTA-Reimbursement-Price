"""Service for fetching and searching EMA (European Medicines Agency) medicine data.

Data sources (in priority order):
1. Bundled seed dataset — curated JSON of important EMA medicines.
   Always available, works offline.
2. EMA public JSON data file — full database, updated twice daily.
   Downloaded on startup when available, replaces the seed data.

No authentication required.
"""

import json
import logging
from difflib import SequenceMatcher
from pathlib import Path

import httpx

from app.config import EMA_MEDICINES_URL, REQUEST_TIMEOUT
from app.models import MedicineResult

logger = logging.getLogger(__name__)

# Path to the bundled seed dataset
SEED_DATA_PATH = Path(__file__).parent.parent / "data" / "ema_seed_data.json"


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

    def _load_seed_data(self) -> None:
        """Load bundled seed data from disk (synchronous, always works)."""
        try:
            with open(SEED_DATA_PATH, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                self._medicines = data
            else:
                self._medicines = []
            logger.info("Loaded EMA seed data: %d medicines", len(self._medicines))
        except Exception:
            logger.exception("Failed to load EMA seed data from %s", SEED_DATA_PATH)

    async def load_data(self) -> None:
        """Load EMA data from seed file and optionally from live source.

        Step 1: Load bundled seed data (guaranteed to work, no network).
        Step 2: Try live EMA JSON for full/updated data.
        Step 3: Mark as loaded if we have any data.
        """
        # Step 1: Always load seed data first
        self._load_seed_data()

        # Step 2: Try live EMA source — if successful, it replaces seed data
        try:
            logger.info("Fetching EMA medicines data from %s", EMA_MEDICINES_URL)
            async with httpx.AsyncClient(
                timeout=REQUEST_TIMEOUT,
                follow_redirects=True,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                    "Accept": "application/json, text/html, */*;q=0.8",
                },
            ) as client:
                response = await client.get(EMA_MEDICINES_URL)
                response.raise_for_status()
                data = response.json()

            # The JSON may be a list directly or wrapped in an object
            live_medicines: list[dict] = []
            if isinstance(data, list):
                live_medicines = data
            elif isinstance(data, dict):
                for key in ("data", "medicines", "results"):
                    if key in data and isinstance(data[key], list):
                        live_medicines = data[key]
                        break
                else:
                    live_medicines = list(data.values()) if data else []

            if live_medicines:
                self._medicines = _filter_human_medicines(live_medicines)
                logger.info("Loaded %d human medicines from live EMA source", len(self._medicines))
            else:
                logger.info("Live EMA source returned no data — keeping seed data")
        except Exception:
            logger.info("Could not fetch live EMA data — using seed data (%d medicines)", len(self._medicines))

        # Step 3: Mark as loaded if we have any data
        self._loaded = len(self._medicines) > 0
        logger.info("EMA service ready: %d medicines (loaded=%s)", len(self._medicines), self._loaded)

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
            url = _get_str(med, "url", "product_page_url", "ema_url")

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


def _filter_human_medicines(medicines: list[dict]) -> list[dict]:
    """Filter to only human medicines, excluding veterinary products.

    Uses the 'category' field from EMA data (values: 'Human', 'Veterinary').
    Falls back to checking if the URL contains '/human/' or the EMA product
    number contains '/H/' (human) vs '/V/' (veterinary).
    If no category info is available, the medicine is kept (assumed human).
    """
    result = []
    for med in medicines:
        category = _get_str(med, "category", "medicine_category").lower()
        if category:
            if category == "human":
                result.append(med)
            # Skip veterinary or other non-human categories
            continue

        # Fallback: check URL or product number for human indicator
        url = _get_str(med, "url", "product_page_url", "ema_url").lower()
        ema_num = _get_str(
            med, "emaNumber", "ema_product_number", "product_number",
        ).upper()
        if "/veterinary/" in url or "/V/" in ema_num:
            continue

        # No category info — assume human
        result.append(med)
    return result


def _get_str(data: dict, *keys: str) -> str:
    """Try multiple possible key names and return the first non-empty string value."""
    for key in keys:
        val = data.get(key)
        if val is not None:
            return str(val).strip()
    return ""
