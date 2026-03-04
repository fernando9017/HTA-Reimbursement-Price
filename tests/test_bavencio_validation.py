"""Bavencio (avelumab) cross-adapter validation tests.

Uses Bavencio as a test case to verify that all adapters correctly find
and return HTA assessments for a known drug:
- UK NICE: TA788 (avelumab for maintenance treatment of urothelial carcinoma)
- Germany G-BA: procedure 658 (avelumab Nutzenbewertung)
- Spain AEMPS: IPT-44/2022 (avelumab)

These are unit tests with pre-loaded sample data (no network calls).
"""

from collections import defaultdict
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.hta_agencies.france_has import FranceHAS
from app.services.hta_agencies.germany_gba import GermanyGBA
from app.services.hta_agencies.spain_aemps import SpainAEMPS
from app.services.hta_agencies.uk_nice import (
    UKNICE,
    _extract_from_guidance_page,
    _normalize_recommendation,
)


# ===================================================================
# NICE — Bavencio TA788
# ===================================================================

class TestNICEBavencio:
    """Verify NICE adapter returns TA788 for avelumab/Bavencio."""

    @pytest.fixture
    def nice_service(self):
        service = UKNICE()
        service._guidance_list = [
            {
                "reference": "TA788",
                "title": "Avelumab for maintenance treatment of locally advanced or metastatic urothelial carcinoma after platinum-based chemotherapy",
                "url": "https://www.nice.org.uk/guidance/ta788",
                "published_date": "2022-03-23",
                "guidance_type": "Technology appraisal guidance",
                "recommendation": "recommended",
            },
            {
                "reference": "TA900",
                "title": "Pembrolizumab for untreated PD-L1-positive locally advanced or metastatic non-small-cell lung cancer",
                "url": "https://www.nice.org.uk/guidance/ta900",
                "published_date": "2024-01-15",
                "guidance_type": "Technology appraisal guidance",
                "recommendation": "recommended",
            },
        ]
        service._loaded = True
        return service

    @pytest.mark.asyncio
    async def test_search_by_substance(self, nice_service):
        results = await nice_service.search_assessments("avelumab")
        assert len(results) == 1
        assert results[0].guidance_reference == "TA788"
        assert results[0].nice_recommendation == "Recommended"

    @pytest.mark.asyncio
    async def test_search_by_brand_name(self, nice_service):
        results = await nice_service.search_assessments("avelumab", product_name="Bavencio")
        assert len(results) == 1
        assert results[0].guidance_reference == "TA788"

    @pytest.mark.asyncio
    async def test_assessment_url(self, nice_service):
        results = await nice_service.search_assessments("avelumab")
        assert results[0].assessment_url == "https://www.nice.org.uk/guidance/ta788"

    @pytest.mark.asyncio
    async def test_indication_in_title(self, nice_service):
        results = await nice_service.search_assessments("avelumab")
        assert "urothelial" in results[0].evaluation_reason.lower()

    @pytest.mark.asyncio
    async def test_summary_en_populated(self, nice_service):
        results = await nice_service.search_assessments("avelumab")
        assert results[0].summary_en
        assert "Recommended" in results[0].summary_en
        assert "TA788" in results[0].summary_en

    @pytest.mark.asyncio
    async def test_does_not_match_unrelated(self, nice_service):
        """Searching for pembrolizumab should not return TA788."""
        results = await nice_service.search_assessments("pembrolizumab")
        refs = {r.guidance_reference for r in results}
        assert "TA788" not in refs

    @pytest.mark.asyncio
    async def test_fetch_recommendation_from_guidance_page(self, nice_service):
        """When recommendation is missing, the adapter fetches the guidance page."""
        # Clear recommendation to trigger the page fetch
        nice_service._guidance_list[0]["recommendation"] = ""

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.text = """
            <html><body>
            <h1>Avelumab for maintenance treatment of urothelial carcinoma</h1>
            <p>Published 23 March 2022</p>
            <p>Avelumab is recommended as an option for maintenance treatment
            of locally advanced or metastatic urothelial carcinoma.</p>
            </body></html>
        """
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.hta_agencies.uk_nice.httpx.AsyncClient", return_value=mock_client):
            results = await nice_service.search_assessments("avelumab")

        assert len(results) == 1
        assert results[0].nice_recommendation == "Recommended"


