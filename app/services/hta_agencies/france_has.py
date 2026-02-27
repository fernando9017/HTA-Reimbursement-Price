"""France HAS (Haute Autorité de Santé) adapter.

Data source: BDPM (Base de Données Publique des Médicaments) TSV files.
Provides SMR (Service Médical Rendu) and ASMR (Amélioration du SMR) ratings
from the Commission de la Transparence opinions.

No authentication required. Files are Latin-1 encoded, tab-separated, no headers.
"""

import logging
from collections import defaultdict
from pathlib import Path

import httpx

from app.config import BDPM_BASE_URL, BDPM_ENCODING, BDPM_FILES, BDPM_SEPARATOR, REQUEST_TIMEOUT
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

_SMR_EN: dict[str, str] = {
    "Important": "Major clinical benefit",
    "Modéré": "Moderate clinical benefit",
    "Faible": "Minor clinical benefit",
    "Insuffisant": "Insufficient clinical benefit",
}

_ASMR_EN: dict[str, str] = {
    "I": "Major therapeutic improvement",
    "II": "Important therapeutic improvement",
    "III": "Moderate therapeutic improvement",
    "IV": "Minor therapeutic improvement",
    "V": "No therapeutic improvement",
}

_MOTIF_EN: dict[str, str] = {
    "Inscription": "Initial registration",
    "Renouvellement": "Renewal",
    "Extension d'indication": "Indication extension",
    "Modification": "Modification",
    "Réévaluation": "Re-evaluation",
}


def _build_summary_en(smr_value: str, asmr_value: str, motif: str) -> str:
    """Compose a concise English summary from French HAS rating codes."""
    parts: list[str] = []
    if smr_value:
        label = _SMR_EN.get(smr_value, smr_value)
        parts.append(f"SMR: {label}")
    if asmr_value:
        label = _ASMR_EN.get(asmr_value, f"ASMR {asmr_value}")
        parts.append(f"ASMR {asmr_value}: {label}")
    if motif:
        reason = _MOTIF_EN.get(motif, motif)
        parts.append(f"Evaluation purpose: {reason}")
    return " | ".join(parts)


