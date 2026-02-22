"""Tests for FastAPI API endpoints defined in app/main.py.

Uses FastAPI TestClient with mocked services to avoid network calls.
"""

import json
import tempfile
from pathlib import Path

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.models import AssessmentResult, MedicineResult


# ---------------------------------------------------------------------------
# Helper: build a TestClient with lifespan disabled (no real data loading)
# ---------------------------------------------------------------------------

def _make_client():
    """Create a TestClient that skips the lifespan (startup) logic."""
    from app.main import app
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return _make_client()


@pytest.fixture
def sample_medicine_results():
    """Sample MedicineResult list returned by EMAService.search()."""
    return [
        MedicineResult(
            name="Keytruda",
            active_substance="pembrolizumab",
            therapeutic_indication="Treatment of melanoma.",
            authorisation_status="Authorised",
            ema_number="EMEA/H/C/003820",
            condition="Melanoma",
            url="https://www.ema.europa.eu/en/medicines/human/EPAR/keytruda",
        ),
    ]


@pytest.fixture
def sample_assessment_results():
    """Sample AssessmentResult list returned by an HTA agency."""
    return [
        AssessmentResult(
            product_name="KEYTRUDA",
            cis_code="12345678",
            dossier_code="CT-1234",
            evaluation_reason="Inscription",
            opinion_date="2024-06-15",
            smr_value="Important",
            smr_description="Le service médical rendu est important.",
            asmr_value="IV",
            asmr_description="Amélioration mineure.",
            assessment_url="https://has.example.com/ct-1234",
            summary_en="SMR: Major clinical benefit | ASMR IV: Minor therapeutic improvement",
        ),
    ]


# ===================================================================
# GET / — Landing page
# ===================================================================

class TestIndexPage:
    def test_index_returns_html(self, client):
        resp = client.get("/")
        assert resp.status_code == 200


# ===================================================================
# GET /api/search — Medicine search
# ===================================================================

class TestSearchEndpoint:
    """Tests for GET /api/search?q=..."""

    @patch("app.main.ema_service")
    def test_search_returns_results(self, mock_ema, client, sample_medicine_results):
        mock_ema.is_loaded = True
        mock_ema.search.return_value = sample_medicine_results

        resp = client.get("/api/search", params={"q": "pembrolizumab"})

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Keytruda"
        assert data[0]["active_substance"] == "pembrolizumab"
        mock_ema.search.assert_called_once_with("pembrolizumab", limit=20)

    @patch("app.main.ema_service")
    def test_search_with_custom_limit(self, mock_ema, client, sample_medicine_results):
        mock_ema.is_loaded = True
        mock_ema.search.return_value = sample_medicine_results

        resp = client.get("/api/search", params={"q": "keytruda", "limit": 5})

        assert resp.status_code == 200
        mock_ema.search.assert_called_once_with("keytruda", limit=5)

    @patch("app.main.ema_service")
    def test_search_empty_results(self, mock_ema, client):
        mock_ema.is_loaded = True
        mock_ema.search.return_value = []

        resp = client.get("/api/search", params={"q": "nonexistent"})

        assert resp.status_code == 200
        assert resp.json() == []

    @patch("app.main.ema_service")
    def test_search_returns_503_when_not_loaded(self, mock_ema, client):
        mock_ema.is_loaded = False

        resp = client.get("/api/search", params={"q": "pembrolizumab"})

        assert resp.status_code == 503
        assert "loading" in resp.json()["detail"].lower()

    def test_search_requires_query(self, client):
        resp = client.get("/api/search")
        assert resp.status_code == 422

    def test_search_rejects_short_query(self, client):
        resp = client.get("/api/search", params={"q": "a"})
        assert resp.status_code == 422

    def test_search_rejects_limit_out_of_range(self, client):
        resp = client.get("/api/search", params={"q": "test", "limit": 0})
        assert resp.status_code == 422

        resp = client.get("/api/search", params={"q": "test", "limit": 200})
        assert resp.status_code == 422


# ===================================================================
# GET /api/countries — Country listing
# ===================================================================

