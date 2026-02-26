#!/usr/bin/env python3
"""Fetch the G-BA AIS XML and generate a cached DE.json file.

Run this script from a machine that can reach g-ba.de (residential/office
network — cloud servers are blocked).  It downloads the AIS XML, parses it,
and writes data/DE.json.

This script is SELF-CONTAINED — it does not import anything from the app
package, so it works with any Python 3.7+ installation (no pip install needed).

Usage:
    python3 scripts/fetch_gba_xml.py
    python3 scripts/fetch_gba_xml.py --xml-file ~/Downloads/G-BA_Beschluss_Info.xml

If automatic download fails, you can manually download the XML file:
  1. Open https://ais.g-ba.de/ in your browser
  2. Click the XML download link
  3. Run: python3 scripts/fetch_gba_xml.py --xml-file ~/Downloads/G-BA_Beschluss_Info.xml

The generated DE.json should be committed to the repository so the Render
deployment can load G-BA data from the file cache on startup.
"""

import gzip
import io
import json
import re
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_FILE = DATA_DIR / "DE.json"

# Pages to scrape for the real XML download link
AIS_PAGES = [
    "https://ais.g-ba.de/",
    "https://www.g-ba.de/themen/arzneimittel/"
    "arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/ais/",
]

# Direct download URLs to try (ordered by likelihood)
DIRECT_URLS = [
    "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.zip",
    "https://www.g-ba.de/downloads/ais-dateien/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/downloads/ais-dateien/G-BA_Beschluss_Info.zip",
    "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.zip",
    "https://www.g-ba.de/fileadmin/downloads/ais/G-BA_Beschluss_Info.xml",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
}


# ── XML Parsing (self-contained, matches germany_gba.py logic) ────────
#
# The real AIS XML structure (as of 2026) is:
#   <BE_COLLECTION generated="...">
#     <BE>
#       <ID_BE_AKZ value="2020-01-15-D-500"/>
#       <ZUL>
#         <NAME_HN value="Keytruda"/>
#         <AWG>indication text (HTML)</AWG>
#       </ZUL>
#       <URL value="https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/500/"/>
#       <PAT_GR_INFO_COLLECTION>
#         <ID_PAT_GR value="1">
#           <WS_BEW><NAME_WS_BEW value="Pembrolizumab"/></WS_BEW>
#           <DATUM_BE_VOM value="2020-06-18"/>
#           <NAME_PAT_GR>patient group (HTML)</NAME_PAT_GR>
#           <ZN_W value="beträchtlich"/>
#           <ZN_A value="Hinweis"/>
#           <ZVT_BEST><NAME_ZVT_BEST value="Ipilimumab"/></ZVT_BEST>
#         </ID_PAT_GR>
#       </PAT_GR_INFO_COLLECTION>
#     </BE>
#   </BE_COLLECTION>
#
# Most values are in "value" attributes rather than text content.


def find_elements(parent, tag_names):
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


