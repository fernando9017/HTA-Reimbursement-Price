#!/usr/bin/env python3
"""Fetch and cache HTA data for all country adapters.

Usage:
    python -m scripts.fetch_data           # Fetch all countries
    python -m scripts.fetch_data FR GB     # Fetch specific countries only

This script instantiates each HTA adapter, calls load_data() to fetch
from the remote source, and saves the result to data/{CODE}.json.
It also fetches EMA data if no EMA.json cache exists.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Ensure the project root is on sys.path so that `app.*` imports work
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

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
logger = logging.getLogger("fetch_data")

DATA_DIR = PROJECT_ROOT / "data"

# All adapters keyed by country code
ADAPTERS = {
    "FR": FranceHAS,
    "DE": GermanyGBA,
    "GB": UKNICE,
    "ES": SpainAEMPS,
    "JP": JapanPMDA,
}


async def fetch_country(code: str) -> bool:
    """Fetch data for a single country adapter and save to disk.

    Returns True if data was successfully fetched and saved.
    """
    adapter_cls = ADAPTERS.get(code)
    if not adapter_cls:
        logger.error("Unknown country code: %s (available: %s)", code, ", ".join(ADAPTERS))
        return False

    adapter = adapter_cls()
    data_file = DATA_DIR / f"{code}.json"

    logger.info("Fetching %s (%s) data from remote source...", adapter.agency_abbreviation, code)
    try:
        await adapter.load_data()
    except Exception:
        logger.exception("Failed to fetch %s data", adapter.agency_abbreviation)
        return False

    if not adapter.is_loaded:
        logger.error("%s adapter reports data not loaded after fetch", adapter.agency_abbreviation)
        return False

    adapter.save_to_file(data_file)
    logger.info(
        "Saved %s data to %s",
        adapter.agency_abbreviation,
        data_file,
    )
    return True


async def fetch_ema() -> bool:
    """Fetch EMA medicines data and save to disk."""
    ema = EMAService()
    data_file = DATA_DIR / "EMA.json"

    logger.info("Fetching EMA medicines data...")
    try:
        await ema.load_data()
    except Exception:
        logger.exception("Failed to fetch EMA data")
        return False

    if ema.medicine_count == 0:
        logger.error("EMA data fetched but contains 0 medicines")
        return False

    ema.save_to_file(data_file)
    logger.info("Saved EMA data to %s (%d medicines)", data_file, ema.medicine_count)
    return True


async def main():
    # Parse country codes from CLI args, or default to all
    requested = [c.upper() for c in sys.argv[1:]] if len(sys.argv) > 1 else list(ADAPTERS.keys())

    # Also fetch EMA if not already cached (unless specific countries requested)
    fetch_ema_data = len(sys.argv) <= 1 or "EMA" in requested
    requested = [c for c in requested if c != "EMA"]

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    results: dict[str, bool] = {}

    # Fetch EMA first if needed
    if fetch_ema_data:
        ema_file = DATA_DIR / "EMA.json"
        if not ema_file.exists():
            results["EMA"] = await fetch_ema()
        else:
            logger.info("EMA.json already exists, skipping (pass 'EMA' explicitly to re-fetch)")

    # Fetch HTA adapters concurrently
    tasks = {}
    for code in requested:
        if code not in ADAPTERS:
            logger.warning("Skipping unknown country code: %s", code)
            continue
        tasks[code] = asyncio.create_task(fetch_country(code))

    for code, task in tasks.items():
        results[code] = await task

    # Summary
    logger.info("=" * 60)
    logger.info("Fetch Summary:")
    for code, success in results.items():
        status = "OK" if success else "FAILED"
        file_path = DATA_DIR / f"{code}.json"
        size = f" ({file_path.stat().st_size / 1024:.0f} KB)" if file_path.exists() else ""
        logger.info("  %s: %s%s", code, status, size)

    failed = [c for c, ok in results.items() if not ok]
    if failed:
        logger.warning("Failed to fetch: %s", ", ".join(failed))
        sys.exit(1)

    logger.info("All data fetched successfully!")


if __name__ == "__main__":
    asyncio.run(main())
