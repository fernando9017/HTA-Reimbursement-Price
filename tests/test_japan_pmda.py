"""Tests for the Japan MHLW adapter (KEGG/JAPIC data source)."""

import pytest

from app.services.hta_agencies.japan_pmda import JapanPMDA, _parse_kegg_disease


# ── Fixtures ──────────────────────────────────────────────────────────

def _make_drug(kegg_id, names, japic_code=""):
    """Build a drug dict in the format stored in _drug_list."""
    names_display = names if isinstance(names, list) else [names]
    return {
        "kegg_id": kegg_id,
        "names_lower": [n.lower() for n in names_display],
        "names_display": names_display,
        "japic_code": japic_code,
        "japic_url": f"https://www.kegg.jp/medicus-bin/japic_med?japic_code={japic_code}"
        if japic_code
        else "",
    }


@pytest.fixture
def mhlw_service():
    """MHLW adapter pre-loaded with synthetic drug list; no network calls."""
    service = JapanPMDA()
    service._drug_list = [
        _make_drug("dr:D00001", ["Pembrolizumab", "Keytruda"], japic_code="00070751"),
        _make_drug("dr:D00002", ["Nivolumab", "Opdivo"], japic_code="00068421"),
        _make_drug("dr:D00003", ["Atezolizumab", "Tecentriq"], japic_code="00069812"),
        _make_drug("dr:D00004", ["Trastuzumab deruxtecan", "Enhertu"], japic_code="00071234"),
        _make_drug("dr:D00005", ["Onasemnogene abeparvovec", "Zolgensma"], japic_code="00065900"),
        # Drug not on NHI price list (no JAPIC code)
        _make_drug("dr:D00006", ["Experimental compound X"]),
    ]
    # Pre-populate disease cache so search_assessments makes no HTTP calls
    service._disease_cache = {
        "dr:D00001": "Non-small cell lung cancer; Melanoma",
        "dr:D00002": "Melanoma; Renal cell carcinoma",
        "dr:D00003": "Hepatocellular carcinoma",
        "dr:D00004": "Breast cancer",
        "dr:D00005": "Spinal muscular atrophy",
        "dr:D00006": "",
    }
    service._loaded = True
    return service


# ── Unit tests: adapter properties ────────────────────────────────────

def test_country_code():
    assert JapanPMDA().country_code == "JP"


def test_country_name():
    assert JapanPMDA().country_name == "Japan"


def test_agency_abbreviation():
    assert JapanPMDA().agency_abbreviation == "MHLW"


def test_agency_full_name():
    assert "Ministry of Health" in JapanPMDA().agency_full_name


def test_country_info():
    info = JapanPMDA().get_country_info()
    assert info.code == "JP"
    assert info.name == "Japan"
    assert info.agency == "MHLW"


def test_not_loaded_initially():
    assert not JapanPMDA().is_loaded


# ── Unit tests: _parse_kegg_disease helper ────────────────────────────

SAMPLE_KEGG_ENTRY = """\
ENTRY       D11678                      Drug
NAME        Pembrolizumab (USAN/INN);
            Keytruda (TN)
DISEASE     H01563  Urothelial carcinoma [DS:H01563]
            H01562  Bladder cancer [DS:H01562]
            H00023  Non-small cell lung cancer [DS:H00023]
DBLINKS     CAS: 1374853-91-4
///
"""


def test_parse_kegg_disease_extracts_names():
    result = _parse_kegg_disease(SAMPLE_KEGG_ENTRY)
    assert "Urothelial carcinoma" in result
    assert "Bladder cancer" in result
    assert "Non-small cell lung cancer" in result


def test_parse_kegg_disease_semicolon_joined():
    result = _parse_kegg_disease(SAMPLE_KEGG_ENTRY)
    assert ";" in result


def test_parse_kegg_disease_no_duplicates():
    duplicated = SAMPLE_KEGG_ENTRY + "DISEASE     H01563  Urothelial carcinoma [DS:H01563]\n"
    result = _parse_kegg_disease(duplicated)
    assert result.count("Urothelial carcinoma") == 1


