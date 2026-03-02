"""Tests for the France HAS adapter using sample data."""

import json
import tempfile
from pathlib import Path

import pytest

from app.services.hta_agencies.france_has import (
    FranceHAS,
    _build_summary_en,
    _extract_indication,
    _format_date,
    _normalize_has_url,
    _substance_matches,
)


@pytest.fixture
def has_service():
    """Create a HAS adapter pre-loaded with sample BDPM data.

    Includes two CIS codes for pembrolizumab (different presentations)
    that share the same dossier codes, simulating the real BDPM behaviour
    where the same HAS opinion covers multiple presentations.
    """
    service = FranceHAS()

    # Sample medicines (CIS_bdpm.txt)
    service._medicines = {
        "60001234": "KEYTRUDA 25 mg/mL, solution à diluer pour perfusion",
        "60005678": "KEYTRUDA 50 mg, poudre pour solution à diluer pour perfusion",
        "61009876": "OPDIVO 10 mg/mL, solution pour perfusion",
        "62001111": "DOLIPRANE 500 mg, comprimé",
        # ADC variants for substance-matching tests
        "63001111": "ENHERTU 100 mg, poudre pour solution à diluer pour perfusion",
        "63002222": "KADCYLA 100 mg, poudre pour solution à diluer pour perfusion",
        "63003333": "HERCEPTIN 150 mg, poudre pour solution à diluer pour perfusion",
    }

    # Sample compositions (CIS_COMPO_bdpm.txt)
    service._compositions = {
        "60001234": ["pembrolizumab"],
        "60005678": ["pembrolizumab"],
        "61009876": ["nivolumab"],
        "62001111": ["paracétamol"],
        "63001111": ["trastuzumab deruxtecan"],
        "63002222": ["trastuzumab emtansine"],
        "63003333": ["trastuzumab"],
    }

    # Sample SMR data (CIS_HAS_SMR_bdpm.txt)
    # Note: CIS 60001234 and 60005678 share dossier codes (same assessment)
    service._smr = {
        "60001234": [
            {
                "dossier_code": "CT-15432",
                "motif": "Inscription (première évaluation)",
                "date": "2017-05-24",
                "value": "Important",
                "label": "Le service médical rendu par KEYTRUDA est important dans le mélanome.",
            },
            {
                "dossier_code": "CT-18765",
                "motif": "Extension d'indication",
                "date": "2020-11-18",
                "value": "Important",
                "label": "Le service médical rendu par KEYTRUDA est important dans le CBNPC.",
            },
        ],
        "60005678": [
            {
                "dossier_code": "CT-15432",
                "motif": "Inscription (première évaluation)",
                "date": "2017-05-24",
                "value": "Important",
                "label": "Le service médical rendu par KEYTRUDA est important dans le mélanome.",
            },
            {
                "dossier_code": "CT-18765",
                "motif": "Extension d'indication",
                "date": "2020-11-18",
                "value": "Important",
                "label": "Le service médical rendu par KEYTRUDA est important dans le CBNPC.",
            },
        ],
        "61009876": [
            {
                "dossier_code": "CT-16543",
                "motif": "Inscription (première évaluation)",
                "date": "2016-03-09",
                "value": "Important",
                "label": "Le service médical rendu par OPDIVO est important.",
            },
        ],
        "62001111": [
            {
                "dossier_code": "CT-10001",
                "motif": "Renouvellement d'inscription",
                "date": "2019-06-12",
                "value": "Important",
                "label": "Le service médical rendu par DOLIPRANE est important.",
            },
        ],
        "63003333": [
            {
                "dossier_code": "CT-19000",
                "motif": "Inscription (première évaluation)",
                "date": "2019-01-15",
                "value": "Important",
                "label": "Le service médical rendu par HERCEPTIN est important dans le cancer du sein.",
            },
        ],
    }

    # Sample ASMR data (CIS_HAS_ASMR_bdpm.txt)
    service._asmr = {
        "60001234": [
            {
                "dossier_code": "CT-15432",
                "motif": "Inscription (première évaluation)",
                "date": "2017-05-24",
                "value": "III",
                "label": "ASMR modérée dans le mélanome.",
            },
            {
                "dossier_code": "CT-18765",
                "motif": "Extension d'indication",
                "date": "2020-11-18",
                "value": "IV",
                "label": "ASMR mineure dans le CBNPC.",
            },
        ],
        "60005678": [
            {
                "dossier_code": "CT-15432",
                "motif": "Inscription (première évaluation)",
                "date": "2017-05-24",
                "value": "III",
                "label": "ASMR modérée dans le mélanome.",
            },
            {
                "dossier_code": "CT-18765",
                "motif": "Extension d'indication",
                "date": "2020-11-18",
                "value": "IV",
                "label": "ASMR mineure dans le CBNPC.",
            },
        ],
        "61009876": [
            {
                "dossier_code": "CT-16543",
                "motif": "Inscription (première évaluation)",
                "date": "2016-03-09",
                "value": "III",
                "label": "ASMR modérée.",
            },
        ],
        "62001111": [
            {
                "dossier_code": "CT-10001",
                "motif": "Renouvellement d'inscription",
                "date": "2019-06-12",
                "value": "V",
                "label": "Pas d'amélioration du service médical rendu.",
            },
        ],
    }

    # Sample CT links (HAS_LiensPageCT_bdpm.txt)
    service._ct_links = {
        "CT-15432": "https://www.has-sante.fr/jcms/c_example1/fr/keytruda-melanome",
        "CT-18765": "https://www.has-sante.fr/jcms/c_example2/fr/keytruda-cbnpc",
        "CT-16543": "https://www.has-sante.fr/jcms/c_example3/fr/opdivo-melanome",
        "CT-10001": "https://www.has-sante.fr/jcms/c_example4/fr/doliprane",
        "CT-19000": "https://www.has-sante.fr/jcms/c_example5/fr/herceptin-sein",
    }

    service._loaded = True
    return service


@pytest.mark.asyncio
async def test_search_by_substance(has_service):
    results = await has_service.search_assessments("pembrolizumab")
    assert len(results) >= 2
    # All results should be for Keytruda (pembrolizumab)
    for r in results:
        assert "KEYTRUDA" in r.product_name


@pytest.mark.asyncio
async def test_search_returns_smr_and_asmr(has_service):
    results = await has_service.search_assessments("pembrolizumab")
    # The first result (most recent) should have both SMR and ASMR
    recent = results[0]
    assert recent.smr_value != ""
    assert recent.asmr_value != ""


@pytest.mark.asyncio
async def test_search_by_product_name(has_service):
    results = await has_service.search_assessments("nivolumab", product_name="OPDIVO")
    assert len(results) >= 1
    assert "OPDIVO" in results[0].product_name


@pytest.mark.asyncio
async def test_search_returns_assessment_urls(has_service):
    results = await has_service.search_assessments("pembrolizumab")
    urls = [r.assessment_url for r in results if r.assessment_url]
    assert len(urls) >= 1
    assert all(url.startswith("https://") for url in urls)


@pytest.mark.asyncio
async def test_search_no_match(has_service):
    results = await has_service.search_assessments("nonexistentsubstance")
    assert len(results) == 0


@pytest.mark.asyncio
async def test_search_sorted_most_recent_first(has_service):
    results = await has_service.search_assessments("pembrolizumab")
    dates = [r.opinion_date for r in results]
    assert dates == sorted(dates, reverse=True)


@pytest.mark.asyncio
async def test_search_case_insensitive(has_service):
    results = await has_service.search_assessments("Pembrolizumab")
    assert len(results) >= 2


@pytest.mark.asyncio
async def test_product_name_search_alone(has_service):
    results = await has_service.search_assessments("irrelevant", product_name="DOLIPRANE")
    assert len(results) >= 1
    assert "DOLIPRANE" in results[0].product_name


@pytest.mark.asyncio
async def test_not_loaded():
    service = FranceHAS()
    results = await service.search_assessments("pembrolizumab")
    assert len(results) == 0


