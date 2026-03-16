"""Tests for the Australia PBAC adapter using sample data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.australia_pbac import (
    AustraliaPBAC,
    _find_meeting_urls,
    _normalise_recommendation,
    _parse_pbac_meeting,
    _strip_html,
)


# Sample outcome data mimicking PBAC meeting entries
SAMPLE_OUTCOMES = [
    {
        "drug_name": "Pembrolizumab",
        "title": "Pembrolizumab (Keytruda) for non-small cell lung cancer",
        "recommendation": "Recommended",
        "submission_type": "Major submission",
        "meeting": "March 2024",
        "date": "March 2024",
        "url": "https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings/pbac-outcomes/2024-03/pembrolizumab",
        "pbs_code": "12345X",
    },
    {
        "drug_name": "Nivolumab",
        "title": "Nivolumab (Opdivo) for melanoma",
        "recommendation": "Recommended",
        "submission_type": "Major submission",
        "meeting": "November 2023",
        "date": "November 2023",
        "url": "https://www.pbs.gov.au/pbac-outcomes/2023-11/nivolumab",
        "pbs_code": "12346Y",
    },
    {
        "drug_name": "Trastuzumab deruxtecan",
        "title": "Trastuzumab deruxtecan (Enhertu) for breast cancer",
        "recommendation": "Not recommended",
        "submission_type": "Major submission",
        "meeting": "July 2024",
        "date": "July 2024",
        "url": "https://www.pbs.gov.au/pbac-outcomes/2024-07/trastuzumab-deruxtecan",
        "pbs_code": "",
    },
    {
        "drug_name": "Dupilumab",
        "title": "Dupilumab (Dupixent) for atopic dermatitis",
        "recommendation": "Deferred",
        "submission_type": "Minor submission",
        "meeting": "March 2024",
        "date": "March 2024",
        "url": "https://www.pbs.gov.au/pbac-outcomes/2024-03/dupilumab",
        "pbs_code": "",
    },
    {
        "drug_name": "Ibrutinib",
        "title": "Ibrutinib (Imbruvica) for chronic lymphocytic leukaemia",
        "recommendation": "Recommended",
        "submission_type": "Major submission",
        "meeting": "November 2023",
        "date": "November 2023",
        "url": "https://www.pbs.gov.au/pbac-outcomes/2023-11/ibrutinib",
        "pbs_code": "12347Z",
    },
]


@pytest.fixture
def pbac_service():
    """Create a PBAC adapter pre-loaded with sample data."""
    service = AustraliaPBAC()
    service._outcomes = SAMPLE_OUTCOMES
    service._loaded = True
    return service


# ── Search tests ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_by_substance(pbac_service):
    """Should find outcomes by active substance."""
    results = await pbac_service.search_assessments("pembrolizumab")
    assert len(results) == 1
    assert results[0].pbac_recommendation == "Recommended"


@pytest.mark.asyncio
async def test_search_case_insensitive(pbac_service):
    """Search should be case-insensitive."""
    results = await pbac_service.search_assessments("NIVOLUMAB")
    assert len(results) == 1
    assert "Opdivo" in results[0].product_name


@pytest.mark.asyncio
async def test_search_by_product_name(pbac_service):
    """Should find outcomes by product name."""
    results = await pbac_service.search_assessments("xxx", product_name="Enhertu")
    assert len(results) == 1
    assert results[0].pbac_recommendation == "Not recommended"


@pytest.mark.asyncio
async def test_search_not_recommended(pbac_service):
    """Should return Not recommended status correctly."""
    results = await pbac_service.search_assessments("trastuzumab deruxtecan")
    assert len(results) == 1
    assert results[0].pbac_recommendation == "Not recommended"


@pytest.mark.asyncio
async def test_search_deferred(pbac_service):
    """Should return Deferred status correctly."""
    results = await pbac_service.search_assessments("dupilumab")
    assert len(results) == 1
    assert results[0].pbac_recommendation == "Deferred"


@pytest.mark.asyncio
async def test_search_no_results(pbac_service):
    """Should return empty for unknown substance."""
    results = await pbac_service.search_assessments("nonexistent-drug-xyz")
    assert results == []


@pytest.mark.asyncio
async def test_search_not_loaded():
    """Should return empty if data not loaded."""
    service = AustraliaPBAC()
    results = await service.search_assessments("pembrolizumab")
    assert results == []


@pytest.mark.asyncio
async def test_result_fields(pbac_service):
    """Should populate all expected fields in results."""
    results = await pbac_service.search_assessments("ibrutinib")
    assert len(results) == 1
    r = results[0]
    assert r.pbac_recommendation == "Recommended"
    assert r.pbac_type == "Major submission"
    assert r.pbs_code == "12347Z"
    assert r.pbac_meeting == "November 2023"
    assert r.assessment_url
    assert r.summary_en


@pytest.mark.asyncio
async def test_deduplication(pbac_service):
    """Should deduplicate results by URL."""
    pbac_service._outcomes.append(SAMPLE_OUTCOMES[0].copy())
    results = await pbac_service.search_assessments("pembrolizumab")
    assert len(results) == 1


# ── Recommendation normalisation tests ───────────────────────────────


def test_normalise_recommended():
    assert _normalise_recommendation("Recommended") == "Recommended"
    assert _normalise_recommendation("recommended") == "Recommended"
    assert _normalise_recommendation("Accepted") == "Recommended"


def test_normalise_not_recommended():
    assert _normalise_recommendation("Not recommended") == "Not recommended"
    assert _normalise_recommendation("Rejected") == "Not recommended"


def test_normalise_deferred():
    assert _normalise_recommendation("Deferred") == "Deferred"
    assert _normalise_recommendation("deferred") == "Deferred"


def test_normalise_with_restrictions():
    result = _normalise_recommendation("Recommended with restrictions")
    assert result == "Recommended (with restrictions)"


def test_normalise_empty():
    assert _normalise_recommendation("") == ""


# ── HTML parsing tests ────────────────────────────────────────────────


def test_strip_html():
    assert _strip_html("<b>bold</b>") == "bold"


def test_find_meeting_urls():
    html = """
    <a href="/info/industry/listing/elements/pbac-meetings/pbac-outcomes/2024-03">
        March 2024
    </a>
    <a href="/info/industry/listing/elements/pbac-meetings/pbac-outcomes/2023-11">
        November 2023
    </a>
    """
    urls = _find_meeting_urls(html)
    assert len(urls) == 2
    assert "2024-03" in urls[0]


def test_parse_pbac_meeting_table():
    """Should parse drug recommendations from meeting page tables."""
    html = """
    <html>
    <head><title>PBAC Outcomes - March 2024</title></head>
    <body>
    <table>
        <tr>
            <td>Pembrolizumab (Keytruda)</td>
            <td>Recommended</td>
            <td>Major submission</td>
        </tr>
        <tr>
            <td>Nivolumab (Opdivo)</td>
            <td>Not recommended</td>
            <td>Major submission</td>
        </tr>
    </table>
    </body>
    </html>
    """
    outcomes = _parse_pbac_meeting(html, "https://www.pbs.gov.au/test")
    assert len(outcomes) == 2
    assert outcomes[0]["drug_name"] == "Pembrolizumab (Keytruda)"
    assert outcomes[0]["recommendation"] == "Recommended"


def test_parse_pbac_meeting_list_format():
    """Should parse drug recommendations from list-based format."""
    html = """
    <html>
    <head><title>PBAC Outcomes - July 2024</title></head>
    <body>
    <h3>Recommended</h3>
    <ul>
        <li>Pembrolizumab for NSCLC</li>
        <li>Nivolumab for melanoma</li>
    </ul>
    <h3>Not Recommended</h3>
    <ul>
        <li>Trastuzumab deruxtecan for breast cancer</li>
    </ul>
    </body>
    </html>
    """
    outcomes = _parse_pbac_meeting(html, "https://www.pbs.gov.au/test")
    assert len(outcomes) >= 3


# ── File caching tests ───────────────────────────────────────────────


def test_save_and_load_from_file(pbac_service):
    """Should round-trip through JSON file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_file = Path(tmpdir) / "AU.json"
        pbac_service.save_to_file(data_file)

        assert data_file.exists()

        new_service = AustraliaPBAC()
        loaded = new_service.load_from_file(data_file)

        assert loaded is True
        assert new_service.is_loaded
        assert len(new_service._outcomes) == len(pbac_service._outcomes)


def test_load_from_nonexistent_file():
    """Should return False for missing file."""
    service = AustraliaPBAC()
    assert service.load_from_file(Path("/nonexistent/AU.json")) is False


# ── Properties tests ─────────────────────────────────────────────────


def test_properties():
    service = AustraliaPBAC()
    assert service.country_code == "AU"
    assert service.country_name == "Australia"
    assert service.agency_abbreviation == "PBAC"
    assert "Pharmaceutical Benefits" in service.agency_full_name
    assert not service.is_loaded
