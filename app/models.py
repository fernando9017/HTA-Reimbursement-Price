"""Pydantic models for API requests and responses."""

from pydantic import BaseModel


class MedicineResult(BaseModel):
    """A medicine found in the EMA database."""

    name: str
    active_substance: str
    therapeutic_indication: str
    authorisation_status: str
    ema_number: str
    condition: str = ""
    url: str = ""


class CountryInfo(BaseModel):
    """Available country for HTA assessment lookup."""

    code: str
    name: str
    agency: str
    agency_full_name: str
    is_loaded: bool = False  # Whether the agency's data has been loaded successfully


class AssessmentResult(BaseModel):
    """A single HTA assessment outcome.

    Fields are country-agnostic where possible.  Country-specific rating
    fields are optional so each adapter only populates what applies.
    """

    product_name: str
    cis_code: str = ""
    dossier_code: str = ""
    evaluation_reason: str
    opinion_date: str
    assessment_url: str = ""
    # France (HAS)
    smr_value: str = ""
    smr_description: str = ""
    asmr_value: str = ""
    asmr_description: str = ""
    # Germany (G-BA)
    benefit_rating: str = ""
    benefit_rating_description: str = ""
    evidence_level: str = ""
    comparator: str = ""
    patient_group: str = ""
    # UK (NICE)
    nice_recommendation: str = ""
    guidance_reference: str = ""
    guidance_type: str = ""
    # Spain (AEMPS)
    ipt_reference: str = ""
    therapeutic_positioning: str = ""
    bifimed_reimbursed: str = ""    # SNS reimbursement status: "Yes", "No", or ""
    bifimed_url: str = ""           # URL to the Bifimed (SNS financing database) entry
    # Japan (MHLW / KEGG JAPIC)
    pmda_review_type: str = ""      # reimbursement status: "Reimbursed (NHI)" or "Not in NHI price list"
    japan_mhlw_url: str = ""        # MHLW price-setting notification PDF or page URL
    # Translated summary (all countries)
    summary_en: str = ""


class AssessmentResponse(BaseModel):
    """Full response for an HTA assessment query."""

    country_code: str
    country_name: str
    agency: str
    active_substance: str
    assessments: list[AssessmentResult]


# ── Analogue Selection models ────────────────────────────────────────


class HTACountrySummary(BaseModel):
    """Summary of HTA outcomes for one country."""

    country_code: str
    agency: str
    has_assessment: bool = False
    latest_date: str = ""
    rating: str = ""
    rating_detail: str = ""


class AnalogueResult(BaseModel):
    """A potential analogue medicine from EMA data.

    When indication_keyword is used, a product may appear multiple times
    — once per matching indication segment.
    """

    name: str
    active_substance: str
    therapeutic_indication: str = ""
    indication_segment: str = ""
    authorisation_status: str = ""
    ema_number: str = ""
    therapeutic_area: str = ""
    therapeutic_category: str = ""
    therapeutic_subcategory: str = ""
    orphan_medicine: bool = False
    authorisation_date: str = ""
    first_approval: bool = False
    generic: bool = False
    biosimilar: bool = False
    atc_code: str = ""
    url: str = ""
    marketing_authorisation_holder: str = ""
    conditional_approval: bool = False
    exceptional_circumstances: bool = False
    accelerated_assessment: bool = False
    new_active_substance: bool = False
    medicine_type: str = ""
    prevalence_category: str = ""
    # Line of therapy / treatment context
    line_of_therapy: list[str] = []
    treatment_setting: list[str] = []
    # Evidence package signals
    evidence_tier: str = ""
    # HTA cross-reference
    hta_summaries: list[HTACountrySummary] = []


class YearRange(BaseModel):
    label: str
    value: int


class ATCPrefix(BaseModel):
    code: str
    label: str


class TherapeuticCategory(BaseModel):
    """A broad therapeutic category with its available sub-categories."""

    category: str
    subcategories: list[str]


