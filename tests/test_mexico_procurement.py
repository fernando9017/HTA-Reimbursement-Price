"""Tests for the Mexico Pharma Procurement service."""

import pytest

from app.services.mexico_procurement import MexicoProcurementService


# ── Sample data fixture ───────────────────────────────────────────────

SAMPLE_CLAVES = [
    {
        "clave": "010.000.6317.00",
        "description": "PEMBROLIZUMAB 100 mg",
        "active_substance": "pembrolizumab",
        "atc_code": "L01FF02",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
        "cnis_listed": True,
        "cofepris_registry": "1657SSA2014",
        "indication": "Melanoma, NSCLC, head and neck carcinoma",
        "mechanism_of_action": "Anti-PD-1 monoclonal antibody",
        "patent_holder": "Merck Sharp & Dohme (MSD)",
        "patent_expiry": "2028-10",
    },
    {
        "clave": "010.000.5480.00",
        "description": "IMATINIB 400 mg",
        "active_substance": "imatinib",
        "atc_code": "L01EA01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0217SSA2002",
        "indication": "CML, KIT-positive GIST",
        "mechanism_of_action": "BCR-ABL tyrosine kinase inhibitor",
        "patent_holder": "Novartis (generic)",
        "patent_expiry": "2016-01",
    },
    {
        "clave": "010.000.5820.00",
        "description": "ADALIMUMAB 40 mg",
        "active_substance": "adalimumab",
        "atc_code": "L04AB04",
        "therapeutic_group": "Inmunología y Reumatología",
        "source_type": "biotecnologico",
        "cnis_listed": True,
        "cofepris_registry": "0721SSA2007",
        "indication": "Rheumatoid arthritis, psoriatic arthritis, Crohn disease",
        "mechanism_of_action": "Anti-TNF-alpha monoclonal antibody",
        "patent_holder": "AbbVie (biosimilars available)",
        "patent_expiry": "2023-01",
    },
    {
        "clave": "010.000.6430.00",
        "description": "LENVATINIB 10 mg",
        "active_substance": "lenvatinib",
        "atc_code": "L01EX08",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
        "cnis_listed": False,
        "cofepris_registry": "2098SSA2018",
        "indication": "Thyroid carcinoma, hepatocellular carcinoma",
        "mechanism_of_action": "Multi-kinase inhibitor",
        "patent_holder": "Eisai",
        "patent_expiry": "2027-07",
    },
]

