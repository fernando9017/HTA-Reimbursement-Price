"""Service for fetching and searching EMA (European Medicines Agency) medicine data.

Data source: EMA public JSON data file, updated twice daily.
No authentication required.
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path

import httpx

from app.config import EMA_MEDICINES_URL, REQUEST_TIMEOUT, SSL_VERIFY
from app.models import MedicineResult

logger = logging.getLogger(__name__)

# Standard browser-like headers to avoid being blocked by WAF/CDN
_HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

# Maximum retries with exponential backoff
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 2  # seconds


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
        """Download and parse the EMA medicines JSON file.

        Retries with exponential backoff on failure.
        """
        logger.info("Fetching EMA medicines data from %s", EMA_MEDICINES_URL)
        last_error: Exception | None = None

        for attempt in range(_MAX_RETRIES):
            try:
                async with httpx.AsyncClient(
                    timeout=REQUEST_TIMEOUT,
                    follow_redirects=True,
                    verify=SSL_VERIFY,
                    headers=_HTTP_HEADERS,
                ) as client:
                    response = await client.get(EMA_MEDICINES_URL)
                    response.raise_for_status()
                    data = response.json()

                self._parse_json(data)
                self._loaded = True
                logger.info("Loaded %d medicines from EMA", len(self._medicines))
                return
            except Exception as e:
                last_error = e
                if attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "EMA fetch attempt %d/%d failed: %s — retrying in %ds",
                        attempt + 1, _MAX_RETRIES, e, delay,
                    )
                    await asyncio.sleep(delay)

        raise last_error  # type: ignore[misc]

    def _parse_json(self, data: object) -> None:
        """Parse the EMA JSON response into the internal medicines list."""
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

    # ── File-based caching ──────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        """Load EMA medicine data from a local JSON cache file.

        Returns True if data was loaded successfully.
        """
        try:
            if not data_file.exists():
                return False
            with open(data_file, encoding="utf-8") as fh:
                envelope = json.load(fh)
            medicines = envelope.get("data", [])
            if not medicines:
                return False
            self._medicines = medicines
            self._loaded = True
            logger.info(
                "EMA data loaded from cache (%s): %d medicines (cached at %s)",
                data_file.name, len(self._medicines),
                envelope.get("updated_at", "unknown"),
            )
            return True
        except Exception:
            logger.warning("Could not load EMA cache from %s", data_file)
            return False

    def save_to_file(self, data_file: Path) -> None:
        """Save the currently loaded EMA data to a local JSON cache file.

        Refuses to overwrite an existing cache with significantly fewer
        records (>20% drop) to protect bundled data from partial fetches.
        """
        if not self._loaded or not self._medicines:
            return
        data_file.parent.mkdir(parents=True, exist_ok=True)
        new_count = len(self._medicines)

        # Protect existing cache from being overwritten with fewer records
        if data_file.exists():
            try:
                with open(data_file, encoding="utf-8") as fh:
                    old_envelope = json.load(fh)
                old_count = old_envelope.get("record_count", 0)
                if new_count < old_count * 0.8:
                    logger.warning(
                        "EMA: refusing to overwrite cache (%d records) with "
                        "smaller dataset (%d records)",
                        old_count, new_count,
                    )
                    return
            except Exception:
                pass  # can't read old file — safe to overwrite

        envelope = {
            "source": "EMA",
            "updated_at": datetime.now().isoformat(timespec="seconds"),
            "record_count": new_count,
            "data": self._medicines,
        }
        with open(data_file, "w", encoding="utf-8") as fh:
            json.dump(envelope, fh, ensure_ascii=False)
        logger.info("EMA data cached to %s (%d medicines)", data_file, new_count)

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