class FilterOptions(BaseModel):
    """Available filter options for the analogue selection UI."""

    therapeutic_areas: list[str]
    therapeutic_taxonomy: list[TherapeuticCategory]
    year_ranges: list[YearRange]
    statuses: list[str]
    mahs: list[str]
    atc_prefixes: list[ATCPrefix]
    prevalence_categories: list[str]
    lines_of_therapy: list[str] = []
    treatment_settings: list[str] = []
    evidence_tiers: list[str] = []
    hta_countries: list[str] = []


class AnalogueResponse(BaseModel):
    """Response for an analogue search query."""

    total: int
    results: list[AnalogueResult]


# ── Mexico Pharma Procurement models ───────────────────────────────


class ClaveResult(BaseModel):
    """A product code (clave) in Mexico's consolidated procurement system."""

    clave: str                          # e.g., "010.000.6317.00"
    description: str                    # Full product description / presentation
    active_substance: str               # INN (International Nonproprietary Name)
    atc_code: str = ""
    therapeutic_group: str = ""
    source_type: str = ""               # "patente", "fuente_unica", "generico", "biotecnologico"
    cnis_listed: bool = False           # Listed in Compendio Nacional de Insumos para la Salud
    cofepris_registry: str = ""         # COFEPRIS sanitary registry number
    latest_cycle: str = ""              # Most recent procurement cycle
    latest_status: str = ""             # Status in most recent cycle
    latest_unit_price: float = 0.0      # Most recent award price per unit (MXN)
    institutions: list[str] = []        # Institutions that demand this clave
    # Molecule intelligence
    indication: str = ""                # Approved therapeutic indication(s)
    mechanism_of_action: str = ""       # MOA / pharmacological class
    patent_holder: str = ""             # Originator / patent holder company
    patent_expiry: str = ""             # Expected patent expiry date


class CompetitorBid(BaseModel):
    """A competing bid submitted for a clave during the procurement process."""

    supplier: str
    unit_price_offered: float = 0.0     # MXN
    outcome: str = ""                   # "awarded", "rejected", "second_place", "withdrawn"
    reason: str = ""                    # Why rejected / not selected


class AdjudicacionResult(BaseModel):
    """A procurement award for a clave in a specific cycle."""

    clave: str
    description: str
    active_substance: str
    cycle: str                          # e.g., "2025-2026"
    status: str                         # "adjudicada", "desierta", "en_proceso", "cancelada"
    supplier: str = ""
    units_requested: int = 0
    units_awarded: int = 0
    unit_price: float = 0.0             # MXN per unit
    total_amount: float = 0.0           # MXN total
    max_reference_price: float = 0.0    # BIRMEX maximum reference price (MXN per unit)
    institution: str = ""               # Requesting institution (IMSS, ISSSTE, etc.)
    therapeutic_group: str = ""
    source_type: str = ""
    # Negotiation context
    negotiation_type: str = ""          # "mesa_patente", "licitacion_publica", "adjudicacion_directa"
    negotiation_notes: str = ""         # Notes from the negotiation process
    competitor_bids: list[CompetitorBid] = []  # Competing offers submitted


class PriceHistoryEntry(BaseModel):
    """A single price point for a clave in a procurement cycle."""

    cycle: str
    unit_price: float
    currency: str = "MXN"
    supplier: str = ""
    units_awarded: int = 0
    status: str = ""
    institution: str = ""
    max_reference_price: float = 0.0    # BIRMEX ceiling price for this cycle


class PriceHistoryResult(BaseModel):
    """Full price history for a specific clave."""

    clave: str
    description: str
    active_substance: str
    source_type: str = ""
    entries: list[PriceHistoryEntry]
    price_change_pct: float = 0.0       # % change from earliest to latest cycle


class ClaveDetailResult(BaseModel):
    """Full intelligence profile for a single clave."""

    clave: str
    description: str
    active_substance: str
    atc_code: str = ""
    therapeutic_group: str = ""
    source_type: str = ""
    cnis_listed: bool = False
    cofepris_registry: str = ""
    # Molecule intelligence
    indication: str = ""
    mechanism_of_action: str = ""
    patent_holder: str = ""
    patent_expiry: str = ""
    # All adjudicaciones across cycles and institutions
    adjudicaciones: list[AdjudicacionResult] = []
    # Price history
    price_history: PriceHistoryResult | None = None
    # Competitor landscape: other claves with the same active substance
    same_substance_claves: list[ClaveResult] = []


