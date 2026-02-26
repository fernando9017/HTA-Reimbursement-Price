"""Tests for the Germany G-BA adapter using sample XML data.

The sample XML matches the real AIS format (BE_COLLECTION > BE > ZUL +
PAT_GR_INFO_COLLECTION > ID_PAT_GR) where most values are in "value"
attributes rather than text content.
"""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.germany_gba import GermanyGBA, BENEFIT_TRANSLATIONS, EVIDENCE_TRANSLATIONS


# ── Sample XML matching the real AIS format ──────────────────────────

SAMPLE_XML = """\
<?xml version="1.0" encoding="UTF-8"?>
<BE_COLLECTION generated="2024-01-01T00:00:00">
  <BE>
    <UES_BE value="G-BA Beschluss §35a SGB V"/>
    <ID_BE value="500"/>
    <ID_BE_AKZ value="2020-01-15-D-500"/>
    <ZUL>
      <ID_HN value="100"/>
      <NAME_HN value="Keytruda"/>
      <AWG><![CDATA[<div>Melanom: Behandlung des nicht resezierbaren oder metastasierten Melanoms bei Erwachsenen</div>]]></AWG>
      <SOND_ZUL_ORPHAN value="0"/>
    </ZUL>
    <URL_TEXT value="Zur Nutzenbewertung"/>
    <URL value="https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/500/"/>
    <REG_NB value="Beschluss_reg"/>
    <PAT_GR_INFO_COLLECTION>
      <ID_PAT_GR value="1">
        <WS_BEW>
          <NAME_WS_BEW value="Pembrolizumab"/>
        </WS_BEW>
        <DATUM_BE_VOM value="2020-06-18"/>
        <AWG_BESCHLUSS value="Melanom: Behandlung des nicht resezierbaren oder metastasierten Melanoms bei Erwachsenen"/>
        <NAME_PAT_GR><![CDATA[<div>Erwachsene mit nicht resezierbarem oder metastasiertem Melanom ohne BRAF-V600-Mutation</div>]]></NAME_PAT_GR>
        <ZN_A value="beträchtlich"/>
        <ZN_W value="Hinweis"/>
        <ZN_TEXT><![CDATA[<div>Ein beträchtlicher Zusatznutzen ist belegt.</div>]]></ZN_TEXT>
        <ZVT_BEST>
          <UES_ZVT value="zVT"/>
          <NAME_ZVT_BEST value="Ipilimumab"/>
        </ZVT_BEST>
      </ID_PAT_GR>
      <ID_PAT_GR value="2">
        <WS_BEW>
          <NAME_WS_BEW value="Pembrolizumab"/>
        </WS_BEW>
        <DATUM_BE_VOM value="2020-06-18"/>
        <AWG_BESCHLUSS value="Melanom: Behandlung des nicht resezierbaren oder metastasierten Melanoms bei Erwachsenen"/>
        <NAME_PAT_GR><![CDATA[<div>Erwachsene mit nicht resezierbarem oder metastasiertem Melanom mit BRAF-V600-Mutation</div>]]></NAME_PAT_GR>
        <ZN_A value="nicht quantifizierbar"/>
        <ZN_W value="Anhaltspunkt"/>
        <ZN_TEXT><![CDATA[<div>Ein nicht quantifizierbarer Zusatznutzen.</div>]]></ZN_TEXT>
        <ZVT_BEST>
          <UES_ZVT value="zVT"/>
          <NAME_ZVT_BEST value="Vemurafenib"/>
        </ZVT_BEST>
      </ID_PAT_GR>
    </PAT_GR_INFO_COLLECTION>
  </BE>
  <BE>
    <UES_BE value="G-BA Beschluss §35a SGB V"/>
    <ID_BE value="400"/>
    <ID_BE_AKZ value="2019-03-01-D-400"/>
    <ZUL>
      <ID_HN value="200"/>
      <NAME_HN value="Ozempic"/>
      <AWG><![CDATA[<div>Typ-2-Diabetes mellitus</div>]]></AWG>
      <SOND_ZUL_ORPHAN value="0"/>
    </ZUL>
    <URL value="https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/400/"/>
    <REG_NB value="Beschluss_reg"/>
    <PAT_GR_INFO_COLLECTION>
      <ID_PAT_GR value="3">
        <WS_BEW>
          <NAME_WS_BEW value="Semaglutid"/>
        </WS_BEW>
        <DATUM_BE_VOM value="2019-09-05"/>
        <NAME_PAT_GR><![CDATA[<div>Monotherapie bei Erwachsenen mit Typ-2-Diabetes</div>]]></NAME_PAT_GR>
        <ZN_A value="gering"/>
        <ZN_W value="Beleg"/>
        <ZVT_BEST>
          <NAME_ZVT_BEST value="Metformin"/>
        </ZVT_BEST>
      </ID_PAT_GR>
    </PAT_GR_INFO_COLLECTION>
  </BE>
  <BE>
    <UES_BE value="G-BA Beschluss §35a SGB V"/>
    <ID_BE value="650"/>
    <ID_BE_AKZ value="2021-07-01-D-650"/>
    <ZUL>
      <ID_HN value="300"/>
      <NAME_HN value="Opdivo"/>
      <AWG><![CDATA[<div>Nicht-kleinzelliges Lungenkarzinom (NSCLC)</div>]]></AWG>
      <SOND_ZUL_ORPHAN value="0"/>
    </ZUL>
    <URL value="https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/650/"/>
    <REG_NB value="Beschluss_reg"/>
    <PAT_GR_INFO_COLLECTION>
      <ID_PAT_GR value="4">
        <WS_BEW>
          <NAME_WS_BEW value="Nivolumab"/>
        </WS_BEW>
        <DATUM_BE_VOM value="2021-12-02"/>
        <NAME_PAT_GR><![CDATA[<div>Erwachsene mit fortgeschrittenem NSCLC nach Chemotherapie</div>]]></NAME_PAT_GR>
        <ZN_A value="kein Zusatznutzen"/>
        <ZN_W value="Beleg"/>
        <ZVT_BEST>
          <NAME_ZVT_BEST value="Docetaxel"/>
        </ZVT_BEST>
      </ID_PAT_GR>
    </PAT_GR_INFO_COLLECTION>
  </BE>
</BE_COLLECTION>
""".encode("utf-8")


