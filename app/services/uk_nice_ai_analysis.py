"""AI-powered analysis of UK NICE technology appraisals.

Uses Claude Sonnet to generate structured English analyses from
NICE guidance data (recommendation, guidance type, title).

Requires ANTHROPIC_API_KEY environment variable to be set.
"""

import hashlib
import json
import logging
import os
from pathlib import Path

import anthropic

from app.models import NICEAssessmentAnalysis

logger = logging.getLogger(__name__)

_analysis_cache: dict[str, NICEAssessmentAnalysis] = {}

CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "ai_cache_uk"


def clear_cache() -> int:
    """Clear all cached AI analyses (memory and disk) for UK NICE."""
    count = len(_analysis_cache)
    _analysis_cache.clear()
    if CACHE_DIR.exists():
        for f in CACHE_DIR.glob("*.json"):
            try:
                f.unlink()
                count += 1
            except OSError:
                pass
    logger.info("Cleared %d AI analysis cache entries (UK)", count)
    return count

AI_MODEL = "claude-sonnet-4-5-20250929"

SYSTEM_PROMPT = """\
You are a senior HTA (Health Technology Assessment) analyst specializing in \
UK NICE (National Institute for Health and Care Excellence) technology \
appraisals. You analyze guidance data and produce structured, clear \
English-language summaries for pharmaceutical market access professionals.

Your analysis must be factual, balanced, and based solely on the provided data. \
Do not speculate or add information not present in the input.

## UK Healthcare System & NICE Process — Background

### How the NICE technology appraisal process works
NICE evaluates whether new treatments represent good value for money for the \
NHS. The Appraisal Committee reviews clinical and cost-effectiveness evidence \
submitted by the manufacturer and issues guidance.

### Types of guidance
- **Technology Appraisal (TA)**: Standard assessment for most new drugs. Uses \
ICER (Incremental Cost-Effectiveness Ratio) thresholds.
- **Highly Specialised Technology (HST)**: For treatments of very rare \
conditions (prevalence <1 in 50,000). Higher ICER thresholds apply.

### ICER thresholds
- Standard TA: £20,000-£30,000 per QALY gained. Above £30,000/QALY, \
increasingly strong justification needed.
- End-of-life criteria: If treatment extends life by ≥3 months for patients \
with <24 months life expectancy, threshold extends to ~£50,000/QALY.
- HST: Weighted QALY approach, thresholds up to £100,000-£300,000 per QALY \
depending on QALY gains and disease severity.

### Recommendation outcomes
- **Recommended**: Drug is recommended for use within the NHS. \
Commissioners must fund it within 90 days (statutory funding requirement).
- **Recommended with restrictions (Optimised)**: Recommended only for a \
subset of patients or with managed access arrangements.
- **Not recommended**: NICE does not recommend the drug. NHS commissioners \
are not obliged to fund it, though individual funding requests remain possible.
- **Only in research**: Drug should only be used in the context of research.
- **Terminated appraisal**: NICE decided not to proceed with the appraisal.

### Key differences from other HTA systems
- NICE recommendations are LEGALLY BINDING for the NHS in England.
- A positive recommendation triggers a statutory 90-day funding mandate.
- "Not recommended" is a strong access barrier — unlike Germany where all \
approved drugs are reimbursable regardless of HTA outcome.
- NICE uses explicit cost-effectiveness thresholds (ICER/QALY).
- Patient Access Schemes (PAS) and Commercial Access Agreements (CAA) are \
commonly used to bring the ICER within acceptable range."""

