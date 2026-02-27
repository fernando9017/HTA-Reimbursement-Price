"""Spain AEMPS HTA Deep-Dive service.

Wraps the existing SpainAEMPS adapter data to provide:
 - Drug listing with search/filter by therapeutic positioning
 - IPT reports grouped by active substance
 - Links to source IPT documents
 - Bifimed (reimbursement status) context
"""

import logging
from collections import defaultdict

from app.models import (
    AEMPSDrugListItem,
    AEMPSDrugProfile,
    AEMPSFilterOptions,
    AEMPSIPTItem,
    AEMPSSearchResponse,
)
from app.services.hta_agencies.spain_aemps import (
    POSITIONING_DISPLAY,
    SpainAEMPS,
    _normalize_positioning,
)

logger = logging.getLogger(__name__)

# Positioning ordering (best to worst)
POSITIONING_ORDER = [
    "Favorable",
    "Favorable with conditions (Condicionado)",
    "Pending (Pendiente)",
    "Unfavorable (No favorable)",
    "Unfavorable (Desfavorable)",
]


class SpainAEMPSHTAService:
    """Deep-dive intelligence layer on top of the SpainAEMPS adapter."""

    def __init__(self, aemps_adapter: SpainAEMPS) -> None:
        self._aemps = aemps_adapter

    @property
    def is_loaded(self) -> bool:
        return self._aemps.is_loaded

    # ── Drug listing / search ─────────────────────────────────────────

    def search_drugs(
        self,
        query: str = "",
        positioning: str = "",
        limit: int = 100,
    ) -> AEMPSSearchResponse:
        """List drugs with AEMPS IPT reports, optionally filtered."""
        profiles = self._build_substance_profiles()

        results: list[AEMPSDrugListItem] = []
        query_lower = query.lower().strip()

        for substance, profile in sorted(profiles.items()):
            if query_lower:
                searchable = substance.lower() + " " + " ".join(
                    t.lower() for t in profile["titles"]
                )
                if query_lower not in searchable:
                    continue

            if positioning:
                if positioning not in profile["positionings"]:
                    continue

            best_pos = self._best_positioning(profile["positionings"])

            results.append(AEMPSDrugListItem(
                active_substance=substance,
                titles=profile["titles"][:3],
                ipt_count=profile["ipt_count"],
                latest_date=profile["latest_date"],
                best_positioning=best_pos,
                best_positioning_en=best_pos,
            ))

        results.sort(key=lambda r: (r.latest_date, r.active_substance), reverse=True)

        return AEMPSSearchResponse(
            total=len(results),
            results=results[:limit],
        )

    # ── Drug profile (detailed) ───────────────────────────────────────

    def get_drug_profile(self, substance: str) -> AEMPSDrugProfile | None:
        """Get the full AEMPS IPT profile for one active substance."""
        profiles = self._build_substance_profiles()
        substance_lower = substance.lower().strip()

        matched_key = None
        for key in profiles:
            if key.lower() == substance_lower:
                matched_key = key
                break

        if matched_key is None:
            return None

        profile = profiles[matched_key]

        return AEMPSDrugProfile(
            active_substance=matched_key,
            titles=profile["titles"],
            total_ipts=profile["ipt_count"],
            ipt_items=profile["ipt_items"],
        )

    # ── Filter options ────────────────────────────────────────────────

    def get_filter_options(self) -> AEMPSFilterOptions:
        """Return available filter options for the UI."""
        pos_set: set[str] = set()

        for ipt in self._aemps._ipt_list:
            pos = ipt.get("positioning", "")
            if pos:
                norm = _normalize_positioning(pos)
                if norm:
                    pos_set.add(norm)

        pos_sorted = sorted(
            pos_set,
            key=lambda x: POSITIONING_ORDER.index(x) if x in POSITIONING_ORDER else 99,
        )

        return AEMPSFilterOptions(
            positioning_values=pos_sorted,
        )

    # ── Assessment lookup for AI analysis ─────────────────────────────

    def find_ipt_by_reference(self, ipt_ref: str) -> dict | None:
        """Find an IPT entry by its reference (e.g. 'IPT-23/2024')."""
        ref_upper = ipt_ref.upper().strip()

        for ipt in self._aemps._ipt_list:
            if ipt.get("reference", "").upper() == ref_upper:
                pos = _normalize_positioning(ipt.get("positioning", ""))
                substance = self._extract_substance_from_title(ipt.get("title", ""))

                return {
                    "ipt_reference": ipt.get("reference", ""),
                    "title": ipt.get("title", ""),
                    "active_substance": substance,
                    "positioning": pos,
                    "published_date": ipt.get("published_date", ""),
                    "assessment_url": ipt.get("url", ""),
                }

        return None

    # ── Internal helpers ──────────────────────────────────────────────

    def _build_substance_profiles(self) -> dict[str, dict]:
        """Group IPT items by substance extracted from titles.

        Normalises substance names to title-case for consistent grouping
        and resolves brand names in parentheses to their INN substance so
        that IPTs for the same drug are not split across multiple keys.
        """
        by_substance: dict[str, list[dict]] = defaultdict(list)
        # Canonical-key → display-key mapping (first seen casing wins)
        canonical_display: dict[str, str] = {}
        # Brand-name → canonical substance mapping from parenthetical names
        brand_to_substance: dict[str, str] = {}

        for ipt in self._aemps._ipt_list:
            substance, brand = self._extract_substance_and_brand(ipt.get("title", ""))
            if not substance:
                substance = ipt.get("title", "Unknown")[:60]

            canonical = substance.lower().strip()

            # If we know this brand maps to a substance, use that
            if canonical in brand_to_substance:
                canonical = brand_to_substance[canonical]
                substance = canonical_display.get(canonical, substance)

            # Register brand → substance mapping
            if brand:
                brand_canonical = brand.lower().strip()
                if brand_canonical not in brand_to_substance:
                    brand_to_substance[brand_canonical] = canonical

            if canonical not in canonical_display:
                canonical_display[canonical] = substance

            by_substance[canonical].append(ipt)

        profiles: dict[str, dict] = {}
        for canonical, items in by_substance.items():
            display_name = canonical_display.get(canonical, canonical)
            titles: list[str] = []
            positionings: list[str] = []
            latest_date = ""
            seen_titles: set[str] = set()

            ipt_items: list[AEMPSIPTItem] = []

            for ipt in items:
                title = ipt.get("title", "")
                if title and title not in seen_titles:
                    titles.append(title)
                    seen_titles.add(title)

                pos = _normalize_positioning(ipt.get("positioning", ""))
                if pos:
                    positionings.append(pos)

                date = ipt.get("published_date", "")
                if date > latest_date:
                    latest_date = date

                ipt_items.append(AEMPSIPTItem(
                    ipt_reference=ipt.get("reference", ""),
                    title=title,
                    positioning=ipt.get("positioning", ""),
                    positioning_en=pos,
                    published_date=date,
                    assessment_url=ipt.get("url", ""),
                ))

            ipt_items.sort(key=lambda x: x.published_date, reverse=True)

            profiles[display_name] = {
                "titles": titles,
                "positionings": positionings,
                "latest_date": latest_date,
                "ipt_count": len(ipt_items),
                "ipt_items": ipt_items,
            }

        return profiles

    def _best_positioning(self, positionings: list[str]) -> str:
        """Return the best (most favorable) positioning from a list."""
        if not positionings:
            return ""
        best_idx = len(POSITIONING_ORDER)
        best_val = ""
        for p in positionings:
            try:
                idx = POSITIONING_ORDER.index(p)
            except ValueError:
                idx = len(POSITIONING_ORDER)
            if idx < best_idx:
                best_idx = idx
                best_val = p
        return best_val

    def _extract_substance_from_title(self, title: str) -> str:
        """Extract the active substance from an IPT title (backward compat)."""
        substance, _ = self._extract_substance_and_brand(title)
        return substance

    def _extract_substance_and_brand(self, title: str) -> tuple[str, str]:
        """Extract active substance and brand name from an IPT title.

        Spanish IPT titles follow patterns like:
          "Pembrolizumab (Keytruda) en cáncer de pulmón"
          "Informe de posicionamiento terapéutico de nivolumab (Opdivo)"
          "IPT-23/2024 - Trastuzumab deruxtecan (Enhertu) en cáncer de mama"

        Returns (substance, brand) — brand may be empty.
        """
        if not title:
            return "", ""

        import re

        # Remove common IPT title prefixes (multiple variants)
        clean = title.strip()
        clean = re.sub(
            r'^(?:Informe\s+de\s+posicionamiento\s+terapéutico\s+'
            r'(?:de|del|sobre|para)\s+)',
            '', clean, flags=re.IGNORECASE,
        )
        clean = re.sub(
            r'^(?:IPT[- ]?\d+/\d{4}(?:v\d+)?\s*[-–:.]?\s*)',
            '', clean, flags=re.IGNORECASE,
        )
        clean = clean.strip()

        # Try to extract "Substance (Brand)" pattern first
        # Allow 1-4 word substance names with hyphens/numbers
        match = re.match(
            r'^([\w\-áéíóúñÁÉÍÓÚÑüÜ]+(?:\s+[\w\-áéíóúñÁÉÍÓÚÑüÜ]+){0,3})'
            r'\s*\(([^)]+)\)',
            clean, re.UNICODE,
        )
        if match:
            substance = match.group(1).strip()
            brand = match.group(2).strip()
            # Don't return common Spanish words as substance
            skip = {"informe", "de", "del", "para", "en", "con", "como", "por",
                    "sobre", "uso", "humano", "medicamentos"}
            if substance.lower() not in skip and len(substance) > 2:
                return substance, brand

        # No parenthetical brand — extract substance before prepositions
        match = re.match(
            r'^([\w\-áéíóúñÁÉÍÓÚÑüÜ]+(?:\s+[\w\-áéíóúñÁÉÍÓÚÑüÜ]+){0,3})'
            r'(?:\s+(?:en|para|como|con|tras|frente|versus|vs)\s+)',
            clean, re.IGNORECASE | re.UNICODE,
        )
        if match:
            substance = match.group(1).strip()
            skip = {"informe", "de", "del", "para", "en", "con", "como", "por",
                    "sobre", "uso", "humano", "medicamentos"}
            if substance.lower() not in skip and len(substance) > 2:
                return substance, ""

        # Fallback: first 1-3 words (drug names are typically 1-3 words)
        match = re.match(
            r'^([\w\-áéíóúñÁÉÍÓÚÑüÜ]+(?:\s+[\w\-áéíóúñÁÉÍÓÚÑüÜ]+){0,2})',
            clean, re.UNICODE,
        )
        if match:
            substance = match.group(1).strip()
            skip = {"informe", "de", "del", "para", "en", "con", "como", "por",
                    "sobre", "uso", "humano", "medicamentos"}
            if substance.lower() not in skip and len(substance) > 2:
                return substance, ""

        return clean[:60], ""
