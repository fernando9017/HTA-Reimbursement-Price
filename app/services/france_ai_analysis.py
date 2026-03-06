"""AI-powered analysis of French HAS CT assessment opinions.

Uses Claude Sonnet to generate structured English analyses from
the raw HAS/CT opinion data (SMR, ASMR, evaluation reason,
and description texts).

Requires ANTHROPIC_API_KEY environment variable to be set.
"""

import hashlib
import json
import logging
import os
from pathlib import Path

import anthropic

from app.models import (
    GBAClinicalEvidence,
    GBAClinicalTrial,
    GBAEfficacyEndpoint,
    HASAssessmentAnalysis,
)

logger = logging.getLogger(__name__)

# In-memory cache: hash(input) → analysis result
_analysis_cache: dict[str, HASAssessmentAnalysis] = {}

# Disk cache directory
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "ai_cache_france"


def clear_cache() -> int:
    """Clear all cached AI analyses (memory and disk) for France HAS."""
    count = len(_analysis_cache)
    _analysis_cache.clear()
    if CACHE_DIR.exists():
        for f in CACHE_DIR.glob("*.json"):
            try:
                f.unlink()
                count += 1
            except OSError:
                pass
    logger.info("Cleared %d AI analysis cache entries (France)", count)
    return count

AI_MODEL = "claude-3-5-sonnet-20241022"

SYSTEM_PROMPT = """\
You are a senior HTA (Health Technology Assessment) analyst specializing in \
French HAS (Haute Autorité de Santé) assessments and CT (Commission de la \
Transparence) opinions. You analyze assessment data and produce structured, \
clear English-language summaries for pharmaceutical market access professionals.

Your analysis must be factual, balanced, and based solely on the provided data. \
Do not speculate or add information not present in the input.

## French Healthcare System & HAS Process — Background

### How the French HTA process works
When a manufacturer seeks reimbursement for a new drug in France, it submits \
a dossier to the HAS. The Commission de la Transparence (CT) — a committee \
of clinicians and pharmacologists within HAS — evaluates the dossier and \
issues an opinion (avis) on two key dimensions:

1. **SMR (Service Médical Rendu)** — the absolute clinical benefit of the drug, \
considering: efficacy, safety, disease severity, availability of alternatives, \
and public health impact.
2. **ASMR (Amélioration du Service Médical Rendu)** — the incremental \
improvement vs. existing therapies (the comparator or standard of care).

Based on the CT opinion, two things happen:
- The **UNCAM (Union Nationale des Caisses d'Assurance Maladie)** decides \
the **reimbursement rate** based on the SMR level.
- The **CEPS (Comité Économique des Produits de Santé)** negotiates the \
drug's **price** with the manufacturer, primarily driven by the ASMR level.

### SMR (Service Médical Rendu) — What the levels mean
SMR rates the absolute clinical value of the drug on a 4-level scale:
- **Important**: High clinical benefit — the drug treats a serious condition \
with proven efficacy and an acceptable safety profile. Reimbursement rate: 65%.
- **Modéré (Moderate)**: Moderate clinical benefit. Reimbursement rate: 30%.
- **Faible (Low/Minor)**: Low clinical benefit. Reimbursement rate: 15%.
- **Insuffisant (Insufficient)**: Insufficient clinical benefit — the drug does \
not justify inclusion on the positive reimbursement list (liste des spécialités \
remboursables). The drug will NOT be reimbursed by statutory health insurance.

### CRITICAL: What "Insuffisant" means in France
IMPORTANT — Unlike Germany, France DOES have a positive list (liste des \
spécialités remboursables). An "Insuffisant" SMR rating means:
- The drug is NOT listed for reimbursement by Assurance Maladie (statutory \
health insurance).
- Patients must pay the full cost out-of-pocket or via supplementary insurance.
- The manufacturer cannot access the regulated reimbursed market.
- However, the drug may still be prescribed — physicians retain prescribing \
freedom, but the economic burden falls on the patient.

This is a KEY DIFFERENCE from Germany: in Germany, "kein Zusatznutzen" \
(no added benefit) does NOT affect access — all approved drugs are reimbursable. \
In France, "Insuffisant" SMR effectively blocks reimbursement.

### ASMR (Amélioration du Service Médical Rendu) — Improvement ratings
ASMR rates the incremental therapeutic improvement on a 5-level scale:
- **ASMR I (Majeure)**: Major therapeutic improvement — a breakthrough, \
e.g., first treatment for a previously untreatable condition. Very rare.
- **ASMR II (Importante)**: Important therapeutic improvement — substantial \
clinical advance vs. existing treatments.
- **ASMR III (Modérée)**: Moderate therapeutic improvement — clinically \
meaningful but less dramatic improvement.
- **ASMR IV (Mineure)**: Minor therapeutic improvement — a modest advantage \
in efficacy or safety.
- **ASMR V (Inexistante)**: No therapeutic improvement — equivalent to \
existing treatments. This is by far the most common outcome.

### ASMR and price negotiations with CEPS
The ASMR level is the PRIMARY driver of price negotiations:
- **ASMR I–III**: The manufacturer can negotiate a price premium. The higher \
the ASMR, the greater the pricing freedom. European reference pricing applies \
(price cannot exceed the average of prices in DE, UK, ES, IT).
- **ASMR IV**: Limited pricing flexibility. The price must be close to or \
below existing comparators. A modest premium may be accepted if justified \
by clinical value or cost-effectiveness data.
- **ASMR V**: The price must be equal to or lower than the comparator's \
price. If the drug offers no improvement, CEPS will require a price at or \
below the cost of the cheapest alternative. This is a very challenging \
pricing position.

### Evaluation motifs (reasons for assessment)
- **Inscription**: Initial registration — first evaluation for reimbursement.
- **Extension d'indication**: New indication — evaluation of an existing \
reimbursed drug for a new therapeutic indication.
- **Renouvellement**: Renewal — periodic re-evaluation (typically every 5 \
years) to confirm continued reimbursement.
- **Réévaluation**: Re-evaluation — triggered by new evidence, safety \
signals, or class-wide review.
- **Modification**: Modification to existing terms of reimbursement.

### Target population (population cible)
The CT opinion specifies the target population — the number of patients \
expected to benefit from the drug. This is important for budget impact \
analysis and CEPS negotiations.

### Key differences from Germany's AMNOG system
| Aspect | France (HAS) | Germany (G-BA) |
|--------|-------------|----------------|
| Access impact | Insuffisant SMR = NOT reimbursed | No added benefit = still reimbursed |
| Positive list | YES — drugs must be listed | NO — all approved drugs reimbursable |
| Price driver | ASMR level → CEPS negotiation | Zusatznutzen → GKV-SV negotiation |
| Comparator | CT-chosen comparator(s) | zVT (G-BA-chosen comparator) |
| Evidence levels | Not formally rated | Beleg/Hinweis/Anhaltspunkt |
| Re-evaluation | Every 5 years (renewal) | Time-limited, typically 1-3 years |"""

