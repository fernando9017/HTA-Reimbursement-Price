"""Tests for the Netherlands ZIN adapter using sample data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.netherlands_zin import (
    NetherlandsZIN,
    _extract_date,
    _extract_drug_name,
    _extract_zin_recommendation,
    _normalise_recommendation,
    _parse_zin_listing,
    _strip_html,
)


# Sample assessment data mimicking ZIN pakketadvies entries
SAMPLE_ASSESSMENTS = [
    {
        "title": "Pakketadvies pembrolizumab (Keytruda) bij niet-kleincellig longcarcinoom",
        "drug_name": "pembrolizumab",
        "url": "https://www.zorginstituutnederland.nl/publicaties/adviezen/pembrolizumab-nsclc",
        "recommendation": "Positive",
        "assessment_type": "Pakketadvies",
        "date": "2024-03-15",
        "gvs_cluster": "",
        "gvs_reimbursed": "Yes",
    },
    {
        "title": "Pakketadvies nivolumab (Opdivo) bij melanoom",
        "drug_name": "nivolumab",
        "url": "https://www.zorginstituutnederland.nl/publicaties/adviezen/nivolumab-melanoom",
        "recommendation": "Positive",
        "assessment_type": "Pakketadvies",
        "date": "2023-11-20",
        "gvs_cluster": "Oncology",
        "gvs_reimbursed": "Yes",
    },
    {
        "title": "Pakketadvies trastuzumab deruxtecan (Enhertu) bij borstkanker",
        "drug_name": "trastuzumab deruxtecan",
        "url": "https://www.zorginstituutnederland.nl/publicaties/adviezen/trastuzumab-deruxtecan-breast",
        "recommendation": "Conditionally included",
        "assessment_type": "Pakketadvies",
        "date": "2024-06-10",
        "gvs_cluster": "",
        "gvs_reimbursed": "",
    },
    {
        "title": "GVS-advies dupilumab (Dupixent) bij atopische dermatitis",
        "drug_name": "dupilumab",
        "url": "https://www.zorginstituutnederland.nl/publicaties/adviezen/dupilumab-ad",
        "recommendation": "Negative",
        "assessment_type": "GVS-advies",
        "date": "2023-09-05",
        "gvs_cluster": "Dermatology",
        "gvs_reimbursed": "No",
    },
    {
        "title": "Pakketadvies ibrutinib (Imbruvica) bij chronische lymfatische leukemie",
        "drug_name": "ibrutinib",
        "url": "https://www.zorginstituutnederland.nl/publicaties/adviezen/ibrutinib-cll",
        "recommendation": "Positive",
        "assessment_type": "Pakketadvies",
        "date": "2022-05-20",
        "gvs_cluster": "Oncology",
        "gvs_reimbursed": "Yes",
    },
]


@pytest.fixture
def zin_service():
    """Create a ZIN adapter pre-loaded with sample data."""
    service = NetherlandsZIN()
    service._assessments = SAMPLE_ASSESSMENTS
    service._loaded = True
    return service


# ── Search tests ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_by_substance(zin_service):
    """Should find assessments by active substance."""
    results = await zin_service.search_assessments("pembrolizumab")
    assert len(results) == 1
    assert results[0].zin_recommendation == "Positive"


@pytest.mark.asyncio
async def test_search_case_insensitive(zin_service):
    """Search should be case-insensitive."""
    results = await zin_service.search_assessments("NIVOLUMAB")
    assert len(results) == 1
    assert "Opdivo" in results[0].product_name


@pytest.mark.asyncio
async def test_search_by_product_name(zin_service):
    """Should find assessments by product name."""
    results = await zin_service.search_assessments("xxx", product_name="Enhertu")
    assert len(results) == 1
    assert results[0].zin_recommendation == "Conditionally included"


@pytest.mark.asyncio
async def test_search_negative(zin_service):
    """Should return Negative recommendation correctly."""
    results = await zin_service.search_assessments("dupilumab")
    assert len(results) == 1
    assert results[0].zin_recommendation == "Negative"
    assert results[0].gvs_reimbursed == "No"


@pytest.mark.asyncio
async def test_search_conditional(zin_service):
    """Should return Conditionally included correctly."""
    results = await zin_service.search_assessments("trastuzumab deruxtecan")
    assert len(results) == 1
    assert results[0].zin_recommendation == "Conditionally included"


@pytest.mark.asyncio
async def test_search_no_results(zin_service):
    """Should return empty for unknown substance."""
    results = await zin_service.search_assessments("nonexistent-drug-xyz")
    assert results == []


@pytest.mark.asyncio
async def test_search_not_loaded():
    """Should return empty if data not loaded."""
    service = NetherlandsZIN()
    results = await service.search_assessments("pembrolizumab")
    assert results == []


@pytest.mark.asyncio
async def test_result_fields(zin_service):
    """Should populate all expected fields in results."""
    results = await zin_service.search_assessments("ibrutinib")
    assert len(results) == 1
    r = results[0]
    assert r.zin_recommendation == "Positive"
    assert r.gvs_cluster == "Oncology"
    assert r.gvs_reimbursed == "Yes"
    assert r.opinion_date == "2022-05-20"
    assert r.assessment_url
    assert r.summary_en


@pytest.mark.asyncio
async def test_deduplication(zin_service):
    """Should deduplicate results by URL."""
    zin_service._assessments.append(SAMPLE_ASSESSMENTS[0].copy())
    results = await zin_service.search_assessments("pembrolizumab")
    assert len(results) == 1


# ── Recommendation normalisation tests ───────────────────────────────


def test_normalise_positive():
    assert _normalise_recommendation("Positive") == "Positive"
    assert _normalise_recommendation("positief") == "Positive"


def test_normalise_negative():
    assert _normalise_recommendation("Negative") == "Negative"
    assert _normalise_recommendation("negatief") == "Negative"


def test_normalise_conditional():
    assert _normalise_recommendation("voorwaardelijk") == "Conditionally included"
    assert _normalise_recommendation("Conditional") == "Conditionally included"


def test_normalise_reimbursed():
    assert _normalise_recommendation("vergoed") == "Reimbursed (GVS)"
    assert _normalise_recommendation("niet vergoed") == "Not reimbursed"


def test_normalise_empty():
    assert _normalise_recommendation("") == ""


# ── Helper function tests ────────────────────────────────────────────


def test_strip_html():
    assert _strip_html("<b>bold</b>") == "bold"


def test_extract_drug_name_pakketadvies():
    result = _extract_drug_name("Pakketadvies pembrolizumab (Keytruda) bij longcarcinoom")
    # Should extract the drug name, not the full title
    assert "pembrolizumab" in result.lower()


def test_extract_drug_name_gvs():
    result = _extract_drug_name("GVS-advies dupilumab voor atopische dermatitis")
    assert "dupilumab" in result.lower()


def test_extract_date_iso():
    assert _extract_date("Published: 2024-03-15") == "2024-03-15"


def test_extract_date_dutch():
    result = _extract_date("15 maart 2024")
    assert result == "2024-03-15"


def test_extract_date_dd_mm_yyyy():
    result = _extract_date("Published: 15-03-2024")
    assert result == "2024-03-15"


def test_extract_date_none():
    assert _extract_date("no date here") == ""


def test_extract_zin_recommendation_positief():
    assert _extract_zin_recommendation("Het advies is positief.") == "Positive"


def test_extract_zin_recommendation_negatief():
    assert _extract_zin_recommendation("Het advies is negatief.") == "Negative"


def test_extract_zin_recommendation_voorwaardelijk():
    result = _extract_zin_recommendation("Voorwaardelijk positief advies.")
    assert result == "Conditionally included"


def test_extract_zin_recommendation_vergoed():
    result = _extract_zin_recommendation("Het middel wordt vergoed.")
    assert result == "Reimbursed (GVS)"


def test_extract_zin_recommendation_empty():
    assert _extract_zin_recommendation("no recommendation here") == ""


# ── File caching tests ───────────────────────────────────────────────


def test_save_and_load_from_file(zin_service):
    """Should round-trip through JSON file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_file = Path(tmpdir) / "NL.json"
        zin_service.save_to_file(data_file)

        assert data_file.exists()

        new_service = NetherlandsZIN()
        loaded = new_service.load_from_file(data_file)

        assert loaded is True
        assert new_service.is_loaded
        assert len(new_service._assessments) == len(zin_service._assessments)


def test_load_from_nonexistent_file():
    """Should return False for missing file."""
    service = NetherlandsZIN()
    assert service.load_from_file(Path("/nonexistent/NL.json")) is False


# ── Properties tests ─────────────────────────────────────────────────


def test_properties():
    service = NetherlandsZIN()
    assert service.country_code == "NL"
    assert service.country_name == "Netherlands"
    assert service.agency_abbreviation == "ZIN"
    assert "Zorginstituut" in service.agency_full_name
    assert not service.is_loaded