class TestExtractFromGuidancePage:
    """Unit tests for _extract_from_guidance_page helper."""

    def test_recommended(self):
        html = '<html><body><p>Avelumab is recommended for use in the NHS.</p></body></html>'
        rec, date = _extract_from_guidance_page(html)
        assert rec == "recommended"

    def test_not_recommended(self):
        html = '<html><body><p>This drug is not recommended for this indication.</p></body></html>'
        rec, date = _extract_from_guidance_page(html)
        assert rec == "not recommended"

    def test_optimised(self):
        html = '<html><body><p>This drug is optimised for restricted use.</p></body></html>'
        rec, date = _extract_from_guidance_page(html)
        assert rec == "optimised"

    def test_recommended_with_restrictions(self):
        """'Recommended with managed access' matches the restrictions pattern."""
        html = '<html><body><p>Recommended with managed access (optimised).</p></body></html>'
        rec, date = _extract_from_guidance_page(html)
        assert rec == "recommended with restrictions"

    def test_terminated(self):
        html = '<html><body><p>This was a terminated appraisal.</p></body></html>'
        rec, date = _extract_from_guidance_page(html)
        assert rec == "terminated"

    def test_date_extracted(self):
        html = '<html><body><p>Published 23 March 2022</p></body></html>'
        rec, date = _extract_from_guidance_page(html)
        assert date == "2022-03-23"

    def test_no_recommendation(self):
        html = '<html><body><p>No clear recommendation here.</p></body></html>'
        rec, date = _extract_from_guidance_page(html)
        assert rec == ""

    def test_empty_html(self):
        rec, date = _extract_from_guidance_page("")
        assert rec == ""
        assert date == ""


# ===================================================================
# G-BA — Bavencio procedure 658
# ===================================================================

class TestGBABavencio:
    """Verify G-BA adapter returns procedure 658 for avelumab/Bavencio."""

    @pytest.fixture
    def gba_service(self):
        service = GermanyGBA()
        service._decisions = [
            {
                "decision_id": "2021-10-21-D-658",
                "procedure_id": "658",
                "substances": ["Avelumab"],
                "trade_names": ["Bavencio"],
                "indication": "Lokal fortgeschrittenes oder metastasiertes Urothelkarzinom",
                "decision_date": "2021-10-21",
                "benefit_rating": "nicht quantifizierbar",
                "evidence_level": "Anhaltspunkt",
                "comparator": "Beobachtendes Abwarten (best supportive care)",
                "patient_group": "Erwachsene mit lokal fortgeschrittenem oder metastasiertem Urothelkarzinom, deren Erkrankung nach einer platinhaltigen Chemotherapie nicht fortgeschritten ist",
            },
        ]
        service._loaded = True
        return service

    @pytest.mark.asyncio
    async def test_search_by_substance(self, gba_service):
        results = await gba_service.search_assessments("avelumab")
        assert len(results) == 1
        assert results[0].benefit_rating == "nicht quantifizierbar"

    @pytest.mark.asyncio
    async def test_search_by_brand_name(self, gba_service):
        results = await gba_service.search_assessments("other", product_name="Bavencio")
        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_assessment_url_contains_procedure(self, gba_service):
        results = await gba_service.search_assessments("avelumab")
        assert "658" in results[0].assessment_url

    @pytest.mark.asyncio
    async def test_comparator_populated(self, gba_service):
        results = await gba_service.search_assessments("avelumab")
        assert "best supportive care" in results[0].comparator.lower()

    @pytest.mark.asyncio
    async def test_patient_group_populated(self, gba_service):
        results = await gba_service.search_assessments("avelumab")
        assert "Urothelkarzinom" in results[0].patient_group

    @pytest.mark.asyncio
    async def test_summary_en_includes_patient_group(self, gba_service):
        results = await gba_service.search_assessments("avelumab")
        assert "Population:" in results[0].summary_en
        assert "Added benefit:" in results[0].summary_en
        assert "Evidence:" in results[0].summary_en
        assert "vs." in results[0].summary_en

    @pytest.mark.asyncio
    async def test_benefit_rating_description_translated(self, gba_service):
        results = await gba_service.search_assessments("avelumab")
        assert "non-quantifiable" in results[0].benefit_rating_description.lower()

    @pytest.mark.asyncio
    async def test_evidence_level_translated(self, gba_service):
        results = await gba_service.search_assessments("avelumab")
        assert "Hint" in results[0].evidence_level

    @pytest.mark.asyncio
    async def test_search_by_indication_product_name(self, gba_service):
        """Searching by product_name should also match in indication text."""
        # Add a decision where the trade name is NOT in trade_names but IS in indication
        gba_service._decisions.append({
            "decision_id": "2022-01-01-D-700",
            "procedure_id": "700",
            "substances": ["somesubstance"],
            "trade_names": [],
            "indication": "Bavencio in combination therapy for mUC",
            "decision_date": "2022-01-01",
            "benefit_rating": "gering",
            "evidence_level": "Hinweis",
            "comparator": "",
            "patient_group": "",
        })

        results = await gba_service.search_assessments("differentdrug", product_name="Bavencio")
        # Should find both: the original (trade name match) and the new one (indication match)
        assert len(results) == 2


# ===================================================================
# Spain AEMPS — Bavencio IPT-44/2022
# ===================================================================