def test_country_info(has_service):
    info = has_service.get_country_info()
    assert info.code == "FR"
    assert info.name == "France"
    assert info.agency == "HAS"


def test_format_date():
    assert _format_date("20170524") == "2017-05-24"
    assert _format_date("2017-05-24") == "2017-05-24"
    assert _format_date("") == ""
    assert _format_date("invalid") == "invalid"


# ── File-based loading tests ──────────────────────────────────────────

def test_save_and_load_roundtrip(has_service):
    """save_to_file → load_from_file produces equivalent data for France HAS."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "FR.json"
        has_service.save_to_file(data_file)
        assert data_file.exists()

        fresh = FranceHAS()
        assert not fresh.is_loaded
        result = fresh.load_from_file(data_file)
        assert result is True
        assert fresh.is_loaded
        assert len(fresh._medicines) == len(has_service._medicines)
        assert dict(fresh._smr) == dict(has_service._smr)
        assert dict(fresh._asmr) == dict(has_service._asmr)
        assert fresh._ct_links == has_service._ct_links


def test_load_from_file_bad_file_returns_false():
    """load_from_file on a missing file returns False."""
    service = FranceHAS()
    assert service.load_from_file(Path("/nonexistent/FR.json")) is False
    assert not service.is_loaded


def test_load_from_file_invalid_envelope_returns_false():
    """load_from_file with wrong envelope structure returns False."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "FR.json"
        data_file.write_text(json.dumps({"data": ["not", "a", "dict"]}))
        service = FranceHAS()
        assert service.load_from_file(data_file) is False


def test_save_creates_envelope_metadata(has_service):
    """JSON file written by save_to_file contains expected envelope fields."""
    with tempfile.TemporaryDirectory() as tmp:
        data_file = Path(tmp) / "FR.json"
        has_service.save_to_file(data_file)
        payload = json.loads(data_file.read_text())
        assert payload["country"] == "FR"
        assert payload["agency"] == "HAS"
        assert "updated_at" in payload
        assert "record_count" in payload
        assert isinstance(payload["data"], dict)
        assert "medicines" in payload["data"]


# ── Deduplication tests ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_shared_dossier_deduplicates(has_service):
    """Multiple CIS codes sharing the same dossier+date produce one result."""
    # CIS 60001234 and 60005678 both have dossier CT-15432 / 2017-05-24
    results = await has_service.search_assessments("pembrolizumab")
    # Should get exactly 2 assessments (CT-15432 and CT-18765), not 4
    assert len(results) == 2
    dossier_codes = {r.dossier_code for r in results}
    assert dossier_codes == {"CT-15432", "CT-18765"}


# ── Substance matching tests ────────────────────────────────────────


def test_substance_matches_exact():
    assert _substance_matches("trastuzumab", "trastuzumab") is True


def test_substance_matches_rejects_adc():
    """'trastuzumab' should NOT match 'trastuzumab deruxtecan'."""
    assert _substance_matches("trastuzumab", "trastuzumab deruxtecan") is False
    assert _substance_matches("trastuzumab", "trastuzumab emtansine") is False


def test_substance_matches_comma_separated():
    """Should match when substance is one of comma-separated entries."""
    assert _substance_matches("trastuzumab", "pertuzumab, trastuzumab") is True


def test_substance_matches_case_insensitive_input():
    # The caller lowercases both inputs before calling
    assert _substance_matches("pembrolizumab", "pembrolizumab") is True


@pytest.mark.asyncio
async def test_search_does_not_match_adc(has_service):
    """Searching for 'trastuzumab' should only match HERCEPTIN, not ENHERTU/KADCYLA."""
    results = await has_service.search_assessments("trastuzumab")
    product_names = [r.product_name for r in results]
    assert any("HERCEPTIN" in n for n in product_names)
    assert not any("ENHERTU" in n for n in product_names)
    assert not any("KADCYLA" in n for n in product_names)


# ── Indication extraction tests ─────────────────────────────────────


def test_extract_indication_from_smr():
    indication = _extract_indication(
        "Le service médical rendu par KEYTRUDA est important dans le mélanome avancé.",
        "",
    )
    assert "mélanome avancé" in indication.lower()


