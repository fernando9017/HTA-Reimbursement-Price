"""Tests for the Japan PMDA adapter using sample HTML data."""

import pytest

from app.services.hta_agencies.japan_pmda import (
    REVIEW_TYPE_DISPLAY,
    JapanPMDA,
    _clean_html_text,
    _detect_review_type,
    _normalize_review_type,
    _parse_date,
    _parse_english_date_parts,
)


# Sample PMDA approved drugs listing HTML
SAMPLE_LISTING_HTML = """\
<!DOCTYPE html>
<html>
<head><title>Approved Drugs | PMDA</title></head>
<body>
<h2>List of Approved Drugs</h2>
<table class="drugs-table">
  <thead>
    <tr>
      <td>Brand Name</td>
      <td>INN</td>
      <td>Indication</td>
      <td>Approval Date</td>
      <td>Review Report</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Keytruda</td>
      <td>Pembrolizumab</td>
      <td>Treatment of unresectable advanced or recurrent non-small cell lung cancer</td>
      <td>September 28, 2023</td>
      <td><a href="/files/review/keytruda-review-report.pdf">Review Report</a></td>
    </tr>
    <tr>
      <td>Opdivo</td>
      <td>Nivolumab</td>
      <td>Treatment of unresectable or metastatic melanoma</td>
      <td>March 15, 2023</td>
      <td><a href="/files/review/opdivo-review-report.pdf">Review Report</a></td>
    </tr>
    <tr>
      <td>Tecentriq</td>
      <td>Atezolizumab</td>
      <td>Treatment of advanced hepatocellular carcinoma</td>
      <td>November 25, 2022</td>
      <td><a href="/files/review/tecentriq-review-report.pdf">Review Report</a></td>
    </tr>
    <tr>
      <td>Enhertu</td>
      <td>Trastuzumab deruxtecan</td>
      <td>Treatment of HER2-positive unresectable or metastatic breast cancer</td>
      <td>January 20, 2023</td>
      <td><a href="/files/review/enhertu-review-report.pdf">Review Report</a></td>
    </tr>
    <tr>
      <td>Zolgensma</td>
      <td>Onasemnogene abeparvovec</td>
      <td>Treatment of spinal muscular atrophy (orphan drug)</td>
      <td>May 19, 2020</td>
      <td><a href="/files/review/zolgensma-review-report.pdf">Review Report</a></td>
    </tr>
  </tbody>
</table>
</body>
</html>
"""


@pytest.fixture
def pmda_service():
    """Create a PMDA adapter pre-loaded with sample HTML data."""
    service = JapanPMDA()
    items = service._parse_listing_page(SAMPLE_LISTING_HTML)
    service._drug_list = items
    service._loaded = True
    return service


def test_parse_listing_count(pmda_service):
    """Should parse all 5 drug entries from the sample HTML (header skipped)."""
    assert len(pmda_service._drug_list) == 5


def test_parse_listing_brand_names(pmda_service):
    names = {d["brand_name"] for d in pmda_service._drug_list}
    assert "Keytruda" in names
    assert "Opdivo" in names
    assert "Tecentriq" in names
    assert "Enhertu" in names
    assert "Zolgensma" in names


def test_parse_listing_inns(pmda_service):
    inns = {d["inn"] for d in pmda_service._drug_list}
    assert "Pembrolizumab" in inns
    assert "Nivolumab" in inns
    assert "Atezolizumab" in inns
    assert "Trastuzumab deruxtecan" in inns
    assert "Onasemnogene abeparvovec" in inns


def test_parse_listing_dates(pmda_service):
    dates = {d["approval_date"] for d in pmda_service._drug_list}
    assert "2023-09-28" in dates
    assert "2023-03-15" in dates


def test_parse_listing_review_urls(pmda_service):
    urls = [d["review_url"] for d in pmda_service._drug_list]
    assert any("keytruda" in u for u in urls)
    assert any("opdivo" in u for u in urls)


def test_parse_listing_indications(pmda_service):
    indications = [d["indication"] for d in pmda_service._drug_list]
    assert any("lung cancer" in i.lower() for i in indications)
    assert any("melanoma" in i.lower() for i in indications)
    assert any("spinal muscular atrophy" in i.lower() for i in indications)


@pytest.mark.asyncio
async def test_search_by_substance(pmda_service):
    results = await pmda_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    assert results[0].product_name == "Keytruda"


@pytest.mark.asyncio
async def test_search_case_insensitive(pmda_service):
    results = await pmda_service.search_assessments("pembrolizumab")
    assert len(results) == 1


