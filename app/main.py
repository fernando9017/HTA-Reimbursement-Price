"""FastAPI application for VAP Global Resources — Value, Access & Pricing."""

import asyncio
import json
import logging
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.models import (
    AdjudicacionResult,
    AEMPSAssessmentAnalysis,
    AEMPSDrugProfile,
    AEMPSFilterOptions,
    AEMPSSearchResponse,
    AnalogueResponse,
    AnalogueResult,
    AssessmentResponse,
    AssessmentResult,
    ClaveDetailResult,
    ClaveResult,
    CountryInfo,
    FilterOptions,
    GBAAssessmentAnalysis,
    GBADrugProfile,
    GBAFilterOptions,
    GBASearchResponse,
    HASAssessmentAnalysis,
    HASDrugProfile,
    HASFilterOptions,
    HASSearchResponse,
    InstitutionSummary,
    MedicineResult,
    MexicoAdjudicacionResponse,
    MexicoProcurementFilters,
    MexicoSearchResponse,
    NICEAssessmentAnalysis,
    NICEDrugProfile,
    NICEFilterOptions,
    NICESearchResponse,
    PriceHistoryResult,
    PriceVarianceResponse,
)  # ATCPrefix imported via FilterOptions
from app.config import OFFLINE_MODE
from app.services.analogue_service import AnalogueService
from app.services.ema_service import EMAService
from app.services.hta_agencies.base import HTAAgency
from app.services.france_hta import FranceHTAService
from app.services.germany_hta import GermanyHTAService
from app.services.mexico_procurement import MexicoProcurementService
from app.services.spain_aemps_hta import SpainAEMPSHTAService
from app.services.uk_nice_hta import UKNICEHTAService
from app.services.hta_agencies.france_has import FranceHAS
from app.services.hta_agencies.germany_gba import GermanyGBA
from app.services.hta_agencies.japan_pmda import JapanPMDA
from app.services.hta_agencies.spain_aemps import SpainAEMPS
from app.services.hta_agencies.uk_nice import UKNICE

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Directory for bundled / cached HTA data files (one JSON per country code)
DATA_DIR = Path(__file__).parent.parent / "data"
CURATED_FILE = DATA_DIR / "curated_assessments.json"

# ── Services ──────────────────────────────────────────────────────────

ema_service = EMAService()
analogue_service = AnalogueService()
mexico_service = MexicoProcurementService()

# Registry of HTA agency adapters — add new countries here
hta_agencies: dict[str, HTAAgency] = {
    "FR": FranceHAS(),
    "DE": GermanyGBA(),
    "GB": UKNICE(),
    "ES": SpainAEMPS(),
    "JP": JapanPMDA(),
}

# Germany HTA deep-dive service — wraps the G-BA adapter for richer analysis
germany_hta_service = GermanyHTAService(hta_agencies["DE"])

# France HTA deep-dive service — wraps the HAS adapter for richer analysis
france_hta_service = FranceHTAService(hta_agencies["FR"])

# UK NICE deep-dive service — wraps the NICE adapter for richer analysis
uk_nice_hta_service = UKNICEHTAService(hta_agencies["GB"])

# Spain AEMPS deep-dive service — wraps the AEMPS adapter for richer analysis
spain_aemps_hta_service = SpainAEMPSHTAService(hta_agencies["ES"])

# Curated assessment data — verified HTA outcomes that supplement live-scraped
# data.  Keyed by (lowercase substance, country_code) → list of AssessmentResult.
# Loaded from data/curated_assessments.json at startup.
_curated_assessments: dict[tuple[str, str], list[AssessmentResult]] = {}

# Data freshness: tracks when each data source was last successfully loaded
_data_loaded_at: dict[str, str] = {}


def load_curated_assessments(filepath: Path = CURATED_FILE) -> int:
    """Load curated assessment data from a JSON file.

    Returns the number of substance+country entries loaded.
    """
    _curated_assessments.clear()
    try:
        with open(filepath, encoding="utf-8") as fh:
            raw = json.load(fh)
    except FileNotFoundError:
        logger.warning("Curated assessments file not found: %s", filepath)
        return 0
    except Exception:
        logger.warning("Failed to read curated assessments from %s", filepath, exc_info=True)
        return 0

    count = 0
    for substance, countries in raw.items():
        if substance.startswith("_"):
            continue  # skip metadata keys like "_meta"
        substance_lower = substance.lower().strip()
        if not isinstance(countries, dict):
            continue
        for country_code, entries in countries.items():
            if not isinstance(entries, list):
                continue
            results = []
            for entry in entries:
                try:
                    results.append(AssessmentResult(**entry))
                except Exception:
                    logger.warning(
                        "Invalid curated entry for %s/%s: %s",
                        substance, country_code, entry,
                    )
            if results:
                _curated_assessments[(substance_lower, country_code.upper())] = results
                count += 1

    logger.info("Loaded %d curated assessment entries from %s", count, filepath)
    return count


def get_curated_assessments(substance: str, country_code: str) -> list[AssessmentResult]:
    """Return curated assessments for a substance+country, or empty list."""
    return _curated_assessments.get((substance.lower().strip(), country_code.upper()), [])


def _unique_key(a: AssessmentResult) -> str:
    """Generate a deduplication key for an assessment result."""
    # Use guidance/dossier reference + date as the key
    ref = a.guidance_reference or a.dossier_code or a.ipt_reference or a.cis_code or ""
    return f"{ref}|{a.opinion_date}|{a.assessment_url}".lower()


