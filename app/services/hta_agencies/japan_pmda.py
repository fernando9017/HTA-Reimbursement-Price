"""Japan NHI pricing adapter — KEGG / JAPIC data source.

Two data sources fetched at startup (two HTTP calls):
  1. https://rest.kegg.jp/conv/drug/japic
       Maps every JAPIC code to a KEGG drug ID.
       JAPIC (Japan Pharmaceutical Information Center) codes identify drugs
       that are listed on Japan's National Health Insurance (NHI) price schedule.
       A drug with a JAPIC code is reimbursed; one without is not.

  2. https://rest.kegg.jp/list/drug
       Maps every KEGG drug ID to its name(s) (INN + brand names marked "(TN)").

At search time one additional call per matched drug:
  3. https://rest.kegg.jp/get/{kegg_id}
       Returns the full drug entry including DISEASE (indication) and JAPIC fields.
       Results are cached in memory so repeated searches for the same drug are fast.

Pricing URL returned:
  https://www.kegg.jp/medicus-bin/japic_med?japic_code=XXXXXXXX

MHLW pricing notifications page (static reference for launch pricing PDFs):
  https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/
  iryouhoken/newpage_00037.html
"""

import logging
import re
from pathlib import Path

import httpx

from app.config import KEGG_API_BASE, KEGG_JAPIC_BASE_URL, MHLW_PRICING_URL, REQUEST_TIMEOUT
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)


