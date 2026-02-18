"""Analogue selection service.

Uses EMA medicine data to find analogues for a given therapy based on
configurable filters: therapeutic area, orphan status, years since
approval, first approval, and authorisation status.
"""

import logging
import re
from datetime import date, timedelta

logger = logging.getLogger(__name__)


class AnalogueService:
    """Finds analogue medicines from EMA data using multi-criteria filters."""

    def __init__(self) -> None:
        # Enriched medicine records ready for filtering
        self._medicines: list[dict] = []
        # Active substance → earliest authorisation date (for first-approval flag)
        self._first_approval_dates: dict[str, str] = {}
        # Unique therapeutic areas found in the data
        self._therapeutic_areas: list[str] = []
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_from_ema(self, raw_medicines: list[dict]) -> None:
        """Enrich and index EMA medicine records for analogue filtering.

        Should be called after EMAService.load_data() with the raw list.
        """
        enriched: list[dict] = []
        substance_dates: dict[str, list[str]] = {}
        area_set: set[str] = set()

        for med in raw_medicines:
            name = _get_str(med, "medicineName", "name_of_medicine", "medicine_name")
            substance = _get_str(
                med, "activeSubstance", "active_substance",
                "inn_common_name", "internationalNonProprietaryNameINN",
            )
            indication = _get_str(
                med, "therapeuticIndication", "therapeutic_indication",
                "condition_indication",
            )
            status = _get_str(
                med, "authorisationStatus", "authorisation_status",
                "marketing_authorisation_status",
            )
            ema_number = _get_str(
                med, "emaNumber", "ema_product_number", "product_number",
            )
            therapeutic_area = _get_str(
                med, "condition", "therapeutic_area",
                "therapeuticArea", "therapeutic_area_mesh",
            )
            url = _get_str(med, "url", "product_page_url", "ema_url")

            # Orphan status
            orphan_raw = _get_str(
                med, "orphanMedicine", "orphan_medicine",
                "orphan_designation", "orphan",
            ).lower()
            orphan = orphan_raw in ("yes", "true", "1", "orphan")

            # Authorisation date
            auth_date = _get_str(
                med, "authorisationDate", "marketing_authorisation_date",
                "first_published", "initial_authorisation_date",
                "marketingAuthorisationDate",
            )
            auth_date = _normalize_date(auth_date)

            # Generic / biosimilar
            generic_raw = _get_str(
                med, "generic", "genericMedicine", "generic_medicine",
            ).lower()
            biosimilar_raw = _get_str(
                med, "biosimilar", "biosimilarMedicine", "biosimilar_medicine",
            ).lower()
            is_generic = generic_raw in ("yes", "true", "1")
            is_biosimilar = biosimilar_raw in ("yes", "true", "1")

            # ATC code
            atc_code = _get_str(med, "atcCode", "atc_code", "ATC_code")

            # Track therapeutic areas
            if therapeutic_area:
                # NICE/EMA may have semicolon-separated areas
                for area in re.split(r"[;,]", therapeutic_area):
                    area = area.strip()
                    if area:
                        area_set.add(area)

            # Track first approval per substance
            substance_key = substance.lower().strip()
            if substance_key and auth_date:
                substance_dates.setdefault(substance_key, []).append(auth_date)

            record = {
                "name": name,
                "active_substance": substance,
                "therapeutic_indication": indication,
                "authorisation_status": status,
                "ema_number": ema_number,
                "therapeutic_area": therapeutic_area,
                "orphan_medicine": orphan,
                "authorisation_date": auth_date,
                "url": url,
                "generic": is_generic,
                "biosimilar": is_biosimilar,
                "atc_code": atc_code,
            }
            enriched.append(record)

        # Compute first approval dates per substance
        for subst, dates in substance_dates.items():
            sorted_dates = sorted(d for d in dates if d)
            if sorted_dates:
                self._first_approval_dates[subst] = sorted_dates[0]

        # Mark first_approval flag on each record
        for rec in enriched:
            subst_key = rec["active_substance"].lower().strip()
            first_date = self._first_approval_dates.get(subst_key, "")
            rec["first_approval"] = (
                bool(rec["authorisation_date"])
                and rec["authorisation_date"] == first_date
            )

        self._medicines = enriched
        self._therapeutic_areas = sorted(area_set)
        self._loaded = True
        logger.info(
            "Analogue service loaded: %d medicines, %d therapeutic areas",
            len(self._medicines), len(self._therapeutic_areas),
        )

    def get_therapeutic_areas(self) -> list[str]:
        """Return the list of unique therapeutic areas found in the data."""
        return self._therapeutic_areas

    def get_filter_options(self) -> dict:
        """Return all available filter options for the frontend."""
        statuses: set[str] = set()
        for med in self._medicines:
            if med["authorisation_status"]:
                statuses.add(med["authorisation_status"])

        return {
            "therapeutic_areas": self._therapeutic_areas,
            "year_ranges": [
                {"label": "Last 3 years", "value": 3},
                {"label": "Last 5 years", "value": 5},
                {"label": "Last 10 years", "value": 10},
                {"label": "Last 15 years", "value": 15},
                {"label": "All time", "value": 0},
            ],
            "statuses": sorted(statuses),
        }

    def search(
        self,
        therapeutic_area: str = "",
        orphan: str = "",  # "yes", "no", or "" (any)
        years_since_approval: int = 0,  # 0 = all time
        first_approval: str = "",  # "yes", "no", or "" (any)
        status: str = "",
        substance: str = "",
        name: str = "",
        exclude_generics: bool = False,
        exclude_biosimilars: bool = False,
        limit: int = 200,
    ) -> list[dict]:
        """Search for analogue medicines matching the given filters.

        Returns a list of enriched medicine dicts sorted by authorisation
        date descending.
        """
        if not self._loaded:
            return []

        cutoff_date = ""
        if years_since_approval > 0:
            cutoff = date.today() - timedelta(days=years_since_approval * 365)
            cutoff_date = cutoff.isoformat()

        results = []
        area_lower = therapeutic_area.lower().strip()
        status_lower = status.lower().strip()
        substance_lower = substance.lower().strip()
        name_lower = name.lower().strip()

        for med in self._medicines:
            # Filter: therapeutic area
            if area_lower:
                med_area = med["therapeutic_area"].lower()
                if area_lower not in med_area:
                    continue

            # Filter: orphan status
            if orphan == "yes" and not med["orphan_medicine"]:
                continue
            if orphan == "no" and med["orphan_medicine"]:
                continue

            # Filter: years since approval
            if cutoff_date:
                if not med["authorisation_date"] or med["authorisation_date"] < cutoff_date:
                    continue

            # Filter: first approval
            if first_approval == "yes" and not med["first_approval"]:
                continue
            if first_approval == "no" and med["first_approval"]:
                continue

            # Filter: authorisation status
            if status_lower and med["authorisation_status"].lower() != status_lower:
                continue

            # Filter: substance name (partial match)
            if substance_lower:
                if substance_lower not in med["active_substance"].lower():
                    continue

            # Filter: medicine name (partial match)
            if name_lower:
                if name_lower not in med["name"].lower():
                    continue

            # Filter: exclude generics
            if exclude_generics and med["generic"]:
                continue

            # Filter: exclude biosimilars
            if exclude_biosimilars and med["biosimilar"]:
                continue

            results.append(med)

        # Sort by authorisation date descending
        results.sort(key=lambda r: r.get("authorisation_date", ""), reverse=True)
        return results[:limit]


def _get_str(data: dict, *keys: str) -> str:
    """Try multiple possible key names, return first non-empty value."""
    for key in keys:
        val = data.get(key)
        if val is not None:
            return str(val).strip()
    return ""


def _normalize_date(raw: str) -> str:
    """Normalize various date formats to YYYY-MM-DD."""
    raw = raw.strip()
    if not raw:
        return ""
    # Already YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw
    # YYYYMMDD
    if re.match(r"^\d{8}$", raw):
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    # DD/MM/YYYY or DD.MM.YYYY
    m = re.match(r"^(\d{1,2})[./](\d{1,2})[./](\d{4})$", raw)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    # YYYY-MM-DDT... (ISO with time)
    m = re.match(r"^(\d{4}-\d{2}-\d{2})T", raw)
    if m:
        return m.group(1)
    # Try to extract just a year
    m = re.match(r"^(\d{4})$", raw)
    if m:
        return f"{raw}-01-01"
    return raw