async def _build_hta_cross_reference() -> None:
    """Pre-compute HTA assessment summaries per substance for analogue cross-reference."""
    if not analogue_service.is_loaded:
        return

    loaded_countries: list[str] = []
    for code, agency in hta_agencies.items():
        if agency.is_loaded:
            loaded_countries.append(code)

    if not loaded_countries:
        return

    substances = analogue_service.unique_substances()
    summaries: dict[str, dict[str, dict]] = {}

    for substance in substances:
        subst_lower = substance.lower().strip()
        for code in loaded_countries:
            agency = hta_agencies[code]
            try:
                assessments = await agency.search_assessments(substance)
            except Exception:
                continue

            if not assessments:
                continue

            # Store ALL assessments so they can be matched to specific
            # indication segments later.  Each entry carries the rating
            # plus a concatenation of text fields useful for matching.
            assessment_list: list[dict] = []
            for a in assessments:
                indication_text = " ".join(filter(None, [
                    a.evaluation_reason,
                    a.patient_group,
                    a.smr_description,
                    a.asmr_description,
                    a.nice_recommendation,
                    a.summary_en,
                ]))

                rating = ""
                rating_detail = ""
                if code == "FR":
                    rating = a.smr_value or ""
                    rating_detail = f"ASMR {a.asmr_value}" if a.asmr_value else ""
                elif code == "DE":
                    rating = a.benefit_rating or ""
                    rating_detail = a.evidence_level or ""
                elif code == "GB":
                    rating = a.nice_recommendation or ""
                    rating_detail = a.guidance_reference or ""
                elif code == "ES":
                    rating = a.therapeutic_positioning or ""
                    rating_detail = a.ipt_reference or ""
                else:
                    rating = a.summary_en or ""

                assessment_list.append({
                    "date": a.opinion_date,
                    "rating": rating,
                    "rating_detail": rating_detail,
                    "indication_text": indication_text,
                })

            summaries.setdefault(subst_lower, {})[code] = {
                "agency": agency.agency_abbreviation,
                "assessments": assessment_list,
            }

    analogue_service.set_hta_summaries(summaries, loaded_countries)
    logger.info("HTA cross-reference built for %d substances", len(summaries))


MAX_AGENCY_RETRIES = 2


