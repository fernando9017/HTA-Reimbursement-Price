"""Tests for the AI analysis service (with mocked Anthropic API)."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import GBAAssessmentAnalysis
from app.services.ai_analysis import (
    _build_subpopulations_text,
    _cache_key,
    _analysis_cache,
    analyze_assessment,
)


# ── Helper unit tests ────────────────────────────────────────────────


def test_build_subpopulations_text_single():
    """Should format a single subpopulation."""
    subpops = [{
        "patient_group": "Adults with advanced melanoma",
        "benefit_rating": "erheblich",
        "evidence_level": "Beleg",
        "comparator": "Ipilimumab",
    }]
    text = _build_subpopulations_text(subpops)
    assert "Subpopulation 1" in text
    assert "Adults with advanced melanoma" in text
    assert "erheblich" in text
    assert "Beleg" in text
    assert "Ipilimumab" in text


def test_build_subpopulations_text_multiple():
    """Should format multiple subpopulations."""
    subpops = [
        {"patient_group": "Group A", "benefit_rating": "gering"},
        {"patient_group": "Group B", "benefit_rating": "beträchtlich"},
    ]
    text = _build_subpopulations_text(subpops)
    assert "Subpopulation 1" in text
    assert "Subpopulation 2" in text
    assert "Group A" in text
    assert "Group B" in text


def test_build_subpopulations_text_empty():
    """Empty list should return fallback message."""
    text = _build_subpopulations_text([])
    assert "No subpopulation data" in text


def test_cache_key_deterministic():
    """Same input should produce the same cache key."""
    data = {"decision_id": "D-100", "active_substance": "TestDrug"}
    key1 = _cache_key(data)
    key2 = _cache_key(data)
    assert key1 == key2
    assert len(key1) == 16


def test_cache_key_differs_for_different_input():
    """Different inputs should produce different cache keys."""
    key1 = _cache_key({"decision_id": "D-100"})
    key2 = _cache_key({"decision_id": "D-200"})
    assert key1 != key2


# ── Mocked API call tests ────────────────────────────────────────────

MOCK_AI_RESPONSE = json.dumps({
    "subpopulation_analyses": [
        {
            "patient_group": "Adults with unresectable melanoma without BRAF mutation",
            "line_of_therapy": "First-line",
            "indication_detail": "Advanced melanoma, BRAF wild-type",
            "outcome_en": "Major added benefit (Proof)",
            "comparator": "Nivolumab",
            "positive_arguments": [
                "Significant OS improvement",
                "Manageable safety profile",
            ],
            "negative_arguments": [
                "Limited long-term follow-up data",
            ],
            "key_trials": ["KEYNOTE-006"],
        }
    ],
    "overall_summary": "Pembrolizumab demonstrated major added benefit for advanced melanoma.",
    "clinical_context": "Advanced melanoma has limited treatment options.",
    "market_implications": "Favorable pricing position due to major benefit rating.",
})


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the in-memory cache before each test."""
    _analysis_cache.clear()
    yield
    _analysis_cache.clear()


@pytest.mark.asyncio
async def test_analyze_assessment_no_api_key():
    """Should raise RuntimeError when ANTHROPIC_API_KEY is not set."""
    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False):
        with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
            await analyze_assessment(
                decision_id="D-100",
                trade_name="Keytruda",
                active_substance="Pembrolizumab",
                indication="Melanoma",
                decision_date="2023-11-02",
                assessment_url="https://example.com",
                subpopulations=[{"patient_group": "Adults", "benefit_rating": "erheblich"}],
            )


@pytest.mark.asyncio
async def test_analyze_assessment_success():
    """Should call the API and return a structured analysis."""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=MOCK_AI_RESPONSE)]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False):
        with patch("app.services.ai_analysis.anthropic") as mock_anthropic:
            mock_anthropic.AsyncAnthropic.return_value = mock_client

            # Also patch disk cache to avoid file I/O
            with patch("app.services.ai_analysis._load_from_disk_cache", return_value=None):
                with patch("app.services.ai_analysis._save_to_disk_cache"):
                    result = await analyze_assessment(
                        decision_id="D-100",
                        trade_name="Keytruda",
                        active_substance="Pembrolizumab",
                        indication="Melanoma",
                        decision_date="2023-11-02",
                        assessment_url="https://example.com",
                        subpopulations=[{
                            "patient_group": "Adults without BRAF mutation",
                            "benefit_rating": "erheblich",
                            "evidence_level": "Beleg",
                            "comparator": "Nivolumab",
                        }],
                    )

    assert isinstance(result, GBAAssessmentAnalysis)
    assert result.decision_id == "D-100"
    assert result.active_substance == "Pembrolizumab"
    assert result.overall_summary != ""
    assert len(result.subpopulation_analyses) == 1
    sub = result.subpopulation_analyses[0]
    assert sub.line_of_therapy == "First-line"
    assert len(sub.positive_arguments) == 2
    assert len(sub.negative_arguments) == 1
    assert "KEYNOTE-006" in sub.key_trials
    assert result.cached is False


@pytest.mark.asyncio
async def test_analyze_assessment_memory_cache():
    """Second call with same input should return cached result."""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=MOCK_AI_RESPONSE)]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    call_args = dict(
        decision_id="D-200",
        trade_name="Keytruda",
        active_substance="Pembrolizumab",
        indication="Melanoma",
        decision_date="2023-11-02",
        assessment_url="https://example.com",
        subpopulations=[{
            "patient_group": "Adults",
            "benefit_rating": "erheblich",
        }],
    )

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False):
        with patch("app.services.ai_analysis.anthropic") as mock_anthropic:
            mock_anthropic.AsyncAnthropic.return_value = mock_client
            with patch("app.services.ai_analysis._load_from_disk_cache", return_value=None):
                with patch("app.services.ai_analysis._save_to_disk_cache"):
                    result1 = await analyze_assessment(**call_args)
                    result2 = await analyze_assessment(**call_args)

    # API should only be called once (second call hits cache)
    assert mock_client.messages.create.call_count == 1
    assert result2.cached is True


@pytest.mark.asyncio
async def test_analyze_assessment_json_in_code_fence():
    """Should handle JSON wrapped in markdown code fences."""
    fenced_response = f"```json\n{MOCK_AI_RESPONSE}\n```"
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=fenced_response)]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False):
        with patch("app.services.ai_analysis.anthropic") as mock_anthropic:
            mock_anthropic.AsyncAnthropic.return_value = mock_client
            with patch("app.services.ai_analysis._load_from_disk_cache", return_value=None):
                with patch("app.services.ai_analysis._save_to_disk_cache"):
                    result = await analyze_assessment(
                        decision_id="D-300",
                        trade_name="Keytruda",
                        active_substance="Pembrolizumab",
                        indication="Melanoma",
                        decision_date="2023-11-02",
                        assessment_url="https://example.com",
                        subpopulations=[],
                    )

    assert result.overall_summary != ""


@pytest.mark.asyncio
async def test_analyze_assessment_invalid_json():
    """Should raise RuntimeError for invalid JSON response."""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="This is not valid JSON at all")]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False):
        with patch("app.services.ai_analysis.anthropic") as mock_anthropic:
            mock_anthropic.AsyncAnthropic.return_value = mock_client
            with patch("app.services.ai_analysis._load_from_disk_cache", return_value=None):
                with pytest.raises(RuntimeError, match="invalid JSON"):
                    await analyze_assessment(
                        decision_id="D-400",
                        trade_name="Test",
                        active_substance="Test",
                        indication="Test",
                        decision_date="2024-01-01",
                        assessment_url="",
                        subpopulations=[],
                    )