class TestCountriesEndpoint:
    """Tests for GET /api/countries."""

    def test_countries_returns_list(self, client):
        resp = client.get("/api/countries")

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Each country should have expected fields
        for item in data:
            assert "code" in item
            assert "name" in item
            assert "agency" in item
            assert "agency_full_name" in item

    def test_countries_includes_known_countries(self, client):
        resp = client.get("/api/countries")
        codes = {c["code"] for c in resp.json()}
        assert "FR" in codes
        assert "DE" in codes
        assert "GB" in codes


# ===================================================================
# GET /api/assessments/{country_code} — HTA assessments
# ===================================================================

class TestAssessmentsEndpoint:
    """Tests for GET /api/assessments/{country_code}?substance=..."""

    @patch("app.main.hta_agencies")
    def test_assessments_returns_results(self, mock_agencies, client, sample_assessment_results):
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "France"
        mock_agency.agency_abbreviation = "HAS"
        mock_agency.search_assessments = AsyncMock(return_value=sample_assessment_results)
        mock_agencies.get.return_value = mock_agency
        mock_agencies.__contains__ = lambda self, k: True

        resp = client.get("/api/assessments/FR", params={"substance": "pembrolizumab"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["country_code"] == "FR"
        assert data["country_name"] == "France"
        assert data["agency"] == "HAS"
        assert data["active_substance"] == "pembrolizumab"
        assert len(data["assessments"]) == 1
        assert data["assessments"][0]["product_name"] == "KEYTRUDA"

    @patch("app.main.hta_agencies")
    def test_assessments_country_not_found(self, mock_agencies, client):
        mock_agencies.get.return_value = None
        mock_agencies.keys.return_value = ["FR", "DE", "GB"]

        resp = client.get("/api/assessments/XX", params={"substance": "test"})

        assert resp.status_code == 404
        assert "XX" in resp.json()["detail"]

    @patch("app.main.hta_agencies")
    def test_assessments_agency_not_loaded(self, mock_agencies, client):
        mock_agency = MagicMock()
        mock_agency.is_loaded = False
        mock_agency.agency_abbreviation = "HAS"
        mock_agencies.get.return_value = mock_agency

        resp = client.get("/api/assessments/FR", params={"substance": "test"})

        assert resp.status_code == 503
        assert "loading" in resp.json()["detail"].lower()

    def test_assessments_requires_substance(self, client):
        resp = client.get("/api/assessments/FR")
        assert resp.status_code == 422

    def test_assessments_rejects_short_substance(self, client):
        resp = client.get("/api/assessments/FR", params={"substance": "a"})
        assert resp.status_code == 422

    @patch("app.main.hta_agencies")
    def test_assessments_case_insensitive_country(self, mock_agencies, client, sample_assessment_results):
        """Country code should be uppercased automatically."""
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "France"
        mock_agency.agency_abbreviation = "HAS"
        mock_agency.search_assessments = AsyncMock(return_value=sample_assessment_results)
        mock_agencies.get.return_value = mock_agency

        resp = client.get("/api/assessments/fr", params={"substance": "pembrolizumab"})

        assert resp.status_code == 200
        assert resp.json()["country_code"] == "FR"

    @patch("app.main.hta_agencies")
    def test_assessments_empty_results(self, mock_agencies, client):
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "Germany"
        mock_agency.agency_abbreviation = "G-BA"
        mock_agency.search_assessments = AsyncMock(return_value=[])
        mock_agencies.get.return_value = mock_agency

        resp = client.get("/api/assessments/DE", params={"substance": "unknowndrug"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["assessments"] == []

    @patch("app.main.hta_agencies")
    def test_assessments_with_product_param(self, mock_agencies, client, sample_assessment_results):
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "France"
        mock_agency.agency_abbreviation = "HAS"
        mock_agency.search_assessments = AsyncMock(return_value=sample_assessment_results)
        mock_agencies.get.return_value = mock_agency

        resp = client.get(
            "/api/assessments/FR",
            params={"substance": "pembrolizumab", "product": "Keytruda"},
        )

        assert resp.status_code == 200
        mock_agency.search_assessments.assert_called_once_with(
            "pembrolizumab", product_name="Keytruda",
        )

    @patch("app.main.hta_agencies")
    def test_assessments_with_indication_filter(self, mock_agencies, client):
        """When indication is provided, results should be filtered."""
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "France"
        mock_agency.agency_abbreviation = "HAS"

        # Two assessments, one melanoma-related, one diabetes-related
        mock_agency.search_assessments = AsyncMock(return_value=[
            AssessmentResult(
                product_name="Drug A",
                evaluation_reason="Treatment of melanoma",
                opinion_date="2024-01-01",
            ),
            AssessmentResult(
                product_name="Drug A",
                evaluation_reason="Treatment of diabetes mellitus type 2",
                opinion_date="2024-06-01",
            ),
        ])
        mock_agencies.get.return_value = mock_agency

        resp = client.get(
            "/api/assessments/FR",
            params={
                "substance": "testdrug",
                "indication": "melanoma skin cancer treatment",
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        # The melanoma assessment should match; diabetes should be filtered out
        assert len(data["assessments"]) >= 1
        assert any("melanoma" in a["evaluation_reason"].lower() for a in data["assessments"])


# ===================================================================
# GET /api/status — Health check
# ===================================================================

class TestStatusEndpoint:
    """Tests for GET /api/status."""

    def test_status_returns_expected_shape(self, client):
        resp = client.get("/api/status")

        assert resp.status_code == 200
        data = resp.json()
        assert "ema_loaded" in data
        assert "ema_count" in data
        assert "analogue_loaded" in data
        assert "agencies" in data
        assert isinstance(data["agencies"], dict)

    def test_status_includes_all_agencies(self, client):
        resp = client.get("/api/status")
        agencies = resp.json()["agencies"]
        for code in ("FR", "DE", "GB", "ES", "JP"):
            assert code in agencies
            assert "name" in agencies[code]
            assert "loaded" in agencies[code]


# ===================================================================
# POST /api/reload — Data reload
# ===================================================================

class TestReloadEndpoint:
    """Tests for POST /api/reload."""

    @patch("app.main._build_hta_cross_reference", new_callable=AsyncMock)
    @patch("app.main.hta_agencies")
    @patch("app.main.analogue_service")
    @patch("app.main.ema_service")
    def test_reload_success(self, mock_ema, mock_analogue, mock_agencies, mock_xref, client):
        mock_ema.load_data = AsyncMock()
        mock_ema.raw_medicines = []
        mock_ema.medicine_count = 0

        # Simulate empty agencies dict to avoid iteration issues
        mock_agencies.items.return_value = []

        resp = client.post("/api/reload")

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["errors"] == []

    @patch("app.main._build_hta_cross_reference", new_callable=AsyncMock)
    @patch("app.main.hta_agencies")
    @patch("app.main.analogue_service")
    @patch("app.main.ema_service")
    def test_reload_ema_failure(self, mock_ema, mock_analogue, mock_agencies, mock_xref, client):
        mock_ema.load_data = AsyncMock(side_effect=RuntimeError("Connection timeout"))
        mock_ema.medicine_count = 0

        mock_agencies.items.return_value = []

        resp = client.post("/api/reload")

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert any("EMA" in e for e in data["errors"])

    @patch("app.main._build_hta_cross_reference", new_callable=AsyncMock)
    @patch("app.main.hta_agencies")
    @patch("app.main.analogue_service")
    @patch("app.main.ema_service")
    def test_reload_agency_failure(self, mock_ema, mock_analogue, mock_agencies, mock_xref, client):
        mock_ema.load_data = AsyncMock()
        mock_ema.raw_medicines = []
        mock_ema.medicine_count = 5

        # One agency that fails
        failing_agency = MagicMock()
        failing_agency.agency_abbreviation = "HAS"
        failing_agency.load_data = AsyncMock(side_effect=RuntimeError("BDPM download failed"))
        mock_agencies.items.return_value = [("FR", failing_agency)]

        resp = client.post("/api/reload")

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert any("HAS" in e for e in data["errors"])
        assert data["ema_count"] == 5


# ===================================================================
# GET /api/analogues/filters — Filter options
# ===================================================================

class TestAnalogueFiltersEndpoint:
    """Tests for GET /api/analogues/filters."""

    @patch("app.main.analogue_service")
    def test_filters_returns_options(self, mock_analogue, client):
        mock_analogue.is_loaded = True
        mock_analogue.get_filter_options.return_value = {
            "therapeutic_areas": ["Oncology"],
            "therapeutic_taxonomy": [],
            "year_ranges": [{"label": "Last 5 years", "value": 5}],
            "statuses": ["Authorised"],
            "mahs": ["Pfizer"],
            "atc_prefixes": [{"code": "L01", "label": "Antineoplastic agents"}],
            "prevalence_categories": ["rare"],
            "lines_of_therapy": [],
            "treatment_settings": [],
            "evidence_tiers": [],
            "hta_countries": [],
        }

        resp = client.get("/api/analogues/filters")

        assert resp.status_code == 200
        data = resp.json()
        assert "therapeutic_areas" in data
        assert "year_ranges" in data
        assert "statuses" in data

    @patch("app.main.analogue_service")
    def test_filters_returns_503_when_not_loaded(self, mock_analogue, client):
        mock_analogue.is_loaded = False

        resp = client.get("/api/analogues/filters")

        assert resp.status_code == 503


# ===================================================================
# GET /api/analogues/search — Analogue search
# ===================================================================

class TestAnalogueSearchEndpoint:
    """Tests for GET /api/analogues/search."""

    @patch("app.main.analogue_service")
    def test_search_returns_results(self, mock_analogue, client):
        mock_analogue.is_loaded = True
        mock_analogue.search.return_value = [
            {
                "name": "Keytruda",
                "active_substance": "pembrolizumab",
                "therapeutic_area": "Oncology",
                "orphan_medicine": False,
                "authorisation_date": "2015-07-17",
            }
        ]

        resp = client.get("/api/analogues/search", params={"substance": "pembrolizumab"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["results"]) == 1
        assert data["results"][0]["name"] == "Keytruda"

    @patch("app.main.analogue_service")
    def test_search_returns_503_when_not_loaded(self, mock_analogue, client):
        mock_analogue.is_loaded = False

        resp = client.get("/api/analogues/search")

        assert resp.status_code == 503

    @patch("app.main.analogue_service")
    def test_search_with_multiple_filters(self, mock_analogue, client):
        mock_analogue.is_loaded = True
        mock_analogue.search.return_value = []

        resp = client.get("/api/analogues/search", params={
            "orphan": "yes",
            "years": 5,
            "exclude_generics": True,
            "limit": 50,
        })

        assert resp.status_code == 200
        # Verify the filters are passed through
        call_kwargs = mock_analogue.search.call_args[1]
        assert call_kwargs["orphan"] == "yes"
        assert call_kwargs["years_since_approval"] == 5
        assert call_kwargs["exclude_generics"] is True
        assert call_kwargs["limit"] == 50

    @patch("app.main.analogue_service")
    def test_search_empty_results(self, mock_analogue, client):
        mock_analogue.is_loaded = True
        mock_analogue.search.return_value = []

        resp = client.get("/api/analogues/search")

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["results"] == []

    def test_search_rejects_invalid_limit(self, client):
        resp = client.get("/api/analogues/search", params={"limit": 0})
        assert resp.status_code == 422

        resp = client.get("/api/analogues/search", params={"limit": 999})
        assert resp.status_code == 422


# ===================================================================
# Indication filtering helper (unit tests)
# ===================================================================

class TestIndicationFiltering:
    """Tests for _extract_keywords, _assessment_text, _filter_by_indication."""

    def test_extract_keywords_filters_short_words(self):
        from app.main import _extract_keywords
        keywords = _extract_keywords("the treatment of patients with melanoma")
        assert "the" not in keywords
        assert "melanoma" in keywords

    def test_extract_keywords_filters_stop_words(self):
        from app.main import _extract_keywords
        keywords = _extract_keywords("indicated for treatment of adult patients")
        # All stop words should be removed
        assert "indicated" not in keywords
        assert "treatment" not in keywords
        assert "adult" not in keywords
        assert "patients" not in keywords

    def test_extract_keywords_empty_string(self):
        from app.main import _extract_keywords
        keywords = _extract_keywords("")
        assert keywords == set()

    def test_filter_by_indication_returns_all_when_no_keywords(self):
        from app.main import _filter_by_indication
        assessments = [
            AssessmentResult(product_name="A", evaluation_reason="test", opinion_date="2024-01-01"),
            AssessmentResult(product_name="B", evaluation_reason="test", opinion_date="2024-01-01"),
        ]
        result = _filter_by_indication(assessments, "the")
        # "the" is too short (< 4 chars), so no keywords — return all
        assert len(result) == 2

    def test_filter_by_indication_filters_relevant(self):
        from app.main import _filter_by_indication
        assessments = [
            AssessmentResult(
                product_name="Drug A",
                evaluation_reason="Treatment of advanced melanoma",
                opinion_date="2024-01-01",
            ),
            AssessmentResult(
                product_name="Drug B",
                evaluation_reason="Treatment of diabetes mellitus",
                opinion_date="2024-06-01",
            ),
        ]
        result = _filter_by_indication(assessments, "advanced melanoma skin cancer")
        # Should prefer the melanoma assessment
        assert any("melanoma" in a.evaluation_reason.lower() for a in result)

    def test_filter_by_indication_fallback_when_no_match(self):
        from app.main import _filter_by_indication
        assessments = [
            AssessmentResult(
                product_name="Drug A",
                evaluation_reason="Something unrelated",
                opinion_date="2024-01-01",
            ),
        ]
        # If no assessment matches >= 20%, return all (fallback)
        result = _filter_by_indication(assessments, "completely different topic xylophone")
        assert len(result) == 1


# ===================================================================
# Curated assessment data overlay
# ===================================================================

class TestCuratedAssessments:
    """Tests for loading and merging curated HTA assessment data."""

    def test_load_curated_assessments_from_file(self):
        from app.main import load_curated_assessments, get_curated_assessments, _curated_assessments
        data = {
            "avelumab": {
                "GB": [
                    {
                        "product_name": "Bavencio",
                        "evaluation_reason": "Avelumab for maintenance urothelial carcinoma",
                        "opinion_date": "2022-03-23",
                        "assessment_url": "https://www.nice.org.uk/guidance/ta788",
                        "nice_recommendation": "Recommended",
                        "guidance_reference": "TA788",
                        "guidance_type": "Technology appraisal guidance",
                        "summary_en": "NICE TA: Recommended | TA788",
                    }
                ],
            },
        }
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(data, f)
            f.flush()
            count = load_curated_assessments(Path(f.name))

        assert count == 1
        results = get_curated_assessments("avelumab", "GB")
        assert len(results) == 1
        assert results[0].guidance_reference == "TA788"
        assert results[0].nice_recommendation == "Recommended"

        # Cleanup
        _curated_assessments.clear()

    def test_load_curated_assessments_skips_meta_keys(self):
        from app.main import load_curated_assessments, _curated_assessments
        data = {
            "_meta": {"description": "metadata", "last_updated": "2025-01-01"},
            "avelumab": {
                "DE": [
                    {
                        "product_name": "Bavencio",
                        "evaluation_reason": "Urothelkarzinom",
                        "opinion_date": "2021-10-21",
                        "benefit_rating": "nicht quantifizierbar",
                    }
                ],
            },
        }
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(data, f)
            f.flush()
            count = load_curated_assessments(Path(f.name))

        assert count == 1  # Only avelumab/DE, not _meta
        _curated_assessments.clear()

    def test_load_curated_assessments_missing_file(self):
        from app.main import load_curated_assessments
        count = load_curated_assessments(Path("/nonexistent/curated.json"))
        assert count == 0

    def test_get_curated_assessments_case_insensitive(self):
        from app.main import load_curated_assessments, get_curated_assessments, _curated_assessments
        data = {
            "avelumab": {
                "GB": [
                    {
                        "product_name": "Bavencio",
                        "evaluation_reason": "Test",
                        "opinion_date": "2022-03-23",
                    }
                ],
            },
        }
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(data, f)
            f.flush()
            load_curated_assessments(Path(f.name))

        # Substance and country code lookups should be case-insensitive
        assert len(get_curated_assessments("Avelumab", "GB")) == 1
        assert len(get_curated_assessments("AVELUMAB", "gb")) == 1
        assert len(get_curated_assessments("avelumab", "GB")) == 1
        assert len(get_curated_assessments("unknowndrug", "GB")) == 0

        _curated_assessments.clear()

    def test_unique_key_deduplication(self):
        from app.main import _unique_key
        a = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Test",
            opinion_date="2022-03-23",
            guidance_reference="TA788",
            assessment_url="https://www.nice.org.uk/guidance/ta788",
        )
        b = AssessmentResult(
            product_name="Bavencio (different name)",
            evaluation_reason="Different reason",
            opinion_date="2022-03-23",
            guidance_reference="TA788",
            assessment_url="https://www.nice.org.uk/guidance/ta788",
        )
        # Same reference + date + URL → same key
        assert _unique_key(a) == _unique_key(b)

        c = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Test",
            opinion_date="2020-06-24",
            guidance_reference="TA645",
            assessment_url="https://www.nice.org.uk/guidance/ta645",
        )
        # Different reference → different key
        assert _unique_key(a) != _unique_key(c)

    def test_load_actual_curated_file(self):
        """Verify the shipped curated_assessments.json file loads correctly."""
        from app.main import load_curated_assessments, get_curated_assessments, _curated_assessments

        curated_file = Path(__file__).parent.parent / "data" / "curated_assessments.json"
        if not curated_file.exists():
            pytest.skip("curated_assessments.json not present")

        count = load_curated_assessments(curated_file)
        assert count > 0

        # Bavencio should have entries for all 5 countries
        for code in ("GB", "DE", "ES", "JP", "FR"):
            results = get_curated_assessments("avelumab", code)
            assert len(results) >= 1, f"No curated data for avelumab/{code}"

        # Spot-check UK NICE data
        gb_results = get_curated_assessments("avelumab", "GB")
        refs = {r.guidance_reference for r in gb_results}
        assert "TA788" in refs, "Expected TA788 in UK curated data"

        # Spot-check Germany G-BA data
        de_results = get_curated_assessments("avelumab", "DE")
        assert any("Urothelkarzinom" in r.evaluation_reason for r in de_results)

        # Spot-check Spain AEMPS data
        es_results = get_curated_assessments("avelumab", "ES")
        assert any(r.ipt_reference for r in es_results)

        # Spot-check Japan data
        jp_results = get_curated_assessments("avelumab", "JP")
        assert any("Reimbursed" in r.pmda_review_type for r in jp_results)

        # Spot-check France HAS data
        fr_results = get_curated_assessments("avelumab", "FR")
        assert any(r.smr_value for r in fr_results)

        _curated_assessments.clear()


class TestCuratedDataMerging:
    """Tests for curated data being merged into API responses."""

    @patch("app.main.get_curated_assessments")
    @patch("app.main.hta_agencies")
    def test_curated_supplements_empty_live_results(self, mock_agencies, mock_curated, client):
        """When live adapter returns nothing, curated data fills the gap."""
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "United Kingdom"
        mock_agency.agency_abbreviation = "NICE"
        mock_agency.search_assessments = AsyncMock(return_value=[])
        mock_agencies.get.return_value = mock_agency

        curated_entry = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Avelumab for maintenance urothelial carcinoma",
            opinion_date="2022-03-23",
            assessment_url="https://www.nice.org.uk/guidance/ta788",
            nice_recommendation="Recommended",
            guidance_reference="TA788",
        )
        mock_curated.return_value = [curated_entry]

        resp = client.get("/api/assessments/GB", params={"substance": "avelumab"})

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["assessments"]) == 1
        assert data["assessments"][0]["guidance_reference"] == "TA788"
        assert data["assessments"][0]["nice_recommendation"] == "Recommended"

    @patch("app.main.get_curated_assessments")
    @patch("app.main.hta_agencies")
    def test_curated_does_not_duplicate_live_results(self, mock_agencies, mock_curated, client):
        """When live adapter returns the same entry as curated, no duplicate."""
        live_entry = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Avelumab for maintenance urothelial carcinoma",
            opinion_date="2022-03-23",
            assessment_url="https://www.nice.org.uk/guidance/ta788",
            nice_recommendation="Recommended",
            guidance_reference="TA788",
        )
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "United Kingdom"
        mock_agency.agency_abbreviation = "NICE"
        mock_agency.search_assessments = AsyncMock(return_value=[live_entry])
        mock_agencies.get.return_value = mock_agency

        curated_entry = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Same guidance, curated version",
            opinion_date="2022-03-23",
            assessment_url="https://www.nice.org.uk/guidance/ta788",
            nice_recommendation="Recommended",
            guidance_reference="TA788",
        )
        mock_curated.return_value = [curated_entry]

        resp = client.get("/api/assessments/GB", params={"substance": "avelumab"})

        assert resp.status_code == 200
        data = resp.json()
        # Should only have 1 entry (the live one), not 2
        assert len(data["assessments"]) == 1

    @patch("app.main.get_curated_assessments")
    @patch("app.main.hta_agencies")
    def test_curated_adds_missing_entries(self, mock_agencies, mock_curated, client):
        """Curated data adds entries that live adapter missed."""
        live_entry = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Avelumab for maintenance urothelial carcinoma",
            opinion_date="2022-03-23",
            assessment_url="https://www.nice.org.uk/guidance/ta788",
            nice_recommendation="Recommended",
            guidance_reference="TA788",
        )
        mock_agency = MagicMock()
        mock_agency.is_loaded = True
        mock_agency.country_name = "United Kingdom"
        mock_agency.agency_abbreviation = "NICE"
        mock_agency.search_assessments = AsyncMock(return_value=[live_entry])
        mock_agencies.get.return_value = mock_agency

        # Curated data has an additional TA that live scraping missed
        curated_entries = [
            AssessmentResult(
                product_name="Bavencio",
                evaluation_reason="Same as live",
                opinion_date="2022-03-23",
                assessment_url="https://www.nice.org.uk/guidance/ta788",
                guidance_reference="TA788",
            ),
            AssessmentResult(
                product_name="Bavencio",
                evaluation_reason="Avelumab with axitinib for renal cell carcinoma",
                opinion_date="2020-06-24",
                assessment_url="https://www.nice.org.uk/guidance/ta645",
                nice_recommendation="Recommended",
                guidance_reference="TA645",
            ),
        ]
        mock_curated.return_value = curated_entries

        resp = client.get("/api/assessments/GB", params={"substance": "avelumab"})

        assert resp.status_code == 200
        data = resp.json()
        # Should have 2: live TA788 + curated TA645
        assert len(data["assessments"]) == 2
        refs = {a["guidance_reference"] for a in data["assessments"]}
        assert "TA788" in refs
        assert "TA645" in refs

    @patch("app.main.get_curated_assessments")
    @patch("app.main.hta_agencies")
    def test_curated_fallback_when_agency_not_loaded(self, mock_agencies, mock_curated, client):
        """When agency data hasn't loaded, curated data still works."""
        mock_agency = MagicMock()
        mock_agency.is_loaded = False
        mock_agency.country_name = "Japan"
        mock_agency.agency_abbreviation = "MHLW"
        mock_agencies.get.return_value = mock_agency

        curated_entry = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Merkel cell carcinoma",
            opinion_date="2017-09-27",
            pmda_review_type="Reimbursed (NHI)",
        )
        mock_curated.return_value = [curated_entry]

        resp = client.get("/api/assessments/JP", params={"substance": "avelumab"})

        # Should return 200 with curated data, not 503
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["assessments"]) == 1
        assert data["assessments"][0]["pmda_review_type"] == "Reimbursed (NHI)"

    @patch("app.main.get_curated_assessments")
    @patch("app.main.hta_agencies")
    def test_503_only_when_no_data_at_all(self, mock_agencies, mock_curated, client):
        """503 only when agency not loaded AND no curated data."""
        mock_agency = MagicMock()
        mock_agency.is_loaded = False
        mock_agency.agency_abbreviation = "MHLW"
        mock_agencies.get.return_value = mock_agency

        mock_curated.return_value = []  # No curated data either

        resp = client.get("/api/assessments/JP", params={"substance": "unknowndrug"})

        assert resp.status_code == 503