async def _background_ema_fetch(ema_cache_file: Path) -> None:
    """Fetch EMA data from the network in the background.

    Runs after the app is already serving so that the health check
    can respond immediately with cached HTA agency data.
    """
    try:
        await ema_service.load_data()
        logger.info("Background EMA fetch complete: %d medicines", ema_service.medicine_count)
        ema_service.save_to_file(ema_cache_file)
        analogue_service.load_from_ema(ema_service.raw_medicines)
        _data_loaded_at["EMA"] = datetime.now(timezone.utc).isoformat()

        # Update NICE brand mapping now that EMA data is available
        if hta_agencies["GB"].is_loaded:
            try:
                hta_agencies["GB"].set_brand_mapping(ema_service.raw_medicines)
            except Exception:
                logger.warning("Failed to set NICE brand mapping after EMA fetch", exc_info=True)

        # Rebuild HTA cross-reference with EMA data
        try:
            await _build_hta_cross_reference()
        except Exception:
            logger.warning("Failed to rebuild HTA cross-reference after EMA fetch", exc_info=True)
    except Exception:
        logger.exception("Background EMA fetch failed — EMA search unavailable until reload")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all data sources on startup.

    When OFFLINE_MODE is enabled (env var OFFLINE_MODE=1), the app uses
    only the bundled JSON files in data/ and never contacts remote sources.
    This makes startup instant and fully reliable on laptops without
    stable network connectivity.
    """
    if OFFLINE_MODE:
        logger.info("OFFLINE MODE enabled — using bundled data only")
    logger.info("Loading data sources...")
    ema_cache_file = DATA_DIR / "EMA.json"
    now = datetime.now(timezone.utc).isoformat()

    # 1) Try loading EMA from bundled/cached file first (fast, non-blocking)
    ema_loaded_from_cache = False
    if ema_service.load_from_file(ema_cache_file):
        suffix = " (offline)" if OFFLINE_MODE else " (from cache)"
        logger.info("EMA data loaded from cache: %d medicines", ema_service.medicine_count)
        analogue_service.load_from_ema(ema_service.raw_medicines)
        _data_loaded_at["EMA"] = now + suffix
        ema_loaded_from_cache = True
    elif OFFLINE_MODE:
        logger.error("No bundled EMA data — run download_databases.py to populate data/")

    for code, agency in hta_agencies.items():
        data_file = DATA_DIR / f"{code}.json"

        # 1) Try loading from local cache / bundled data first
        if agency.load_from_file(data_file):
            suffix = " (offline)" if OFFLINE_MODE else " (from cache)"
            logger.info("%s (%s) loaded from local data", agency.agency_abbreviation, code)
            _data_loaded_at[code] = now + suffix
            continue

        # In offline mode, skip remote fetching entirely
        if OFFLINE_MODE:
            logger.error(
                "%s (%s) data unavailable — no bundled file. "
                "Run download_databases.py to populate data/",
                agency.agency_abbreviation, code,
            )
            continue

        # 2) Fetch from remote with retry
        fetched = False
        for attempt in range(1, MAX_AGENCY_RETRIES + 1):
            try:
                await agency.load_data()
                if agency.is_loaded:
                    agency.save_to_file(data_file)
                    logger.info(
                        "%s (%s) data fetched and cached (attempt %d)",
                        agency.agency_abbreviation, code, attempt,
                    )
                fetched = True
                _data_loaded_at[code] = datetime.now(timezone.utc).isoformat()
                break
            except Exception:
                logger.warning(
                    "Attempt %d/%d to load %s data failed",
                    attempt, MAX_AGENCY_RETRIES, agency.agency_abbreviation,
                    exc_info=True,
                )

        # 3) If remote fetch failed, try cache as fallback
        if not fetched and not agency.is_loaded:
            if agency.load_from_file(data_file):
                logger.info(
                    "%s (%s) loaded from cache after remote failure",
                    agency.agency_abbreviation, code,
                )
                _data_loaded_at[code] = now + " (from cache)"
            else:
                logger.error(
                    "%s (%s) data unavailable — remote fetch failed and no valid cache",
                    agency.agency_abbreviation, code,
                )

    # Pass EMA brand ↔ substance mapping to the NICE adapter so it can
    # resolve brand-name searches (e.g. "Keytruda" → "pembrolizumab").
    if ema_service.is_loaded and hta_agencies["GB"].is_loaded:
        try:
            hta_agencies["GB"].set_brand_mapping(ema_service.raw_medicines)
        except Exception:
            logger.warning("Failed to set NICE brand mapping from EMA data", exc_info=True)

    # Load curated assessment data (supplements live-scraped data)
    load_curated_assessments()

    # Load Mexico procurement data
    mexico_file = DATA_DIR / "mexico_procurement.json"
    if mexico_service.load_from_file(mexico_file):
        logger.info("Mexico procurement data loaded: %d claves", mexico_service.clave_count)
    else:
        logger.warning("Mexico procurement data not available")

    # Build HTA cross-reference for analogue module (using cached data)
    try:
        await _build_hta_cross_reference()
    except Exception:
        logger.exception("Failed to build HTA cross-reference")

    logger.info("Startup complete — app is ready to serve requests.")

    # 2) Schedule background EMA network fetch if not loaded from cache
    #    and not in offline mode.  This runs AFTER startup so the health
    #    check can respond immediately using whatever cached data is available.
    if not OFFLINE_MODE and not ema_loaded_from_cache:
        asyncio.create_task(_background_ema_fetch(ema_cache_file))

    yield


# ── Rate Limiting ─────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="VAP Global Resources",
    description="Value, Access & Pricing — Search EMA-authorized medicines and find HTA assessment outcomes by country.",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ── API Routes ────────────────────────────────────────────────────────


@app.get("/")
async def index():
    """Serve the landing page."""
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/hta")
async def hta_page():
    """Serve the HTA & Reimbursement module page."""
    return FileResponse(str(STATIC_DIR / "hta.html"))


@app.get("/analogues")
async def analogues_page():
    """Serve the Analogue Selection module page."""
    return FileResponse(str(STATIC_DIR / "analogues.html"))


@app.get("/resources")
async def resources_page():
    """Serve the Global Secondary Resources module page."""
    return FileResponse(str(STATIC_DIR / "resources.html"))


@app.get("/mexico")
async def mexico_page():
    """Serve the Mexico Pharma Procurement module page."""
    return FileResponse(str(STATIC_DIR / "mexico.html"))


@app.get("/germany")
async def germany_page():
    """Serve the Germany HTA Deep-Dive module page."""
    return FileResponse(str(STATIC_DIR / "germany.html"))


@app.get("/france")
async def france_page():
    """Serve the France HAS Deep-Dive module page."""
    return FileResponse(str(STATIC_DIR / "france.html"))


@app.get("/uk-nice")
async def uk_nice_page():
    """Serve the UK NICE Deep-Dive module page."""
    return FileResponse(str(STATIC_DIR / "uk_nice.html"))


@app.get("/spain-aemps")
async def spain_aemps_page():
    """Serve the Spain AEMPS Deep-Dive module page."""
    return FileResponse(str(STATIC_DIR / "spain_aemps.html"))


@app.get("/hiv-landscape")
async def hiv_landscape_page():
    """Serve the Global HIV Landscape module page."""
    return FileResponse(str(STATIC_DIR / "hiv_landscape.html"))


@app.get("/api/search", response_model=list[MedicineResult])
@limiter.limit("30/minute")
async def search_medicines(
    request: Request,
    q: str = Query(..., min_length=2, description="Medicine name or active substance"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search the EMA database for medicines by name or active substance."""
    if not ema_service.is_loaded:
        raise HTTPException(503, "EMA data is still loading. Please try again shortly.")
    results = ema_service.search(q, limit=limit)
    return results


@app.get("/api/countries", response_model=list[CountryInfo])
async def list_countries():
    """List all available countries/agencies for HTA assessment lookup."""
    return [agency.get_country_info() for agency in hta_agencies.values()]