class TestAEMPSBavencio:
    """Verify AEMPS adapter returns IPT-44/2022 for avelumab/Bavencio."""

    @pytest.fixture
    def aemps_service(self):
        service = SpainAEMPS()
        service._ipt_list = [
            {
                "reference": "IPT-44/2022",
                "title": "Avelumab (Bavencio) en el tratamiento de mantenimiento del carcinoma urotelial localmente avanzado o metastásico",
                "url": "https://www.aemps.gob.es/medicamentosUsoHumano/informesPublicos/docs/2022/IPT_44-2022-Bavencio.pdf",
                "published_date": "2022-07-15",
                "positioning": "favorable",
            },
            {
                "reference": "IPT-23/2024",
                "title": "Pembrolizumab (Keytruda) en cáncer de pulmón no microcítico",
                "url": "https://www.aemps.gob.es/docs/2024/ipt-23-2024-pembrolizumab.pdf",
                "published_date": "2024-01-15",
                "positioning": "favorable",
            },
        ]
        service._loaded = True
        return service

    @pytest.mark.asyncio
    async def test_search_by_substance(self, aemps_service):
        results = await aemps_service.search_assessments("avelumab")
        assert len(results) == 1
        assert results[0].ipt_reference == "IPT-44/2022"
        assert results[0].therapeutic_positioning == "Favorable"

    @pytest.mark.asyncio
    async def test_search_by_brand_name(self, aemps_service):
        results = await aemps_service.search_assessments("avelumab", product_name="Bavencio")
        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_search_by_url_slug(self, aemps_service):
        """Even if the title didn't contain the name, URL slug match should work."""
        # Remove the substance from the title to test URL-only matching
        aemps_service._ipt_list[0]["title"] = "Tratamiento de carcinoma urotelial"

        results = await aemps_service.search_assessments("bavencio")
        assert len(results) == 1, "Should match via URL slug 'Bavencio.pdf'"

    @pytest.mark.asyncio
    async def test_assessment_url_is_pdf(self, aemps_service):
        results = await aemps_service.search_assessments("avelumab")
        assert results[0].assessment_url.endswith(".pdf")

    @pytest.mark.asyncio
    async def test_summary_en_populated(self, aemps_service):
        results = await aemps_service.search_assessments("avelumab")
        assert results[0].summary_en
        assert "Favorable" in results[0].summary_en
        assert "IPT-44/2022" in results[0].summary_en

    @pytest.mark.asyncio
    async def test_indication_in_title(self, aemps_service):
        results = await aemps_service.search_assessments("avelumab")
        assert "urotelial" in results[0].evaluation_reason.lower()

    @pytest.mark.asyncio
    async def test_does_not_match_unrelated(self, aemps_service):
        results = await aemps_service.search_assessments("pembrolizumab")
        refs = {r.ipt_reference for r in results}
        assert "IPT-44/2022" not in refs


# ===================================================================
# France HAS — Bavencio (avelumab)
# ===================================================================

class TestHASBavencio:
    """Verify HAS adapter returns assessments for avelumab."""

    @pytest.fixture
    def has_service(self):
        service = FranceHAS()
        service._medicines = {"99001": "BAVENCIO 20 mg/mL, solution à diluer pour perfusion"}
        service._compositions = defaultdict(list, {"99001": ["avelumab"]})
        service._smr = defaultdict(list, {
            "99001": [
                {
                    "dossier_code": "CT-18500",
                    "motif": "Inscription",
                    "date": "2022-04-06",
                    "value": "Important",
                    "label": "Le service médical rendu par BAVENCIO est important dans le traitement d'entretien du carcinome urothélial.",
                },
            ],
        })
        service._asmr = defaultdict(list, {
            "99001": [
                {
                    "dossier_code": "CT-18500",
                    "motif": "Inscription",
                    "date": "2022-04-06",
                    "value": "IV",
                    "label": "BAVENCIO apporte une amélioration du service médical rendu mineure (ASMR IV).",
                },
            ],
        })
        service._ct_links = {"CT-18500": "https://www.has-sante.fr/ct-18500"}
        service._build_substance_index()
        service._loaded = True
        return service

    @pytest.mark.asyncio
    async def test_search_by_substance(self, has_service):
        results = await has_service.search_assessments("avelumab")
        assert len(results) == 1
        assert results[0].smr_value == "Important"
        assert results[0].asmr_value == "IV"

    @pytest.mark.asyncio
    async def test_assessment_url_points_to_ct(self, has_service):
        results = await has_service.search_assessments("avelumab")
        assert "ct-18500" in results[0].assessment_url.lower()

    @pytest.mark.asyncio
    async def test_summary_en_populated(self, has_service):
        results = await has_service.search_assessments("avelumab")
        assert results[0].summary_en
        assert "SMR" in results[0].summary_en
        assert "ASMR IV" in results[0].summary_en