class InstitutionSummary(BaseModel):
    """Aggregated procurement stats for one institution."""

    institution: str
    total_claves: int = 0
    total_spend_mxn: float = 0.0
    total_units_requested: int = 0
    total_units_awarded: int = 0
    fulfillment_rate_pct: float = 0.0
    adjudicadas: int = 0
    desiertas: int = 0
    top_therapeutic_groups: list[dict] = []   # [{group, spend, claves}]
    top_suppliers: list[dict] = []            # [{supplier, spend, claves}]


class MexicoSearchResponse(BaseModel):
    """Response for Mexico procurement clave search."""

    total: int
    results: list[ClaveResult]


class MexicoAdjudicacionResponse(BaseModel):
    """Response for adjudicaciones query."""

    total: int
    cycle: str
    summary: dict = {}                  # Aggregate stats: adjudicadas, desiertas, etc.
    results: list[AdjudicacionResult]


class InstitutionPrice(BaseModel):
    """Price data for a single institution in a price variance comparison."""

    institution: str
    unit_price: float = 0.0
    units_awarded: int = 0
    supplier: str = ""
    max_reference_price: float = 0.0


class PriceVarianceItem(BaseModel):
    """Cross-institutional price variance for a single clave in a cycle."""

    clave: str
    active_substance: str
    therapeutic_group: str = ""
    source_type: str = ""
    cycle: str
    institution_prices: list[InstitutionPrice]
    min_price: float = 0.0
    max_price: float = 0.0
    variance_pct: float = 0.0           # (max - min) / min * 100
    avg_price: float = 0.0
    total_savings_potential: float = 0.0  # savings if all bought at min price


class PriceVarianceResponse(BaseModel):
    """Cross-institutional price variance analysis."""

    cycle: str
    total: int
    items_with_variance: int            # claves where prices differ across institutions
    avg_variance_pct: float = 0.0       # average variance across all multi-institution claves
    total_savings_potential: float = 0.0
    results: list[PriceVarianceItem]


class MexicoProcurementFilters(BaseModel):
    """Available filter options for Mexico procurement module."""

    cycles: list[str]
    therapeutic_groups: list[str]
    institutions: list[str]
    source_types: list[str]
    statuses: list[str]


# ── Germany HTA Deep-Dive models ──────────────────────────────────


class GBASubpopulation(BaseModel):
    """A single patient subpopulation within a G-BA assessment."""

    patient_group: str                  # Description of the patient subpopulation
    patient_group_en: str = ""          # English translation
    benefit_rating: str = ""            # Raw German: erheblich, beträchtlich, etc.
    benefit_rating_en: str = ""         # English translation
    evidence_level: str = ""            # Raw German: Beleg, Hinweis, Anhaltspunkt
    evidence_level_en: str = ""         # English translation
    comparator: str = ""                # Appropriate comparator therapy (zVT)
    comparator_en: str = ""             # English translation


class GBAAssessmentDetail(BaseModel):
    """A single G-BA AMNOG assessment (one decision, potentially multiple subpopulations)."""

    decision_id: str = ""               # e.g. "2020-01-15-D-500"
    trade_name: str                     # Brand name(s): Keytruda, Opdivo, etc.
    active_substance: str               # INN
    indication: str                     # Therapeutic indication (AWG) — German
    indication_en: str = ""             # English translation
    decision_date: str                  # YYYY-MM-DD
    assessment_url: str = ""            # Link to G-BA assessment page
    subpopulations: list[GBASubpopulation] = []
    # Overall assessment summary (for single-subpopulation decisions)
    overall_benefit: str = ""           # Best / most favorable benefit rating
    overall_benefit_en: str = ""


class GBAGroupedAssessment(BaseModel):
    """A G-BA assessment decision grouped by decision_id.

    Contains all subpopulations belonging to the same G-BA decision,
    giving a holistic view of the assessment rather than per-subpopulation.
    """

    decision_id: str = ""
    trade_name: str
    active_substance: str
    indication: str
    indication_en: str = ""
    decision_date: str
    assessment_url: str = ""
    subpopulations: list[GBASubpopulation] = []
    subpopulation_count: int = 0        # Number of distinct subpopulations
    overall_benefit: str = ""           # Best benefit across all subpopulations
    overall_benefit_en: str = ""


