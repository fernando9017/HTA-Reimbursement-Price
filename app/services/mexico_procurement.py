"""Mexico Pharma Procurement Service — Compra Consolidada de Medicamentos.

Provides search, filtering, and price analysis for Mexico's biennial
consolidated drug procurement (Compra Consolidada).  Data is loaded from
a curated JSON file at startup and served through in-memory indexes.
"""

import json
import logging
from pathlib import Path

from app.models import (
    AdjudicacionResult,
    ClaveDetailResult,
    ClaveResult,
    CompetitorBid,
    InstitutionPrice,
    InstitutionSummary,
    MexicoAdjudicacionResponse,
    MexicoProcurementFilters,
    MexicoSearchResponse,
    PriceHistoryEntry,
    PriceHistoryResult,
    PriceVarianceItem,
    PriceVarianceResponse,
)

logger = logging.getLogger(__name__)


class MexicoProcurementService:
    """In-memory index of Mexico procurement data.

    Loaded from ``data/mexico_procurement.json`` at startup.  Supports:
    * Clave search by substance, ATC code, or free-text description
    * Adjudicación filtering by cycle, status, institution, therapeutic group
    * Historical price analysis across procurement cycles
    """

    def __init__(self) -> None:
        self._claves: list[dict] = []
        self._adjudicaciones: list[dict] = []
        self._loaded = False

    # ── Properties ────────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def clave_count(self) -> int:
        return len(self._claves)

    # ── Data loading ──────────────────────────────────────────────────

    def load_from_file(self, filepath: Path) -> bool:
        """Load procurement data from a curated JSON file.

        Expected structure::

            {
              "claves": [ { ... }, ... ],
              "adjudicaciones": [ { ... }, ... ]
            }

        Returns True if data was successfully loaded.
        """
        try:
            with open(filepath, encoding="utf-8") as fh:
                raw = json.load(fh)
        except FileNotFoundError:
            logger.warning("Mexico procurement file not found: %s", filepath)
            return False
        except Exception:
            logger.warning("Failed to read Mexico procurement data", exc_info=True)
            return False

        claves = raw.get("claves", [])
        adjudicaciones = raw.get("adjudicaciones", [])

        if not claves and not adjudicaciones:
            logger.warning("Mexico procurement file is empty")
            return False

        self._claves = claves
        self._adjudicaciones = adjudicaciones
        self._loaded = True

        logger.info(
            "Mexico procurement data loaded: %d claves, %d adjudicaciones",
            len(self._claves),
            len(self._adjudicaciones),
        )
        return True

    # ── Clave search ──────────────────────────────────────────────────

    def search_claves(
        self,
        query: str = "",
        therapeutic_group: str = "",
        source_type: str = "",
        atc_code: str = "",
        cnis_only: bool = False,
        limit: int = 100,
    ) -> MexicoSearchResponse:
        """Search claves by substance, description, ATC, or therapeutic group."""
        q = query.lower().strip()
        results: list[ClaveResult] = []

        for c in self._claves:
            # Text match on substance / description / clave code
            if q:
                searchable = " ".join([
                    c.get("active_substance", ""),
                    c.get("description", ""),
                    c.get("clave", ""),
                ]).lower()
                if q not in searchable:
                    continue

            # Filter by therapeutic group
            if therapeutic_group and therapeutic_group.lower() not in c.get("therapeutic_group", "").lower():
                continue

            # Filter by source type
            if source_type and c.get("source_type", "").lower() != source_type.lower():
                continue

            # Filter by ATC code prefix
            if atc_code and not c.get("atc_code", "").upper().startswith(atc_code.upper()):
                continue

            # CNIS filter
            if cnis_only and not c.get("cnis_listed", False):
                continue

            # Enrich with latest adjudicación data
            latest_cycle, latest_status, latest_price = self._latest_adjudicacion(c["clave"])
            institutions = self._clave_institutions(c["clave"])

            results.append(ClaveResult(
                clave=c["clave"],
                description=c.get("description", ""),
                active_substance=c.get("active_substance", ""),
                atc_code=c.get("atc_code", ""),
                therapeutic_group=c.get("therapeutic_group", ""),
                source_type=c.get("source_type", ""),
                cnis_listed=c.get("cnis_listed", False),
                cofepris_registry=c.get("cofepris_registry", ""),
                latest_cycle=latest_cycle,
                latest_status=latest_status,
                latest_unit_price=latest_price,
                institutions=institutions,
                indication=c.get("indication", ""),
                mechanism_of_action=c.get("mechanism_of_action", ""),
                patent_holder=c.get("patent_holder", ""),
                patent_expiry=c.get("patent_expiry", ""),
            ))

            if len(results) >= limit:
                break

        return MexicoSearchResponse(total=len(results), results=results)

    # ── Adjudicaciones ────────────────────────────────────────────────

    def search_adjudicaciones(
        self,
        cycle: str = "",
        status: str = "",
        institution: str = "",
        therapeutic_group: str = "",
        source_type: str = "",
        substance: str = "",
        limit: int = 200,
    ) -> MexicoAdjudicacionResponse:
        """Search adjudicaciones with filters."""
        results: list[AdjudicacionResult] = []
        cycle_filter = cycle.strip()
        sub_q = substance.lower().strip()

        for a in self._adjudicaciones:
            if cycle_filter and a.get("cycle", "") != cycle_filter:
                continue
            if status and a.get("status", "").lower() != status.lower():
                continue
            if institution and institution.lower() not in a.get("institution", "").lower():
                continue
            if therapeutic_group and therapeutic_group.lower() not in a.get("therapeutic_group", "").lower():
                continue
            if source_type and a.get("source_type", "").lower() != source_type.lower():
                continue
            if sub_q and sub_q not in a.get("active_substance", "").lower():
                continue

            results.append(self._build_adjudicacion(a))

            if len(results) >= limit:
                break

        # Determine effective cycle for summary
        effective_cycle = cycle_filter or (results[0].cycle if results else "")

        # Build summary stats
        summary = self._build_summary(results)

        return MexicoAdjudicacionResponse(
            total=len(results),
            cycle=effective_cycle,
            summary=summary,
            results=results,
        )

    # ── Price history ─────────────────────────────────────────────────

    def get_price_history(self, clave: str) -> PriceHistoryResult | None:
        """Get price history for a specific clave across all cycles."""
        # Find the clave metadata
        clave_data = None
        for c in self._claves:
            if c["clave"] == clave:
                clave_data = c
                break

        if clave_data is None:
            return None

        # Collect all adjudicaciones for this clave, sorted by cycle
        entries: list[PriceHistoryEntry] = []
        for a in self._adjudicaciones:
            if a["clave"] == clave:
                entries.append(PriceHistoryEntry(
                    cycle=a.get("cycle", ""),
                    unit_price=a.get("unit_price", 0.0),
                    currency="MXN",
                    supplier=a.get("supplier", ""),
                    units_awarded=a.get("units_awarded", 0),
                    status=a.get("status", ""),
                    institution=a.get("institution", ""),
                    max_reference_price=a.get("max_reference_price", 0.0),
                ))

        # Sort by cycle chronologically
        entries.sort(key=lambda e: e.cycle)

        # Calculate price change %
        price_change = 0.0
        awarded = [e for e in entries if e.unit_price > 0]
        if len(awarded) >= 2:
            first = awarded[0].unit_price
            last = awarded[-1].unit_price
            if first > 0:
                price_change = round(((last - first) / first) * 100, 1)

        return PriceHistoryResult(
            clave=clave,
            description=clave_data.get("description", ""),
            active_substance=clave_data.get("active_substance", ""),
            source_type=clave_data.get("source_type", ""),
            entries=entries,
            price_change_pct=price_change,
        )

    # ── Filter options ────────────────────────────────────────────────

    def get_filter_options(self) -> MexicoProcurementFilters:
        """Return available filter values for the frontend."""
        cycles = sorted({a.get("cycle", "") for a in self._adjudicaciones if a.get("cycle")})
        therapeutic_groups = sorted({
            c.get("therapeutic_group", "") for c in self._claves if c.get("therapeutic_group")
        })
        institutions = sorted({
            a.get("institution", "") for a in self._adjudicaciones if a.get("institution")
        })
        source_types = sorted({
            c.get("source_type", "") for c in self._claves if c.get("source_type")
        })
        statuses = sorted({
            a.get("status", "") for a in self._adjudicaciones if a.get("status")
        })

        return MexicoProcurementFilters(
            cycles=cycles,
            therapeutic_groups=therapeutic_groups,
            institutions=institutions,
            source_types=source_types,
            statuses=statuses,
        )

    # ── Opportunity detection ─────────────────────────────────────────

    def get_opportunities(self, limit: int = 50) -> list[AdjudicacionResult]:
        """Find procurement opportunities: desiertas and high-demand unmet claves.

        Returns claves that were desierta (unadjudicated) in recent cycles,
        sorted by units requested (highest unmet demand first).
        """
        desiertas: list[AdjudicacionResult] = []

        for a in self._adjudicaciones:
            if a.get("status", "").lower() == "desierta":
                desiertas.append(self._build_adjudicacion(a))

        # Sort by most recent cycle first, then by highest demand
        desiertas.sort(key=lambda d: (d.cycle, d.units_requested), reverse=True)
        return desiertas[:limit]

    # ── Clave detail ──────────────────────────────────────────────────

    def get_clave_detail(self, clave: str) -> ClaveDetailResult | None:
        """Get a full intelligence profile for a single clave.

        Includes molecule info, all adjudicaciones, price history,
        and other claves with the same active substance (competitor landscape).
        """
        clave_data = None
        for c in self._claves:
            if c["clave"] == clave:
                clave_data = c
                break

        if clave_data is None:
            return None

        substance = clave_data.get("active_substance", "").lower()

        # All adjudicaciones for this clave
        adj_list = [
            self._build_adjudicacion(a)
            for a in self._adjudicaciones
            if a["clave"] == clave
        ]
        adj_list.sort(key=lambda a: (a.cycle, a.institution))

        # Price history
        price_hist = self.get_price_history(clave)

        # Same-substance claves (competitor landscape)
        same_substance: list[ClaveResult] = []
        for c in self._claves:
            if c["clave"] != clave and c.get("active_substance", "").lower() == substance:
                lat_cyc, lat_st, lat_pr = self._latest_adjudicacion(c["clave"])
                same_substance.append(ClaveResult(
                    clave=c["clave"],
                    description=c.get("description", ""),
                    active_substance=c.get("active_substance", ""),
                    atc_code=c.get("atc_code", ""),
                    therapeutic_group=c.get("therapeutic_group", ""),
                    source_type=c.get("source_type", ""),
                    cnis_listed=c.get("cnis_listed", False),
                    cofepris_registry=c.get("cofepris_registry", ""),
                    latest_cycle=lat_cyc,
                    latest_status=lat_st,
                    latest_unit_price=lat_pr,
                    institutions=self._clave_institutions(c["clave"]),
                ))

        return ClaveDetailResult(
            clave=clave,
            description=clave_data.get("description", ""),
            active_substance=clave_data.get("active_substance", ""),
            atc_code=clave_data.get("atc_code", ""),
            therapeutic_group=clave_data.get("therapeutic_group", ""),
            source_type=clave_data.get("source_type", ""),
            cnis_listed=clave_data.get("cnis_listed", False),
            cofepris_registry=clave_data.get("cofepris_registry", ""),
            indication=clave_data.get("indication", ""),
            mechanism_of_action=clave_data.get("mechanism_of_action", ""),
            patent_holder=clave_data.get("patent_holder", ""),
            patent_expiry=clave_data.get("patent_expiry", ""),
            adjudicaciones=adj_list,
            price_history=price_hist,
            same_substance_claves=same_substance,
        )

    # ── Institution breakdown ─────────────────────────────────────────

    def get_institution_breakdown(self, cycle: str = "") -> list[InstitutionSummary]:
        """Aggregate procurement stats per institution.

        Groups adjudicaciones by institution and computes spend, fulfillment,
        top therapeutic areas, and top suppliers for each.
        """
        # Group by institution
        inst_data: dict[str, list[dict]] = {}
        for a in self._adjudicaciones:
            if cycle and a.get("cycle", "") != cycle:
                continue
            inst = a.get("institution", "Unknown")
            inst_data.setdefault(inst, []).append(a)

        results: list[InstitutionSummary] = []
        for inst, records in sorted(inst_data.items()):
            total_spend = 0.0
            total_req = 0
            total_awarded = 0
            adj_count = 0
            des_count = 0
            claves_set: set[str] = set()
            group_spend: dict[str, float] = {}
            group_claves: dict[str, set] = {}
            supplier_spend: dict[str, float] = {}
            supplier_claves: dict[str, set] = {}

            for r in records:
                claves_set.add(r["clave"])
                total_spend += r.get("total_amount", 0)
                total_req += r.get("units_requested", 0)
                total_awarded += r.get("units_awarded", 0)
                if r.get("status", "").lower() == "adjudicada":
                    adj_count += 1
                elif r.get("status", "").lower() == "desierta":
                    des_count += 1

                grp = r.get("therapeutic_group", "Other")
                group_spend[grp] = group_spend.get(grp, 0) + r.get("total_amount", 0)
                group_claves.setdefault(grp, set()).add(r["clave"])

                sup = r.get("supplier", "")
                if sup:
                    supplier_spend[sup] = supplier_spend.get(sup, 0) + r.get("total_amount", 0)
                    supplier_claves.setdefault(sup, set()).add(r["clave"])

            fulfillment = 0.0
            if total_req > 0:
                fulfillment = round((total_awarded / total_req) * 100, 1)

            top_groups = sorted(
                [{"group": g, "spend": round(s, 2), "claves": len(group_claves.get(g, set()))}
                 for g, s in group_spend.items()],
                key=lambda x: x["spend"],
                reverse=True,
            )[:5]

            top_suppliers = sorted(
                [{"supplier": s, "spend": round(sp, 2), "claves": len(supplier_claves.get(s, set()))}
                 for s, sp in supplier_spend.items()],
                key=lambda x: x["spend"],
                reverse=True,
            )[:5]

            results.append(InstitutionSummary(
                institution=inst,
                total_claves=len(claves_set),
                total_spend_mxn=round(total_spend, 2),
                total_units_requested=total_req,
                total_units_awarded=total_awarded,
                fulfillment_rate_pct=fulfillment,
                adjudicadas=adj_count,
                desiertas=des_count,
                top_therapeutic_groups=top_groups,
                top_suppliers=top_suppliers,
            ))

        # Sort by total spend descending
        results.sort(key=lambda r: r.total_spend_mxn, reverse=True)
        return results

    # ── Cross-institutional price variance ──────────────────────────

    def get_price_variance(
        self,
        cycle: str = "",
        therapeutic_group: str = "",
        source_type: str = "",
        min_institutions: int = 2,
    ) -> PriceVarianceResponse:
        """Analyze price differences for the same drug across institutions.

        Groups adjudicaciones by (clave, cycle) and compares unit prices
        across institutions to identify variance.  Only includes claves
        procured by at least ``min_institutions`` institutions with an
        awarded price > 0.

        Returns items sorted by variance_pct descending (biggest spreads first).
        """
        # Index: (clave, cycle) → list of adjudicacion dicts
        clave_cycle: dict[tuple[str, str], list[dict]] = {}
        for a in self._adjudicaciones:
            if a.get("status", "").lower() != "adjudicada":
                continue
            if a.get("unit_price", 0) <= 0:
                continue
            if cycle and a.get("cycle", "") != cycle:
                continue
            if therapeutic_group and therapeutic_group.lower() not in a.get("therapeutic_group", "").lower():
                continue
            if source_type and a.get("source_type", "").lower() != source_type.lower():
                continue
            key = (a["clave"], a.get("cycle", ""))
            clave_cycle.setdefault(key, []).append(a)

        # Clave metadata lookup
        clave_meta = {c["clave"]: c for c in self._claves}

        items: list[PriceVarianceItem] = []
        total_savings = 0.0
        variance_sum = 0.0
        variance_count = 0

        for (clave, cyc), records in clave_cycle.items():
            # Deduplicate by institution (take the one with lowest price per institution)
            inst_best: dict[str, dict] = {}
            for r in records:
                inst = r.get("institution", "")
                if inst not in inst_best or r["unit_price"] < inst_best[inst]["unit_price"]:
                    inst_best[inst] = r

            if len(inst_best) < min_institutions:
                continue

            prices = [r["unit_price"] for r in inst_best.values()]
            min_p = min(prices)
            max_p = max(prices)
            avg_p = round(sum(prices) / len(prices), 2)
            var_pct = round(((max_p - min_p) / min_p) * 100, 1) if min_p > 0 else 0.0

            # Savings if every institution paid the minimum price
            savings = sum(
                (r["unit_price"] - min_p) * r.get("units_awarded", 0)
                for r in inst_best.values()
            )

            meta = clave_meta.get(clave, {})

            inst_prices = [
                InstitutionPrice(
                    institution=r.get("institution", ""),
                    unit_price=r.get("unit_price", 0.0),
                    units_awarded=r.get("units_awarded", 0),
                    supplier=r.get("supplier", ""),
                    max_reference_price=r.get("max_reference_price", 0.0),
                )
                for r in sorted(inst_best.values(), key=lambda x: x.get("unit_price", 0))
            ]

            items.append(PriceVarianceItem(
                clave=clave,
                active_substance=meta.get("active_substance", records[0].get("active_substance", "")),
                therapeutic_group=meta.get("therapeutic_group", records[0].get("therapeutic_group", "")),
                source_type=meta.get("source_type", records[0].get("source_type", "")),
                cycle=cyc,
                institution_prices=inst_prices,
                min_price=round(min_p, 2),
                max_price=round(max_p, 2),
                variance_pct=var_pct,
                avg_price=avg_p,
                total_savings_potential=round(savings, 2),
            ))

            total_savings += savings
            if var_pct > 0:
                variance_sum += var_pct
                variance_count += 1

        # Sort by variance descending
        items.sort(key=lambda x: x.variance_pct, reverse=True)

        items_with_variance = sum(1 for i in items if i.variance_pct > 0)
        avg_var = round(variance_sum / variance_count, 1) if variance_count > 0 else 0.0

        effective_cycle = cycle or "All cycles"

        return PriceVarianceResponse(
            cycle=effective_cycle,
            total=len(items),
            items_with_variance=items_with_variance,
            avg_variance_pct=avg_var,
            total_savings_potential=round(total_savings, 2),
            results=items,
        )

    # ── Internal helpers ──────────────────────────────────────────────

    def _build_adjudicacion(self, a: dict) -> AdjudicacionResult:
        """Build an AdjudicacionResult from a raw dict, including negotiation context."""
        bids = [
            CompetitorBid(**b)
            for b in a.get("competitor_bids", [])
        ]
        return AdjudicacionResult(
            clave=a["clave"],
            description=a.get("description", ""),
            active_substance=a.get("active_substance", ""),
            cycle=a.get("cycle", ""),
            status=a.get("status", ""),
            supplier=a.get("supplier", ""),
            units_requested=a.get("units_requested", 0),
            units_awarded=a.get("units_awarded", 0),
            unit_price=a.get("unit_price", 0.0),
            total_amount=a.get("total_amount", 0.0),
            max_reference_price=a.get("max_reference_price", 0.0),
            institution=a.get("institution", ""),
            therapeutic_group=a.get("therapeutic_group", ""),
            source_type=a.get("source_type", ""),
            negotiation_type=a.get("negotiation_type", ""),
            negotiation_notes=a.get("negotiation_notes", ""),
            competitor_bids=bids,
        )

    def _latest_adjudicacion(self, clave: str) -> tuple[str, str, float]:
        """Find the latest cycle, status, and price for a clave."""
        latest_cycle = ""
        latest_status = ""
        latest_price = 0.0

        for a in self._adjudicaciones:
            if a["clave"] == clave and a.get("cycle", "") >= latest_cycle:
                latest_cycle = a["cycle"]
                latest_status = a.get("status", "")
                if a.get("unit_price", 0) > 0:
                    latest_price = a["unit_price"]

        return latest_cycle, latest_status, latest_price

    def _clave_institutions(self, clave: str) -> list[str]:
        """Get unique institutions that demand a clave."""
        return sorted({
            a.get("institution", "")
            for a in self._adjudicaciones
            if a["clave"] == clave and a.get("institution")
        })

    def _build_summary(self, results: list[AdjudicacionResult]) -> dict:
        """Build aggregate summary statistics from a set of adjudicaciones."""
        total_claves = len({r.clave for r in results})
        by_status: dict[str, int] = {}
        total_amount = 0.0
        total_units_req = 0
        total_units_awarded = 0

        for r in results:
            st = r.status.lower()
            by_status[st] = by_status.get(st, 0) + 1
            total_amount += r.total_amount
            total_units_req += r.units_requested
            total_units_awarded += r.units_awarded

        fulfillment_rate = 0.0
        if total_units_req > 0:
            fulfillment_rate = round((total_units_awarded / total_units_req) * 100, 1)

        return {
            "total_claves": total_claves,
            "by_status": by_status,
            "total_amount_mxn": round(total_amount, 2),
            "total_units_requested": total_units_req,
            "total_units_awarded": total_units_awarded,
            "fulfillment_rate_pct": fulfillment_rate,
        }
