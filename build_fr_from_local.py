#!/usr/bin/env python3
"""Build data/FR.json from locally downloaded BDPM text files.

Usage:
    python build_fr_from_local.py /tmp/bdpm

Reads the 5 BDPM .txt files from the given directory and produces
an updated data/FR.json in exactly the same format as download_databases.py.
"""

import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SEPARATOR = "\t"
ENCODING = "latin-1"

FILE_MAP = {
    "medicines": "CIS_bdpm.txt",
    "compositions": "CIS_COMPO_bdpm.txt",
    "smr": "CIS_HAS_SMR_bdpm.txt",
    "asmr": "CIS_HAS_ASMR_bdpm.txt",
    "ct_links": "HAS_LiensPageCT_bdpm.txt",
}


def read_file(path: Path) -> str:
    """Read a BDPM file, trying Latin-1 first then UTF-8."""
    try:
        return path.read_text(encoding=ENCODING)
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def parse_rows(content: str) -> list[list[str]]:
    rows = []
    for line in content.splitlines():
        line = line.strip()
        if line:
            rows.append([field.strip() for field in line.split(SEPARATOR)])
    return rows


def format_date(raw: str) -> str:
    raw = raw.strip()
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw


def normalize_has_url(url: str) -> str:
    import re
    if not url:
        return url
    if url.startswith("http://"):
        url = "https://" + url[7:]
    url = url.replace("/portail/jcms/", "/jcms/")
    if "/jcms/" in url and "/fr/" not in url and "/en/" not in url:
        url = re.sub(r"(/jcms/[cp]_\d+)/", r"\1/fr/", url, count=1)
    return url


def main():
    if len(sys.argv) < 2:
        print("Usage: python build_fr_from_local.py /tmp/bdpm")
        sys.exit(1)

    source_dir = Path(sys.argv[1])
    if not source_dir.is_dir():
        print(f"Error: {source_dir} is not a directory")
        sys.exit(1)

    # Check all files exist
    for key, filename in FILE_MAP.items():
        p = source_dir / filename
        if not p.exists():
            print(f"Error: missing {p}")
            sys.exit(1)
        print(f"  Found {filename}: {p.stat().st_size / 1024:.0f} KB")

    # Parse medicines
    medicines = {}
    content = read_file(source_dir / FILE_MAP["medicines"])
    for row in parse_rows(content):
        if len(row) >= 2:
            medicines[row[0]] = row[1]
    print(f"  Medicines: {len(medicines)}")

    # Parse compositions
    compositions = defaultdict(list)
    content = read_file(source_dir / FILE_MAP["compositions"])
    for row in parse_rows(content):
        if len(row) >= 4:
            cis_code = row[0]
            substance = row[3].strip()
            if substance and substance not in compositions[cis_code]:
                compositions[cis_code].append(substance)
    print(f"  Compositions: {sum(len(v) for v in compositions.values())} entries")

    # Parse SMR
    smr = defaultdict(list)
    content = read_file(source_dir / FILE_MAP["smr"])
    for row in parse_rows(content):
        if len(row) >= 5:
            smr[row[0]].append({
                "dossier_code": row[1] if len(row) > 1 else "",
                "motif": row[2] if len(row) > 2 else "",
                "date": format_date(row[3]) if len(row) > 3 else "",
                "value": row[4] if len(row) > 4 else "",
                "label": row[5] if len(row) > 5 else "",
            })
    smr_count = sum(len(v) for v in smr.values())
    print(f"  SMR records: {smr_count}")

    # Parse ASMR
    asmr = defaultdict(list)
    content = read_file(source_dir / FILE_MAP["asmr"])
    for row in parse_rows(content):
        if len(row) >= 5:
            asmr[row[0]].append({
                "dossier_code": row[1] if len(row) > 1 else "",
                "motif": row[2] if len(row) > 2 else "",
                "date": format_date(row[3]) if len(row) > 3 else "",
                "value": row[4] if len(row) > 4 else "",
                "label": row[5] if len(row) > 5 else "",
            })
    asmr_count = sum(len(v) for v in asmr.values())
    print(f"  ASMR records: {asmr_count}")

    # Parse CT links
    ct_links = {}
    content = read_file(source_dir / FILE_MAP["ct_links"])
    for row in parse_rows(content):
        if len(row) >= 2:
            ct_links[row[0]] = normalize_has_url(row[1])
    print(f"  CT links: {len(ct_links)}")

    # Build envelope
    data = {
        "medicines": medicines,
        "compositions": dict(compositions),
        "smr": dict(smr),
        "asmr": dict(asmr),
        "ct_links": ct_links,
    }
    count = sum(len(v) if isinstance(v, (list, dict)) else 1 for v in data.values())
    envelope = {
        "country": "FR",
        "agency": "HAS",
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "record_count": count,
        "data": data,
    }

    # Write output
    output = Path(__file__).parent / "data" / "FR.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as fh:
        json.dump(envelope, fh, ensure_ascii=False, indent=2)

    size_kb = output.stat().st_size / 1024
    print(f"\nSaved to {output} ({size_kb:.0f} KB)")
    print("You can now commit and push data/FR.json")


if __name__ == "__main__":
    main()
