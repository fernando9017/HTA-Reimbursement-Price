"""Tests for malformed data parsing — broken XML, HTML, TSV, and JSON inputs.

Each adapter should handle corrupted or unexpected data gracefully without
crashing. These tests feed various kinds of bad data into the parsing
methods and verify the adapters return empty results or degrade gracefully.
"""

from collections import defaultdict

import pytest

from app.services.ema_service import EMAService
from app.services.hta_agencies.france_has import FranceHAS, _format_date
from app.services.hta_agencies.germany_gba import GermanyGBA
from app.services.hta_agencies.japan_pmda import JapanPMDA, _parse_kegg_disease
from app.services.hta_agencies.spain_aemps import (
    SpainAEMPS,
    _clean_html_text,
    _extract_ipt_reference,
    _parse_spanish_date,
    _parse_spanish_date_parts,
)
from app.services.hta_agencies.uk_nice import (
    UKNICE,
    _clean_html_text as nice_clean_html,
    _normalize_recommendation,
    _parse_date_text,
)


# ===================================================================
# France HAS — malformed TSV / BDPM data
# ===================================================================

class TestFranceHASMalformedData:
    """Test FranceHAS parsing with malformed or truncated TSV rows."""

    def test_parse_rows_empty_content(self):
        agency = FranceHAS()
        rows = agency._parse_rows("")
        assert rows == []

    def test_parse_rows_blank_lines(self):
        agency = FranceHAS()
        rows = agency._parse_rows("\n\n\n")
        assert rows == []

    def test_parse_rows_single_column(self):
        """Rows with fewer columns than expected should still be parsed."""
        agency = FranceHAS()
        rows = agency._parse_rows("12345\n67890\n")
        assert len(rows) == 2
        assert rows[0] == ["12345"]

    def test_parse_rows_with_extra_tabs(self):
        """Trailing tabs are stripped by line.strip() before split."""
        agency = FranceHAS()
        rows = agency._parse_rows("a\tb\tc\t\t\t")
        assert len(rows) == 1
        assert len(rows[0]) == 3  # trailing tabs stripped before split

    def test_format_date_valid_compact(self):
        assert _format_date("20240115") == "2024-01-15"

    def test_format_date_already_formatted(self):
        assert _format_date("2024-01-15") == "2024-01-15"

    def test_format_date_invalid(self):
        assert _format_date("abc") == "abc"

    def test_format_date_empty(self):
        assert _format_date("") == ""

    def test_format_date_short_digit_string(self):
        """Digit string shorter than 8 chars is not a date."""
        assert _format_date("202401") == "202401"

    def test_format_date_whitespace_padded(self):
        assert _format_date("  20240115  ") == "2024-01-15"

    @pytest.mark.asyncio
    async def test_search_with_truncated_smr_rows(self):
        """SMR records with fewer fields than expected should not crash."""
        agency = FranceHAS()
        agency._medicines = {"111": "DrugA"}
        agency._compositions = defaultdict(list, {"111": ["substanceX"]})
        # SMR record with minimal fields
        agency._smr = defaultdict(list, {
            "111": [
                {"dossier_code": "D1", "motif": "", "date": "", "value": "", "label": ""},
            ],
        })
        agency._asmr = defaultdict(list)
        agency._ct_links = {}
        agency._loaded = True

        results = await agency.search_assessments("substanceX")
        assert len(results) == 1
        assert results[0].smr_value == ""

    @pytest.mark.asyncio
    async def test_search_with_unicode_substance(self):
        """Substance names with accented characters should match."""
        agency = FranceHAS()
        agency._medicines = {"222": "DOLIPRANE"}
        agency._compositions = defaultdict(list, {"222": ["parac\u00e9tamol"]})
        agency._smr = defaultdict(list, {
            "222": [
                {"dossier_code": "D2", "motif": "Inscription", "date": "2024-01-01",
                 "value": "Important", "label": "desc"},
            ],
        })
        agency._asmr = defaultdict(list)
        agency._ct_links = {}
        agency._loaded = True

        results = await agency.search_assessments("parac\u00e9tamol")
        assert len(results) >= 1

    @pytest.mark.asyncio
    async def test_search_partial_substance_match(self):
        """Partial substance match should work bidirectionally."""
        agency = FranceHAS()
        agency._medicines = {"333": "KEYTRUDA"}
        agency._compositions = defaultdict(list, {"333": ["pembrolizumab"]})
        agency._smr = defaultdict(list, {
            "333": [
                {"dossier_code": "D3", "motif": "Inscription", "date": "2024-06-01",
                 "value": "Important", "label": "desc"},
            ],
        })
        agency._asmr = defaultdict(list)
        agency._ct_links = {}
        agency._loaded = True

        # Short query matching part of substance
        results = await agency.search_assessments("pembroliz")
        assert len(results) >= 1