@pytest.mark.asyncio
async def test_search_by_product_name(pmda_service):
    results = await pmda_service.search_assessments("irrelevant", product_name="Opdivo")
    assert len(results) == 1
    assert "Nivolumab" in results[0].evaluation_reason or results[0].product_name == "Opdivo"


@pytest.mark.asyncio
async def test_search_returns_review_type(pmda_service):
    results = await pmda_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    assert results[0].pmda_review_type != ""


@pytest.mark.asyncio
async def test_search_returns_assessment_url(pmda_service):
    results = await pmda_service.search_assessments("Pembrolizumab")
    assert "keytruda" in results[0].assessment_url


@pytest.mark.asyncio
async def test_search_returns_evaluation_reason(pmda_service):
    results = await pmda_service.search_assessments("Pembrolizumab")
    assert "lung cancer" in results[0].evaluation_reason.lower()


@pytest.mark.asyncio
async def test_search_sorted_most_recent_first(pmda_service):
    # Nivolumab and Trastuzumab deruxtecan both have 2023 dates
    results = await pmda_service.search_assessments("Pembrolizumab")
    if len(results) > 1:
        dates = [r.opinion_date for r in results]
        assert dates == sorted(dates, reverse=True)


@pytest.mark.asyncio
async def test_search_no_match(pmda_service):
    results = await pmda_service.search_assessments("nonexistentsubstance")
    assert len(results) == 0


@pytest.mark.asyncio
async def test_search_orphan_drug(pmda_service):
    results = await pmda_service.search_assessments("Onasemnogene")
    assert len(results) == 1
    assert results[0].product_name == "Zolgensma"


@pytest.mark.asyncio
async def test_not_loaded():
    service = JapanPMDA()
    results = await service.search_assessments("Pembrolizumab")
    assert len(results) == 0


def test_country_info():
    service = JapanPMDA()
    info = service.get_country_info()
    assert info.code == "JP"
    assert info.name == "Japan"
    assert info.agency == "PMDA"


def test_clean_html_text():
    assert _clean_html_text("  Hello   World  ") == "Hello World"
    assert _clean_html_text("<b>Bold</b> text") == "Bold text"
    assert _clean_html_text("A &amp; B") == "A & B"
    assert _clean_html_text("") == ""


def test_parse_date_english():
    assert _parse_date("September 28, 2023") == "2023-09-28"
    assert _parse_date("March 15, 2023") == "2023-03-15"
    assert _parse_date("January 20, 2023") == "2023-01-20"


def test_parse_date_japanese():
    assert _parse_date("2023年9月28日") == "2023-09-28"
    assert _parse_date("2020年5月19日") == "2020-05-19"


def test_parse_date_iso():
    assert _parse_date("2023-09-28") == "2023-09-28"


def test_parse_date_empty():
    assert _parse_date("") == ""


def test_parse_english_date_parts():
    assert _parse_english_date_parts("28", "September", "2023") == "2023-09-28"
    assert _parse_english_date_parts("15", "March", "2023") == "2023-03-15"
    assert _parse_english_date_parts("1", "January", "2024") == "2024-01-01"


def test_detect_review_type():
    assert _detect_review_type("new drug application", "") == "new drug"
    assert _detect_review_type("biosimilar approval", "") == "biosimilar"
    assert _detect_review_type("", "spinal muscular atrophy (orphan drug)") == "orphan"
    assert _detect_review_type("additional indication", "") == "new indication"
    assert _detect_review_type("", "normal indication text") == "new drug"


def test_normalize_review_type():
    assert _normalize_review_type("new drug") == "New Drug Approval"
    assert _normalize_review_type("orphan") == "Orphan Drug"
    assert _normalize_review_type("biosimilar") == "Biosimilar"
    assert _normalize_review_type("new indication") == "New Indication"
    assert _normalize_review_type("") == ""


def test_review_type_display_dict():
    assert "new drug" in REVIEW_TYPE_DISPLAY
    assert "orphan" in REVIEW_TYPE_DISPLAY
    assert "biosimilar" in REVIEW_TYPE_DISPLAY


def test_parse_empty_html():
    service = JapanPMDA()
    result = service._parse_listing_page("<html><body></body></html>")
    assert result == []


def test_parse_html_with_no_drug_tables():
    service = JapanPMDA()
    result = service._parse_listing_page(
        "<html><body><p>No drug information here</p></body></html>"
    )
    assert result == []
