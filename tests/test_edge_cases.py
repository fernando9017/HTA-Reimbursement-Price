"""Edge case tests — boundary values, Unicode handling, large inputs, and
unusual but valid inputs across all services.
"""

from collections import defaultdict

import pytest

from app.models import AssessmentResult, MedicineResult
from app.services.ema_service import EMAService, _get_str
from app.services.hta_agencies.france_has import FranceHAS, _build_summary_en
from app.services.hta_agencies.germany_gba import (
    BENEFIT_TRANSLATIONS,
    EVIDENCE_TRANSLATIONS,
    GermanyGBA,
)
from app.services.hta_agencies.spain_aemps import (
    POSITIONING_DISPLAY,
    SpainAEMPS,
    _normalize_positioning,
)
from app.services.hta_agencies.uk_nice import (
    RECOMMENDATION_DISPLAY,
    UKNICE,
    _normalize_recommendation,
)
from app.services.hta_agencies.japan_pmda import JapanPMDA


# ===================================================================
# _get_str helper — field extraction edge cases
# ===================================================================

class TestGetStr:
    """Edge cases for the EMA _get_str field extractor."""

    def test_first_key_found(self):
        assert _get_str({"a": "val"}, "a", "b") == "val"

    def test_fallback_key(self):
        assert _get_str({"b": "val"}, "a", "b") == "val"

    def test_no_key_found(self):
        assert _get_str({"c": "val"}, "a", "b") == ""

    def test_none_value_skipped(self):
        """None is skipped, so fallback key 'b' is returned."""
        assert _get_str({"a": None, "b": "val"}, "a", "b") == "val"

    def test_integer_value_stringified(self):
        assert _get_str({"a": 42}, "a") == "42"

    def test_whitespace_stripped(self):
        assert _get_str({"a": "  hello  "}, "a") == "hello"

    def test_empty_string(self):
        """Empty string is a valid value (not None), so it's returned."""
        assert _get_str({"a": ""}, "a") == ""

    def test_empty_dict(self):
        assert _get_str({}, "a", "b") == ""


# ===================================================================
# EMA Service — boundary values
# ===================================================================

class TestEMABoundaryValues:
    """Boundary value tests for EMA search."""

    def test_search_minimum_length_query(self):
        """Two-character query should work (min_length=2 at API level)."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "Ab", "active_substance": "abcd"},
        ]
        service._loaded = True
        results = service.search("ab")
        assert len(results) >= 1

    def test_search_limit_one(self):
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "Drug1", "active_substance": "sub1"},
            {"name_of_medicine": "Drug2", "active_substance": "sub2"},
        ]
        service._loaded = True
        results = service.search("Drug", limit=1)
        assert len(results) == 1

    def test_search_limit_exceeds_results(self):
        """Limit larger than available results should return all matches."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "OnlyDrug", "active_substance": "substance"},
        ]
        service._loaded = True
        results = service.search("OnlyDrug", limit=100)
        assert len(results) == 1

    def test_search_very_long_query(self):
        """Very long query should not crash."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "Drug", "active_substance": "substance"},
        ]
        service._loaded = True
        long_query = "a" * 1000
        results = service.search(long_query)
        assert isinstance(results, list)

    def test_search_with_large_dataset(self):
        """Search over a large number of medicines should complete."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": f"Drug{i}", "active_substance": f"substance{i}"}
            for i in range(1000)
        ]
        service._loaded = True

        results = service.search("Drug500")
        assert any(r.name == "Drug500" for r in results)

    def test_medicine_count_zero_when_unloaded(self):
        service = EMAService()
        assert service.medicine_count == 0
        assert service.raw_medicines == []


# ===================================================================
# France HAS — assessment merging edge cases
# ===================================================================

