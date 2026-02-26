"""Germany G-BA HTA Deep-Dive service.

Wraps the existing GermanyGBA adapter data to provide:
 - Drug listing with search/filter
 - Current-only assessments (filters out superseded re-assessments)
 - Subpopulation-level outcomes with English translations
 - Links to source G-BA assessment documents
"""

import logging
from collections import defaultdict

from app.config import GBA_ASSESSMENT_BASE_URL
from app.models import (
    GBAAssessmentDetail,
    GBADrugListItem,
    GBADrugProfile,
    GBAFilterOptions,
    GBASearchResponse,
    GBASubpopulation,
)
from app.services.hta_agencies.germany_gba import (
    BENEFIT_TRANSLATIONS,
    EVIDENCE_TRANSLATIONS,
    GermanyGBA,
)

logger = logging.getLogger(__name__)

# Benefit rating ordering (best to worst) for determining "best" outcome
BENEFIT_ORDER = [
    "erheblich",
    "beträchtlich",
    "gering",
    "nicht quantifizierbar",
    "kein Zusatznutzen",
    "geringerer Nutzen",
]


class GermanyHTAService:
    """Deep-dive intelligence layer on top of the GermanyGBA adapter."""

    def __init__(self, gba_adapter: GermanyGBA) -> None:
        self._gba = gba_adapter

    @property
    def is_loaded(self) -> bool:
        return self._gba.is_loaded

    @property
    def decisions(self) -> list[dict]:
        return self._gba._decisions

    # ── Drug listing / search ─────────────────────────────────────────

    def search_drugs(
        self,
        query: str = "",
        benefit_rating: str = "",
        limit: int = 100,
    ) -> GBASearchResponse:
        """List drugs assessed by G-BA, optionally filtered by query or benefit rating.

        Groups decisions by active substance, shows only current (non-superseded)
        assessments, and returns a summary per drug.
        """
        profiles = self._build_substance_profiles()

        results: list[GBADrugListItem] = []
        query_lower = query.lower().strip()

        for substance, profile in sorted(profiles.items()):
            # Text search filter
            if query_lower:
                searchable = (
                    substance.lower()
                    + " "
                    + " ".join(n.lower() for n in profile["trade_names"])
                    + " "
                    + " ".join(ind.lower() for ind in profile["indications"])
                )
                if query_lower not in searchable:
                    continue

            # Benefit rating filter
            if benefit_rating:
                if benefit_rating.lower() not in [
                    r.lower() for r in profile["benefit_ratings"]
                ]:
                    continue

            best = self._best_benefit(profile["benefit_ratings"])

            results.append(GBADrugListItem(
                active_substance=substance,
                trade_names=profile["trade_names"],
                latest_date=profile["latest_date"],
                assessment_count=len(profile["current_decisions"]),
                indications=profile["indications"],
                best_benefit=best,
                best_benefit_en=BENEFIT_TRANSLATIONS.get(best, best),
            ))

        # Sort by latest date descending, then substance name
        results.sort(key=lambda r: (r.latest_date, r.active_substance), reverse=True)

        return GBASearchResponse(
            total=len(results),
            results=results[:limit],
        )

    # ── Drug profile (detailed) ───────────────────────────────────────

    def get_drug_profile(self, substance: str) -> GBADrugProfile | None:
        """Get the full G-BA assessment profile for one active substance.

        Returns only current assessments (filters out older ones that were
        replaced by re-assessments for the same indication).
        """
        profiles = self._build_substance_profiles()
        substance_lower = substance.lower().strip()

        # Find matching substance (case-insensitive)
        matched_key = None
        for key in profiles:
            if key.lower() == substance_lower:
                matched_key = key
                break

        if matched_key is None:
            return None

        profile = profiles[matched_key]
        current_decs = profile["current_decisions"]

        assessments: list[GBAAssessmentDetail] = []
        for dec in current_decs:
            assessments.append(self._build_assessment_detail(dec))

        # Sort by decision date descending
        assessments.sort(key=lambda a: a.decision_date, reverse=True)

        return GBADrugProfile(
            active_substance=matched_key,
            trade_names=profile["trade_names"],
            total_assessments=len(current_decs),
            current_assessments=assessments,
        )

    # ── Filter options ────────────────────────────────────────────────

    def get_filter_options(self) -> GBAFilterOptions:
        """Return available filter options for the UI."""
        ratings: set[str] = set()
        substances: set[str] = set()

        for dec in self.decisions:
            br = dec.get("benefit_rating", "")
            if br:
                ratings.add(br)
            for ws in dec.get("substances", []):
                substances.add(ws)

        return GBAFilterOptions(
            benefit_ratings=sorted(ratings),
            substances=sorted(substances),
        )

    # ── Internal helpers ──────────────────────────────────────────────

    def _build_substance_profiles(self) -> dict[str, dict]:
        """Group decisions by substance and filter to current-only.

        For each substance+indication pair, keeps only the most recent
        decision (i.e. the latest re-assessment supersedes earlier ones).
        """
        # Group by primary substance
        by_substance: dict[str, list[dict]] = defaultdict(list)
        for dec in self.decisions:
            substances = dec.get("substances", [])
            primary = substances[0] if substances else "Unknown"
            by_substance[primary].append(dec)

        profiles: dict[str, dict] = {}
        for substance, decs in by_substance.items():
            # Filter to current: for each indication, keep only the latest decision
            current = self._filter_current(decs)

            trade_names: list[str] = []
            indications: list[str] = []
            benefit_ratings: list[str] = []
            latest_date = ""

            seen_trades: set[str] = set()
            seen_indications: set[str] = set()

            for dec in current:
                for tn in dec.get("trade_names", []):
                    if tn not in seen_trades:
                        trade_names.append(tn)
                        seen_trades.add(tn)

                ind = dec.get("indication", "")
                if ind and ind not in seen_indications:
                    indications.append(ind)
                    seen_indications.add(ind)

                br = dec.get("benefit_rating", "")
                if br:
                    benefit_ratings.append(br)

                date = dec.get("decision_date", "")
                if date > latest_date:
                    latest_date = date

            profiles[substance] = {
                "trade_names": trade_names,
                "indications": indications,
                "benefit_ratings": benefit_ratings,
                "latest_date": latest_date,
                "current_decisions": current,
            }

        return profiles

    def _filter_current(self, decisions: list[dict]) -> list[dict]:
        """Keep only the most recent decision per indication.

        Groups by indication text (AWG), and for each group keeps only the
        decision with the latest date, effectively filtering out superseded
        re-assessments. If two decisions share the same date but differ in
        patient group, both are kept (they represent distinct subpopulations
        of a single assessment).
        """
        # Group by indication
        by_indication: dict[str, list[dict]] = defaultdict(list)
        for dec in decisions:
            ind = dec.get("indication", "").strip()
            by_indication[ind].append(dec)

        current: list[dict] = []
        for ind, group in by_indication.items():
            if not group:
                continue

            # Find the latest decision_date for this indication
            latest_date = max(
                (d.get("decision_date", "") for d in group),
                default="",
            )

            # Keep all entries with that latest date (may be multiple subpopulations)
            for dec in group:
                if dec.get("decision_date", "") == latest_date:
                    current.append(dec)

        return current

    def _build_assessment_detail(self, dec: dict) -> GBAAssessmentDetail:
        """Convert a raw decision dict into a GBAAssessmentDetail."""
        procedure_id = dec.get("procedure_id", "")
        assessment_url = ""
        if procedure_id:
            assessment_url = GBA_ASSESSMENT_BASE_URL + procedure_id + "/"

        raw_benefit = dec.get("benefit_rating", "")
        benefit_en = BENEFIT_TRANSLATIONS.get(raw_benefit, raw_benefit)
        raw_evidence = dec.get("evidence_level", "")
        evidence_en = EVIDENCE_TRANSLATIONS.get(raw_evidence, raw_evidence)

        trade_names = dec.get("trade_names", [])
        trade_name = ", ".join(trade_names) if trade_names else dec.get("substances", [""])[0]
        substance = dec.get("substances", [""])[0] if dec.get("substances") else ""

        patient_group = dec.get("patient_group", "")
        comparator = dec.get("comparator", "")

        subpopulations = []
        if patient_group:
            subpopulations.append(GBASubpopulation(
                patient_group=patient_group,
                benefit_rating=raw_benefit,
                benefit_rating_en=benefit_en,
                evidence_level=raw_evidence,
                evidence_level_en=evidence_en,
                comparator=comparator,
            ))

        return GBAAssessmentDetail(
            decision_id=dec.get("decision_id", ""),
            trade_name=trade_name,
            active_substance=substance,
            indication=dec.get("indication", ""),
            decision_date=dec.get("decision_date", ""),
            assessment_url=assessment_url,
            subpopulations=subpopulations,
            overall_benefit=raw_benefit,
            overall_benefit_en=benefit_en,
        )

    def _best_benefit(self, ratings: list[str]) -> str:
        """Return the best (most favorable) benefit rating from a list."""
        if not ratings:
            return ""
        best_idx = len(BENEFIT_ORDER)
        best_val = ""
        for r in ratings:
            try:
                idx = BENEFIT_ORDER.index(r)
            except ValueError:
                idx = len(BENEFIT_ORDER) - 1
            if idx < best_idx:
                best_idx = idx
                best_val = r
        return best_val
