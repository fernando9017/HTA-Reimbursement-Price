"""Tests for error handling across services — network failures, malformed data, edge cases.

Uses mocked httpx clients to simulate timeouts, HTTP errors, and bad responses
without making real network calls.
"""

import json
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
import pytest_asyncio

from app.services.ema_service import EMAService
from app.services.hta_agencies.france_has import FranceHAS
from app.services.hta_agencies.germany_gba import GermanyGBA
from app.services.hta_agencies.japan_pmda import JapanPMDA
from app.services.hta_agencies.spain_aemps import SpainAEMPS
from app.services.hta_agencies.uk_nice import UKNICE


# ===================================================================
# EMAService — network and parsing errors
# ===================================================================

class TestEMAServiceErrors:
    """Error handling tests for EMAService.load_data()."""

    @pytest.mark.asyncio
    async def test_load_data_http_error(self):
        """HTTP 500 should propagate as an exception."""
        service = EMAService()
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Internal Server Error",
            request=MagicMock(),
            response=MagicMock(status_code=500),
        )

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.ema_service.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await service.load_data()

        assert service.is_loaded is False

    @pytest.mark.asyncio
    async def test_load_data_timeout(self):
        """Network timeout should propagate."""
        service = EMAService()

        mock_client = AsyncMock()
        mock_client.get.side_effect = httpx.ReadTimeout("Connection timed out")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.ema_service.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.ReadTimeout):
                await service.load_data()

        assert service.is_loaded is False

    @pytest.mark.asyncio
    async def test_load_data_dict_with_data_key(self):
        """JSON response wrapped in {data: [...]} should be unwrapped."""
        service = EMAService()
        medicines = [{"medicineName": "TestDrug", "activeSubstance": "testsubstance"}]

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"data": medicines}

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.ema_service.httpx.AsyncClient", return_value=mock_client):
            await service.load_data()

        assert service.is_loaded is True
        assert service.medicine_count == 1

    @pytest.mark.asyncio
    async def test_load_data_dict_without_known_key(self):
        """JSON dict without known wrapper keys falls back to values()."""
        service = EMAService()

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "med1": {"name": "Drug1"},
            "med2": {"name": "Drug2"},
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.ema_service.httpx.AsyncClient", return_value=mock_client):
            await service.load_data()

        assert service.is_loaded is True
        assert service.medicine_count == 2

    @pytest.mark.asyncio
    async def test_load_data_unexpected_type(self):
        """Non-list/non-dict JSON sets empty medicines list."""
        service = EMAService()

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = "just a string"

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.ema_service.httpx.AsyncClient", return_value=mock_client):
            await service.load_data()

        assert service.is_loaded is True
        assert service.medicine_count == 0

    @pytest.mark.asyncio
    async def test_load_data_empty_dict(self):
        """Empty dict should result in empty medicines list."""
        service = EMAService()

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {}

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.ema_service.httpx.AsyncClient", return_value=mock_client):
            await service.load_data()

        assert service.is_loaded is True
        assert service.medicine_count == 0

    def test_search_with_empty_fields(self):
        """Search should handle medicines with missing/empty fields gracefully."""
        service = EMAService()
        service._medicines = [
            {},  # Completely empty
            {"name_of_medicine": ""},  # Empty name
            {"name_of_medicine": None},  # None name
            {"name_of_medicine": "ValidDrug", "active_substance": "validsubstance"},
        ]
        service._loaded = True

        results = service.search("valid")
        assert len(results) >= 1
        assert results[0].name == "ValidDrug"


# ===================================================================
# FranceHAS — network and parsing errors
# ===================================================================