ANALYSIS_PROMPT_TEMPLATE = """\
Analyze this French HAS (Haute Autorité de Santé) CT (Commission de la \
Transparence) assessment and provide a structured English-language analysis.

## Assessment Data

- **Drug**: {trade_name} ({active_substance})
- **Evaluation Reason**: {evaluation_reason}
- **Opinion Date**: {opinion_date}
- **Dossier Code**: {dossier_code}
- **SMR**: {smr_value}
- **SMR Description**: {smr_description}
- **ASMR**: {asmr_value}
- **ASMR Description**: {asmr_description}

## Instructions

Produce a JSON response with this exact structure:
{{
  "overall_summary": "<2-3 sentence English summary of the assessment>",
  "clinical_context": "<1-2 sentences about the disease context and unmet need>",
  "smr_rationale": "<1-2 sentences explaining why this SMR level was assigned>",
  "asmr_rationale": "<1-2 sentences explaining why this ASMR level was assigned>",
  "target_population": "<describe the target population if inferable from the data>",
  "market_implications": "<2-3 sentences about pricing, reimbursement, and market access implications>",
  "clinical_evidence": {{
    "pivotal_trials": [
      {{
        "trial_name": "<trial name, e.g. KEYNOTE-189>",
        "nct_number": "<NCT number if known, or empty string>",
        "trial_design": "<e.g. Phase III, randomized, double-blind>",
        "enrollment": <total enrollment number or null if unknown>,
        "trial_comparator": "<comparator arm description>",
        "key_endpoints": [
          {{
            "name": "<endpoint name, e.g. Overall Survival>",
            "abbreviation": "<e.g. OS, PFS, ORR>",
            "treatment_result": "<e.g. 22.0 months>",
            "comparator_result": "<e.g. 10.6 months>",
            "effect_measure": "<e.g. HR, OR, RR>",
            "effect_value": "<e.g. 0.56>",
            "ci_95": "<e.g. 0.45-0.70>",
            "p_value": "<e.g. <0.001>",
            "statistically_significant": true
          }}
        ],
        "confidence": "<high, moderate, or low>"
      }}
    ],
    "indirect_comparisons": "<describe if indirect treatment comparisons were submitted, or empty string>",
    "subpopulation_analyses_note": "<describe if subgroup analyses were relevant, or empty string>",
    "evidence_limitations": ["<limitation 1>", "<limitation 2>"]
  }}
}}

Guidelines:
- Translate all French text to English
- The SMR levels translate as: Important = Major clinical benefit (65% reimbursement), \
Modéré = Moderate clinical benefit (30% reimbursement), \
Faible = Minor clinical benefit (15% reimbursement), \
Insuffisant = Insufficient clinical benefit (NOT reimbursed)
- The ASMR levels translate as: I = Major therapeutic improvement, \
II = Important therapeutic improvement, III = Moderate therapeutic improvement, \
IV = Minor therapeutic improvement, V = No therapeutic improvement
- Evaluation reasons: Inscription = Initial registration, \
Extension d'indication = Indication extension, \
Renouvellement = Renewal, Réévaluation = Re-evaluation, \
Modification = Modification

CRITICAL rules for clinical_evidence:
- Include the pivotal trial(s) that supported the HAS assessment outcome. \
Infer the trial name and key endpoints from the drug name, indication context, \
comparator, and your knowledge of major clinical trials.
- NEVER fabricate specific numerical values. If uncertain, use empty strings. \
Set confidence accordingly: "high", "moderate", or "low".
- Focus on the 3-5 most clinically relevant endpoints (OS, PFS, ORR, DFS, safety).

CRITICAL rules for market_implications:
- For drugs with SMR "Insuffisant": clearly state the drug will NOT be \
reimbursed by French statutory health insurance. This is a critical market \
access barrier — very different from Germany where all drugs are reimbursable.
- For drugs with ASMR V (no improvement): note that pricing will be anchored \
to comparator cost. CEPS will require a price at or below the cheapest \
alternative therapy. This severely limits pricing flexibility.
- For drugs with ASMR I-III: note the manufacturer can negotiate a price \
premium proportional to the ASMR level, subject to European reference pricing.
- For ASMR IV: note limited pricing flexibility — a modest premium may be \
possible but must be justified.
- For "Renouvellement" (renewal): note this is a periodic re-evaluation that \
may lead to downgrading of SMR/ASMR if new evidence or alternatives have emerged.

Respond with ONLY the JSON object, no other text."""


def _cache_key(assessment_data: dict) -> str:
    """Generate a deterministic cache key from assessment data."""
    serialized = json.dumps(assessment_data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]


def _load_from_disk_cache(key: str) -> HASAssessmentAnalysis | None:
    """Try to load a cached analysis from disk."""
    cache_file = CACHE_DIR / f"{key}.json"
    if not cache_file.exists():
        return None
    try:
        with open(cache_file, encoding="utf-8") as f:
            data = json.load(f)
        analysis = HASAssessmentAnalysis(**data)
        analysis.cached = True
        return analysis
    except Exception:
        logger.warning("Failed to load AI cache file: %s", cache_file)
        return None