@app.get("/api/assessments/{country_code}", response_model=AssessmentResponse)
async def get_assessments(
    country_code: str,
    substance: str = Query(..., min_length=2, description="Active substance (INN)"),
    product: str = Query("", description="Optional product/brand name"),
    indication: str = Query("", description="Selected indication text to filter results"),
):
    """Look up HTA assessments for a substance in the specified country.

    Live-scraped data from the adapter is supplemented with curated
    assessment data when the adapter returns no results or misses known
    entries.  Curated data acts as a reliable fallback for drugs where
    live scraping is unreliable.
    """
    code = country_code.upper()
    agency = hta_agencies.get(code)
    if agency is None:
        available = ", ".join(hta_agencies.keys())
        raise HTTPException(404, f"Country '{code}' not available. Options: {available}")

    # Try live-scraped data first (skip if agency data never loaded)
    assessments: list[AssessmentResult] = []
    if agency.is_loaded:
        assessments = await agency.search_assessments(substance, product_name=product or None)

    # Supplement with curated data: add curated entries whose keys
    # don't already appear in the live results.
    curated = get_curated_assessments(substance, code)
    if curated:
        existing_keys = {_unique_key(a) for a in assessments}
        for entry in curated:
            if _unique_key(entry) not in existing_keys:
                assessments.append(entry)

    if not assessments and not agency.is_loaded:
        raise HTTPException(503, f"{agency.agency_abbreviation} data is still loading.")

    # Filter by selected indication if provided
    if indication.strip():
        assessments = _filter_by_indication(assessments, indication)

    return AssessmentResponse(
        country_code=code,
        country_name=agency.country_name,
        agency=agency.agency_abbreviation,
        active_substance=substance,
        assessments=assessments,
    )


@app.post("/api/reload")
@limiter.limit("5/minute")
async def reload_data(request: Request):
    """Manually trigger a reload of all data sources.

    In OFFLINE_MODE, reloads only from bundled files (no network calls).
    Also clears all AI analysis caches to prevent serving stale analyses
    generated from outdated assessment data.
    """
    errors = []
    ema_cache_file = DATA_DIR / "EMA.json"

    # Clear all AI analysis caches first — underlying data is changing
    from app.services.ai_analysis import clear_cache as clear_de_cache
    from app.services.france_ai_analysis import clear_cache as clear_fr_cache
    from app.services.uk_nice_ai_analysis import clear_cache as clear_uk_cache
    from app.services.spain_aemps_ai_analysis import clear_cache as clear_es_cache

    ai_cleared = (
        clear_de_cache() + clear_fr_cache()
        + clear_uk_cache() + clear_es_cache()
    )
    logger.info("Cleared %d total AI analysis cache entries on reload", ai_cleared)

    # Invalidate the France HTA substance profiles cache
    france_hta_service.invalidate_cache()

    now = datetime.now(timezone.utc).isoformat()

    if OFFLINE_MODE:
        # In offline mode, just re-read bundled files — no network calls
        if ema_service.load_from_file(ema_cache_file):
            analogue_service.load_from_ema(ema_service.raw_medicines)
            _data_loaded_at["EMA"] = now + " (offline)"
        else:
            errors.append("EMA: no bundled data file")

        for code, agency in hta_agencies.items():
            data_file = DATA_DIR / f"{code}.json"
            if agency.load_from_file(data_file):
                _data_loaded_at[code] = now + " (offline)"
            else:
                errors.append(f"{agency.agency_abbreviation}: no bundled data file")
    else:
        try:
            await ema_service.load_data()
            ema_service.save_to_file(ema_cache_file)
            analogue_service.load_from_ema(ema_service.raw_medicines)
            _data_loaded_at["EMA"] = now
        except Exception as e:
            errors.append(f"EMA: {e}")

        for code, agency in hta_agencies.items():
            data_file = DATA_DIR / f"{code}.json"
            try:
                await agency.load_data()
                if agency.is_loaded:
                    agency.save_to_file(data_file)
                    _data_loaded_at[code] = datetime.now(timezone.utc).isoformat()
            except Exception as e:
                errors.append(f"{agency.agency_abbreviation}: {e}")
                if not agency.is_loaded:
                    if agency.load_from_file(data_file):
                        _data_loaded_at[code] = datetime.now(timezone.utc).isoformat() + " (from cache)"
                        logger.info(
                            "%s (%s) reload: remote failed, loaded from cache",
                            agency.agency_abbreviation, code,
                        )

    # Refresh NICE brand mapping from EMA data
    if ema_service.is_loaded and hta_agencies["GB"].is_loaded:
        try:
            hta_agencies["GB"].set_brand_mapping(ema_service.raw_medicines)
        except Exception:
            logger.warning("Failed to refresh NICE brand mapping", exc_info=True)

    # Reload curated data
    load_curated_assessments()

    # Rebuild HTA cross-reference
    try:
        await _build_hta_cross_reference()
    except Exception as e:
        errors.append(f"HTA cross-reference: {e}")

    return {
        "success": len(errors) == 0,
        "errors": errors,
        "ema_count": ema_service.medicine_count,
        "ai_cache_cleared": ai_cleared,
        "offline_mode": OFFLINE_MODE,
    }


@app.get("/api/status")
async def status():
    """Health check showing data loading status and freshness timestamps."""
    return {
        "offline_mode": OFFLINE_MODE,
        "ema_loaded": ema_service.is_loaded,
        "ema_count": ema_service.medicine_count,
        "analogue_loaded": analogue_service.is_loaded,
        "mexico_loaded": mexico_service.is_loaded,
        "mexico_clave_count": mexico_service.clave_count,
        "ai_analysis_available": bool(os.environ.get("ANTHROPIC_API_KEY", "")),
        "agencies": {
            code: {
                "name": agency.agency_abbreviation,
                "loaded": agency.is_loaded,
                "loaded_at": _data_loaded_at.get(code, ""),
            }
            for code, agency in hta_agencies.items()
        },
        "data_loaded_at": _data_loaded_at,
    }


