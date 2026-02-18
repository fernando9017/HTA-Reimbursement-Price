"""FastAPI application for HTA Reimbursement Price assessment lookup."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.models import AssessmentResponse, CountryInfo, MedicineResult
from app.services.ema_service import EMAService
from app.services.hta_agencies.base import HTAAgency
from app.services.hta_agencies.france_has import FranceHAS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Services ──────────────────────────────────────────────────────────

ema_service = EMAService()

# Registry of HTA agency adapters — add new countries here
hta_agencies: dict[str, HTAAgency] = {
    "FR": FranceHAS(),
    # "DE": GermanyGBA(),  # future
    # "GB": UKNICE(),      # future
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all data sources on startup."""
    logger.info("Loading data sources...")
    try:
        await ema_service.load_data()
        logger.info("EMA data loaded: %d medicines", ema_service.medicine_count)
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
    """Serve the frontend."""
    return FileResponse(str(STATIC_DIR / "index.html"))


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
        "agencies": {
            code: {
                "name": agency.agency_abbreviation,
                "loaded": agency.is_loaded,
            }
            for code, agency in hta_agencies.items()
        },
    }
