"""Germany G-BA (Gemeinsamer Bundesausschuss) adapter.

Data source: G-BA AIS (Arztinformationssystem) XML file containing all
AMNOG early benefit assessment decisions (Nutzenbewertung).

The XML file is published as a complete delivery on the 1st and 15th of
each month.  It contains decisions structured per patient group, with
benefit ratings (Zusatznutzen), evidence levels, and comparator therapies.

No authentication required.  A permanent download URL can be requested
from ais@g-ba.de.
"""

import logging
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import httpx

from app.config import GBA_AIS_PAGE_URL, GBA_ASSESSMENT_BASE_URL, REQUEST_TIMEOUT
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Zusatznutzen extent values → English translations
BENEFIT_TRANSLATIONS = {
    "erheblich": "Major added benefit (erheblich)",
    "beträchtlich": "Considerable added benefit (beträchtlich)",
    "gering": "Minor added benefit (gering)",
    "nicht quantifizierbar": "Non-quantifiable added benefit (nicht quantifizierbar)",
    "kein Zusatznutzen": "No added benefit (kein Zusatznutzen)",
    "geringerer Nutzen": "Lesser benefit (geringerer Nutzen)",
}

# Evidence certainty levels → English translations
EVIDENCE_TRANSLATIONS = {
    "Beleg": "Proof (Beleg)",
    "Hinweis": "Indication (Hinweis)",
    "Anhaltspunkt": "Hint (Anhaltspunkt)",
}