# ── Indication filtering helper ──────────────────────────────────────

# Common words to ignore when extracting keywords from indication text
_STOP_WORDS = frozenset({
    "the", "for", "and", "with", "who", "have", "has", "been", "that",
    "this", "from", "are", "were", "was", "will", "been", "being",
    "their", "which", "after", "prior", "other", "than", "also",
    "indicated", "treatment", "patients", "adult", "adults", "therapy",
    "used", "received", "given", "following", "either",
})


def _extract_keywords(text: str) -> set[str]:
    """Extract significant words (4+ chars, not stop words) from text."""
    return {
        w for w in re.findall(r"[a-zA-Z]{4,}", text.lower())
        if w not in _STOP_WORDS
    }


def _assessment_text(a: AssessmentResult) -> str:
    """Build a searchable text string from an assessment's relevant fields.

    Includes summary_en so that German assessments (whose other fields are in
    German) can still be matched via their English-language summary.
    """
    return " ".join(filter(None, [
        a.evaluation_reason,
        a.patient_group,
        a.smr_description,
        a.asmr_description,
        a.summary_en,
    ])).lower()


def _filter_by_indication(
    assessments: list[AssessmentResult],
    indication_text: str,
) -> list[AssessmentResult]:
    """Filter assessments by relevance to the selected indication.

    Extracts keywords from the indication, scores each assessment by how many
    keywords appear in its text fields, and keeps those with reasonable overlap.
    Falls back to returning all assessments if filtering yields nothing.
    """
    keywords = _extract_keywords(indication_text)
    if not keywords:
        return assessments

    scored: list[tuple[float, AssessmentResult]] = []
    for a in assessments:
        text = _assessment_text(a)
        matches = sum(1 for kw in keywords if kw in text)
        score = matches / len(keywords)
        scored.append((score, a))

    # Keep assessments that match at least 20% of keywords
    filtered = [a for score, a in scored if score >= 0.2]

    # Fall back to all assessments if the filter is too aggressive
    return filtered if filtered else assessments


# ── Analogue Selection Routes ────────────────────────────────────────


@app.get("/api/analogues/filters", response_model=FilterOptions)
async def analogue_filters():
    """Return available filter options for the analogue selection UI."""
    if not analogue_service.is_loaded:
        raise HTTPException(503, "Analogue data is still loading. Please try again shortly.")
    return analogue_service.get_filter_options()


@app.get("/api/analogues/search", response_model=AnalogueResponse)
async def search_analogues(
    therapeutic_area: list[str] = Query([], description="Filter by therapeutic area(s) — legacy text match"),
    therapeutic_category: str = Query("", description="Broad therapeutic category (e.g. 'Oncology')"),
    therapeutic_subcategory: str = Query("", description="Sub-category within category (e.g. 'Solid Tumours')"),
    orphan: str = Query("", description="Orphan status: 'yes', 'no', or '' (any)"),
    years: int = Query(0, ge=0, description="Years since approval (0 = all time)"),
    first_approval: str = Query("", description="First approval: 'yes', 'no', or '' (any)"),
    status: str = Query("", description="Authorisation status filter"),
    substance: str = Query("", description="Active substance name (partial match)"),
    name: str = Query("", description="Medicine name (partial match)"),
    exclude_generics: bool = Query(False, description="Exclude generic medicines"),
    exclude_biosimilars: bool = Query(False, description="Exclude biosimilar medicines"),
    atc_code: str = Query("", description="ATC code prefix (e.g. 'L01', 'L01FF')"),
    mah: str = Query("", description="Marketing authorisation holder (partial match)"),
    conditional_approval: str = Query("", description="Conditional approval: 'yes', 'no', ''"),
    exceptional_circumstances: str = Query("", description="Exceptional circumstances: 'yes', 'no', ''"),
    accelerated_assessment: str = Query("", description="Accelerated assessment: 'yes', 'no', ''"),
    new_active_substance: str = Query("", description="New active substance: 'yes', 'no', ''"),
    prevalence_category: str = Query("", description="Prevalence category: 'ultra-rare', 'rare', 'non-rare', ''"),
    indication_keyword: str = Query("", description="Keyword in indication text"),
    line_of_therapy: str = Query("", description="Line of therapy filter (e.g. '1L / First-line')"),
    treatment_setting: str = Query("", description="Treatment setting filter (e.g. 'Monotherapy', 'Combination')"),
    evidence_tier: str = Query("", description="Evidence tier filter (e.g. 'Standard', 'Conditional')"),
    hta_country: str = Query("", description="Only show medicines assessed by this HTA body (country code)"),
    limit: int = Query(200, ge=1, le=500),
):
    """Search for analogue medicines using multi-criteria filters."""
    if not analogue_service.is_loaded:
        raise HTTPException(503, "Analogue data is still loading. Please try again shortly.")

    # Support multiple therapeutic areas (OR logic) or single/empty
    area_filter = [a for a in therapeutic_area if a.strip()]

    results = analogue_service.search(
        therapeutic_areas=area_filter,
        therapeutic_category=therapeutic_category,
        therapeutic_subcategory=therapeutic_subcategory,
        orphan=orphan,
        years_since_approval=years,
        first_approval=first_approval,
        status=status,
        substance=substance,
        name=name,
        exclude_generics=exclude_generics,
        exclude_biosimilars=exclude_biosimilars,
        atc_code=atc_code,
        mah=mah,
        conditional_approval=conditional_approval,
        exceptional_circumstances=exceptional_circumstances,
        accelerated_assessment=accelerated_assessment,
        new_active_substance=new_active_substance,
        prevalence_category=prevalence_category,
        indication_keyword=indication_keyword,
        line_of_therapy=line_of_therapy,
        treatment_setting=treatment_setting,
        evidence_tier=evidence_tier,
        hta_country=hta_country,
        limit=limit,
    )

    return AnalogueResponse(
        total=len(results),
        results=[AnalogueResult(**r) for r in results],
    )


