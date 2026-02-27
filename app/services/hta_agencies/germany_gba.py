"""Germany G-BA (Gemeinsamer Bundesausschuss) adapter.

Data source: G-BA AIS (Arztinformationssystem) XML file containing all
AMNOG early benefit assessment decisions (Nutzenbewertung).

The XML file is published as a complete delivery on the 1st and 15th of
each month.  It contains decisions structured per patient group, with
benefit ratings (Zusatznutzen), evidence levels, and comparator therapies.

No authentication required.  A permanent download URL can be requested
from ais@g-ba.de.

AIS XML structure (real format as of 2026):
  <BE_COLLECTION generated="...">
    <BE>
      <ID_BE_AKZ value="2020-01-15-D-500"/>
      <ZUL>
        <NAME_HN value="Keytruda"/>
        <AWG>indication text (HTML)</AWG>
      </ZUL>
      <URL value="https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/500/"/>
      <PAT_GR_INFO_COLLECTION>
        <ID_PAT_GR value="1">
          <WS_BEW><NAME_WS_BEW value="Pembrolizumab"/></WS_BEW>
          <DATUM_BE_VOM value="2020-06-18"/>
          <NAME_PAT_GR>patient group (HTML)</NAME_PAT_GR>
          <ZN_W value="beträchtlich"/>
          <ZN_A value="Hinweis"/>
          <ZVT_BEST><NAME_ZVT_BEST value="Ipilimumab"/></ZVT_BEST>
        </ID_PAT_GR>
      </PAT_GR_INFO_COLLECTION>
    </BE>
  </BE_COLLECTION>

Most values are in "value" attributes rather than text content.
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
# These cover all values found in the real G-BA AIS XML (1658 decisions).
BENEFIT_TRANSLATIONS = {
    # Standard AMNOG benefit tiers (§35a SGB V)
    "erheblich": "Major added benefit (erheblich)",
    "beträchtlich": "Considerable added benefit (beträchtlich)",
    "gering": "Minor added benefit (gering)",
    "nicht quantifizierbar": "Non-quantifiable added benefit (nicht quantifizierbar)",
    "kein Zusatznutzen": "No added benefit (kein Zusatznutzen)",
    "geringerer Nutzen": "Lesser benefit (geringerer Nutzen)",
    # Common in real data: benefit "not proven" (evidence insufficient)
    "ist nicht belegt": "Added benefit not proven (ist nicht belegt)",
    # Orphan drugs: benefit "deemed proven" per §35a(1) sentence 11 SGB V
    "gilt als belegt": "Added benefit deemed proven — orphan drug (gilt als belegt)",
    # Orphan drugs exceeding €50M: benefit considered not proven
    "gilt als nicht belegt": "Added benefit considered not proven (gilt als nicht belegt)",
    # Non-quantifiable with reason (long variants in real data)
    "nicht quantifizierbar, weil die wissenschaftliche Datengrundlage dies nicht zulässt":
        "Non-quantifiable — insufficient scientific data (nicht quantifizierbar)",
    "nicht quantifizierbar, weil die erforderlichen Nachweise nicht vollständig sind":
        "Non-quantifiable — required evidence incomplete (nicht quantifizierbar)",
}

# Evidence certainty levels → English translations
EVIDENCE_TRANSLATIONS = {
    "Beleg": "Proof (Beleg)",
    "Hinweis": "Indication (Hinweis)",
    "Anhaltspunkt": "Hint (Anhaltspunkt)",
}

# Benefit ratings that never have evidence levels (by AMNOG design)
_NO_EVIDENCE_EXPECTED = {
    "ist nicht belegt",
    "gilt als belegt",
    "gilt als nicht belegt",
}

# Maximum length for comparator text before truncation in summary
_COMPARATOR_SUMMARY_MAX = 120


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
                    data = response.content
                    # Skip PDFs and other non-XML responses
                    if data.lstrip()[:5] == b"%PDF-":
                        logger.warning("G-BA URL returned PDF, skipping: %s", url)
                        continue
                    xml_content = data
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
        self._apply_translations()
        logger.info("Germany G-BA data loaded: %d decision entries", len(self._decisions))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find G-BA benefit assessments matching the given active substance.

        Matches against substance names, trade names, **and** the indication
        text (AWG) to catch cases where a drug name appears only in the
        indication description.  The active_substance query is checked
        against both INN substances *and* trade names so that users can
        search by either (e.g. "deucravacitinib" or "Sotyktu").
        """
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results = []
        for dec in self._decisions:
            substance_match = False
            product_match = False

            # Match active substance against INN substance names
            for ws in dec.get("substances", []):
                if substance_lower in ws.lower() or ws.lower() in substance_lower:
                    substance_match = True
                    break

            # Also match active_substance query against trade names — users
            # often search by brand name (e.g. "Sotyktu" not "deucravacitinib")
            if not substance_match:
                for hn in dec.get("trade_names", []):
                    if substance_lower in hn.lower() or hn.lower() in substance_lower:
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

            # Build the assessment URL — prefer direct URL from XML
            assessment_url = dec.get("url", "")
            if not assessment_url:
                procedure_id = dec.get("procedure_id", "")
                if procedure_id:
                    assessment_url = GBA_ASSESSMENT_BASE_URL + procedure_id + "/"

            # Translate benefit rating — try exact match, then prefix match
            # for long variants like "nicht quantifizierbar, weil..."
            raw_benefit = dec.get("benefit_rating", "")
            benefit_desc = BENEFIT_TRANSLATIONS.get(raw_benefit, "")
            if not benefit_desc:
                for key, val in BENEFIT_TRANSLATIONS.items():
                    if raw_benefit.startswith(key):
                        benefit_desc = val
                        break
                if not benefit_desc:
                    benefit_desc = raw_benefit

            # Translate evidence level
            raw_evidence = dec.get("evidence_level", "")
            evidence_desc = EVIDENCE_TRANSLATIONS.get(raw_evidence, raw_evidence)

            # For benefit types where evidence is structurally absent (orphan
            # drugs, "not proven"), provide contextual explanation instead of
            # leaving the field blank.
            if not evidence_desc and raw_benefit in _NO_EVIDENCE_EXPECTED:
                if raw_benefit == "gilt als belegt":
                    evidence_desc = "Orphan drug — §35a(1) s.11 SGB V"
                elif raw_benefit == "ist nicht belegt":
                    evidence_desc = "Insufficient evidence submitted"
                elif raw_benefit == "gilt als nicht belegt":
                    evidence_desc = "Orphan drug (>€50M) — benefit not confirmed"

            trade_name = ", ".join(dec.get("trade_names", [])) or active_substance

            # Use English translations where available, fallback to German
            patient_group = (
                dec.get("patient_group_en")
                or dec.get("patient_group", "")
            )
            comparator_val = (
                dec.get("comparator_en")
                or dec.get("comparator", "")
            )

            # Truncate very long comparator text for the summary
            comparator_summary = comparator_val
            if len(comparator_summary) > _COMPARATOR_SUMMARY_MAX:
                comparator_summary = comparator_summary[:_COMPARATOR_SUMMARY_MAX].rsplit(" ", 1)[0] + "…"

            # Build concise English summary
            summary_parts: list[str] = []
            if patient_group:
                # Truncate for summary too — patient groups can be lengthy
                pg_summary = patient_group
                if len(pg_summary) > 200:
                    pg_summary = pg_summary[:200].rsplit(" ", 1)[0] + "…"
                summary_parts.append(f"Population: {pg_summary}")
            if benefit_desc:
                summary_parts.append(f"Added benefit: {benefit_desc}")
            if evidence_desc:
                summary_parts.append(f"Evidence: {evidence_desc}")
            if comparator_summary:
                summary_parts.append(f"vs. {comparator_summary}")
            summary_en = " | ".join(summary_parts)

            # Use English indication translation if available
            indication_text = (
                dec.get("indication_en")
                or self._strip_html(dec.get("indication", ""))
            )

            results.append(
                AssessmentResult(
                    product_name=trade_name,
                    dossier_code=dec.get("decision_id", ""),
                    evaluation_reason=indication_text,
                    opinion_date=dec.get("decision_date", ""),
                    assessment_url=assessment_url,
                    benefit_rating=raw_benefit,
                    benefit_rating_description=benefit_desc,
                    evidence_level=evidence_desc,
                    comparator=comparator_summary,
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

        ais_page_urls = [
            GBA_AIS_PAGE_URL,
            "https://ais.g-ba.de/",
            "https://www.g-ba.de/themen/arzneimittel/arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/ais/",
        ]
        for ais_page_url in ais_page_urls:
            try:
                response = await client.get(ais_page_url)
                response.raise_for_status()
                html = response.text
                for match in re.finditer(
                    r"""(?:href|src|data-href|data-url)=['"]((?:[^'"]*/)"""
                    r"""G-BA_Beschluss_Info[^'"]*\.(?:xml|zip))['"]""",
                    html,
                    re.IGNORECASE,
                ):
                    url = match.group(1)
                    if not url.startswith("http"):
                        url = "https://www.g-ba.de" + (
                            url if url.startswith("/") else "/" + url
                        )
                    urls.append(url)

                if not urls:
                    for match in re.finditer(
                        r"""href=['"](/[^'"]*Beschluss[^'"]*\.xml)['"]""",
                        html,
                        re.IGNORECASE,
                    ):
                        urls.append("https://www.g-ba.de" + match.group(1))

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

        urls.extend([
            "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/downloads/ais-dateien/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/fileadmin/downloads/ais/G-BA_Beschluss_Info.xml",
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

        Handles both the real AIS format (BE_COLLECTION > BE > ZUL +
        PAT_GR_INFO_COLLECTION > ID_PAT_GR) and legacy test XML formats.

        Each patient group within a decision gets its own entry because
        benefit ratings can differ per patient group for the same drug.
        """
        decisions: list[dict] = []
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError:
            logger.exception("Failed to parse G-BA XML")
            return decisions

        # Find decision elements: BE (real AIS) or Beschluss (legacy)
        decision_elems = self._find_elements(root, [
            "BE", "Beschluss", "BESCHLUSS",
        ])
        if not decision_elems:
            decision_elems = list(root)

        for elem in decision_elems:
            base = self._parse_decision_base(elem)

            # Find patient groups
            patient_groups: list[ET.Element] = []

            # Real AIS format: PAT_GR_INFO_COLLECTION > ID_PAT_GR
            collection = elem.find("PAT_GR_INFO_COLLECTION")
            if collection is not None:
                patient_groups = [c for c in collection if c.tag == "ID_PAT_GR"]

            # Legacy format: direct PAT_GR children
            if not patient_groups:
                patient_groups = self._find_elements(elem, [
                    "PAT_GR", ".//PAT_GR",
                ])

            if patient_groups:
                for pg in patient_groups:
                    entry = dict(base)
                    pg_data = self._parse_patient_group(pg)
                    # Merge: non-empty patient group values override base
                    for k, v in pg_data.items():
                        if v or k not in entry:
                            entry[k] = v
                    decisions.append(entry)
            else:
                entry = dict(base)
                entry.update(self._extract_benefit_from_element(elem))
                decisions.append(entry)

        return decisions

    def _parse_decision_base(self, elem: ET.Element) -> dict:
        """Extract top-level decision metadata from a BE element."""
        # Decision ID
        decision_id = self._get_text(elem, ["ID_BE_AKZ"])

        # Extract procedure number from decision ID for URL construction
        procedure_id = ""
        if decision_id:
            num_match = re.search(r"-[Dd]-(\d+)\s*$", decision_id)
            if not num_match:
                num_match = re.search(r"(\d+)\s*$", decision_id)
            if num_match:
                procedure_id = num_match.group(1)

        # Direct assessment URL from XML
        url = self._get_text(elem, ["URL"])

        # Trade names: in ZUL > NAME_HN (real) or HN > NAME_HN (legacy)
        trade_names: list[str] = []
        zul = elem.find("ZUL")
        if zul is not None:
            hn_name = self._get_text(zul, ["NAME_HN"])
            if hn_name:
                trade_names.append(hn_name)

        # Legacy format fallback: <HN><NAME_HN>text</NAME_HN></HN>
        if not trade_names:
            for hn in self._find_elements(elem, ["HN"]):
                name = self._get_text(hn, ["NAME_HN"])
                if name:
                    trade_names.append(name)
                elif hn.text and hn.text.strip():
                    trade_names.append(hn.text.strip())
        if not trade_names:
            hn_text = self._get_text(elem, ["NAME_HN", "HANDELSNAME"])
            if hn_text:
                trade_names.append(hn_text)

        # Indication: ZUL > AWG (real, text content) or direct AWG (legacy)
        indication = ""
        if zul is not None:
            indication = self._get_text(zul, ["AWG"])
        if not indication:
            indication = self._get_text(elem, ["AWG", "ANWENDUNGSGEBIET"])

        # Substances: may be at decision level (legacy) or patient-group level (real)
        substances: list[str] = []
        for ws in self._find_elements(elem, ["WS_BEW"]):
            # Legacy: <WS_BEW><NAME_WS>text</NAME_WS></WS_BEW>
            name = self._get_text(ws, ["NAME_WS"])
            if name:
                substances.append(name)

        # Decision date at base level (legacy format)
        decision_date = self._get_text(elem, ["DAT_BESCHLUSS"])
        decision_date = self._normalize_date(decision_date)

        return {
            "decision_id": decision_id,
            "procedure_id": procedure_id,
            "url": url,
            "trade_names": trade_names,
            "indication": indication,
            "substances": substances,
            "decision_date": decision_date,
        }

    def _parse_patient_group(self, pg_elem: ET.Element) -> dict:
        """Extract patient-group-level data from an ID_PAT_GR or PAT_GR element."""
        # Substance: WS_BEW > NAME_WS_BEW (real) or NAME_WS (legacy)
        substances: list[str] = []
        ws_bew = pg_elem.find("WS_BEW")
        if ws_bew is not None:
            name = self._get_text(ws_bew, ["NAME_WS_BEW", "NAME_WS"])
            if name:
                substances.append(name)
        # Combination substance
        ws_komb = pg_elem.find("WS_KOMB")
        if ws_komb is not None:
            name = self._get_text(ws_komb, ["NAME_WS_KOMB"])
            if name:
                substances.append(name)

        # Decision date: DATUM_BE_VOM (real, value attr) or DAT_BESCHLUSS (legacy)
        decision_date = self._get_text(pg_elem, ["DATUM_BE_VOM", "DAT_BESCHLUSS"])
        decision_date = self._normalize_date(decision_date)

        # Patient group description
        patient_group = self._get_text(pg_elem, [
            "NAME_PAT_GR", "BEZ_PAT_GR", "PAT_GR_TEXT",
        ])
        patient_group = self._strip_html(patient_group)
        # Fallback to the patient group ID
        if not patient_group:
            patient_group = self._get_text(pg_elem, ["ID_PAT_GR"])

        # ── Benefit extent & evidence certainty ──
        # Two XML formats exist:
        #   Real AIS: ZN_A = benefit (Ausmaß), ZN_W = evidence (Wahrscheinlichkeit)
        #   Legacy:   ZN_W = benefit,           AUSSAGESICHERHEIT = evidence
        #
        # Strategy: Read ZN_A first for benefit. Then classify ZN_W by its
        # content — evidence values go to evidence, anything else to benefit.
        _EVIDENCE_VALUES = {"Beleg", "Hinweis", "Anhaltspunkt"}

        benefit = self._get_text(pg_elem, ["ZN_A"])
        evidence = self._get_text(pg_elem, ["AUSSAGESICHERHEIT"])

        zn_w = self._get_text(pg_elem, ["ZN_W"])
        if zn_w:
            if zn_w in _EVIDENCE_VALUES:
                # ZN_W contains evidence level (real AIS format)
                if not evidence:
                    evidence = zn_w
            else:
                # ZN_W contains benefit rating (legacy format)
                if not benefit:
                    benefit = zn_w

        # Final fallback for benefit from ZUSATZNUTZEN tag
        if not benefit:
            benefit = self._get_text(pg_elem, ["ZUSATZNUTZEN"])

        # Comparator therapy
        comparator = ""
        # Real format: ZVT_BEST > NAME_ZVT_BEST (value attr)
        zvt_best = pg_elem.find("ZVT_BEST")
        if zvt_best is not None:
            comparator = self._get_text(zvt_best, ["NAME_ZVT_BEST"])
        # Also try ZVT_ZN > NAME_ZVT_ZN
        if not comparator:
            zvt_zn = pg_elem.find("ZVT_ZN")
            if zvt_zn is not None:
                comparator = self._get_text(zvt_zn, ["NAME_ZVT_ZN"])
        # Legacy format: VGL_TH > NAME_VGL_TH (text content)
        if not comparator:
            for vgl in self._find_elements(pg_elem, ["VGL_TH"]):
                text = self._get_text(vgl, ["NAME_VGL_TH", "WS_INFO"])
                if text:
                    comparator = text
                    break
                elif vgl.text and vgl.text.strip():
                    comparator = vgl.text.strip()
                    break

        # Indication override at patient-group level
        indication = self._get_text(pg_elem, ["AWG_BESCHLUSS"])

        result: dict = {
            "patient_group": patient_group,
            "benefit_rating": benefit,
            "evidence_level": evidence,
            "comparator": comparator,
        }
        if substances:
            result["substances"] = substances
        if decision_date:
            result["decision_date"] = decision_date
        if indication:
            result["indication"] = indication

        return result

    def _extract_benefit_from_element(self, elem: ET.Element) -> dict:
        """Extract benefit rating and evidence level from an element."""
        benefit = self._get_text(elem, ["ZN_A", "ZN_W", "ZUSATZNUTZEN"])
        evidence = self._get_text(elem, ["AUSSAGESICHERHEIT"])
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
                if not found:
                    found = [c for c in parent if c.tag == tag]
            if found:
                return found
        return []

    def _get_text(self, parent: ET.Element, tag_names: list[str]) -> str:
        """Get text from the first matching child element.

        Checks the element's ``value`` attribute first (used by the real
        AIS XML format), then falls back to text content, then checks
        parent attributes as a last resort.
        """
        for tag in tag_names:
            el = parent.find(tag)
            if el is not None:
                val = el.get("value", "")
                if val:
                    return val.strip()
                if el.text and el.text.strip():
                    return el.text.strip()
            # Search anywhere in the subtree
            el = parent.find(".//" + tag)
            if el is not None:
                val = el.get("value", "")
                if val:
                    return val.strip()
                if el.text and el.text.strip():
                    return el.text.strip()
        # Check parent's own attributes as fallback
        for tag in tag_names:
            val = parent.get(tag)
            if val:
                return val.strip()
        return ""

    def _strip_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        if not text:
            return text
        return re.sub(r"<[^>]+>", "", text).strip()

    def _normalize_date(self, raw: str) -> str:
        """Normalize various date formats to YYYY-MM-DD."""
        raw = raw.strip()
        if not raw:
            return ""
        if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
            return raw
        if re.match(r"^\d{8}$", raw):
            return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
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
            # Apply translations for any fields that may be missing _en versions
            # (e.g. cache created before translator was updated with new entries)
            self._apply_translations()
            logger.info(
                "%s loaded %d decisions from %s",
                self.agency_abbreviation, len(self._decisions), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._apply_translations()
        self._write_json_file(data_file, self._make_envelope(self._decisions))
        logger.info(
            "%s saved %d decisions to %s",
            self.agency_abbreviation, len(self._decisions), data_file,
        )

    def _apply_translations(self) -> None:
        """Add English translations for German text fields using the offline translator."""
        try:
            from app.services.de_translator import translate_de_text
        except ImportError:
            logger.warning("de_translator not available, skipping translations")
            return

        for dec in self._decisions:
            if dec.get("indication") and not dec.get("indication_en"):
                dec["indication_en"] = translate_de_text(dec["indication"])
            if dec.get("patient_group") and not dec.get("patient_group_en"):
                dec["patient_group_en"] = translate_de_text(dec["patient_group"])
            if dec.get("comparator") and not dec.get("comparator_en"):
                dec["comparator_en"] = translate_de_text(dec["comparator"])
