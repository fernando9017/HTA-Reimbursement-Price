"""Tests for the UK NICE adapter using sample HTML data."""

import pytest

from app.services.hta_agencies.uk_nice import (
    UKNICE,
    RECOMMENDATION_DISPLAY,
    _clean_html_text,
    _normalize_recommendation,
    _parse_date_text,
)


# Sample NICE published guidance listing HTML
SAMPLE_LISTING_HTML = """\
<!DOCTYPE html>
<html>
<head><title>Published guidance | NICE</title></head>
<body>
<div class="results">
  <div class="guidance-item">
    <h3><a href="/guidance/ta900">Pembrolizumab for untreated PD-L1-positive locally
    advanced or metastatic non-small-cell lung cancer [TA900]</a></h3>
    <p class="published-date">Published: 15 January 2024</p>
    <p class="recommendation-status">Recommended</p>
  </div>
  <div class="guidance-item">
    <h3><a href="/guidance/ta850">Nivolumab for previously treated squamous non-small-cell
    lung cancer [TA850]</a></h3>
    <p class="published-date">Published: 3 March 2023</p>
    <p class="recommendation-status">Recommended for use in the NHS</p>
  </div>
  <div class="guidance-item">
    <h3><a href="/guidance/ta820">Atezolizumab with bevacizumab for treating advanced
    hepatocellular carcinoma [TA820]</a></h3>
    <p class="published-date">Published: 10 November 2022</p>
    <p class="recommendation-status">Recommended with restrictions</p>
  </div>
  <div class="guidance-item">
    <h3><a href="/guidance/ta750">Trastuzumab deruxtecan for treating HER2-positive
    unresectable or metastatic breast cancer after 2 or more anti-HER2 therapies [TA750]</a></h3>
    <p class="published-date">Published: 22 June 2022</p>
    <p class="recommendation-status">Not recommended</p>
  </div>
  <div class="guidance-item">
    <h3><a href="/guidance/hst20">Onasemnogene abeparvovec for treating spinal muscular
    atrophy [HST20]</a></h3>
    <p class="published-date">Published: 7 July 2023</p>
    <p class="recommendation-status">Recommended as an option</p>
  </div>
</div>
</body>
</html>
"""


@pytest.fixture
def nice_service():
    """Create a NICE adapter pre-loaded with sample HTML data."""
    service = UKNICE()
    items = service._parse_listing_page(SAMPLE_LISTING_HTML, "Technology appraisal guidance")
    service._guidance_list = items
    service._loaded = True
    return service


def test_parse_listing_count(nice_service):
    """Should parse all 5 guidance items from the sample HTML."""
    assert len(nice_service._guidance_list) == 5


def test_parse_listing_references(nice_service):
    refs = {g["reference"] for g in nice_service._guidance_list}
    assert "TA900" in refs
    assert "TA850" in refs
    assert "TA820" in refs
    assert "TA750" in refs
    assert "HST20" in refs


def test_parse_listing_titles(nice_service):
    titles = [g["title"] for g in nice_service._guidance_list]
    assert any("Pembrolizumab" in t for t in titles)
    assert any("Nivolumab" in t for t in titles)
    assert any("Atezolizumab" in t for t in titles)
    assert any("Trastuzumab deruxtecan" in t for t in titles)
    assert any("Onasemnogene" in t for t in titles)


def test_parse_listing_urls(nice_service):
    urls = {g["url"] for g in nice_service._guidance_list}
    assert "https://www.nice.org.uk/guidance/ta900" in urls
    assert "https://www.nice.org.uk/guidance/hst20" in urls


def test_parse_listing_dates(nice_service):
    dates = {g["published_date"] for g in nice_service._guidance_list}
    assert "2024-01-15" in dates
    assert "2023-03-03" in dates


def test_parse_listing_recommendations(nice_service):
    recs = {}
    for g in nice_service._guidance_list:
        recs[g["reference"]] = g.get("recommendation", "")
    # The parser extracts recommendation keywords from nearby text
    assert recs.get("TA900") != ""  # Should find some recommendation text
    assert recs.get("TA750") != ""  # Should find "not recommended"