# ── Mexico Pharma Procurement Routes ──────────────────────────────


@app.get("/api/mexico/filters", response_model=MexicoProcurementFilters)
async def mexico_filters():
    """Return available filter options for the Mexico procurement module."""
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    return mexico_service.get_filter_options()


@app.get("/api/mexico/search", response_model=MexicoSearchResponse)
async def mexico_search_claves(
    q: str = Query("", description="Search by substance, description, or clave code"),
    therapeutic_group: str = Query("", description="Filter by therapeutic group"),
    source_type: str = Query("", description="Filter by source type: patente, generico, biotecnologico, fuente_unica"),
    atc_code: str = Query("", description="ATC code prefix filter"),
    cnis_only: bool = Query(False, description="Only show CNIS-listed claves"),
    limit: int = Query(100, ge=1, le=500),
):
    """Search Mexico procurement claves by substance, ATC, or description."""
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    return mexico_service.search_claves(
        query=q,
        therapeutic_group=therapeutic_group,
        source_type=source_type,
        atc_code=atc_code,
        cnis_only=cnis_only,
        limit=limit,
    )


@app.get("/api/mexico/adjudicaciones", response_model=MexicoAdjudicacionResponse)
async def mexico_adjudicaciones(
    cycle: str = Query("", description="Procurement cycle, e.g. '2025-2026'"),
    status: str = Query("", description="Award status: adjudicada, desierta, etc."),
    institution: str = Query("", description="Requesting institution (IMSS, ISSSTE, etc.)"),
    therapeutic_group: str = Query("", description="Therapeutic group filter"),
    source_type: str = Query("", description="Source type filter"),
    substance: str = Query("", description="Active substance (partial match)"),
    limit: int = Query(200, ge=1, le=500),
):
    """Search procurement awards (adjudicaciones) with filters."""
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    return mexico_service.search_adjudicaciones(
        cycle=cycle,
        status=status,
        institution=institution,
        therapeutic_group=therapeutic_group,
        source_type=source_type,
        substance=substance,
        limit=limit,
    )


@app.get("/api/mexico/prices/{clave}", response_model=PriceHistoryResult)
async def mexico_price_history(clave: str):
    """Get price history for a specific clave across procurement cycles."""
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    result = mexico_service.get_price_history(clave)
    if result is None:
        raise HTTPException(404, f"Clave '{clave}' not found")
    return result


@app.get("/api/mexico/opportunities", response_model=list[AdjudicacionResult])
async def mexico_opportunities(
    limit: int = Query(50, ge=1, le=200),
):
    """Find market opportunities: unadjudicated claves with unmet demand."""
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    return mexico_service.get_opportunities(limit=limit)


@app.get("/api/mexico/claves/{clave}", response_model=ClaveDetailResult)
async def mexico_clave_detail(clave: str):
    """Get full intelligence profile for a clave: molecule info, all awards, competitors."""
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    result = mexico_service.get_clave_detail(clave)
    if result is None:
        raise HTTPException(404, f"Clave '{clave}' not found")
    return result


@app.get("/api/mexico/institutions", response_model=list[InstitutionSummary])
async def mexico_institutions(
    cycle: str = Query("", description="Filter by procurement cycle"),
):
    """Get aggregated procurement breakdown per institution."""
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    return mexico_service.get_institution_breakdown(cycle=cycle)


@app.get("/api/mexico/price-variance", response_model=PriceVarianceResponse)
async def mexico_price_variance(
    cycle: str = Query("", description="Procurement cycle, e.g. '2025-2026'"),
    therapeutic_group: str = Query("", description="Therapeutic group filter"),
    source_type: str = Query("", description="Source type filter"),
    min_institutions: int = Query(2, ge=2, le=4, description="Min institutions to compare"),
):
    """Analyze cross-institutional price variance for the same drug.

    Shows how prices for identical claves differ across IMSS, ISSSTE, PEMEX,
    and IMSS-Bienestar, highlighting potential savings from price harmonization.
    """
    if not mexico_service.is_loaded:
        raise HTTPException(503, "Mexico procurement data is still loading.")
    return mexico_service.get_price_variance(
        cycle=cycle,
        therapeutic_group=therapeutic_group,
        source_type=source_type,
        min_institutions=min_institutions,
    )


# ── Germany HTA Deep-Dive endpoints ──────────────────────────────────


@app.get("/api/germany/filters", response_model=GBAFilterOptions)
async def germany_filters():
    """Available filter options for the Germany HTA deep-dive module."""
    if not germany_hta_service.is_loaded:
        raise HTTPException(503, "G-BA data is still loading.")
    return germany_hta_service.get_filter_options()


@app.get("/api/germany/drugs", response_model=GBASearchResponse)
async def germany_drug_list(
    q: str = Query("", description="Search by substance, trade name, or indication"),
    benefit_rating: str = Query("", description="Filter by benefit rating"),
    limit: int = Query(100, ge=1, le=500),
):
    """List drugs assessed by G-BA with optional search and benefit rating filter."""
    if not germany_hta_service.is_loaded:
        raise HTTPException(503, "G-BA data is still loading.")
    return germany_hta_service.search_drugs(
        query=q,
        benefit_rating=benefit_rating,
        limit=limit,
    )


