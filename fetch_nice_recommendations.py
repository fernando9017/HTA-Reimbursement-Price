#!/usr/bin/env python3
"""Fetch missing NICE recommendations and enrich the cached GB.json.

Usage:
    python fetch_nice_recommendations.py [--batch-size 50] [--max-total 0]

Phase 1: Try the NICE API for structured recommendation data (fast).
Phase 2: Scrape individual guidance pages for anything still missing (slower).

Reads data/GB.json, enriches entries with missing recommendations, and saves back.
Run this from a machine with internet access (not behind a restrictive proxy).
"""

import argparse
import asyncio
import json
import logging
import re
import sys
import time
from pathlib import Path

import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

DATA_FILE = Path(__file__).parent / "data" / "GB.json"

# Import extraction functions from the app
sys.path.insert(0, str(Path(__file__).parent))
from app.services.hta_agencies.uk_nice import (
    _extract_from_guidance_page,
    _normalize_recommendation,
)

NICE_API_URL = "https://api.nice.org.uk/services/guidance/published"
NICE_BASE_URL = "https://www.nice.org.uk"

PROGRAMME_TYPES = [
    "Technology appraisal guidance",
    "Highly specialised technologies guidance",
]


async def fetch_via_api(items_by_ref: dict[str, dict]) -> int:
    """Phase 1: Try NICE API for structured recommendation data.

    Returns the number of recommendations successfully fetched.
    """
    fetched = 0

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(30.0),
        follow_redirects=True,
        verify=False,
        headers={
            "User-Agent": "VAP-Global-Resources/0.1 (research tool)",
            "Accept": "application/json",
        },
    ) as client:
        for programme_type in PROGRAMME_TYPES:
            for page in range(1, 60):
                try:
                    resp = await client.get(
                        NICE_API_URL,
                        params={
                            "ngt": programme_type,
                            "ps": "50",
                            "page": str(page),
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
                except Exception:
                    if page == 1:
                        logger.warning(
                            "NICE API not available for %s — skipping API phase",
                            programme_type,
                        )
                    break

                # Parse results
                results_list = []
                if isinstance(data, list):
                    results_list = data
                elif isinstance(data, dict):
                    results_list = (
                        data.get("results")
                        or data.get("data", {}).get("results")
                        or data.get("guidance")
                        or data.get("items")
                        or []
                    )

                if not results_list:
                    break

                page_found = 0
                for entry in results_list:
                    if not isinstance(entry, dict):
                        continue

                    ref = (
                        entry.get("guidanceReference", "")
                        or entry.get("reference", "")
                        or entry.get("id", "")
                    ).upper()

                    if not ref:
                        url = entry.get("url", "")
                        m = re.search(r"(ta|hst)(\d+)", url, re.IGNORECASE)
                        if m:
                            ref = f"{m.group(1).upper()}{m.group(2)}"

                    if not ref or ref not in items_by_ref:
                        continue

                    g = items_by_ref[ref]
                    if g.get("recommendation"):
                        continue  # Already has one

                    rec = (
                        entry.get("recommendation", "")
                        or entry.get("recommendationStatus", "")
                        or entry.get("status", "")
                    )
                    if rec:
                        g["recommendation"] = rec.lower()
                        fetched += 1
                        page_found += 1

                    # Also fill in missing dates
                    pub_date = (
                        entry.get("publishedDate", "")
                        or entry.get("lastModified", "")
                    )
                    if pub_date and not g.get("published_date"):
                        if "T" in pub_date:
                            pub_date = pub_date[:10]
                        g["published_date"] = pub_date

                if page_found:
                    logger.info(
                        "  API %s page %d: found %d recommendations",
                        programme_type[:3], page, page_found,
                    )

    return fetched


async def fetch_via_pages(
    items: list[dict],
    batch_size: int = 50,
    max_total: int = 0,
    concurrency: int = 10,
) -> int:
    """Phase 2: Scrape individual guidance pages for missing recommendations."""
    missing = [g for g in items if not g.get("recommendation") and g.get("url")]

    if not missing:
        return 0

    if max_total > 0:
        missing = missing[:max_total]

    logger.info(
        "Phase 2: %d items still missing recommendations. Fetching pages...",
        len(missing),
    )

    fetched_count = 0
    failed_count = 0
    sem = asyncio.Semaphore(concurrency)

    async def fetch_one(client: httpx.AsyncClient, g: dict) -> bool:
        async with sem:
            url = g["url"]
            ref = g.get("reference", "?")
            try:
                resp = await client.get(url)
                if resp.status_code == 404:
                    return False
                resp.raise_for_status()
                rec, date = _extract_from_guidance_page(resp.text)
                if rec:
                    g["recommendation"] = rec
                    logger.debug("  %s → %s", ref, _normalize_recommendation(rec))
                    return True
                else:
                    logger.debug("  %s → no recommendation found on page", ref)
                    return False
            except Exception as e:
                logger.debug("  %s → error: %s", ref, e)
                return False

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(30.0),
        follow_redirects=True,
        verify=False,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    ) as client:
        for batch_start in range(0, len(missing), batch_size):
            batch = missing[batch_start:batch_start + batch_size]
            batch_num = batch_start // batch_size + 1
            total_batches = (len(missing) + batch_size - 1) // batch_size

            logger.info(
                "Batch %d/%d: fetching %d pages (%s – %s)...",
                batch_num, total_batches, len(batch),
                batch[0].get("reference", "?"),
                batch[-1].get("reference", "?"),
            )

            start_time = time.monotonic()
            results = await asyncio.gather(*[fetch_one(client, g) for g in batch])
            elapsed = time.monotonic() - start_time

            batch_fetched = sum(1 for r in results if r)
            batch_failed = len(batch) - batch_fetched
            fetched_count += batch_fetched
            failed_count += batch_failed

            logger.info(
                "  Done in %.1fs: %d fetched, %d not found. Total: %d/%d",
                elapsed, batch_fetched, batch_failed,
                fetched_count, fetched_count + failed_count,
            )

            if batch_start + batch_size < len(missing):
                await asyncio.sleep(1.0)

    return fetched_count


async def main_async(batch_size: int, max_total: int, concurrency: int) -> None:
    """Main async entry point."""
    if not DATA_FILE.exists():
        logger.error("Data file not found: %s", DATA_FILE)
        return

    with open(DATA_FILE) as f:
        payload = json.load(f)

    items = payload["data"]
    initial_missing = sum(1 for g in items if not g.get("recommendation"))
    logger.info(
        "Loaded %d guidance items (%d missing recommendations).",
        len(items), initial_missing,
    )

    if initial_missing == 0:
        logger.info("All items already have recommendations!")
        return

    # Build ref → item lookup
    items_by_ref = {g.get("reference", ""): g for g in items if g.get("reference")}

    # Phase 1: NICE API
    logger.info("Phase 1: Trying NICE API for structured recommendation data...")
    api_fetched = await fetch_via_api(items_by_ref)
    logger.info("Phase 1 complete: %d recommendations from API.", api_fetched)

    # Phase 2: Page scraping
    page_fetched = await fetch_via_pages(items, batch_size, max_total, concurrency)
    logger.info("Phase 2 complete: %d recommendations from pages.", page_fetched)

    total_fetched = api_fetched + page_fetched

    if total_fetched > 0:
        payload["record_count"] = len(items)
        with open(DATA_FILE, "w") as f:
            json.dump(payload, f, ensure_ascii=False, indent=None)
        logger.info("Saved enriched data to %s.", DATA_FILE)
    else:
        logger.warning("No recommendations could be fetched.")

    final_missing = sum(1 for g in items if not g.get("recommendation"))
    logger.info(
        "Final: %d/%d have recommendations (%d still missing, %d newly fetched).",
        len(items) - final_missing, len(items), final_missing, total_fetched,
    )


def main():
    parser = argparse.ArgumentParser(
        description="Fetch missing NICE recommendations (run from a machine with internet access)"
    )
    parser.add_argument("--batch-size", type=int, default=50, help="Requests per batch (default: 50)")
    parser.add_argument("--max-total", type=int, default=0, help="Max page fetches in Phase 2 (0 = all)")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent requests (default: 10)")
    args = parser.parse_args()

    asyncio.run(main_async(args.batch_size, args.max_total, args.concurrency))


if __name__ == "__main__":
    main()
