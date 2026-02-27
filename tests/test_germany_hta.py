"""Tests for the Germany G-BA HTA Deep-Dive service."""

import pytest

from app.services.hta_agencies.germany_gba import GermanyGBA, BENEFIT_TRANSLATIONS
from app.services.germany_hta import GermanyHTAService, BENEFIT_ORDER


# ── Sample XML data ──────────────────────────────────────────────────

SAMPLE_XML = """\
<?xml version="1.0" encoding="UTF-8"?>
<G-BA_Beschluss_Info>
  <!-- Pembrolizumab: melanoma with 2 subpopulations (2020 decision) -->
  <Beschluss>
    <ID_BE_AKZ>2020-01-15-D-500</ID_BE_AKZ>
    <DAT_BESCHLUSS>2020-06-18</DAT_BESCHLUSS>
    <AWG>Melanom: Behandlung des nicht resezierbaren oder metastasierten Melanoms bei Erwachsenen</AWG>
    <WS_BEW><NAME_WS>Pembrolizumab</NAME_WS></WS_BEW>
    <HN><NAME_HN ID_HN="1">Keytruda</NAME_HN></HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>Erwachsene mit nicht resezierbarem oder metastasiertem Melanom ohne BRAF-V600-Mutation</BEZ_PAT_GR>
      <ZN_W>beträchtlich</ZN_W>
      <AUSSAGESICHERHEIT>Hinweis</AUSSAGESICHERHEIT>
      <VGL_TH><NAME_VGL_TH>Ipilimumab</NAME_VGL_TH></VGL_TH>
    </PAT_GR>
    <PAT_GR>
      <ID_PAT_GR>b</ID_PAT_GR>
      <BEZ_PAT_GR>Erwachsene mit nicht resezierbarem oder metastasiertem Melanom mit BRAF-V600-Mutation</BEZ_PAT_GR>
      <ZN_W>nicht quantifizierbar</ZN_W>
      <AUSSAGESICHERHEIT>Anhaltspunkt</AUSSAGESICHERHEIT>
      <VGL_TH><NAME_VGL_TH>Vemurafenib</NAME_VGL_TH></VGL_TH>
    </PAT_GR>
  </Beschluss>

  <!-- Pembrolizumab: melanoma re-assessment (2023 — SUPERSEDES 2020) -->
  <Beschluss>
    <ID_BE_AKZ>2023-05-10-D-800</ID_BE_AKZ>
    <DAT_BESCHLUSS>2023-11-02</DAT_BESCHLUSS>
    <AWG>Melanom: Behandlung des nicht resezierbaren oder metastasierten Melanoms bei Erwachsenen</AWG>
    <WS_BEW><NAME_WS>Pembrolizumab</NAME_WS></WS_BEW>
    <HN><NAME_HN ID_HN="1">Keytruda</NAME_HN></HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>Erwachsene Melanom ohne BRAF-Mutation</BEZ_PAT_GR>
      <ZN_W>erheblich</ZN_W>
      <AUSSAGESICHERHEIT>Beleg</AUSSAGESICHERHEIT>
      <VGL_TH><NAME_VGL_TH>Nivolumab</NAME_VGL_TH></VGL_TH>
    </PAT_GR>
  </Beschluss>

  <!-- Pembrolizumab: NSCLC (different indication — should NOT be superseded) -->
  <Beschluss>
    <ID_BE_AKZ>2021-09-01-D-600</ID_BE_AKZ>
    <DAT_BESCHLUSS>2021-03-15</DAT_BESCHLUSS>
    <AWG>NSCLC: Erstlinienbehandlung des metastasierten nicht-kleinzelligen Lungenkarzinoms</AWG>
    <WS_BEW><NAME_WS>Pembrolizumab</NAME_WS></WS_BEW>
    <HN><NAME_HN ID_HN="1">Keytruda</NAME_HN></HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>PD-L1 TPS &gt;= 50%, keine EGFR/ALK-Aberration</BEZ_PAT_GR>
      <ZN_W>beträchtlich</ZN_W>
      <AUSSAGESICHERHEIT>Hinweis</AUSSAGESICHERHEIT>
      <VGL_TH><NAME_VGL_TH>Platin-basierte Chemotherapie</NAME_VGL_TH></VGL_TH>
    </PAT_GR>
  </Beschluss>

  <!-- Semaglutid: diabetes -->
  <Beschluss>
    <ID_BE_AKZ>2019-03-01-D-400</ID_BE_AKZ>
    <DAT_BESCHLUSS>2019-09-05</DAT_BESCHLUSS>
    <AWG>Typ-2-Diabetes mellitus</AWG>
    <WS_BEW><NAME_WS>Semaglutid</NAME_WS></WS_BEW>
    <HN><NAME_HN ID_HN="1">Ozempic</NAME_HN></HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>Monotherapie bei Erwachsenen mit Typ-2-Diabetes</BEZ_PAT_GR>
      <ZN_W>gering</ZN_W>
      <AUSSAGESICHERHEIT>Beleg</AUSSAGESICHERHEIT>
      <VGL_TH><NAME_VGL_TH>Metformin</NAME_VGL_TH></VGL_TH>
    </PAT_GR>
  </Beschluss>

  <!-- Nivolumab: NSCLC (kein Zusatznutzen) -->
  <Beschluss>
    <ID_BE_AKZ>2021-07-01-D-650</ID_BE_AKZ>
    <DAT_BESCHLUSS>2021-12-02</DAT_BESCHLUSS>
    <AWG>Nicht-kleinzelliges Lungenkarzinom (NSCLC)</AWG>
    <WS_BEW><NAME_WS>Nivolumab</NAME_WS></WS_BEW>
    <HN><NAME_HN ID_HN="1">Opdivo</NAME_HN></HN>
    <PAT_GR>
      <ID_PAT_GR>a</ID_PAT_GR>
      <BEZ_PAT_GR>Erwachsene mit fortgeschrittenem NSCLC nach Chemotherapie</BEZ_PAT_GR>
      <ZN_W>kein Zusatznutzen</ZN_W>
      <AUSSAGESICHERHEIT>Beleg</AUSSAGESICHERHEIT>
      <VGL_TH><NAME_VGL_TH>Docetaxel</NAME_VGL_TH></VGL_TH>
    </PAT_GR>
  </Beschluss>
</G-BA_Beschluss_Info>
""".encode("utf-8")


