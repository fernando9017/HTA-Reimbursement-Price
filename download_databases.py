#!/usr/bin/env python3
"""Download all HTA agency databases and save them as bundled JSON files.

Run this script when you have a good internet connection to refresh the
bundled data in data/.  The app can then run in OFFLINE_MODE=1 without
ever contacting remote servers.

Usage:
    python download_databases.py            # download all
    python download_databases.py FR GB ES   # download specific countries only
    python download_databases.py --insecure # disable SSL verification (macOS fix)
    python download_databases.py --insecure FR GB ES

After running, commit the updated data/*.json files so they ship with the repo.
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Handle --insecure flag before importing app modules (so SSL_VERIFY is set)
if "--insecure" in sys.argv:
    sys.argv.remove("--insecure")
    os.environ["SSL_VERIFY"] = "0"
    print("SSL verification DISABLED (--insecure mode)")

# Ensure the app package is importable
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ema_service import EMAService
from app.services.hta_agencies.france_has import FranceHAS
from app.services.hta_agencies.germany_gba import GermanyGBA
from app.services.hta_agencies.japan_pmda import JapanPMDA
from app.services.hta_agencies.spain_aemps import SpainAEMPS
from app.services.hta_agencies.uk_nice import UKNICE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("download_databases")

DATA_DIR = Path(__file__).parent / "data"


# All available agency adapters
AGENCIES = {
    "FR": FranceHAS,
    "DE": GermanyGBA,
    "GB": UKNICE,
    "ES": SpainAEMPS,
    "JP": JapanPMDA,
}


def _file_summary(path: Path) -> str:
    """Return a human-readable summary of a data file."""
    if not path.exists():
        return "  (no existing file)"
    try:
        with open(path, encoding="utf-8") as fh:
            envelope = json.load(fh)
        count = envelope.get("record_count", "?")
        updated = envelope.get("updated_at", "?")
        size_kb = path.stat().st_size / 1024
        return f"  existing: {count} records, updated {updated}, {size_kb:.0f} KB"
    except Exception:
        return "  (could not read existing file)"


async def download_ema() -> bool:
    """Download EMA medicine data."""
    ema = EMAService()
    cache_file = DATA_DIR / "EMA.json"

    logger.info("--- EMA Medicines ---")
    logger.info(_file_summary(cache_file))

    try:
        await ema.load_data()
        logger.info("Fetched %d medicines from EMA", ema.medicine_count)
        ema.save_to_file(cache_file)
        return True
    except Exception:
        logger.exception("Failed to download EMA data")
        return False


async def download_agency(code: str) -> bool:
    """Download data for a single HTA agency."""
    cls = AGENCIES.get(code.upper())
    if cls is None:
        logger.error("Unknown country code: %s (available: %s)", code, ", ".join(AGENCIES))
        return False

    agency = cls()
    data_file = DATA_DIR / f"{code.upper()}.json"

    logger.info("--- %s (%s) ---", agency.agency_abbreviation, code.upper())
    logger.info(_file_summary(data_file))

    try:
        await agency.load_data()
        if not agency.is_loaded:
            logger.error("%s: load_data() completed but adapter reports not loaded", code)
            return False

        # Use _write_json_file directly (bypass safe-write protection) since
        # the user explicitly asked for a fresh download.
        envelope = agency._make_envelope(
            _get_agency_data(agency)
        )
        agency._write_json_file(data_file, envelope)
        logger.info(
            "%s: saved %d records to %s",
            agency.agency_abbreviation,
            envelope["record_count"],
            data_file,
        )
        return True
    except Exception:
        logger.exception("Failed to download %s data", agency.agency_abbreviation)
        return False


def _get_agency_data(agency):
    """Extract the raw data payload from an agency adapter."""
    if isinstance(agency, FranceHAS):
        return {
            "medicines": agency._medicines,
            "compositions": dict(agency._compositions),
            "smr": dict(agency._smr),
            "asmr": dict(agency._asmr),
            "ct_links": agency._ct_links,
        }
    elif isinstance(agency, GermanyGBA):
        return agency._decisions
    elif isinstance(agency, UKNICE):
        return agency._guidance_list
    elif isinstance(agency, SpainAEMPS):
        return agency._ipt_list
    elif isinstance(agency, JapanPMDA):
        return agency._drug_list
    else:
        raise ValueError(f"Unknown agency type: {type(agency)}")


async def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Determine which countries to download
    requested = [c.upper() for c in sys.argv[1:]] if len(sys.argv) > 1 else []
    download_ema_flag = not requested  # download EMA only when doing all

    if requested:
        codes_to_download = [c for c in requested if c in AGENCIES]
        unknown = [c for c in requested if c not in AGENCIES]
        if unknown:
            logger.warning("Unknown country codes (skipping): %s", ", ".join(unknown))
            logger.info("Available: %s", ", ".join(AGENCIES))
    else:
        codes_to_download = list(AGENCIES.keys())

    logger.info(
        "Downloading databases for: %s%s",
        ", ".join(codes_to_download),
        " + EMA" if download_ema_flag else "",
    )
    logger.info("Output directory: %s", DATA_DIR.resolve())
    print()

    results = {}

    # Download EMA first (other services may depend on it)
    if download_ema_flag:
        results["EMA"] = await download_ema()
        print()

    # Download each agency
    for code in codes_to_download:
        results[code] = await download_agency(code)
        print()

    # Summary
    print("=" * 60)
    print("DOWNLOAD SUMMARY")
    print("=" * 60)
    for name, ok in results.items():
        status = "OK" if ok else "FAILED"
        data_file = DATA_DIR / (f"{name}.json" if name != "EMA" else "EMA.json")
        size = ""
        if data_file.exists():
            size_kb = data_file.stat().st_size / 1024
            size = f" ({size_kb:.0f} KB)"
        print(f"  {name:6s}: {status}{size}")

    failed = [k for k, v in results.items() if not v]
    if failed:
        print(f"\nFailed: {', '.join(failed)}")
        print("Re-run the script to retry, or check your internet connection.")
        sys.exit(1)
    else:
        print(f"\nAll databases downloaded successfully to {DATA_DIR.resolve()}")
        print("Commit the updated data/*.json files to bundle them with the repo.")
        print("Then set OFFLINE_MODE=1 to run the app without network dependencies.")


if __name__ == "__main__":
    asyncio.run(main())