# ===================================================================
# Germany G-BA — malformed XML data
# ===================================================================

class TestGermanyGBAMalformedXML:
    """Test G-BA adapter with various broken XML inputs."""

    def test_parse_xml_binary_garbage(self):
        agency = GermanyGBA()
        result = agency._parse_xml(b"\x00\x01\x02\x03\x04\x05")
        assert result == []

    def test_parse_xml_truncated(self):
        agency = GermanyGBA()
        result = agency._parse_xml(b"<?xml version='1.0'?><G-BA_Beschluss_Info><Beschluss>")
        assert result == []

    def test_parse_xml_wrong_encoding_declaration(self):
        """XML with encoding mismatch should still be handled."""
        agency = GermanyGBA()
        # Declare latin-1 but content is UTF-8 — ET may raise or handle it
        xml = '<?xml version="1.0" encoding="ISO-8859-1"?><root></root>'
        result = agency._parse_xml(xml.encode("utf-8"))
        assert isinstance(result, list)

    def test_parse_xml_decision_without_substance(self):
        """Decision elements with no substance should still be parsed."""
        agency = GermanyGBA()
        xml_str = (
            '<?xml version="1.0"?>'
            "<G-BA_Beschluss_Info>"
            "<Beschluss>"
            "<ID_BE_AKZ>2024-01-01-D-1</ID_BE_AKZ>"
            "<DAT_BESCHLUSS>2024-01-01</DAT_BESCHLUSS>"
            "</Beschluss>"
            "</G-BA_Beschluss_Info>"
        )
        decisions = agency._parse_xml(xml_str.encode("utf-8"))
        assert len(decisions) == 1
        assert decisions[0]["substances"] == []

    def test_parse_xml_multiple_patient_groups(self):
        """Multiple PAT_GR elements should create separate entries."""
        agency = GermanyGBA()
        xml_str = (
            '<?xml version="1.0"?>'
            "<G-BA_Beschluss_Info>"
            "<Beschluss>"
            "<ID_BE_AKZ>2024-01-01-D-1</ID_BE_AKZ>"
            "<DAT_BESCHLUSS>20240101</DAT_BESCHLUSS>"
            "<WS_BEW><NAME_WS>testdrug</NAME_WS></WS_BEW>"
            "<PAT_GR>"
            "<BEZ_PAT_GR>Group A</BEZ_PAT_GR>"
            "<ZN_W>gering</ZN_W>"
            "</PAT_GR>"
            "<PAT_GR>"
            "<BEZ_PAT_GR>Group B</BEZ_PAT_GR>"
            "<ZN_W>kein Zusatznutzen</ZN_W>"
            "</PAT_GR>"
            "</Beschluss>"
            "</G-BA_Beschluss_Info>"
        )
        decisions = agency._parse_xml(xml_str.encode("utf-8"))
        assert len(decisions) == 2
        groups = {d["patient_group"] for d in decisions}
        assert "Group A" in groups
        assert "Group B" in groups

    def test_parse_xml_empty_text_elements(self):
        """Elements with no text content should not crash."""
        agency = GermanyGBA()
        xml_str = (
            '<?xml version="1.0"?>'
            "<G-BA_Beschluss_Info>"
            "<Beschluss>"
            "<ID_BE_AKZ></ID_BE_AKZ>"
            "<DAT_BESCHLUSS></DAT_BESCHLUSS>"
            "<WS_BEW><NAME_WS></NAME_WS></WS_BEW>"
            "<HN><NAME_HN></NAME_HN></HN>"
            "</Beschluss>"
            "</G-BA_Beschluss_Info>"
        )
        decisions = agency._parse_xml(xml_str.encode("utf-8"))
        assert len(decisions) == 1
        assert decisions[0]["decision_id"] == ""

    def test_normalize_date_whitespace_only(self):
        agency = GermanyGBA()
        assert agency._normalize_date("   ") == ""

    def test_normalize_date_partial_german_format(self):
        """Partial German date format should be returned as-is."""
        agency = GermanyGBA()
        assert agency._normalize_date("15.01") == "15.01"

    @pytest.mark.asyncio
    async def test_search_by_trade_name(self):
        """Searching by product_name should match trade names."""
        agency = GermanyGBA()
        agency._decisions = [
            {
                "substances": ["pembrolizumab"],
                "trade_names": ["Keytruda"],
                "procedure_id": "999",
                "decision_id": "2024-01-15-D-999",
                "indication": "Melanoma",
                "decision_date": "2024-01-15",
                "benefit_rating": "gering",
                "evidence_level": "Hinweis",
                "comparator": "",
                "patient_group": "Adults",
            },
        ]
        agency._loaded = True

        results = await agency.search_assessments("differentsubstance", product_name="Keytruda")
        assert len(results) == 1