@pytest.fixture
def gba_adapter():
    """G-BA adapter pre-loaded with sample XML."""
    adapter = GermanyGBA()
    adapter._decisions = adapter._parse_xml(SAMPLE_XML)
    adapter._loaded = True
    return adapter


@pytest.fixture
def service(gba_adapter):
    """Germany HTA deep-dive service wrapping the adapter."""
    return GermanyHTAService(gba_adapter)


# ── Service state tests ──────────────────────────────────────────────


def test_is_loaded(service):
    assert service.is_loaded is True


def test_not_loaded():
    adapter = GermanyGBA()
    svc = GermanyHTAService(adapter)
    assert svc.is_loaded is False


# ── Drug listing / search tests ──────────────────────────────────────


def test_search_all_drugs(service):
    """Should list 3 substances: Pembrolizumab, Semaglutid, Nivolumab."""
    result = service.search_drugs()
    assert result.total == 3
    substances = {r.active_substance for r in result.results}
    assert "Pembrolizumab" in substances
    assert "Semaglutid" in substances
    assert "Nivolumab" in substances


def test_search_by_query(service):
    """Text search should match substance name."""
    result = service.search_drugs(query="pembrolizumab")
    assert result.total == 1
    assert result.results[0].active_substance == "Pembrolizumab"


def test_search_by_trade_name(service):
    """Search should match trade names."""
    result = service.search_drugs(query="keytruda")
    assert result.total == 1
    assert result.results[0].active_substance == "Pembrolizumab"


def test_search_by_indication(service):
    """Search should match indication text."""
    result = service.search_drugs(query="melanom")
    assert result.total == 1
    assert result.results[0].active_substance == "Pembrolizumab"


def test_search_by_benefit_filter(service):
    """Filter by benefit rating."""
    result = service.search_drugs(benefit_rating="gering")
    assert result.total == 1
    assert result.results[0].active_substance == "Semaglutid"


