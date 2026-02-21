"""Tests for the analogue selection service."""

import pytest
from datetime import date

from app.services.analogue_service import (
    AnalogueService, _normalize_date, _classify_prevalence, _classify_therapeutic_area,
    _extract_line_of_therapy, _extract_treatment_setting, _classify_evidence_tier,
    _split_indications, _match_assessment_to_indication, _extract_indication_keywords,
)


# Sample EMA-like medicine records for testing
SAMPLE_MEDICINES = [
    {
        "medicineName": "Keytruda",
        "activeSubstance": "pembrolizumab",
        "therapeuticIndication": "Keytruda is indicated for the treatment of: first-line treatment of metastatic NSCLC in combination with chemotherapy; treatment of advanced melanoma as monotherapy",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/003820",
        "condition": "Oncology",
        "url": "https://www.ema.europa.eu/en/medicines/human/EPAR/keytruda",
        "orphanMedicine": "no",
        "authorisationDate": "2015-07-17",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "L01FF02",
        "marketingAuthorisationHolder": "Merck Sharp & Dohme B.V.",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "yes",
    },
    {
        "medicineName": "Opdivo",
        "activeSubstance": "nivolumab",
        "therapeuticIndication": "Treatment of advanced melanoma as second-line monotherapy after prior treatment",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/003985",
        "condition": "Oncology",
        "url": "https://www.ema.europa.eu/en/medicines/human/EPAR/opdivo",
        "orphanMedicine": "no",
        "authorisationDate": "2015-06-19",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "L01FF01",
        "marketingAuthorisationHolder": "Bristol-Myers Squibb Pharma EEIG",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "yes",
    },
    {
        "medicineName": "Zolgensma",
        "activeSubstance": "onasemnogene abeparvovec",
        "therapeuticIndication": "Treatment of spinal muscular atrophy",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/004750",
        "condition": "Neurology",
        "url": "",
        "orphanMedicine": "yes",
        "authorisationDate": "2020-05-18",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "M09AX09",
        "marketingAuthorisationHolder": "Novartis Gene Therapies EU Ltd.",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "yes",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "yes",
    },
    {
        "medicineName": "Avastin",
        "activeSubstance": "bevacizumab",
        "therapeuticIndication": "Treatment of colorectal cancer",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/000582",
        "condition": "Oncology",
        "url": "",
        "orphanMedicine": "no",
        "authorisationDate": "2005-01-12",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "L01FG01",
        "marketingAuthorisationHolder": "Roche Registration GmbH",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "no",
    },
    {
        "medicineName": "Mvasi",
        "activeSubstance": "bevacizumab",
        "therapeuticIndication": "Biosimilar of Avastin",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/004728",
        "condition": "Oncology",
        "url": "",
        "orphanMedicine": "no",
        "authorisationDate": "2018-01-15",
        "generic": "no",
        "biosimilar": "yes",
        "atcCode": "L01FG01",
        "marketingAuthorisationHolder": "Amgen Europe B.V.",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "no",
    },
    {
        "medicineName": "Herceptin",
        "activeSubstance": "trastuzumab",
        "therapeuticIndication": "Treatment of HER2-positive breast cancer",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/000278",
        "condition": "Oncology",
        "url": "",
        "orphanMedicine": "no",
        "authorisationDate": "2000-08-28",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "L01FD01",
        "marketingAuthorisationHolder": "Roche Registration GmbH",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "no",
    },
    {
        "medicineName": "Spinraza",
        "activeSubstance": "nusinersen",
        "therapeuticIndication": "Treatment of spinal muscular atrophy",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/004312",
        "condition": "Neurology",
        "url": "",
        "orphanMedicine": "yes",
        "authorisationDate": "2017-06-01",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "M09AX07",
        "marketingAuthorisationHolder": "Biogen Netherlands B.V.",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "yes",
        "newActiveSubstance": "yes",
    },
    {
        "medicineName": "OldDrug",
        "activeSubstance": "olddrug",
        "therapeuticIndication": "Some withdrawn treatment",
        "authorisationStatus": "Withdrawn",
        "emaNumber": "EMEA/H/C/000999",
        "condition": "Oncology",
        "url": "",
        "orphanMedicine": "no",
        "authorisationDate": "2010-03-01",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "",
        "marketingAuthorisationHolder": "Old Pharma Ltd.",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "no",
    },
    {
        "medicineName": "GenericDrug",
        "activeSubstance": "genericsubstance",
        "therapeuticIndication": "Some generic treatment",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/005001",
        "condition": "Oncology",
        "url": "",
        "orphanMedicine": "no",
        "authorisationDate": "2022-06-15",
        "generic": "yes",
        "biosimilar": "no",
        "atcCode": "",
        "marketingAuthorisationHolder": "Generic Corp.",
        "conditionalApproval": "no",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "no",
        "newActiveSubstance": "no",
    },
    {
        "medicineName": "CovidVax",
        "activeSubstance": "covidaxine",
        "therapeuticIndication": "Prevention of COVID-19",
        "authorisationStatus": "Authorised",
        "emaNumber": "EMEA/H/C/005700",
        "condition": "Infectious Disease",
        "url": "",
        "orphanMedicine": "no",
        "authorisationDate": "2021-01-06",
        "generic": "no",
        "biosimilar": "no",
        "atcCode": "J07BX03",
        "marketingAuthorisationHolder": "Vaccine Corp. EU",
        "conditionalApproval": "yes",
        "exceptionalCircumstances": "no",
        "acceleratedAssessment": "yes",
        "newActiveSubstance": "yes",
    },
]