@pytest.fixture
def gba_service():
    """Create a G-BA adapter pre-loaded with sample XML data."""
    service = GermanyGBA()
    service._decisions = service._parse_xml(SAMPLE_XML)
    service._loaded = True
    return service


def test_parse_xml_count(gba_service):
    """Should parse 4 entries: 2 patient groups for pembrolizumab + 1 each for semaglutid and nivolumab."""
    assert len(gba_service._decisions) == 4


def test_parse_xml_substances(gba_service):
    substances = set()
    for d in gba_service._decisions:
        for s in d.get("substances", []):
            substances.add(s)
    assert "Pembrolizumab" in substances
    assert "Semaglutid" in substances
    assert "Nivolumab" in substances


def test_parse_xml_trade_names(gba_service):
    trade_names = set()
    for d in gba_service._decisions:
        for tn in d.get("trade_names", []):
            trade_names.add(tn)
    assert "Keytruda" in trade_names
    assert "Ozempic" in trade_names
    assert "Opdivo" in trade_names


def test_parse_xml_benefit_ratings(gba_service):
    ratings = {d["benefit_rating"] for d in gba_service._decisions}
    assert "beträchtlich" in ratings
    assert "nicht quantifizierbar" in ratings
    assert "gering" in ratings
    assert "kein Zusatznutzen" in ratings


def test_parse_xml_evidence_levels(gba_service):
    levels = {d["evidence_level"] for d in gba_service._decisions}
    assert "Hinweis" in levels
    assert "Anhaltspunkt" in levels
    assert "Beleg" in levels