class GermanyGBA(HTAAgency):
    """G-BA (Gemeinsamer Bundesausschuss) — Germany's HTA agency."""

    def __init__(self) -> None:
        # List of parsed decision dicts
        self._decisions: list[dict] = []
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "DE"

    @property
    def country_name(self) -> str:
        return "Germany"

    @property
    def agency_abbreviation(self) -> str:
        return "G-BA"

    @property
    def agency_full_name(self) -> str:
        return "Gemeinsamer Bundesausschuss"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch and parse the G-BA AIS XML file."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            xml_urls = await self._find_xml_urls(client)
            xml_content = None
            last_error = None
            for url in xml_urls:
                try:
                    logger.info("Trying G-BA AIS XML from %s", url)
                    response = await client.get(url)
                    response.raise_for_status()
                    xml_content = response.content
                    break
                except httpx.HTTPStatusError as exc:
                    logger.warning("G-BA XML URL returned %s: %s", exc.response.status_code, url)
                    last_error = exc
                except httpx.HTTPError as exc:
                    logger.warning("G-BA XML URL failed: %s — %s", url, exc)
                    last_error = exc

            if xml_content is None:
                raise RuntimeError(
                    "Could not fetch G-BA AIS XML from any known URL. "
                    "The download link may have changed — check "
                    "https://www.g-ba.de/themen/arzneimittel/"
                    "arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/ais/"
                ) from last_error

        self._decisions = self._parse_xml(xml_content)
        self._loaded = True
        logger.info("Germany G-BA data loaded: %d decision entries", len(self._decisions))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find G-BA benefit assessments matching the given active substance.

        Matches against substance names, trade names, **and** the indication
        text (AWG) to catch cases where a drug name appears only in the
        indication description.
        """
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results = []
        for dec in self._decisions:
            substance_match = False
            product_match = False

            # Match active substance
            for ws in dec.get("substances", []):
                if substance_lower in ws.lower() or ws.lower() in substance_lower:
                    substance_match = True
                    break

            # Match trade name (against both product_name param and indication text)
            if product_lower:
                for hn in dec.get("trade_names", []):
                    if product_lower in hn.lower() or hn.lower() in product_lower:
                        product_match = True
                        break
                # Also match product name in the indication text (AWG)
                if not product_match:
                    indication_lower = dec.get("indication", "").lower()
                    if product_lower in indication_lower:
                        product_match = True

            if not substance_match and not product_match:
                continue

            # Build the assessment URL
            procedure_id = dec.get("procedure_id", "")
            assessment_url = ""
            if procedure_id:
                assessment_url = GBA_ASSESSMENT_BASE_URL + procedure_id + "/"

            # Translate benefit rating
            raw_benefit = dec.get("benefit_rating", "")
            benefit_desc = BENEFIT_TRANSLATIONS.get(raw_benefit, raw_benefit)

            # Translate evidence level
            raw_evidence = dec.get("evidence_level", "")
            evidence_desc = EVIDENCE_TRANSLATIONS.get(raw_evidence, raw_evidence)

            trade_name = ", ".join(dec.get("trade_names", [])) or active_substance

            patient_group = dec.get("patient_group", "")
            comparator_val = dec.get("comparator", "")

            # Build concise English summary
            summary_parts: list[str] = []
            if patient_group:
                summary_parts.append(f"Population: {patient_group}")
            if benefit_desc:
                summary_parts.append(f"Added benefit: {benefit_desc}")
            if evidence_desc:
                summary_parts.append(f"Evidence: {evidence_desc}")
            if comparator_val:
                summary_parts.append(f"vs. {comparator_val}")
            summary_en = " | ".join(summary_parts)

            results.append(
                AssessmentResult(
                    product_name=trade_name,
                    dossier_code=dec.get("decision_id", ""),
                    evaluation_reason=dec.get("indication", ""),
                    opinion_date=dec.get("decision_date", ""),
                    assessment_url=assessment_url,
                    benefit_rating=raw_benefit,
                    benefit_rating_description=benefit_desc,
                    evidence_level=evidence_desc,
                    comparator=comparator_val,
                    patient_group=patient_group,
                    summary_en=summary_en,
                )
            )

        # Sort most recent first
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading helpers ──────────────────────────────────────────

    async def _find_xml_urls(self, client: httpx.AsyncClient) -> list[str]:
        """Build a list of candidate XML download URLs to try.

        First attempts to scrape the actual link from the AIS page, then
        falls back to several known/guessed URL patterns.
        """
        urls: list[str] = []

        # Try to scrape the current XML link from the AIS page.
        # The G-BA site may render links with single or double quotes, and
        # the href may be relative or absolute.
        ais_page_urls = [
            GBA_AIS_PAGE_URL,
            "https://www.g-ba.de/themen/arzneimittel/arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/ais/",
        ]
        for ais_page_url in ais_page_urls:
            try:
                response = await client.get(ais_page_url)
                response.raise_for_status()
                html = response.text
                # Match href/src/data-href attributes pointing to the AIS XML
                for match in re.finditer(
                    r"""(?:href|src|data-href|data-url)=['"]((?:[^'"]*/)"""
                    r"""G-BA_Beschluss_Info[^'"]*\.xml)['"]""",
                    html,
                    re.IGNORECASE,
                ):
                    url = match.group(1)
                    if not url.startswith("http"):
                        url = "https://www.g-ba.de" + (
                            url if url.startswith("/") else "/" + url
                        )
                    urls.append(url)

                # Also scan for any .xml links that contain "Beschluss" (broader)
                if not urls:
                    for match in re.finditer(
                        r"""href=['"](/[^'"]*Beschluss[^'"]*\.xml)['"]""",
                        html,
                        re.IGNORECASE,
                    ):
                        urls.append("https://www.g-ba.de" + match.group(1))

                # Also scan for any generic .xml download links
                if not urls:
                    for match in re.finditer(
                        r"""href=['"](/[^'"]*\.xml)['"]""",
                        html,
                        re.IGNORECASE,
                    ):
                        xml_path = match.group(1)
                        if "ais" in xml_path.lower() or "beschluss" in xml_path.lower():
                            urls.append("https://www.g-ba.de" + xml_path)

                if urls:
                    break
            except Exception:
                logger.warning(
                    "Could not fetch AIS page %s to find XML URL", ais_page_url,
                )

        # Fallback: known and guessed download path patterns.
        # The G-BA periodically changes the numeric folder segment in the URL,
        # so we list the most commonly observed patterns alongside a direct
        # /downloads/ais/ path that works when the AIS page is unavailable.
        urls.extend([
            "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/downloads/ais-dateien/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/fileadmin/downloads/ais/G-BA_Beschluss_Info.xml",
            # Additional patterns observed in G-BA URL structure
            "https://www.g-ba.de/downloads/83-691-883/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/downloads/83-691/G-BA_Beschluss_Info.xml",
        ])

        # De-duplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                unique.append(u)
        return unique

    def _parse_xml(self, xml_content: bytes) -> list[dict]:
        """Parse the G-BA AIS XML into a list of decision dicts.

        The XML hierarchy is approximately:
          G-BA_Beschluss_Info / Beschluss / PAT_GR (patient group)

        Each patient group within a decision gets its own entry because
        benefit ratings can differ per patient group for the same drug.
        """
        decisions = []
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError:
            logger.exception("Failed to parse G-BA XML")
            return decisions

        # Try multiple possible root/child structures
        beschluesse = self._find_elements(root, [
            "Beschluss", "BESCHLUSS", "besluit",
            ".//Beschluss", ".//{*}Beschluss",
        ])

        # If no Beschluss elements found, iterate direct children
        if not beschluesse:
            beschluesse = list(root)

        for beschluss in beschluesse:
            base = self._parse_beschluss_base(beschluss)
            patient_groups = self._find_elements(beschluss, [
                "PAT_GR", "Pat_Gr", "PATGR", ".//PAT_GR", ".//{*}PAT_GR",
            ])

            if patient_groups:
                for pg in patient_groups:
                    entry = dict(base)
                    entry.update(self._parse_patient_group(pg))
                    decisions.append(entry)
            else:
                # No patient groups — treat the decision as a single entry
                entry = dict(base)
                entry.update(self._extract_benefit_from_element(beschluss))
                decisions.append(entry)

        return decisions

    def _parse_beschluss_base(self, elem: ET.Element) -> dict:
        """Extract top-level decision metadata."""
        substances = []
        trade_names = []
        decision_id = ""
        procedure_id = ""
        indication = ""
        decision_date = ""

        # Decision ID (ID_BE_AKZ)
        decision_id = self._get_text(elem, [
            "ID_BE_AKZ", "id_be_akz", "AKZ", "akz",
        ])

        # Extract the procedure number from the decision ID.
        # G-BA decision IDs follow the pattern "YYYY-MM-DD-D-<seq>" where
        # <seq> is the sequential procedure number used in the assessment URL.
        # Prefer a trailing "-D-<digits>" suffix; fall back to the last
        # numeric segment so we don't accidentally pick up the year.
        if decision_id:
            num_match = re.search(r"-[Dd]-(\d+)\s*$", decision_id)
            if not num_match:
                num_match = re.search(r"(\d+)\s*$", decision_id)
            if num_match:
                procedure_id = num_match.group(1)

        # Decision date
        decision_date = self._get_text(elem, [
            "DAT_BESCHLUSS", "Dat_Beschluss", "DATUM", "datum",
            "Beschluss_Datum", "beschluss_datum", "date",
        ])
        decision_date = self._normalize_date(decision_date)

        # Active substance (Wirkstoff)
        ws_containers = self._find_elements(elem, [
            "WS_BEW", "Ws_Bew", "WIRKSTOFF", "Wirkstoff",
            ".//WS_BEW", ".//{*}WS_BEW",
        ])
        for ws in ws_containers:
            name = self._get_text(ws, [
                "NAME_WS", "Name_Ws", "BEZEICHNUNG", "name",
            ])
            if name:
                substances.append(name)

        # If no substance in containers, try direct text
        if not substances:
            ws_text = self._get_text(elem, [
                "WIRKSTOFF", "Wirkstoff", "wirkstoff", "WS_BEW",
            ])
            if ws_text:
                substances.append(ws_text)

        # Trade names (Handelsname)
        hn_containers = self._find_elements(elem, [
            "HN", "Hn", "HANDELSNAME", "Handelsname",
            ".//HN", ".//{*}HN",
        ])
        for hn in hn_containers:
            name = self._get_text(hn, ["NAME_HN", "Name_Hn", "name"])
            if name:
                trade_names.append(name)
            elif hn.text and hn.text.strip():
                trade_names.append(hn.text.strip())

        if not trade_names:
            hn_text = self._get_text(elem, [
                "HANDELSNAME", "Handelsname", "handelsname",
            ])
            if hn_text:
                trade_names.append(hn_text)

        # Indication / therapeutic area (AWG)
        indication = self._get_text(elem, [
            "AWG", "Awg", "ANWENDUNGSGEBIET", "Anwendungsgebiet",
            "awg", "indication",
        ])

        return {
            "decision_id": decision_id,
            "procedure_id": procedure_id,
            "substances": substances,
            "trade_names": trade_names,
            "indication": indication,
            "decision_date": decision_date,
        }

    def _parse_patient_group(self, pg_elem: ET.Element) -> dict:
        """Extract patient-group-level benefit data."""
        data = self._extract_benefit_from_element(pg_elem)

        pg_id = self._get_text(pg_elem, [
            "ID_PAT_GR", "Id_Pat_Gr", "PATGR_ID",
        ])
        pg_desc = self._get_text(pg_elem, [
            "BEZ_PAT_GR", "Bez_Pat_Gr", "BEZEICHNUNG",
            "PAT_GR_TEXT", "Pat_Gr_Text", "description",
        ])
        data["patient_group"] = pg_desc or pg_id

        # Comparator therapy (zVT / VGL_TH)
        comparator = self._get_text(pg_elem, [
            "VGL_TH", "Vgl_Th", "ZVT", "zVT", "VERGLEICHSTHERAPIE",
        ])
        if not comparator:
            vgl_containers = self._find_elements(pg_elem, [
                "VGL_TH", "Vgl_Th", ".//VGL_TH",
            ])
            for vgl in vgl_containers:
                text = self._get_text(vgl, [
                    "NAME_VGL_TH", "Name_Vgl_Th", "WS_INFO", "name",
                ])
                if text:
                    comparator = text
                    break
                elif vgl.text and vgl.text.strip():
                    comparator = vgl.text.strip()
                    break
        data["comparator"] = comparator

        return data

    def _extract_benefit_from_element(self, elem: ET.Element) -> dict:
        """Extract benefit rating and evidence level from an element."""
        benefit = self._get_text(elem, [
            "ZN_W", "Zn_W", "ZUSATZNUTZEN", "Zusatznutzen",
            "AUSMASS", "Ausmass", "zn_w",
        ])
        evidence = self._get_text(elem, [
            "AUSSAGESICHERHEIT", "Aussagesicherheit",
            "aussagesicherheit", "WAHRSCHEINLICHKEIT",
        ])
        return {
            "benefit_rating": benefit,
            "evidence_level": evidence,
            "comparator": "",
            "patient_group": "",
        }

    # ── XML utility helpers ───────────────────────────────────────────

    def _find_elements(self, parent: ET.Element, tag_names: list[str]) -> list[ET.Element]:
        """Find child elements trying multiple possible tag names."""
        for tag in tag_names:
            if tag.startswith("."):
                found = parent.findall(tag)
            else:
                found = list(parent.iter(tag))
                # Also try as direct children
                if not found:
                    found = [c for c in parent if c.tag == tag]
            if found:
                return found
        return []

    def _get_text(self, parent: ET.Element, tag_names: list[str]) -> str:
        """Get text content from the first matching child element."""
        for tag in tag_names:
            el = parent.find(tag)
            if el is not None and el.text:
                return el.text.strip()
            # Search anywhere in the subtree (handles varying nesting)
            el = parent.find(".//" + tag)
            if el is not None and el.text:
                return el.text.strip()
        # Also check attributes
        for tag in tag_names:
            val = parent.get(tag)
            if val:
                return val.strip()
        return ""

    def _normalize_date(self, raw: str) -> str:
        """Normalize various date formats to YYYY-MM-DD."""
        raw = raw.strip()
        if not raw:
            return ""
        # Already YYYY-MM-DD
        if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
            return raw
        # YYYYMMDD
        if re.match(r"^\d{8}$", raw):
            return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
        # DD.MM.YYYY (German format)
        m = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", raw)
        if m:
            return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        return raw

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._decisions = payload["data"]
        self._loaded = bool(self._decisions)
        if self._loaded:
            logger.info(
                "%s loaded %d decisions from %s",
                self.agency_abbreviation, len(self._decisions), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._write_json_file(data_file, self._make_envelope(self._decisions))
        logger.info(
            "%s saved %d decisions to %s",
            self.agency_abbreviation, len(self._decisions), data_file,
        )