@pytest.fixture
def service():
    """Create an AnalogueService pre-loaded with sample data."""
    svc = AnalogueService()
    svc.load_from_ema(SAMPLE_MEDICINES)
    return svc


# ── Loading ──────────────────────────────────────────────────────────


def test_load_marks_loaded(service):
    assert service.is_loaded is True


def test_not_loaded():
    svc = AnalogueService()
    assert svc.is_loaded is False
    assert svc.search() == []


def test_load_count(service):
    results = service.search()
    assert len(results) == len(SAMPLE_MEDICINES)


# ── Filter options ───────────────────────────────────────────────────


def test_get_therapeutic_areas(service):
    areas = service.get_therapeutic_areas()
    assert "Oncology" in areas
    assert "Neurology" in areas


def test_get_filter_options(service):
    opts = service.get_filter_options()
    assert "Oncology" in opts["therapeutic_areas"]
    assert len(opts["year_ranges"]) > 0
    assert "Authorised" in opts["statuses"]
    assert "Withdrawn" in opts["statuses"]
    # New filter options
    assert len(opts["mahs"]) > 0
    assert any("Merck" in m for m in opts["mahs"])
    assert len(opts["atc_prefixes"]) > 0
    assert any(p["code"] == "L01" for p in opts["atc_prefixes"])
    assert opts["prevalence_categories"] == ["ultra-rare", "rare", "non-rare"]
    # Therapeutic taxonomy
    taxonomy = opts["therapeutic_taxonomy"]
    assert len(taxonomy) > 0
    cats = {t["category"] for t in taxonomy}
    assert "Oncology" in cats


# ── Filtering by therapeutic area ────────────────────────────────────


def test_filter_by_therapeutic_area(service):
    results = service.search(therapeutic_area="Oncology")
    assert all("Oncology" in r["therapeutic_area"] for r in results)
    assert any(r["name"] == "Keytruda" for r in results)


def test_filter_by_neurology(service):
    results = service.search(therapeutic_area="Neurology")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert "Keytruda" not in names


def test_filter_area_case_insensitive(service):
    results = service.search(therapeutic_area="oncology")
    assert any(r["name"] == "Keytruda" for r in results)


# ── Filtering by orphan status ───────────────────────────────────────


def test_filter_orphan_yes(service):
    results = service.search(orphan="yes")
    assert all(r["orphan_medicine"] for r in results)
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert "Keytruda" not in names


def test_filter_orphan_no(service):
    results = service.search(orphan="no")
    assert all(not r["orphan_medicine"] for r in results)
    assert "Zolgensma" not in {r["name"] for r in results}


def test_filter_orphan_any(service):
    results = service.search(orphan="")
    assert len(results) == len(SAMPLE_MEDICINES)


# ── Filtering by years since approval ────────────────────────────────


def test_filter_years_5(service):
    results = service.search(years_since_approval=5)
    # Only medicines approved in last 5 years
    current_year = date.today().year
    for r in results:
        if r["authorisation_date"]:
            year = int(r["authorisation_date"][:4])
            assert year >= current_year - 5


def test_filter_years_10(service):
    results = service.search(years_since_approval=10)
    # Should include more recent ones
    names = {r["name"] for r in results}
    assert "Zolgensma" in names  # 2020
    assert "Mvasi" in names  # 2018
    # Herceptin (2000) and Avastin (2005) should be excluded
    assert "Herceptin" not in names
    assert "Avastin" not in names


def test_filter_years_0_means_all(service):
    results = service.search(years_since_approval=0)
    assert len(results) == len(SAMPLE_MEDICINES)


# ── Filtering by first approval ──────────────────────────────────────


def test_filter_first_approval_yes(service):
    results = service.search(first_approval="yes")
    # Avastin should be first_approval for bevacizumab (2005 < 2018)
    names = {r["name"] for r in results}
    assert "Avastin" in names
    # Mvasi is the second bevacizumab, should NOT be first
    assert "Mvasi" not in names


def test_filter_first_approval_no(service):
    results = service.search(first_approval="no")
    names = {r["name"] for r in results}
    assert "Mvasi" in names
    assert "Avastin" not in names


# ── Filtering by status ──────────────────────────────────────────────


def test_filter_status_authorised(service):
    results = service.search(status="Authorised")
    assert all(r["authorisation_status"] == "Authorised" for r in results)
    assert "OldDrug" not in {r["name"] for r in results}


def test_filter_status_withdrawn(service):
    results = service.search(status="Withdrawn")
    assert len(results) == 1
    assert results[0]["name"] == "OldDrug"


