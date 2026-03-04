"""France HAS HTA Deep-Dive service.

Wraps the existing FranceHAS adapter data to provide:
 - Drug listing with search/filter by SMR/ASMR
 - Assessments grouped by dossier code (merging SMR + ASMR)
 - English translations of French HAS terminology
 - Links to source CT (Commission de la Transparence) documents
"""

import logging
from collections import defaultdict

from app.models import (
    HASDrugListItem,
    HASDrugProfile,
    HASFilterOptions,
    HASGroupedAssessment,
    HASSearchResponse,
)
from app.services.hta_agencies.france_has import (
    _ASMR_EN,
    _MOTIF_EN,
    _SMR_EN,
    FranceHAS,
    _extract_indication,
    _shorten_trade_name,
    _translate_description,
    _translate_indication,
)

logger = logging.getLogger(__name__)

# SMR rating ordering (best to worst) for determining "best" outcome
SMR_ORDER = ["Important", "Modéré", "Faible", "Insuffisant"]

# ASMR rating ordering (best to worst)
ASMR_ORDER = ["I", "II", "III", "IV", "V"]


class FranceHTAService:
    """Deep-dive intelligence layer on top of the FranceHAS adapter."""

    def __init__(self, has_adapter: FranceHAS) -> None:
        self._has = has_adapter
        self._cached_profiles: dict[str, dict] | None = None

    @property
    def is_loaded(self) -> bool:
        return self._has.is_loaded

    def invalidate_cache(self) -> None:
        """Clear the cached substance profiles (call after data reload)."""
        self._cached_profiles = None

    # ── Drug listing / search ─────────────────────────────────────────

    def search_drugs(
        self,
        query: str = "",
        smr_rating: str = "",
        asmr_rating: str = "",
        limit: int = 100,
    ) -> HASSearchResponse:
        """List drugs assessed by HAS, optionally filtered by query or ratings.

        Groups assessments by active substance and returns a summary per drug.
        """
        profiles = self._build_substance_profiles()

        results: list[HASDrugListItem] = []
        query_lower = query.lower().strip()

        for substance, profile in sorted(profiles.items()):
            # Text search filter
            if query_lower:
                searchable = (
                    substance.lower()
                    + " "
                    + " ".join(n.lower() for n in profile["trade_names"])
                )
                if query_lower not in searchable:
                    continue

            # SMR rating filter
            if smr_rating:
                if smr_rating not in profile["smr_ratings"]:
                    continue

            # ASMR rating filter
            if asmr_rating:
                if asmr_rating not in profile["asmr_ratings"]:
                    continue

            best_smr = self._best_smr(profile["smr_ratings"])
            best_asmr = self._best_asmr(profile["asmr_ratings"])

            results.append(HASDrugListItem(
                active_substance=substance,
                trade_names=profile["trade_names"],
                latest_date=profile["latest_date"],
                assessment_count=profile["assessment_count"],
                best_smr=best_smr,
                best_smr_en=_SMR_EN.get(best_smr, best_smr),
                best_asmr=best_asmr,
                best_asmr_en=_ASMR_EN.get(best_asmr, best_asmr),
                indications=profile.get("indications", []),
                indications_en=profile.get("indications_en", []),
                evaluation_reasons=profile["evaluation_reasons"],
            ))

        # Sort by latest date descending, then substance name
        results.sort(key=lambda r: (r.latest_date, r.active_substance), reverse=True)

        return HASSearchResponse(
            total=len(results),
            results=results[:limit],
        )

    # ── Drug profile (detailed) ───────────────────────────────────────

    def get_drug_profile(self, substance: str) -> HASDrugProfile | None:
        """Get the full HAS assessment profile for one active substance.

        Returns assessments grouped by dossier code, with merged SMR/ASMR data.
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
        grouped = profile["grouped_assessments"]

        return HASDrugProfile(
            active_substance=matched_key,
            trade_names=profile["trade_names"],
            total_assessments=len(grouped),
            assessments=grouped,
        )

    # ── Filter options ────────────────────────────────────────────────

    def get_filter_options(self) -> HASFilterOptions:
        """Return available filter options for the UI."""
        smr_set: set[str] = set()
        asmr_set: set[str] = set()

        for cis_code, smr_list in self._has._smr.items():
            for smr in smr_list:
                v = smr.get("value", "")
                if v:
                    smr_set.add(v)

        for cis_code, asmr_list in self._has._asmr.items():
            for asmr in asmr_list:
                v = asmr.get("value", "")
                if v:
                    asmr_set.add(v)

        # Sort SMR and ASMR by their ordering
        smr_sorted = sorted(smr_set, key=lambda x: SMR_ORDER.index(x) if x in SMR_ORDER else 99)
        asmr_sorted = sorted(asmr_set, key=lambda x: ASMR_ORDER.index(x) if x in ASMR_ORDER else 99)

        return HASFilterOptions(
            smr_ratings=smr_sorted,
            asmr_ratings=asmr_sorted,
        )

    # ── Assessment lookup for AI analysis ─────────────────────────────

    def find_assessment_by_dossier(self, dossier_code: str) -> dict | None:
        """Find an assessment by its dossier code and return data for AI analysis.

        Returns a dict with keys needed by the AI analysis service,
        or None if the dossier is not found.
        """
        profiles = self._build_substance_profiles()

        for substance, profile in profiles.items():
            for ga in profile["grouped_assessments"]:
                if ga.dossier_code == dossier_code:
                    return {
                        "dossier_code": ga.dossier_code,
                        "trade_name": ga.product_names[0] if ga.product_names else "",
                        "active_substance": ga.active_substance,
                        "evaluation_reason": ga.evaluation_reason,
                        "opinion_date": ga.opinion_date,
                        "assessment_url": ga.assessment_url,
                        "smr_value": ga.smr_value,
                        "smr_description": ga.smr_description,
                        "asmr_value": ga.asmr_value,
                        "asmr_description": ga.asmr_description,
                    }

        return None

    # ── Internal helpers ──────────────────────────────────────────────

    def _build_substance_profiles(self) -> dict[str, dict]:
        """Group assessments by substance and build profiles.

        For each substance, collects all dossier-based assessments with
        merged SMR/ASMR data.  Results are cached until invalidate_cache()
        is called (e.g. after a data reload).
        """
        if self._cached_profiles is not None:
            return self._cached_profiles
        # Step 1: Build dossier → assessment mapping across all CIS codes
        # Key: (substance, dossier_code, date) → merged assessment data
        dossier_map: dict[str, dict] = {}

        for cis_code, substances in self._has._compositions.items():
            if not substances:
                continue
            primary_substance = substances[0]
            med_name = self._has._medicines.get(cis_code, "")

            # Process SMR records
            for smr in self._has._smr.get(cis_code, []):
                dc = smr.get("dossier_code", "")
                date = smr.get("date", "")
                key = f"{primary_substance}|{dc}|{date}"

                if key not in dossier_map:
                    dossier_map[key] = {
                        "substance": primary_substance,
                        "product_names": set(),
                        "dossier_code": dc,
                        "evaluation_reason": smr.get("motif", ""),
                        "opinion_date": date,
                        "smr_value": smr.get("value", ""),
                        "smr_description": smr.get("label", ""),
                        "asmr_value": "",
                        "asmr_description": "",
                    }
                else:
                    dossier_map[key]["smr_value"] = smr.get("value", "")
                    dossier_map[key]["smr_description"] = smr.get("label", "")

                if med_name:
                    dossier_map[key]["product_names"].add(med_name)

            # Process ASMR records
            for asmr in self._has._asmr.get(cis_code, []):
                dc = asmr.get("dossier_code", "")
                date = asmr.get("date", "")
                key = f"{primary_substance}|{dc}|{date}"

                if key not in dossier_map:
                    dossier_map[key] = {
                        "substance": primary_substance,
                        "product_names": set(),
                        "dossier_code": dc,
                        "evaluation_reason": asmr.get("motif", ""),
                        "opinion_date": date,
                        "smr_value": "",
                        "smr_description": "",
                        "asmr_value": asmr.get("value", ""),
                        "asmr_description": asmr.get("label", ""),
                    }
                else:
                    dossier_map[key]["asmr_value"] = asmr.get("value", "")
                    dossier_map[key]["asmr_description"] = asmr.get("label", "")

                if med_name:
                    dossier_map[key]["product_names"].add(med_name)

        # Step 2: Group by substance
        by_substance: dict[str, list[dict]] = defaultdict(list)
        for key, data in dossier_map.items():
            by_substance[data["substance"]].append(data)

        # Step 3: Build profiles
        profiles: dict[str, dict] = {}
        for substance, assessments in by_substance.items():
            trade_names: list[str] = []
            smr_ratings: list[str] = []
            asmr_ratings: list[str] = []
            evaluation_reasons: set[str] = set()
            indications_fr: list[str] = []
            indications_en: list[str] = []
            seen_indications: set[str] = set()
            latest_date = ""
            seen_trades: set[str] = set()

            grouped: list[HASGroupedAssessment] = []

            for a in assessments:
                # Collect shortened trade names (brand only, no dosage/form)
                for name in a["product_names"]:
                    short = _shorten_trade_name(name)
                    if short and short not in seen_trades:
                        trade_names.append(short)
                        seen_trades.add(short)

                # Collect ratings
                smr = a.get("smr_value", "")
                if smr:
                    smr_ratings.append(smr)
                asmr = a.get("asmr_value", "")
                if asmr:
                    asmr_ratings.append(asmr)

                motif = a.get("evaluation_reason", "")
                if motif:
                    evaluation_reasons.add(motif)

                date = a.get("opinion_date", "")
                if date > latest_date:
                    latest_date = date

                # Extract and translate indication + descriptions
                smr_desc = a.get("smr_description", "")
                asmr_desc = a.get("asmr_description", "")
                indication_fr = _extract_indication(smr_desc, asmr_desc)
                indication_en = _translate_indication(indication_fr)
                smr_desc_en = _translate_description(smr_desc)
                asmr_desc_en = _translate_description(asmr_desc)

                # Collect unique indications for the drug list
                ind_key = (indication_en or indication_fr).lower()
                if ind_key and ind_key not in seen_indications:
                    seen_indications.add(ind_key)
                    if indication_fr:
                        indications_fr.append(indication_fr)
                    if indication_en:
                        indications_en.append(indication_en)

                # Shorten product names for the grouped assessment card
                short_names = sorted({
                    _shorten_trade_name(n) for n in a["product_names"]
                    if _shorten_trade_name(n)
                })

                # Build grouped assessment
                grouped.append(HASGroupedAssessment(
                    dossier_code=a["dossier_code"],
                    product_names=short_names,
                    active_substance=substance,
                    evaluation_reason=motif,
                    evaluation_reason_en=_MOTIF_EN.get(motif, motif),
                    opinion_date=date,
                    assessment_url=self._has._ct_links.get(a["dossier_code"], ""),
                    smr_value=smr,
                    smr_value_en=_SMR_EN.get(smr, smr),
                    smr_description=smr_desc,
                    smr_description_en=smr_desc_en,
                    asmr_value=asmr,
                    asmr_value_en=_ASMR_EN.get(asmr, asmr),
                    asmr_description=asmr_desc,
                    asmr_description_en=asmr_desc_en,
                    indication=indication_fr,
                    indication_en=indication_en,
                ))

            # Sort grouped assessments by date descending
            grouped.sort(key=lambda g: g.opinion_date, reverse=True)

            # Deduplicate by dossier_code (keep latest per dossier for counting)
            seen_dossiers: set[str] = set()
            unique_count = 0
            for g in grouped:
                if g.dossier_code and g.dossier_code not in seen_dossiers:
                    seen_dossiers.add(g.dossier_code)
                    unique_count += 1
                elif not g.dossier_code:
                    unique_count += 1

            profiles[substance] = {
                "trade_names": trade_names,
                "smr_ratings": smr_ratings,
                "asmr_ratings": asmr_ratings,
                "indications": indications_fr,
                "indications_en": indications_en,
                "evaluation_reasons": sorted(evaluation_reasons),
                "latest_date": latest_date,
                "assessment_count": unique_count or len(grouped),
                "grouped_assessments": grouped,
            }

        self._cached_profiles = profiles
        return profiles

    def _best_smr(self, ratings: list[str]) -> str:
        """Return the best (most favorable) SMR rating from a list."""
        if not ratings:
            return ""
        best_idx = len(SMR_ORDER)
        best_val = ""
        for r in ratings:
            try:
                idx = SMR_ORDER.index(r)
            except ValueError:
                idx = len(SMR_ORDER)
            if idx < best_idx:
                best_idx = idx
                best_val = r
        return best_val

    def _best_asmr(self, ratings: list[str]) -> str:
        """Return the best (most favorable) ASMR rating from a list."""
        if not ratings:
            return ""
        best_idx = len(ASMR_ORDER)
        best_val = ""
        for r in ratings:
            try:
                idx = ASMR_ORDER.index(r)
            except ValueError:
                idx = len(ASMR_ORDER)
            if idx < best_idx:
                best_idx = idx
                best_val = r
        return best_val