class FranceHAS(HTAAgency):
    """HAS (Haute Autorité de Santé) — France's HTA agency."""

    def __init__(self) -> None:
        # CIS code → medicine name
        self._medicines: dict[str, str] = {}
        # CIS code → list of active substance names
        self._compositions: dict[str, list[str]] = defaultdict(list)
        # CIS code → list of SMR dicts
        self._smr: dict[str, list[dict]] = defaultdict(list)
        # CIS code → list of ASMR dicts
        self._asmr: dict[str, list[dict]] = defaultdict(list)
        # HAS dossier code → URL
        self._ct_links: dict[str, str] = {}
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "FR"

    @property
    def country_name(self) -> str:
        return "France"

    @property
    def agency_abbreviation(self) -> str:
        return "HAS"

    @property
    def agency_full_name(self) -> str:
        return "Haute Autorité de Santé"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch all BDPM data files and parse them.

        Core files (medicines, compositions, SMR, ASMR) must load
        successfully.  Supplementary files (CT links) are loaded on a
        best-effort basis — a failure there does not prevent the module
        from being marked as loaded.
        """
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
        ) as client:
            # Core files — all must succeed
            await self._load_medicines(client)
            await self._load_compositions(client)
            await self._load_smr(client)
            await self._load_asmr(client)

            # Supplementary file — best-effort
            try:
                await self._load_ct_links(client)
            except Exception:
                logger.warning(
                    "Failed to load BDPM CT links file — assessment URLs "
                    "will be unavailable, but SMR/ASMR data is intact",
                    exc_info=True,
                )

        if not self._medicines:
            raise RuntimeError("BDPM medicines file returned no records")

        smr_count = sum(len(v) for v in self._smr.values())
        asmr_count = sum(len(v) for v in self._asmr.values())
        if smr_count == 0 and asmr_count == 0:
            raise RuntimeError("BDPM SMR and ASMR files returned no records")

        self._loaded = True
        logger.info(
            "France HAS data loaded: %d medicines, %d compositions, "
            "%d SMR records, %d ASMR records, %d CT links",
            len(self._medicines),
            sum(len(v) for v in self._compositions.values()),
            smr_count,
            asmr_count,
            len(self._ct_links),
        )

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find HAS assessments matching the given active substance."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        # Find all CIS codes where the active substance matches
        matching_cis: set[str] = set()

        for cis_code, substances in self._compositions.items():
            for subst in substances:
                if substance_lower in subst.lower() or subst.lower() in substance_lower:
                    matching_cis.add(cis_code)
                    break

        # Also search by product name in medicine denominations
        if product_lower:
            for cis_code, denomination in self._medicines.items():
                if product_lower in denomination.lower():
                    matching_cis.add(cis_code)

        if not matching_cis:
            return []

        # Collect all assessments for matching CIS codes
        # Group by dossier code to merge SMR and ASMR from the same opinion
        dossier_assessments: dict[str, dict] = {}

        for cis_code in matching_cis:
            med_name = self._medicines.get(cis_code, "")

            for smr in self._smr.get(cis_code, []):
                dossier_code = smr["dossier_code"]
                key = f"{cis_code}_{dossier_code}_{smr['date']}"
                if key not in dossier_assessments:
                    dossier_assessments[key] = {
                        "product_name": med_name,
                        "cis_code": cis_code,
                        "dossier_code": dossier_code,
                        "evaluation_reason": smr["motif"],
                        "opinion_date": smr["date"],
                        "smr_value": smr["value"],
                        "smr_description": smr["label"],
                        "asmr_value": "",
                        "asmr_description": "",
                        "assessment_url": self._ct_links.get(dossier_code, ""),
                    }
                else:
                    # Update SMR if this dossier already has ASMR
                    dossier_assessments[key]["smr_value"] = smr["value"]
                    dossier_assessments[key]["smr_description"] = smr["label"]

            for asmr in self._asmr.get(cis_code, []):
                dossier_code = asmr["dossier_code"]
                key = f"{cis_code}_{dossier_code}_{asmr['date']}"
                if key not in dossier_assessments:
                    dossier_assessments[key] = {
                        "product_name": med_name,
                        "cis_code": cis_code,
                        "dossier_code": dossier_code,
                        "evaluation_reason": asmr["motif"],
                        "opinion_date": asmr["date"],
                        "smr_value": "",
                        "smr_description": "",
                        "asmr_value": asmr["value"],
                        "asmr_description": asmr["label"],
                        "assessment_url": self._ct_links.get(dossier_code, ""),
                    }
                else:
                    dossier_assessments[key]["asmr_value"] = asmr["value"]
                    dossier_assessments[key]["asmr_description"] = asmr["label"]

        results = [
            AssessmentResult(
                **data,
                summary_en=_build_summary_en(
                    data.get("smr_value", ""),
                    data.get("asmr_value", ""),
                    data.get("evaluation_reason", ""),
                ),
            )
            for data in dossier_assessments.values()
        ]
        # Sort by opinion date descending (most recent first)
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading helpers ──────────────────────────────────────────

    async def _fetch_file(self, client: httpx.AsyncClient, file_key: str) -> str:
        """Download a BDPM file and return its content as a string."""
        url = BDPM_BASE_URL + BDPM_FILES[file_key]
        logger.info("Fetching BDPM file: %s (%s)", file_key, url)
        response = await client.get(url)
        response.raise_for_status()
        content = response.content.decode(BDPM_ENCODING)
        logger.info(
            "BDPM %s fetched: %d bytes, %d lines",
            file_key, len(response.content), content.count("\n"),
        )
        return content

    def _parse_rows(self, content: str) -> list[list[str]]:
        """Split file content into rows of tab-separated fields."""
        rows = []
        for line in content.splitlines():
            line = line.strip()
            if line:
                rows.append([field.strip() for field in line.split(BDPM_SEPARATOR)])
        return rows

    async def _load_medicines(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_bdpm.txt: CIS code → denomination."""
        content = await self._fetch_file(client, "medicines")
        for row in self._parse_rows(content):
            if len(row) >= 2:
                cis_code = row[0]
                denomination = row[1]
                self._medicines[cis_code] = denomination

    async def _load_compositions(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_COMPO_bdpm.txt: CIS code → active substance names."""
        content = await self._fetch_file(client, "compositions")
        for row in self._parse_rows(content):
            if len(row) >= 4:
                cis_code = row[0]
                substance_name = row[3]
                nature = row[6] if len(row) > 6 else ""
                # SA = substance active, FT = fraction thérapeutique
                if nature in ("SA", "FT", ""):
                    if substance_name not in self._compositions[cis_code]:
                        self._compositions[cis_code].append(substance_name)

    async def _load_smr(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_HAS_SMR_bdpm.txt."""
        content = await self._fetch_file(client, "smr")
        for row in self._parse_rows(content):
            if len(row) >= 5:
                cis_code = row[0]
                self._smr[cis_code].append(
                    {
                        "dossier_code": row[1] if len(row) > 1 else "",
                        "motif": row[2] if len(row) > 2 else "",
                        "date": _format_date(row[3]) if len(row) > 3 else "",
                        "value": row[4] if len(row) > 4 else "",
                        "label": row[5] if len(row) > 5 else "",
                    }
                )

    async def _load_asmr(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_HAS_ASMR_bdpm.txt."""
        content = await self._fetch_file(client, "asmr")
        for row in self._parse_rows(content):
            if len(row) >= 5:
                cis_code = row[0]
                self._asmr[cis_code].append(
                    {
                        "dossier_code": row[1] if len(row) > 1 else "",
                        "motif": row[2] if len(row) > 2 else "",
                        "date": _format_date(row[3]) if len(row) > 3 else "",
                        "value": row[4] if len(row) > 4 else "",
                        "label": row[5] if len(row) > 5 else "",
                    }
                )

    async def _load_ct_links(self, client: httpx.AsyncClient) -> None:
        """Parse HAS_LiensPageCT_bdpm.txt: dossier code → URL."""
        content = await self._fetch_file(client, "ct_links")
        for row in self._parse_rows(content):
            if len(row) >= 2:
                dossier_code = row[0]
                url = row[1]
                self._ct_links[dossier_code] = url

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), dict):
            return False
        data = payload["data"]
        try:
            self._medicines = dict(data.get("medicines", {}))
            self._compositions = defaultdict(list, data.get("compositions", {}))
            self._smr = defaultdict(list, data.get("smr", {}))
            self._asmr = defaultdict(list, data.get("asmr", {}))
            self._ct_links = dict(data.get("ct_links", {}))
        except Exception:
            logger.warning("%s: malformed data in %s", self.agency_abbreviation, data_file)
            return False

        smr_count = sum(len(v) for v in self._smr.values())
        asmr_count = sum(len(v) for v in self._asmr.values())
        # Require medicines AND at least some SMR/ASMR records
        self._loaded = bool(self._medicines) and (smr_count > 0 or asmr_count > 0)
        if self._loaded:
            logger.info(
                "%s loaded from %s: %d medicines, %d SMR, %d ASMR, %d CT links",
                self.agency_abbreviation, data_file,
                len(self._medicines), smr_count, asmr_count, len(self._ct_links),
            )
        else:
            logger.warning(
                "%s: cache %s has insufficient data (%d medicines, %d SMR, %d ASMR)",
                self.agency_abbreviation, data_file,
                len(self._medicines), smr_count, asmr_count,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        data = {
            "medicines": self._medicines,
            "compositions": dict(self._compositions),
            "smr": dict(self._smr),
            "asmr": dict(self._asmr),
            "ct_links": self._ct_links,
        }
        self._write_json_file(data_file, self._make_envelope(data))
        logger.info(
            "%s saved %d medicines to %s",
            self.agency_abbreviation, len(self._medicines), data_file,
        )


def _format_date(raw: str) -> str:
    """Convert YYYYMMDD to YYYY-MM-DD. Pass through if already formatted or invalid."""
    raw = raw.strip()
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw
