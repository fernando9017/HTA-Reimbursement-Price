"""Tests for the Canada CADTH adapter using sample data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.canada_cadth import (
    CanadaCADTH,
    _extract_date,
    _extract_project_number,
    _extract_recommendation,
    _extract_review_type,
    _normalise_recommendation,
    _parse_cadth_listing,
    _strip_html,
)


# Sample review data mimicking CADTH listing entries
SAMPLE_REVIEWS = [
    {
        "title": "Pembrolizumab (Keytruda) for non-small cell lung cancer",
        "url": "https://www.cadth.ca/reimbursement-reviews/pembrolizumab-keytruda-nsclc",
        "recommendation": "Reimburse with clinical criteria and/or conditions",
        "review_type": "pCODR (Oncology)",
        "date": "2024-06-15",
        "project_number": "SR0711-001",
    },
    {
        "title": "Nivolumab (Opdivo) for melanoma",
        "url": "https://www.cadth.ca/reimbursement-reviews/nivolumab-opdivo-melanoma",
        "recommendation": "Reimburse",
        "review_type": "pCODR (Oncology)",
        "date": "2023-11-20",
        "project_number": "SR0625-000",
    },
    {
        "title": "Trastuzumab deruxtecan (Enhertu) for breast cancer",
        "url": "https://www.cadth.ca/reimbursement-reviews/trastuzumab-deruxtecan-enhertu",
        "recommendation": "Do not reimburse",
        "review_type": "pCODR (Oncology)",
        "date": "2024-01-10",
        "project_number": "SR0800-000",
    },
    {
        "title": "Dupilumab (Dupixent) for atopic dermatitis",
        "url": "https://www.cadth.ca/reimbursement-reviews/dupilumab-dupixent-ad",
        "recommendation": "Reimburse with clinical criteria and/or conditions",
        "review_type": "Non-oncology",
        "date": "2023-09-05",
        "project_number": "SR0590-000",
    },
    {
        "title": "Ibrutinib (Imbruvica) for chronic lymphocytic leukaemia",
        "url": "https://www.cadth.ca/reimbursement-reviews/ibrutinib-imbruvica-cll",
        "recommendation": "Reimburse",
        "review_type": "pCODR (Oncology)",
        "date": "2022-03-15",
        "project_number": "",
    },
]


@pytest.fixture
def cadth_service():
    """Create a CADTH adapter pre-loaded with sample data."""
    service = CanadaCADTH()
    service._reviews = SAMPLE_REVIEWS
    service._loaded = True
    return service


# ── Search tests ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_by_substance(cadth_service):
    """Should find reviews by active substance."""
    results = await cadth_service.search_assessments("pembrolizumab")
    assert len(results) == 1
    assert "Keytruda" in results[0].product_name
    assert results[0].cadth_recommendation == "Reimburse with clinical criteria and/or conditions"


@pytest.mark.asyncio
async def test_search_by_substance_case_insensitive(cadth_service):
    """Search should be case-insensitive."""
    results = await cadth_service.search_assessments("NIVOLUMAB")
    assert len(results) == 1
    assert "Opdivo" in results[0].product_name


@pytest.mark.asyncio
async def test_search_by_product_name(cadth_service):
    """Should find reviews by product name."""
    results = await cadth_service.search_assessments("xxx", product_name="Enhertu")
    assert len(results) == 1
    assert results[0].cadth_recommendation == "Do not reimburse"


@pytest.mark.asyncio
async def test_search_no_results(cadth_service):
    """Should return empty for unknown substance."""
    results = await cadth_service.search_assessments("nonexistent-drug-xyz")
    assert results == []


@pytest.mark.asyncio
async def test_search_not_loaded():
    """Should return empty if data not loaded."""
    service = CanadaCADTH()
    results = await service.search_assessments("pembrolizumab")
    assert results == []


@pytest.mark.asyncio
async def test_result_fields(cadth_service):
    """Should populate all expected fields in results."""
    results = await cadth_service.search_assessments("dupilumab")
    assert len(results) == 1
    r = results[0]
    assert r.cadth_recommendation == "Reimburse with clinical criteria and/or conditions"
    assert r.cadth_review_type == "Non-oncology"
    assert r.cadth_project_number == "SR0590-000"
    assert r.opinion_date == "2023-09-05"
    assert r.assessment_url  # Should have a URL
    assert r.summary_en  # Should have a summary


@pytest.mark.asyncio
async def test_oncology_review_type(cadth_service):
    """Should correctly identify pCODR oncology reviews."""
    results = await cadth_service.search_assessments("ibrutinib")
    assert len(results) == 1
    assert results[0].cadth_review_type == "pCODR (Oncology)"


@pytest.mark.asyncio
async def test_deduplication(cadth_service):
    """Should deduplicate results by URL."""
    # Add a duplicate review
    cadth_service._reviews.append(SAMPLE_REVIEWS[0].copy())
    results = await cadth_service.search_assessments("pembrolizumab")
    assert len(results) == 1


# ── Recommendation normalisation tests ───────────────────────────────


def test_normalise_reimburse():
    assert _normalise_recommendation("Reimburse") == "Reimburse"
    assert _normalise_recommendation("reimburse") == "Reimburse"
    assert _normalise_recommendation("Recommend") == "Reimburse"


def test_normalise_conditional():
    result = _normalise_recommendation("Reimburse with clinical criteria")
    assert result == "Reimburse with clinical criteria and/or conditions"
    result = _normalise_recommendation("Reimburse with conditions")
    assert result == "Reimburse with clinical criteria and/or conditions"


def test_normalise_do_not_reimburse():
    assert _normalise_recommendation("Do not reimburse") == "Do not reimburse"
    assert _normalise_recommendation("Not recommended") == "Do not reimburse"


def test_normalise_unable():
    assert _normalise_recommendation("Unable to recommend") == "Unable to recommend"


def test_normalise_time_limited():
    assert _normalise_recommendation("Time-limited recommendation") == "Time-limited recommendation"
    assert _normalise_recommendation("time-limited") == "Time-limited recommendation"


def test_normalise_empty():
    assert _normalise_recommendation("") == ""


# ── HTML parsing tests ────────────────────────────────────────────────


def test_strip_html():
    assert _strip_html("<b>bold</b>") == "bold"
    assert _strip_html('<a href="#">link</a>') == "link"


def test_parse_cadth_listing_with_links():
    """Should parse review links from HTML."""
    html = """
    <div>
        <a href="/reimbursement-reviews/pembrolizumab-keytruda">
            Pembrolizumab (Keytruda) for NSCLC
        </a>
        <span>Final Recommendation: Reimburse with clinical criteria</span>
        <span>2024-06-15</span>
        <span>SR0711-001</span>
    </div>
    <div>
        <a href="/reimbursement-reviews/nivolumab-opdivo">
            Nivolumab (Opdivo) for melanoma
        </a>
        <span>pCODR recommendation: Reimburse</span>
        <span>2023-11-20</span>
    </div>
    """
    reviews = _parse_cadth_listing(html)
    assert len(reviews) == 2
    assert "Pembrolizumab" in reviews[0]["title"]
    assert reviews[0]["url"].endswith("/pembrolizumab-keytruda")


def test_extract_date_iso():
    assert _extract_date("Published: 2024-06-15") == "2024-06-15"


def test_extract_date_english():
    result = _extract_date("Published: January 10, 2024")
    assert result == "January 10, 2024"


def test_extract_date_none():
    assert _extract_date("no date here") == ""


def test_extract_project_number():
    assert _extract_project_number("Project: SR0711-001") == "SR0711-001"
    assert _extract_project_number("no project") == ""


def test_extract_review_type_pcodr():
    assert "pCODR" in _extract_review_type("pCODR recommendation", "")
    assert "pCODR" in _extract_review_type("", "Oncology drug review")


def test_extract_review_type_default():
    assert _extract_review_type("some text", "some title") == "Reimbursement Review"


def test_extract_recommendation():
    assert "reimburse" in _extract_recommendation(
        "Final Recommendation: Reimburse with clinical criteria"
    ).lower()


# ── File caching tests ───────────────────────────────────────────────


def test_save_and_load_from_file(cadth_service):
    """Should round-trip through JSON file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_file = Path(tmpdir) / "CA.json"
        cadth_service.save_to_file(data_file)

        assert data_file.exists()

        new_service = CanadaCADTH()
        loaded = new_service.load_from_file(data_file)

        assert loaded is True
        assert new_service.is_loaded
        assert len(new_service._reviews) == len(cadth_service._reviews)


def test_load_from_nonexistent_file():
    """Should return False for missing file."""
    service = CanadaCADTH()
    assert service.load_from_file(Path("/nonexistent/CA.json")) is False


# ── Properties tests ─────────────────────────────────────────────────


def test_properties():
    service = CanadaCADTH()
    assert service.country_code == "CA"
    assert service.country_name == "Canada"
    assert service.agency_abbreviation == "CADTH"
    assert "Canadian" in service.agency_full_name
    assert not service.is_loaded