SAMPLE_ADJUDICACIONES = [
    {
        "clave": "010.000.6317.00",
        "description": "PEMBROLIZUMAB 100 mg",
        "active_substance": "pembrolizumab",
        "cycle": "2023-2024",
        "status": "adjudicada",
        "supplier": "MSD México",
        "units_requested": 85000,
        "units_awarded": 72000,
        "unit_price": 28745.50,
        "total_amount": 2069676000.0,
        "institution": "IMSS",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
    },
    {
        "clave": "010.000.6317.00",
        "description": "PEMBROLIZUMAB 100 mg",
        "active_substance": "pembrolizumab",
        "cycle": "2025-2026",
        "status": "adjudicada",
        "supplier": "MSD México",
        "units_requested": 110000,
        "units_awarded": 98000,
        "unit_price": 26890.00,
        "total_amount": 2635220000.0,
        "institution": "IMSS",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
        "negotiation_type": "mesa_patente",
        "negotiation_notes": "MSD negotiated a 6.5% price reduction from previous cycle.",
        "competitor_bids": [
            {"supplier": "MSD México", "unit_price_offered": 26890.00,
             "outcome": "awarded", "reason": "Sole patent holder"},
        ],
    },
    {
        "clave": "010.000.6317.00",
        "description": "PEMBROLIZUMAB 100 mg",
        "active_substance": "pembrolizumab",
        "cycle": "2025-2026",
        "status": "adjudicada",
        "supplier": "MSD México",
        "units_requested": 35000,
        "units_awarded": 32000,
        "unit_price": 26890.00,
        "total_amount": 860480000.0,
        "institution": "ISSSTE",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
    },
    {
        "clave": "010.000.5480.00",
        "description": "IMATINIB 400 mg",
        "active_substance": "imatinib",
        "cycle": "2025-2026",
        "status": "adjudicada",
        "supplier": "Laboratorios AMSA",
        "units_requested": 115000,
        "units_awarded": 115000,
        "unit_price": 198.50,
        "total_amount": 22827500.0,
        "institution": "IMSS",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
    },
    {
        "clave": "010.000.5820.00",
        "description": "ADALIMUMAB 40 mg",
        "active_substance": "adalimumab",
        "cycle": "2025-2026",
        "status": "adjudicada",
        "supplier": "Laboratorios PiSA",
        "units_requested": 210000,
        "units_awarded": 200000,
        "unit_price": 2890.00,
        "total_amount": 578000000.0,
        "institution": "IMSS",
        "therapeutic_group": "Inmunología y Reumatología",
        "source_type": "biotecnologico",
        "negotiation_type": "licitacion_publica",
        "negotiation_notes": "Biosimilar competition drove a 46.8% price reduction vs originator.",
        "competitor_bids": [
            {"supplier": "Laboratorios PiSA", "unit_price_offered": 2890.00,
             "outcome": "awarded", "reason": "Lowest compliant biosimilar bid"},
            {"supplier": "Probiomed", "unit_price_offered": 3100.00,
             "outcome": "second_place", "reason": "Second lowest bid"},
            {"supplier": "AbbVie México", "unit_price_offered": 4200.00,
             "outcome": "rejected", "reason": "Originator price not competitive"},
        ],
    },
    {
        "clave": "010.000.6430.00",
        "description": "LENVATINIB 10 mg",
        "active_substance": "lenvatinib",
        "cycle": "2023-2024",
        "status": "desierta",
        "supplier": "",
        "units_requested": 8000,
        "units_awarded": 0,
        "unit_price": 0.0,
        "total_amount": 0.0,
        "institution": "IMSS",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
        "negotiation_type": "mesa_patente",
        "negotiation_notes": "Eisai did not submit a price offer below reference threshold.",
    },
    {
        "clave": "010.000.6430.00",
        "description": "LENVATINIB 10 mg",
        "active_substance": "lenvatinib",
        "cycle": "2025-2026",
        "status": "desierta",
        "supplier": "",
        "units_requested": 12000,
        "units_awarded": 0,
        "unit_price": 0.0,
        "total_amount": 0.0,
        "institution": "IMSS",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
        "negotiation_type": "mesa_patente",
        "negotiation_notes": "Price disagreement persists. Eisai declined to participate.",
    },
]


@pytest.fixture
def service():
    """Pre-loaded Mexico procurement service with sample data."""
    svc = MexicoProcurementService()
    svc._claves = SAMPLE_CLAVES
    svc._adjudicaciones = SAMPLE_ADJUDICACIONES
    svc._loaded = True
    return svc


# ── Basic state tests ─────────────────────────────────────────────────


def test_service_is_loaded(service):
    assert service.is_loaded is True
    assert service.clave_count == 4


def test_empty_service():
    svc = MexicoProcurementService()
    assert svc.is_loaded is False
    assert svc.clave_count == 0


# ── Clave search tests ───────────────────────────────────────────────


def test_search_by_substance(service):
    result = service.search_claves(query="pembrolizumab")
    assert result.total == 1
    assert result.results[0].clave == "010.000.6317.00"
    assert result.results[0].active_substance == "pembrolizumab"


def test_search_by_atc_prefix(service):
    result = service.search_claves(atc_code="L01")
    # pembrolizumab (L01FF02), imatinib (L01EA01), lenvatinib (L01EX08)
    assert result.total == 3
    substances = {r.active_substance for r in result.results}
    assert "pembrolizumab" in substances
    assert "imatinib" in substances
    assert "lenvatinib" in substances


