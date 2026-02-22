#!/usr/bin/env python3
"""Build the curated HTA assessment database from live adapter data.

This script loads each country's HTA adapter (from cache or live sources),
queries every unique active substance found in the EMA database, and writes
the results to data/curated_assessments.json.

Usage:
    # Build from cached data files (fast, no network):
    python scripts/build_curated_db.py

    # Fetch fresh data from live sources first:
    python scripts/build_curated_db.py --fetch

    # Only build for specific countries:
    python scripts/build_curated_db.py --countries GB,DE

    # Merge into an existing curated file (preserves manual edits):
    python scripts/build_curated_db.py --merge

The resulting JSON file is keyed by lowercase active substance (INN),
with each substance mapping country codes to lists of AssessmentResult-
compatible objects.
"""

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# Allow running from the repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import AssessmentResult  # noqa: E402
from app.services.ema_service import EMAService  # noqa: E402
from app.services.hta_agencies.france_has import FranceHAS  # noqa: E402
from app.services.hta_agencies.germany_gba import GermanyGBA  # noqa: E402
from app.services.hta_agencies.japan_pmda import JapanPMDA  # noqa: E402
from app.services.hta_agencies.spain_aemps import SpainAEMPS  # noqa: E402
from app.services.hta_agencies.uk_nice import UKNICE  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("build_curated_db")

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "curated_assessments.json"

# All supported country adapters
ADAPTERS = {
    "FR": FranceHAS,
    "DE": GermanyGBA,
    "GB": UKNICE,
    "ES": SpainAEMPS,
    "JP": JapanPMDA,
}


def _result_to_dict(r: AssessmentResult) -> dict:
    """Convert an AssessmentResult to a dict, dropping empty-string fields."""
    d = r.model_dump()
    return {k: v for k, v in d.items() if v}


def _extract_substances(ema_medicines: list[dict]) -> list[str]:
    """Extract unique active substances from EMA medicine records."""
    substances: set[str] = set()
    for med in ema_medicines:
        for key in ("activeSubstance", "active_substance", "inn_common_name",
                     "internationalNonProprietaryNameINN"):
            val = med.get(key)
            if val and isinstance(val, str) and val.strip():
                substances.add(val.strip())
                break
    return sorted(substances)


async def load_adapter(code: str, *, fetch: bool = False):
    """Instantiate and load an adapter from cache or live source."""
    cls = ADAPTERS[code]
    adapter = cls()
    cache_file = DATA_DIR / f"{code}.json"

    if not fetch:
        if adapter.load_from_file(cache_file):
            logger.info("%s: loaded from cache (%s)", code, cache_file)
            return adapter
        logger.warning("%s: no cache at %s, will try live fetch", code, cache_file)

    try:
        await adapter.load_data()
        if adapter.is_loaded:
            adapter.save_to_file(cache_file)
            logger.info("%s: fetched from live source and cached", code)
            return adapter
    except Exception:
        logger.exception("%s: live fetch failed", code)

    # Fallback: try cache even if we wanted live
    if adapter.load_from_file(cache_file):
        logger.info("%s: fell back to cache after live failure", code)
        return adapter

    logger.error("%s: NO DATA AVAILABLE — skipping", code)
    return None


async def build_curated_db(
    countries: list[str],
    fetch: bool = False,
    merge: bool = False,
) -> dict:
    """Build the curated assessment database.

    Returns the full curated dict ready for JSON serialization.
    """
    # Load EMA data
    ema = EMAService()
    ema_cache = DATA_DIR / "EMA.json"
    if fetch:
        try:
            await ema.load_data()
            ema.save_to_file(ema_cache)
        except Exception:
            logger.warning("EMA live fetch failed, trying cache")
            if not ema.load_from_file(ema_cache):
                logger.error("No EMA data available — cannot determine substances")
                return {}
    else:
        if not ema.load_from_file(ema_cache):
            logger.error(
                "No EMA cache at %s. Run with --fetch first, or start the app once to populate caches.",
                ema_cache,
            )
            return {}

    substances = _extract_substances(ema.raw_medicines)
    logger.info("Found %d unique substances in EMA data", len(substances))

    # Load adapters
    adapters = {}
    for code in countries:
        adapter = await load_adapter(code, fetch=fetch)
        if adapter and adapter.is_loaded:
            adapters[code] = adapter

    if not adapters:
        logger.error("No adapters loaded — nothing to build")
        return {}

    logger.info("Loaded adapters: %s", ", ".join(adapters.keys()))

    # Load existing curated data if merging
    existing: dict = {}
    if merge and OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, encoding="utf-8") as fh:
                existing = json.load(fh)
            logger.info("Loaded existing curated file with %d substances",
                        sum(1 for k in existing if not k.startswith("_")))
        except Exception:
            logger.warning("Could not read existing curated file, starting fresh")

    # Build the curated data
    curated: dict = {}
    total_entries = 0
    substances_with_data = 0

    for i, substance in enumerate(substances, 1):
        if i % 100 == 0 or i == len(substances):
            logger.info("Progress: %d/%d substances processed (%d entries so far)",
                        i, len(substances), total_entries)

        substance_lower = substance.lower().strip()
        substance_data: dict[str, list[dict]] = {}

        for code, adapter in adapters.items():
            try:
                results = await adapter.search_assessments(substance)
            except Exception:
                logger.debug("Error querying %s for %s", code, substance, exc_info=True)
                continue

            if not results:
                continue

            entries = [_result_to_dict(r) for r in results]
            substance_data[code] = entries
            total_entries += len(entries)

        if substance_data:
            # Merge with existing data if requested
            if merge and substance_lower in existing and isinstance(existing[substance_lower], dict):
                for code, entries in existing[substance_lower].items():
                    if code not in substance_data:
                        substance_data[code] = entries
            curated[substance_lower] = substance_data
            substances_with_data += 1

    # Also preserve existing entries for substances not in EMA (manual entries)
    if merge:
        for key, val in existing.items():
            if key.startswith("_"):
                continue
            if key not in curated and isinstance(val, dict):
                curated[key] = val
                substances_with_data += 1

    logger.info(
        "Built curated database: %d substances with data, %d total entries",
        substances_with_data, total_entries,
    )
    return curated