def test_parse_xml_comparators(gba_service):
    comparators = {d["comparator"] for d in gba_service._decisions if d["comparator"]}
    assert "Ipilimumab" in comparators
    assert "Metformin" in comparators
    assert "Docetaxel" in comparators


def test_parse_xml_decision_dates(gba_service):
    """Decision dates should be extracted from patient group level."""
    dates = {d["decision_date"] for d in gba_service._decisions if d["decision_date"]}
    assert "2020-06-18" in dates
    assert "2019-09-05" in dates
    assert "2021-12-02" in dates


def test_parse_xml_urls(gba_service):
    """Direct URLs from XML should be preserved."""
    urls = {d["url"] for d in gba_service._decisions if d.get("url")}
    assert "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/500/" in urls
    assert "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/400/" in urls


def test_parse_xml_patient_groups_stripped(gba_service):
    """Patient group descriptions should have HTML tags stripped."""
    groups = {d["patient_group"] for d in gba_service._decisions if d.get("patient_group")}
    # Should not contain <div> tags
    for g in groups:
        assert "<div>" not in g
        assert "</div>" not in g
    # Content should be preserved
    assert any("BRAF" in g for g in groups)


@pytest.mark.asyncio
async def test_search_by_substance(gba_service):
    results = await gba_service.search_assessments("Pembrolizumab")
    assert len(results) == 2  # two patient groups
    for r in results:
        assert "Keytruda" in r.product_name


@pytest.mark.asyncio
async def test_search_case_insensitive(gba_service):
    results = await gba_service.search_assessments("pembrolizumab")
    assert len(results) == 2


@pytest.mark.asyncio
async def test_search_by_product_name(gba_service):
    results = await gba_service.search_assessments("irrelevant", product_name="Keytruda")
    assert len(results) == 2


@pytest.mark.asyncio
async def test_search_returns_benefit_rating(gba_service):
    results = await gba_service.search_assessments("Pembrolizumab")
    ratings = {r.benefit_rating for r in results}
    assert "beträchtlich" in ratings
    assert "nicht quantifizierbar" in ratings


@pytest.mark.asyncio
async def test_search_returns_evidence_level(gba_service):
    results = await gba_service.search_assessments("Pembrolizumab")
    levels = {r.evidence_level for r in results}
    assert any("Hinweis" in l for l in levels)
    assert any("Anhaltspunkt" in l for l in levels)


@pytest.mark.asyncio
async def test_search_returns_comparator(gba_service):
    results = await gba_service.search_assessments("Pembrolizumab")
    comparators = {r.comparator for r in results}
    assert "Ipilimumab" in comparators
    assert "Vemurafenib" in comparators


@pytest.mark.asyncio
async def test_search_returns_patient_group(gba_service):
    results = await gba_service.search_assessments("Pembrolizumab")
    groups = {r.patient_group for r in results}
    assert any("BRAF" in g for g in groups)


@pytest.mark.asyncio
async def test_search_returns_indication(gba_service):
    results = await gba_service.search_assessments("Pembrolizumab")
    assert any("Melanom" in r.evaluation_reason for r in results)


@pytest.mark.asyncio
async def test_search_returns_assessment_url(gba_service):
    """Search results should include the direct URL from the XML."""
    results = await gba_service.search_assessments("Pembrolizumab")
    assert any("nutzenbewertung/500" in r.assessment_url for r in results)


@pytest.mark.asyncio
async def test_search_sorted_most_recent_first(gba_service):
    results = await gba_service.search_assessments("Pembrolizumab")
    dates = [r.opinion_date for r in results]
    assert dates == sorted(dates, reverse=True)


@pytest.mark.asyncio
async def test_search_no_match(gba_service):
    results = await gba_service.search_assessments("nonexistentsubstance")
    assert len(results) == 0


@pytest.mark.asyncio
async def test_search_semaglutid(gba_service):
    results = await gba_service.search_assessments("Semaglutid")
    assert len(results) == 1
    assert results[0].benefit_rating == "gering"
    assert "Metformin" in results[0].comparator


