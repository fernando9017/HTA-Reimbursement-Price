"""UK NICE HTA Deep-Dive service.

Wraps the existing UKNICE adapter data to provide:
 - Drug listing with search/filter by guidance type and recommendation
 - Guidance items grouped by active substance
 - Links to source NICE guidance pages
"""

import asyncio
import logging
import re
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

# Words that are NOT valid substance names (garbage from title parsing)
_INVALID_SUBSTANCES = {
    "overview", "introduction", "consultation", "evidence",
    "final", "draft", "update", "addendum", "review",
    "appraisal", "guidance", "technology", "committee",
}


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
                trade_names=profile.get("brand_names", []),
                indications=profile.get("indications", []),
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
            trade_names=profile.get("brand_names", []),
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
                substance = _extract_substance_from_title(g.get("title", ""))

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
            substance = _extract_substance_from_title(g.get("title", ""))
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
            indications: list[str] = []
            seen_indications: set[str] = set()
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

                # Extract indication from title
                indication = _extract_indication_from_title(title)

                # Collect unique indications
                ind_key = indication.lower()
                if ind_key and ind_key not in seen_indications:
                    seen_indications.add(ind_key)
                    indications.append(indication)

                guidance_items.append(NICEGuidanceItem(
                    guidance_reference=g.get("reference", ""),
                    title=title,
                    guidance_type=gt,
                    recommendation=rec,
                    published_date=date,
                    assessment_url=g.get("url", ""),
                    indication=indication,
                ))

            guidance_items.sort(key=lambda x: x.published_date, reverse=True)

            # Collect brand names for this substance from EMA mapping.
            # Try multiple matching strategies:
            #  1. Exact match on canonical substance name
            #  2. Normalise separators ("with"/"and"/"plus" ↔ ", ")
            #  3. Try individual components of combination therapies
            brand_names = sorted(
                b.title()
                for b in self._resolve_brand_names_for_substance(canonical, sub_to_brands)
            )

            profiles[display_name] = {
                "titles": titles,
                "guidance_types": guidance_types,
                "recommendations": recommendations,
                "indications": indications,
                "latest_date": latest_date,
                "guidance_count": len(guidance_items),
                "guidance_items": guidance_items,
                "brand_names": brand_names,
            }

        return profiles

    def _resolve_brand_names_for_substance(
        self,
        canonical: str,
        sub_to_brands: dict[str, set[str]],
    ) -> set[str]:
        """Resolve brand/trade names for a substance with flexible matching.

        Handles combination therapies where NICE titles use "with"/"and"/"plus"
        but EMA stores substances with comma separators, and vice-versa.
        """
        # Strategy 1: exact match
        brands = sub_to_brands.get(canonical, set())
        if brands:
            return set(brands)

        # Strategy 2: normalise separators and retry
        # NICE: "nivolumab with ipilimumab" → EMA: "nivolumab, ipilimumab"
        normalised = _normalise_substance_separators(canonical)
        if normalised != canonical:
            brands = sub_to_brands.get(normalised, set())
            if brands:
                return set(brands)

        # Strategy 3: split combination therapies and look up each component
        # individually; combine all found brand names
        components = _split_substance_components(canonical)
        if len(components) > 1:
            combined: set[str] = set()
            for comp in components:
                comp_brands = sub_to_brands.get(comp.strip(), set())
                combined.update(comp_brands)
            if combined:
                return combined

        # Strategy 4: try partial match — check if any EMA substance key
        # contains the canonical or vice-versa (useful for slight name variants)
        for ema_sub, ema_brands in sub_to_brands.items():
            if canonical in ema_sub or ema_sub in canonical:
                return set(ema_brands)

        return set()

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

    async def fetch_missing_recommendations(self, max_fetches: int = 20) -> int:
        """Fetch recommendations for guidance items that are missing them.

        Makes HTTP requests to individual NICE guidance pages to extract
        the recommendation status.  Updates the underlying adapter data
        in-place so subsequent calls benefit from the enriched data.

        Returns the number of recommendations successfully fetched.
        """
        import httpx

        from app.config import REQUEST_TIMEOUT, SSL_VERIFY
        from app.services.hta_agencies.uk_nice import _extract_from_guidance_page

        needs_fetch = [
            g for g in self._nice._guidance_list
            if not g.get("recommendation") and g.get("url")
        ]

        if not needs_fetch:
            return 0

        to_fetch = needs_fetch[:max_fetches]
        fetched = 0

        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            verify=SSL_VERIFY,
            headers={
                "User-Agent": "VAP-Global-Resources/0.1 (research tool)",
                "Accept": "text/html",
            },
        ) as client:
            sem = asyncio.Semaphore(5)

            async def _fetch_one(g: dict) -> bool:
                async with sem:
                    try:
                        resp = await client.get(g["url"])
                        resp.raise_for_status()
                        rec, date = _extract_from_guidance_page(resp.text)
                        if rec:
                            g["recommendation"] = rec
                        if date and not g.get("published_date"):
                            g["published_date"] = date
                        return bool(rec)
                    except Exception:
                        return False

            results = await asyncio.gather(*[_fetch_one(g) for g in to_fetch])
            fetched = sum(1 for r in results if r)

        if fetched:
            logger.info(
                "NICE deep-dive: fetched %d/%d missing recommendations",
                fetched, len(to_fetch),
            )

        return fetched


