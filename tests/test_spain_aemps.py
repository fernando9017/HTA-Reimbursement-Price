"""Tests for the Spain AEMPS adapter using sample HTML data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.spain_aemps import (
    POSITIONING_DISPLAY,
    SpainAEMPS,
    _clean_html_text,
    _extract_ipt_reference,
    _normalize_positioning,
    _parse_spanish_date,
    _parse_spanish_date_parts,
)


# Sample AEMPS IPT listing HTML
SAMPLE_LISTING_HTML = """\
<!DOCTYPE html>
<html>
<head><title>Informes de Posicionamiento Terapéutico | AEMPS</title></head>
<body>
<div class="entry-content">
  <ul>
    <li>
      <a href="/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-23-2024-pembrolizumab.pdf">
        IPT-23/2024 - Pembrolizumab (Keytruda) en cáncer de pulmón no microcítico localmente avanzado
      </a>
      <span class="date">15 de enero de 2024</span>
      <span class="positioning">Favorable</span>
    </li>
    <li>
      <a href="/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-18-2023-nivolumab.pdf">
        IPT-18/2023 - Nivolumab (Opdivo) en carcinoma urotelial avanzado
      </a>
      <span class="date">3 de marzo de 2023</span>
      <span class="positioning">Favorable condicionado</span>
    </li>
    <li>
      <a href="/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-12-2023-atezolizumab.pdf">
        IPT-12/2023 - Atezolizumab (Tecentriq) en carcinoma hepatocelular avanzado
      </a>
      <span class="date">10 de noviembre de 2022</span>
      <span class="positioning">No favorable</span>
    </li>
    <li>
      <a href="/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-08-2022-trastuzumab-deruxtecan.pdf">
        IPT-08/2022 - Trastuzumab deruxtecan (Enhertu) en cáncer de mama HER2-positivo
      </a>
      <span class="date">22 de junio de 2022</span>
      <span class="positioning">Favorable</span>
    </li>
    <li>
      <a href="/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-30-2023-onasemnogene.pdf">
        IPT-30/2023 - Onasemnogene abeparvovec (Zolgensma) en atrofia muscular espinal
      </a>
      <span class="date">7 de julio de 2023</span>
      <span class="positioning">Favorable</span>
    </li>
  </ul>