@pytest.mark.asyncio
async def test_search_kein_zusatznutzen(gba_service):
    results = await gba_service.search_assessments("Nivolumab")
    assert len(results) == 1
    assert results[0].benefit_rating == "kein Zusatznutzen"


@pytest.mark.asyncio
async def test_not_loaded():
    service = GermanyGBA()
    results = await service.search_assessments("Pembrolizumab")
    assert len(results) == 0


def test_country_info():
    service = GermanyGBA()
    info = service.get_country_info()
    assert info.code == "DE"
    assert info.name == "Germany"
    assert info.agency == "G-BA"
    assert info.is_loaded is False


def test_country_info_loaded(gba_service):
    """is_loaded must be True once the service has data."""
    info = gba_service.get_country_info()
    assert info.is_loaded is True


def test_normalize_date():
    service = GermanyGBA()
    assert service._normalize_date("2020-06-18") == "2020-06-18"
    assert service._normalize_date("20200618") == "2020-06-18"
    assert service._normalize_date("18.06.2020") == "2020-06-18"
    assert service._normalize_date("") == ""


def test_benefit_translations():
    assert "Major" in BENEFIT_TRANSLATIONS["erheblich"]
    assert "Considerable" in BENEFIT_TRANSLATIONS["beträchtlich"]
    assert "Minor" in BENEFIT_TRANSLATIONS["gering"]
    assert "No added" in BENEFIT_TRANSLATIONS["kein Zusatznutzen"]


def test_evidence_translations():
    assert "Proof" in EVIDENCE_TRANSLATIONS["Beleg"]
    assert "Indication" in EVIDENCE_TRANSLATIONS["Hinweis"]
    assert "Hint" in EVIDENCE_TRANSLATIONS["Anhaltspunkt"]


def test_parse_empty_xml():
    service = GermanyGBA()
    result = service._parse_xml(b"<root></root>")
    assert result == []


def test_parse_invalid_xml():
    service = GermanyGBA()
    result = service._parse_xml(b"not xml at all")
    assert result == []


def test_strip_html():
    service = GermanyGBA()
    assert service._strip_html("<div>Hello <b>World</b></div>") == "Hello World"
    assert service._strip_html("") == ""
    assert service._strip_html("no tags") == "no tags"


def test_get_text_value_attr():
    """_get_text should read value attributes (real AIS format)."""
    service = GermanyGBA()
    xml = ET.fromstring('<parent><NAME_HN value="Keytruda"/></parent>')
    assert service._get_text(xml, ["NAME_HN"]) == "Keytruda"


def test_get_text_text_content():
    """_get_text should fall back to text content (legacy format)."""
    service = GermanyGBA()
    xml = ET.fromstring('<parent><AWG>Melanom indication</AWG></parent>')
    assert service._get_text(xml, ["AWG"]) == "Melanom indication"


def test_procedure_id_extracted_from_trailing_number():
    """The procedure URL should use the trailing sequential number, not the year."""
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<BE_COLLECTION>'
        '<BE>'
        '<ID_BE_AKZ value="2024-01-15-D-1234"/>'
        '<ZUL><NAME_HN value="Itovebi"/>'
        '<AWG>Mammakarzinom</AWG></ZUL>'
        '<URL value="https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/1234/"/>'
        '<PAT_GR_INFO_COLLECTION>'
        '<ID_PAT_GR value="1">'
        '<WS_BEW><NAME_WS_BEW value="Inavolisib"/></WS_BEW>'
        '<DATUM_BE_VOM value="2024-06-01"/>'
        '<NAME_PAT_GR>HR-positive, HER2-negative Mammakarzinom</NAME_PAT_GR>'
        '<ZN_A value="betr\u00e4chtlich"/>'
        '<ZN_W value="Hinweis"/>'
        '<ZVT_BEST><NAME_ZVT_BEST value="Fulvestrant"/></ZVT_BEST>'
        '</ID_PAT_GR>'
        '</PAT_GR_INFO_COLLECTION>'
        '</BE>'
        '</BE_COLLECTION>'
    ).encode("utf-8")
    service = GermanyGBA()
    decisions = service._parse_xml(xml)
    assert len(decisions) == 1
    assert decisions[0]["procedure_id"] == "1234"
    assert decisions[0]["substances"] == ["Inavolisib"]
    assert decisions[0]["trade_names"] == ["Itovebi"]
    assert decisions[0]["benefit_rating"] == "beträchtlich"
    assert decisions[0]["evidence_level"] == "Hinweis"
    assert decisions[0]["comparator"] == "Fulvestrant"
    assert decisions[0]["decision_date"] == "2024-06-01"