class GBADrugProfile(BaseModel):
    """Complete G-BA assessment profile for one active substance.

    Shows only the most current assessment per indication, filtering
    out superseded re-assessments. Provides both flat (per-subpopulation)
    and grouped (per-decision) views.
    """

    active_substance: str
    trade_names: list[str] = []
    total_assessments: int = 0
    current_assessments: list[GBAAssessmentDetail] = []
    grouped_assessments: list[GBAGroupedAssessment] = []


class GBADrugListItem(BaseModel):
    """Summary of a drug in the G-BA database for listing purposes."""

    active_substance: str
    trade_names: list[str] = []
    latest_date: str = ""
    assessment_count: int = 0
    indications: list[str] = []
    indications_en: list[str] = []
    best_benefit: str = ""              # Best benefit rating across all current assessments
    best_benefit_en: str = ""


class GBASearchResponse(BaseModel):
    """Response for G-BA drug search / listing."""

    total: int
    results: list[GBADrugListItem]


class GBAFilterOptions(BaseModel):
    """Available filter options for the G-BA deep-dive module."""

    benefit_ratings: list[str]
    substances: list[str]


class GBASubpopAnalysis(BaseModel):
    """AI-generated analysis for one subpopulation within an assessment."""

    patient_group: str = ""
    line_of_therapy: str = ""
    indication_detail: str = ""         # Refined indication context
    outcome_en: str = ""                # English benefit outcome
    comparator: str = ""
    positive_arguments: list[str] = []  # Key arguments supporting the benefit
    negative_arguments: list[str] = []  # Key arguments against / limitations
    key_trials: list[str] = []          # Clinical trials referenced


class GBAEfficacyEndpoint(BaseModel):
    """A single efficacy endpoint result from a pivotal trial."""

    name: str = ""                      # e.g. "Overall Survival", "Progression-Free Survival"
    abbreviation: str = ""              # e.g. "OS", "PFS", "ORR"
    treatment_result: str = ""          # e.g. "22.0 months"
    comparator_result: str = ""         # e.g. "10.6 months"
    effect_measure: str = ""            # e.g. "HR", "OR", "RR"
    effect_value: str = ""              # e.g. "0.56"
    ci_95: str = ""                     # e.g. "0.45-0.70"
    p_value: str = ""                   # e.g. "<0.001"
    statistically_significant: bool | None = None


class GBAClinicalTrial(BaseModel):
    """A pivotal clinical trial referenced in a G-BA assessment."""

    trial_name: str = ""                # e.g. "KEYNOTE-189"
    nct_number: str = ""                # e.g. "NCT02578680"
    trial_design: str = ""              # e.g. "Phase III, randomized, double-blind"
    enrollment: int | None = None       # Total enrollment
    trial_comparator: str = ""          # Comparator arm description
    key_endpoints: list[GBAEfficacyEndpoint] = []
    confidence: str = ""                # "high", "moderate", "low"


class GBAClinicalEvidence(BaseModel):
    """Clinical evidence section of an AI-generated G-BA analysis."""

    pivotal_trials: list[GBAClinicalTrial] = []
    indirect_comparisons: str = ""      # Description of ITC if submitted
    subpopulation_analyses_note: str = ""  # Note on pre-specified subgroup analyses
    evidence_limitations: list[str] = []   # Limitations / caveats about inferred data


class GBAAssessmentAnalysis(BaseModel):
    """AI-generated structured analysis of a G-BA assessment."""

    decision_id: str = ""
    trade_name: str = ""
    active_substance: str = ""
    indication: str = ""
    decision_date: str = ""
    assessment_url: str = ""
    subpopulation_analyses: list[GBASubpopAnalysis] = []
    overall_summary: str = ""           # 2-3 sentence summary
    clinical_context: str = ""          # Disease context / unmet need
    market_implications: str = ""       # Pricing / market access implications
    clinical_evidence: GBAClinicalEvidence | None = None  # Pivotal trial data
    ai_model: str = ""                  # Which model generated the analysis
    cached: bool = False                # Whether result came from cache