# ── Filtering by substance ──────────────────────────────────────────


def test_filter_by_substance(service):
    results = service.search(substance="bevacizumab")
    names = {r["name"] for r in results}
    assert "Avastin" in names
    assert "Mvasi" in names
    assert len(results) == 2


def test_filter_by_substance_partial(service):
    results = service.search(substance="pembroliz")
    assert len(results) == 1
    assert results[0]["name"] == "Keytruda"


# ── Filtering by name ───────────────────────────────────────────────


def test_filter_by_name(service):
    results = service.search(name="Keytruda")
    assert len(results) == 1
    assert results[0]["active_substance"] == "pembrolizumab"


# ── Exclude generics / biosimilars ──────────────────────────────────


def test_exclude_generics(service):
    results = service.search(exclude_generics=True)
    assert "GenericDrug" not in {r["name"] for r in results}


def test_exclude_biosimilars(service):
    results = service.search(exclude_biosimilars=True)
    assert "Mvasi" not in {r["name"] for r in results}


def test_exclude_both(service):
    results = service.search(exclude_generics=True, exclude_biosimilars=True)
    names = {r["name"] for r in results}
    assert "GenericDrug" not in names
    assert "Mvasi" not in names


# ── Combined filters ─────────────────────────────────────────────────


def test_combined_area_and_orphan(service):
    results = service.search(therapeutic_area="Neurology", orphan="yes")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert len(results) == 2


def test_combined_area_status_years(service):
    results = service.search(
        therapeutic_area="Oncology",
        status="Authorised",
        years_since_approval=10,
    )
    for r in results:
        assert "Oncology" in r["therapeutic_area"]
        assert r["authorisation_status"] == "Authorised"


def test_combined_no_match(service):
    results = service.search(
        therapeutic_area="Cardiology",
    )
    assert len(results) == 0


# ── Sorting ──────────────────────────────────────────────────────────


def test_results_sorted_by_date_desc(service):
    results = service.search()
    dates = [r["authorisation_date"] for r in results if r["authorisation_date"]]
    assert dates == sorted(dates, reverse=True)


# ── Limit ────────────────────────────────────────────────────────────


def test_limit(service):
    results = service.search(limit=3)
    assert len(results) == 3


# ── Date normalization helper ────────────────────────────────────────


def test_normalize_date_iso():
    assert _normalize_date("2023-01-15") == "2023-01-15"


def test_normalize_date_compact():
    assert _normalize_date("20230115") == "2023-01-15"


def test_normalize_date_european():
    assert _normalize_date("15/01/2023") == "2023-01-15"


def test_normalize_date_german():
    assert _normalize_date("15.01.2023") == "2023-01-15"


def test_normalize_date_iso_with_time():
    assert _normalize_date("2023-01-15T10:30:00Z") == "2023-01-15"


def test_normalize_date_year_only():
    assert _normalize_date("2023") == "2023-01-01"


def test_normalize_date_empty():
    assert _normalize_date("") == ""


# ── First approval logic ────────────────────────────────────────────


def test_first_approval_flag_correct(service):
    """Avastin (2005) should be first approval for bevacizumab, not Mvasi (2018)."""
    results = service.search(substance="bevacizumab")
    for r in results:
        if r["name"] == "Avastin":
            assert r["first_approval"] is True
        elif r["name"] == "Mvasi":
            assert r["first_approval"] is False


# ── Prevalence classification helper ──────────────────────────────────


def test_classify_prevalence_orphan_ultra_rare():
    assert _classify_prevalence(True, "Treatment of spinal muscular atrophy") == "ultra-rare"


def test_classify_prevalence_orphan_rare_default():
    assert _classify_prevalence(True, "Treatment of some rare condition") == "rare"


def test_classify_prevalence_non_orphan_non_rare():
    assert _classify_prevalence(False, "Treatment of hypertension") == "non-rare"


def test_classify_prevalence_non_orphan_rare_keyword():
    assert _classify_prevalence(False, "Treatment of pulmonary arterial hypertension") == "rare"


def test_classify_prevalence_non_orphan_ultra_rare_keyword():
    assert _classify_prevalence(False, "Treatment of Duchenne muscular dystrophy") == "ultra-rare"


# ── ATC code filtering ────────────────────────────────────────────────


def test_filter_atc_prefix_l01(service):
    """L01 should match all antineoplastic agents."""
    results = service.search(atc_code="L01")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" in names
    assert "Avastin" in names
    assert "Herceptin" in names
    assert "Zolgensma" not in names  # M09


def test_filter_atc_prefix_l01ff(service):
    """L01FF should match PD-1/PD-L1 inhibitors only."""
    results = service.search(atc_code="L01FF")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" in names
    assert "Avastin" not in names  # L01FG


def test_filter_atc_prefix_m09(service):
    results = service.search(atc_code="M09")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert "Keytruda" not in names


def test_filter_atc_prefix_j07(service):
    results = service.search(atc_code="J07")
    names = {r["name"] for r in results}
    assert "CovidVax" in names
    assert len(results) == 1


def test_filter_atc_case_insensitive(service):
    results = service.search(atc_code="l01ff")
    assert any(r["name"] == "Keytruda" for r in results)


# ── MAH (company) filtering ──────────────────────────────────────────


def test_filter_mah_exact(service):
    results = service.search(mah="Roche Registration GmbH")
    names = {r["name"] for r in results}
    assert "Avastin" in names
    assert "Herceptin" in names
    assert len(results) == 2


def test_filter_mah_partial(service):
    results = service.search(mah="Roche")
    names = {r["name"] for r in results}
    assert "Avastin" in names
    assert "Herceptin" in names


def test_filter_mah_case_insensitive(service):
    results = service.search(mah="merck")
    assert any(r["name"] == "Keytruda" for r in results)


# ── Conditional approval filtering ───────────────────────────────────


def test_filter_conditional_yes(service):
    results = service.search(conditional_approval="yes")
    names = {r["name"] for r in results}
    assert "CovidVax" in names
    assert "Keytruda" not in names


def test_filter_conditional_no(service):
    results = service.search(conditional_approval="no")
    names = {r["name"] for r in results}
    assert "CovidVax" not in names
    assert "Keytruda" in names


# ── Exceptional circumstances filtering ──────────────────────────────


def test_filter_exceptional_yes(service):
    results = service.search(exceptional_circumstances="yes")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Keytruda" not in names


def test_filter_exceptional_no(service):
    results = service.search(exceptional_circumstances="no")
    assert "Zolgensma" not in {r["name"] for r in results}


# ── Accelerated assessment filtering ─────────────────────────────────


def test_filter_accelerated_yes(service):
    results = service.search(accelerated_assessment="yes")
    names = {r["name"] for r in results}
    assert "Spinraza" in names
    assert "CovidVax" in names
    assert "Keytruda" not in names


def test_filter_accelerated_no(service):
    results = service.search(accelerated_assessment="no")
    assert "Spinraza" not in {r["name"] for r in results}


# ── New active substance filtering ───────────────────────────────────


def test_filter_new_active_substance_yes(service):
    results = service.search(new_active_substance="yes")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" in names
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert "CovidVax" in names
    assert "Avastin" not in names  # not a new active substance


def test_filter_new_active_substance_no(service):
    results = service.search(new_active_substance="no")
    names = {r["name"] for r in results}
    assert "Avastin" in names
    assert "Mvasi" in names
    assert "Keytruda" not in names


# ── Prevalence category filtering ────────────────────────────────────


def test_prevalence_ultra_rare_sma(service):
    """Orphan + spinal muscular atrophy → ultra-rare."""
    results = service.search(name="Zolgensma")
    assert results[0]["prevalence_category"] == "ultra-rare"


def test_prevalence_rare_orphan_default(service):
    """Orphan without ultra-rare keywords → rare (but SMA is ultra-rare)."""
    # Spinraza also has SMA keyword, so it's ultra-rare
    results = service.search(name="Spinraza")
    assert results[0]["prevalence_category"] == "ultra-rare"


def test_prevalence_non_rare_default(service):
    """Non-orphan without rare keywords → non-rare."""
    results = service.search(name="GenericDrug")
    assert results[0]["prevalence_category"] == "non-rare"


def test_filter_prevalence_ultra_rare(service):
    results = service.search(prevalence_category="ultra-rare")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert "Keytruda" not in names


def test_filter_prevalence_non_rare(service):
    results = service.search(prevalence_category="non-rare")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Zolgensma" not in names


# ── Indication keyword filtering ─────────────────────────────────────


def test_filter_indication_keyword_melanoma(service):
    results = service.search(indication_keyword="melanoma")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" in names
    assert "Avastin" not in names


def test_filter_indication_keyword_breast(service):
    results = service.search(indication_keyword="breast cancer")
    names = {r["name"] for r in results}
    assert "Herceptin" in names
    assert len(results) == 1


def test_filter_indication_keyword_spinal(service):
    results = service.search(indication_keyword="spinal muscular atrophy")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names


def test_filter_indication_keyword_case_insensitive(service):
    results = service.search(indication_keyword="MELANOMA")
    assert any(r["name"] == "Keytruda" for r in results)


# ── Enriched fields present in records ───────────────────────────────


def test_records_have_mah_field(service):
    results = service.search(name="Keytruda")
    assert results[0]["marketing_authorisation_holder"] == "Merck Sharp & Dohme B.V."


def test_records_have_regulatory_flags(service):
    results = service.search(name="CovidVax")
    r = results[0]
    assert r["conditional_approval"] is True
    assert r["accelerated_assessment"] is True
    assert r["new_active_substance"] is True
    assert r["exceptional_circumstances"] is False


def test_records_have_prevalence_category(service):
    results = service.search()
    for r in results:
        assert r["prevalence_category"] in ("ultra-rare", "rare", "non-rare")


# ── Combined consulting-grade filters ────────────────────────────────


