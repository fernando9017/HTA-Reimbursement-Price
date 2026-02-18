"""France HAS (Haute Autorité de Santé) adapter.

Data source: BDPM (Base de Données Publique des Médicaments) TSV files.
Provides SMR (Service Médical Rendu) and ASMR (Amélioration du SMR) ratings
from the Commission de la Transparence opinions.

No authentication required. Files are Latin-1 encoded, tab-separated, no headers.
"""

import logging
from collections import defaultdict

import httpx

from app.config import BDPM_BASE_URL, BDPM_ENCODING, BDPM_FILES, BDPM_SEPARATOR, REQUEST_TIMEOUT
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)


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

        Each file is loaded independently so a failure in one file doesn't
        prevent loading of others.  The adapter marks itself as loaded if
        at least the compositions file was successfully parsed (required
        for substance matching).
        """
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            },
        ) as client:
            # Load each file independently — don't fail if one is unavailable
            for loader_name, loader in [
                ("medicines", self._load_medicines),
                ("compositions", self._load_compositions),
                ("smr", self._load_smr),
                ("asmr", self._load_asmr),
                ("ct_links", self._load_ct_links),
            ]:
                try:
                    await loader(client)
                except Exception:
                    logger.exception("Failed to load BDPM %s file", loader_name)

        # Mark as loaded if we have at least some data to work with
        has_compositions = len(self._compositions) > 0
        has_assessments = sum(len(v) for v in self._smr.values()) > 0 or sum(len(v) for v in self._asmr.values()) > 0
        self._loaded = has_compositions or has_assessments

        logger.info(
            "France HAS data loaded: %d medicines, %d compositions, %d SMR records, %d ASMR records, %d CT links (loaded=%s)",
            len(self._medicines),
            len(self._compositions),
            sum(len(v) for v in self._smr.values()),
            sum(len(v) for v in self._asmr.values()),
            len(self._ct_links),
            self._loaded,
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

        results = [AssessmentResult(**data) for data in dossier_assessments.values()]
        # Sort by opinion date descending (most recent first)
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading helpers ──────────────────────────────────────────

    async def _fetch_file(self, client: httpx.AsyncClient, file_key: str) -> str:
        """Download a BDPM file and return its content as a string."""
        url = BDPM_BASE_URL + BDPM_FILES[file_key]
        logger.info("Fetching BDPM file: %s", url)
        response = await client.get(url)
        response.raise_for_status()
        return response.content.decode(BDPM_ENCODING)

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


def _format_date(raw: str) -> str:
    """Convert YYYYMMDD to YYYY-MM-DD. Pass through if already formatted or invalid."""
    raw = raw.strip()
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw
