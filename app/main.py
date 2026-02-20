"""FastAPI application for HTA Reimbursement Price assessment lookup."""

import logging
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.models import (
    AnalogueResponse,
    AnalogueResult,
    AssessmentResponse,
    AssessmentResult,
    CountryInfo,
    FilterOptions,
    MedicineResult,
)  # ATCPrefix imported via FilterOptions
from app.services.analogue_service import AnalogueService
from app.services.ema_service import EMAService
from app.services.hta_agencies.base import HTAAgency
from app.services.hta_agencies.france_has import FranceHAS
from app.services.hta_agencies.germany_gba import GermanyGBA
from app.services.hta_agencies.japan_pmda import JapanPMDA
from app.services.hta_agencies.spain_aemps import SpainAEMPS
from app.services.hta_agencies.uk_nice import UKNICE

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Services ──────────────────────────────────────────────────────────

ema_service = EMAService()
analogue_service = AnalogueService()

# Registry of HTA agency adapters — add new countries here
hta_agencies: dict[str, HTAAgency] = {
    "FR": FranceHAS(),
    "DE": GermanyGBA(),
    "GB": UKNICE(),
    "ES": SpainAEMPS(),
    "JP": JapanPMDA(),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all data sources on startup."""
    logger.info("Loading data sources...")
    try:
        await ema_service.load_data()
        logger.info("EMA data loaded: %d medicines", ema_service.medicine_count)
        # Feed raw EMA data into analogue service
        analogue_service.load_from_ema(ema_service.raw_medicines)
    except Exception:
        logger.exception("Failed to load EMA data — search will be unavailable until retry")

    for code, agency in hta_agencies.items():
        try:
            await agency.load_data()
            logger.info("%s (%s) data loaded", agency.agency_abbreviation, code)
        except Exception:
            logger.exception("Failed to load %s data", agency.agency_abbreviation)

    logger.info("Startup complete.")
    yield


app = FastAPI(
    title="HTA Reimbursement Price Finder",
    description="Search EMA-authorized medicines and find HTA assessment outcomes by country.",
    version="0.1.0",
    lifespan=lifespan,
)

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


@app.get("/api/search", response_model=list[MedicineResult])
async def search_medicines(
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
    """Look up HTA assessments for a substance in the specified country."""
    code = country_code.upper()
    agency = hta_agencies.get(code)
    if agency is None:
        available = ", ".join(hta_agencies.keys())
        raise HTTPException(404, f"Country '{code}' not available. Options: {available}")

    if not agency.is_loaded:
        raise HTTPException(503, f"{agency.agency_abbreviation} data is still loading.")

    assessments = await agency.search_assessments(substance, product_name=product or None)

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
async def reload_data():
    """Manually trigger a reload of all data sources."""
    errors = []

    try:
        await ema_service.load_data()
        analogue_service.load_from_ema(ema_service.raw_medicines)
    except Exception as e:
        errors.append(f"EMA: {e}")

    for code, agency in hta_agencies.items():
        try:
            await agency.load_data()
        except Exception as e:
            errors.append(f"{agency.agency_abbreviation}: {e}")

    return {
        "success": len(errors) == 0,
        "errors": errors,
        "ema_count": ema_service.medicine_count,
    }


@app.get("/api/status")
async def status():
    """Health check showing data loading status."""
    return {
        "ema_loaded": ema_service.is_loaded,
        "ema_count": ema_service.medicine_count,
        "analogue_loaded": analogue_service.is_loaded,
        "agencies": {
            code: {
                "name": agency.agency_abbreviation,
                "loaded": agency.is_loaded,
            }
            for code, agency in hta_agencies.items()
        },
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
    """Build a searchable text string from an assessment's relevant fields."""
    return " ".join([
        a.evaluation_reason,
        a.patient_group,
        a.smr_description,
        a.asmr_description,
    ]).lower()


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
    therapeutic_area: str = Query("", description="Filter by therapeutic area"),
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
    additional_monitoring: str = Query("", description="Additional monitoring: 'yes', 'no', ''"),
    prevalence_category: str = Query("", description="Prevalence category: 'ultra-rare', 'rare', 'non-rare', ''"),
    indication_keyword: str = Query("", description="Keyword in indication text"),
    limit: int = Query(200, ge=1, le=500),
):
    """Search for analogue medicines using multi-criteria filters."""
    if not analogue_service.is_loaded:
        raise HTTPException(503, "Analogue data is still loading. Please try again shortly.")

    results = analogue_service.search(
        therapeutic_area=therapeutic_area,
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
        additional_monitoring=additional_monitoring,
        prevalence_category=prevalence_category,
        indication_keyword=indication_keyword,
        limit=limit,
    )

    return AnalogueResponse(
        total=len(results),
        results=[AnalogueResult(**r) for r in results],
    )