def test_combined_orphan_accelerated(service):
    results = service.search(orphan="yes", accelerated_assessment="yes")
    names = {r["name"] for r in results}
    assert "Spinraza" in names
    assert "Zolgensma" not in names  # orphan=yes but accelerated=no


def test_combined_atc_new_substance(service):
    results = service.search(atc_code="L01", new_active_substance="yes")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" in names
    assert "Avastin" not in names  # not new active substance


def test_combined_mah_and_area(service):
    results = service.search(mah="Roche", therapeutic_area="Oncology")
    names = {r["name"] for r in results}
    assert "Avastin" in names
    assert "Herceptin" in names


def test_combined_prevalence_and_indication(service):
    results = service.search(prevalence_category="ultra-rare", indication_keyword="spinal")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert len(results) == 2


# ── Therapeutic area classification ─────────────────────────────────


def test_classify_oncology():
    cat, sub = _classify_therapeutic_area("Oncology", "Treatment of melanoma and NSCLC")
    assert cat == "Oncology"
    assert sub == "Solid Tumours"


def test_classify_oncology_haem():
    cat, sub = _classify_therapeutic_area("", "Treatment of acute myeloid leukemia")
    assert cat == "Oncology"
    assert sub == "Haematological Malignancies"


def test_classify_neurology():
    cat, sub = _classify_therapeutic_area("Neurology", "Treatment of spinal muscular atrophy")
    assert cat == "Neurology"
    assert sub == "Neuromuscular"


def test_classify_infectious():
    cat, sub = _classify_therapeutic_area("Infectious Disease", "Prevention of COVID-19")
    assert cat == "Infectious Diseases"


def test_classify_unknown():
    cat, sub = _classify_therapeutic_area("", "")
    assert cat == "Other"
    assert sub == ""


def test_records_have_therapeutic_category(service):
    results = service.search(name="Keytruda")
    r = results[0]
    assert r["therapeutic_category"] == "Oncology"
    assert r["therapeutic_subcategory"] == "Solid Tumours"


def test_records_neurology_category(service):
    results = service.search(name="Zolgensma")
    r = results[0]
    assert r["therapeutic_category"] == "Neurology"


# ── Filtering by therapeutic category ───────────────────────────────


def test_filter_by_category_oncology(service):
    results = service.search(therapeutic_category="Oncology")
    for r in results:
        assert r["therapeutic_category"] == "Oncology"
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Zolgensma" not in names


def test_filter_by_category_neurology(service):
    results = service.search(therapeutic_category="Neurology")
    names = {r["name"] for r in results}
    assert "Zolgensma" in names
    assert "Spinraza" in names
    assert "Keytruda" not in names


def test_filter_by_subcategory_solid_tumours(service):
    results = service.search(
        therapeutic_category="Oncology",
        therapeutic_subcategory="Solid Tumours",
    )
    for r in results:
        assert r["therapeutic_category"] == "Oncology"
        assert r["therapeutic_subcategory"] == "Solid Tumours"
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Herceptin" in names


def test_filter_by_category_case_insensitive(service):
    results = service.search(therapeutic_category="oncology")
    assert any(r["name"] == "Keytruda" for r in results)


def test_filter_by_nonexistent_category(service):
    results = service.search(therapeutic_category="Dentistry")
    assert len(results) == 0


# ── Line of therapy extraction ─────────────────────────────────────────


def test_extract_lot_first_line():
    lots = _extract_line_of_therapy("first-line treatment of metastatic NSCLC")
    assert "1L / First-line" in lots


def test_extract_lot_second_line():
    lots = _extract_line_of_therapy("second-line monotherapy after prior treatment")
    assert "2L / Second-line" in lots


def test_extract_lot_previously_treated():
    lots = _extract_line_of_therapy("for previously treated patients with melanoma")
    assert "2L / Second-line" in lots


def test_extract_lot_adjuvant():
    lots = _extract_line_of_therapy("adjuvant treatment of early breast cancer")
    assert "Adjuvant" in lots


def test_extract_lot_neoadjuvant():
    lots = _extract_line_of_therapy("neoadjuvant treatment followed by surgery")
    assert "Neoadjuvant" in lots


def test_extract_lot_maintenance():
    lots = _extract_line_of_therapy("maintenance treatment after first-line")
    assert "Maintenance" in lots
    assert "1L / First-line" in lots


def test_extract_lot_none():
    lots = _extract_line_of_therapy("Treatment of melanoma")
    assert lots == []


def test_extract_lot_newly_diagnosed():
    lots = _extract_line_of_therapy("treatment of newly diagnosed glioblastoma")
    assert "1L / First-line" in lots


def test_extract_lot_relapsed_refractory():
    lots = _extract_line_of_therapy("relapsed or refractory multiple myeloma")
    assert "2L / Second-line" in lots


# ── Treatment setting extraction ───────────────────────────────────────


def test_extract_setting_monotherapy():
    settings = _extract_treatment_setting("as monotherapy for advanced melanoma")
    assert "Monotherapy" in settings


def test_extract_setting_combination():
    settings = _extract_treatment_setting("in combination with chemotherapy")
    assert "Combination" in settings