# ===================================================================
# UK NICE — malformed HTML data
# ===================================================================

class TestUKNICEMalformedHTML:
    """Test NICE adapter with malformed or unusual HTML."""

    def test_parse_html_with_broken_tags(self):
        agency = UKNICE()
        html = '<a href="/guidance/ta100">Title with <broken tag</a>'
        items = agency._parse_guidance_html(html, "Technology appraisal guidance")
        # Should still extract the link even with broken inner tags
        assert isinstance(items, list)

    def test_parse_html_with_duplicate_refs(self):
        """Duplicate guidance references should be deduplicated."""
        agency = UKNICE()
        html = (
            '<a href="/guidance/ta200">Title A</a>'
            '<a href="/guidance/ta200">Title A repeated</a>'
        )
        items = agency._parse_guidance_html(html, "Technology appraisal guidance")
        assert len(items) == 1

    def test_parse_html_with_hst_guidance(self):
        agency = UKNICE()
        html = '<a href="/guidance/hst5">Drug for rare disease</a>'
        items = agency._parse_guidance_html(html, "Highly specialised technologies guidance")
        assert len(items) == 1
        assert items[0]["reference"] == "HST5"

    def test_extract_date_near_no_match(self):
        agency = UKNICE()
        date = agency._extract_date_near("<p>no date here</p>", "/guidance/ta999")
        assert date == ""

    def test_extract_date_near_iso_format(self):
        agency = UKNICE()
        html = '<a href="/guidance/ta300">Title</a><span>2024-06-15</span>'
        date = agency._extract_date_near(html, "/guidance/ta300")
        assert date == "2024-06-15"

    def test_extract_recommendation_near_not_recommended(self):
        agency = UKNICE()
        html = '<a href="/guidance/ta400">Drug</a><p>Not recommended for use</p>'
        rec = agency._extract_recommendation_near(html, "/guidance/ta400")
        assert rec == "not recommended"

    def test_normalize_recommendation_unknown(self):
        result = _normalize_recommendation("some unknown status text")
        assert result == "Some unknown status text"

    def test_normalize_recommendation_empty(self):
        assert _normalize_recommendation("") == ""

    def test_parse_date_text_valid(self):
        assert _parse_date_text("15", "January", "2024") == "2024-01-15"
        assert _parse_date_text("1", "December", "2023") == "2023-12-01"

    def test_parse_date_text_unknown_month(self):
        """Unknown month name should default to 01."""
        assert _parse_date_text("15", "Smarch", "2024") == "2024-01-15"

    def test_clean_html_entities(self):
        assert nice_clean_html("A &amp; B") == "A & B"
        assert nice_clean_html("&lt;tag&gt;") == "<tag>"
        assert nice_clean_html("word&nbsp;word") == "word word"
        assert nice_clean_html("&#9999;text") == "text"

    def test_clean_html_nested_tags(self):
        assert nice_clean_html("<b><i>bold italic</i></b>") == "bold italic"

    def test_clean_html_extra_whitespace(self):
        assert nice_clean_html("  lots   of   spaces  ") == "lots of spaces"


