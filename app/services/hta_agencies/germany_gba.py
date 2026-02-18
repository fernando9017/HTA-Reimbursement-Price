"""Germany G-BA (Gemeinsamer Bundesausschuss) adapter.

Data sources (in priority order):
1. Bundled seed dataset — curated JSON of real G-BA Nutzenbewertung decisions
   with correct procedure URLs (e.g. /nutzenbewertung/1133/ for Padcev+Keytruda).
   Always available, works offline.
2. G-BA AIS XML — detailed patient-group-level benefit assessment data.
   Downloaded from g-ba.de on startup when available.
3. G-BA Nutzenbewertung listing pages — HTML listing with procedure URLs.
   Scraped from g-ba.de on startup when available.

The seed dataset provides a baseline of important assessments. Live data from
sources 2 and 3 supplements the seed data with additional or updated entries.
"""

import json
import logging
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import httpx

from app.config import GBA_AIS_PAGE_URL, GBA_ASSESSMENT_BASE_URL, REQUEST_TIMEOUT
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Path to the bundled seed dataset
SEED_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "gba_seed_data.json"

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
        """Load G-BA data from seed file and optionally from live sources."""
        # Step 1: Always load bundled seed data (guaranteed to work)
        seed_decisions = self._load_seed_data()

        # Step 2: Try live sources for additional/updated data
        live_decisions: list[dict] = []
        listing_entries: list[dict] = []

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
            live_decisions = await self._try_load_ais_xml(client)
            listing_entries = await self._try_load_listing_pages(client)

        # Step 3: Enrich live AIS decisions with listing page URLs
        if listing_entries:
            _enrich_with_listing_urls(live_decisions, listing_entries)

        # Step 4: Merge seed + live, preferring entries with more data
        self._decisions = _merge_decisions(seed_decisions, live_decisions, listing_entries)
        self._loaded = True

        logger.info(
            "Germany G-BA data loaded: %d total entries (%d seed, %d live XML, %d listing)",
            len(self._decisions), len(seed_decisions),
            len(live_decisions), len(listing_entries),
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
        for dec in self._decisions:
            if _matches(dec, substance_lower, product_lower):
                results.append(_to_result(dec, active_substance))

        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Seed data loading ─────────────────────────────────────────────

    def _load_seed_data(self) -> list[dict]:
        """Load the bundled JSON seed dataset."""
        try:
            if SEED_DATA_PATH.exists():
                with open(SEED_DATA_PATH, encoding="utf-8") as f:
                    data = json.load(f)
                logger.info("G-BA seed data loaded: %d entries", len(data))
                return data
            else:
                logger.warning("G-BA seed data file not found at %s", SEED_DATA_PATH)
        except Exception:
            logger.exception("Error loading G-BA seed data")
        return []

    # ── Live AIS XML loading ──────────────────────────────────────────

    async def _try_load_ais_xml(self, client: httpx.AsyncClient) -> list[dict]:
        """Try to load and parse the G-BA AIS XML file. Returns [] on failure."""
        try:
            xml_urls = await self._find_xml_urls(client)
            for url in xml_urls:
                try:
                    logger.info("Trying G-BA AIS XML from %s", url)
                    response = await client.get(url)
                    response.raise_for_status()
                    decisions = self._parse_xml(response.content)
                    logger.info("G-BA AIS XML parsed: %d decisions", len(decisions))
                    return decisions
                except httpx.HTTPStatusError as exc:
                    logger.warning("G-BA XML %s: %s", exc.response.status_code, url)
                except httpx.HTTPError as exc:
                    logger.warning("G-BA XML failed: %s — %s", url, exc)
        except Exception:
            logger.warning("G-BA AIS XML loading failed (will use seed data)")
        return []

    async def _find_xml_urls(self, client: httpx.AsyncClient) -> list[str]:
        """Build a list of candidate XML download URLs to try."""
        urls: list[str] = []
        try:
            response = await client.get(GBA_AIS_PAGE_URL)
            response.raise_for_status()
            for match in re.finditer(r'href="([^"]*\.xml[^"]*)"', response.text, re.IGNORECASE):
                url = match.group(1)
                if not url.startswith("http"):
                    url = "https://www.g-ba.de" + url
                urls.append(url)
        except Exception:
            pass

        urls.extend([
            "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/downloads/83-691-836/G-BA_Beschluss_Info.xml",
            "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.xml",
        ])

        seen: set[str] = set()
        return [u for u in urls if u not in seen and not seen.add(u)]  # type: ignore[func-returns-value]

    # ── Live listing page loading ─────────────────────────────────────

    async def _try_load_listing_pages(self, client: httpx.AsyncClient) -> list[dict]:
        """Try to scrape G-BA Nutzenbewertung listing pages. Returns [] on failure."""
        try:
            all_entries: list[dict] = []
            for page in range(1, GBA_LISTING_MAX_PAGES + 1):
                params = {"page": str(page)} if page > 1 else {}
                try:
                    resp = await client.get(GBA_LISTING_URL, params=params)
                    resp.raise_for_status()
                except Exception:
                    break
                entries = _parse_listing_page(resp.text)
                if not entries:
                    break
                all_entries.extend(entries)

            if all_entries:
                logger.info("G-BA listing pages: %d entries", len(all_entries))
            return all_entries
        except Exception:
            logger.warning("G-BA listing page loading failed (will use seed data)")
        return []

    # ── XML parsing ───────────────────────────────────────────────────

    def _parse_xml(self, xml_content: bytes) -> list[dict]:
        """Parse the G-BA AIS XML into a list of decision dicts."""
        decisions = []
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError:
            logger.exception("Failed to parse G-BA XML")
            return decisions

        beschluesse = _find_elements(root, [
            "Beschluss", "BESCHLUSS", ".//Beschluss", ".//{*}Beschluss",
        ])
        if not beschluesse:
            beschluesse = list(root)

        for beschluss in beschluesse:
            base = _parse_beschluss_base(beschluss)
            patient_groups = _find_elements(beschluss, [
                "PAT_GR", "Pat_Gr", "PATGR", ".//PAT_GR", ".//{*}PAT_GR",
            ])
            if patient_groups:
                for pg in patient_groups:
                    entry = dict(base)
                    entry.update(_parse_patient_group(pg))
                    decisions.append(entry)
            else:
                entry = dict(base)
                entry.update(_extract_benefit(beschluss))
                decisions.append(entry)

        return decisions


# ══════════════════════════════════════════════════════════════════════
#  Module-level helpers
# ══════════════════════════════════════════════════════════════════════


def _matches(dec: dict, substance_lower: str, product_lower: str) -> bool:
    """Check if a decision matches the search criteria."""
    for ws in dec.get("substances", []):
        if substance_lower in ws.lower() or ws.lower() in substance_lower:
            return True
    if product_lower:
        for hn in dec.get("trade_names", []):
            if product_lower in hn.lower() or hn.lower() in product_lower:
                return True
    return False


def _to_result(dec: dict, active_substance: str) -> AssessmentResult:
    """Convert a decision dict to an AssessmentResult."""
    raw_benefit = dec.get("benefit_rating", "")
    benefit_desc = BENEFIT_TRANSLATIONS.get(raw_benefit, raw_benefit)

    raw_evidence = dec.get("evidence_level", "")
    evidence_desc = EVIDENCE_TRANSLATIONS.get(raw_evidence, raw_evidence)

    trade_name = ", ".join(dec.get("trade_names", [])) or active_substance
    assessment_url = dec.get("assessment_url", "") or GBA_ASSESSMENT_BASE_URL

    return AssessmentResult(
        product_name=trade_name,
        dossier_code=dec.get("decision_id", "") or dec.get("procedure_id", ""),
        evaluation_reason=dec.get("indication", ""),
        opinion_date=dec.get("decision_date", ""),
        assessment_url=assessment_url,
        benefit_rating=raw_benefit,
        benefit_rating_description=benefit_desc,
        evidence_level=evidence_desc,
        comparator=dec.get("comparator", ""),
        patient_group=dec.get("patient_group", ""),
    )


def _merge_decisions(
    seed: list[dict],
    live_xml: list[dict],
    listing: list[dict],
) -> list[dict]:
    """Merge seed data, live XML data, and listing entries.

    Seed data is used as the baseline. Live XML entries that don't overlap
    with seed data (by substance + indication keywords) are added.
    Listing entries that don't overlap with either are added as well.
    """
    merged = list(seed)

    def _key(dec: dict) -> str:
        subs = sorted(s.lower() for s in dec.get("substances", []))
        return "|".join(subs) + "|" + dec.get("decision_date", "")

    existing_keys = {_key(d) for d in merged}

    for dec in live_xml:
        k = _key(dec)
        if k not in existing_keys:
            merged.append(dec)
            existing_keys.add(k)

    for entry in listing:
        dec = {
            "substances": [entry.get("substance", "")] if entry.get("substance") else [],
            "trade_names": [],
            "indication": entry.get("title", ""),
            "decision_date": entry.get("date", ""),
            "assessment_url": entry.get("url", ""),
            "procedure_id": entry.get("procedure_id", ""),
            "benefit_rating": "",
            "evidence_level": "",
            "comparator": "",
            "patient_group": "",
        }
        k = _key(dec)
        if k not in existing_keys:
            merged.append(dec)
            existing_keys.add(k)

    return merged


def _enrich_with_listing_urls(decisions: list[dict], listing: list[dict]) -> None:
    """Add correct procedure URLs from listing data to XML decisions."""
    for dec in decisions:
        if dec.get("assessment_url"):
            continue
        for entry in listing:
            title_lower = entry.get("title", "").lower()
            sub_lower = entry.get("substance", "").lower()
            for ws in dec.get("substances", []):
                if ws.lower() in title_lower or ws.lower() in sub_lower:
                    dec["assessment_url"] = entry.get("url", "")
                    break
            if dec.get("assessment_url"):
                break


# ── Listing page parsing ──────────────────────────────────────────


def _parse_listing_page(html: str) -> list[dict]:
    """Parse a G-BA Nutzenbewertung listing page HTML."""
    entries: list[dict] = []
    seen_ids: set[str] = set()

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

        substance = ""
        sub_match = re.search(r'(?:Wirkstoff:\s*)?([^(]+)', title)
        if sub_match:
            substance = sub_match.group(1).strip().rstrip(' -\u2013')

        entries.append({
            "procedure_id": proc_id,
            "title": title,
            "url": "https://www.g-ba.de" + path,
            "substance": substance,
            "date": "",
        })

    return entries


# ── XML parsing helpers ───────────────────────────────────────────


def _find_elements(parent: ET.Element, tag_names: list[str]) -> list[ET.Element]:
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


def _get_text(parent: ET.Element, tag_names: list[str]) -> str:
    """Get text content from the first matching child element."""
    for tag in tag_names:
        el = parent.find(tag)
        if el is not None and el.text:
            return el.text.strip()
    for tag in tag_names:
        val = parent.get(tag)
        if val:
            return val.strip()
    return ""


def _normalize_date(raw: str) -> str:
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


def _parse_beschluss_base(elem: ET.Element) -> dict:
    """Extract top-level decision metadata from an XML element."""
    decision_id = _get_text(elem, ["ID_BE_AKZ", "id_be_akz", "AKZ"])
    decision_date = _normalize_date(_get_text(elem, [
        "DAT_BESCHLUSS", "Dat_Beschluss", "DATUM", "Beschluss_Datum",
    ]))

    substances = []
    for ws in _find_elements(elem, ["WS_BEW", "Ws_Bew", "WIRKSTOFF", ".//WS_BEW"]):
        name = _get_text(ws, ["NAME_WS", "Name_Ws", "BEZEICHNUNG", "name"])
        if name:
            substances.append(name)
    if not substances:
        ws_text = _get_text(elem, ["WIRKSTOFF", "Wirkstoff", "WS_BEW"])
        if ws_text:
            substances.append(ws_text)

    trade_names = []
    for hn in _find_elements(elem, ["HN", "Hn", "HANDELSNAME", ".//HN"]):
        name = _get_text(hn, ["NAME_HN", "Name_Hn", "name"])
        if name:
            trade_names.append(name)
        elif hn.text and hn.text.strip():
            trade_names.append(hn.text.strip())
    if not trade_names:
        hn_text = _get_text(elem, ["HANDELSNAME", "Handelsname"])
        if hn_text:
            trade_names.append(hn_text)

    indication = _get_text(elem, [
        "AWG", "Awg", "ANWENDUNGSGEBIET", "Anwendungsgebiet",
    ])

    return {
        "decision_id": decision_id,
        "substances": substances,
        "trade_names": trade_names,
        "indication": indication,
        "decision_date": decision_date,
        "assessment_url": "",
        "benefit_rating": "",
        "evidence_level": "",
        "comparator": "",
        "patient_group": "",
    }


def _parse_patient_group(pg_elem: ET.Element) -> dict:
    """Extract patient-group-level benefit data."""
    data = _extract_benefit(pg_elem)
    pg_desc = _get_text(pg_elem, [
        "BEZ_PAT_GR", "Bez_Pat_Gr", "BEZEICHNUNG", "PAT_GR_TEXT",
    ]) or _get_text(pg_elem, ["ID_PAT_GR", "Id_Pat_Gr"])
    data["patient_group"] = pg_desc

    comparator = _get_text(pg_elem, ["VGL_TH", "Vgl_Th", "ZVT", "VERGLEICHSTHERAPIE"])
    if not comparator:
        for vgl in _find_elements(pg_elem, ["VGL_TH", "Vgl_Th", ".//VGL_TH"]):
            text = _get_text(vgl, ["NAME_VGL_TH", "Name_Vgl_Th", "WS_INFO"])
            if text:
                comparator = text
                break
            elif vgl.text and vgl.text.strip():
                comparator = vgl.text.strip()
                break
    data["comparator"] = comparator
    return data


def _extract_benefit(elem: ET.Element) -> dict:
    """Extract benefit rating and evidence level from an element."""
    return {
        "benefit_rating": _get_text(elem, [
            "ZN_W", "Zn_W", "ZUSATZNUTZEN", "Zusatznutzen", "AUSMASS",
        ]),
        "evidence_level": _get_text(elem, [
            "AUSSAGESICHERHEIT", "Aussagesicherheit", "WAHRSCHEINLICHKEIT",
        ]),
        "comparator": "",
        "patient_group": "",
    }


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
