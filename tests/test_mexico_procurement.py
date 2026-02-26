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
        "max_reference_price": 32500.00,
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
        "max_reference_price": 30000.00,
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
        "max_reference_price": 30000.00,
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
        "max_reference_price": 250.00,
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
        "max_reference_price": 3500.00,
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
        "max_reference_price": 18500.00,
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
        "max_reference_price": 17800.00,
        "institution": "IMSS",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
        "negotiation_type": "mesa_patente",
        "negotiation_notes": "Price disagreement persists. Eisai declined to participate.",
    },
    # ── 2027-2028 en_proceso records ──
    {
        "clave": "010.000.6317.00",
        "description": "PEMBROLIZUMAB 100 mg",
        "active_substance": "pembrolizumab",
        "cycle": "2027-2028",
        "status": "en_proceso",
        "supplier": "",
        "units_requested": 120000,
        "units_awarded": 0,
        "unit_price": 0.0,
        "total_amount": 0.0,
        "max_reference_price": 28500.00,
        "institution": "IMSS",
        "therapeutic_group": "Oncología",
        "source_type": "patente",
        "negotiation_type": "mesa_patente",
        "negotiation_notes": "Negotiations ongoing. Expected to close Q2 2027.",
    },
    {
        "clave": "010.000.5820.00",
        "description": "ADALIMUMAB 40 mg",
        "active_substance": "adalimumab",
        "cycle": "2027-2028",
        "status": "en_proceso",
        "supplier": "",
        "units_requested": 220000,
        "units_awarded": 0,
        "unit_price": 0.0,
        "total_amount": 0.0,
        "max_reference_price": 3200.00,
        "institution": "IMSS",
        "therapeutic_group": "Inmunología y Reumatología",
        "source_type": "biotecnologico",
        "negotiation_type": "licitacion_publica",
        "negotiation_notes": "Open tender for biosimilars. Multiple bidders expected.",
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
    assert c.latest_cycle == "2027-2028"
    assert c.latest_status == "en_proceso"
    # Latest awarded price comes from 2025-2026
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
    assert result.total == 9  # 7 original + 2 en_proceso for 2027-2028


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
    assert result.total == 2  # 2025-2026 adjudicada + 2027-2028 en_proceso


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
    assert len(result.entries) == 4  # 1 in 2023-2024 + 2 in 2025-2026 + 1 en_proceso 2027-2028


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
    assert len(result.entries) == 2  # desierta in 2023-2024 and 2025-2026
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
    assert "2027-2028" in opts.cycles
    assert "Oncología" in opts.therapeutic_groups
    assert "IMSS" in opts.institutions
    assert "adjudicada" in opts.statuses
    assert "desierta" in opts.statuses
    assert "en_proceso" in opts.statuses
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
    assert len(detail.adjudicaciones) == 4  # 2023-2024 IMSS + 2025-2026 IMSS + ISSSTE + 2027-2028 IMSS
    institutions = {a.institution for a in detail.adjudicaciones}
    assert "IMSS" in institutions
    assert "ISSSTE" in institutions


def test_clave_detail_price_history(service):
    detail = service.get_clave_detail("010.000.6317.00")
    assert detail.price_history is not None
    assert len(detail.price_history.entries) == 4  # includes 2027-2028 en_proceso
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
    assert result.total == 2  # 2025-2026 + 2027-2028
    adj = result.results[0]  # First is 2025-2026 with bids
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


# ── Maximum reference price tests ─────────────────────────────────────


def test_adjudicacion_max_reference_price(service):
    result = service.search_adjudicaciones(substance="pembrolizumab", cycle="2025-2026")
    for r in result.results:
        assert r.max_reference_price == 30000.00


def test_price_history_includes_reference_price(service):
    result = service.get_price_history("010.000.6317.00")
    # All entries should have a reference price
    for e in result.entries:
        assert e.max_reference_price > 0


def test_clave_detail_reference_price(service):
    detail = service.get_clave_detail("010.000.5820.00")
    # Adalimumab adjudicaciones should include reference prices
    for a in detail.adjudicaciones:
        assert a.max_reference_price > 0


def test_reference_price_desierta(service):
    """Even desierta records should have a reference price (BIRMEX ceiling)."""
    result = service.search_adjudicaciones(status="desierta")
    for r in result.results:
        assert r.max_reference_price > 0


# ── 2027-2028 cycle tests ─────────────────────────────────────────────


def test_2027_2028_cycle_exists(service):
    result = service.search_adjudicaciones(cycle="2027-2028")
    assert result.total == 2  # pembrolizumab + adalimumab
    for r in result.results:
        assert r.status == "en_proceso"


def test_2027_2028_en_proceso_no_awards(service):
    result = service.search_adjudicaciones(cycle="2027-2028")
    for r in result.results:
        assert r.units_awarded == 0
        assert r.unit_price == 0.0
        assert r.supplier == ""


def test_2027_2028_has_reference_price(service):
    result = service.search_adjudicaciones(cycle="2027-2028")
    for r in result.results:
        assert r.max_reference_price > 0


def test_2027_2028_has_negotiation_notes(service):
    result = service.search_adjudicaciones(cycle="2027-2028")
    for r in result.results:
        assert r.negotiation_notes  # all en_proceso should have notes


def test_institution_breakdown_includes_en_proceso(service):
    breakdown = service.get_institution_breakdown(cycle="2027-2028")
    assert len(breakdown) >= 1
    imss = [b for b in breakdown if b.institution == "IMSS"][0]
    assert imss.total_claves == 2
    # en_proceso does not count as adjudicada or desierta
    assert imss.adjudicadas == 0
    assert imss.desiertas == 0


# ── Expanded seed data tests (real data file) ──────────────────────────


@pytest.fixture
def full_service():
    """Service loaded from the real seed data file."""
    from pathlib import Path

    svc = MexicoProcurementService()
    data_file = Path(__file__).parent.parent / "data" / "mexico_procurement.json"
    if not data_file.exists():
        pytest.skip("Seed data file not available")
    svc.load_from_file(data_file)
    return svc


def test_full_data_clave_count(full_service):
    assert full_service.clave_count >= 77


def test_full_data_therapeutic_coverage(full_service):
    """All 19 therapeutic groups should be represented."""
    opts = full_service.get_filter_options()
    expected_groups = [
        "Oncología", "Inmunología y Reumatología", "Endocrinología",
        "Hematología", "Infectología", "Neurología", "Dermatología",
        "Cardiología", "Oftalmología", "Trasplantes", "Neumología",
        "Psiquiatría", "Gastroenterología", "Enfermedades Raras",
        "Antibióticos", "Dolor y Anestesia", "Esclerosis Múltiple",
        "Nefrología", "Vacunas",
    ]
    for group in expected_groups:
        assert group in opts.therapeutic_groups, f"Missing group: {group}"


def test_full_data_imss_bienestar(full_service):
    """IMSS-Bienestar should appear as an institution."""
    opts = full_service.get_filter_options()
    assert "IMSS-Bienestar" in opts.institutions


def test_full_data_four_institutions(full_service):
    opts = full_service.get_filter_options()
    for inst in ["IMSS", "ISSSTE", "PEMEX", "IMSS-Bienestar"]:
        assert inst in opts.institutions, f"Missing institution: {inst}"


def test_full_data_three_cycles(full_service):
    opts = full_service.get_filter_options()
    for cycle in ["2023-2024", "2025-2026", "2027-2028"]:
        assert cycle in opts.cycles, f"Missing cycle: {cycle}"


def test_full_data_ophthalmology(full_service):
    """Verify ophthalmology drugs are present."""
    result = full_service.search_claves(therapeutic_group="Oftalmología")
    assert result.total >= 2
    substances = {r.active_substance for r in result.results}
    assert "ranibizumab" in substances
    assert "aflibercept" in substances


def test_full_data_transplant(full_service):
    result = full_service.search_claves(therapeutic_group="Trasplantes")
    assert result.total >= 2
    substances = {r.active_substance for r in result.results}
    assert "tacrolimus" in substances


def test_full_data_psychiatry(full_service):
    result = full_service.search_claves(therapeutic_group="Psiquiatría")
    assert result.total >= 2
    substances = {r.active_substance for r in result.results}
    assert "clozapina" in substances
    assert "paliperidona palmitato" in substances


def test_full_data_gastro_high_volume(full_service):
    """Omeprazol should be highest-volume clave."""
    result = full_service.search_claves(query="omeprazol")
    assert result.total >= 1


def test_full_data_rare_diseases(full_service):
    result = full_service.search_claves(therapeutic_group="Enfermedades Raras")
    assert result.total >= 3
    substances = {r.active_substance for r in result.results}
    assert "eculizumab" in substances
    assert "imiglucerasa" in substances


def test_full_data_semaglutide(full_service):
    """Semaglutide (GLP-1) should be present in endocrinology."""
    result = full_service.search_claves(query="semaglutida")
    assert result.total >= 1
    c = result.results[0]
    assert c.therapeutic_group == "Endocrinología"
    assert c.source_type == "patente"


def test_full_data_imss_bienestar_breakdown(full_service):
    """IMSS-Bienestar should have procurement data in 2025-2026."""
    breakdown = full_service.get_institution_breakdown(cycle="2025-2026")
    inst_names = {b.institution for b in breakdown}
    assert "IMSS-Bienestar" in inst_names
    bienestar = [b for b in breakdown if b.institution == "IMSS-Bienestar"][0]
    assert bienestar.total_claves >= 5
    assert bienestar.total_spend_mxn > 0


def test_full_data_biosimilar_competition(full_service):
    """Bortezomib 2025-2026 should have competitor bids."""
    result = full_service.search_adjudicaciones(substance="bortezomib", cycle="2025-2026")
    assert result.total >= 1
    # IMSS record should have competitor bids
    imss_records = [r for r in result.results if r.institution == "IMSS"]
    assert len(imss_records) >= 1
    assert len(imss_records[0].competitor_bids) >= 3


def test_full_data_all_have_reference_prices(full_service):
    """Every adjudicacion in the dataset should have a max_reference_price."""
    result = full_service.search_adjudicaciones(limit=600)
    for r in result.results:
        assert r.max_reference_price > 0, (
            f"{r.clave} ({r.cycle}, {r.institution}) missing reference price"
        )


# ── New therapeutic area tests ────────────────────────────────────────


def test_full_data_nephrology(full_service):
    """Nephrology drugs (EPO, darbepoetin) should be present."""
    result = full_service.search_claves(therapeutic_group="Nefrología")
    assert result.total >= 2
    substances = {r.active_substance for r in result.results}
    assert "eritropoyetina alfa" in substances
    assert "darbepoetina alfa" in substances


def test_full_data_antibiotics(full_service):
    """Hospital antibiotics should be present."""
    result = full_service.search_claves(therapeutic_group="Antibióticos")
    assert result.total >= 4
    substances = {r.active_substance for r in result.results}
    assert "meropenem" in substances
    assert "vancomicina" in substances
    assert "ceftriaxona" in substances
    assert "piperacilina/tazobactam" in substances


def test_full_data_multiple_sclerosis(full_service):
    """MS drugs should be present."""
    result = full_service.search_claves(therapeutic_group="Esclerosis Múltiple")
    assert result.total >= 2
    substances = {r.active_substance for r in result.results}
    assert "ocrelizumab" in substances
    assert "fingolimod" in substances


def test_full_data_vaccines(full_service):
    """Influenza and pneumococcal vaccines should be present."""
    result = full_service.search_claves(therapeutic_group="Vacunas")
    assert result.total >= 2
    substances = {r.active_substance for r in result.results}
    assert "vacuna influenza" in substances
    assert "vacuna neumococo conjugada" in substances


def test_full_data_pain_anesthesia(full_service):
    """Pain and anesthesia drugs should be present."""
    result = full_service.search_claves(therapeutic_group="Dolor y Anestesia")
    assert result.total >= 3
    substances = {r.active_substance for r in result.results}
    assert "pregabalina" in substances
    assert "tramadol" in substances
    assert "propofol" in substances


def test_full_data_cardiovascular_high_volume(full_service):
    """High-volume cardiovascular generics should be included."""
    result = full_service.search_claves(therapeutic_group="Cardiología")
    assert result.total >= 6
    substances = {r.active_substance for r in result.results}
    assert "atorvastatina" in substances
    assert "losartán" in substances
    assert "amlodipino" in substances
    assert "enoxaparina" in substances


def test_full_data_oncology_expanded(full_service):
    """Oncology should include the expanded drug list."""
    result = full_service.search_claves(therapeutic_group="Oncología")
    assert result.total >= 20
    substances = {r.active_substance for r in result.results}
    for drug in ["enzalutamida", "abiraterona", "palbociclib", "daratumumab", "cetuximab"]:
        assert drug in substances, f"Missing oncology drug: {drug}"


def test_full_data_hematology_support(full_service):
    """Hematology support drugs (filgrastim, immunoglobulin, albumin)."""
    result = full_service.search_claves(therapeutic_group="Hematología")
    assert result.total >= 5
    substances = {r.active_substance for r in result.results}
    assert "filgrastim" in substances
    assert "inmunoglobulina humana" in substances
    assert "albúmina humana" in substances


def test_full_data_immunology_expanded(full_service):
    """Immunology should include tocilizumab and secukinumab."""
    result = full_service.search_claves(therapeutic_group="Inmunología y Reumatología")
    assert result.total >= 4
    substances = {r.active_substance for r in result.results}
    assert "tocilizumab" in substances
    assert "secukinumab" in substances


def test_full_data_endocrinology_expanded(full_service):
    """Endocrinology should include levothyroxine and empagliflozin."""
    result = full_service.search_claves(therapeutic_group="Endocrinología")
    assert result.total >= 7
    substances = {r.active_substance for r in result.results}
    assert "levotiroxina" in substances
    assert "empagliflozina" in substances


def test_full_data_infectology_tb(full_service):
    """TB fixed-dose combination should be in Infectología."""
    result = full_service.search_claves(therapeutic_group="Infectología")
    assert result.total >= 5
    substances = {r.active_substance for r in result.results}
    assert "isoniazida/rifampicina/pirazinamida/etambutol" in substances


def test_full_data_adjudicacion_count(full_service):
    """Total adjudicaciones should match the expanded dataset."""
    result = full_service.search_adjudicaciones(limit=600)
    assert result.total >= 560


def test_full_data_19_therapeutic_groups(full_service):
    """Verify exactly 19 therapeutic groups exist."""
    opts = full_service.get_filter_options()
    assert len(opts.therapeutic_groups) >= 19