ANALYSIS_PROMPT_TEMPLATE = """\
Analyze this NICE (National Institute for Health and Care Excellence) \
technology appraisal and provide a structured English-language analysis.

## Guidance Data

- **Reference**: {guidance_reference}
- **Title**: {title}
- **Guidance Type**: {guidance_type}
- **Recommendation**: {recommendation}
- **Published Date**: {published_date}

## Instructions

Produce a JSON response with this exact structure:
{{
  "overall_summary": "<2-3 sentence summary of the NICE decision and its implications>",
  "clinical_context": "<1-2 sentences about the disease context and unmet need>",
  "recommendation_rationale": "<2-3 sentences explaining why NICE likely reached this recommendation>",
  "cost_effectiveness": "<1-2 sentences about likely ICER/QALY considerations>",
  "managed_access": "<describe any likely managed access arrangements, PAS, or CDF involvement — or empty string if not applicable>",
  "market_implications": "<2-3 sentences about NHS market access implications>",
  "clinical_evidence_text": "<paragraph about the clinical evidence basis — see rules below>",
  "evidence_limitations": ["<limitation 1>", "<limitation 2>"]
}}

CRITICAL rules for clinical_evidence_text:
- Base your analysis ONLY on what can be inferred from the guidance data provided.
- You may mention the likely pivotal trial name if you are highly confident, \
but NEVER fabricate specific numerical endpoint values.
- Describe the evidence qualitatively based on the recommendation outcome.

CRITICAL rules for cost_effectiveness:
- Do NOT fabricate specific ICER values or QALY gains.
- Describe general context: which ICER threshold likely applied, whether end-of-life \
criteria may have been relevant, whether a Patient Access Scheme was likely needed.

CRITICAL rules for market_implications:
- If "Recommended": emphasize the statutory 90-day NHS funding mandate. \
Commissioners MUST fund the drug. This is a strong positive market access signal.
- If "Recommended with restrictions": note the subpopulation limits and any \
managed access arrangements. Discuss potential impact on patient numbers.
- If "Not recommended": clearly state this is a significant market access \
barrier. NHS commissioners are NOT obliged to fund. Individual funding \
requests are possible but rare. The manufacturer may resubmit with new \
evidence or a revised Patient Access Scheme.
- Note whether a Cancer Drugs Fund (CDF) recommendation may have been involved.

Respond with ONLY the JSON object, no other text."""


def _cache_key(data: dict) -> str:
    serialized = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


def _load_from_disk_cache(key: str) -> NICEAssessmentAnalysis | None:
    cache_file = CACHE_DIR / f"{key}.json"
    if not cache_file.exists():
        return None
    try:
        with open(cache_file, encoding="utf-8") as f:
            data = json.load(f)
        analysis = NICEAssessmentAnalysis(**data)
        analysis.cached = True
        return analysis
    except Exception:
        logger.warning("Failed to load AI cache file: %s", cache_file)
        return None


def _save_to_disk_cache(key: str, analysis: NICEAssessmentAnalysis) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file = CACHE_DIR / f"{key}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(analysis.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception:
        logger.warning("Failed to save AI cache file for key: %s", key)


async def analyze_nice_guidance(
    guidance_reference: str,
    title: str,
    active_substance: str,
    guidance_type: str,
    recommendation: str,
    published_date: str,
    assessment_url: str,
) -> NICEAssessmentAnalysis:
    """Generate an AI analysis of a NICE technology appraisal."""
    assessment_data = {
        "guidance_reference": guidance_reference,
        "active_substance": active_substance,
        "recommendation": recommendation,
        "guidance_type": guidance_type,
    }
    key = _cache_key(assessment_data)

    if key in _analysis_cache:
        cached = _analysis_cache[key]
        cached.cached = True
        return cached

    disk_result = _load_from_disk_cache(key)
    if disk_result is not None:
        _analysis_cache[key] = disk_result
        return disk_result

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY environment variable is not set. "
            "Set it to enable AI-powered analysis."
        )

    user_prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        guidance_reference=guidance_reference,
        title=title,
        guidance_type=guidance_type,
        recommendation=recommendation,
        published_date=published_date,
    )

    client = anthropic.AsyncAnthropic(api_key=api_key)

    response = await client.messages.create(
        model=AI_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    response_text = response.content[0].text.strip()

    if response_text.startswith("```"):
        lines = response_text.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        response_text = "\n".join(lines)

    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError:
        logger.error("AI response was not valid JSON: %s", response_text[:500])
        raise RuntimeError("AI returned invalid JSON response")

    analysis = NICEAssessmentAnalysis(
        guidance_reference=guidance_reference,
        title=title,
        active_substance=active_substance,
        guidance_type=guidance_type,
        recommendation=recommendation,
        published_date=published_date,
        assessment_url=assessment_url,
        overall_summary=parsed.get("overall_summary", ""),
        clinical_context=parsed.get("clinical_context", ""),
        recommendation_rationale=parsed.get("recommendation_rationale", ""),
        cost_effectiveness=parsed.get("cost_effectiveness", ""),
        managed_access=parsed.get("managed_access", ""),
        market_implications=parsed.get("market_implications", ""),
        clinical_evidence_text=parsed.get("clinical_evidence_text", ""),
        evidence_limitations=parsed.get("evidence_limitations", []),
        ai_model=AI_MODEL,
        cached=False,
    )

    _analysis_cache[key] = analysis
    _save_to_disk_cache(key, analysis)

    return analysis
