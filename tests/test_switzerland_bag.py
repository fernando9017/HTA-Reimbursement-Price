"""Tests for the Switzerland BAG adapter using sample data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.switzerland_bag import (
    SwitzerlandBAG,
    _normalise_listing,
    _parse_bag_drugs_page,
    _parse_sl_listing,
    _strip_html,
)


# Sample medicine data mimicking SL entries
SAMPLE_MEDICINES = [
    {
        "name": "KEYTRUDA Inf Konz 25 mg/ml",
        "substance": "Pembrolizumab",
        "price": "4285.55",
        "limitation": "Non-small cell lung cancer, 1L, PD-L1 TPS ≥50%",
        "status": "Listed",
        "url": "http://www.spezialitaetenliste.ch/ShowPreparations.aspx?q=keytruda",
        "sl_number": "67890",
        "date": "2024-01-01",
        "application_type": "SL Listing",
    },
    {
        "name": "OPDIVO Inf Konz 10 mg/ml",
        "substance": "Nivolumab",
        "price": "1234.00",
        "limitation": "",
        "status": "Listed",
        "url": "http://www.spezialitaetenliste.ch/ShowPreparations.aspx?q=opdivo",
        "sl_number": "67891",
        "date": "2023-07-01",
        "application_type": "SL Listing",
    },
    {
        "name": "ENHERTU Pulv 100 mg",
        "substance": "Trastuzumab deruxtecan",
        "price": "5600.00",
        "limitation": "HER2+ breast cancer, prior treatment required",
        "status": "Listed",
        "url": "http://www.spezialitaetenliste.ch/ShowPreparations.aspx?q=enhertu",
        "sl_number": "67892",
        "date": "2024-04-01",
        "application_type": "SL Listing",
    },
    {
        "name": "DUPIXENT Inj Lös 300 mg/2ml",
        "substance": "Dupilumab",
        "price": "1890.50",
        "limitation": "Severe atopic dermatitis, prior systemic therapy",
        "status": "Listed",
        "url": "http://www.spezialitaetenliste.ch/ShowPreparations.aspx?q=dupixent",
        "sl_number": "67893",
        "date": "2023-10-01",
        "application_type": "SL Listing",
    },
    {
        "name": "IMBRUVICA Kaps 140 mg",
        "substance": "Ibrutinib",
        "price": "6100.00",
        "limitation": "CLL, MCL",
        "status": "Listed",
        "url": "http://www.spezialitaetenliste.ch/ShowPreparations.aspx?q=imbruvica",
        "sl_number": "67894",
        "date": "2022-01-01",
        "application_type": "SL Listing",
    },
]


@pytest.fixture
def bag_service():
    """Create a BAG adapter pre-loaded with sample data."""
    service = SwitzerlandBAG()
    service._medicines = SAMPLE_MEDICINES
    service._loaded = True
    return service


# ── Search tests ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_by_substance(bag_service):
    """Should find medicines by active substance."""
    results = await bag_service.search_assessments("pembrolizumab")
    assert len(results) == 1
    assert results[0].sl_listed == "Yes"
    assert "CHF" in results[0].sl_price


@pytest.mark.asyncio
async def test_search_case_insensitive(bag_service):
    """Search should be case-insensitive."""
    results = await bag_service.search_assessments("NIVOLUMAB")
    assert len(results) == 1
    assert "OPDIVO" in results[0].product_name


@pytest.mark.asyncio
async def test_search_by_product_name(bag_service):
    """Should find medicines by product name."""
    results = await bag_service.search_assessments("xxx", product_name="ENHERTU")
    assert len(results) == 1
    assert results[0].sl_listed == "Yes"


@pytest.mark.asyncio
async def test_search_with_limitation(bag_service):
    """Should include limitation text in results."""
    results = await bag_service.search_assessments("pembrolizumab")
    assert len(results) == 1
    assert results[0].sl_limitation
    assert "lung cancer" in results[0].sl_limitation.lower()


@pytest.mark.asyncio
async def test_search_no_results(bag_service):
    """Should return empty for unknown substance."""
    results = await bag_service.search_assessments("nonexistent-drug-xyz")
    assert results == []


@pytest.mark.asyncio
async def test_search_not_loaded():
    """Should return empty if data not loaded."""
    service = SwitzerlandBAG()
    results = await service.search_assessments("pembrolizumab")
    assert results == []


@pytest.mark.asyncio
async def test_result_fields(bag_service):
    """Should populate all expected fields in results."""
    results = await bag_service.search_assessments("ibrutinib")
    assert len(results) == 1
    r = results[0]
    assert r.sl_listed == "Yes"
    assert "CHF" in r.sl_price
    assert r.sl_limitation == "CLL, MCL"
    assert r.opinion_date == "2022-01-01"
    assert r.assessment_url
    assert r.summary_en


@pytest.mark.asyncio
async def test_deduplication(bag_service):
    """Should deduplicate results by SL number."""
    bag_service._medicines.append(SAMPLE_MEDICINES[0].copy())
    results = await bag_service.search_assessments("pembrolizumab")
    assert len(results) == 1


# ── Listing normalisation tests ──────────────────────────────────────


def test_normalise_listed():
    assert _normalise_listing("Listed") == "Listed (SL)"
    assert _normalise_listing("gelistet") == "Listed (SL)"
    assert _normalise_listing("aufgenommen") == "Listed (SL)"


def test_normalise_limitation():
    assert _normalise_listing("Limitiert") == "Listed with limitation"
    assert _normalise_listing("limitation") == "Listed with limitation"


def test_normalise_not_listed():
    assert _normalise_listing("Nicht gelistet") == "Not listed"
    assert _normalise_listing("Not listed") == "Not listed"


def test_normalise_delisted():
    assert _normalise_listing("Gestrichen") == "Delisted"
    assert _normalise_listing("delisted") == "Delisted"


def test_normalise_empty():
    assert _normalise_listing("") == ""


# ── HTML parsing tests ────────────────────────────────────────────────


def test_strip_html():
    assert _strip_html("<b>bold</b>") == "bold"


def test_parse_sl_listing_table():
    """Should parse medicines from SL table format."""
    html = """
    <table>
        <tr><td>Name</td><td>Substance</td><td>Price</td><td>Limitation</td></tr>
        <tr>
            <td><a href="/detail/12345">KEYTRUDA Inf Konz</a></td>
            <td>Pembrolizumab</td>
            <td>4285.55</td>
            <td>NSCLC, PD-L1 positive</td>
        </tr>
        <tr>
            <td>OPDIVO Inf Konz</td>
            <td>Nivolumab</td>
            <td>1234.00</td>
            <td></td>
        </tr>
    </table>
    """
    medicines = _parse_sl_listing(html)
    assert len(medicines) == 2
    assert "KEYTRUDA" in medicines[0]["name"]
    assert medicines[0]["substance"] == "Pembrolizumab"


def test_parse_sl_listing_skips_headers():
    """Should skip header rows in table parsing."""
    html = """
    <table>
        <tr><td>Präparat</td><td>Substance</td><td>Price</td></tr>
    </table>
    """
    medicines = _parse_sl_listing(html)
    assert len(medicines) == 0


def test_parse_bag_drugs_page():
    """Should parse drug links from BAG page."""
    html = """
    <div>
        <a href="/arzneimittel/detail1">Drug Info 1</a>
        <a href="/other/page">Not a drug</a>
        <a href="/spezialitaeten/list">Speciality List</a>
    </div>
    """
    medicines = _parse_bag_drugs_page(html)
    assert len(medicines) == 2  # arzneimittel + spezialitaeten links


# ── File caching tests ───────────────────────────────────────────────


def test_save_and_load_from_file(bag_service):
    """Should round-trip through JSON file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_file = Path(tmpdir) / "CH.json"
        bag_service.save_to_file(data_file)

        assert data_file.exists()

        new_service = SwitzerlandBAG()
        loaded = new_service.load_from_file(data_file)

        assert loaded is True
        assert new_service.is_loaded
        assert len(new_service._medicines) == len(bag_service._medicines)


def test_load_from_nonexistent_file():
    """Should return False for missing file."""
    service = SwitzerlandBAG()
    assert service.load_from_file(Path("/nonexistent/CH.json")) is False


# ── Properties tests ─────────────────────────────────────────────────


def test_properties():
    service = SwitzerlandBAG()
    assert service.country_code == "CH"
    assert service.country_name == "Switzerland"
    assert service.agency_abbreviation == "BAG"
    assert "Bundesamt" in service.agency_full_name or "Federal" in service.agency_full_name
    assert not service.is_loaded