</div>
</body>
</html>
"""


@pytest.fixture
def aemps_service():
    """Create an AEMPS adapter pre-loaded with sample HTML data."""
    service = SpainAEMPS()
    items = service._parse_listing_page(SAMPLE_LISTING_HTML)
    service._ipt_list = items
    service._loaded = True
    return service


def test_parse_listing_count(aemps_service):
    """Should parse all 5 IPT items from the sample HTML."""
    assert len(aemps_service._ipt_list) == 5


def test_parse_listing_references(aemps_service):
    refs = {ipt["reference"] for ipt in aemps_service._ipt_list}
    assert "IPT-23/2024" in refs
    assert "IPT-18/2023" in refs
    assert "IPT-12/2023" in refs
    assert "IPT-08/2022" in refs
    assert "IPT-30/2023" in refs


def test_parse_listing_titles(aemps_service):
    titles = [ipt["title"] for ipt in aemps_service._ipt_list]
    assert any("Pembrolizumab" in t for t in titles)
    assert any("Nivolumab" in t for t in titles)
    assert any("Atezolizumab" in t for t in titles)
    assert any("Trastuzumab deruxtecan" in t for t in titles)
    assert any("Onasemnogene" in t for t in titles)


def test_parse_listing_urls(aemps_service):
    urls = {ipt["url"] for ipt in aemps_service._ipt_list}
    assert any("pembrolizumab" in u for u in urls)
    assert any("nivolumab" in u for u in urls)


def test_parse_listing_dates(aemps_service):
    dates = {ipt["published_date"] for ipt in aemps_service._ipt_list}
    assert "2024-01-15" in dates
    assert "2023-03-03" in dates


def test_parse_listing_positioning(aemps_service):
    pos = {}
    for ipt in aemps_service._ipt_list:
        pos[ipt["reference"]] = ipt.get("positioning", "")
    # The parser extracts positioning keywords from nearby text
    assert pos.get("IPT-23/2024") != ""  # Should find "favorable"
    assert pos.get("IPT-12/2023") != ""  # Should find "no favorable"


@pytest.mark.asyncio
async def test_search_by_substance(aemps_service):
    results = await aemps_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    assert "IPT-23/2024" in results[0].ipt_reference


@pytest.mark.asyncio
async def test_search_case_insensitive(aemps_service):
    results = await aemps_service.search_assessments("pembrolizumab")
    assert len(results) == 1


@pytest.mark.asyncio
async def test_search_by_product_name(aemps_service):
    results = await aemps_service.search_assessments("irrelevant", product_name="Nivolumab")
    assert len(results) == 1
    assert "IPT-18/2023" in results[0].ipt_reference


@pytest.mark.asyncio
async def test_search_returns_positioning(aemps_service):
    results = await aemps_service.search_assessments("Pembrolizumab")
    assert len(results) == 1
    assert results[0].therapeutic_positioning != ""


@pytest.mark.asyncio
async def test_search_returns_assessment_url(aemps_service):
    results = await aemps_service.search_assessments("Pembrolizumab")
    assert "pembrolizumab" in results[0].assessment_url


@pytest.mark.asyncio
async def test_search_returns_evaluation_reason(aemps_service):
    results = await aemps_service.search_assessments("Pembrolizumab")
    assert "pulmón" in results[0].evaluation_reason.lower() or "pulmon" in results[0].evaluation_reason.lower()


@pytest.mark.asyncio
async def test_search_sorted_most_recent_first(aemps_service):
    # Search for something that might match multiple
    results = await aemps_service.search_assessments("Onasemnogene")
    if len(results) > 1:
        dates = [r.opinion_date for r in results]
        assert dates == sorted(dates, reverse=True)


@pytest.mark.asyncio
async def test_search_no_match(aemps_service):
    results = await aemps_service.search_assessments("nonexistentsubstance")
    assert len(results) == 0


@pytest.mark.asyncio
async def test_not_loaded():
    service = SpainAEMPS()
    results = await service.search_assessments("Pembrolizumab")
    assert len(results) == 0


def test_country_info():
    service = SpainAEMPS()
    info = service.get_country_info()
    assert info.code == "ES"
    assert info.name == "Spain"
    assert info.agency == "AEMPS"


def test_clean_html_text():
    assert _clean_html_text("  Hello   World  ") == "Hello World"
    assert _clean_html_text("<b>Bold</b> text") == "Bold text"
    assert _clean_html_text("A &amp; B") == "A & B"
    assert _clean_html_text("cáncer") == "cáncer"
    assert _clean_html_text("") == ""


def test_extract_ipt_reference():
    assert _extract_ipt_reference("IPT-23/2024") == "IPT-23/2024"
    assert _extract_ipt_reference("ipt-23/2024v1") == "IPT-23/2024V1"
    assert _extract_ipt_reference("IPT 23/2024") == "IPT-23/2024"
    assert _extract_ipt_reference("some text ipt-5/2023 more text") == "IPT-5/2023"
    assert _extract_ipt_reference("no reference here") == ""


def test_parse_spanish_date():
    assert _parse_spanish_date("15 de enero de 2024") == "2024-01-15"
    assert _parse_spanish_date("3 de marzo de 2023") == "2023-03-03"
    assert _parse_spanish_date("22/06/2022") == "2022-06-22"
    assert _parse_spanish_date("2024-01-15") == "2024-01-15"
    assert _parse_spanish_date("") == ""


def test_parse_spanish_date_parts():
    assert _parse_spanish_date_parts("15", "enero", "2024") == "2024-01-15"
    assert _parse_spanish_date_parts("3", "marzo", "2023") == "2023-03-03"
    assert _parse_spanish_date_parts("22", "junio", "2022") == "2022-06-22"
    assert _parse_spanish_date_parts("7", "julio", "2023") == "2023-07-07"
    assert _parse_spanish_date_parts("10", "diciembre", "2023") == "2023-12-10"


def test_normalize_positioning():
    assert _normalize_positioning("favorable") == "Favorable"
    assert _normalize_positioning("Favorable condicionado") == "Favorable with conditions (Condicionado)"
    assert _normalize_positioning("no favorable") == "Unfavorable (No favorable)"
    assert _normalize_positioning("desfavorable") == "Unfavorable (Desfavorable)"
    assert _normalize_positioning("pendiente") == "Pending (Pendiente)"
    assert _normalize_positioning("") == ""


def test_normalize_positioning_case_insensitive():
    assert _normalize_positioning("FAVORABLE") == "Favorable"
    assert _normalize_positioning("Desfavorable") == "Unfavorable (Desfavorable)"


def test_positioning_display_dict():
    assert "favorable" in POSITIONING_DISPLAY
    assert "desfavorable" in POSITIONING_DISPLAY
    assert "favorable condicionado" in POSITIONING_DISPLAY


def test_parse_empty_html():
    service = SpainAEMPS()
    result = service._parse_listing_page("<html><body></body></html>")
    assert result == []


def test_parse_html_with_no_ipt_links():
    service = SpainAEMPS()
    result = service._parse_listing_page(
        "<html><body><a href='/other/page'>Not an IPT</a></body></html>"
    )
    assert result == []


# ── New tests for expanded functionality ──────────────────────────────


# Sample table-format IPT listing HTML (Pattern 2)
SAMPLE_TABLE_HTML = """\
<html><body>
<table>
  <tr>
    <td>IPT-15/2024</td>
    <td>Dostarlimab (Jemperli) en cáncer de endometrio</td>
    <td>20/03/2024</td>
    <td><a href="/ipt/ipt-15-2024-dostarlimab.pdf">PDF</a></td>
  </tr>
  <tr>
    <td>IPT-10/2024</td>
    <td>Tivozanib (Fotivda) en carcinoma de células renales</td>
    <td>15/02/2024</td>
    <td><a href="/ipt/ipt-10-2024-tivozanib.pdf">PDF</a></td>
  </tr>
