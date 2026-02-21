"""Tests for the Germany G-BA adapter using sample XML data."""

import pytest

from app.services.hta_agencies.germany_gba import GermanyGBA, BENEFIT_TRANSLATIONS, EVIDENCE_TRANSLATIONS


SAMPLE_XML = """\
<?xml version="1.0" encoding="UTF-8"?>
<G-BA_Beschluss_Info>
  <Beschluss>
    <ID_BE_AKZ>2020-01-15-D-500</ID_BE_AKZ>
    <DAT_BESCHLUSS>2020-06-18</DAT_BESCHLUSS>
    <AWG>Melanom: Behandlung des nicht resezierbaren oder metastasierten Melanoms bei Erwachsenen</AWG>
    <REG_NB>Beschluss_reg</REG_NB>
    <WS_BEW>
      <NAME_WS>Pembrolizumab</NAME_WS>
      <ATC>L01FF02</ATC>
    </WS_BEW>
    <HN>
      <NAME_HN ID_HN="1">Keytruda</NAME_HN>
    </HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>Erwachsene mit nicht resezierbarem oder metastasiertem Melanom ohne BRAF-V600-Mutation</BEZ_PAT_GR>
      <ZN_W>beträchtlich</ZN_W>
      <AUSSAGESICHERHEIT>Hinweis</AUSSAGESICHERHEIT>
      <VGL_TH>
        <NAME_VGL_TH>Ipilimumab</NAME_VGL_TH>
      </VGL_TH>
    </PAT_GR>
    <PAT_GR>
      <ID_PAT_GR>b</ID_PAT_GR>
      <BEZ_PAT_GR>Erwachsene mit nicht resezierbarem oder metastasiertem Melanom mit BRAF-V600-Mutation</BEZ_PAT_GR>
      <ZN_W>nicht quantifizierbar</ZN_W>
      <AUSSAGESICHERHEIT>Anhaltspunkt</AUSSAGESICHERHEIT>
      <VGL_TH>
        <NAME_VGL_TH>Vemurafenib</NAME_VGL_TH>
      </VGL_TH>
    </PAT_GR>
  </Beschluss>
  <Beschluss>
    <ID_BE_AKZ>2019-03-01-D-400</ID_BE_AKZ>
    <DAT_BESCHLUSS>2019-09-05</DAT_BESCHLUSS>
    <AWG>Typ-2-Diabetes mellitus</AWG>
    <REG_NB>Beschluss_reg</REG_NB>
    <WS_BEW>
      <NAME_WS>Semaglutid</NAME_WS>
      <ATC>A10BJ06</ATC>
    </WS_BEW>
    <HN>
      <NAME_HN ID_HN="1">Ozempic</NAME_HN>
    </HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>Monotherapie bei Erwachsenen mit Typ-2-Diabetes</BEZ_PAT_GR>
      <ZN_W>gering</ZN_W>
      <AUSSAGESICHERHEIT>Beleg</AUSSAGESICHERHEIT>
      <VGL_TH>
        <NAME_VGL_TH>Metformin</NAME_VGL_TH>
      </VGL_TH>
    </PAT_GR>
  </Beschluss>
  <Beschluss>
    <ID_BE_AKZ>2021-07-01-D-650</ID_BE_AKZ>
    <DAT_BESCHLUSS>2021-12-02</DAT_BESCHLUSS>
    <AWG>Nicht-kleinzelliges Lungenkarzinom (NSCLC)</AWG>
    <REG_NB>Beschluss_reg</REG_NB>
    <WS_BEW>
      <NAME_WS>Nivolumab</NAME_WS>
      <ATC>L01FF01</ATC>
    </WS_BEW>
    <HN>
      <NAME_HN ID_HN="1">Opdivo</NAME_HN>
    </HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>Erwachsene mit fortgeschrittenem NSCLC nach Chemotherapie</BEZ_PAT_GR>
      <ZN_W>kein Zusatznutzen</ZN_W>
      <AUSSAGESICHERHEIT>Beleg</AUSSAGESICHERHEIT>
      <VGL_TH>
        <NAME_VGL_TH>Docetaxel</NAME_VGL_TH>
      </VGL_TH>
    </PAT_GR>
  </Beschluss>
</G-BA_Beschluss_Info>
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
    # Before data is loaded the flag must be False so the frontend can
    # show a "data unavailable" indicator instead of a 503 error.
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


def test_procedure_id_extracted_from_trailing_number():
    """The procedure URL should use the trailing sequential number, not the year.

    Regression test: previously re.search(r'(\\d{2,})', '2024-01-15-D-1234')
    would match '2024' (the year) instead of '1234' (the actual procedure ID).
    The fixed pattern looks for a '-D-<digits>' suffix first, then falls back
    to the last numeric segment.
    """
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<G-BA_Beschluss_Info>'
        '<Beschluss>'
        '<ID_BE_AKZ>2024-01-15-D-1234</ID_BE_AKZ>'
        '<DAT_BESCHLUSS>2024-06-01</DAT_BESCHLUSS>'
        '<AWG>Mammakarzinom</AWG>'
        '<WS_BEW><NAME_WS>Inavolisib</NAME_WS></WS_BEW>'
        '<HN><NAME_HN ID_HN="1">Itovebi</NAME_HN></HN>'
        '<PAT_GR>'
        '<ID_PAT_GR>a</ID_PAT_GR>'
        '<BEZ_PAT_GR>HR-positive, HER2-negative Mammakarzinom</BEZ_PAT_GR>'
        '<ZN_W>betr\u00e4chtlich</ZN_W>'
        '<AUSSAGESICHERHEIT>Hinweis</AUSSAGESICHERHEIT>'
        '</PAT_GR>'
        '</Beschluss>'
        '</G-BA_Beschluss_Info>'
    ).encode("utf-8")
    service = GermanyGBA()
    decisions = service._parse_xml(xml)
    assert len(decisions) == 1
    # procedure_id must be "1234", not "2024"
    assert decisions[0]["procedure_id"] == "1234"


@pytest.mark.asyncio
async def test_search_inavolisib(gba_service):
    """Confirm substance-name matching is case-insensitive."""
    # Inject an inavolisib entry into the fixture service
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
