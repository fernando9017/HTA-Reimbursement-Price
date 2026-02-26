"""AI-powered analysis of G-BA HTA assessment documents.

Uses Claude Haiku to generate structured English analyses from
the raw G-BA decision data (indications, patient groups, benefit
ratings, evidence levels, and comparators).

Requires ANTHROPIC_API_KEY environment variable to be set.
Gracefully handles missing API key with informative error messages.
"""

import hashlib
import json
import logging
import os
from pathlib import Path

import anthropic

from app.models import GBAAssessmentAnalysis, GBASubpopAnalysis

logger = logging.getLogger(__name__)

# In-memory cache: hash(input) → analysis result
_analysis_cache: dict[str, GBAAssessmentAnalysis] = {}

# Disk cache directory
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "ai_cache"

AI_MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = """\
You are a senior HTA (Health Technology Assessment) analyst specializing in \
German G-BA AMNOG benefit assessments. You analyze assessment data and produce \
structured, clear English-language summaries for pharmaceutical market access \
professionals.

Your analysis must be factual, balanced, and based solely on the provided data. \
Do not speculate or add information not present in the input."""

ANALYSIS_PROMPT_TEMPLATE = """\
Analyze this G-BA (Gemeinsamer Bundesausschuss) AMNOG benefit assessment and \
provide a structured English-language analysis.

## Assessment Data

- **Drug**: {trade_name} ({active_substance})
- **Indication**: {indication}
- **Decision Date**: {decision_date}
- **Decision ID**: {decision_id}

### Subpopulation Assessments:
{subpopulations_text}

## Instructions

Produce a JSON response with this exact structure:
{{
  "subpopulation_analyses": [
    {{
      "patient_group": "<patient group description in English>",
      "line_of_therapy": "<e.g., First-line, Second-line, Post-CRT, Adjuvant>",
      "indication_detail": "<refined indication description in English>",
      "outcome_en": "<benefit outcome in English>",
      "comparator": "<comparator therapy>",
      "positive_arguments": ["<argument 1>", "<argument 2>", ...],
      "negative_arguments": ["<argument 1>", "<argument 2>", ...],
      "key_trials": ["<trial name if mentioned>"]
    }}
  ],
  "overall_summary": "<2-3 sentence English summary of the assessment>",
  "clinical_context": "<1-2 sentences about the disease context and unmet need>",
  "market_implications": "<1-2 sentences about pricing/market access implications>"
}}

Guidelines:
- Translate all German text to English
- For positive_arguments: focus on efficacy signals (OS, PFS improvements), \
favorable safety, QoL improvements
- For negative_arguments: focus on limitations (immature data, adverse events, \
QoL concerns, study design issues)
- For line_of_therapy: infer from the indication text (e.g., "Erstlinie" = First-line, \
"nach Chemotherapie" = Post-chemotherapy, "adjuvant" = Adjuvant)
- The benefit ratings translate as: erheblich = Major, beträchtlich = Considerable, \
gering = Minor, nicht quantifizierbar = Non-quantifiable, kein Zusatznutzen = None, \
geringerer Nutzen = Lesser
- Evidence levels: Beleg = Proof, Hinweis = Indication, Anhaltspunkt = Hint

Respond with ONLY the JSON object, no other text."""


def _build_subpopulations_text(subpopulations: list[dict]) -> str:
    """Build a text representation of subpopulations for the prompt."""
    parts = []
    for i, sub in enumerate(subpopulations, 1):
        part = f"\n**Subpopulation {i}:**\n"
        if sub.get("patient_group"):
            part += f"- Patient Group: {sub['patient_group']}\n"
        if sub.get("benefit_rating"):
            part += f"- Benefit Rating (Zusatznutzen): {sub['benefit_rating']}\n"
        if sub.get("evidence_level"):
            part += f"- Evidence Level (Aussagesicherheit): {sub['evidence_level']}\n"
        if sub.get("comparator"):
            part += f"- Comparator (zVT): {sub['comparator']}\n"
        parts.append(part)
    return "\n".join(parts) if parts else "No subpopulation data available."