def write_output(curated: dict, output_file: Path) -> None:
    """Write the curated database to a JSON file."""
    output = {
        "_meta": {
            "description": (
                "Curated HTA assessment data auto-generated from live adapter data. "
                "Entries here supplement (not replace) live-scraped data. "
                "Regenerate with: python scripts/build_curated_db.py"
            ),
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "format": (
                "Keyed by lowercase active substance (INN). Each substance maps "
                "country codes to a list of AssessmentResult-compatible objects."
            ),
            "per_country_fields": {
                "GB": "assessment_url (NICE guidance), nice_recommendation, guidance_reference",
                "DE": "assessment_url (G-BA procedure), benefit_rating, evidence_level, comparator, patient_group",
                "FR": "assessment_url (HAS CT opinion), smr_value, asmr_value",
                "ES": "assessment_url (IPT PDF), ipt_reference, therapeutic_positioning, bifimed_reimbursed, bifimed_url",
                "JP": "assessment_url (PMDA review), pmda_review_type, japan_mhlw_url (price-setting PDF)",
            },
        },
    }
    # Sort substances alphabetically for stable diffs
    for substance in sorted(curated.keys()):
        output[substance] = curated[substance]

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as fh:
        json.dump(output, fh, ensure_ascii=False, indent=2)

    substance_count = sum(1 for k in output if not k.startswith("_"))
    logger.info("Wrote %s (%d substances)", output_file, substance_count)


def main():
    parser = argparse.ArgumentParser(
        description="Build the curated HTA assessment database from adapter data.",
        epilog=(
            "Examples:\n"
            "  python scripts/build_curated_db.py              # Build from caches\n"
            "  python scripts/build_curated_db.py --fetch       # Fetch live data first\n"
            "  python scripts/build_curated_db.py --countries GB,DE  # Specific countries\n"
            "  python scripts/build_curated_db.py --merge       # Preserve manual edits\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--fetch", action="store_true",
        help="Fetch fresh data from live sources (requires network). "
             "Without this flag, only cached data files are used.",
    )
    parser.add_argument(
        "--countries", type=str, default="",
        help="Comma-separated country codes to include (default: all). "
             f"Available: {','.join(ADAPTERS.keys())}",
    )
    parser.add_argument(
        "--merge", action="store_true",
        help="Merge new data into existing curated file instead of replacing it. "
             "Preserves manually added entries.",
    )
    parser.add_argument(
        "--output", type=str, default="",
        help=f"Output file path (default: {OUTPUT_FILE})",
    )
    args = parser.parse_args()

    countries = [c.strip().upper() for c in args.countries.split(",") if c.strip()] \
        if args.countries else list(ADAPTERS.keys())

    invalid = [c for c in countries if c not in ADAPTERS]
    if invalid:
        parser.error(f"Unknown country codes: {', '.join(invalid)}. "
                     f"Available: {', '.join(ADAPTERS.keys())}")

    output_file = Path(args.output) if args.output else OUTPUT_FILE

    logger.info("Building curated DB for countries: %s", ", ".join(countries))
    logger.info("Fetch from live: %s | Merge: %s | Output: %s",
                args.fetch, args.merge, output_file)

    curated = asyncio.run(build_curated_db(countries, fetch=args.fetch, merge=args.merge))
    if curated:
        write_output(curated, output_file)
        logger.info("Done.")
    else:
        logger.error("No data was generated. Check logs above for errors.")
        sys.exit(1)


if __name__ == "__main__":
    main()
