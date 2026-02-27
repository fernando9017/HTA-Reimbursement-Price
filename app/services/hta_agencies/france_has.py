"""France HAS (Haute Autorité de Santé) adapter.

Data source: BDPM (Base de Données Publique des Médicaments) TSV files.
Provides SMR (Service Médical Rendu) and ASMR (Amélioration du SMR) ratings
from the Commission de la Transparence opinions.

The BDPM database is the canonical source for all French medicines with their
HTA assessment outcomes.  It contains 12,000+ medicines with SMR/ASMR data.

No authentication required. Files are Latin-1 encoded, tab-separated, no headers.
"""

import asyncio
import logging
import re
from collections import defaultdict
from pathlib import Path

import httpx

from app.config import BDPM_BASE_URL, BDPM_ENCODING, BDPM_FILES, BDPM_SEPARATOR, REQUEST_TIMEOUT, SSL_VERIFY
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Number of retry attempts for each BDPM file download
_BDPM_MAX_RETRIES = 3

_SMR_EN: dict[str, str] = {
    "Important": "Major clinical benefit",
    "Modéré": "Moderate clinical benefit",
    "Faible": "Minor clinical benefit",
    "Insuffisant": "Insufficient clinical benefit",
    # Variant spellings and edge cases in BDPM data
    "important": "Major clinical benefit",
    "modéré": "Moderate clinical benefit",
    "faible": "Minor clinical benefit",
    "insuffisant": "Insufficient clinical benefit",
    "Bien fondé non déterminé": "Benefit not determined",
    "Non précisé": "Not specified",
}

_ASMR_EN: dict[str, str] = {
    "I": "Major therapeutic improvement",
    "II": "Important therapeutic improvement",
    "III": "Moderate therapeutic improvement",
    "IV": "Minor therapeutic improvement",
    "V": "No therapeutic improvement",
    "Sans objet": "Not applicable",
    "Non précisée": "Not specified",
}

