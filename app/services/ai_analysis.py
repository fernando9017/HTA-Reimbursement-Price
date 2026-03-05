"""AI-powered analysis of G-BA HTA assessment documents.

Uses Claude Sonnet to generate structured English analyses from
the raw G-BA decision data (indications, patient groups, benefit
ratings, evidence levels, and comparators).

Requires ANTHROPIC_API_KEY environment variable to be set.
Gracefully handles missing API key with informative error messages.
"""

import hashlib
import json
import logging
import os
import re
from pathlib import Path

import anthropic

from app.models import (
    GBAAssessmentAnalysis,
    GBAClinicalEvidence,
    GBAClinicalTrial,
    GBAEfficacyEndpoint,
    GBAKeyDriverItem,
    GBASubpopAnalysis,
)

logger = logging.getLogger(__name__)

# In-memory cache: hash(input) → analysis result
_analysis_cache: dict[str, GBAAssessmentAnalysis] = {}

# Disk cache directory
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "ai_cache"


def clear_cache() -> int:
    """Clear all cached AI analyses (memory and disk).

    Called when underlying HTA data is reloaded to prevent serving stale
    analyses that were generated from outdated assessment data.

    Returns the number of entries cleared.
    """
    count = len(_analysis_cache)
    _analysis_cache.clear()

    # Remove disk cache files
    if CACHE_DIR.exists():
        for f in CACHE_DIR.glob("*.json"):
            try:
                f.unlink()
                count += 1
            except OSError:
                logger.warning("Failed to delete AI cache file: %s", f)

    logger.info("Cleared %d AI analysis cache entries (Germany)", count)
    return count

AI_MODEL = "claude-sonnet-4-5-20241022"

SYSTEM_PROMPT = """\
You are a senior HTA (Health Technology Assessment) analyst specializing in \
German G-BA AMNOG benefit assessments. You analyze assessment data and produce \
structured, clear English-language summaries for pharmaceutical market access \
professionals.

Your analysis must be factual, balanced, and based solely on the provided data. \
Do not speculate or add information not present in the input.

## German Healthcare System & AMNOG Process — Background

### How AMNOG works
Under AMNOG (Arzneimittelmarktneuordnungsgesetz, 2011), every new drug with a \
new active substance must undergo an early benefit assessment (Frühe Nutzenbewertung) \
by the G-BA (Gemeinsamer Bundesausschuss) within the first year after launch. The \
process is:
1. The manufacturer submits a dossier to the G-BA at launch.
2. IQWiG (Institut für Qualität und Wirtschaftlichkeit im Gesundheitswesen) or \
sometimes the G-BA itself evaluates the dossier and issues a recommendation.
3. The G-BA makes a final decision (Beschluss) on the extent of added benefit \
(Zusatznutzen) vs. the appropriate comparator therapy (zweckmäßige \
Vergleichstherapie, zVT).
4. Based on the G-BA decision, the manufacturer negotiates a reimbursement price \
(Erstattungsbetrag) with the GKV-SV (National Association of Statutory Health \
Insurance Funds).
5. If negotiations fail, an arbitration board (Schiedsstelle) sets the price.

### Zusatznutzen (Added Benefit) — What the ratings mean
The G-BA rates the added benefit on a 6-level scale:
- **Erheblich (Major)**: Large and clinically relevant improvement, e.g. cure of a \
previously untreatable disease. Very rare — reserved for transformative therapies.
- **Beträchtlich (Considerable)**: Clear and significant improvement vs. comparator, \
e.g. substantial OS gain or reversal of a serious condition.
- **Gering (Minor)**: Moderate improvement in clinically relevant endpoints.
- **Nicht quantifizierbar (Non-quantifiable)**: Added benefit exists but cannot be \
quantified due to study design or data limitations. This is NOT a negative outcome — \
it acknowledges a benefit that the evidence does not allow to rank precisely.
- **Kein Zusatznutzen (No added benefit)**: No added benefit over the comparator. \
This does NOT mean the drug is ineffective — it means it was not shown to be BETTER \
than the comparator therapy.
- **Geringerer Nutzen (Lesser benefit)**: The drug is WORSE than the comparator — \
the only truly negative outcome.

### Critical: What "Kein Zusatznutzen" (No Added Benefit) does NOT mean
IMPORTANT — a common misconception must be avoided:
- "Kein Zusatznutzen" does NOT restrict prescribing or patient access in Germany. \
Physicians remain free to prescribe the drug.
- It does NOT mean the drug is clinically inferior or ineffective.
- It does NOT create any formulary restriction, prior authorisation, or step therapy \
requirement.
- Germany has NO positive list / formulary system at the individual drug level — \
all approved drugs are reimbursable by statutory health insurance (GKV).

What it DOES mean:
- The drug's reimbursement price will be negotiated based on comparator pricing. \
With no added benefit, the price typically cannot exceed the cost of the comparator \
(or the applicable reference price group / Festbetrag).
- The drug may be grouped into an existing reference price cluster (Festbetragsgruppe), \
limiting pricing flexibility.
- Manufacturers may choose to voluntarily withdraw (Opt-out) from the German market \
if the resulting price is commercially unviable, but this is the manufacturer's \
decision, not a restriction on access.

### Evidence certainty (Aussagesicherheit)
The G-BA also rates the certainty of the evidence:
- **Beleg (Proof)**: Highest certainty — typically from well-designed RCTs with robust \
results.
- **Hinweis (Indication)**: Moderate certainty — e.g., RCT data with some limitations.
- **Anhaltspunkt (Hint)**: Lowest certainty — suggestive but not conclusive evidence, \
e.g., observational data or trials with major limitations.

Evidence certainty is reported ALONGSIDE the benefit rating. A rating of "gering, \
Hinweis" means "minor added benefit, at moderate evidence certainty." Higher evidence \
certainty strengthens the manufacturer's negotiating position.

### zVT (Zweckmäßige Vergleichstherapie) — Appropriate Comparator
The G-BA selects the comparator against which the new drug is evaluated. This is \
critical because:
- The comparator defines the benchmark for both clinical assessment AND price \
negotiations.
- Manufacturers often dispute the chosen comparator if they believe a different one \
would be more favourable.
- Different subpopulations may have different comparators.

### Price negotiation implications by outcome
- **Added benefit confirmed (any level)**: The manufacturer can negotiate a premium \
above comparator costs, with the premium proportional to the benefit extent and \
evidence certainty.
- **Non-quantifiable benefit**: Still allows negotiation above comparator cost, but \
the premium is typically more modest.
- **No added benefit**: Price is anchored to comparator cost. The drug may be assigned \
to a reference price group. Limited pricing flexibility.
- **Lesser benefit**: Very unfavourable — the drug may face pricing below comparator \
cost. Manufacturers sometimes withdraw.

### Re-assessments
G-BA decisions can be time-limited. The manufacturer must resubmit a dossier for \
re-assessment (typically after 1-3 years or when new evidence is available). \
Re-assessments can change the benefit rating up or down."""