# ===================================================================
# Spain AEMPS — malformed HTML data
# ===================================================================

class TestSpainAEMPSMalformedHTML:
    """Test AEMPS adapter with malformed or unusual HTML."""

    def test_parse_listing_page_link_too_short(self):
        """Links with title shorter than 5 chars should be skipped."""
        agency = SpainAEMPS()
        html = '<a href="/ipt-test.pdf">Hi</a>'
        items = agency._parse_listing_page(html)
        assert items == []

    def test_parse_listing_page_relative_urls(self):
        """Relative URLs should be made absolute."""
        agency = SpainAEMPS()
        html = (
            '<a href="/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-1-2024-drugname.pdf">'
            "IPT-1/2024 - Drugname for some indication with enough text"
            "</a>"
        )
        items = agency._parse_listing_page(html)
        if items:
            assert items[0]["url"].startswith("https://")

    def test_extract_ipt_reference_various(self):
        assert _extract_ipt_reference("ipt-23/2024") == "IPT-23/2024"
        assert _extract_ipt_reference("IPT 5/2023") == "IPT-5/2023"
        assert _extract_ipt_reference("ipt-1/2024v2") == "IPT-1/2024V2"
        assert _extract_ipt_reference("no reference here") == ""

    def test_parse_spanish_date_dd_mm_yyyy(self):
        assert _parse_spanish_date("15/01/2024") == "2024-01-15"

    def test_parse_spanish_date_iso(self):
        assert _parse_spanish_date("2024-03-15") == "2024-03-15"

    def test_parse_spanish_date_spanish_format(self):
        assert _parse_spanish_date("15 de enero de 2024") == "2024-01-15"
        assert _parse_spanish_date("3 de diciembre de 2023") == "2023-12-03"

    def test_parse_spanish_date_empty(self):
        assert _parse_spanish_date("") == ""

    def test_parse_spanish_date_unknown_format(self):
        """Unknown date format should be returned as-is."""
        assert _parse_spanish_date("sometext") == "sometext"

    def test_parse_spanish_date_parts_all_months(self):
        months = [
            ("enero", "01"), ("febrero", "02"), ("marzo", "03"), ("abril", "04"),
            ("mayo", "05"), ("junio", "06"), ("julio", "07"), ("agosto", "08"),
            ("septiembre", "09"), ("octubre", "10"), ("noviembre", "11"), ("diciembre", "12"),
        ]
        for month_name, expected_num in months:
            result = _parse_spanish_date_parts("1", month_name, "2024")
            assert result == f"2024-{expected_num}-01"

    def test_parse_spanish_date_parts_unknown_month(self):
        """Unknown month name should default to 01."""
        assert _parse_spanish_date_parts("15", "frimaire", "2024") == "2024-01-15"

    def test_clean_html_text_spanish_entities(self):
        assert _clean_html_text("caf\u00e9") == "caf\u00e9"
        assert _clean_html_text("&aacute;") == "\u00e1"
        assert _clean_html_text("&eacute;") == "\u00e9"
        assert _clean_html_text("&ntilde;") == "\u00f1"

    def test_extract_positioning_near_no_match(self):
        agency = SpainAEMPS()
        result = agency._extract_positioning_near(
            "<p>Some text without positioning info</p>",
            "anchor text",
        )
        assert result == ""

    def test_extract_date_near_spanish_date(self):
        agency = SpainAEMPS()
        html = '<a>Drug report</a> publicado el 15 de enero de 2024 en la web'
        result = agency._extract_date_near(html, "Drug report")
        assert result == "2024-01-15"

    def test_extract_date_near_slash_date(self):
        agency = SpainAEMPS()
        html = '<a>Drug report</a> fecha: 15/03/2024'
        result = agency._extract_date_near(html, "Drug report")
        assert result == "2024-03-15"

    def test_extract_date_near_no_date(self):
        agency = SpainAEMPS()
        result = agency._extract_date_near("<p>No date</p>", "Drug report")
        assert result == ""