def test_parse_kegg_disease_empty_entry():
    assert _parse_kegg_disease("ENTRY       D99999\nNAME        Foo\n///\n") == ""


def test_parse_kegg_disease_stops_at_next_field():
    entry = (
        "ENTRY       D00001\n"
        "DISEASE     H01234  Some cancer [DS:H01234]\n"
        "DBLINKS     CAS: 12345\n"  # non-indented line ends DISEASE block
        "            H99999  Should not appear [DS:H99999]\n"
    )
    result = _parse_kegg_disease(entry)
    assert "Some cancer" in result
    assert "Should not appear" not in result


# ── Integration-style tests: search_assessments ───────────────────────

@pytest.mark.asyncio
async def test_search_not_loaded():
    service = JapanPMDA()
    results = await service.search_assessments("Pembrolizumab")
    assert results == []


@pytest.mark.asyncio
async def test_search_by_substance(mhlw_service):
    results = await mhlw_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    assert results[0].product_name == "Pembrolizumab"


@pytest.mark.asyncio
async def test_search_case_insensitive(mhlw_service):
    results = await mhlw_service.search_assessments("pembrolizumab")
    assert len(results) == 1


@pytest.mark.asyncio
async def test_search_by_brand_name(mhlw_service):
    results = await mhlw_service.search_assessments("irrelevant", product_name="Keytruda")
    assert len(results) == 1
    assert results[0].product_name == "Pembrolizumab"


@pytest.mark.asyncio
async def test_search_no_match(mhlw_service):
    results = await mhlw_service.search_assessments("nonexistentsubstance")
    assert results == []


@pytest.mark.asyncio
async def test_search_reimbursed_status(mhlw_service):
    results = await mhlw_service.search_assessments("Pembrolizumab")
    assert results[0].pmda_review_type == "Reimbursed (NHI)"


@pytest.mark.asyncio
async def test_search_not_reimbursed_status(mhlw_service):
    results = await mhlw_service.search_assessments("Experimental compound X")
    assert len(results) == 1
    assert results[0].pmda_review_type == "Not in NHI price list"


@pytest.mark.asyncio
async def test_search_reimbursed_has_japic_url(mhlw_service):
    results = await mhlw_service.search_assessments("Pembrolizumab")
    assert "japic_code=00070751" in results[0].assessment_url


@pytest.mark.asyncio
async def test_search_not_reimbursed_has_no_japic_url(mhlw_service):
    results = await mhlw_service.search_assessments("Experimental compound X")
    assert results[0].assessment_url == ""


@pytest.mark.asyncio
async def test_search_reimbursed_has_mhlw_url(mhlw_service):
    results = await mhlw_service.search_assessments("Pembrolizumab")
    assert "mhlw.go.jp" in results[0].japan_mhlw_url


@pytest.mark.asyncio
async def test_search_not_reimbursed_no_mhlw_url(mhlw_service):
    results = await mhlw_service.search_assessments("Experimental compound X")
    assert results[0].japan_mhlw_url == ""


@pytest.mark.asyncio
async def test_search_indication_from_cache(mhlw_service):
    results = await mhlw_service.search_assessments("Pembrolizumab")
    assert "lung cancer" in results[0].evaluation_reason.lower()


@pytest.mark.asyncio
async def test_search_partial_substance_match(mhlw_service):
    # "trastuzumab" is a substring of "Trastuzumab deruxtecan"
    results = await mhlw_service.search_assessments("trastuzumab")
    assert len(results) >= 1
    assert any("Trastuzumab" in r.product_name for r in results)


@pytest.mark.asyncio
async def test_search_opinion_date_empty(mhlw_service):
    """KEGG does not provide a pricing date — opinion_date should be empty."""
    results = await mhlw_service.search_assessments("Nivolumab")
    assert results[0].opinion_date == ""
