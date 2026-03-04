"""Tests for the UK NICE adapter using sample HTML data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.uk_nice import (
    UKNICE,
    RECOMMENDATION_DISPLAY,
    _clean_html_text,
    _extract_from_guidance_page,
    _extract_title_from_page,
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


# ── New tests for expanded functionality ──────────────────────────────


# Sample NICE API JSON response
SAMPLE_API_RESPONSE = {
    "results": [
        {
            "guidanceReference": "TA950",
            "title": "Sotorasib for treating KRAS G12C-mutated advanced non-small-cell lung cancer",
            "url": "/guidance/ta950",
            "publishedDate": "2024-06-15T00:00:00",
            "recommendation": "recommended",
        },
        {
            "guidanceReference": "TA951",
            "title": "Teclistamab for relapsed and refractory multiple myeloma",
            "url": "/guidance/ta951",
            "publishedDate": "2024-07-20T00:00:00",
            "recommendation": "not recommended",
        },
        {
            "guidanceReference": "HST25",
            "title": "Voretigene neparvovec for treating inherited retinal dystrophies",
            "url": "/guidance/hst25",
            "publishedDate": "2024-05-10T00:00:00",
            "recommendation": "recommended",
        },
    ]
}


def test_parse_api_response_standard_format():
    """Should parse NICE API JSON with standard results structure."""
    service = UKNICE()
    seen = set()
    items = service._parse_api_response(SAMPLE_API_RESPONSE, "Technology appraisal guidance", seen)
    assert len(items) == 3
    refs = {g["reference"] for g in items}
    assert "TA950" in refs
    assert "TA951" in refs
    assert "HST25" in refs


def test_parse_api_response_extracts_dates():
    """Should extract published dates from API response and format as YYYY-MM-DD."""
    service = UKNICE()
    seen = set()
    items = service._parse_api_response(SAMPLE_API_RESPONSE, "Technology appraisal guidance", seen)
    dates = {g["reference"]: g["published_date"] for g in items}
    assert dates["TA950"] == "2024-06-15"
    assert dates["HST25"] == "2024-05-10"


def test_parse_api_response_extracts_recommendations():
    """Should extract recommendation status from API response."""
    service = UKNICE()
    seen = set()
    items = service._parse_api_response(SAMPLE_API_RESPONSE, "Technology appraisal guidance", seen)
    recs = {g["reference"]: g["recommendation"] for g in items}
    assert recs["TA950"] == "recommended"
    assert recs["TA951"] == "not recommended"


def test_parse_api_response_deduplicates():
    """Should not return duplicate references."""
    service = UKNICE()
    seen = {"TA950"}  # Pre-seed with an existing ref
    items = service._parse_api_response(SAMPLE_API_RESPONSE, "Technology appraisal guidance", seen)
    assert len(items) == 2  # TA950 should be skipped
    refs = {g["reference"] for g in items}
    assert "TA950" not in refs


def test_parse_api_response_list_format():
    """Should handle API response as a direct list of items."""
    service = UKNICE()
    seen = set()
    data = [
        {"guidanceReference": "TA100", "title": "Drug A for cancer", "url": "/guidance/ta100"},
        {"guidanceReference": "TA101", "title": "Drug B for diabetes", "url": "/guidance/ta101"},
    ]
    items = service._parse_api_response(data, "Technology appraisal guidance", seen)
    assert len(items) == 2


def test_parse_api_response_empty():
    """Should return empty list for empty API response."""
    service = UKNICE()
    seen = set()
    assert service._parse_api_response({}, "TA", seen) == []
    assert service._parse_api_response({"results": []}, "TA", seen) == []
    assert service._parse_api_response([], "TA", seen) == []


def test_parse_api_response_constructs_urls():
    """Should construct full NICE URLs from relative paths."""
    service = UKNICE()
    seen = set()
    data = [{"guidanceReference": "TA999", "title": "Test", "url": "/guidance/ta999"}]
    items = service._parse_api_response(data, "TA", seen)
    assert items[0]["url"] == "https://www.nice.org.uk/guidance/ta999"


def test_extract_title_from_guidance_page():
    """Should extract title from individual guidance page HTML."""
    html = """
    <html>
    <head><title>Drug X for treating cancer | Guidance | NICE</title></head>
    <body><h1>Drug X for treating cancer</h1></body>
    </html>
    """
    title = _extract_title_from_page(html)
    assert "Drug X for treating cancer" in title


def test_extract_title_from_page_h1_fallback():
    """Should fall back to <h1> tag when <title> is generic."""
    html = """
    <html>
    <head><title>NICE</title></head>
    <body><h1>Sotorasib for lung cancer after immunotherapy</h1></body>
    </html>
    """
    title = _extract_title_from_page(html)
    assert "Sotorasib" in title


def test_extract_from_guidance_page_recommendation():
    """Should extract recommendation from a guidance page."""
    html = """
    <html><body>
    <div class="recommendation-status">
        <p>Sotorasib is recommended as an option for treating...</p>
    </div>
    </body></html>
    """
    rec, _ = _extract_from_guidance_page(html)
    assert rec == "recommended"


def test_extract_from_guidance_page_not_recommended():
    """Should correctly identify 'not recommended' over 'recommended'."""
    html = """
    <html><body>
    <div>Teclistamab is not recommended for use in the NHS...</div>
    </body></html>
    """
    rec, _ = _extract_from_guidance_page(html)
    assert rec == "not recommended"


def test_extract_from_guidance_page_date():
    """Should extract published date from a guidance page."""
    html = """
    <html><body>
    <p>Published date: 15 January 2024</p>
    <p>This guidance is recommended...</p>
    </body></html>
    """
    _, date = _extract_from_guidance_page(html)
    assert date == "2024-01-15"


# Sample HTML with Pattern 2 (multi-line link text with nested HTML)
SAMPLE_PATTERN2_HTML = """\
<html><body>
<div class="results-list">
  <h3 class="title">
    <a href="/guidance/ta960">
      <span class="reference">TA960</span>
      Durvalumab for treating locally advanced urothelial carcinoma
    </a>
  </h3>
  <p class="date">Published: 5 September 2024</p>
  <p>Recommended</p>
