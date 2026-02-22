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
