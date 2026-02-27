"""UK NICE HTA Deep-Dive service.

Wraps the existing UKNICE adapter data to provide:
 - Drug listing with search/filter by guidance type and recommendation
 - Guidance items grouped by active substance
 - Links to source NICE guidance pages
"""

import logging
from collections import defaultdict

from app.models import (
    NICEDrugListItem,
    NICEDrugProfile,
    NICEFilterOptions,
    NICEGuidanceItem,
    NICESearchResponse,
)
from app.services.hta_agencies.uk_nice import UKNICE

logger = logging.getLogger(__name__)

# Recommendation ordering (best to worst)
RECOMMENDATION_ORDER = [
    "Recommended",
    "Recommended with restrictions (Optimised)",
    "Only in research",
    "Terminated appraisal",
    "Awaiting development",
    "Not recommended",
]


class UKNICEHTAService:
    """Deep-dive intelligence layer on top of the UKNICE adapter."""

    def __init__(self, nice_adapter: UKNICE) -> None:
        self._nice = nice_adapter

    @property
    def is_loaded(self) -> bool:
        return self._nice.is_loaded

    # ── Drug listing / search ─────────────────────────────────────────

    def search_drugs(
        self,
        query: str = "",
        guidance_type: str = "",
        recommendation: str = "",
        limit: int = 100,
    ) -> NICESearchResponse:
        """List drugs with NICE guidance, optionally filtered.

        Supports search by molecule name (INN) or brand name by
        consulting the brand ↔ substance mapping from EMA data.
        """
        profiles = self._build_substance_profiles()

        results: list[NICEDrugListItem] = []
        query_lower = query.lower().strip()

        # Resolve brand → substance if applicable
        resolved_substance = ""
        if query_lower:
            brand_map = self._nice._brand_to_substance
            if query_lower in brand_map:
                resolved_substance = brand_map[query_lower]

        for substance, profile in sorted(profiles.items()):
            if query_lower:
                searchable = (
                    substance.lower() + " "
                    + " ".join(t.lower() for t in profile["titles"])
                    + " "
                    + " ".join(b for b in profile.get("brand_names", []))
                )
                direct_match = query_lower in searchable
                resolved_match = (
                    resolved_substance
                    and resolved_substance in substance.lower()
                )
                if not direct_match and not resolved_match:
                    continue

            if guidance_type:
                if guidance_type not in profile["guidance_types"]:
                    continue

            if recommendation:
                if recommendation not in profile["recommendations"]:
                    continue

            best_rec = self._best_recommendation(profile["recommendations"])

            results.append(NICEDrugListItem(
                active_substance=substance,
                titles=profile["titles"][:3],
                guidance_count=profile["guidance_count"],
                latest_date=profile["latest_date"],
                best_recommendation=best_rec,
                guidance_types=sorted(set(profile["guidance_types"])),
            ))

        results.sort(key=lambda r: (r.latest_date, r.active_substance), reverse=True)

        return NICESearchResponse(
            total=len(results),
            results=results[:limit],
        )

    # ── Drug profile (detailed) ───────────────────────────────────────

    def get_drug_profile(self, substance: str) -> NICEDrugProfile | None:
        """Get the full NICE guidance profile for one active substance.

        Supports lookup by INN (molecule name) or brand name.
        """
        profiles = self._build_substance_profiles()
        substance_lower = substance.lower().strip()

        matched_key = None
        for key in profiles:
            if key.lower() == substance_lower:
                matched_key = key
                break

        # If not found by substance, try resolving as brand name
        if matched_key is None:
            resolved = self._nice._brand_to_substance.get(substance_lower, "")
            if resolved:
                for key in profiles:
                    if key.lower() == resolved:
                        matched_key = key
                        break

        if matched_key is None:
            return None

        profile = profiles[matched_key]

        return NICEDrugProfile(
            active_substance=matched_key,
            titles=profile["titles"],
            total_guidance=profile["guidance_count"],
            guidance_items=profile["guidance_items"],
        )

    # ── Filter options ────────────────────────────────────────────────

    def get_filter_options(self) -> NICEFilterOptions:
        """Return available filter options for the UI."""
        type_set: set[str] = set()
        rec_set: set[str] = set()

        for g in self._nice._guidance_list:
            gt = g.get("guidance_type", "")
            if gt:
                type_set.add(gt)
            rec = g.get("recommendation", "")
            if rec:
                from app.services.hta_agencies.uk_nice import _normalize_recommendation
                norm = _normalize_recommendation(rec)
                if norm:
                    rec_set.add(norm)

        # Sort recommendations by defined order
        rec_sorted = sorted(
            rec_set,
            key=lambda x: RECOMMENDATION_ORDER.index(x) if x in RECOMMENDATION_ORDER else 99,
        )

        return NICEFilterOptions(
            guidance_types=sorted(type_set),
            recommendations=rec_sorted,
        )

    # ── Assessment lookup for AI analysis ─────────────────────────────

    def find_guidance_by_reference(self, guidance_ref: str) -> dict | None:
        """Find a guidance item by its reference (e.g. 'TA900')."""
        ref_upper = guidance_ref.upper().strip()

        for g in self._nice._guidance_list:
            if g.get("reference", "").upper() == ref_upper:
                from app.services.hta_agencies.uk_nice import _normalize_recommendation
                rec = _normalize_recommendation(g.get("recommendation", ""))

                # Try to extract substance from title
                substance = self._extract_substance_from_title(g.get("title", ""))

                return {
                    "guidance_reference": g.get("reference", ""),
                    "title": g.get("title", ""),
                    "active_substance": substance,
                    "guidance_type": g.get("guidance_type", ""),
                    "recommendation": rec,
                    "published_date": g.get("published_date", ""),
                    "assessment_url": g.get("url", ""),
                }

        return None

    # ── Internal helpers ──────────────────────────────────────────────

    def _build_substance_profiles(self) -> dict[str, dict]:
        """Group guidance items by substance extracted from titles.

        Also includes brand names from the EMA mapping for each substance
        so that the deep-dive search can match by brand name.
        """
        from app.services.hta_agencies.uk_nice import _normalize_recommendation

        by_substance: dict[str, list[dict]] = defaultdict(list)
        # Normalise keys: canonical (lowercase) → display name
        canonical_display: dict[str, str] = {}

        for g in self._nice._guidance_list:
            substance = self._extract_substance_from_title(g.get("title", ""))
            if not substance:
                substance = g.get("title", "Unknown")[:60]
            canonical = substance.lower().strip()
            if canonical not in canonical_display:
                canonical_display[canonical] = substance
            by_substance[canonical].append(g)

        # Brand name mapping from the adapter (populated from EMA data)
        sub_to_brands = self._nice._substance_to_brands

        profiles: dict[str, dict] = {}
        for canonical, items in by_substance.items():
            display_name = canonical_display.get(canonical, canonical)
            titles: list[str] = []
            guidance_types: list[str] = []
            recommendations: list[str] = []
            latest_date = ""
            seen_titles: set[str] = set()

            guidance_items: list[NICEGuidanceItem] = []

            for g in items:
                title = g.get("title", "")
                if title and title not in seen_titles:
                    titles.append(title)
                    seen_titles.add(title)

                gt = g.get("guidance_type", "")
                if gt:
                    guidance_types.append(gt)

                rec = _normalize_recommendation(g.get("recommendation", ""))
                if rec:
                    recommendations.append(rec)

                date = g.get("published_date", "")
                if date > latest_date:
                    latest_date = date

                guidance_items.append(NICEGuidanceItem(
                    guidance_reference=g.get("reference", ""),
                    title=title,
                    guidance_type=gt,
                    recommendation=rec,
                    published_date=date,
                    assessment_url=g.get("url", ""),
                ))

            guidance_items.sort(key=lambda x: x.published_date, reverse=True)

            # Collect brand names for this substance from EMA mapping
            brand_names = sorted(sub_to_brands.get(canonical, set()))

            profiles[display_name] = {
                "titles": titles,
                "guidance_types": guidance_types,
                "recommendations": recommendations,
                "latest_date": latest_date,
                "guidance_count": len(guidance_items),
                "guidance_items": guidance_items,
                "brand_names": brand_names,
            }

        return profiles

    def _best_recommendation(self, recommendations: list[str]) -> str:
        """Return the best (most favorable) recommendation from a list."""
        if not recommendations:
            return ""
        best_idx = len(RECOMMENDATION_ORDER)
        best_val = ""
        for r in recommendations:
            try:
                idx = RECOMMENDATION_ORDER.index(r)
            except ValueError:
                idx = len(RECOMMENDATION_ORDER)
            if idx < best_idx:
                best_idx = idx
                best_val = r
        return best_val

    def _extract_substance_from_title(self, title: str) -> str:
        """Extract the active substance/drug name from a NICE guidance title.

        NICE titles follow patterns like:
          "Pembrolizumab for treating advanced melanoma after disease progression"
          "Nivolumab with ipilimumab for untreated advanced renal cell carcinoma"
        """
        if not title:
            return ""

        # Remove common NICE title prefixes
        title_clean = title.strip()

        # Pattern: "Drug for treating/for/with..."
        import re
        match = re.match(
            r'^(.+?)\s+(?:for\s+(?:treating|the\s+treatment|previously|untreated|adjuvant|use)|'
            r'with\s+(?:carboplatin|docetaxel|paclitaxel|gemcitabine|pemetrexed|'
            r'bevacizumab|rituximab|trastuzumab|pertuzumab|cetuximab))',
            title_clean, re.IGNORECASE,
        )
        if match:
            substance = match.group(1).strip()
            # Remove trailing "and" or "plus" fragments
            substance = re.sub(r'\s+(?:and|plus|in\s+combination)\s*$', '', substance, flags=re.IGNORECASE)
            return substance

        # Pattern: "Drug with Drug2 for..."
        match = re.match(
            r'^(.+?)\s+for\s+',
            title_clean, re.IGNORECASE,
        )
        if match:
            return match.group(1).strip()

        # Fallback: first few words (up to first preposition)
        match = re.match(
            r'^(.+?)\s+(?:for|as|in|after|to|with)\s+',
            title_clean, re.IGNORECASE,
        )
        if match:
            return match.group(1).strip()

        return title_clean[:60]