</div>
</body></html>
"""


def test_parse_listing_pattern2():
    """Should parse HTML using Pattern 2 (multi-line link text with nested tags)."""
    service = UKNICE()
    items = service._parse_listing_page(SAMPLE_PATTERN2_HTML, "Technology appraisal guidance")
    assert len(items) >= 1
    refs = {g["reference"] for g in items}
    assert "TA960" in refs


# ── File-based caching tests ──────────────────────────────────────────


def test_save_and_load_roundtrip(nice_service):
    """save_to_file -> load_from_file should produce equivalent data."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "GB.json"
        nice_service.save_to_file(data_file)
        assert data_file.exists()

        fresh = UKNICE()
        assert not fresh.is_loaded
        result = fresh.load_from_file(data_file)
        assert result is True
        assert fresh.is_loaded
        assert len(fresh._guidance_list) == len(nice_service._guidance_list)


def test_load_from_file_bad_file_returns_false():
    """load_from_file on a missing file should return False."""
    service = UKNICE()
    assert service.load_from_file(Path("/nonexistent/GB.json")) is False
    assert not service.is_loaded


def test_load_from_file_invalid_envelope_returns_false():
    """load_from_file with wrong envelope structure should return False."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "GB.json"
        data_file.write_text(json.dumps({"data": {"not_a_list": True}}))
        service = UKNICE()
        assert service.load_from_file(data_file) is False


def test_save_creates_envelope_metadata(nice_service):
    """JSON file written by save_to_file should contain expected envelope fields."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "GB.json"
        nice_service.save_to_file(data_file)
        payload = json.loads(data_file.read_text())
        assert payload["country"] == "GB"
        assert payload["agency"] == "NICE"
        assert "updated_at" in payload
        assert "record_count" in payload
        assert isinstance(payload["data"], list)