def _cache_key(assessment_data: dict) -> str:
    """Generate a deterministic cache key from assessment data."""
    serialized = json.dumps(assessment_data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


def _load_from_disk_cache(key: str) -> GBAAssessmentAnalysis | None:
    """Try to load a cached analysis from disk."""
    cache_file = CACHE_DIR / f"{key}.json"
    if not cache_file.exists():
        return None
    try:
        with open(cache_file, encoding="utf-8") as f:
            data = json.load(f)
        analysis = GBAAssessmentAnalysis(**data)
        analysis.cached = True
        return analysis
    except Exception:
        logger.warning("Failed to load AI cache file: %s", cache_file)
        return None


def _save_to_disk_cache(key: str, analysis: GBAAssessmentAnalysis) -> None:
    """Persist an analysis result to disk cache."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file = CACHE_DIR / f"{key}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(analysis.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception:
        logger.warning("Failed to save AI cache file for key: %s", key)


async def analyze_assessment(
    decision_id: str,
    trade_name: str,
    active_substance: str,
    indication: str,
    decision_date: str,
    assessment_url: str,
    subpopulations: list[dict],
) -> GBAAssessmentAnalysis:
    """Generate an AI analysis of a G-BA assessment.

    Uses Claude Haiku for structured analysis. Results are cached
    both in memory and on disk.

    Args:
        decision_id: G-BA decision ID
        trade_name: Brand name(s)
        active_substance: INN
        indication: Therapeutic indication text
        decision_date: Decision date (YYYY-MM-DD)
        assessment_url: Link to G-BA assessment page
        subpopulations: List of dicts with patient_group, benefit_rating,
                       evidence_level, comparator

    Returns:
        GBAAssessmentAnalysis with structured analysis

    Raises:
        RuntimeError: If ANTHROPIC_API_KEY is not set
        Exception: If API call fails
    """
    # Build cache key from input data
    assessment_data = {
        "decision_id": decision_id,
        "active_substance": active_substance,
        "indication": indication,
        "subpopulations": subpopulations,
    }
    key = _cache_key(assessment_data)

    # Check memory cache
    if key in _analysis_cache:
        cached = _analysis_cache[key]
        cached.cached = True
        return cached

    # Check disk cache
    disk_result = _load_from_disk_cache(key)
    if disk_result is not None:
        _analysis_cache[key] = disk_result
        return disk_result

    # Verify API key
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY environment variable is not set. "
            "Set it to enable AI-powered analysis. "
            "Get a key at https://console.anthropic.com/"
        )

    # Build the prompt
    subpop_text = _build_subpopulations_text(subpopulations)
    user_prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        trade_name=trade_name,
        active_substance=active_substance,
        indication=indication,
        decision_date=decision_date,
        decision_id=decision_id,
        subpopulations_text=subpop_text,
    )

    # Call Claude Haiku
    client = anthropic.AsyncAnthropic(api_key=api_key)

    response = await client.messages.create(
        model=AI_MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # Parse the response
    response_text = response.content[0].text.strip()

    # Strip markdown code fences if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines)

    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError:
        logger.error("AI response was not valid JSON: %s", response_text[:500])
        raise RuntimeError("AI returned invalid JSON response")

    # Build the analysis result
    subpop_analyses = []
    for sp in parsed.get("subpopulation_analyses", []):
        subpop_analyses.append(GBASubpopAnalysis(
            patient_group=sp.get("patient_group", ""),
            line_of_therapy=sp.get("line_of_therapy", ""),
            indication_detail=sp.get("indication_detail", ""),
            outcome_en=sp.get("outcome_en", ""),
            comparator=sp.get("comparator", ""),
            positive_arguments=sp.get("positive_arguments", []),
            negative_arguments=sp.get("negative_arguments", []),
            key_trials=sp.get("key_trials", []),
        ))

    analysis = GBAAssessmentAnalysis(
        decision_id=decision_id,
        trade_name=trade_name,
        active_substance=active_substance,
        indication=indication,
        decision_date=decision_date,
        assessment_url=assessment_url,
        subpopulation_analyses=subpop_analyses,
        overall_summary=parsed.get("overall_summary", ""),
        clinical_context=parsed.get("clinical_context", ""),
        market_implications=parsed.get("market_implications", ""),
        ai_model=AI_MODEL,
        cached=False,
    )

    # Cache the result
    _analysis_cache[key] = analysis
    _save_to_disk_cache(key, analysis)

    return analysis