def get_text(parent, tag_names):
    """Get text from the first matching child element.

    Checks the element's 'value' attribute first (used by the real
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
        el = parent.find(".//" + tag)
        if el is not None:
            val = el.get("value", "")
            if val:
                return val.strip()
            if el.text and el.text.strip():
                return el.text.strip()
    for tag in tag_names:
        val = parent.get(tag)
        if val:
            return val.strip()
    return ""


def strip_html(text):
    """Remove HTML tags from text."""
    if not text:
        return text
    return re.sub(r"<[^>]+>", "", text).strip()


def normalize_date(raw):
    """Normalize various date formats to YYYY-MM-DD."""
    raw = raw.strip()
    if not raw:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw
    if re.match(r"^\d{8}$", raw):
        return "%s-%s-%s" % (raw[:4], raw[4:6], raw[6:8])
    m = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", raw)
    if m:
        return "%s-%s-%s" % (m.group(3), m.group(2), m.group(1))
    return raw


def parse_decision_base(elem):
    """Extract top-level decision metadata from a BE element."""
    decision_id = get_text(elem, ["ID_BE_AKZ"])

    procedure_id = ""
    if decision_id:
        num_match = re.search(r"-[Dd]-(\d+)\s*$", decision_id)
        if not num_match:
            num_match = re.search(r"(\d+)\s*$", decision_id)
        if num_match:
            procedure_id = num_match.group(1)

    # Direct assessment URL from XML
    url = get_text(elem, ["URL"])

    # Trade name: ZUL > NAME_HN (value attr)
    trade_names = []
    zul = elem.find("ZUL")
    if zul is not None:
        hn_name = get_text(zul, ["NAME_HN"])
        if hn_name:
            trade_names.append(hn_name)

    # Indication: ZUL > AWG (text content with HTML)
    indication = ""
    if zul is not None:
        indication = get_text(zul, ["AWG"])
    if not indication:
        indication = get_text(elem, ["AWG", "ANWENDUNGSGEBIET"])

    # Decision date at base level (may be overridden per patient group)
    decision_date = get_text(elem, ["DAT_BESCHLUSS"])
    decision_date = normalize_date(decision_date)

    return {
        "decision_id": decision_id,
        "procedure_id": procedure_id,
        "url": url,
        "substances": [],
        "trade_names": trade_names,
        "indication": indication,
        "decision_date": decision_date,
    }


def parse_patient_group(pg_elem):
    """Extract patient-group-level data from an ID_PAT_GR element."""
    # Substance: WS_BEW > NAME_WS_BEW (value attr)
    substances = []
    ws_bew = pg_elem.find("WS_BEW")
    if ws_bew is not None:
        name = get_text(ws_bew, ["NAME_WS_BEW", "NAME_WS"])
        if name:
            substances.append(name)
    # Combination substance
    ws_komb = pg_elem.find("WS_KOMB")
    if ws_komb is not None:
        name = get_text(ws_komb, ["NAME_WS_KOMB"])
        if name:
            substances.append(name)

    # Decision date: DATUM_BE_VOM (value attr)
    decision_date = get_text(pg_elem, ["DATUM_BE_VOM", "DAT_BESCHLUSS"])
    decision_date = normalize_date(decision_date)

    # Patient group description (text content with HTML)
    patient_group = get_text(pg_elem, ["NAME_PAT_GR", "BEZ_PAT_GR"])
    patient_group = strip_html(patient_group)
    if not patient_group:
        patient_group = get_text(pg_elem, ["ID_PAT_GR"])

    # Benefit extent: ZN_A = Ausmaß (benefit rating in real AIS XML)
    benefit = get_text(pg_elem, ["ZN_A", "ZN_W", "ZUSATZNUTZEN"])

    # Evidence certainty: ZN_W = Wahrscheinlichkeit (only 527/1658 have it)
    evidence = get_text(pg_elem, ["AUSSAGESICHERHEIT"])
    if not evidence:
        zn_w = get_text(pg_elem, ["ZN_W"])
        if zn_w in ("Beleg", "Hinweis", "Anhaltspunkt"):
            evidence = zn_w

    # Comparator therapy
    comparator = ""
    zvt_best = pg_elem.find("ZVT_BEST")
    if zvt_best is not None:
        comparator = get_text(zvt_best, ["NAME_ZVT_BEST"])
    if not comparator:
        zvt_zn = pg_elem.find("ZVT_ZN")
        if zvt_zn is not None:
            comparator = get_text(zvt_zn, ["NAME_ZVT_ZN"])

    # Indication override at patient-group level
    indication = get_text(pg_elem, ["AWG_BESCHLUSS"])

    result = {
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


def parse_xml(xml_content):
    """Parse the G-BA AIS XML into a list of decision dicts."""
    decisions = []
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:
        print("ERROR: Failed to parse XML: %s" % exc)
        return decisions

    # Find decision elements: BE (real AIS) or Beschluss (legacy)
    decision_elems = find_elements(root, ["BE", "Beschluss", "BESCHLUSS"])
    if not decision_elems:
        decision_elems = list(root)

    for elem in decision_elems:
        base = parse_decision_base(elem)

        # Find patient groups
        patient_groups = []

        # Real AIS format: PAT_GR_INFO_COLLECTION > ID_PAT_GR
        collection = elem.find("PAT_GR_INFO_COLLECTION")
        if collection is not None:
            patient_groups = [c for c in collection if c.tag == "ID_PAT_GR"]

        if patient_groups:
            for pg in patient_groups:
                entry = dict(base)
                pg_data = parse_patient_group(pg)
                # Merge: non-empty patient group values override base
                for k, v in pg_data.items():
                    if v or k not in entry:
                        entry[k] = v
                decisions.append(entry)
        else:
            # No patient groups — single entry
            entry = dict(base)
            entry["benefit_rating"] = ""
            entry["evidence_level"] = ""
            entry["comparator"] = ""
            entry["patient_group"] = ""
            decisions.append(entry)

    return decisions


# ── Decompression / validation helpers ─────────────────────────────────


def is_valid_xml_data(data):
    """Check if data looks like XML (not PDF, HTML error page, etc.)."""
    stripped = data.lstrip()
    if stripped[:5] == b"%PDF-":
        return False
    if stripped[:5] in (b"<?xml", b"<G-BA", b"<g-ba", b"<Besc"):
        return True
    # Try to parse a small chunk to check
    try:
        ET.fromstring(data[:10000] + b"</root>")
        return True
    except ET.ParseError:
        pass
    return False


def extract_xml_from_data(data):
    """Detect if data is ZIP/GZIP compressed and extract the XML content.

    Returns the raw XML bytes, or None if the data is not valid XML.
    """
    # Check for ZIP magic bytes (PK\x03\x04)
    if data[:4] == b"PK\x03\x04":
        print("  -> Detected ZIP archive, extracting...")
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            names = zf.namelist()
            print("  -> ZIP contains: %s" % ", ".join(names))
            for name in names:
                if name.lower().endswith(".xml"):
                    xml_data = zf.read(name)
                    print("  -> Extracted %s (%s bytes)" % (name, "{:,}".format(len(xml_data))))
                    if is_valid_xml_data(xml_data):
                        return xml_data
            # Try first file as fallback
            if names:
                xml_data = zf.read(names[0])
                if is_valid_xml_data(xml_data):
                    return xml_data
        print("  -> ZIP did not contain valid XML")
        return None

    # Check for GZIP magic bytes (\x1f\x8b)
    if data[:2] == b"\x1f\x8b":
        print("  -> Detected GZIP, decompressing...")
        xml_data = gzip.decompress(data)
        print("  -> Decompressed to %s bytes" % "{:,}".format(len(xml_data)))
        if is_valid_xml_data(xml_data):
            return xml_data
        print("  -> Decompressed content is not valid XML")
        return None

    # Check for PDF
    if data.lstrip()[:5] == b"%PDF-":
        print("  -> Skipping: file is a PDF, not XML")
        return None

    # Check if it looks like XML
    if is_valid_xml_data(data):
        return data

    print("  -> WARNING: Unknown format. First 80 bytes: %s" % repr(data[:80]))
    return None


# ── Network fetching ───────────────────────────────────────────────────


def download_url(url, timeout=60):
    """Download a URL and return (data, content_type)."""
    req = urllib.request.Request(url, headers=HEADERS)
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
        data = resp.read()
        content_type = resp.headers.get("Content-Type", "")
        return data, content_type


def discover_xml_urls():
    """Scrape the G-BA AIS pages to find the current XML download URL."""
    discovered = []
    for page_url in AIS_PAGES:
        try:
            print("Scraping: %s" % page_url)
            data, _ = download_url(page_url, timeout=30)
            html = data.decode("utf-8", errors="replace")

            # Look for XML/ZIP download links
            patterns = [
                # Direct XML/ZIP file links
                r"""href=['"]((?:https?://[^'"]*|/[^'"]*?)"""
                r"""(?:Beschluss_Info|AIS)[^'"]*\.(?:xml|zip))['"]""",
                # Any download link with "ais" in the path
                r"""href=['"]((?:https?://[^'"]*|/[^'"]*?)"""
                r"""ais[^'"]*\.(?:xml|zip))['"]""",
                # Broader: any XML download link from g-ba.de
                r"""href=['"](/downloads/[^'"]*\.(?:xml|zip))['"]""",
            ]

            for pattern in patterns:
                for match in re.finditer(pattern, html, re.IGNORECASE):
                    url = match.group(1)
                    if not url.startswith("http"):
                        # Make relative URL absolute
                        if url.startswith("/"):
                            url = "https://www.g-ba.de" + url
                        else:
                            url = page_url.rstrip("/") + "/" + url
                    discovered.append(url)

            if discovered:
                print("  -> Found %d download link(s)" % len(discovered))
                break
            else:
                print("  -> No download links found on this page")
        except Exception as exc:
            print("  -> Could not access: %s" % exc)

    return discovered