ANALYSIS_PROMPT_TEMPLATE = """\
Analyze this G-BA (Gemeinsamer Bundesausschuss) AMNOG benefit assessment and \
provide a detailed, structured English-language analysis with specific clinical data.

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
  "decision_drivers": ["<key factor driving positive benefit 1>", "<factor 2>"],
  "decision_barriers": ["<key barrier or negative factor 1>", "<barrier 2>"],
  "pma_conclusion": "<overall P&MA conclusion — what the decision means for pricing>",
  "comparator_assessment": [
    {{
      "text": "<finding about comparator choice or trial design>",
      "sentiment": "<positive|negative|neutral>"
    }}
  ],
  "efficacy_safety_evaluation": [
    {{
      "text": "<specific finding about efficacy, safety, or QoL — include numbers>",
      "sentiment": "<positive|negative|neutral>"
    }}
  ],
  "clinical_evidence": {{
    "pivotal_trials": [
      {{
        "trial_name": "<trial name, e.g. KEYNOTE-189>",
        "nct_number": "<NCT number if known>",
        "trial_design": "<Phase III, randomized, double-blind, placebo-controlled>",
        "enrollment": "<total N or null if unknown>",
        "trial_comparator": "<comparator arm description>",
        "confidence": "<high|moderate|low>",
        "key_endpoints": [
          {{
            "name": "Overall Survival",
            "abbreviation": "OS",
            "treatment_result": "<e.g. 34.0 months>",
            "comparator_result": "<e.g. 27.0 months>",
            "effect_measure": "HR",
            "effect_value": "<e.g. 0.67>",
            "ci_95": "<e.g. 0.51-0.89>",
            "p_value": "<e.g. 0.005>",
            "statistically_significant": true
          }}
        ]
      }}
    ],
    "indirect_comparisons": "<description if relevant, else empty string>",
    "subpopulation_analyses_note": "<note on subgroup analyses if relevant>",
    "evidence_limitations": ["<limitation 1>"]
  }},
  "subpopulation_analyses": [
    {{
      "patient_group": "<patient group description in English>",
      "line_of_therapy": "<e.g., First-line, Second-line, Adjuvant>",
      "indication_detail": "<refined indication description in English>",
      "outcome_en": "<benefit outcome in English, including evidence level>",
      "comparator": "<comparator therapy in English>",
      "positive_arguments": ["<specific argument with data where possible>"],
      "negative_arguments": ["<specific argument with data where possible>"],
      "key_trials": ["<trial name>"]
    }}
  ],
  "overall_summary": "<comprehensive summary covering ALL subpopulations>",
  "clinical_context": "<1-2 sentences about the disease context and unmet need>",
  "market_implications": "<1-2 sentences about pricing/market access implications>"
}}

## CRITICAL: Provide Specific Clinical Data

You are a senior HTA analyst with deep knowledge of clinical oncology and \
pharmaceutical trials. Use your knowledge to provide SPECIFIC EFFICACY DATA \
from the pivotal trials. This is the most important part of the analysis.

For the clinical_evidence section:
- Identify the pivotal trial(s) that supported this G-BA assessment. If you are \
confident about the trial, set confidence to "high". If moderately sure, "moderate". \
If uncertain, "low".
- Provide SPECIFIC numerical endpoint values when you know them:
  - OS: median overall survival for each arm, hazard ratio, 95% CI, p-value
  - PFS: median progression-free survival for each arm, HR, CI
  - ORR: objective response rate for each arm
  - DOR: duration of response
  - Safety: SAE rates, Grade 3/4 AE rates, treatment discontinuation rates
  - QoL/PRO: health-related quality of life findings (e.g., EORTC QLQ-C30)
- Include the trial design, enrollment (N=), and primary completion date if known
- If you are NOT confident about specific numbers, provide your best estimate and \
note the uncertainty in evidence_limitations. It is better to provide approximate \
values with a caveat than no values at all.

For efficacy_safety_evaluation items:
- Each item should contain SPECIFIC data points, e.g.:
  - {{"text": "{trade_name} demonstrated substantial improvement in OS (mOS 34 mo. vs 27 mo., HR = 0.67)", "sentiment": "positive"}}
  - {{"text": "No statistically significant difference in SAEs between arms (27.3% vs 13.5%)", "sentiment": "negative"}}
  - {{"text": "Patient-reported outcomes deemed unsuitable due to high proportion of missing data", "sentiment": "neutral"}}
  - {{"text": "Treatment discontinuations due to AEs: 8.7% vs 0.6%", "sentiment": "negative"}}

For comparator_assessment items:
- Assess whether the G-BA accepted the trial comparator as appropriate
- Note if the comparator was disputed or differed between subpopulations
- Note any trial design concerns (e.g., limited representation of certain subgroups)
  - {{"text": "The G-BA accepts [comparator] as appropriate in [subpopulation]", "sentiment": "positive"}}
  - {{"text": "The G-BA did not accept the comparator as appropriate for [subpopulation]", "sentiment": "negative"}}
  - {{"text": "Limited patient numbers in [subpopulation] affect interpretability", "sentiment": "neutral"}}

For decision_drivers:
- Explain what primarily drove the positive recommendation (if any)
- Reference specific efficacy data, e.g.: "Superior OS demonstrated for [drug] vs [comparator] \
(mOS 34 mo. vs 27 mo., HR = 0.67)"

For decision_barriers:
- Explain what prevented positive recommendation in certain subpopulations
- Reference specific limitations, e.g.: "Limited representation of [subpopulation] in \
pivotal trial" or "Lack of appropriate comparator for [subpopulation]"

For pma_conclusion:
- Summarize the overall pricing & market access implication
- Reference the specific benefit rating and what it means for price negotiations

## Other Rules

CRITICAL rules for overall_summary:
- The summary MUST describe the outcomes for EVERY subpopulation listed.
- If multiple subpopulations have different ratings, explicitly mention each.
- 2-4 sentences covering all subpopulations comprehensively.

Guidelines:
- Translate all German text to English
- One entry in subpopulation_analyses for EACH subpopulation — never merge or skip
- Benefit ratings: erheblich = Major, beträchtlich = Considerable, gering = Minor, \
nicht quantifizierbar = Non-quantifiable, kein Zusatznutzen = No added benefit, \
geringerer Nutzen = Lesser benefit
- Evidence levels: Beleg = Proof, Hinweis = Indication, Anhaltspunkt = Hint

CRITICAL rules for market_implications:
- "Kein Zusatznutzen" does NOT restrict prescribing or patient access in Germany — \
all approved drugs remain reimbursable. The impact is purely on PRICE NEGOTIATIONS.
- Never say "no added benefit" restricts use or limits access.
- For drugs with added benefit: manufacturer negotiates a price premium.
- For "nicht quantifizierbar": benefit IS acknowledged, premium negotiation possible.

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


def _extract_json(text: str) -> dict | None:
    """Extract a JSON object from AI response text.

    Tries multiple strategies in order:
    1. Direct parse of the full text
    2. Strip markdown code fences (```json ... ```)
    3. Find the outermost { ... } brace pair
    """
    text = text.strip()

    # Strategy 1: Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Strip markdown code fences
    fence_match = re.search(r"```(?:json)?\s*\n(.*?)\n\s*```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: Find outermost braces
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    return None


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
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # Parse the response
    response_text = response.content[0].text.strip()
    logger.debug("AI raw response length: %d chars", len(response_text))

    # Extract JSON from the response using multiple strategies
    parsed = _extract_json(response_text)
    if parsed is None:
        logger.error(
            "AI response was not valid JSON (length=%d): %s",
            len(response_text),
            response_text[:500],
        )
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

    # Build clinical evidence — support both structured and text formats
    clinical_evidence = None
    clinical_evidence_text = parsed.get("clinical_evidence_text", "")
    evidence_limitations = parsed.get("evidence_limitations", [])

    # Parse clinical_evidence if returned as structured object
    ce_raw = parsed.get("clinical_evidence")
    if ce_raw and isinstance(ce_raw, dict):
        trials = []
        for t in ce_raw.get("pivotal_trials", []):
            endpoints = []
            for ep in t.get("key_endpoints", []):
                # Handle statistically_significant — may be bool or string
                sig_raw = ep.get("statistically_significant")
                if isinstance(sig_raw, str):
                    sig_raw = sig_raw.lower() in ("true", "yes", "1")
                endpoints.append(GBAEfficacyEndpoint(
                    name=ep.get("name", ""),
                    abbreviation=ep.get("abbreviation", ""),
                    treatment_result=str(ep.get("treatment_result", "")),
                    comparator_result=str(ep.get("comparator_result", "")),
                    effect_measure=str(ep.get("effect_measure", "")),
                    effect_value=str(ep.get("effect_value", "")),
                    ci_95=str(ep.get("ci_95", "")),
                    p_value=str(ep.get("p_value", "")),
                    statistically_significant=sig_raw,
                ))
            # Parse enrollment — may come as int, string, or null
            enrollment_raw = t.get("enrollment")
            enrollment_val = None
            if enrollment_raw is not None:
                try:
                    enrollment_val = int(enrollment_raw)
                except (ValueError, TypeError):
                    pass

            trials.append(GBAClinicalTrial(
                trial_name=t.get("trial_name", ""),
                nct_number=t.get("nct_number", ""),
                trial_design=t.get("trial_design", ""),
                enrollment=enrollment_val,
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
        # Merge evidence_limitations from clinical_evidence if not set at top level
        if not evidence_limitations and clinical_evidence.evidence_limitations:
            evidence_limitations = clinical_evidence.evidence_limitations

    # Parse comparator_assessment and efficacy_safety_evaluation items
    comparator_assessment = []
    for item in parsed.get("comparator_assessment", []):
        if isinstance(item, dict):
            comparator_assessment.append(GBAKeyDriverItem(
                text=item.get("text", ""),
                sentiment=item.get("sentiment", "neutral"),
            ))

    efficacy_safety_evaluation = []
    for item in parsed.get("efficacy_safety_evaluation", []):
        if isinstance(item, dict):
            efficacy_safety_evaluation.append(GBAKeyDriverItem(
                text=item.get("text", ""),
                sentiment=item.get("sentiment", "neutral"),
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
        clinical_evidence=clinical_evidence,
        clinical_evidence_text=clinical_evidence_text,
        evidence_limitations=evidence_limitations,
        decision_drivers=parsed.get("decision_drivers", []),
        decision_barriers=parsed.get("decision_barriers", []),
        pma_conclusion=parsed.get("pma_conclusion", ""),
        comparator_assessment=comparator_assessment,
        efficacy_safety_evaluation=efficacy_safety_evaluation,
        ai_model=AI_MODEL,
        cached=False,
    )

    # Cache the result
    _analysis_cache[key] = analysis
    _save_to_disk_cache(key, analysis)

    return analysis