# ── Brand name search tests ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_by_brand_name_via_mapping(nice_service):
    """Should find guidance when searching by brand name after EMA mapping is set."""
    # Set up EMA brand mapping
    nice_service.set_brand_mapping([
        {"medicineName": "Keytruda", "activeSubstance": "Pembrolizumab"},
        {"medicineName": "Opdivo", "activeSubstance": "Nivolumab"},
    ])

    # Search by brand name "Keytruda" — should resolve to pembrolizumab
    results = await nice_service.search_assessments("Keytruda")
    assert len(results) >= 1
    assert any("TA900" in r.guidance_reference for r in results)


@pytest.mark.asyncio
async def test_search_by_substance_still_works_with_mapping(nice_service):
    """Searching by INN should still work after brand mapping is set."""
    nice_service.set_brand_mapping([
        {"medicineName": "Keytruda", "activeSubstance": "Pembrolizumab"},
    ])
    results = await nice_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    assert "TA900" in results[0].guidance_reference


@pytest.mark.asyncio
async def test_search_url_slug_matching(nice_service):
    """Should also search the URL slug for matches."""
    # The URL contains /guidance/ta900 — search for "ta900" should match
    results = await nice_service.search_assessments("ta900")
    assert len(results) >= 1


def test_set_brand_mapping():
    """set_brand_mapping should populate internal lookup dictionaries."""
    service = UKNICE()
    service.set_brand_mapping([
        {"medicineName": "Keytruda", "activeSubstance": "Pembrolizumab"},
        {"medicineName": "Opdivo", "activeSubstance": "Nivolumab"},
        {"medicineName": "Tecentriq", "activeSubstance": "Atezolizumab"},
    ])
    assert service._brand_to_substance["keytruda"] == "pembrolizumab"
    assert service._brand_to_substance["opdivo"] == "nivolumab"
    assert "keytruda" in service._substance_to_brands["pembrolizumab"]


def test_set_brand_mapping_ignores_same_name():
    """Should skip entries where name == substance (no brand info)."""
    service = UKNICE()
    service.set_brand_mapping([
        {"medicineName": "Pembrolizumab", "activeSubstance": "Pembrolizumab"},
    ])
    assert len(service._brand_to_substance) == 0


# ── HTA service brand name search tests ──────────────────────────────


def test_hta_service_search_drugs_by_brand_name():
    """Deep-dive drug search should find drugs by brand name."""
    from app.services.uk_nice_hta import UKNICEHTAService

    service = UKNICE()
    items = service._parse_listing_page(SAMPLE_LISTING_HTML, "Technology appraisal guidance")
    service._guidance_list = items
    service._loaded = True
    service.set_brand_mapping([
        {"medicineName": "Keytruda", "activeSubstance": "Pembrolizumab"},
    ])

    hta = UKNICEHTAService(service)
    result = hta.search_drugs(query="Keytruda")
    assert result.total >= 1
    assert any("pembrolizumab" in r.active_substance.lower() for r in result.results)


def test_hta_service_get_drug_profile_by_brand_name():
    """get_drug_profile should resolve brand names to INN."""
    from app.services.uk_nice_hta import UKNICEHTAService

    service = UKNICE()
    items = service._parse_listing_page(SAMPLE_LISTING_HTML, "Technology appraisal guidance")
    service._guidance_list = items
    service._loaded = True
    service.set_brand_mapping([
        {"medicineName": "Keytruda", "activeSubstance": "Pembrolizumab"},
    ])

    hta = UKNICEHTAService(service)
    # Should resolve "Keytruda" → "Pembrolizumab" and find the profile
    profile = hta.get_drug_profile("Keytruda")
    assert profile is not None
    assert profile.total_guidance >= 1


# ── Deduplication tests ──────────────────────────────────────────────