def test_extract_setting_both():
    settings = _extract_treatment_setting("as monotherapy or in combination with pemetrexed")
    assert "Monotherapy" in settings
    assert "Combination" in settings


def test_extract_setting_none():
    settings = _extract_treatment_setting("Treatment of melanoma")
    assert settings == []


# ── Evidence tier classification ───────────────────────────────────────


def test_evidence_tier_conditional():
    tier = _classify_evidence_tier(True, False, False, True, False)
    assert "Conditional" in tier


def test_evidence_tier_exceptional():
    tier = _classify_evidence_tier(False, True, False, True, True)
    assert "Exceptional" in tier


def test_evidence_tier_accelerated():
    tier = _classify_evidence_tier(False, False, True, True, False)
    assert "Accelerated" in tier


def test_evidence_tier_orphan():
    tier = _classify_evidence_tier(False, False, False, False, True)
    assert "Orphan" in tier


def test_evidence_tier_standard():
    tier = _classify_evidence_tier(False, False, False, False, False)
    assert tier == "Standard"


# ── Indication splitting ──────────────────────────────────────────────


def test_split_indications_semicolons():
    text = "indicated for: treatment of melanoma; treatment of NSCLC; treatment of RCC"
    segments = _split_indications(text)
    assert len(segments) == 3
    assert any("melanoma" in s for s in segments)
    assert any("NSCLC" in s for s in segments)


def test_split_indications_single():
    text = "Treatment of advanced melanoma"
    segments = _split_indications(text)
    assert len(segments) == 1
    assert segments[0] == text


def test_split_indications_empty():
    segments = _split_indications("")
    assert segments == []


# ── Enriched records have new fields ──────────────────────────────────


def test_records_have_line_of_therapy(service):
    results = service.search(name="Keytruda")
    r = results[0]
    assert "1L / First-line" in r["line_of_therapy"]
    assert "Combination" in r["treatment_setting"]


def test_records_have_lot_second_line(service):
    results = service.search(name="Opdivo")
    r = results[0]
    assert "2L / Second-line" in r["line_of_therapy"]
    assert "Monotherapy" in r["treatment_setting"]


def test_records_have_evidence_tier(service):
    results = service.search(name="CovidVax")
    assert results[0]["evidence_tier"] == "Conditional (limited data)"


def test_records_have_evidence_tier_standard(service):
    results = service.search(name="Keytruda")
    assert results[0]["evidence_tier"] == "Standard"


def test_records_have_evidence_tier_exceptional(service):
    results = service.search(name="Zolgensma")
    assert results[0]["evidence_tier"] == "Exceptional circumstances"


# ── Filtering by line of therapy ──────────────────────────────────────


def test_filter_by_lot_first_line(service):
    results = service.search(line_of_therapy="1L / First-line")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" not in names


def test_filter_by_lot_second_line(service):
    results = service.search(line_of_therapy="2L / Second-line")
    names = {r["name"] for r in results}
    assert "Opdivo" in names
    assert "Keytruda" not in names  # Keytruda has 1L but not 2L in test data


# ── Filtering by treatment setting ────────────────────────────────────


def test_filter_by_setting_monotherapy(service):
    results = service.search(treatment_setting="Monotherapy")
    names = {r["name"] for r in results}
    assert "Opdivo" in names


def test_filter_by_setting_combination(service):
    results = service.search(treatment_setting="Combination")
    names = {r["name"] for r in results}
    assert "Keytruda" in names


# ── Filtering by evidence tier ────────────────────────────────────────


def test_filter_by_evidence_tier_conditional(service):
    results = service.search(evidence_tier="Conditional (limited data)")
    names = {r["name"] for r in results}
    assert "CovidVax" in names
    assert "Keytruda" not in names


def test_filter_by_evidence_tier_standard(service):
    results = service.search(evidence_tier="Standard")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "CovidVax" not in names


# ── Per-indication rows (indication_keyword expansion) ────────────────


def test_indication_keyword_per_indication_rows(service):
    """With indication_keyword, matching segments create separate rows."""
    results = service.search(indication_keyword="NSCLC")
    # Keytruda has NSCLC in its indication; should match
    nsclc_results = [r for r in results if r["name"] == "Keytruda"]
    assert len(nsclc_results) >= 1
    # Each result should have indication_segment set
    for r in nsclc_results:
        assert r["indication_segment"]
        assert "nsclc" in r["indication_segment"].lower()


def test_indication_keyword_melanoma_multiple_products(service):
    """Melanoma should match both Keytruda and Opdivo with segments."""
    results = service.search(indication_keyword="melanoma")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" in names
    for r in results:
        assert r["indication_segment"]
        assert "melanoma" in r["indication_segment"].lower()


# ── HTA cross-reference ──────────────────────────────────────────────


def test_hta_summaries_empty_by_default(service):
    """Without setting HTA summaries, results should have empty lists."""
    results = service.search(name="Keytruda")
    assert results[0]["hta_summaries"] == []


