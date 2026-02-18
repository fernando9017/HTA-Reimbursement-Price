"""Tests for the Germany G-BA adapter using sample XML data."""

import pytest

from app.config import GBA_ASSESSMENT_BASE_URL
from app.services.hta_agencies.germany_gba import (
    GermanyGBA,
    BENEFIT_TRANSLATIONS,
    EVIDENCE_TRANSLATIONS,
    _normalize_date,
    _parse_listing_page,
    _enrich_with_listing_urls,
    _matches,
    _merge_decisions,
)


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


def test_normalize_date():
    assert _normalize_date("2020-06-18") == "2020-06-18"
    assert _normalize_date("20200618") == "2020-06-18"
    assert _normalize_date("18.06.2020") == "2020-06-18"
    assert _normalize_date("") == ""


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


# ── Listing page parsing tests ──────────────────────────────────────


SAMPLE_LISTING_HTML = """\
<html>
<body>
<div class="bewertungsverfahren-list">
  <a href="/bewertungsverfahren/nutzenbewertung/1133/">
    Enfortumab Vedotin (Neues Anwendungsgebiet: Urothelkarzinom, Erstlinie)
  </a>
  <span>03.04.2025</span>
  <a href="/bewertungsverfahren/nutzenbewertung/1132/">
    Pembrolizumab (Neues Anwendungsgebiet: Urothelkarzinom, Kombination mit Enfortumab Vedotin)
  </a>
  <span>03.04.2025</span>
  <a href="/bewertungsverfahren/nutzenbewertung/833/">
    Semaglutid (Erstmalige Dossierpflicht: Typ-2-Diabetes)
  </a>
  <span>01.08.2023</span>
</div>
</body>
</html>
"""


def test_parse_listing_page_count():
    entries = _parse_listing_page(SAMPLE_LISTING_HTML)
    assert len(entries) == 3


def test_parse_listing_page_urls():
    entries = _parse_listing_page(SAMPLE_LISTING_HTML)
    urls = {e["url"] for e in entries}
    assert "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/1133/" in urls
    assert "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/1132/" in urls
    assert "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/833/" in urls


def test_parse_listing_page_procedure_ids():
    entries = _parse_listing_page(SAMPLE_LISTING_HTML)
    ids = {e["procedure_id"] for e in entries}
    assert "1133" in ids
    assert "1132" in ids
    assert "833" in ids


def test_parse_listing_page_titles():
    entries = _parse_listing_page(SAMPLE_LISTING_HTML)
    titles = [e["title"] for e in entries]
    assert any("Enfortumab" in t for t in titles)
    assert any("Pembrolizumab" in t for t in titles)
    assert any("Semaglutid" in t for t in titles)


@pytest.mark.asyncio
async def test_listing_entry_to_result():
    """Listing entries merged into decisions should produce correct AssessmentResults."""
    listing = _parse_listing_page(SAMPLE_LISTING_HTML)
    merged = _merge_decisions([], [], listing)

    service = GermanyGBA()
    service._decisions = merged
    service._loaded = True

    results = await service.search_assessments("Enfortumab Vedotin")
    assert len(results) >= 1
    assert "1133" in results[0].assessment_url


def test_enrichment_links_xml_decisions_to_listing():
    """Enrichment should add listing URLs to matching AIS XML decisions."""
    service = GermanyGBA()
    decisions = service._parse_xml(SAMPLE_XML)
    listing_entries = [
        {
            "procedure_id": "500",
            "title": "Pembrolizumab (Melanom)",
            "url": "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/500/",
            "substance": "Pembrolizumab",
            "date": "2020-06-18",
        },
    ]
    _enrich_with_listing_urls(decisions, listing_entries)

    # All Pembrolizumab decisions should now have the enriched URL
    for dec in decisions:
        if "Pembrolizumab" in dec.get("substances", []):
            assert dec["assessment_url"] == "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/500/"


@pytest.mark.asyncio
async def test_search_with_listing_fallback():
    """When AIS XML has no matches, listing entries merged in should be used."""
    listing = [
        {
            "procedure_id": "1133",
            "title": "Enfortumab Vedotin (Urothelkarzinom)",
            "url": "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/1133/",
            "substance": "Enfortumab Vedotin",
            "date": "2025-04-03",
        },
    ]
    merged = _merge_decisions([], [], listing)

    service = GermanyGBA()
    service._decisions = merged
    service._loaded = True

    results = await service.search_assessments("Enfortumab Vedotin")
    assert len(results) == 1
    assert "1133" in results[0].assessment_url
    assert results[0].opinion_date == "2025-04-03"


@pytest.mark.asyncio
async def test_assessment_url_fallback_to_listing_base():
    """When no listing data available, assessment URL should fall back to base URL."""
    service = GermanyGBA()
    service._decisions = service._parse_xml(SAMPLE_XML)
    service._loaded = True

    results = await service.search_assessments("Pembrolizumab")
    assert len(results) == 2
    # URL should be the base listing page (not a broken procedure URL)
    for r in results:
        assert r.assessment_url == GBA_ASSESSMENT_BASE_URL


# ── Seed data tests ──────────────────────────────────────────────


def test_seed_data_loads():
    """The bundled seed data file should load and contain entries."""
    service = GermanyGBA()
    seed = service._load_seed_data()
    assert len(seed) > 0
    # Verify structure of entries
    for entry in seed:
        assert "substances" in entry
        assert "assessment_url" in entry


def test_seed_data_contains_padcev():
    """Seed data should contain the Padcev (Enfortumab Vedotin) entry."""
    service = GermanyGBA()
    seed = service._load_seed_data()
    padcev = [e for e in seed if "Enfortumab Vedotin" in e.get("substances", [])]
    assert len(padcev) >= 1
    assert "1133" in padcev[0]["assessment_url"]


@pytest.mark.asyncio
async def test_seed_data_search_pembrolizumab():
    """Searching for Pembrolizumab in seed data should return multiple results."""
    service = GermanyGBA()
    service._decisions = service._load_seed_data()
    service._loaded = True

    results = await service.search_assessments("Pembrolizumab")
    assert len(results) >= 2
    # All results should have valid assessment URLs
    for r in results:
        assert "g-ba.de" in r.assessment_url


def test_merge_deduplicates():
    """Merging seed + live data should deduplicate by substance+date."""
    seed = [
        {"substances": ["TestDrug"], "trade_names": ["Brand"], "decision_date": "2024-01-01",
         "assessment_url": "https://example.com/seed", "benefit_rating": "gering",
         "evidence_level": "Beleg", "comparator": "", "patient_group": ""},
    ]
    live = [
        {"substances": ["TestDrug"], "trade_names": ["Brand"], "decision_date": "2024-01-01",
         "assessment_url": "https://example.com/live", "benefit_rating": "gering",
         "evidence_level": "Beleg", "comparator": "", "patient_group": ""},
    ]
    merged = _merge_decisions(seed, live, [])
    # Should deduplicate to just 1 entry (seed wins)
    assert len(merged) == 1
    assert merged[0]["assessment_url"] == "https://example.com/seed"