_MOTIF_EN: dict[str, str] = {
    "Inscription": "Initial registration",
    "Inscription (première évaluation)": "Initial registration (first evaluation)",
    "Inscription (collectivités)": "Registration (hospital use)",
    "Renouvellement": "Renewal",
    "Renouvellement d'inscription": "Registration renewal",
    "Extension d'indication": "Indication extension",
    "Modification": "Modification",
    "Modification des conditions d'inscription": "Registration conditions modification",
    "Réévaluation": "Re-evaluation",
    "Réévaluation SMR et ASMR": "SMR and ASMR re-evaluation",
    "Radiation": "Delisting",
    "Rectificatif": "Correction",
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
            verify=SSL_VERIFY,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; VAP-Global-Resources/1.0; "
                    "+https://github.com/fernando9017/HTA-Reimbursement-Price)"
                ),
            },
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

        # Find all CIS codes where the active substance matches.
        # Use word-boundary matching to avoid "trastuzumab" matching
        # "trastuzumab deruxtecan" or "trastuzumab emtansine".
        matching_cis: set[str] = set()

        for cis_code, substances in self._compositions.items():
            for subst in substances:
                if _substance_matches(substance_lower, subst.lower()):
                    matching_cis.add(cis_code)
                    break

        # Also search by product name in medicine denominations
        if product_lower:
            for cis_code, denomination in self._medicines.items():
                if product_lower in denomination.lower():
                    matching_cis.add(cis_code)

        if not matching_cis:
            return []

        # Collect all assessments for matching CIS codes.
        # Group by dossier code + date to merge SMR and ASMR from the
        # same opinion AND deduplicate across multiple CIS codes
        # (different presentations of the same medicine sharing a dossier).
        dossier_assessments: dict[str, dict] = {}

        for cis_code in matching_cis:
            med_name = self._medicines.get(cis_code, "")

            for smr in self._smr.get(cis_code, []):
                dossier_code = smr["dossier_code"]
                key = f"{dossier_code}_{smr['date']}"
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
                        "assessment_url": _normalize_has_url(
                            self._ct_links.get(dossier_code, "")
                        ),
                    }
                else:
                    # Update SMR if this dossier already has ASMR
                    dossier_assessments[key]["smr_value"] = smr["value"]
                    dossier_assessments[key]["smr_description"] = smr["label"]

            for asmr in self._asmr.get(cis_code, []):
                dossier_code = asmr["dossier_code"]
                key = f"{dossier_code}_{asmr['date']}"
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
                        "assessment_url": _normalize_has_url(
                            self._ct_links.get(dossier_code, "")
                        ),
                    }
                else:
                    dossier_assessments[key]["asmr_value"] = asmr["value"]
                    dossier_assessments[key]["asmr_description"] = asmr["label"]

        results = [
            AssessmentResult(
                **data,
                indication=_extract_indication(
                    data.get("smr_description", ""),
                    data.get("asmr_description", ""),
                ),
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
        """Download a BDPM file and return its content as a string.

        Retries up to _BDPM_MAX_RETRIES times with exponential backoff to
        handle transient network failures.
        """
        url = BDPM_BASE_URL + BDPM_FILES[file_key]
        logger.info("Fetching BDPM file: %s (%s)", file_key, url)

        last_error: Exception | None = None
        for attempt in range(1, _BDPM_MAX_RETRIES + 1):
            try:
                response = await client.get(url)
                response.raise_for_status()
                # Try primary encoding, fall back to utf-8 with replacement
                try:
                    content = response.content.decode(BDPM_ENCODING)
                except UnicodeDecodeError:
                    content = response.content.decode("utf-8", errors="replace")
                    logger.warning("BDPM %s: fell back to utf-8 decoding", file_key)
                logger.info(
                    "BDPM %s fetched: %d bytes, %d lines",
                    file_key, len(response.content), content.count("\n"),
                )
                return content
            except Exception as exc:
                last_error = exc
                if attempt < _BDPM_MAX_RETRIES:
                    wait = 2 ** attempt
                    logger.warning(
                        "BDPM %s fetch attempt %d/%d failed, retrying in %ds: %s",
                        file_key, attempt, _BDPM_MAX_RETRIES, wait, exc,
                    )
                    await asyncio.sleep(wait)

        raise RuntimeError(f"BDPM {file_key} fetch failed after {_BDPM_MAX_RETRIES} attempts: {last_error}")

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
        """Parse CIS_COMPO_bdpm.txt: CIS code → active substance names.

        Accepts all substance types (SA, FT, ST, and empty) to ensure
        comprehensive coverage.  The BDPM composition file uses:
        - SA = substance active (active substance)
        - FT = fraction thérapeutique (therapeutic fraction)
        - ST = substance for testing (less common)
        """
        content = await self._fetch_file(client, "compositions")
        for row in self._parse_rows(content):
            if len(row) >= 4:
                cis_code = row[0]
                substance_name = row[3].strip()
                if substance_name and substance_name not in self._compositions[cis_code]:
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
                url = _normalize_has_url(row[1])
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
        self._safe_write_json_file(data_file, self._make_envelope(data))
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


def _extract_indication(smr_label: str, asmr_label: str) -> str:
    """Extract the therapeutic indication from the SMR or ASMR label text.

    BDPM labels typically follow patterns like:
    - "Le service médical rendu par KEYTRUDA est important dans le mélanome avancé"
    - "SMR important dans le cancer urothélial"
    - "ASMR modérée dans le mélanome"

    Returns the indication text, or empty string if it cannot be extracted.
    """
    for label in (smr_label, asmr_label):
        if not label:
            continue

        # Pattern: "dans le/la/l'/les [indication]" — extract everything after "dans"
        match = re.search(
            r"\bdans\s+(le |la |l['\u2019]|les |l\u2019|son |cette |)"
            r"(.+?)\.?\s*$",
            label,
            re.IGNORECASE,
        )
        if match:
            indication = (match.group(1) + match.group(2)).strip().rstrip(".")
            # Skip generic descriptions like "l'indication évaluée"
            if "indication évaluée" in indication.lower():
                continue
            if "indication retenue" in indication.lower():
                continue
            # Capitalize first letter
            if indication:
                indication = indication[0].upper() + indication[1:]
            return indication

    return ""


def _substance_matches(query: str, candidate: str) -> bool:
    """Check whether *query* matches *candidate* as a substance name.

    Prevents "trastuzumab" from matching "trastuzumab deruxtecan" or
    "trastuzumab emtansine" — those are distinct molecules (antibody-drug
    conjugates) despite sharing a prefix.

    Matching rules:
    1. Exact match (same string)
    2. One is a comma/semicolon-separated list containing the other
       as an exact element (multi-substance products like "pertuzumab, trastuzumab")
    3. Partial INN prefix matching within a single-word substance
       (e.g., "pembroliz" matches "pembrolizumab" since the candidate
       is a single word, but "trastuzumab" does NOT match "trastuzumab
       deruxtecan" since the candidate is multi-word)
    """
    if query == candidate:
        return True

    # Split both on comma/semicolon separators to handle multi-substance
    # products (e.g., "pertuzumab, trastuzumab")
    query_parts = {p.strip() for p in re.split(r"[,;/+]", query) if p.strip()}
    candidate_parts = {p.strip() for p in re.split(r"[,;/+]", candidate) if p.strip()}

    # Match if any exact element from one appears in the other
    if query_parts & candidate_parts:
        return True

    # Partial INN prefix matching: allow "pembroliz" to match "pembrolizumab"
    # but NOT "trastuzumab" to match "trastuzumab deruxtecan".
    # The rule: a query is a valid partial match only if it's a substring
    # of a SINGLE-WORD substance element (no spaces).
    for qp in query_parts:
        for cp in candidate_parts:
            # Only allow partial matching within single-word substances
            if " " not in cp and qp in cp:
                return True
            if " " not in qp and cp in qp:
                return True

    return False


def _normalize_has_url(url: str) -> str:
    """Normalize HAS assessment URLs to the current website format.

    The BDPM CT links file may contain older URLs using the ``/portail/``
    path or plain ``http://``.  The HAS website now uses ``https://`` and
    has dropped the ``/portail/`` prefix.
    """
    if not url:
        return url

    # http → https
    if url.startswith("http://"):
        url = "https://" + url[7:]

    # Remove legacy /portail/ path segment
    url = url.replace("/portail/jcms/", "/jcms/")

    # Ensure /fr/ locale is present in the path
    if "/jcms/" in url and "/fr/" not in url and "/en/" not in url:
        # Insert /fr/ before the slug: /jcms/c_123456/slug → /jcms/c_123456/fr/slug
        url = re.sub(r"(/jcms/[cp]_\d+)/", r"\1/fr/", url, count=1)

    return url