class JapanPMDA(HTAAgency):
    """Japan NHI pricing via KEGG/JAPIC — Ministry of Health, Labour and Welfare."""

    def __init__(self) -> None:
        # Each entry: {kegg_id, names_lower, names_display, japic_code, japic_url}
        self._drug_list: list[dict] = []
        # Per-drug disease/indication text fetched on demand at search time (kegg_id → text)
        self._disease_cache: dict[str, str] = {}
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "JP"

    @property
    def country_name(self) -> str:
        return "Japan"

    @property
    def agency_abbreviation(self) -> str:
        return "MHLW"

    @property
    def agency_full_name(self) -> str:
        return "Ministry of Health, Labour and Welfare"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── Startup data loading ──────────────────────────────────────────

    async def load_data(self) -> None:
        """Fetch KEGG drug list and JAPIC mappings to build the NHI pricing index."""
        drug_to_japic: dict[str, str] = {}

        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": "VAP-Global-Resources/0.1 (research tool)"},
        ) as client:
            # Step 1: JAPIC → KEGG drug ID mapping (one call gives all NHI-priced drugs)
            try:
                resp = await client.get(f"{KEGG_API_BASE}/conv/drug/japic")
                resp.raise_for_status()
                for line in resp.text.splitlines():
                    if "\t" not in line:
                        continue
                    japic_part, drug_part = line.split("\t", 1)
                    japic_code = japic_part.strip().removeprefix("japic:")
                    drug_id = drug_part.strip()  # "dr:D11678"
                    drug_to_japic[drug_id] = japic_code
                logger.info("KEGG JAPIC conv: %d NHI-priced drugs", len(drug_to_japic))
            except Exception as exc:
                logger.warning("KEGG JAPIC conv fetch failed: %s", exc)

            # Step 2: Drug ID → name(s)
            items: list[dict] = []
            try:
                resp = await client.get(f"{KEGG_API_BASE}/list/drug")
                resp.raise_for_status()
                for line in resp.text.splitlines():
                    if "\t" not in line:
                        continue
                    id_part, names_raw = line.split("\t", 1)
                    kegg_id = id_part.strip()  # "dr:D11678"

                    # Semicolon-separated names; brand names carry "(TN)"
                    raw_parts = [n.strip() for n in names_raw.split(";")]
                    names_display: list[str] = []
                    names_lower: list[str] = []
                    for part in raw_parts:
                        clean = re.sub(r"\s*\(TN\)\s*", "", part).strip()
                        if clean:
                            names_display.append(clean)
                            names_lower.append(clean.lower())

                    japic_code = drug_to_japic.get(kegg_id, "")
                    items.append({
                        "kegg_id": kegg_id,
                        "names_lower": names_lower,
                        "names_display": names_display,
                        "japic_code": japic_code,
                        "japic_url": f"{KEGG_JAPIC_BASE_URL}{japic_code}" if japic_code else "",
                    })
            except Exception as exc:
                logger.warning("KEGG drug list fetch failed: %s", exc)

            self._drug_list = items

        self._loaded = True
        reimbursed = sum(1 for d in self._drug_list if d["japic_code"])
        logger.info(
            "Japan (KEGG/JAPIC) loaded: %d drugs total, %d with NHI pricing",
            len(self._drug_list), reimbursed,
        )

    # ── Search ────────────────────────────────────────────────────────

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Return NHI pricing entries for the given substance or brand name."""
        if not self._loaded:
            return []

        sub_lower = active_substance.lower().strip()
        prod_lower = (product_name or "").lower().strip()

        matched: list[dict] = []
        for drug in self._drug_list:
            names = drug["names_lower"]
            sub_match = any(sub_lower in n or n in sub_lower for n in names)
            prod_match = prod_lower and any(prod_lower in n or n in prod_lower for n in names)
            if sub_match or prod_match:
                matched.append(drug)

        if not matched:
            return []

        # Cap to avoid excessive KEGG API calls
        matched = matched[:5]

        results: list[AssessmentResult] = []
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "VAP-Global-Resources/0.1 (research tool)"},
        ) as client:
            for drug in matched:
                # Fetch indication text (cached after first lookup)
                indication = await self._get_indication(client, drug["kegg_id"])
                is_reimbursed = bool(drug["japic_code"])

                results.append(AssessmentResult(
                    product_name=(
                        drug["names_display"][0] if drug["names_display"] else active_substance
                    ),
                    evaluation_reason=indication,
                    opinion_date="",
                    assessment_url=drug["japic_url"],
                    pmda_review_type="Reimbursed (NHI)" if is_reimbursed else "Not in NHI price list",
                    japan_mhlw_url=MHLW_PRICING_URL if is_reimbursed else "",
                ))

        return results

    async def _get_indication(self, client: httpx.AsyncClient, kegg_id: str) -> str:
        """Return KEGG DISEASE/indication text for a drug; caches results."""
        if kegg_id in self._disease_cache:
            return self._disease_cache[kegg_id]
        try:
            # Strip "dr:" prefix — KEGG GET accepts bare IDs like "D11678"
            clean_id = kegg_id.removeprefix("dr:")
            resp = await client.get(f"{KEGG_API_BASE}/get/{clean_id}")
            if resp.status_code == 200:
                text = _parse_kegg_disease(resp.text)
                self._disease_cache[kegg_id] = text
                return text
        except Exception as exc:
            logger.debug("KEGG GET %s failed: %s", kegg_id, exc)
        self._disease_cache[kegg_id] = ""
        return ""

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._drug_list = payload["data"]
        self._loaded = bool(self._drug_list)
        if self._loaded:
            reimbursed = sum(1 for d in self._drug_list if d.get("japic_code"))
            logger.info(
                "%s loaded %d drugs (%d with NHI pricing) from %s",
                self.agency_abbreviation, len(self._drug_list), reimbursed, data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._write_json_file(data_file, self._make_envelope(self._drug_list))
        logger.info(
            "%s saved %d drugs to %s",
            self.agency_abbreviation, len(self._drug_list), data_file,
        )


# ── Helpers ──────────────────────────────────────────────────────────


def _parse_kegg_disease(entry_text: str) -> str:
    """Extract disease/indication names from a KEGG flat-file drug entry.

    KEGG drug entries use a fixed-width flat-file format.  The DISEASE section
    looks like::

        DISEASE     H01563  Urothelial carcinoma [DS:H01563]
                    H01562  Bladder cancer [DS:H01562]

    Continuation lines are indented; the next non-indented keyword ends the block.
    """
    diseases: list[str] = []
    in_disease = False

    for line in entry_text.splitlines():
        if line.startswith("DISEASE"):
            in_disease = True
        elif in_disease and not (line.startswith(" ") or line.startswith("\t")):
            break  # Next top-level field

        if in_disease:
            # Each disease line contains an H-number then a free-text name
            m = re.search(r"H\d{5}\s+(.+?)(?:\s+\[DS:|$)", line)
            if m:
                name = m.group(1).strip()
                if name and name not in diseases:
                    diseases.append(name)

    return "; ".join(diseases)