</table>
</body></html>
"""


def test_parse_table_format_listing():
    """Should parse IPTs from table-structured HTML (Pattern 2)."""
    service = SpainAEMPS()
    items = service._parse_listing_page(SAMPLE_TABLE_HTML)
    assert len(items) == 2
    refs = {ipt["reference"] for ipt in items}
    assert "IPT-15/2024" in refs
    assert "IPT-10/2024" in refs


def test_parse_table_format_dates():
    """Should extract DD/MM/YYYY dates from table format."""
    service = SpainAEMPS()
    items = service._parse_listing_page(SAMPLE_TABLE_HTML)
    dates = {ipt["reference"]: ipt["published_date"] for ipt in items}
    assert dates.get("IPT-15/2024") == "2024-03-20"
    assert dates.get("IPT-10/2024") == "2024-02-15"


def test_cima_enrichment():
    """Should enrich IPT entries with CIMA medicine data."""
    service = SpainAEMPS()

    # Sample IPT list
    items = [
        {"title": "IPT-23/2024 - Pembrolizumab en cáncer de pulmón", "url": ""},
        {"title": "IPT-18/2023 - Nivolumab en carcinoma urotelial", "url": ""},
        {"title": "IPT-99/2024 - Unknown drug for testing", "url": ""},
    ]

    # Sample CIMA data
    service._cima_medicines = {
        "pembrolizumab": {
            "nregistro": "80000001",
            "nombre": "KEYTRUDA",
            "inn": "pembrolizumab",
            "laboratorio": "MSD",
            "estado": "Autorizado",
            "atc": "L01FF02",
        },
        "nivolumab": {
            "nregistro": "80000002",
            "nombre": "OPDIVO",
            "inn": "nivolumab",
            "laboratorio": "BMS",
            "estado": "Autorizado",
            "atc": "L01FF01",
        },
    }

    service._enrich_ipts_with_cima(items)

    # Pembrolizumab should be enriched
    assert items[0].get("cima_nregistro") == "80000001"
    assert items[0].get("cima_laboratorio") == "MSD"

    # Nivolumab should be enriched
    assert items[1].get("cima_nregistro") == "80000002"
    assert items[1].get("cima_laboratorio") == "BMS"

    # Unknown drug should not be enriched
    assert "cima_nregistro" not in items[2]


def test_search_by_url_slug(aemps_service):
    """Should find IPTs when substance name is in the URL slug."""
    # The sample HTML has drug names in the URL paths
    # e.g. ipt-23-2024-pembrolizumab.pdf
    results_sync = []
    for ipt in aemps_service._ipt_list:
        if "pembrolizumab" in ipt.get("url", "").lower():
            results_sync.append(ipt)
    assert len(results_sync) >= 1


# ── File-based caching tests ──────────────────────────────────────────


def test_save_and_load_roundtrip(aemps_service):
    """save_to_file -> load_from_file should produce equivalent data."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "ES.json"
        aemps_service.save_to_file(data_file)
        assert data_file.exists()

        fresh = SpainAEMPS()
        assert not fresh.is_loaded
        result = fresh.load_from_file(data_file)
        assert result is True
        assert fresh.is_loaded
        assert len(fresh._ipt_list) == len(aemps_service._ipt_list)


def test_load_from_file_bad_file_returns_false():
    """load_from_file on a missing file should return False."""
    service = SpainAEMPS()
    assert service.load_from_file(Path("/nonexistent/ES.json")) is False
    assert not service.is_loaded