def test_search_no_results(service):
    """Query that matches nothing should return empty."""
    result = service.search_drugs(query="nonexistent_drug_xyz")
    assert result.total == 0


def test_drug_list_has_trade_names(service):
    """Drug list items should include trade names."""
    result = service.search_drugs(query="pembrolizumab")
    assert "Keytruda" in result.results[0].trade_names


def test_drug_list_has_indications(service):
    """Drug list items should include indications."""
    result = service.search_drugs(query="pembrolizumab")
    indications = result.results[0].indications
    # Should have 2 indications: melanoma (current re-assessment) + NSCLC
    assert len(indications) >= 2
    assert any("Melanom" in i for i in indications)
    assert any("NSCLC" in i for i in indications)


def test_drug_list_best_benefit(service):
    """Best benefit should be the most favorable rating."""
    result = service.search_drugs(query="pembrolizumab")
    # Pembrolizumab has erheblich (from 2023 re-assessment) — that's the best
    assert result.results[0].best_benefit == "erheblich"
    assert "Major" in result.results[0].best_benefit_en


def test_drug_list_sorted_by_date(service):
    """Results should be sorted by latest date descending."""
    result = service.search_drugs()
    dates = [r.latest_date for r in result.results]
    assert dates == sorted(dates, reverse=True)


# ── Current-only filtering (re-assessment supersession) ──────────────


def test_superseded_assessment_filtered(service):
    """The 2020 melanoma assessment should be superseded by the 2023 one."""
    profile = service.get_drug_profile("Pembrolizumab")
    assert profile is not None
    # Current assessments should NOT include the 2020 melanoma decision
    melanoma_dates = [
        a.decision_date
        for a in profile.current_assessments
        if "Melanom" in a.indication
    ]
    assert "2020-06-18" not in melanoma_dates
    assert "2023-11-02" in melanoma_dates


def test_different_indications_not_superseded(service):
    """NSCLC and melanoma are different indications — both should be current."""
    profile = service.get_drug_profile("Pembrolizumab")
    indications = [a.indication for a in profile.current_assessments]
    has_melanoma = any("Melanom" in i for i in indications)
    has_nsclc = any("NSCLC" in i for i in indications)
    assert has_melanoma
    assert has_nsclc


def test_total_current_assessments(service):
    """Pembrolizumab should have 2 current assessments: melanoma (2023) + NSCLC (2021)."""
    profile = service.get_drug_profile("Pembrolizumab")
    assert profile.total_assessments == 2


# ── Drug profile detail tests ────────────────────────────────────────


def test_drug_profile_not_found(service):
    """Non-existent substance should return None."""
    assert service.get_drug_profile("nonexistent") is None


def test_drug_profile_case_insensitive(service):
    """Substance lookup should be case-insensitive."""
    profile = service.get_drug_profile("pembrolizumab")
    assert profile is not None
    assert profile.active_substance == "Pembrolizumab"


def test_drug_profile_subpopulations(service):
    """Assessments should have subpopulation data."""
    profile = service.get_drug_profile("Pembrolizumab")
    melanoma = [a for a in profile.current_assessments if "Melanom" in a.indication]
    assert len(melanoma) == 1
    # The 2023 re-assessment has 1 patient group (simplified from 2 in the 2020 one)
    assert len(melanoma[0].subpopulations) >= 1


def test_subpopulation_has_benefit_rating(service):
    """Each subpopulation should have a benefit rating and English translation."""
    profile = service.get_drug_profile("Pembrolizumab")
    melanoma = [a for a in profile.current_assessments if "Melanom" in a.indication][0]
    for sub in melanoma.subpopulations:
        assert sub.benefit_rating != ""
        assert sub.benefit_rating_en != ""


def test_subpopulation_has_evidence(service):
    """Each subpopulation should have an evidence level."""
    profile = service.get_drug_profile("Pembrolizumab")
    melanoma = [a for a in profile.current_assessments if "Melanom" in a.indication][0]
    for sub in melanoma.subpopulations:
        assert sub.evidence_level != ""
        assert sub.evidence_level_en != ""


def test_subpopulation_has_comparator(service):
    """Subpopulations should have comparator therapy."""
    profile = service.get_drug_profile("Pembrolizumab")
    nsclc = [a for a in profile.current_assessments if "NSCLC" in a.indication][0]
    assert any("Chemotherapie" in sub.comparator for sub in nsclc.subpopulations)


