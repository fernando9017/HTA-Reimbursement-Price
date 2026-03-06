"""AI-powered analysis of Spanish AEMPS IPT (Informe de Posicionamiento Terapéutico) reports.

Uses Claude Sonnet to generate structured English analyses from
the raw AEMPS IPT data (therapeutic positioning, title, reference).

Requires ANTHROPIC_API_KEY environment variable to be set.
"""

import hashlib
import json
import logging
import os
from pathlib import Path

import anthropic

from app.models import AEMPSAssessmentAnalysis

logger = logging.getLogger(__name__)

_analysis_cache: dict[str, AEMPSAssessmentAnalysis] = {}

CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "ai_cache_spain"


def clear_cache() -> int:
    """Clear all cached AI analyses (memory and disk) for Spain AEMPS."""
    count = len(_analysis_cache)
    _analysis_cache.clear()
    if CACHE_DIR.exists():
        for f in CACHE_DIR.glob("*.json"):
            try:
                f.unlink()
                count += 1
            except OSError:
                pass
    logger.info("Cleared %d AI analysis cache entries (Spain)", count)
    return count

AI_MODEL = "claude-sonnet-4-5-20241022"

SYSTEM_PROMPT = """\
You are a senior HTA (Health Technology Assessment) analyst specializing in \
Spanish pharmaceutical market access, AEMPS (Agencia Española de Medicamentos \
y Productos Sanitarios) therapeutic positioning reports (IPTs), and the \
Bifimed reimbursement system. You analyze IPT data and produce structured, \
clear English-language summaries for pharmaceutical market access professionals.

Your analysis must be factual, balanced, and based solely on the provided data. \
Do not speculate or add information not present in the input.

## Spanish Healthcare System & AEMPS Process — Background

### How the Spanish HTA process works
Spain has a multi-step process for drug pricing and reimbursement:

1. **EMA approval** → drug is authorized for the EU market.
2. **AEMPS IPT (Informe de Posicionamiento Terapéutico)** → AEMPS, in \
collaboration with the GENESIS network of hospital pharmacists, produces \
a therapeutic positioning report that evaluates the drug's place in therapy \
relative to existing alternatives. The IPT is NOT a formal reimbursement \
decision but provides critical input.
3. **CIPM (Comisión Interministerial de Precios de Medicamentos)** → sets \
the maximum industrial price based on the IPT and pharmacoeconomic data.
4. **Inclusion in Nomenclátor / Bifimed** → the drug is listed in the \
official reimbursement database (Bifimed = Base de datos de información \
de medicamentos financiados por el SNS).

### IPT Therapeutic Positioning Outcomes
- **Favorable**: Positive positioning — the drug is well-positioned vs. \
existing alternatives. Supports reimbursement.
- **Favorable with conditions (Condicionado)**: Conditional positive \
positioning — the drug is positioned favorably for specific subpopulations \
or with specific conditions of use.
- **Unfavorable (Desfavorable / No favorable)**: Negative positioning — the \
drug does not offer advantages over existing alternatives.

### Bifimed — The Official Reimbursement Database
Bifimed (Base de datos de información sobre medicamentos financiados por el \
SNS) is the Spanish national database of drugs financed by the Sistema \
Nacional de Salud (SNS — National Health System). Key points:
- A drug must be listed in Bifimed to be reimbursed by the SNS.
- Bifimed listing occurs AFTER the CIPM sets the price.
- A favorable IPT does NOT automatically guarantee Bifimed listing — the \
manufacturer must also agree on a price with the CIPM.
- Drugs NOT in Bifimed can still be prescribed but patients pay full cost.
- Hospital drugs follow a different pathway (SNS-funded hospitals purchase \
directly) but still require CIPM pricing.

### Key differences from other HTA systems
- IPTs are NOT legally binding — they are advisory positioning reports.
- The actual reimbursement decision is made by the CIPM (pricing) and \
subsequent Bifimed listing.
- Spain has regional autonomous communities (Comunidades Autónomas) that \
manage their own health budgets, leading to potential regional variation \
in actual access even after Bifimed listing.
- Spain uses reference pricing within therapeutic groups.
- The GENESIS network provides hospital-level evaluations that complement \
the national IPT."""

