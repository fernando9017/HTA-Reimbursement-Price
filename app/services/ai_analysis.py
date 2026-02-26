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

from app.models import (
    GBAAssessmentAnalysis,
    GBAClinicalEvidence,
    GBAClinicalTrial,
    GBAEfficacyEndpoint,
    GBASubpopAnalysis,
)

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
  "clinical_evidence": {{
    "pivotal_trials": [
      {{
        "trial_name": "<trial name, e.g. KEYNOTE-189>",
        "nct_number": "<NCT number if known, e.g. NCT02578680, or empty string>",
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
    "indirect_comparisons": "<describe if indirect treatment comparisons were likely submitted, or empty string>",
    "subpopulation_analyses_note": "<describe if pre-specified subgroup analyses were conducted, or empty string>",
    "evidence_limitations": ["<limitation 1>", "<limitation 2>"]
  }},
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
- The benefit ratings translate as: erheblich = Major added benefit, \
beträchtlich = Considerable added benefit, gering = Minor added benefit, \
nicht quantifizierbar = Non-quantifiable added benefit (benefit exists but cannot be \
precisely ranked), kein Zusatznutzen = No added benefit (vs. comparator), \
geringerer Nutzen = Lesser benefit (worse than comparator)
- Evidence levels: Beleg = Proof, Hinweis = Indication, Anhaltspunkt = Hint

CRITICAL rules for clinical_evidence:
- Include the pivotal trial(s) that supported the G-BA assessment outcome. \
Infer the trial name and key endpoints from the drug name, indication, comparator, \
and your knowledge of major clinical trials.
- NEVER fabricate specific numerical values (HR, median OS/PFS, p-values, enrollment). \
If you are confident in the values, include them. If uncertain, use empty strings \
for the specific fields you are unsure about. Set confidence accordingly.
- confidence levels: "high" = trial name and key endpoints are well-established; \
"moderate" = trial name is likely correct but some endpoint details uncertain; \
"low" = trial identification is tentative.
- For key_endpoints, focus on the 3-5 most clinically relevant endpoints \
(OS, PFS, ORR, DFS, EFS, safety). Do not include more than 5 endpoints.
- For indirect_comparisons: note if the indication or comparator suggests the \
manufacturer likely submitted indirect treatment comparisons (e.g., network \
meta-analysis, Bucher method) rather than head-to-head trial data.
- For subpopulation_analyses_note: note if the assessment involves pre-specified \
subgroup analyses (e.g., by biomarker, prior therapy, disease stage).
- evidence_limitations should note what could not be reliably determined from the \
assessment data alone.

CRITICAL rules for market_implications:
- "Kein Zusatznutzen" (no added benefit) does NOT restrict prescribing, patient access, \
or reimbursement eligibility in Germany. Physicians can still freely prescribe the drug. \
The impact is on PRICE NEGOTIATIONS: the reimbursement price will be anchored to \
the comparator cost, and the drug may be assigned to a reference price group \
(Festbetragsgruppe), limiting the manufacturer's pricing flexibility.
- Never say a "no added benefit" decision "restricts use" or "limits access" for patients. \
Germany has no positive list system — all approved drugs are reimbursable by statutory \
health insurance (GKV).
- For drugs WITH added benefit, the manufacturer can negotiate a price premium \
proportional to the benefit extent and evidence certainty.
- For "nicht quantifizierbar" (non-quantifiable), note that benefit IS acknowledged — \
the manufacturer can still negotiate a price above comparator cost.
- Manufacturers may voluntarily withdraw from the German market if the negotiated \
price is commercially unviable, but this is a business decision, not an access restriction.

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
        max_tokens=4096,
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
        ai_model=AI_MODEL,
        cached=False,
    )

    # Cache the result
    _analysis_cache[key] = analysis
    _save_to_disk_cache(key, analysis)

    return analysis