def test_assessment_url(service):
    """Assessments should have a valid G-BA URL."""
    profile = service.get_drug_profile("Pembrolizumab")
    for a in profile.current_assessments:
        assert a.assessment_url != ""
        assert "g-ba.de" in a.assessment_url


def test_semaglutid_profile(service):
    """Semaglutid profile should be complete."""
    profile = service.get_drug_profile("Semaglutid")
    assert profile is not None
    assert "Ozempic" in profile.trade_names
    assert profile.total_assessments == 1
    a = profile.current_assessments[0]
    assert "Diabetes" in a.indication
    assert len(a.subpopulations) >= 1
    sub = a.subpopulations[0]
    assert sub.benefit_rating == "gering"
    assert "Minor" in sub.benefit_rating_en
    assert "Metformin" in sub.comparator


def test_nivolumab_no_benefit(service):
    """Nivolumab with kein Zusatznutzen should be reflected."""
    profile = service.get_drug_profile("Nivolumab")
    assert profile is not None
    a = profile.current_assessments[0]
    assert a.overall_benefit == "kein Zusatznutzen"
    assert "No added" in a.overall_benefit_en


# ── Filter options tests ─────────────────────────────────────────────


def test_filter_options(service):
    """Filter options should include all benefit ratings and substances."""
    opts = service.get_filter_options()
    assert "erheblich" in opts.benefit_ratings
    assert "gering" in opts.benefit_ratings
    assert "kein Zusatznutzen" in opts.benefit_ratings
    assert "Pembrolizumab" in opts.substances
    assert "Semaglutid" in opts.substances


# ── Benefit ordering tests ───────────────────────────────────────────


def test_benefit_order():
    """BENEFIT_ORDER should go from best to worst."""
    assert BENEFIT_ORDER[0] == "erheblich"
    assert BENEFIT_ORDER[-1] == "geringerer Nutzen"


def test_best_benefit_logic(service):
    """_best_benefit should return the most favorable rating."""
    assert service._best_benefit(["kein Zusatznutzen", "beträchtlich"]) == "beträchtlich"
    assert service._best_benefit(["gering", "erheblich"]) == "erheblich"
    assert service._best_benefit(["kein Zusatznutzen"]) == "kein Zusatznutzen"
    assert service._best_benefit([]) == ""


# ── find_assessment_by_id tests ───────────────────────────────────


def test_find_assessment_by_id(service):
    """Should return structured data for a known decision_id."""
    data = service.find_assessment_by_id("2023-05-10-D-800")
    assert data is not None
    assert data["decision_id"] == "2023-05-10-D-800"
    assert data["active_substance"] == "Pembrolizumab"
    assert data["trade_name"] == "Keytruda"
    assert "Melanom" in data["indication"]
    assert len(data["subpopulations"]) >= 1
    sub = data["subpopulations"][0]
    assert sub["benefit_rating"] == "erheblich"
    assert sub["evidence_level"] == "Beleg"
    assert sub["comparator"] == "Nivolumab"


def test_find_assessment_by_id_aggregates_all_subpopulations(service):
    """When a decision has multiple patient groups, find_assessment_by_id must
    return ALL subpopulations — not just the first one it encounters.

    The 2020 Pembrolizumab melanoma decision (2020-01-15-D-500) has 2
    subpopulations (BRAF-wild and BRAF-V600). Both must be returned so
    that the AI analysis receives the complete picture.
    """
    data = service.find_assessment_by_id("2020-01-15-D-500")
    assert data is not None
    assert data["decision_id"] == "2020-01-15-D-500"

    # Must contain BOTH subpopulations
    assert len(data["subpopulations"]) == 2, (
        f"Expected 2 subpopulations, got {len(data['subpopulations'])}. "
        "find_assessment_by_id must aggregate all patient groups sharing "
        "the same decision_id."
    )

    # Verify both subpopulations are distinct
    ratings = {sub["benefit_rating"] for sub in data["subpopulations"]}
    assert "beträchtlich" in ratings
    assert "nicht quantifizierbar" in ratings

    comparators = {sub["comparator"] for sub in data["subpopulations"]}
    assert "Ipilimumab" in comparators
    assert "Vemurafenib" in comparators