def fetch_xml():
    """Download the G-BA AIS XML, trying discovered and known URLs."""
    # Step 1: Try to discover the current URL from the AIS pages
    discovered_urls = discover_xml_urls()

    # Step 2: Combine with known direct URLs, deduplicating
    all_urls = discovered_urls + DIRECT_URLS
    seen = set()
    unique_urls = []
    for u in all_urls:
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)

    # Step 3: Try each URL
    for url in unique_urls:
        try:
            print("Trying: %s" % url)
            data, content_type = download_url(url)
            print("  -> Downloaded %s bytes (Content-Type: %s)" % (
                "{:,}".format(len(data)), content_type))

            xml_data = extract_xml_from_data(data)
            if xml_data is not None:
                return xml_data
            # If extraction returned None, this URL gave us a non-XML file
            print("  -> Not valid XML data, trying next URL...")
        except Exception as exc:
            print("  -> Failed: %s" % exc)

    # All URLs failed
    print("")
    print("=" * 70)
    print("AUTOMATIC DOWNLOAD FAILED")
    print("=" * 70)
    print("")
    print("The G-BA may have changed their download URLs.")
    print("")
    print("MANUAL WORKAROUND:")
    print("  1. Open this page in your browser:")
    print("     https://ais.g-ba.de/")
    print("")
    print("  2. Download the XML file (look for 'XML' download button)")
    print("     Save it to your Downloads folder")
    print("")
    print("  3. Run this script again with --xml-file:")
    print("     python3 scripts/fetch_gba_xml.py --xml-file ~/Downloads/G-BA_Beschluss_Info.xml")
    print("")
    print("  (The file might be a .zip — that's fine, the script handles it)")
    print("")
    sys.exit(1)


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Fetch G-BA AIS XML and generate data/DE.json cache"
    )
    parser.add_argument(
        "--xml-file",
        type=str,
        default=None,
        help="Path to a local XML or ZIP file instead of downloading",
    )
    args = parser.parse_args()

    # Get XML content
    if args.xml_file:
        p = Path(args.xml_file)
        if not p.exists():
            print("ERROR: File not found: %s" % p)
            sys.exit(1)
        raw = p.read_bytes()
        print("Read %s bytes from %s" % ("{:,}".format(len(raw)), p))
        xml_content = extract_xml_from_data(raw)
        if xml_content is None:
            print("ERROR: Could not extract valid XML from %s" % p)
            sys.exit(1)
    else:
        xml_content = fetch_xml()

    # Parse
    decisions = parse_xml(xml_content)

    if not decisions:
        print("ERROR: No decisions parsed from XML. File may be invalid.")
        sys.exit(1)

    print("Parsed %d decision entries" % len(decisions))

    substances = set()
    for d in decisions:
        for s in d.get("substances", []):
            substances.add(s)
    print("Unique substances: %d" % len(substances))

    # Write the cache file
    payload = {
        "country": "DE",
        "agency": "G-BA",
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "record_count": len(decisions),
        "data": decisions,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)

    print("")
    print("Written to %s" % OUTPUT_FILE)
    print("File size: %s bytes" % "{:,}".format(OUTPUT_FILE.stat().st_size))
    print("")
    print("Done! Commit data/DE.json to include G-BA data in deployments.")


if __name__ == "__main__":
    main()