def test_search_by_therapeutic_group(service):
    result = service.search_claves(therapeutic_group="Inmunología")
    assert result.total == 1
    assert result.results[0].active_substance == "adalimumab"


def test_search_by_source_type(service):
    result = service.search_claves(source_type="generico")
    assert result.total == 1
    assert result.results[0].active_substance == "imatinib"


def test_search_all(service):
    result = service.search_claves()
    assert result.total == 4


def test_search_no_results(service):
    result = service.search_claves(query="nonexistent_drug_xyz")
    assert result.total == 0


def test_search_enriches_latest_data(service):
    result = service.search_claves(query="pembrolizumab")
    c = result.results[0]
    assert c.latest_cycle == "2025-2026"
    assert c.latest_status == "adjudicada"
    assert c.latest_unit_price == 26890.00
    assert "IMSS" in c.institutions
    assert "ISSSTE" in c.institutions


def test_search_limit(service):
    result = service.search_claves(limit=2)
    assert result.total == 2


def test_search_cnis_only(service):
    result = service.search_claves(cnis_only=True)
    # lenvatinib has cnis_listed=False
    assert result.total == 3
    substances = {r.active_substance for r in result.results}
    assert "lenvatinib" not in substances


# ── Adjudicaciones tests ─────────────────────────────────────────────


def test_adjudicaciones_all(service):
    result = service.search_adjudicaciones()
    assert result.total == 7


def test_adjudicaciones_by_cycle(service):
    result = service.search_adjudicaciones(cycle="2025-2026")
    assert result.total == 5
    for r in result.results:
        assert r.cycle == "2025-2026"


def test_adjudicaciones_by_status(service):
    result = service.search_adjudicaciones(status="desierta")
    assert result.total == 2
    for r in result.results:
        assert r.status == "desierta"
        assert r.active_substance == "lenvatinib"


def test_adjudicaciones_by_institution(service):
    result = service.search_adjudicaciones(institution="ISSSTE")
    assert result.total == 1
    assert result.results[0].institution == "ISSSTE"


def test_adjudicaciones_by_substance(service):
    result = service.search_adjudicaciones(substance="adalimumab")
    assert result.total == 1


def test_adjudicaciones_summary(service):
    result = service.search_adjudicaciones(cycle="2025-2026")
    assert "total_claves" in result.summary
    assert result.summary["total_claves"] == 4
    assert result.summary["by_status"]["adjudicada"] == 4
    assert result.summary["by_status"]["desierta"] == 1
    assert result.summary["fulfillment_rate_pct"] > 0


def test_adjudicaciones_combined_filters(service):
    result = service.search_adjudicaciones(
        cycle="2025-2026",
        therapeutic_group="Oncología",
        source_type="patente",
    )
    assert result.total >= 1
    for r in result.results:
        assert r.cycle == "2025-2026"
        assert "Oncología" in r.therapeutic_group


# ── Price history tests ───────────────────────────────────────────────


def test_price_history_exists(service):
    result = service.get_price_history("010.000.6317.00")
    assert result is not None
    assert result.clave == "010.000.6317.00"
    assert result.active_substance == "pembrolizumab"
    assert len(result.entries) == 3  # 1 in 2023-2024 + 2 in 2025-2026


def test_price_history_not_found(service):
    result = service.get_price_history("999.999.9999.99")
    assert result is None


def test_price_history_change_pct(service):
    result = service.get_price_history("010.000.6317.00")
    # Price went from 28745.50 → 26890.00, so should be negative
    assert result.price_change_pct < 0


def test_price_history_sorted(service):
    result = service.get_price_history("010.000.6317.00")
    cycles = [e.cycle for e in result.entries]
    assert cycles == sorted(cycles)


def test_price_history_desierta(service):
    result = service.get_price_history("010.000.6430.00")
    assert result is not None
    assert len(result.entries) == 2
    # Both are desierta, price_change should be 0
    assert result.price_change_pct == 0.0