@pytest.mark.asyncio
async def test_search_by_substance(nice_service):
    results = await nice_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    assert "TA900" in results[0].guidance_reference


@pytest.mark.asyncio
async def test_search_case_insensitive(nice_service):
    results = await nice_service.search_assessments("pembrolizumab")
    assert len(results) == 1


@pytest.mark.asyncio
async def test_search_by_product_name(nice_service):
    results = await nice_service.search_assessments("irrelevant", product_name="Nivolumab")
    assert len(results) == 1
    assert "TA850" in results[0].guidance_reference


@pytest.mark.asyncio
async def test_search_returns_recommendation(nice_service):
    results = await nice_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    # Should have a recommendation value
    assert results[0].nice_recommendation != ""


@pytest.mark.asyncio
async def test_search_returns_assessment_url(nice_service):
    results = await nice_service.search_assessments("Pembrolizumab")
    assert results[0].assessment_url == "https://www.nice.org.uk/guidance/ta900"


@pytest.mark.asyncio
async def test_search_returns_evaluation_reason(nice_service):
    results = await nice_service.search_assessments("Pembrolizumab")
    assert "lung cancer" in results[0].evaluation_reason.lower()


@pytest.mark.asyncio
async def test_search_sorted_most_recent_first(nice_service):
    # Search for something that matches multiple entries
    results = await nice_service.search_assessments("cell lung cancer")
    if len(results) > 1:
        dates = [r.opinion_date for r in results]
        assert dates == sorted(dates, reverse=True)


@pytest.mark.asyncio
async def test_search_no_match(nice_service):
    results = await nice_service.search_assessments("nonexistentsubstance")
    assert len(results) == 0


@pytest.mark.asyncio
async def test_search_hst_guidance(nice_service):
    results = await nice_service.search_assessments("Onasemnogene")
    assert len(results) == 1
    assert "HST20" in results[0].guidance_reference


@pytest.mark.asyncio
async def test_not_loaded():
    service = UKNICE()
    results = await service.search_assessments("Pembrolizumab")
    assert len(results) == 0


def test_country_info():
    service = UKNICE()
    info = service.get_country_info()
    assert info.code == "GB"
    assert info.name == "United Kingdom"
    assert info.agency == "NICE"


def test_clean_html_text():
    assert _clean_html_text("  Hello   World  ") == "Hello World"
    assert _clean_html_text("<b>Bold</b> text") == "Bold text"
    assert _clean_html_text("A &amp; B") == "A & B"
    assert _clean_html_text("") == ""


def test_parse_date_text():
    assert _parse_date_text("15", "January", "2024") == "2024-01-15"
    assert _parse_date_text("3", "March", "2023") == "2023-03-03"
    assert _parse_date_text("22", "June", "2022") == "2022-06-22"
    assert _parse_date_text("7", "July", "2023") == "2023-07-07"


def test_normalize_recommendation():
    assert _normalize_recommendation("recommended") == "Recommended"
    assert _normalize_recommendation("Recommended for use in the NHS") == "Recommended"
    assert _normalize_recommendation("not recommended") == "Not recommended"
    assert _normalize_recommendation("Recommended with restrictions") == "Recommended with restrictions (Optimised)"
    assert _normalize_recommendation("optimised") == "Recommended with restrictions (Optimised)"
    assert _normalize_recommendation("") == ""
    assert _normalize_recommendation("only in research") == "Only in research"


def test_normalize_recommendation_case_insensitive():
    assert _normalize_recommendation("NOT RECOMMENDED") == "Not recommended"
    assert _normalize_recommendation("Recommended") == "Recommended"


def test_recommendation_display_dict():
    assert "recommended" in RECOMMENDATION_DISPLAY
    assert "not recommended" in RECOMMENDATION_DISPLAY
    assert "optimised" in RECOMMENDATION_DISPLAY


def test_parse_empty_html():
    service = UKNICE()
    result = service._parse_listing_page("<html><body></body></html>", "Technology appraisal guidance")
    assert result == []


def test_parse_html_with_no_guidance_links():
    service = UKNICE()
    result = service._parse_listing_page(
        "<html><body><a href='/other/page'>Not guidance</a></body></html>",
        "Technology appraisal guidance",
    )
    assert result == []