class TestFranceHASErrors:
    """Error handling tests for FranceHAS."""

    @pytest.mark.asyncio
    async def test_load_data_http_error(self):
        """HTTP error during BDPM file download should propagate after retries."""
        agency = FranceHAS()

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Not Found",
            request=MagicMock(),
            response=MagicMock(status_code=404),
        )

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.hta_agencies.france_has.httpx.AsyncClient", return_value=mock_client):
            with patch("app.services.hta_agencies.france_has.asyncio.sleep", new_callable=AsyncMock):
                with pytest.raises(RuntimeError, match="fetch failed after"):
                    await agency.load_data()

        assert agency.is_loaded is False

    @pytest.mark.asyncio
    async def test_search_when_not_loaded(self):
        """search_assessments returns [] when data has not been loaded."""
        agency = FranceHAS()
        results = await agency.search_assessments("pembrolizumab")
        assert results == []

    @pytest.mark.asyncio
    async def test_search_no_matching_substance(self):
        """search_assessments returns [] when substance is not in compositions."""
        agency = FranceHAS()
        agency._medicines = {"12345": "SomeDrug"}
        agency._compositions = defaultdict(list, {"12345": ["other substance"]})
        agency._smr = defaultdict(list)
        agency._asmr = defaultdict(list)
        agency._ct_links = {}
        agency._loaded = True

        results = await agency.search_assessments("nonexistentsubstance")
        assert results == []

    def test_load_from_file_missing_file(self):
        """load_from_file returns False for nonexistent file."""
        agency = FranceHAS()
        result = agency.load_from_file(Path("/nonexistent/path.json"))
        assert result is False
        assert agency.is_loaded is False

    def test_load_from_file_invalid_json(self):
        """load_from_file returns False for file with invalid JSON."""
        agency = FranceHAS()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "FR.json"
            data_file.write_text("not valid json{{{", encoding="utf-8")

            result = agency.load_from_file(data_file)

        assert result is False
        assert agency.is_loaded is False

    def test_load_from_file_wrong_structure(self):
        """load_from_file returns False for JSON missing 'data' key."""
        agency = FranceHAS()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "FR.json"
            data_file.write_text(json.dumps({"wrong_key": []}), encoding="utf-8")

            result = agency.load_from_file(data_file)

        assert result is False

    def test_load_from_file_empty_medicines(self):
        """load_from_file with empty medicines dict returns False."""
        agency = FranceHAS()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "FR.json"
            payload = {
                "data": {
                    "medicines": {},
                    "compositions": {},
                    "smr": {},
                    "asmr": {},
                    "ct_links": {},
                },
            }
            data_file.write_text(json.dumps(payload), encoding="utf-8")

            result = agency.load_from_file(data_file)

        assert result is False

    def test_save_to_file_when_not_loaded(self):
        """save_to_file should be a no-op when not loaded."""
        agency = FranceHAS()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "FR.json"
            agency.save_to_file(data_file)
            assert not data_file.exists()

    def test_save_and_load_roundtrip(self):
        """Data saved to file should be loadable back."""
        agency = FranceHAS()
        agency._medicines = {"12345": "TestDrug"}
        agency._compositions = defaultdict(list, {"12345": ["substance A"]})
        agency._smr = defaultdict(list, {"12345": [{"dossier_code": "D1", "motif": "Inscription", "date": "2024-01-01", "value": "Important", "label": "desc"}]})
        agency._asmr = defaultdict(list)
        agency._ct_links = {"D1": "https://example.com"}
        agency._loaded = True

        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "FR.json"
            agency.save_to_file(data_file)
            assert data_file.exists()

            agency2 = FranceHAS()
            result = agency2.load_from_file(data_file)

        assert result is True
        assert agency2.is_loaded is True
        assert "12345" in agency2._medicines


# ===================================================================
# GermanyGBA — XML parsing and network errors
# ===================================================================