# ── Opportunities tests ──────────────────────────────────────────────


def test_opportunities(service):
    opps = service.get_opportunities()
    assert len(opps) == 2  # lenvatinib desierta in 2 cycles
    # Most recent cycle first, highest demand first
    assert opps[0].cycle == "2025-2026"
    assert opps[0].units_requested == 12000
    assert opps[1].cycle == "2023-2024"


def test_opportunities_limit(service):
    opps = service.get_opportunities(limit=1)
    assert len(opps) == 1


# ── Filter options tests ─────────────────────────────────────────────


def test_filter_options(service):
    opts = service.get_filter_options()
    assert "2023-2024" in opts.cycles
    assert "2025-2026" in opts.cycles
    assert "Oncología" in opts.therapeutic_groups
    assert "IMSS" in opts.institutions
    assert "adjudicada" in opts.statuses
    assert "desierta" in opts.statuses
    assert "patente" in opts.source_types
    assert "generico" in opts.source_types


# ── File loading tests ────────────────────────────────────────────────


def test_load_from_missing_file():
    svc = MexicoProcurementService()
    result = svc.load_from_file("/tmp/nonexistent_mexico_data.json")
    assert result is False
    assert svc.is_loaded is False


def test_load_from_real_data_file():
    """Test loading the actual seed data file."""
    from pathlib import Path

    svc = MexicoProcurementService()
    data_file = Path(__file__).parent.parent / "data" / "mexico_procurement.json"
    if data_file.exists():
        result = svc.load_from_file(data_file)
        assert result is True
        assert svc.is_loaded is True
        assert svc.clave_count > 0


# ── Clave detail tests ──────────────────────────────────────────────


def test_clave_detail_found(service):
    detail = service.get_clave_detail("010.000.6317.00")
    assert detail is not None
    assert detail.clave == "010.000.6317.00"
    assert detail.active_substance == "pembrolizumab"
    assert detail.therapeutic_group == "Oncología"
    assert detail.source_type == "patente"


def test_clave_detail_not_found(service):
    detail = service.get_clave_detail("999.999.9999.99")
    assert detail is None


def test_clave_detail_molecule_info(service):
    detail = service.get_clave_detail("010.000.6317.00")
    assert detail.indication == "Melanoma, NSCLC, head and neck carcinoma"
    assert detail.mechanism_of_action == "Anti-PD-1 monoclonal antibody"
    assert detail.patent_holder == "Merck Sharp & Dohme (MSD)"
    assert detail.patent_expiry == "2028-10"


def test_clave_detail_adjudicaciones(service):
    detail = service.get_clave_detail("010.000.6317.00")
    assert len(detail.adjudicaciones) == 3  # 2023-2024 IMSS + 2025-2026 IMSS + ISSSTE
    institutions = {a.institution for a in detail.adjudicaciones}
    assert "IMSS" in institutions
    assert "ISSSTE" in institutions


def test_clave_detail_price_history(service):
    detail = service.get_clave_detail("010.000.6317.00")
    assert detail.price_history is not None
    assert len(detail.price_history.entries) == 3
    assert detail.price_history.price_change_pct < 0  # price dropped


def test_clave_detail_negotiation_context(service):
    detail = service.get_clave_detail("010.000.6317.00")
    # The 2025-2026 IMSS record has negotiation context
    imss_2025 = [a for a in detail.adjudicaciones
                 if a.cycle == "2025-2026" and a.institution == "IMSS"]
    assert len(imss_2025) == 1
    assert imss_2025[0].negotiation_type == "mesa_patente"
    assert "6.5%" in imss_2025[0].negotiation_notes


