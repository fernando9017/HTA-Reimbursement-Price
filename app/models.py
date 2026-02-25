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


class MexicoProcurementFilters(BaseModel):
    """Available filter options for Mexico procurement module."""

    cycles: list[str]
    therapeutic_groups: list[str]
    institutions: list[str]
    source_types: list[str]
    statuses: list[str]