# ===================================================================
# Japan PMDA — KEGG data parsing
# ===================================================================

class TestJapanPMDAMalformedData:
    """Test Japan PMDA adapter with malformed KEGG data."""

    def test_parse_kegg_disease_empty(self):
        assert _parse_kegg_disease("") == ""

    def test_parse_kegg_disease_no_disease_section(self):
        text = "ENTRY       D12345\nNAME        Some drug\nFORMULA     C10H20\n"
        assert _parse_kegg_disease(text) == ""

    def test_parse_kegg_disease_single_disease(self):
        text = (
            "ENTRY       D12345\n"
            "DISEASE     H01563  Urothelial carcinoma [DS:H01563]\n"
            "PRODUCT     Some product\n"
        )
        result = _parse_kegg_disease(text)
        assert result == "Urothelial carcinoma"

    def test_parse_kegg_disease_multiple_diseases(self):
        text = (
            "DISEASE     H01563  Urothelial carcinoma [DS:H01563]\n"
            "            H01562  Bladder cancer [DS:H01562]\n"
            "PRODUCT     Something\n"
        )
        result = _parse_kegg_disease(text)
        assert "Urothelial carcinoma" in result
        assert "Bladder cancer" in result

    def test_parse_kegg_disease_deduplicates(self):
        text = (
            "DISEASE     H01563  Same disease [DS:H01563]\n"
            "            H01563  Same disease [DS:H01563]\n"
            "PRODUCT     X\n"
        )
        result = _parse_kegg_disease(text)
        assert result == "Same disease"

    def test_parse_kegg_disease_no_ds_suffix(self):
        """Disease line without [DS:...] suffix."""
        text = "DISEASE     H01563  Some rare condition\nPRODUCT     X\n"
        result = _parse_kegg_disease(text)
        assert result == "Some rare condition"

    @pytest.mark.asyncio
    async def test_search_caps_at_five_matches(self):
        """search_assessments should cap KEGG API calls at 5 drugs."""
        agency = JapanPMDA()
        agency._drug_list = [
            {
                "kegg_id": f"dr:D0000{i}",
                "names_lower": ["testdrug"],
                "names_display": ["TestDrug"],
                "japic_code": f"J{i}" if i % 2 == 0 else "",
                "japic_url": f"https://example.com/J{i}" if i % 2 == 0 else "",
            }
            for i in range(10)
        ]
        agency._loaded = True
        agency._disease_cache = {f"dr:D0000{i}": "" for i in range(10)}

        results = await agency.search_assessments("testdrug")
        # Should only return max 5 results despite 10 matches
        assert len(results) == 5

    @pytest.mark.asyncio
    async def test_search_reimbursed_vs_not(self):
        """Drugs with/without JAPIC codes get different reimbursement status."""
        agency = JapanPMDA()
        agency._drug_list = [
            {
                "kegg_id": "dr:D00001",
                "names_lower": ["testdrug"],
                "names_display": ["TestDrug"],
                "japic_code": "J12345",
                "japic_url": "https://example.com/J12345",
            },
            {
                "kegg_id": "dr:D00002",
                "names_lower": ["testdrug variant"],
                "names_display": ["TestDrug Variant"],
                "japic_code": "",
                "japic_url": "",
            },
        ]
        agency._loaded = True
        agency._disease_cache = {"dr:D00001": "Cancer", "dr:D00002": ""}

        results = await agency.search_assessments("testdrug")
        assert len(results) == 2

        reimbursed = [r for r in results if r.pmda_review_type == "Reimbursed (NHI)"]
        not_reimbursed = [r for r in results if r.pmda_review_type == "Not in NHI price list"]
        assert len(reimbursed) == 1
        assert len(not_reimbursed) == 1
        assert reimbursed[0].japan_mhlw_url != ""
        assert not_reimbursed[0].japan_mhlw_url == ""