def test_clave_detail_competitor_bids(service):
    detail = service.get_clave_detail("010.000.5820.00")
    # Adalimumab 2025-2026 has competitor bids
    adj = detail.adjudicaciones[0]
    assert len(adj.competitor_bids) == 3
    awarded = [b for b in adj.competitor_bids if b.outcome == "awarded"]
    assert len(awarded) == 1
    assert awarded[0].supplier == "Laboratorios PiSA"
    rejected = [b for b in adj.competitor_bids if b.outcome == "rejected"]
    assert len(rejected) == 1
    assert rejected[0].supplier == "AbbVie México"


def test_clave_detail_same_substance_empty(service):
    """Only one clave per substance in sample data, so same_substance should be empty."""
    detail = service.get_clave_detail("010.000.6317.00")
    assert detail.same_substance_claves == []


# ── Institution breakdown tests ─────────────────────────────────────


def test_institution_breakdown_all(service):
    breakdown = service.get_institution_breakdown()
    assert len(breakdown) == 2  # IMSS and ISSSTE
    inst_names = {b.institution for b in breakdown}
    assert "IMSS" in inst_names
    assert "ISSSTE" in inst_names


def test_institution_breakdown_by_cycle(service):
    breakdown = service.get_institution_breakdown(cycle="2025-2026")
    assert len(breakdown) >= 1
    # IMSS should be the largest by spend
    assert breakdown[0].institution == "IMSS"
    assert breakdown[0].total_spend_mxn > 0


def test_institution_breakdown_imss_stats(service):
    breakdown = service.get_institution_breakdown()
    imss = [b for b in breakdown if b.institution == "IMSS"][0]
    assert imss.total_claves >= 3
    assert imss.adjudicadas >= 3
    assert imss.desiertas >= 1
    assert imss.fulfillment_rate_pct > 0
    assert imss.total_spend_mxn > 0


def test_institution_breakdown_top_groups(service):
    breakdown = service.get_institution_breakdown()
    imss = [b for b in breakdown if b.institution == "IMSS"][0]
    assert len(imss.top_therapeutic_groups) >= 1
    # Oncología should be a top group
    group_names = {g["group"] for g in imss.top_therapeutic_groups}
    assert "Oncología" in group_names


def test_institution_breakdown_top_suppliers(service):
    breakdown = service.get_institution_breakdown()
    imss = [b for b in breakdown if b.institution == "IMSS"][0]
    assert len(imss.top_suppliers) >= 1


def test_institution_breakdown_empty_cycle(service):
    breakdown = service.get_institution_breakdown(cycle="2099-2100")
    assert len(breakdown) == 0


# ── Negotiation context tests ───────────────────────────────────────


def test_adjudicacion_negotiation_type(service):
    result = service.search_adjudicaciones(substance="pembrolizumab", cycle="2025-2026")
    # At least the IMSS record has negotiation_type
    types = {r.negotiation_type for r in result.results if r.negotiation_type}
    assert "mesa_patente" in types


def test_adjudicacion_negotiation_notes(service):
    result = service.search_adjudicaciones(status="desierta")
    # Desierta lenvatinib records have notes
    for r in result.results:
        assert r.negotiation_notes  # all desierta in sample have notes


def test_adjudicacion_competitor_bids_in_search(service):
    result = service.search_adjudicaciones(substance="adalimumab")
    assert result.total == 1
    adj = result.results[0]
    assert len(adj.competitor_bids) == 3


# ── Price history with institution ──────────────────────────────────


def test_price_history_institution_field(service):
    result = service.get_price_history("010.000.6317.00")
    institutions = {e.institution for e in result.entries}
    assert "IMSS" in institutions
    assert "ISSSTE" in institutions


# ── Molecule info in search results ─────────────────────────────────


def test_search_includes_molecule_info(service):
    result = service.search_claves(query="pembrolizumab")
    c = result.results[0]
    assert c.indication == "Melanoma, NSCLC, head and neck carcinoma"
    assert c.mechanism_of_action == "Anti-PD-1 monoclonal antibody"
    assert c.patent_holder == "Merck Sharp & Dohme (MSD)"
    assert c.patent_expiry == "2028-10"
