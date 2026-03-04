"""Tests for the Italy AIFA adapter using sample CSV data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.italy_aifa import (
    ItalyAIFA,
    _build_aifa_url,
    _class_display,
    _clean,
    _detect_columns,
    _extract_date_from_url,
)


# Sample CSV data mimicking the AIFA transparency list format
SAMPLE_CLASS_A_CSV = """\
Principio Attivo;Descrizione Gruppo Equivalenza;Denominazione e Confezione;Prezzo al pubblico;Titolare AIC;Codice AIC;Codice Gruppo Equivalenza
PEMBROLIZUMAB;25 mg/ml soluzione per infusione;KEYTRUDA 25 mg/ml concentrato per soluzione per infusione, 1 flaconcino 4 ml;3.500,00;Merck Sharp & Dohme (Italia) S.r.l.;044385012;GE12345
NIVOLUMAB;10 mg/ml soluzione per infusione;OPDIVO 10 mg/ml concentrato per soluzione per infusione, 1 flaconcino 10 ml;1.200,00;Bristol-Myers Squibb S.r.l.;044123456;GE12346
IBRUTINIB;140 mg capsule rigide;IMBRUVICA 140 mg capsule rigide, 90 capsule;5.800,00;Janssen-Cilag International NV;044567890;GE12347
ABIRATERONE;500 mg compresse rivestite;ZYTIGA 500 mg compresse rivestite con film, 56 compresse;2.100,00;Janssen-Cilag International NV;044789012;GE12348
"""

SAMPLE_CLASS_H_CSV = """\
Principio Attivo;Descrizione Gruppo Equivalenza;Denominazione e Confezione;Prezzo al pubblico;Titolare AIC;Codice AIC;Codice Gruppo Equivalenza
TRASTUZUMAB DERUXTECAN;100 mg polvere per concentrato;ENHERTU 100 mg polvere per concentrato per soluzione per infusione;2.800,00;Daiichi Sankyo Europe GmbH;049876543;GE22345
ONASEMNOGENE ABEPARVOVEC;soluzione per infusione;ZOLGENSMA soluzione per infusione, 1 flaconcino;1.945.000,00;Novartis Europharm Limited;049111222;GE22346
"""


@pytest.fixture
def aifa_service():
    """Create an AIFA adapter pre-loaded with sample CSV data."""
    import csv
    import io

    service = ItalyAIFA()

    items = []
    seen_aic = set()

    for csv_text, drug_class in [(SAMPLE_CLASS_A_CSV, "A"), (SAMPLE_CLASS_H_CSV, "H")]:
        reader = csv.reader(io.StringIO(csv_text), delimiter=";")
        header = next(reader)
        col_map = _detect_columns(header)

        for row in reader:
            if len(row) < 4:
                continue
            pa = _clean(row[col_map["principio_attivo"]])
            denom = _clean(row[col_map["denominazione"]])
            prezzo = _clean(row[col_map["prezzo"]])
            titolare = _clean(row[col_map["titolare"]])
            aic = _clean(row[col_map["aic"]])

            if aic and aic in seen_aic:
                continue
            if aic:
                seen_aic.add(aic)

            items.append({
                "principio_attivo": pa,
                "denominazione": denom,
                "prezzo": prezzo,
                "titolare": titolare,
                "aic_code": aic,
                "class": drug_class,
                "list_date": "2025-09-30",
            })

    service._drug_list = items
    service._loaded = True
    return service


# ── Parsing tests ────────────────────────────────────────────────────


def test_sample_data_count(aifa_service):
    """Should load all sample medicines."""
    assert len(aifa_service._drug_list) == 6


def test_class_a_count(aifa_service):
    """Should have 4 Class A medicines."""
    class_a = [d for d in aifa_service._drug_list if d["class"] == "A"]
    assert len(class_a) == 4


def test_class_h_count(aifa_service):
    """Should have 2 Class H medicines."""
    class_h = [d for d in aifa_service._drug_list if d["class"] == "H"]
    assert len(class_h) == 2


# ── Search tests ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_by_substance(aifa_service):
    """Should find medicines by active substance."""
    results = await aifa_service.search_assessments("pembrolizumab")
    assert len(results) == 1
    assert results[0].aifa_class == "A"
    assert "KEYTRUDA" in results[0].product_name


@pytest.mark.asyncio
async def test_search_by_substance_case_insensitive(aifa_service):
    """Search should be case-insensitive."""
    results = await aifa_service.search_assessments("NIVOLUMAB")
    assert len(results) == 1
    assert "OPDIVO" in results[0].product_name


@pytest.mark.asyncio
async def test_search_class_h(aifa_service):
    """Should find Class H medicines."""
    results = await aifa_service.search_assessments("trastuzumab deruxtecan")
    assert len(results) == 1
    assert results[0].aifa_class == "H"
    assert "ENHERTU" in results[0].product_name


@pytest.mark.asyncio
async def test_search_by_product_name(aifa_service):
    """Should find medicines by product name."""
    results = await aifa_service.search_assessments("xxx", product_name="ZOLGENSMA")
    assert len(results) == 1
    assert results[0].aifa_class == "H"


@pytest.mark.asyncio
async def test_search_no_results(aifa_service):
    """Should return empty for unknown substance."""
    results = await aifa_service.search_assessments("nonexistent-drug-xyz")
    assert results == []


@pytest.mark.asyncio
async def test_search_not_loaded():
    """Should return empty if data not loaded."""
    service = ItalyAIFA()
    results = await service.search_assessments("pembrolizumab")
    assert results == []


@pytest.mark.asyncio
async def test_result_fields(aifa_service):
    """Should populate all expected fields in results."""
    results = await aifa_service.search_assessments("ibrutinib")
    assert len(results) == 1
    r = results[0]
    assert r.aifa_class == "A"
    assert r.aifa_aic_code == "044567890"
    assert "€" in r.aifa_price
    assert "SSN Reimbursed" in r.evaluation_reason
    assert r.opinion_date == "2025-09-30"
    assert r.assessment_url  # Should have a URL


# ── Helper function tests ────────────────────────────────────────────


def test_clean():
    assert _clean("  KEYTRUDA  ") == "KEYTRUDA"
    assert _clean('"quoted"') == "quoted"


def test_class_display():
    assert "Community Pharmacy" in _class_display("A")
    assert "Hospital" in _class_display("H")
    assert "Not Reimbursed" in _class_display("C")


def test_build_aifa_url():
    url = _build_aifa_url("044385012")
    assert "medicinali.aifa.gov.it" in url
    assert "044385012" in url


def test_build_aifa_url_empty():
    assert _build_aifa_url("") == ""


def test_extract_date_from_url():
    assert _extract_date_from_url("Classe_A_15.05.2017.csv") == "2017-05-15"
    assert _extract_date_from_url("file_2025-09-30.csv") == "2025-09-30"
    assert _extract_date_from_url("nodate.csv") == ""


def test_detect_columns():
    header = [
        "Principio Attivo",
        "Descrizione Gruppo Equivalenza",
        "Denominazione e Confezione",
        "Prezzo al pubblico",
        "Titolare AIC",
        "Codice AIC",
    ]
    col_map = _detect_columns(header)
    assert col_map["principio_attivo"] == 0
    assert col_map["denominazione"] == 2
    assert col_map["prezzo"] == 3
    assert col_map["titolare"] == 4
    assert col_map["aic"] == 5


def test_detect_columns_alternative_headers():
    """Should handle alternative column names."""
    header = ["Principio attivo", "Gruppo", "Denominazione", "Prezzo", "Ditta", "AIC"]
    col_map = _detect_columns(header)
    assert col_map["principio_attivo"] == 0
    assert col_map["denominazione"] == 2
    assert col_map["prezzo"] == 3
    assert col_map["titolare"] == 4


# ── File caching tests ───────────────────────────────────────────────


def test_save_and_load_from_file(aifa_service):
    """Should round-trip through JSON file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        data_file = Path(tmpdir) / "IT.json"
        aifa_service.save_to_file(data_file)

        assert data_file.exists()

        # Load into a new service
        new_service = ItalyAIFA()
        loaded = new_service.load_from_file(data_file)

        assert loaded is True
        assert new_service.is_loaded
        assert len(new_service._drug_list) == len(aifa_service._drug_list)


# ── Properties tests ─────────────────────────────────────────────────


def test_properties():
    service = ItalyAIFA()
    assert service.country_code == "IT"
    assert service.country_name == "Italy"
    assert service.agency_abbreviation == "AIFA"
    assert "Italiana" in service.agency_full_name
    assert not service.is_loaded
