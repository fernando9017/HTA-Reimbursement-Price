"""Tests for the analogue selection service."""

import pytest
from datetime import date

from app.services.analogue_service import AnalogueService, _normalize_date


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