def test_set_hta_summaries(service):
    """After setting HTA summaries, they appear in results."""
    service.set_hta_summaries(
        {
            "pembrolizumab": {
                "FR": {
                    "agency": "HAS",
                    "assessments": [
                        {
                            "date": "2023-06-01",
                            "rating": "Important",
                            "rating_detail": "ASMR III",
                            "indication_text": "melanoma first line",
                        },
                    ],
                },
                "DE": {
                    "agency": "G-BA",
                    "assessments": [
                        {
                            "date": "2023-05-15",
                            "rating": "beträchtlich",
                            "rating_detail": "Hinweis",
                            "indication_text": "melanoma",
                        },
                    ],
                },
            }
        },
        ["FR", "DE"],
    )
    results = service.search(name="Keytruda")
    hta = results[0]["hta_summaries"]
    assert len(hta) == 2
    fr = next(h for h in hta if h["country_code"] == "FR")
    assert fr["agency"] == "HAS"
    assert fr["rating"] == "Important"
    assert fr["rating_detail"] == "ASMR III"
    de = next(h for h in hta if h["country_code"] == "DE")
    assert de["rating"] == "beträchtlich"


def test_filter_by_hta_country(service):
    """Filter by HTA country only shows medicines with assessments."""
    service.set_hta_summaries(
        {
            "pembrolizumab": {
                "FR": {
                    "agency": "HAS",
                    "assessments": [
                        {
                            "date": "2023-01-01",
                            "rating": "Important",
                            "rating_detail": "",
                            "indication_text": "melanoma",
                        },
                    ],
                },
            }
        },
        ["FR"],
    )
    results = service.search(hta_country="FR")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" not in names  # no HTA data for nivolumab


def test_filter_by_hta_country_no_match(service):
    """No medicines should match if none have HTA data for the country."""
    service.set_hta_summaries({}, ["FR"])
    results = service.search(hta_country="FR")
    assert len(results) == 0


# ── Filter options include new fields ─────────────────────────────────


def test_filter_options_include_lot(service):
    opts = service.get_filter_options()
    assert "lines_of_therapy" in opts
    assert len(opts["lines_of_therapy"]) > 0
    assert "1L / First-line" in opts["lines_of_therapy"]


def test_filter_options_include_treatment_settings(service):
    opts = service.get_filter_options()
    assert "treatment_settings" in opts
    assert len(opts["treatment_settings"]) > 0


def test_filter_options_include_evidence_tiers(service):
    opts = service.get_filter_options()
    assert "evidence_tiers" in opts
    assert len(opts["evidence_tiers"]) > 0
    assert "Standard" in opts["evidence_tiers"]


def test_filter_options_include_hta_countries(service):
    service.set_hta_summaries({}, ["FR", "DE"])
    opts = service.get_filter_options()
    assert opts["hta_countries"] == ["FR", "DE"]


# ── unique_substances ─────────────────────────────────────────────────


def test_unique_substances(service):
    subs = service.unique_substances()
    assert "pembrolizumab" in subs
    assert "bevacizumab" in subs
    # Should be sorted
    assert subs == sorted(subs)


# ── Combined new + existing filters ───────────────────────────────────


def test_combined_lot_and_category(service):
    results = service.search(
        therapeutic_category="Oncology",
        line_of_therapy="1L / First-line",
    )
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Opdivo" not in names  # 2L


def test_combined_setting_and_prevalence(service):
    results = service.search(
        treatment_setting="Monotherapy",
        prevalence_category="non-rare",
    )
    names = {r["name"] for r in results}
    assert "Opdivo" in names


# ── Improved indication splitting (HTML entities, product name) ──────


def test_split_indications_nbsp_product_name():
    """Padcev-style: two indications separated by &nbsp; with product name repeated."""
    text = (
        "Padcev, in combination with pembrolizumab, is indicated for the "
        "first-line treatment of adult patients with unresectable or metastatic "
        "urothelial cancer.&nbsp; Padcev as monotherapy is indicated for the "
        "treatment of adult patients with locally advanced or metastatic "
        "urothelial cancer who have previously received chemotherapy."
    )
    segments = _split_indications(text)
    assert len(segments) == 2
    assert "combination" in segments[0].lower()
    assert "monotherapy" in segments[1].lower()


def test_split_indications_numeric_entity():
    """&#160; (non-breaking space) should also be normalised."""
    text = (
        "DrugX is indicated for treatment of condition A.&#160; "
        "DrugX is indicated for treatment of condition B."
    )
    segments = _split_indications(text)
    assert len(segments) == 2
    assert "condition A" in segments[0]
    assert "condition B" in segments[1]


def test_split_indications_product_name_no_entity():
    """Product name repeated at sentence boundary without HTML entities."""
    text = (
        "Tecentriq is indicated for the treatment of advanced NSCLC. "
        "Tecentriq is indicated for the treatment of SCLC."
    )
    segments = _split_indications(text)
    assert len(segments) == 2
    assert "NSCLC" in segments[0]
    assert "SCLC" in segments[1]