def test_deduplicate_by_reference():
    """Should remove duplicate guidance entries by reference."""
    from app.services.hta_agencies.uk_nice import _deduplicate_by_reference

    items = [
        {"reference": "TA900", "title": "Drug A"},
        {"reference": "TA900", "title": "Drug A (dup)"},
        {"reference": "TA900", "title": "Drug A (dup2)"},
        {"reference": "TA850", "title": "Drug B"},
        {"reference": "TA850", "title": "Drug B (dup)"},
    ]
    result = _deduplicate_by_reference(items)
    assert len(result) == 2
    refs = [g["reference"] for g in result]
    assert refs == ["TA900", "TA850"]
    # Should keep the first occurrence
    assert result[0]["title"] == "Drug A"
    assert result[1]["title"] == "Drug B"


def test_deduplicate_preserves_order():
    """Dedup should preserve the order of first occurrences."""
    from app.services.hta_agencies.uk_nice import _deduplicate_by_reference

    items = [
        {"reference": "TA100", "title": "First"},
        {"reference": "TA200", "title": "Second"},
        {"reference": "TA100", "title": "Duplicate of First"},
        {"reference": "TA300", "title": "Third"},
    ]
    result = _deduplicate_by_reference(items)
    assert len(result) == 3
    assert [g["reference"] for g in result] == ["TA100", "TA200", "TA300"]


def test_load_from_file_deduplicates(nice_service):
    """load_from_file should remove duplicates from saved data."""
    import json
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "GB.json"
        # Save valid data first
        nice_service.save_to_file(data_file)

        # Now corrupt the file by duplicating entries
        with open(data_file) as f:
            payload = json.load(f)
        original_count = len(payload["data"])
        payload["data"] = payload["data"] * 3  # Triple the entries
        payload["record_count"] = len(payload["data"])
        with open(data_file, "w") as f:
            json.dump(payload, f)

        # Load should deduplicate
        fresh = UKNICE()
        result = fresh.load_from_file(data_file)
        assert result is True
        assert len(fresh._guidance_list) == original_count


# ── Trade name extraction tests ──────────────────────────────────────


def test_extract_drug_name_from_title():
    """Should extract the drug name from NICE guidance titles."""
    from app.services.hta_agencies.uk_nice import _extract_drug_name_from_title

    assert _extract_drug_name_from_title(
        "Pembrolizumab for untreated PD-L1-positive locally advanced NSCLC"
    ) == "Pembrolizumab"
    assert _extract_drug_name_from_title(
        "Nivolumab with ipilimumab for untreated advanced renal cell carcinoma"
    ) == "Nivolumab with ipilimumab"
    assert _extract_drug_name_from_title("") == ""
    assert _extract_drug_name_from_title(
        "Trastuzumab deruxtecan for treating HER2-positive breast cancer"
    ) == "Trastuzumab deruxtecan"


@pytest.mark.asyncio
async def test_search_resolves_trade_name_from_title():
    """search_assessments should extract trade name from guidance title via EMA mapping."""
    service = UKNICE()
    items = service._parse_listing_page(SAMPLE_LISTING_HTML, "Technology appraisal guidance")
    service._guidance_list = items
    service._loaded = True

    # Set up brand mapping
    service.set_brand_mapping([
        {"medicineName": "Keytruda", "activeSubstance": "Pembrolizumab"},
    ])

    results = await service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    # product_name should be resolved to the brand name "Keytruda"
    assert results[0].product_name == "Keytruda"


@pytest.mark.asyncio
async def test_search_uses_substance_when_no_brand_mapping():
    """Without brand mapping, product_name should be the drug name from the title."""
    service = UKNICE()
    items = service._parse_listing_page(SAMPLE_LISTING_HTML, "Technology appraisal guidance")
    service._guidance_list = items
    service._loaded = True

    results = await service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    # No brand mapping — should use the extracted drug name from the title
    assert results[0].product_name == "Pembrolizumab"