@app.get("/api/germany/drugs/{substance}", response_model=GBADrugProfile)
async def germany_drug_profile(substance: str):
    """Get the full G-BA assessment profile for an active substance.

    Returns only current (non-superseded) assessments, with per-subpopulation
    benefit ratings, evidence levels, and comparator therapies.
    """
    if not germany_hta_service.is_loaded:
        raise HTTPException(503, "G-BA data is still loading.")
    profile = germany_hta_service.get_drug_profile(substance)
    if profile is None:
        raise HTTPException(404, f"No G-BA assessments found for '{substance}'.")
    return profile


@app.get("/api/germany/analyze/{decision_id}", response_model=GBAAssessmentAnalysis)
@limiter.limit("10/minute")
async def germany_analyze_assessment(request: Request, decision_id: str):
    """Generate an AI-powered analysis for a specific G-BA assessment.

    Uses Claude Haiku to produce structured insights: line of therapy,
    positive/negative arguments, clinical context, and market implications.
    Results are cached to minimise API costs.
    """
    if not germany_hta_service.is_loaded:
        raise HTTPException(503, "G-BA data is still loading.")

    # Find the assessment by decision_id
    profile_data = germany_hta_service.find_assessment_by_id(decision_id)
    if profile_data is None:
        raise HTTPException(404, f"Assessment '{decision_id}' not found.")

    from app.services.ai_analysis import analyze_assessment

    try:
        analysis = await analyze_assessment(
            decision_id=profile_data["decision_id"],
            trade_name=profile_data["trade_name"],
            active_substance=profile_data["active_substance"],
            indication=profile_data["indication"],
            decision_date=profile_data["decision_date"],
            assessment_url=profile_data["assessment_url"],
            subpopulations=profile_data["subpopulations"],
        )
        return analysis
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        logger.error("AI analysis failed for %s: %s", decision_id, e)
        raise HTTPException(500, "AI analysis failed. Please try again later.")


# ── France HAS Deep-Dive endpoints ──────────────────────────────────


@app.get("/api/france/filters", response_model=HASFilterOptions)
async def france_filters():
    """Available filter options for the France HAS deep-dive module."""
    if not france_hta_service.is_loaded:
        raise HTTPException(503, "HAS data is still loading.")
    return france_hta_service.get_filter_options()


@app.get("/api/france/drugs", response_model=HASSearchResponse)
async def france_drug_list(
    q: str = Query("", description="Search by substance or trade name"),
    smr_rating: str = Query("", description="Filter by SMR rating"),
    asmr_rating: str = Query("", description="Filter by ASMR rating"),
    limit: int = Query(100, ge=1, le=500),
):
    """List drugs assessed by HAS with optional search and rating filters."""
    if not france_hta_service.is_loaded:
        raise HTTPException(503, "HAS data is still loading.")
    return france_hta_service.search_drugs(
        query=q,
        smr_rating=smr_rating,
        asmr_rating=asmr_rating,
        limit=limit,
    )


@app.get("/api/france/drugs/{substance}", response_model=HASDrugProfile)
async def france_drug_profile(substance: str):
    """Get the full HAS assessment profile for an active substance.

    Returns all CT opinions with merged SMR/ASMR data, grouped by dossier code.
    """
    if not france_hta_service.is_loaded:
        raise HTTPException(503, "HAS data is still loading.")
    profile = france_hta_service.get_drug_profile(substance)
    if profile is None:
        raise HTTPException(404, f"No HAS assessments found for '{substance}'.")
    return profile


@app.get("/api/france/analyze/{dossier_code}", response_model=HASAssessmentAnalysis)
@limiter.limit("10/minute")
async def france_analyze_assessment(request: Request, dossier_code: str):
    """Generate an AI-powered analysis for a specific HAS CT opinion.

    Uses Claude Haiku to produce structured insights: SMR/ASMR rationale,
    clinical context, and market implications.
    Results are cached to minimise API costs.
    """
    if not france_hta_service.is_loaded:
        raise HTTPException(503, "HAS data is still loading.")

    # Find the assessment by dossier code
    profile_data = france_hta_service.find_assessment_by_dossier(dossier_code)
    if profile_data is None:
        raise HTTPException(404, f"Assessment '{dossier_code}' not found.")

    from app.services.france_ai_analysis import analyze_france_assessment

    try:
        analysis = await analyze_france_assessment(
            dossier_code=profile_data["dossier_code"],
            trade_name=profile_data["trade_name"],
            active_substance=profile_data["active_substance"],
            evaluation_reason=profile_data["evaluation_reason"],
            opinion_date=profile_data["opinion_date"],
            assessment_url=profile_data["assessment_url"],
            smr_value=profile_data["smr_value"],
            smr_description=profile_data["smr_description"],
            asmr_value=profile_data["asmr_value"],
            asmr_description=profile_data["asmr_description"],
        )
        return analysis
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        logger.error("AI analysis failed for %s: %s", dossier_code, e)
        raise HTTPException(500, "AI analysis failed. Please try again later.")


# ── UK NICE Deep-Dive endpoints ───────────────────────────────────