ANALYSIS_PROMPT_TEMPLATE = """\
Analyze this Spanish AEMPS IPT (Informe de Posicionamiento Terapéutico) \
and provide a structured English-language analysis.

## IPT Data

- **Reference**: {ipt_reference}
- **Title**: {title}
- **Therapeutic Positioning**: {positioning}
- **Published Date**: {published_date}

## Instructions

Produce a JSON response with this exact structure:
{{
  "overall_summary": "<2-3 sentence summary of the IPT and its implications>",
  "clinical_context": "<1-2 sentences about the disease context and unmet need>",
  "positioning_rationale": "<2-3 sentences explaining the therapeutic positioning outcome>",
  "comparator_context": "<1-2 sentences about the comparators likely considered>",
  "bifimed_implications": "<1-2 sentences about reimbursement / Bifimed context>",
  "market_implications": "<2-3 sentences about Spanish market access implications>",
  "clinical_evidence_text": "<paragraph about the clinical evidence basis — see rules below>",
  "evidence_limitations": ["<limitation 1>", "<limitation 2>"]
}}

CRITICAL rules for clinical_evidence_text:
- Base your analysis ONLY on what can be inferred from the IPT data provided.
- You may mention the likely pivotal trial name if you are highly confident, \
but NEVER fabricate specific numerical endpoint values.
- Describe the evidence qualitatively based on the positioning outcome.

CRITICAL rules for bifimed_implications:
- A favorable IPT is a NECESSARY but NOT SUFFICIENT condition for SNS \
reimbursement. The drug must still go through CIPM pricing negotiation \
and Bifimed listing.
- An unfavorable IPT makes reimbursement very unlikely but not impossible.
- Do NOT state definitively whether a drug is or is not in Bifimed unless \
this information is provided in the input data.

CRITICAL rules for market_implications:
- If "Favorable": note this supports the reimbursement pathway but CIPM \
pricing negotiation is still required. Mention the typical timeline from \
IPT to actual market access (often 6-18 months).
- If "Favorable with conditions": note the subpopulation restrictions and \
how they may limit the addressable patient population.
- If "Unfavorable": note this is a significant barrier. The drug is unlikely \
to be included in Bifimed without new evidence or re-evaluation.
- Mention the role of autonomous communities in actual access timelines.

Respond with ONLY the JSON object, no other text."""


def _cache_key(data: dict) -> str:
    serialized = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


def _load_from_disk_cache(key: str) -> AEMPSAssessmentAnalysis | None:
    cache_file = CACHE_DIR / f"{key}.json"
    if not cache_file.exists():
        return None
    try:
        with open(cache_file, encoding="utf-8") as f:
            data = json.load(f)
        analysis = AEMPSAssessmentAnalysis(**data)
        analysis.cached = True
        return analysis
    except Exception:
        logger.warning("Failed to load AI cache file: %s", cache_file)
        return None


def _save_to_disk_cache(key: str, analysis: AEMPSAssessmentAnalysis) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file = CACHE_DIR / f"{key}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(analysis.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception:
        logger.warning("Failed to save AI cache file for key: %s", key)


async def analyze_spain_ipt(
    ipt_reference: str,
    title: str,
    active_substance: str,
    positioning: str,
    published_date: str,
    assessment_url: str,
) -> AEMPSAssessmentAnalysis:
    """Generate an AI analysis of a Spanish AEMPS IPT report."""
    assessment_data = {
        "ipt_reference": ipt_reference,
        "active_substance": active_substance,
        "positioning": positioning,
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
        ipt_reference=ipt_reference,
        title=title,
        positioning=positioning,
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

    analysis = AEMPSAssessmentAnalysis(
        ipt_reference=ipt_reference,
        title=title,
        active_substance=active_substance,
        positioning=positioning,
        published_date=published_date,
        assessment_url=assessment_url,
        overall_summary=parsed.get("overall_summary", ""),
        clinical_context=parsed.get("clinical_context", ""),
        positioning_rationale=parsed.get("positioning_rationale", ""),
        comparator_context=parsed.get("comparator_context", ""),
        bifimed_implications=parsed.get("bifimed_implications", ""),
        market_implications=parsed.get("market_implications", ""),
        clinical_evidence_text=parsed.get("clinical_evidence_text", ""),
        evidence_limitations=parsed.get("evidence_limitations", []),
        ai_model=AI_MODEL,
        cached=False,
    )

    _analysis_cache[key] = analysis
    _save_to_disk_cache(key, analysis)

    return analysis