class TestFranceHASEdgeCases:
    """Edge cases for HAS assessment merging and sorting."""

    @pytest.mark.asyncio
    async def test_smr_and_asmr_merge_same_dossier(self):
        """SMR and ASMR with the same dossier should be merged."""
        agency = FranceHAS()
        agency._medicines = {"111": "DrugA"}
        agency._compositions = defaultdict(list, {"111": ["substance"]})
        agency._smr = defaultdict(list, {
            "111": [
                {"dossier_code": "D1", "motif": "Inscription", "date": "2024-01-01",
                 "value": "Important", "label": "SMR important"},
            ],
        })
        agency._asmr = defaultdict(list, {
            "111": [
                {"dossier_code": "D1", "motif": "Inscription", "date": "2024-01-01",
                 "value": "IV", "label": "ASMR IV"},
            ],
        })
        agency._ct_links = {"D1": "https://example.com"}
        agency._build_substance_index()
        agency._loaded = True

        results = await agency.search_assessments("substance")
        assert len(results) == 1
        assert results[0].smr_value == "Important"
        assert results[0].asmr_value == "IV"
        assert results[0].assessment_url == "https://example.com"

    @pytest.mark.asyncio
    async def test_multiple_cis_codes_same_substance(self):
        """Multiple CIS codes matching the same substance should all contribute."""
        agency = FranceHAS()
        agency._medicines = {"111": "DrugA Form1", "222": "DrugA Form2"}
        agency._compositions = defaultdict(list, {
            "111": ["substance"],
            "222": ["substance"],
        })
        agency._smr = defaultdict(list, {
            "111": [{"dossier_code": "D1", "motif": "Inscription", "date": "2024-01-01",
                      "value": "Important", "label": "desc"}],
            "222": [{"dossier_code": "D2", "motif": "Inscription", "date": "2024-06-01",
                      "value": "Modéré", "label": "desc"}],
        })
        agency._asmr = defaultdict(list)
        agency._ct_links = {}
        agency._build_substance_index()
        agency._loaded = True

        results = await agency.search_assessments("substance")
        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_results_sorted_most_recent_first(self):
        agency = FranceHAS()
        agency._medicines = {"111": "Drug"}
        agency._compositions = defaultdict(list, {"111": ["sub"]})
        agency._smr = defaultdict(list, {
            "111": [
                {"dossier_code": "D1", "motif": "Inscription", "date": "2020-01-01",
                 "value": "Faible", "label": "desc"},
                {"dossier_code": "D2", "motif": "Extension", "date": "2024-06-01",
                 "value": "Important", "label": "desc"},
            ],
        })
        agency._asmr = defaultdict(list)
        agency._ct_links = {}
        agency._build_substance_index()
        agency._loaded = True

        results = await agency.search_assessments("sub")
        assert results[0].opinion_date >= results[-1].opinion_date

    def test_build_summary_en_all_fields(self):
        summary = _build_summary_en("Important", "III", "Inscription")
        assert "SMR:" in summary
        assert "ASMR III:" in summary
        assert "Evaluation purpose:" in summary

    def test_build_summary_en_empty(self):
        assert _build_summary_en("", "", "") == ""

    def test_build_summary_en_unknown_values(self):
        """Unknown SMR/ASMR values should be used as-is."""
        summary = _build_summary_en("Unknown", "X", "Custom")
        assert "Unknown" in summary
        assert "X" in summary
        assert "Custom" in summary


# ===================================================================
# Germany G-BA — search and translation edge cases
# ===================================================================

