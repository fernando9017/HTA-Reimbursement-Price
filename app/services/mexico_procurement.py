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
    ClaveResult,
    MexicoAdjudicacionResponse,
    MexicoProcurementFilters,
    MexicoSearchResponse,
    PriceHistoryEntry,
    PriceHistoryResult,
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

            results.append(AdjudicacionResult(
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
                institution=a.get("institution", ""),
                therapeutic_group=a.get("therapeutic_group", ""),
                source_type=a.get("source_type", ""),
            ))

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
                desiertas.append(AdjudicacionResult(
                    clave=a["clave"],
                    description=a.get("description", ""),
                    active_substance=a.get("active_substance", ""),
                    cycle=a.get("cycle", ""),
                    status="desierta",
                    supplier="",
                    units_requested=a.get("units_requested", 0),
                    units_awarded=0,
                    unit_price=0.0,
                    total_amount=0.0,
                    institution=a.get("institution", ""),
                    therapeutic_group=a.get("therapeutic_group", ""),
                    source_type=a.get("source_type", ""),
                ))

        # Sort by most recent cycle first, then by highest demand
        desiertas.sort(key=lambda d: (d.cycle, d.units_requested), reverse=True)
        return desiertas[:limit]

    # ── Internal helpers ──────────────────────────────────────────────

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