class TestGermanyGBAErrors:
    """Error handling tests for GermanyGBA."""

    @pytest.mark.asyncio
    async def test_search_when_not_loaded(self):
        """search_assessments returns [] when data has not been loaded."""
        agency = GermanyGBA()
        results = await agency.search_assessments("pembrolizumab")
        assert results == []

    def test_parse_xml_malformed(self):
        """Malformed XML should return empty list, not crash."""
        agency = GermanyGBA()
        result = agency._parse_xml(b"<this is not valid xml>>>")
        assert result == []

    def test_parse_xml_empty(self):
        """Empty XML should return empty list."""
        agency = GermanyGBA()
        result = agency._parse_xml(b"<root></root>")
        assert result == []

    def test_parse_xml_with_minimal_decision(self):
        """XML with a single decision element should be parsed."""
        agency = GermanyGBA()
        xml_str = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<G-BA_Beschluss_Info>"
            "<Beschluss>"
            "<ID_BE_AKZ>2024-01-15-D-999</ID_BE_AKZ>"
            "<DAT_BESCHLUSS>2024-01-15</DAT_BESCHLUSS>"
            "<WS_BEW><NAME_WS>pembrolizumab</NAME_WS></WS_BEW>"
            "<HN><NAME_HN>Keytruda</NAME_HN></HN>"
            "<AWG>Advanced melanoma</AWG>"
            "<PAT_GR>"
            "<BEZ_PAT_GR>Adult patients</BEZ_PAT_GR>"
            "<ZN_W>betr\u00e4chtlich</ZN_W>"
            "<AUSSAGESICHERHEIT>Hinweis</AUSSAGESICHERHEIT>"
            "<VGL_TH>Chemotherapy</VGL_TH>"
            "</PAT_GR>"
            "</Beschluss>"
            "</G-BA_Beschluss_Info>"
        )
        xml_content = xml_str.encode("utf-8")

        decisions = agency._parse_xml(xml_content)
        assert len(decisions) == 1
        assert decisions[0]["benefit_rating"] == "betr\u00e4chtlich"
        assert decisions[0]["patient_group"] == "Adult patients"
        assert decisions[0]["comparator"] == "Chemotherapy"

    def test_normalize_date_various_formats(self):
        agency = GermanyGBA()
        assert agency._normalize_date("2024-01-15") == "2024-01-15"
        assert agency._normalize_date("20240115") == "2024-01-15"
        assert agency._normalize_date("15.01.2024") == "2024-01-15"
        assert agency._normalize_date("") == ""
        assert agency._normalize_date("unknown") == "unknown"

    def test_load_from_file_missing(self):
        agency = GermanyGBA()
        result = agency.load_from_file(Path("/nonexistent/DE.json"))
        assert result is False

    def test_load_from_file_wrong_data_type(self):
        """data must be a list, not a dict."""
        agency = GermanyGBA()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "DE.json"
            data_file.write_text(json.dumps({"data": {"wrong": "type"}}), encoding="utf-8")
            result = agency.load_from_file(data_file)
        assert result is False

    def test_save_and_load_roundtrip(self):
        agency = GermanyGBA()
        agency._decisions = [
            {
                "decision_id": "2024-01-15-D-999",
                "procedure_id": "999",
                "substances": ["pembrolizumab"],
                "trade_names": ["Keytruda"],
                "indication": "Melanoma",
                "decision_date": "2024-01-15",
                "benefit_rating": "beträchtlich",
                "evidence_level": "Hinweis",
                "comparator": "Chemo",
                "patient_group": "Adults",
            },
        ]
        agency._loaded = True

        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "DE.json"
            agency.save_to_file(data_file)
            assert data_file.exists()

            agency2 = GermanyGBA()
            result = agency2.load_from_file(data_file)

        assert result is True
        assert len(agency2._decisions) == 1

    def test_save_when_not_loaded(self):
        agency = GermanyGBA()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "DE.json"
            agency.save_to_file(data_file)
            assert not data_file.exists()

    @pytest.mark.asyncio
    async def test_search_no_match(self):
        """Substance not in decisions should return empty."""
        agency = GermanyGBA()
        agency._decisions = [
            {
                "substances": ["nivolumab"],
                "trade_names": ["Opdivo"],
                "procedure_id": "100",
                "decision_id": "2024-01-01-D-100",
                "indication": "Melanoma",
                "decision_date": "2024-01-01",
                "benefit_rating": "gering",
                "evidence_level": "Hinweis",
                "comparator": "",
                "patient_group": "Adults",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("pembrolizumab")
        assert results == []


# ===================================================================
# UKNICE — HTML parsing and network errors
# ===================================================================

class TestUKNICEErrors:
    """Error handling tests for UKNICE."""

    @pytest.mark.asyncio
    async def test_search_when_not_loaded(self):
        agency = UKNICE()
        results = await agency.search_assessments("pembrolizumab")
        assert results == []

    def test_parse_listing_page_empty_html(self):
        agency = UKNICE()
        items = agency._parse_listing_page("", "Technology appraisal guidance")
        assert items == []

    def test_parse_listing_page_no_guidance_links(self):
        agency = UKNICE()
        html = "<html><body><p>No guidance here</p></body></html>"
        items = agency._parse_listing_page(html, "Technology appraisal guidance")
        assert items == []

    def test_load_from_file_missing(self):
        agency = UKNICE()
        result = agency.load_from_file(Path("/nonexistent/GB.json"))
        assert result is False

    def test_load_from_file_wrong_data_type(self):
        agency = UKNICE()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "GB.json"
            data_file.write_text(json.dumps({"data": "not a list"}), encoding="utf-8")
            result = agency.load_from_file(data_file)
        assert result is False

    def test_save_and_load_roundtrip(self):
        agency = UKNICE()
        agency._guidance_list = [
            {
                "reference": "TA100",
                "title": "Pembrolizumab for advanced melanoma",
                "url": "https://www.nice.org.uk/guidance/ta100",
                "published_date": "2024-01-15",
                "guidance_type": "Technology appraisal guidance",
                "recommendation": "recommended",
            },
        ]
        agency._loaded = True

        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "GB.json"
            agency.save_to_file(data_file)

            agency2 = UKNICE()
            result = agency2.load_from_file(data_file)

        assert result is True
        assert len(agency2._guidance_list) == 1

    @pytest.mark.asyncio
    async def test_search_no_match(self):
        agency = UKNICE()
        agency._guidance_list = [
            {
                "reference": "TA100",
                "title": "nivolumab for melanoma",
                "url": "https://www.nice.org.uk/guidance/ta100",
                "published_date": "2024-01-15",
                "recommendation": "recommended",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("pembrolizumab")
        assert results == []


# ===================================================================
# SpainAEMPS — parsing and network errors
# ===================================================================

class TestSpainAEMPSErrors:
    """Error handling tests for SpainAEMPS."""

    @pytest.mark.asyncio
    async def test_search_when_not_loaded(self):
        agency = SpainAEMPS()
        results = await agency.search_assessments("pembrolizumab")
        assert results == []

    def test_parse_listing_page_empty_html(self):
        agency = SpainAEMPS()
        items = agency._parse_listing_page("")
        assert items == []

    def test_parse_listing_page_no_ipt_links(self):
        agency = SpainAEMPS()
        html = "<html><body><p>No IPT reports</p></body></html>"
        items = agency._parse_listing_page(html)
        assert items == []

    def test_load_from_file_missing(self):
        agency = SpainAEMPS()
        result = agency.load_from_file(Path("/nonexistent/ES.json"))
        assert result is False

    def test_load_from_file_invalid_json(self):
        agency = SpainAEMPS()
        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "ES.json"
            data_file.write_text("{broken", encoding="utf-8")
            result = agency.load_from_file(data_file)
        assert result is False

    def test_save_and_load_roundtrip(self):
        agency = SpainAEMPS()
        agency._ipt_list = [
            {
                "reference": "IPT-1/2024",
                "title": "Pembrolizumab en melanoma avanzado",
                "url": "https://aemps.example.com/ipt-1",
                "published_date": "2024-03-10",
                "positioning": "favorable",
            },
        ]
        agency._loaded = True

        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "ES.json"
            agency.save_to_file(data_file)

            agency2 = SpainAEMPS()
            result = agency2.load_from_file(data_file)

        assert result is True
        assert len(agency2._ipt_list) == 1

    @pytest.mark.asyncio
    async def test_search_no_match(self):
        agency = SpainAEMPS()
        agency._ipt_list = [
            {
                "reference": "IPT-1/2024",
                "title": "nivolumab in melanoma",
                "url": "https://aemps.example.com",
                "published_date": "2024-03-10",
                "positioning": "favorable",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("pembrolizumab")
        assert results == []


# ===================================================================
# JapanPMDA — KEGG API errors
# ===================================================================

class TestJapanPMDAErrors:
    """Error handling tests for JapanPMDA."""

    @pytest.mark.asyncio
    async def test_search_when_not_loaded(self):
        agency = JapanPMDA()
        results = await agency.search_assessments("pembrolizumab")
        assert results == []

    @pytest.mark.asyncio
    async def test_load_data_kegg_conv_failure(self):
        """If KEGG conv API fails on both bases, loading should still succeed if list works."""
        agency = JapanPMDA()

        mock_client = AsyncMock()
        # Step 1 (conv) fails on both https and http base URLs
        conv_response1 = MagicMock()
        conv_response1.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Service Unavailable", request=MagicMock(), response=MagicMock(status_code=503),
        )
        conv_response2 = MagicMock()
        conv_response2.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Service Unavailable", request=MagicMock(), response=MagicMock(status_code=503),
        )
        # Step 2 (list) succeeds on first base URL with one drug
        list_response = MagicMock()
        list_response.raise_for_status = MagicMock()
        list_response.text = "dr:D00001\tpembrolizumab (TN); Keytruda (TN)"

        mock_client.get = AsyncMock(side_effect=[conv_response1, conv_response2, list_response])
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.hta_agencies.japan_pmda.httpx.AsyncClient", return_value=mock_client):
            await agency.load_data()

        assert agency.is_loaded is True
        # Drug should be loaded but without JAPIC code
        assert len(agency._drug_list) == 1
        assert agency._drug_list[0]["japic_code"] == ""

    @pytest.mark.asyncio
    async def test_load_data_kegg_list_failure(self):
        """If KEGG list API fails on all bases, loading should raise RuntimeError."""
        agency = JapanPMDA()

        mock_client = AsyncMock()
        # Step 1 (conv) succeeds on first base
        conv_response = MagicMock()
        conv_response.raise_for_status = MagicMock()
        conv_response.text = "japic:J12345\tdr:D00001"
        # Step 2 (list) fails on both bases
        list_response1 = MagicMock()
        list_response1.raise_for_status.side_effect = httpx.ReadTimeout("timeout")
        list_response2 = MagicMock()
        list_response2.raise_for_status.side_effect = httpx.ReadTimeout("timeout")

        mock_client.get = AsyncMock(side_effect=[conv_response, list_response1, list_response2])
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.hta_agencies.japan_pmda.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(RuntimeError, match="KEGG data fetch returned 0 drugs"):
                await agency.load_data()

        assert agency.is_loaded is False

    @pytest.mark.asyncio
    async def test_get_indication_kegg_failure(self):
        """If KEGG GET fails for indication, it should return empty string."""
        agency = JapanPMDA()
        agency._drug_list = [
            {
                "kegg_id": "dr:D99999",
                "names_lower": ["testdrug"],
                "names_display": ["TestDrug"],
                "japic_code": "J99999",
                "japic_url": "https://kegg.example.com/J99999",
            },
        ]
        agency._loaded = True

        mock_client = AsyncMock()
        mock_client.get.side_effect = httpx.ConnectError("Connection refused")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.hta_agencies.japan_pmda.httpx.AsyncClient", return_value=mock_client):
            results = await agency.search_assessments("testdrug")

        assert len(results) == 1
        assert results[0].evaluation_reason == ""

    def test_load_from_file_missing(self):
        agency = JapanPMDA()
        result = agency.load_from_file(Path("/nonexistent/JP.json"))
        assert result is False

    def test_save_and_load_roundtrip(self):
        agency = JapanPMDA()
        agency._drug_list = [
            {
                "kegg_id": "dr:D00001",
                "names_lower": ["pembrolizumab"],
                "names_display": ["Pembrolizumab"],
                "japic_code": "J12345",
                "japic_url": "https://kegg.example.com/J12345",
            },
        ]
        agency._loaded = True

        with TemporaryDirectory() as tmpdir:
            data_file = Path(tmpdir) / "JP.json"
            agency.save_to_file(data_file)

            agency2 = JapanPMDA()
            result = agency2.load_from_file(data_file)

        assert result is True
        assert len(agency2._drug_list) == 1


# ===================================================================
# HTAAgency base class — file I/O edge cases
# ===================================================================

class TestBaseHTAAgencyFileIO:
    """Tests for base class file I/O helpers."""

    def test_read_json_file_nonexistent(self):
        agency = FranceHAS()
        result = agency._read_json_file(Path("/nonexistent/file.json"))
        assert result is None

    def test_read_json_file_invalid_json(self):
        agency = FranceHAS()
        with TemporaryDirectory() as tmpdir:
            bad_file = Path(tmpdir) / "bad.json"
            bad_file.write_text("{{invalid json", encoding="utf-8")
            result = agency._read_json_file(bad_file)
        assert result is None

    def test_read_json_file_valid(self):
        agency = FranceHAS()
        with TemporaryDirectory() as tmpdir:
            good_file = Path(tmpdir) / "good.json"
            good_file.write_text('{"key": "value"}', encoding="utf-8")
            result = agency._read_json_file(good_file)
        assert result == {"key": "value"}

    def test_write_json_file_creates_parents(self):
        agency = FranceHAS()
        with TemporaryDirectory() as tmpdir:
            nested_file = Path(tmpdir) / "a" / "b" / "c" / "data.json"
            agency._write_json_file(nested_file, {"test": True})
            assert nested_file.exists()
            loaded = json.loads(nested_file.read_text(encoding="utf-8"))
            assert loaded == {"test": True}

    def test_make_envelope(self):
        agency = FranceHAS()
        envelope = agency._make_envelope([{"a": 1}, {"b": 2}])
        assert envelope["country"] == "FR"
        assert envelope["agency"] == "HAS"
        assert envelope["record_count"] == 2
        assert "updated_at" in envelope
        assert envelope["data"] == [{"a": 1}, {"b": 2}]

    def test_make_envelope_dict_data(self):
        agency = FranceHAS()
        envelope = agency._make_envelope({
            "medicines": [1, 2, 3],
            "smr": [4, 5],
        })
        assert envelope["record_count"] == 5

    def test_get_country_info(self):
        agency = FranceHAS()
        info = agency.get_country_info()
        assert info.code == "FR"
        assert info.name == "France"
        assert info.agency == "HAS"
        assert info.is_loaded is False


# ===================================================================
# Edge cases: search with special characters
# ===================================================================

class TestSearchEdgeCases:
    """Search with unusual input."""

    @pytest.mark.asyncio
    async def test_france_search_empty_substance(self):
        agency = FranceHAS()
        agency._loaded = True
        agency._compositions = defaultdict(list)
        agency._medicines = {}
        agency._smr = defaultdict(list)
        agency._asmr = defaultdict(list)
        agency._ct_links = {}

        results = await agency.search_assessments("   ")
        assert results == []

    @pytest.mark.asyncio
    async def test_gba_search_empty_substance(self):
        agency = GermanyGBA()
        agency._loaded = True
        agency._decisions = []

        results = await agency.search_assessments("   ")
        assert results == []

    @pytest.mark.asyncio
    async def test_nice_search_empty_substance(self):
        agency = UKNICE()
        agency._loaded = True
        agency._guidance_list = []

        results = await agency.search_assessments("   ")
        assert results == []

    def test_ema_search_whitespace_only_query(self):
        service = EMAService()
        service._loaded = True
        service._medicines = [
            {"name_of_medicine": "TestDrug", "active_substance": "testsubstance"},
        ]

        results = service.search("   ")
        assert results == []

    def test_ema_search_special_characters(self):
        """Regex-special characters in query should not crash."""
        service = EMAService()
        service._loaded = True
        service._medicines = [
            {"name_of_medicine": "Test (drug)", "active_substance": "test-substance [INN]"},
        ]

        # These should not raise regex errors
        results = service.search("test (drug)")
        assert isinstance(results, list)

        results = service.search("[INN]")
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_japan_search_no_match(self):
        agency = JapanPMDA()
        agency._drug_list = [
            {
                "kegg_id": "dr:D00001",
                "names_lower": ["nivolumab"],
                "names_display": ["Nivolumab"],
                "japic_code": "J12345",
                "japic_url": "",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("completelydifferent")
        assert results == []
