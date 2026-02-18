"""Tests for the analogue selection service."""

import pytest
from datetime import date

from app.services.analogue_service import AnalogueService, _normalize_date, _classify_prevalence


# Sample EMA-like medicine records for testing
SAMPLE_MEDICINES = [
    {
        "medicineName": "Keytruda",
        "activeSubstance": "pembrolizumab",
        "therapeuticIndication": "Treatment of melanoma and NSCLC",
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
        "additionalMonitoring": "yes",
    },
    {
        "medicineName": "Opdivo",
        "activeSubstance": "nivolumab",
        "therapeuticIndication": "Treatment of melanoma",
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
        "additionalMonitoring": "yes",
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
        "additionalMonitoring": "yes",
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
        "additionalMonitoring": "no",
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
        "additionalMonitoring": "no",
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
        "additionalMonitoring": "no",
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
        "additionalMonitoring": "yes",
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
        "additionalMonitoring": "no",
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
        "additionalMonitoring": "no",
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
        "additionalMonitoring": "yes",
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


# ── Additional monitoring filtering ──────────────────────────────────


def test_filter_additional_monitoring_yes(service):
    results = service.search(additional_monitoring="yes")
    names = {r["name"] for r in results}
    assert "Keytruda" in names
    assert "Zolgensma" in names
    assert "Avastin" not in names


def test_filter_additional_monitoring_no(service):
    results = service.search(additional_monitoring="no")
    assert "Avastin" in {r["name"] for r in results}
    assert "Keytruda" not in {r["name"] for r in results}


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
    assert r["additional_monitoring"] is True
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
