#!/usr/bin/env python3
"""Fetch the G-BA AIS XML and generate a cached DE.json file.

Run this script from a machine that can reach g-ba.de (residential/office
network — cloud servers are blocked).  It downloads the AIS XML, parses it
using the same logic as the live adapter, and writes data/DE.json.

Usage:
    python scripts/fetch_gba_xml.py

The generated DE.json should be committed to the repository so the Render
deployment can load G-BA data from the file cache on startup.

The G-BA updates the AIS XML on the 1st and 15th of each month, so re-run
this script periodically to keep the cache current.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Allow imports from the project root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.services.hta_agencies.germany_gba import GermanyGBA


XML_URLS = [
    "https://www.g-ba.de/downloads/ais/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/downloads/ais-dateien/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/fileadmin/ais/G-BA_Beschluss_Info.xml",
    "https://www.g-ba.de/fileadmin/downloads/ais/G-BA_Beschluss_Info.xml",
]

DATA_DIR = ROOT / "data"
OUTPUT_FILE = DATA_DIR / "DE.json"


def fetch_xml() -> bytes:
    """Download the G-BA AIS XML from the first working URL."""
    import urllib.request
    import ssl

    # Use a browser-like User-Agent to avoid being blocked
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }

    # Try the AIS page first to discover the current XML URL
    ais_page_url = (
        "https://www.g-ba.de/themen/arzneimittel/"
        "arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/ais/"
    )
    discovered_urls = []
    try:
        import re

        req = urllib.request.Request(ais_page_url, headers=headers)
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        for match in re.finditer(
            r"""href=['"](/[^'"]*G-BA_Beschluss_Info[^'"]*\.xml)['"]""",
            html,
            re.IGNORECASE,
        ):
            discovered_urls.append("https://www.g-ba.de" + match.group(1))
        if discovered_urls:
            print(f"Discovered {len(discovered_urls)} XML URL(s) from AIS page")
    except Exception as exc:
        print(f"Could not scrape AIS page: {exc}")

    all_urls = discovered_urls + XML_URLS
    # De-duplicate while preserving order
    seen = set()
    unique_urls = []
    for u in all_urls:
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)

    last_error = None
    for url in unique_urls:
        try:
            print(f"Trying: {url}")
            req = urllib.request.Request(url, headers=headers)
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                data = resp.read()
                print(f"  -> Downloaded {len(data):,} bytes")
                return data
        except Exception as exc:
            print(f"  -> Failed: {exc}")
            last_error = exc

    raise RuntimeError(
        f"Could not download G-BA XML from any URL. Last error: {last_error}"
    )


def fetch_from_local_file(path: str) -> bytes:
    """Read XML from a local file (alternative to downloading)."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {p}")
    data = p.read_bytes()
    print(f"Read {len(data):,} bytes from {p}")
    return data


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
        xml_content = fetch_from_local_file(args.xml_file)
    else:
        xml_content = fetch_xml()

    # Parse using the same logic as the live adapter
    service = GermanyGBA()
    decisions = service._parse_xml(xml_content)

    if not decisions:
        print("ERROR: No decisions parsed from XML. File may be invalid.")
        sys.exit(1)

    print(f"Parsed {len(decisions)} decision entries")

    # Collect stats
    substances = set()
    for d in decisions:
        for s in d.get("substances", []):
            substances.add(s)
    print(f"Unique substances: {len(substances)}")

    # Write the cache file in the same format as save_to_file()
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

    print(f"\nWritten to {OUTPUT_FILE}")
    print(f"File size: {OUTPUT_FILE.stat().st_size:,} bytes")
    print("\nDone! Commit data/DE.json to include G-BA data in deployments.")


if __name__ == "__main__":
    main()