@app.get("/api/uk-nice/filters", response_model=NICEFilterOptions)
async def uk_nice_filters():
    """Available filter options for the UK NICE deep-dive module."""
    if not uk_nice_hta_service.is_loaded:
        raise HTTPException(503, "NICE data is still loading.")
    return uk_nice_hta_service.get_filter_options()


@app.get("/api/uk-nice/drugs", response_model=NICESearchResponse)
async def uk_nice_drug_list(
    q: str = Query("", description="Search by substance or guidance title"),
    guidance_type: str = Query("", description="Filter by guidance type"),
    recommendation: str = Query("", description="Filter by recommendation"),
    limit: int = Query(100, ge=1, le=500),
):
    """List drugs with NICE guidance with optional search and filters."""
    if not uk_nice_hta_service.is_loaded:
        raise HTTPException(503, "NICE data is still loading.")
    return uk_nice_hta_service.search_drugs(
        query=q,
        guidance_type=guidance_type,
        recommendation=recommendation,
        limit=limit,
    )


@app.get("/api/uk-nice/drugs/{substance}", response_model=NICEDrugProfile)
async def uk_nice_drug_profile(substance: str):
    """Get the full NICE guidance profile for an active substance."""
    if not uk_nice_hta_service.is_loaded:
        raise HTTPException(503, "NICE data is still loading.")
    profile = uk_nice_hta_service.get_drug_profile(substance)
    if profile is None:
        raise HTTPException(404, f"No NICE guidance found for '{substance}'.")
    return profile


@app.get("/api/uk-nice/analyze/{guidance_ref}", response_model=NICEAssessmentAnalysis)
@limiter.limit("10/minute")
async def uk_nice_analyze_guidance(request: Request, guidance_ref: str):
    """Generate an AI-powered analysis for a specific NICE guidance item."""
    if not uk_nice_hta_service.is_loaded:
        raise HTTPException(503, "NICE data is still loading.")

    guidance_data = uk_nice_hta_service.find_guidance_by_reference(guidance_ref)
    if guidance_data is None:
        raise HTTPException(404, f"Guidance '{guidance_ref}' not found.")

    from app.services.uk_nice_ai_analysis import analyze_nice_guidance

    try:
        analysis = await analyze_nice_guidance(
            guidance_reference=guidance_data["guidance_reference"],
            title=guidance_data["title"],
            active_substance=guidance_data["active_substance"],
            guidance_type=guidance_data["guidance_type"],
            recommendation=guidance_data["recommendation"],
            published_date=guidance_data["published_date"],
            assessment_url=guidance_data["assessment_url"],
        )
        return analysis
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        logger.error("AI analysis failed for %s: %s", guidance_ref, e)
        raise HTTPException(500, "AI analysis failed. Please try again later.")


# ── Spain AEMPS Deep-Dive endpoints ──────────────────────────────


@app.get("/api/spain-aemps/filters", response_model=AEMPSFilterOptions)
async def spain_aemps_filters():
    """Available filter options for the Spain AEMPS deep-dive module."""
    if not spain_aemps_hta_service.is_loaded:
        raise HTTPException(503, "AEMPS data is still loading.")
    return spain_aemps_hta_service.get_filter_options()


@app.get("/api/spain-aemps/drugs", response_model=AEMPSSearchResponse)
async def spain_aemps_drug_list(
    q: str = Query("", description="Search by substance or IPT title"),
    positioning: str = Query("", description="Filter by therapeutic positioning"),
    limit: int = Query(100, ge=1, le=500),
):
    """List drugs with AEMPS IPT reports with optional search and filters."""
    if not spain_aemps_hta_service.is_loaded:
        raise HTTPException(503, "AEMPS data is still loading.")
    return spain_aemps_hta_service.search_drugs(
        query=q,
        positioning=positioning,
        limit=limit,
    )


@app.get("/api/spain-aemps/drugs/{substance}", response_model=AEMPSDrugProfile)
async def spain_aemps_drug_profile(substance: str):
    """Get the full AEMPS IPT profile for an active substance."""
    if not spain_aemps_hta_service.is_loaded:
        raise HTTPException(503, "AEMPS data is still loading.")
    profile = spain_aemps_hta_service.get_drug_profile(substance)
    if profile is None:
        raise HTTPException(404, f"No AEMPS IPT reports found for '{substance}'.")
    return profile


@app.get("/api/spain-aemps/analyze/{ipt_ref}", response_model=AEMPSAssessmentAnalysis)
@limiter.limit("10/minute")
async def spain_aemps_analyze_ipt(request: Request, ipt_ref: str):
    """Generate an AI-powered analysis for a specific AEMPS IPT report."""
    if not spain_aemps_hta_service.is_loaded:
        raise HTTPException(503, "AEMPS data is still loading.")

    ipt_data = spain_aemps_hta_service.find_ipt_by_reference(ipt_ref)
    if ipt_data is None:
        raise HTTPException(404, f"IPT '{ipt_ref}' not found.")

    from app.services.spain_aemps_ai_analysis import analyze_spain_ipt

    try:
        analysis = await analyze_spain_ipt(
            ipt_reference=ipt_data["ipt_reference"],
            title=ipt_data["title"],
            active_substance=ipt_data["active_substance"],
            positioning=ipt_data["positioning"],
            published_date=ipt_data["published_date"],
            assessment_url=ipt_data["assessment_url"],
        )
        return analysis
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        logger.error("AI analysis failed for %s: %s", ipt_ref, e)
        raise HTTPException(500, "AI analysis failed. Please try again later.")
