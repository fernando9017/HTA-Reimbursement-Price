#!/usr/bin/env python3
"""Fetch the G-BA AIS XML and generate a cached DE.json file.

Run this script from a machine that can reach g-ba.de (residential/office
network — cloud servers are blocked).  It downloads the AIS XML, parses it,
and writes data/DE.json.

This script is SELF-CONTAINED — it does not import anything from the app
package, so it works with any Python 3.7+ installation (no pip install needed).

Usage:
    python3 scripts/fetch_gba_xml.py

The generated DE.json should be committed to the repository so the Render
deployment can load G-BA data from the file cache on startup.

The G-BA updates the AIS XML on the 1st and 15th of each month, so re-run
this script periodically to keep the cache current.
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

XML_URLS = [
    # The URL that successfully downloaded (even if content needs decompressing)
    "https://www.g-ba.de/downloads/83-691-883/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/downloads/83-691/G-BA_Beschluss_Info.xml",
    # ZIP variants
    "https://www.g-ba.de/downloads/83-691-883/G-BA_Beschluss_Info.zip",
    "https://www.g-ba.de/downloads/83-691/G-BA_Beschluss_Info.zip",
    # Other known patterns
    "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.zip",
    "https://www.g-ba.de/downloads/ais-dateien/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/fileadmin/downloads/ais/G-BA_Beschluss_Info.xml",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


# ── XML Parsing (self-contained, matches germany_gba.py logic) ────────


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
    """Get text content from the first matching child element."""
    for tag in tag_names:
        el = parent.find(tag)
        if el is not None and el.text:
            return el.text.strip()
        el = parent.find(".//" + tag)
        if el is not None and el.text:
            return el.text.strip()
    for tag in tag_names:
        val = parent.get(tag)
        if val:
            return val.strip()
    return ""


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


def extract_benefit(elem):
    """Extract benefit rating and evidence level from an element."""
    benefit = get_text(elem, [
        "ZN_W", "Zn_W", "ZUSATZNUTZEN", "Zusatznutzen",
        "AUSMASS", "Ausmass", "zn_w",
    ])
    evidence = get_text(elem, [
        "AUSSAGESICHERHEIT", "Aussagesicherheit",
        "aussagesicherheit", "WAHRSCHEINLICHKEIT",
    ])
    return {
        "benefit_rating": benefit,
        "evidence_level": evidence,
        "comparator": "",
        "patient_group": "",
    }


def parse_beschluss_base(elem):
    """Extract top-level decision metadata."""
    substances = []
    trade_names = []

    decision_id = get_text(elem, [
        "ID_BE_AKZ", "id_be_akz", "AKZ", "akz",
    ])

    procedure_id = ""
    if decision_id:
        num_match = re.search(r"-[Dd]-(\d+)\s*$", decision_id)
        if not num_match:
            num_match = re.search(r"(\d+)\s*$", decision_id)
        if num_match:
            procedure_id = num_match.group(1)

    decision_date = get_text(elem, [
        "DAT_BESCHLUSS", "Dat_Beschluss", "DATUM", "datum",
        "Beschluss_Datum", "beschluss_datum", "date",
    ])
    decision_date = normalize_date(decision_date)

    ws_containers = find_elements(elem, [
        "WS_BEW", "Ws_Bew", "WIRKSTOFF", "Wirkstoff",
        ".//WS_BEW", ".//{*}WS_BEW",
    ])
    for ws in ws_containers:
        name = get_text(ws, [
            "NAME_WS", "Name_Ws", "BEZEICHNUNG", "name",
        ])
        if name:
            substances.append(name)

    if not substances:
        ws_text = get_text(elem, [
            "WIRKSTOFF", "Wirkstoff", "wirkstoff", "WS_BEW",
        ])
        if ws_text:
            substances.append(ws_text)

    hn_containers = find_elements(elem, [
        "HN", "Hn", "HANDELSNAME", "Handelsname",
        ".//HN", ".//{*}HN",
    ])
    for hn in hn_containers:
        name = get_text(hn, ["NAME_HN", "Name_Hn", "name"])
        if name:
            trade_names.append(name)
        elif hn.text and hn.text.strip():
            trade_names.append(hn.text.strip())

    if not trade_names:
        hn_text = get_text(elem, [
            "HANDELSNAME", "Handelsname", "handelsname",
        ])
        if hn_text:
            trade_names.append(hn_text)

    indication = get_text(elem, [
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


def parse_patient_group(pg_elem):
    """Extract patient-group-level benefit data."""
    data = extract_benefit(pg_elem)

    pg_id = get_text(pg_elem, [
        "ID_PAT_GR", "Id_Pat_Gr", "PATGR_ID",
    ])
    pg_desc = get_text(pg_elem, [
        "BEZ_PAT_GR", "Bez_Pat_Gr", "BEZEICHNUNG",
        "PAT_GR_TEXT", "Pat_Gr_Text", "description",
    ])
    data["patient_group"] = pg_desc or pg_id

    comparator = get_text(pg_elem, [
        "VGL_TH", "Vgl_Th", "ZVT", "zVT", "VERGLEICHSTHERAPIE",
    ])
    if not comparator:
        vgl_containers = find_elements(pg_elem, [
            "VGL_TH", "Vgl_Th", ".//VGL_TH",
        ])
        for vgl in vgl_containers:
            text = get_text(vgl, [
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


def parse_xml(xml_content):
    """Parse the G-BA AIS XML into a list of decision dicts."""
    decisions = []
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:
        print("ERROR: Failed to parse XML: %s" % exc)
        return decisions

    beschluesse = find_elements(root, [
        "Beschluss", "BESCHLUSS", "besluit",
        ".//Beschluss", ".//{*}Beschluss",
    ])

    if not beschluesse:
        beschluesse = list(root)

    for beschluss in beschluesse:
        base = parse_beschluss_base(beschluss)
        patient_groups = find_elements(beschluss, [
            "PAT_GR", "Pat_Gr", "PATGR", ".//PAT_GR", ".//{*}PAT_GR",
        ])

        if patient_groups:
            for pg in patient_groups:
                entry = dict(base)
                entry.update(parse_patient_group(pg))
                decisions.append(entry)
        else:
            entry = dict(base)
            entry.update(extract_benefit(beschluss))
            decisions.append(entry)

    return decisions


# ── Decompression helpers ──────────────────────────────────────────────


def extract_xml_from_data(data):
    """Detect if data is ZIP/GZIP compressed and extract the XML content.

    Returns the raw XML bytes ready for parsing.
    """
    # Check for ZIP magic bytes (PK\x03\x04)
    if data[:4] == b"PK\x03\x04":
        print("  -> Detected ZIP archive, extracting...")
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            names = zf.namelist()
            print("  -> ZIP contains: %s" % ", ".join(names))
            # Find the XML file inside
            xml_name = None
            for name in names:
                if name.lower().endswith(".xml"):
                    xml_name = name
                    break
            if not xml_name and names:
                xml_name = names[0]
            if xml_name:
                xml_data = zf.read(xml_name)
                print("  -> Extracted %s ({:,} bytes)".format(len(xml_data)) % xml_name)
                return xml_data
            raise RuntimeError("No XML file found inside ZIP archive")

    # Check for GZIP magic bytes (\x1f\x8b)
    if data[:2] == b"\x1f\x8b":
        print("  -> Detected GZIP, decompressing...")
        xml_data = gzip.decompress(data)
        print("  -> Decompressed to {:,} bytes".format(len(xml_data)))
        return xml_data

    # Check if it starts with XML declaration or a tag
    stripped = data.lstrip()
    if stripped[:5] in (b"<?xml", b"<G-BA", b"<g-ba", b"<Besc"):
        return data

    # Show first bytes for debugging
    print("  -> WARNING: Unknown file format. First 100 bytes:")
    print("     %s" % repr(data[:100]))
    print("  -> Attempting to parse as XML anyway...")
    return data


# ── Network fetching ───────────────────────────────────────────────────


def fetch_xml():
    """Download the G-BA AIS XML from the first working URL."""
    ais_page_url = (
        "https://www.g-ba.de/themen/arzneimittel/"
        "arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/ais/"
    )
    discovered_urls = []
    try:
        req = urllib.request.Request(ais_page_url, headers=HEADERS)
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        for match in re.finditer(
            r"""href=['"](/[^'"]*G-BA_Beschluss_Info[^'"]*\.(?:xml|zip))['"]""",
            html,
            re.IGNORECASE,
        ):
            discovered_urls.append("https://www.g-ba.de" + match.group(1))
        if discovered_urls:
            print("Discovered %d XML URL(s) from AIS page" % len(discovered_urls))
    except Exception as exc:
        print("Could not scrape AIS page: %s" % exc)

    all_urls = discovered_urls + XML_URLS
    seen = set()
    unique_urls = []
    for u in all_urls:
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)

    last_error = None
    for url in unique_urls:
        try:
            print("Trying: %s" % url)
            req = urllib.request.Request(url, headers=HEADERS)
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                data = resp.read()
                content_type = resp.headers.get("Content-Type", "")
                print("  -> Downloaded {:,} bytes (Content-Type: {})".format(
                    len(data), content_type))
                xml_data = extract_xml_from_data(data)
                return xml_data
        except RuntimeError:
            raise
        except Exception as exc:
            print("  -> Failed: %s" % exc)
            last_error = exc

    raise RuntimeError(
        "Could not download G-BA XML from any URL. Last error: %s" % last_error
    )


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Fetch G-BA AIS XML and generate data/DE.json cache"
    )
    parser.add_argument(
        "--xml-file",
        type=str,
        default=None,
        help="Path to a local XML file instead of downloading",
    )
    args = parser.parse_args()

    # Get XML content
    if args.xml_file:
        p = Path(args.xml_file)
        if not p.exists():
            print("ERROR: File not found: %s" % p)
            sys.exit(1)
        raw = p.read_bytes()
        print("Read {:,} bytes from {}".format(len(raw), p))
        xml_content = extract_xml_from_data(raw)
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
    print("File size: {:,} bytes".format(OUTPUT_FILE.stat().st_size))
    print("")
    print("Done! Commit data/DE.json to include G-BA data in deployments.")


if __name__ == "__main__":
    main()
