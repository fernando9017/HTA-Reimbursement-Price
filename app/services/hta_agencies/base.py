"""Abstract base class for HTA agency adapters.

Each country's HTA agency (HAS, G-BA, NICE, etc.) implements this interface
so the application can query assessments uniformly across countries.
"""

import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path

from app.models import AssessmentResult, CountryInfo

logger = logging.getLogger(__name__)


class HTAAgency(ABC):
    """Base class that all country HTA agency adapters must implement."""

    @property
    @abstractmethod
    def country_code(self) -> str:
        """ISO 3166-1 alpha-2 country code (e.g., 'FR', 'DE', 'GB')."""
        ...

    @property
    @abstractmethod
    def country_name(self) -> str:
        """Full country name in English."""
        ...

    @property
    @abstractmethod
    def agency_abbreviation(self) -> str:
        """Short agency name (e.g., 'HAS', 'G-BA', 'NICE')."""
        ...

    @property
    @abstractmethod
    def agency_full_name(self) -> str:
        """Full agency name."""
        ...

    @abstractmethod
    async def load_data(self) -> None:
        """Fetch and cache the agency's assessment data from the live source."""
        ...

    @abstractmethod
    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Search for HTA assessments by active substance and optionally product name.

        Args:
            active_substance: The INN/active substance to search for.
            product_name: Optional brand/product name to narrow results.

        Returns:
            List of assessment results with ratings and links.
        """
        ...

    @property
    def is_loaded(self) -> bool:
        """Whether data has been loaded. Override if tracking load state."""
        return False

    # ── Bundled data file interface ───────────────────────────────────
    # Concrete adapters may override these to support fast file-based
    # startup without a network dependency.  The default implementations
    # are no-ops so that existing adapters work unchanged.

    def load_from_file(self, data_file: Path) -> bool:
        """Load cached assessment data from a local JSON file.

        Returns True if data was successfully loaded and the adapter is now
        ready to serve requests.  Returns False if the file does not exist,
        is empty, or this adapter does not support file-based loading.
        """
        return False

    def save_to_file(self, data_file: Path) -> None:
        """Persist the currently loaded data to a local JSON file.

        Creates the file and any missing parent directories.
        Does nothing if data has not been loaded or the adapter does not
        support file-based caching.
        """

    # ── Helpers ───────────────────────────────────────────────────────

    def _safe_write_json_file(self, data_file: Path, payload: dict) -> None:
        """Write *payload* only if it has at least as many records as the
        existing file.  This prevents a partial remote fetch from
        overwriting a richer bundled dataset.
        """
        new_count = payload.get("record_count", 0)
        existing = self._read_json_file(data_file)
        if existing is not None:
            old_count = existing.get("record_count", 0)
            if new_count < old_count * 0.8:  # allow up to 20% shrinkage
                logger.warning(
                    "%s: refusing to overwrite cache (%d records) with smaller "
                    "dataset (%d records)",
                    self.agency_abbreviation, old_count, new_count,
                )
                return
        self._write_json_file(data_file, payload)

    def _read_json_file(self, data_file: Path) -> dict | None:
        """Read and parse a JSON data file. Returns None on any error."""
        try:
            with open(data_file, encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            return None
        except Exception:
            logger.warning(
                "%s: could not read data file %s",
                self.agency_abbreviation, data_file,
            )
            return None

    def _write_json_file(self, data_file: Path, payload: dict) -> None:
        """Serialize payload to a JSON file, creating parents as needed."""
        data_file.parent.mkdir(parents=True, exist_ok=True)
        with open(data_file, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)

    def _make_envelope(self, data: list | dict) -> dict:
        """Wrap serialized data in a standard envelope with metadata."""
        count = len(data) if isinstance(data, list) else sum(
            len(v) if isinstance(v, list) else 1 for v in data.values()
        )
        return {
            "country": self.country_code,
            "agency": self.agency_abbreviation,
            "updated_at": datetime.now().isoformat(timespec="seconds"),
            "record_count": count,
            "data": data,
        }

    def get_country_info(self) -> CountryInfo:
        return CountryInfo(
            code=self.country_code,
            name=self.country_name,
            agency=self.agency_abbreviation,
            agency_full_name=self.agency_full_name,
            is_loaded=self.is_loaded,
        )
