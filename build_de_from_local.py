#!/usr/bin/env python3
"""Build data/DE.json from a locally downloaded G-BA AIS XML file.

Usage:
    python build_de_from_local.py ~/Downloads/2026-03-01_11-15-48_Export_Beschluesse.xml

Reads the G-BA AIS XML file and produces an updated data/DE.json in exactly
the same format as download_databases.py.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Ensure the app package is importable
sys.path.insert(0, str(Path(__file__).parent))

from app.services.hta_agencies.germany_gba import GermanyGBA


def main():
    if len(sys.argv) < 2:
        print("Usage: python build_de_from_local.py <path-to-xml-file>")
        print("Example: python build_de_from_local.py ~/Downloads/Export_Beschluesse.xml")
        sys.exit(1)

    xml_path = Path(sys.argv[1]).expanduser()
    if not xml_path.exists():
        print(f"Error: file not found: {xml_path}")
        sys.exit(1)

    print(f"Reading G-BA XML from {xml_path} ({xml_path.stat().st_size / 1024:.0f} KB)")

    xml_content = xml_path.read_bytes()
    print(f"  XML size: {len(xml_content):,} bytes")

    # Parse using the existing adapter logic
    adapter = GermanyGBA()
    decisions = adapter._parse_xml(xml_content)
    adapter._decisions = decisions
    adapter._loaded = True
    adapter._apply_translations()

    print(f"  Parsed {len(decisions)} decision entries")

    # Build envelope and write
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    out_file = data_dir / "DE.json"

    envelope = {
        "country": "DE",
        "agency": "G-BA",
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "record_count": len(decisions),
        "data": decisions,
    }

    with open(out_file, "w", encoding="utf-8") as fh:
        json.dump(envelope, fh, ensure_ascii=False, indent=2)

    size_kb = out_file.stat().st_size / 1024
    print(f"\nWrote {out_file} ({size_kb:.0f} KB, {len(decisions)} records)")


if __name__ == "__main__":
    main()