class TestGermanyGBAEdgeCases:
    """Edge cases for G-BA search and benefit translations."""

    def test_all_benefit_ratings_have_translations(self):
        """All known benefit ratings should have English translations."""
        expected = [
            "erheblich", "beträchtlich", "gering",
            "nicht quantifizierbar", "kein Zusatznutzen", "geringerer Nutzen",
        ]
        for rating in expected:
            assert rating in BENEFIT_TRANSLATIONS

    def test_all_evidence_levels_have_translations(self):
        expected = ["Beleg", "Hinweis", "Anhaltspunkt"]
        for level in expected:
            assert level in EVIDENCE_TRANSLATIONS

    @pytest.mark.asyncio
    async def test_search_assessment_url_construction(self):
        """Assessment URL should be built from procedure_id."""
        agency = GermanyGBA()
        agency._decisions = [
            {
                "substances": ["testdrug"],
                "trade_names": ["TestBrand"],
                "procedure_id": "123",
                "decision_id": "2024-01-01-D-123",
                "indication": "Indication",
                "decision_date": "2024-01-01",
                "benefit_rating": "gering",
                "evidence_level": "Hinweis",
                "comparator": "Placebo",
                "patient_group": "Adults",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("testdrug")
        assert len(results) == 1
        assert "123" in results[0].assessment_url
        assert results[0].comparator == "Placebo"

    @pytest.mark.asyncio
    async def test_search_unknown_benefit_rating(self):
        """Unknown benefit rating should pass through unchanged."""
        agency = GermanyGBA()
        agency._decisions = [
            {
                "substances": ["drugX"],
                "trade_names": [],
                "procedure_id": "",
                "decision_id": "",
                "indication": "",
                "decision_date": "",
                "benefit_rating": "completely unknown",
                "evidence_level": "also unknown",
                "comparator": "",
                "patient_group": "",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("drugX")
        assert results[0].benefit_rating == "completely unknown"
        # Unknown rating passes through to description as-is
        assert results[0].benefit_rating_description == "completely unknown"

    @pytest.mark.asyncio
    async def test_search_builds_english_summary(self):
        agency = GermanyGBA()
        agency._decisions = [
            {
                "substances": ["testdrug"],
                "trade_names": ["Brand"],
                "procedure_id": "1",
                "decision_id": "2024-01-01-D-1",
                "indication": "Some indication",
                "decision_date": "2024-01-01",
                "benefit_rating": "beträchtlich",
                "evidence_level": "Beleg",
                "comparator": "Comparator drug",
                "patient_group": "Adults",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("testdrug")
        assert "Added benefit:" in results[0].summary_en
        assert "Evidence:" in results[0].summary_en
        assert "vs." in results[0].summary_en


# ===================================================================
# UK NICE — recommendation normalization edge cases
# ===================================================================

class TestUKNICEEdgeCases:

    def test_all_recommendation_keywords_mapped(self):
        """All keywords in RECOMMENDATION_DISPLAY should produce known outputs."""
        for keyword, display in RECOMMENDATION_DISPLAY.items():
            assert display, f"Empty display value for keyword: {keyword}"

    def test_normalize_longer_match_takes_priority(self):
        """'not recommended' should match before 'recommended'."""
        result = _normalize_recommendation("This drug is not recommended")
        assert result == "Not recommended"

    def test_normalize_recommended_for_use(self):
        result = _normalize_recommendation("recommended for use in the NHS")
        assert result == "Recommended"

    def test_normalize_optimised(self):
        result = _normalize_recommendation("optimised restrictions apply")
        assert result == "Recommended with restrictions (Optimised)"

    @pytest.mark.asyncio
    async def test_search_returns_guidance_type(self):
        agency = UKNICE()
        agency._guidance_list = [
            {
                "reference": "TA999",
                "title": "Testdrug for some condition",
                "url": "https://www.nice.org.uk/guidance/ta999",
                "published_date": "2024-01-15",
                "guidance_type": "Technology appraisal guidance",
                "recommendation": "recommended",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("testdrug")
        assert results[0].guidance_type == "Technology appraisal guidance"
        assert results[0].guidance_reference == "TA999"


# ===================================================================
# Spain AEMPS — positioning normalization edge cases
# ===================================================================

class TestSpainAEMPSEdgeCases:

    def test_all_positioning_keywords_mapped(self):
        for keyword, display in POSITIONING_DISPLAY.items():
            assert display, f"Empty display for: {keyword}"

    def test_normalize_positioning_longer_match_priority(self):
        """'favorable condicionado' should match before 'favorable'."""
        result = _normalize_positioning("favorable condicionado")
        assert "conditions" in result.lower() or "condicionado" in result.lower()

    def test_normalize_positioning_unknown(self):
        result = _normalize_positioning("something else")
        assert result == "Something else"

    def test_normalize_positioning_empty(self):
        assert _normalize_positioning("") == ""

    @pytest.mark.asyncio
    async def test_search_returns_positioning(self):
        agency = SpainAEMPS()
        agency._ipt_list = [
            {
                "reference": "IPT-1/2024",
                "title": "Testdrug for indication",
                "url": "https://aemps.example.com/ipt-1.pdf",
                "published_date": "2024-01-15",
                "positioning": "favorable",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("testdrug")
        assert len(results) == 1
        assert results[0].therapeutic_positioning == "Favorable"
        assert results[0].ipt_reference == "IPT-1/2024"


# ===================================================================
# Japan PMDA — indication caching edge cases
# ===================================================================

class TestJapanPMDAEdgeCases:

    @pytest.mark.asyncio
    async def test_indication_cache_hit(self):
        """Cached indications should not trigger new API calls."""
        agency = JapanPMDA()
        agency._drug_list = [
            {
                "kegg_id": "dr:D00001",
                "names_lower": ["testdrug"],
                "names_display": ["TestDrug"],
                "japic_code": "J12345",
                "japic_url": "https://example.com/J12345",
            },
        ]
        agency._loaded = True
        agency._disease_cache = {"dr:D00001": "Cached disease text"}

        # search_assessments opens its own httpx client, but cached drug
        # should use the cache and not call KEGG GET
        results = await agency.search_assessments("testdrug")
        assert len(results) == 1
        assert results[0].evaluation_reason == "Cached disease text"

    @pytest.mark.asyncio
    async def test_search_by_product_name(self):
        agency = JapanPMDA()
        agency._drug_list = [
            {
                "kegg_id": "dr:D00001",
                "names_lower": ["pembrolizumab", "keytruda"],
                "names_display": ["Pembrolizumab", "Keytruda"],
                "japic_code": "J12345",
                "japic_url": "https://example.com/J12345",
            },
        ]
        agency._loaded = True
        agency._disease_cache = {"dr:D00001": "Cancer"}

        results = await agency.search_assessments("other", product_name="keytruda")
        assert len(results) == 1


# ===================================================================
# Pydantic models — validation edge cases
# ===================================================================

class TestModelValidation:
    """Test Pydantic model creation with edge case inputs."""

    def test_medicine_result_minimal(self):
        result = MedicineResult(
            name="",
            active_substance="",
            therapeutic_indication="",
            authorisation_status="",
            ema_number="",
        )
        assert result.name == ""
        assert result.url == ""

    def test_assessment_result_all_defaults(self):
        result = AssessmentResult(
            product_name="Drug",
            evaluation_reason="Reason",
            opinion_date="2024-01-01",
        )
        assert result.smr_value == ""
        assert result.benefit_rating == ""
        assert result.nice_recommendation == ""
        assert result.therapeutic_positioning == ""
        assert result.pmda_review_type == ""
        assert result.summary_en == ""

    def test_assessment_result_all_country_fields(self):
        """All country-specific fields can be populated simultaneously."""
        result = AssessmentResult(
            product_name="Drug",
            evaluation_reason="Reason",
            opinion_date="2024-01-01",
            smr_value="Important",
            asmr_value="IV",
            benefit_rating="beträchtlich",
            nice_recommendation="Recommended",
            therapeutic_positioning="Favorable",
            pmda_review_type="Reimbursed (NHI)",
        )
        assert result.smr_value == "Important"
        assert result.benefit_rating == "beträchtlich"
        assert result.nice_recommendation == "Recommended"