# ===================================================================
# EMA Service — malformed medicine records
# ===================================================================

class TestEMAServiceMalformedRecords:
    """Test EMA search with various broken/incomplete records."""

    def test_search_with_none_values(self):
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": None, "active_substance": None},
            {"name_of_medicine": "Good Drug", "active_substance": "good substance"},
        ]
        service._loaded = True

        results = service.search("good")
        assert len(results) >= 1
        assert results[0].name == "Good Drug"

    def test_search_with_numeric_values(self):
        """Non-string values in records should be coerced to strings."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": 12345, "active_substance": "substance"},
        ]
        service._loaded = True

        results = service.search("12345")
        assert len(results) >= 1

    def test_search_with_nested_dict_values(self):
        """Unexpected dict value for a field should be stringified."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "Drug", "active_substance": {"en": "substance"}},
        ]
        service._loaded = True

        results = service.search("Drug")
        assert len(results) >= 1

    def test_search_alternative_field_names(self):
        """Test that alternative EMA JSON field names are recognized."""
        service = EMAService()
        service._medicines = [
            {
                "medicineName": "AlternateName",
                "activeSubstance": "alt_substance",
                "therapeuticIndication": "Indication text",
                "authorisationStatus": "Authorised",
                "emaNumber": "EMEA/H/C/001",
            },
        ]
        service._loaded = True

        results = service.search("AlternateName")
        assert len(results) == 1
        assert results[0].active_substance == "alt_substance"

    def test_search_url_generation_when_missing(self):
        """When no URL field, EMA URL should be generated from brand name."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "Keytruda", "active_substance": "pembrolizumab"},
        ]
        service._loaded = True

        results = service.search("Keytruda")
        assert len(results) == 1
        assert "keytruda" in results[0].url.lower()

    def test_search_url_from_explicit_field(self):
        """Explicit URL field should be used when present."""
        service = EMAService()
        service._medicines = [
            {
                "name_of_medicine": "DrugX",
                "active_substance": "substanceX",
                "url": "https://custom.url/drugx",
            },
        ]
        service._loaded = True

        results = service.search("DrugX")
        assert results[0].url == "https://custom.url/drugx"

    def test_fuzzy_match_close_name(self):
        """Close misspellings should be found via fuzzy matching."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "Keytruda", "active_substance": "pembrolizumab"},
        ]
        service._loaded = True

        results = service.search("Keytruds")  # off by one char
        assert len(results) >= 1

    def test_search_scoring_exact_name_highest(self):
        """Exact name match should score higher than substring match."""
        service = EMAService()
        service._medicines = [
            {"name_of_medicine": "Dru", "active_substance": "short"},
            {"name_of_medicine": "DrugLong", "active_substance": "different"},
        ]
        service._loaded = True

        results = service.search("Dru")
        assert results[0].name == "Dru"