def test_extract_indication_from_asmr():
    indication = _extract_indication(
        "",
        "ASMR modérée dans le cancer du sein.",
    )
    assert "cancer du sein" in indication.lower()


def test_extract_indication_skips_generic():
    """Generic descriptions like 'dans l'indication évaluée' should return empty."""
    indication = _extract_indication(
        "Le service médical rendu est important dans l'indication évaluée.",
        "",
    )
    assert indication == ""


def test_extract_indication_empty_labels():
    assert _extract_indication("", "") == ""


@pytest.mark.asyncio
async def test_search_results_include_indication(has_service):
    """Assessments with indication-bearing descriptions should populate indication."""
    results = await has_service.search_assessments("pembrolizumab")
    indications = [r.indication for r in results]
    # At least one should have an extracted indication
    assert any(ind for ind in indications)


# ── URL normalization tests ──────────────────────────────────────────


def test_normalize_has_url_http_to_https():
    url = _normalize_has_url("http://www.has-sante.fr/jcms/c_123456/fr/some-drug")
    assert url.startswith("https://")


def test_normalize_has_url_removes_portail():
    url = _normalize_has_url("http://www.has-sante.fr/portail/jcms/c_123456/some-drug")
    assert "/portail/" not in url
    assert "/jcms/c_123456/" in url


def test_normalize_has_url_adds_fr_locale():
    url = _normalize_has_url("https://www.has-sante.fr/jcms/c_123456/some-drug")
    assert "/fr/" in url


def test_normalize_has_url_preserves_existing_fr():
    url = _normalize_has_url("https://www.has-sante.fr/jcms/c_123456/fr/some-drug")
    # Should not add /fr/ again
    assert url.count("/fr/") == 1


def test_normalize_has_url_empty():
    assert _normalize_has_url("") == ""


# ── Enhanced indication extraction tests ───────────────────────────────


def test_extract_indication_chez_les_patients():
    """Pattern: 'chez les patients adultes atteints de [disease]'."""
    indication = _extract_indication(
        "Le SMR est important chez les patients adultes atteints de leucémie myéloïde chronique.",
        "",
    )
    assert "leucémie myéloïde chronique" in indication.lower()


def test_extract_indication_pour_le_traitement():
    """Pattern: 'pour le traitement du [disease]'."""
    indication = _extract_indication(
        "KEYTRUDA est indiqué pour le traitement du mélanome avancé non résécable.",
        "",
    )
    assert "mélanome avancé" in indication.lower()


def test_extract_indication_prefers_dans_over_chez():
    """'dans' pattern takes precedence when both are present."""
    indication = _extract_indication(
        "SMR important dans le cancer du poumon non à petites cellules.",
        "",
    )
    assert "cancer du poumon" in indication.lower()


def test_extract_indication_asmr_fallback():
    """Falls back to ASMR label when SMR has no indication."""
    indication = _extract_indication(
        "Le service médical rendu est important.",
        "ASMR modérée dans le cancer du sein HER2-positif.",
    )
    assert "cancer du sein" in indication.lower()


# ── Summary builder tests ──────────────────────────────────────────────


def test_build_summary_includes_indication():
    summary = _build_summary_en("Important", "III", "Inscription", "Le mélanome avancé")
    assert "Indication: Le mélanome avancé" in summary
    assert "SMR: Major clinical benefit" in summary
    assert "ASMR III: Moderate therapeutic improvement" in summary


def test_build_summary_without_indication():
    summary = _build_summary_en("Insuffisant", "V", "Renouvellement")
    assert "Indication:" not in summary
    assert "SMR: Insufficient clinical benefit" in summary


@pytest.mark.asyncio
async def test_search_results_summary_includes_indication(has_service):
    """Assessments with extracted indication should include it in summary_en."""
    results = await has_service.search_assessments("pembrolizumab")
    # The melanoma assessment has indication "le mélanome" extractable
    melanoma_results = [r for r in results if r.dossier_code == "CT-15432"]
    assert len(melanoma_results) == 1
    assert "Indication:" in melanoma_results[0].summary_en