@pytest.mark.asyncio
async def test_search_inavolisib(gba_service):
    """Confirm substance-name matching is case-insensitive."""
    gba_service._decisions.append({
        "decision_id": "2024-01-15-D-1234",
        "procedure_id": "1234",
        "substances": ["Inavolisib"],
        "trade_names": ["Itovebi"],
        "indication": "Mammakarzinom",
        "decision_date": "2024-06-01",
        "benefit_rating": "beträchtlich",
        "evidence_level": "Hinweis",
        "comparator": "Fulvestrant",
        "patient_group": "HR-positive, HER2-negative Mammakarzinom",
    })
    results = await gba_service.search_assessments("inavolisib")
    assert len(results) >= 1
    assert any("Itovebi" in r.product_name for r in results)
    assert any(r.benefit_rating == "beträchtlich" for r in results)


@pytest.mark.asyncio
async def test_search_itovebi_by_product_name(gba_service):
    """Trade-name search for itovebi should find inavolisib entries."""
    gba_service._decisions.append({
        "decision_id": "2024-01-15-D-1234",
        "procedure_id": "1234",
        "substances": ["Inavolisib"],
        "trade_names": ["Itovebi"],
        "indication": "Mammakarzinom",
        "decision_date": "2024-06-01",
        "benefit_rating": "gering",
        "evidence_level": "Beleg",
        "comparator": "Fulvestrant",
        "patient_group": "HR-positive Mammakarzinom",
    })
    results = await gba_service.search_assessments("nomatch", product_name="Itovebi")
    assert len(results) >= 1


# ── File-based loading tests ──────────────────────────────────────────

def test_save_and_load_roundtrip(gba_service):
    """save_to_file → load_from_file produces same decisions."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "DE.json"
        gba_service.save_to_file(data_file)
        assert data_file.exists()

        fresh = GermanyGBA()
        assert not fresh.is_loaded
        result = fresh.load_from_file(data_file)
        assert result is True
        assert fresh.is_loaded
        assert len(fresh._decisions) == len(gba_service._decisions)


def test_load_from_file_bad_file_returns_false():
    """load_from_file on a missing file returns False and leaves service unloaded."""
    service = GermanyGBA()
    result = service.load_from_file(Path("/nonexistent/DE.json"))
    assert result is False
    assert not service.is_loaded


def test_load_from_file_invalid_envelope_returns_false():
    """load_from_file with wrong envelope structure returns False."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "DE.json"
        data_file.write_text(json.dumps({"data": "not-a-list"}))
        service = GermanyGBA()
        assert service.load_from_file(data_file) is False
        assert not service.is_loaded


def test_save_to_file_no_op_when_not_loaded():
    """save_to_file does nothing when data has not been loaded."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "DE.json"
        GermanyGBA().save_to_file(data_file)
        assert not data_file.exists()


def test_save_creates_parent_directories(gba_service):
    """save_to_file creates missing parent directories."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "subdir" / "DE.json"
        gba_service.save_to_file(data_file)
        assert data_file.exists()
        payload = json.loads(data_file.read_text())
        assert payload["agency"] == "G-BA"
        assert isinstance(payload["data"], list)


# Need to import ET for the unit tests
import xml.etree.ElementTree as ET