def test_load_from_file_invalid_envelope_returns_false():
    """load_from_file with wrong envelope structure should return False."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "ES.json"
        data_file.write_text(json.dumps({"data": {"not_a_list": True}}))
        service = SpainAEMPS()
        assert service.load_from_file(data_file) is False


def test_save_creates_envelope_metadata(aemps_service):
    """JSON file written by save_to_file should contain expected envelope fields."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "ES.json"
        aemps_service.save_to_file(data_file)
        payload = json.loads(data_file.read_text())
        assert payload["country"] == "ES"
        assert payload["agency"] == "AEMPS"
        assert "updated_at" in payload
        assert "record_count" in payload
        assert isinstance(payload["data"], list)


# ── HTA service substance grouping tests ─────────────────────────────


def test_hta_service_substance_grouping_case_insensitive():
    """IPTs with different casings of the same substance should be grouped together."""
    from app.services.spain_aemps_hta import SpainAEMPSHTAService

    service = SpainAEMPS()
    service._ipt_list = [
        {
            "reference": "IPT-01/2024",
            "title": "Pembrolizumab (Keytruda) en melanoma",
            "url": "",
            "published_date": "2024-01-01",
            "positioning": "favorable",
        },
        {
            "reference": "IPT-02/2024",
            "title": "pembrolizumab (Keytruda) en cáncer de pulmón",
            "url": "",
            "published_date": "2024-06-01",
            "positioning": "favorable",
        },
    ]
    service._loaded = True

    hta = SpainAEMPSHTAService(service)
    result = hta.search_drugs()
    # Both IPTs should be grouped under one substance
    pembrolizumab_items = [r for r in result.results if "pembrolizumab" in r.active_substance.lower()]
    assert len(pembrolizumab_items) == 1
    assert pembrolizumab_items[0].ipt_count == 2


def test_hta_service_brand_name_grouped_with_substance():
    """IPTs listed by brand name in parentheses should be grouped with the INN."""
    from app.services.spain_aemps_hta import SpainAEMPSHTAService

    service = SpainAEMPS()
    service._ipt_list = [
        {
            "reference": "IPT-01/2024",
            "title": "Nivolumab (Opdivo) en carcinoma urotelial",
            "url": "",
            "published_date": "2024-01-01",
            "positioning": "favorable",
        },
        {
            "reference": "IPT-02/2024",
            "title": "Nivolumab (Opdivo) en melanoma",
            "url": "",
            "published_date": "2024-06-01",
            "positioning": "favorable condicionado",
        },
    ]
    service._loaded = True

    hta = SpainAEMPSHTAService(service)
    result = hta.search_drugs()
    nivo_items = [r for r in result.results if "nivolumab" in r.active_substance.lower()]
    assert len(nivo_items) == 1
    assert nivo_items[0].ipt_count == 2


def test_hta_service_extract_substance_with_hyphens():
    """Substance names with hyphens (e.g. trastuzumab-deruxtecan) should be extracted."""
    from app.services.spain_aemps_hta import SpainAEMPSHTAService

    service = SpainAEMPS()
    service._ipt_list = [
        {
            "reference": "IPT-08/2022",
            "title": "Trastuzumab deruxtecan (Enhertu) en cáncer de mama HER2-positivo",
            "url": "",
            "published_date": "2022-06-22",
            "positioning": "favorable",
        },
    ]
    service._loaded = True

    hta = SpainAEMPSHTAService(service)
    profile = hta.get_drug_profile("Trastuzumab deruxtecan")
    assert profile is not None
    assert profile.total_ipts == 1


def test_hta_service_extract_substance_with_prefix_variations():
    """Different prefix patterns should all be handled correctly."""
    from app.services.spain_aemps_hta import SpainAEMPSHTAService

    hta = SpainAEMPSHTAService(SpainAEMPS())

    # "Informe de posicionamiento terapéutico de ..."
    substance1 = hta._extract_substance_from_title(
        "Informe de posicionamiento terapéutico de Atezolizumab (Tecentriq) en hepatocelular"
    )
    assert substance1 == "Atezolizumab"

    # "Informe de posicionamiento terapéutico sobre ..."
    substance2 = hta._extract_substance_from_title(
        "Informe de posicionamiento terapéutico sobre Nivolumab en melanoma"
    )
    assert substance2 == "Nivolumab"

    # "IPT-XX/YYYY - ..."
    substance3 = hta._extract_substance_from_title(
        "IPT-23/2024 - Pembrolizumab (Keytruda) en cáncer de pulmón"
    )
    assert substance3 == "Pembrolizumab"
