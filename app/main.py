"""FastAPI application for VAP Global Resources — Value, Access & Pricing."""

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

# Directory for bundled / cached HTA data files (one JSON per country code)
DATA_DIR = Path(__file__).parent.parent / "data"

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
        data_file = DATA_DIR / f"{code}.json"
        try:
            if agency.load_from_file(data_file):
                logger.info("%s (%s) loaded from local cache", agency.agency_abbreviation, code)
            else:
                await agency.load_data()
                agency.save_to_file(data_file)
                logger.info("%s (%s) data fetched and cached", agency.agency_abbreviation, code)
        except Exception:
            logger.exception("Failed to load %s data", agency.agency_abbreviation)

    # Build HTA cross-reference for analogue module
    try:
        await _build_hta_cross_reference()
    except Exception:
        logger.exception("Failed to build HTA cross-reference")

    logger.info("Startup complete.")
    yield


app = FastAPI(
    title="VAP Global Resources",
    description="Value, Access & Pricing — Search EMA-authorized medicines and find HTA assessment outcomes by country.",
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


@app.get("/resources")
async def resources_page():
    """Serve the Global Secondary Resources module page."""
    return FileResponse(str(STATIC_DIR / "resources.html"))


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
        data_file = DATA_DIR / f"{code}.json"
        try:
            await agency.load_data()
            agency.save_to_file(data_file)
        except Exception as e:
            errors.append(f"{agency.agency_abbreviation}: {e}")

    # Rebuild HTA cross-reference
    try:
        await _build_hta_cross_reference()
    except Exception as e:
        errors.append(f"HTA cross-reference: {e}")

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
