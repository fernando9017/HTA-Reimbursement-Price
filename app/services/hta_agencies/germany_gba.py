"""Germany G-BA (Gemeinsamer Bundesausschuss) adapter.

Data sources:
1. G-BA AIS (Arztinformationssystem) XML file — contains all AMNOG early
   benefit assessment decisions with detailed patient-group-level data
   (Zusatznutzen, evidence levels, comparator therapies).
2. G-BA Nutzenbewertung listing pages — HTML listing of all assessment
   procedures with correct procedure URLs and drug/indication metadata.

The adapter tries both sources and merges the data: AIS XML provides detailed
benefit/evidence data, while listing pages provide correct procedure URLs.

The AIS XML file is published as a complete delivery on the 1st and 15th of
each month.  No authentication required for the XML, but a permanent download
URL can be requested from ais@g-ba.de.
"""

import logging
import re
import xml.etree.ElementTree as ET

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

# G-BA Nutzenbewertung listing page URL
GBA_LISTING_URL = "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/"
GBA_LISTING_MAX_PAGES = 50


class GermanyGBA(HTAAgency):
    """G-BA (Gemeinsamer Bundesausschuss) — Germany's HTA agency."""

    def __init__(self) -> None:
        # List of parsed decision dicts (from AIS XML)
        self._decisions: list[dict] = []
        # List of procedure entries from listing pages
        self._listing_entries: list[dict] = []
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
        """Fetch and parse G-BA data from multiple sources."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            # Source 1: Try AIS XML for detailed benefit assessment data
            await self._try_load_ais_xml(client)

            # Source 2: Try listing pages for procedure URLs and basic metadata
            await self._try_load_listing_pages(client)

        # Enrich AIS decisions with listing page URLs where possible
        self._enrich_decisions_with_listing_urls()

        self._loaded = True
        logger.info(
            "Germany G-BA data loaded: %d decision entries, %d listing entries",
            len(self._decisions), len(self._listing_entries),
        )

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find G-BA benefit assessments matching the given active substance."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results = []

        # Search through AIS XML decisions (detailed data with benefit ratings)
        for dec in self._decisions:
            if self._matches_decision(dec, substance_lower, product_lower):
                results.append(self._decision_to_result(dec, active_substance))

        # If no AIS XML results, search through listing entries as fallback
        if not results:
            for entry in self._listing_entries:
                if self._matches_listing_entry(entry, substance_lower, product_lower):
                    results.append(self._listing_entry_to_result(entry, active_substance))

        # Sort most recent first
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading: AIS XML ─────────────────────────────────────────

    async def _try_load_ais_xml(self, client: httpx.AsyncClient) -> None:
        """Try to load and parse the G-BA AIS XML file. Non-fatal on failure."""
        try:
            xml_urls = await self._find_xml_urls(client)
            xml_content = None
            for url in xml_urls:
                try:
                    logger.info("Trying G-BA AIS XML from %s", url)
                    response = await client.get(url)
                    response.raise_for_status()
                    xml_content = response.content
                    break
                except httpx.HTTPStatusError as exc:
                    logger.warning("G-BA XML URL returned %s: %s", exc.response.status_code, url)
                except httpx.HTTPError as exc:
                    logger.warning("G-BA XML URL failed: %s — %s", url, exc)

            if xml_content is not None:
                self._decisions = self._parse_xml(xml_content)
                logger.info("G-BA AIS XML parsed: %d decisions", len(self._decisions))
            else:
                logger.warning(
                    "Could not fetch G-BA AIS XML from any known URL. "
                    "Will use listing page data as fallback."
                )
        except Exception:
            logger.exception("Error loading G-BA AIS XML")

    async def _find_xml_urls(self, client: httpx.AsyncClient) -> list[str]:
        """Build a list of candidate XML download URLs to try."""
        urls: list[str] = []

        # Try to scrape the current XML link from the AIS page
        try:
            response = await client.get(GBA_AIS_PAGE_URL)
            response.raise_for_status()
            html = response.text
            # Look for .xml download link in the page
            for match in re.finditer(r'href="([^"]*\.xml[^"]*)"', html, re.IGNORECASE):
                url = match.group(1)
                if not url.startswith("http"):
                    url = "https://www.g-ba.de" + url
                urls.append(url)
        except Exception:
            logger.warning("Could not fetch AIS page to find XML URL, will try fallbacks")

        # Fallback: known and guessed download path patterns
        urls.extend([
            "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/downloads/83-691-836/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info_aktuell.xml",
        ])

        # De-duplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                unique.append(u)
        return unique

    # ── Data loading: Listing pages ───────────────────────────────────

    async def _try_load_listing_pages(self, client: httpx.AsyncClient) -> None:
        """Try to scrape G-BA Nutzenbewertung listing pages for procedure URLs."""
        try:
            all_entries: list[dict] = []
            for page in range(1, GBA_LISTING_MAX_PAGES + 1):
                params = {"page": str(page)} if page > 1 else {}
                try:
                    resp = await client.get(GBA_LISTING_URL, params=params)
                    resp.raise_for_status()
                    html = resp.text
                except Exception:
                    logger.debug("G-BA listing page %d fetch failed, stopping", page)
                    break

                entries = self._parse_listing_page(html)
                if not entries:
                    break

                all_entries.extend(entries)
                logger.debug("G-BA listing page %d: %d entries", page, len(entries))

            self._listing_entries = all_entries
            if all_entries:
                logger.info("G-BA listing pages parsed: %d entries", len(all_entries))
        except Exception:
            logger.exception("Error loading G-BA listing pages")

    def _parse_listing_page(self, html: str) -> list[dict]:
        """Parse a G-BA Nutzenbewertung listing page HTML.

        Entries typically look like:
          <a href="/bewertungsverfahren/nutzenbewertung/1133/">
            Wirkstoff: Enfortumab Vedotin (Neues Anwendungsgebiet: ...)
          </a>
        """
        entries: list[dict] = []
        seen_ids: set[str] = set()

        # Pattern: links to /bewertungsverfahren/nutzenbewertung/NNN/
        pattern = re.compile(
            r'href="(/bewertungsverfahren/nutzenbewertung/(\d+)/[^"]*)"[^>]*>\s*(.*?)\s*</a>',
            re.IGNORECASE | re.DOTALL,
        )
        for match in pattern.finditer(html):
            path = match.group(1)
            proc_id = match.group(2)
            title_raw = match.group(3)

            if proc_id in seen_ids:
                continue
            seen_ids.add(proc_id)

            title = _clean_html_text(title_raw)
            if not title or len(title) < 5:
                continue

            url = "https://www.g-ba.de" + path

            # Try to extract substance from title
            # Titles are often: "Wirkstoff: Substance (Indication...)"
            substance = ""
            sub_match = re.search(r'(?:Wirkstoff:\s*)?([^(]+)', title)
            if sub_match:
                substance = sub_match.group(1).strip().rstrip(' -\u2013')

            # Try to extract date from nearby context
            date = self._extract_date_near_listing(html, path)

            entries.append({
                "procedure_id": proc_id,
                "title": title,
                "url": url,
                "substance": substance,
                "date": date,
            })

        return entries

    def _extract_date_near_listing(self, html: str, path: str) -> str:
        """Try to find a date near a listing entry."""
        escaped = re.escape(path)
        match = re.search(escaped, html)
        if match:
            context = html[match.end():match.end() + 500]
            # DD.MM.YYYY (German date format)
            date_match = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', context)
            if date_match:
                return f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"
            # YYYY-MM-DD
            iso_match = re.search(r'(\d{4}-\d{2}-\d{2})', context)
            if iso_match:
                return iso_match.group(1)
        return ""

    # ── Data enrichment ───────────────────────────────────────────────

    def _enrich_decisions_with_listing_urls(self) -> None:
        """Match AIS XML decisions to listing page entries to get correct URLs."""
        if not self._listing_entries:
            return

        for dec in self._decisions:
            if dec.get("assessment_url"):
                continue  # Already has a URL

            # Try to match by substance name or trade name
            for entry in self._listing_entries:
                entry_title_lower = entry.get("title", "").lower()
                entry_substance_lower = entry.get("substance", "").lower()

                matched = False
                for ws in dec.get("substances", []):
                    ws_lower = ws.lower()
                    if ws_lower in entry_title_lower or ws_lower in entry_substance_lower:
                        matched = True
                        break

                if not matched:
                    for hn in dec.get("trade_names", []):
                        if hn.lower() in entry_title_lower:
                            matched = True
                            break

                if matched:
                    dec["assessment_url"] = entry.get("url", "")
                    break

    # ── Matching helpers ──────────────────────────────────────────────

    def _matches_decision(self, dec: dict, substance_lower: str, product_lower: str) -> bool:
        """Check if an AIS XML decision matches the search criteria."""
        for ws in dec.get("substances", []):
            if substance_lower in ws.lower() or ws.lower() in substance_lower:
                return True

        if product_lower:
            for hn in dec.get("trade_names", []):
                if product_lower in hn.lower() or hn.lower() in product_lower:
                    return True

        return False

    def _matches_listing_entry(self, entry: dict, substance_lower: str, product_lower: str) -> bool:
        """Check if a listing page entry matches the search criteria."""
        title_lower = entry.get("title", "").lower()
        substance = entry.get("substance", "").lower()

        if substance_lower in title_lower or substance_lower in substance:
            return True
        if product_lower and product_lower in title_lower:
            return True
        return False

    # ── Result builders ───────────────────────────────────────────────

    def _decision_to_result(self, dec: dict, active_substance: str) -> AssessmentResult:
        """Convert an AIS XML decision dict to an AssessmentResult."""
        raw_benefit = dec.get("benefit_rating", "")
        benefit_desc = BENEFIT_TRANSLATIONS.get(raw_benefit, raw_benefit)

        raw_evidence = dec.get("evidence_level", "")
        evidence_desc = EVIDENCE_TRANSLATIONS.get(raw_evidence, raw_evidence)

        trade_name = ", ".join(dec.get("trade_names", [])) or active_substance

        # Use enriched URL, or fall back to main listing page
        assessment_url = dec.get("assessment_url", "") or GBA_ASSESSMENT_BASE_URL

        return AssessmentResult(
            product_name=trade_name,
            dossier_code=dec.get("decision_id", ""),
            evaluation_reason=dec.get("indication", ""),
            opinion_date=dec.get("decision_date", ""),
            assessment_url=assessment_url,
            benefit_rating=raw_benefit,
            benefit_rating_description=benefit_desc,
            evidence_level=evidence_desc,
            comparator=dec.get("comparator", ""),
            patient_group=dec.get("patient_group", ""),
        )

    def _listing_entry_to_result(self, entry: dict, active_substance: str) -> AssessmentResult:
        """Convert a listing page entry dict to an AssessmentResult."""
        return AssessmentResult(
            product_name=entry.get("substance", "") or active_substance,
            evaluation_reason=entry.get("title", ""),
            opinion_date=entry.get("date", ""),
            assessment_url=entry.get("url", ""),
            benefit_rating="",
            benefit_rating_description="See assessment page for details",
            evidence_level="",
            comparator="",
            patient_group="",
        )

    # ── XML parsing ───────────────────────────────────────────────────

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
        indication = ""
        decision_date = ""

        # Decision ID (ID_BE_AKZ)
        decision_id = self._get_text(elem, [
            "ID_BE_AKZ", "id_be_akz", "AKZ", "akz",
        ])

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
            "substances": substances,
            "trade_names": trade_names,
            "indication": indication,
            "decision_date": decision_date,
            "assessment_url": "",  # Will be enriched from listing data
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
            # Try with namespace wildcard
            el = parent.find(f".//{{{' '}*}}{tag}")
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


def _clean_html_text(text: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&#\d+;", "", text)
    text = re.sub(r"&\w+;", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()