def test_find_assessment_by_id_nsclc(service):
    """Should find the NSCLC assessment for Pembrolizumab."""
    data = service.find_assessment_by_id("2021-09-01-D-600")
    assert data is not None
    assert data["active_substance"] == "Pembrolizumab"
    assert "NSCLC" in data["indication"]
    assert data["subpopulations"][0]["comparator"] == "Platin-basierte Chemotherapie"


def test_find_assessment_by_id_not_found(service):
    """Should return None for unknown decision_id."""
    assert service.find_assessment_by_id("9999-99-99-D-000") is None


def test_find_assessment_by_id_semaglutid(service):
    """Should find Semaglutid assessment."""
    data = service.find_assessment_by_id("2019-03-01-D-400")
    assert data is not None
    assert data["active_substance"] == "Semaglutid"
    assert data["assessment_url"] != ""


# ── URL construction tests ─────────────────────────────────────────


def test_assessment_url_prefers_direct_url():
    """When decisions have a 'url' field (real AIS XML), it should be used
    instead of constructing from procedure_id.

    In real G-BA data, the procedure_id (from decision_id) uses a different
    numbering than the URL. E.g. decision_id 2011-04-15-D-003 has
    procedure_id=003, but the real URL is /nutzenbewertung/10/.
    """
    adapter = GermanyGBA()
    adapter._decisions = [{
        "decision_id": "2011-04-15-D-003",
        "procedure_id": "003",
        "url": "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/10/",
        "trade_names": ["Jevtana"],
        "substances": ["Cabazitaxel"],
        "indication": "Prostatakarzinom",
        "decision_date": "2012-03-29",
        "patient_group": "Patienten mit Prostatakarzinom",
        "benefit_rating": "gering",
        "evidence_level": "Hinweis",
        "comparator": "Prednison",
    }]
    adapter._loaded = True
    svc = GermanyHTAService(adapter)

    profile = svc.get_drug_profile("Cabazitaxel")
    assert profile is not None
    # Must use the direct URL, NOT /nutzenbewertung/003/
    assert profile.current_assessments[0].assessment_url == \
        "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/10/"


def test_grouped_assessment_url_prefers_direct_url():
    """Grouped assessments should also prefer the direct URL from XML data."""
    adapter = GermanyGBA()
    adapter._decisions = [{
        "decision_id": "2011-06-15-D-009",
        "procedure_id": "009",
        "url": "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/5/",
        "trade_names": ["Eliquis"],
        "substances": ["Apixaban"],
        "indication": "VTE Prophylaxe",
        "decision_date": "2012-06-07",
        "patient_group": "Patienten mit VTE",
        "benefit_rating": "ist nicht belegt",
        "evidence_level": "",
        "comparator": "Enoxaparin",
    }]
    adapter._loaded = True
    svc = GermanyHTAService(adapter)

    profile = svc.get_drug_profile("Apixaban")
    assert profile is not None
    grouped = profile.grouped_assessments
    assert len(grouped) == 1
    # Must use the direct URL, NOT /nutzenbewertung/009/
    assert grouped[0].assessment_url == \
        "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/5/"


def test_assessment_url_falls_back_to_procedure_id():
    """When the url field is empty (legacy format), fall back to procedure_id."""
    adapter = GermanyGBA()
    adapter._decisions = [{
        "decision_id": "2020-01-15-D-500",
        "procedure_id": "500",
        "url": "",
        "trade_names": ["Keytruda"],
        "substances": ["Pembrolizumab"],
        "indication": "Melanom",
        "decision_date": "2020-06-18",
        "patient_group": "Erwachsene mit Melanom",
        "benefit_rating": "beträchtlich",
        "evidence_level": "Hinweis",
        "comparator": "Ipilimumab",
    }]
    adapter._loaded = True
    svc = GermanyHTAService(adapter)

    profile = svc.get_drug_profile("Pembrolizumab")
    assert profile is not None
    # Falls back to procedure_id-based URL
    assert profile.current_assessments[0].assessment_url == \
        "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/500/"