# ── Title parsing helpers (module-level) ──────────────────────────────


def _normalise_substance_separators(substance: str) -> str:
    """Normalise combination therapy separators.

    Converts "drug1 with drug2", "drug1 and drug2", "drug1 plus drug2"
    to "drug1, drug2" to match EMA's comma-separated convention.
    """
    return re.sub(
        r'\s+(?:with|and|plus|in\s+combination\s+with)\s+',
        ', ',
        substance,
        flags=re.IGNORECASE,
    ).strip()


def _split_substance_components(substance: str) -> list[str]:
    """Split a combination substance into individual components.

    Handles both NICE-style ("drug1 with drug2") and EMA-style ("drug1, drug2").
    """
    # First normalise to comma-separated
    normalised = _normalise_substance_separators(substance)
    parts = [p.strip() for p in normalised.split(',') if p.strip()]
    return parts


def _extract_substance_from_title(title: str) -> str:
    """Extract the active substance/drug name from a NICE guidance title.

    NICE titles follow patterns like:
      "Pembrolizumab for treating advanced melanoma after disease progression"
      "Nivolumab with ipilimumab for untreated advanced renal cell carcinoma"
      "Trastuzumab deruxtecan for treating HER2-low metastatic breast cancer"
    """
    if not title:
        return ""

    title_clean = title.strip()

    # Pattern 1: "Drug for treating/for/with..." (most common)
    match = re.match(
        r'^(.+?)\s+for\s+',
        title_clean, re.IGNORECASE,
    )
    if match:
        substance = match.group(1).strip()
        # Clean up trailing conjunctions
        substance = re.sub(
            r'\s+(?:and|plus|in\s+combination)\s*$', '',
            substance, flags=re.IGNORECASE,
        )
        if _is_valid_substance(substance):
            return substance

    # Pattern 2: "Drug with Drug2 for..." (combination therapies)
    match = re.match(
        r'^(.+?)\s+(?:as|in|after|to)\s+',
        title_clean, re.IGNORECASE,
    )
    if match:
        substance = match.group(1).strip()
        if _is_valid_substance(substance):
            return substance

    # Pattern 3: "Drug - indication" (dash separator)
    if " - " in title_clean or " – " in title_clean:
        parts = re.split(r'\s+[-–]\s+', title_clean, maxsplit=1)
        substance = parts[0].strip()
        if _is_valid_substance(substance):
            return substance

    # Fallback: first word(s) up to 60 chars, only if they look like a drug name
    substance = title_clean[:60]
    if _is_valid_substance(substance):
        return substance

    return title_clean[:60]


def _is_valid_substance(name: str) -> bool:
    """Check whether extracted text looks like a valid substance name."""
    if not name:
        return False
    # Reject known garbage words
    if name.lower().strip() in _INVALID_SUBSTANCES:
        return False
    # Reject if it's all common English words (no drug-like tokens)
    if len(name) < 3:
        return False
    return True


def _extract_indication_from_title(title: str) -> str:
    """Extract the therapeutic indication from a NICE guidance title.

    NICE titles follow patterns like:
      "Pembrolizumab for treating advanced melanoma after disease progression"
      "Nivolumab with ipilimumab for untreated advanced renal cell carcinoma"
      "Trastuzumab deruxtecan for treating HER2-positive unresectable breast cancer"
      "Onasemnogene abeparvovec for treating spinal muscular atrophy"
    """
    if not title:
        return ""

    # Pattern 1: "Drug for treating [indication]"
    match = re.search(
        r'\bfor\s+treating\s+(.+?)$',
        title, re.IGNORECASE,
    )
    if match:
        return _clean_indication(match.group(1))

    # Pattern 2: "Drug for the treatment of [indication]"
    match = re.search(
        r'\bfor\s+the\s+treatment\s+of\s+(.+?)$',
        title, re.IGNORECASE,
    )
    if match:
        return _clean_indication(match.group(1))

    # Pattern 3: "Drug for [adjective] [indication]" (e.g., "for untreated advanced RCC")
    match = re.search(
        r'\bfor\s+(?:use\s+in\s+|previously\s+treated\s+|'
        r'untreated\s+|adjuvant\s+treatment\s+of\s+|'
        r'treating\s+previously\s+treated\s+)?(.+?)$',
        title, re.IGNORECASE,
    )
    if match:
        indication = match.group(1).strip()
        if len(indication) > 10:  # Skip very short fragments
            return _clean_indication(indication)

    # Pattern 4: Generic "for [indication]"
    match = re.search(
        r'\bfor\s+(.+?)$',
        title, re.IGNORECASE,
    )
    if match:
        indication = match.group(1).strip()
        if len(indication) > 10:
            return _clean_indication(indication)

    return ""


def _clean_indication(text: str) -> str:
    """Clean up an extracted indication string."""
    # Remove trailing reference tags like [TA900]
    text = re.sub(r'\s*\[(?:TA|HST)\d+\]\s*$', '', text)
    # Strip whitespace and trailing punctuation
    text = text.strip().rstrip(".")
    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]
    return text
