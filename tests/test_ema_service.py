"""Tests for the EMA service search logic using sample data."""

import pytest

from app.services.ema_service import EMAService


@pytest.fixture
def ema_service():
    """Create an EMA service pre-loaded with sample medicine data."""
    service = EMAService()
    service._medicines = [
        {
            "name_of_medicine": "Keytruda",
            "active_substance": "pembrolizumab",
            "therapeutic_indication": (
                "Keytruda is indicated for the treatment of adult patients with "
                "unresectable or metastatic melanoma.\n"
                "Keytruda is indicated for the adjuvant treatment of adults with "
                "Stage III melanoma and lymph node involvement who have undergone "
                "complete resection."
            ),
            "authorisation_status": "Authorised",
            "ema_product_number": "EMEA/H/C/003820",
        },
        {
            "name_of_medicine": "Opdivo",
            "active_substance": "nivolumab",
            "therapeutic_indication": (
                "Opdivo is indicated for the treatment of advanced melanoma in adults."
            ),
            "authorisation_status": "Authorised",
            "ema_product_number": "EMEA/H/C/003985",
        },
        {
            "name_of_medicine": "Ozempic",
            "active_substance": "semaglutide",
            "therapeutic_indication": (
                "Ozempic is indicated for the treatment of adults with insufficiently "
                "controlled type 2 diabetes mellitus as an adjunct to diet and exercise."
            ),
            "authorisation_status": "Authorised",
            "ema_product_number": "EMEA/H/C/004174",
        },
        {
            "name_of_medicine": "Rybelsus",
            "active_substance": "semaglutide",
            "therapeutic_indication": (
                "Rybelsus is indicated for the treatment of adults with insufficiently "
                "controlled type 2 diabetes mellitus."
            ),
            "authorisation_status": "Authorised",
            "ema_product_number": "EMEA/H/C/004953",
        },
        {
            "name_of_medicine": "Revlimid",
            "active_substance": "lenalidomide",
            "therapeutic_indication": "Treatment of multiple myeloma.",
            "authorisation_status": "Withdrawn",
            "ema_product_number": "EMEA/H/C/000717",
        },
    ]
    service._loaded = True
    return service


def test_search_exact_name(ema_service):
    results = ema_service.search("Keytruda")
    assert len(results) >= 1
    assert results[0].name == "Keytruda"
    assert results[0].active_substance == "pembrolizumab"


def test_search_by_substance(ema_service):
    results = ema_service.search("pembrolizumab")
    assert len(results) >= 1
    assert results[0].active_substance == "pembrolizumab"


def test_search_case_insensitive(ema_service):
    results = ema_service.search("keytruda")
    assert len(results) >= 1
    assert results[0].name == "Keytruda"


def test_search_partial_name(ema_service):
    results = ema_service.search("key")
    assert len(results) >= 1
    assert results[0].name == "Keytruda"


def test_search_substance_returns_multiple_products(ema_service):
    results = ema_service.search("semaglutide")
    names = {r.name for r in results}
    assert "Ozempic" in names
    assert "Rybelsus" in names


def test_search_no_match(ema_service):
    results = ema_service.search("nonexistentmedicine")
    assert len(results) == 0


def test_search_short_query(ema_service):
    results = ema_service.search("")
    assert len(results) == 0


def test_search_returns_indication_text(ema_service):
    results = ema_service.search("Keytruda")
    assert "melanoma" in results[0].therapeutic_indication.lower()


def test_search_limit(ema_service):
    results = ema_service.search("a", limit=2)
    assert len(results) <= 2


def test_not_loaded():
    service = EMAService()
    assert service.is_loaded is False
    results = service.search("anything")
    assert len(results) == 0