def _save_to_disk_cache(key: str, analysis: HASAssessmentAnalysis) -> None:
    """Persist an analysis result to disk cache."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file = CACHE_DIR / f"{key}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(analysis.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception:
        logger.warning("Failed to save AI cache file for key: %s", key)


async def analyze_france_assessment(
    dossier_code: str,
    trade_name: str,
    active_substance: str,
    evaluation_reason: str,
    opinion_date: str,
    assessment_url: str,
    smr_value: str,
    smr_description: str,
    asmr_value: str,
    asmr_description: str,
) -> HASAssessmentAnalysis:
    """Generate an AI analysis of a French HAS assessment.

    Uses Claude Haiku for structured analysis. Results are cached
    both in memory and on disk.
    """
    # Build cache key from input data
    assessment_data = {
        "dossier_code": dossier_code,
        "active_substance": active_substance,
        "smr_value": smr_value,
        "asmr_value": asmr_value,
        "evaluation_reason": evaluation_reason,
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
    user_prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        trade_name=trade_name,
        active_substance=active_substance,
        evaluation_reason=evaluation_reason,
        opinion_date=opinion_date,
        dossier_code=dossier_code,
        smr_value=smr_value,
        smr_description=smr_description,
        asmr_value=asmr_value,
        asmr_description=asmr_description,
    )

    # Call Claude Haiku
    client = anthropic.AsyncAnthropic(api_key=api_key)

    response = await client.messages.create(
        model=AI_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # Parse the response
    response_text = response.content[0].text.strip()

    # Strip markdown code fences if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        response_text = "\n".join(lines)

    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError:
        logger.error("AI response was not valid JSON: %s", response_text[:500])
        raise RuntimeError("AI returned invalid JSON response")

    # Build clinical evidence
    clinical_evidence = None
    ce_raw = parsed.get("clinical_evidence")
    if ce_raw and isinstance(ce_raw, dict):
        trials = []
        for t in ce_raw.get("pivotal_trials", []):
            endpoints = []
            for ep in t.get("key_endpoints", []):
                endpoints.append(GBAEfficacyEndpoint(
                    name=ep.get("name", ""),
                    abbreviation=ep.get("abbreviation", ""),
                    treatment_result=ep.get("treatment_result", ""),
                    comparator_result=ep.get("comparator_result", ""),
                    effect_measure=ep.get("effect_measure", ""),
                    effect_value=ep.get("effect_value", ""),
                    ci_95=ep.get("ci_95", ""),
                    p_value=ep.get("p_value", ""),
                    statistically_significant=ep.get("statistically_significant"),
                ))
            trials.append(GBAClinicalTrial(
                trial_name=t.get("trial_name", ""),
                nct_number=t.get("nct_number", ""),
                trial_design=t.get("trial_design", ""),
                enrollment=t.get("enrollment"),
                trial_comparator=t.get("trial_comparator", ""),
                key_endpoints=endpoints,
                confidence=t.get("confidence", ""),
            ))
        clinical_evidence = GBAClinicalEvidence(
            pivotal_trials=trials,
            indirect_comparisons=ce_raw.get("indirect_comparisons", ""),
            subpopulation_analyses_note=ce_raw.get("subpopulation_analyses_note", ""),
            evidence_limitations=ce_raw.get("evidence_limitations", []),
        )

    analysis = HASAssessmentAnalysis(
        dossier_code=dossier_code,
        trade_name=trade_name,
        active_substance=active_substance,
        evaluation_reason=evaluation_reason,
        opinion_date=opinion_date,
        assessment_url=assessment_url,
        smr_value=smr_value,
        asmr_value=asmr_value,
        overall_summary=parsed.get("overall_summary", ""),
        clinical_context=parsed.get("clinical_context", ""),
        smr_rationale=parsed.get("smr_rationale", ""),
        asmr_rationale=parsed.get("asmr_rationale", ""),
        target_population=parsed.get("target_population", ""),
        market_implications=parsed.get("market_implications", ""),
        clinical_evidence=clinical_evidence,
        ai_model=AI_MODEL,
        cached=False,
    )

    # Cache the result
    _analysis_cache[key] = analysis
    _save_to_disk_cache(key, analysis)

    return analysis