def test_split_indications_preserves_single():
    """A single indication (product name appears once) should not be split."""
    text = "Keytruda is indicated for the treatment of advanced melanoma."
    segments = _split_indications(text)
    assert len(segments) == 1


def test_split_indications_semicolons_still_work():
    """Original semicolon splitting still works after refactoring."""
    text = "indicated for: treatment of melanoma; treatment of NSCLC; treatment of RCC"
    segments = _split_indications(text)
    assert len(segments) == 3
    assert any("melanoma" in s for s in segments)
    assert any("NSCLC" in s for s in segments)


def test_split_indications_multiple_is_indicated_sentences():
    """Sentences each containing 'is indicated' should be split."""
    text = (
        "DrugA is indicated for the treatment of diabetes. "
        "DrugA is indicated for the treatment of obesity."
    )
    segments = _split_indications(text)
    assert len(segments) == 2


# ── Indication-specific HTA matching ─────────────────────────────────


def test_extract_indication_keywords():
    keywords = _extract_indication_keywords("first-line treatment of metastatic NSCLC")
    assert "first" in keywords
    assert "line" in keywords
    assert "metastatic" in keywords
    assert "nsclc" in keywords
    # Stop words excluded
    assert "treatment" not in keywords


def test_match_assessment_empty():
    """Empty assessments returns empty dict."""
    result = _match_assessment_to_indication([], "melanoma")
    assert result == {}


def test_match_assessment_no_indication():
    """No indication returns first (most recent) assessment."""
    assessments = [
        {"date": "2023-06-01", "rating": "A", "rating_detail": "", "indication_text": "melanoma"},
        {"date": "2022-01-01", "rating": "B", "rating_detail": "", "indication_text": "NSCLC"},
    ]
    result = _match_assessment_to_indication(assessments, "")
    assert result["rating"] == "A"


def test_match_assessment_specific_indication():
    """When indication_segment is provided, the best keyword match is returned."""
    assessments = [
        {"date": "2023-06-01", "rating": "Recommended", "rating_detail": "",
         "indication_text": "pembrolizumab for untreated advanced melanoma"},
        {"date": "2022-01-01", "rating": "Not recommended", "rating_detail": "",
         "indication_text": "pembrolizumab for metastatic NSCLC second line"},
    ]
    # Query for NSCLC → should match the second assessment
    result = _match_assessment_to_indication(assessments, "metastatic NSCLC second-line")
    assert result["rating"] == "Not recommended"
    assert result["date"] == "2022-01-01"


def test_match_assessment_fallback_to_recent():
    """When no keyword matches, falls back to most recent."""
    assessments = [
        {"date": "2023-06-01", "rating": "A", "rating_detail": "", "indication_text": "melanoma"},
        {"date": "2022-01-01", "rating": "B", "rating_detail": "", "indication_text": "breast"},
    ]
    result = _match_assessment_to_indication(assessments, "urothelial cancer")
    assert result["rating"] == "A"  # most recent, no keyword matches


def test_hta_indication_specific_in_search(service):
    """When searching with indication_keyword, HTA should match the relevant assessment."""
    service.set_hta_summaries(
        {
            "pembrolizumab": {
                "GB": {
                    "agency": "NICE",
                    "assessments": [
                        {
                            "date": "2023-06-01",
                            "rating": "Recommended",
                            "rating_detail": "TA900",
                            "indication_text": "pembrolizumab for advanced melanoma",
                        },
                        {
                            "date": "2022-01-01",
                            "rating": "Not recommended",
                            "rating_detail": "TA800",
                            "indication_text": "pembrolizumab for metastatic NSCLC second line",
                        },
                    ],
                }
            }
        },
        ["GB"],
    )
    results = service.search(indication_keyword="NSCLC")
    nsclc_results = [r for r in results if r["name"] == "Keytruda"]
    assert len(nsclc_results) >= 1
    # The HTA summary should match the NSCLC assessment, not melanoma
    hta = nsclc_results[0]["hta_summaries"]
    gb = next(h for h in hta if h["country_code"] == "GB")
    assert gb["rating_detail"] == "TA800"
    assert gb["rating"] == "Not recommended"


def test_hta_no_indication_uses_most_recent(service):
    """Without indication_keyword, HTA uses the most recent assessment."""
    service.set_hta_summaries(
        {
            "pembrolizumab": {
                "GB": {
                    "agency": "NICE",
                    "assessments": [
                        {
                            "date": "2023-06-01",
                            "rating": "Recommended",
                            "rating_detail": "TA900",
                            "indication_text": "melanoma",
                        },
                        {
                            "date": "2022-01-01",
                            "rating": "Not recommended",
                            "rating_detail": "TA800",
                            "indication_text": "NSCLC",
                        },
                    ],
                }
            }
        },
        ["GB"],
    )
    results = service.search(name="Keytruda")
    hta = results[0]["hta_summaries"]
    gb = next(h for h in hta if h["country_code"] == "GB")
    # Most recent (2023) should be used when no indication filter
    assert gb["rating"] == "Recommended"
    assert gb["latest_date"] == "2023-06-01"
