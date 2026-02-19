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
    # Japan (PMDA)
    pmda_review_type: str = ""
    drug_price: str = ""
    # English summary (FR and DE: translated/clarified assessment outcome)
    summary_en: str = ""


class AssessmentResponse(BaseModel):
    """Full response for an HTA assessment query."""

    country_code: str
    country_name: str
    agency: str
    active_substance: str
    assessments: list[AssessmentResult]


# ── Analogue Selection models ────────────────────────────────────────


class AnalogueResult(BaseModel):
    """A potential analogue medicine from EMA data."""

    name: str
    active_substance: str
    therapeutic_indication: str = ""
    authorisation_status: str = ""
    ema_number: str = ""
    therapeutic_area: str = ""
    broad_therapeutic_area: str = ""
    therapeutic_subcategory: str = ""
    orphan_medicine: bool = False
    authorisation_date: str = ""
    first_approval: bool = False
    generic: bool = False
    biosimilar: bool = False
    atc_code: str = ""
    url: str = ""
    # New fields for consulting-grade analogue screening
    marketing_authorisation_holder: str = ""
    conditional_approval: bool = False
    exceptional_circumstances: bool = False
    accelerated_assessment: bool = False
    new_active_substance: bool = False
    additional_monitoring: bool = False
    medicine_type: str = ""
    prevalence_category: str = ""
    # Molecule & pharmacology classification (enriched beyond EMA data)
    molecule_type: str = ""
    route_of_administration: str = ""
    moa_class: str = ""


class YearRange(BaseModel):
    label: str
    value: int


class ATCPrefix(BaseModel):
    code: str
    label: str


class TherapeuticCategory(BaseModel):
    """A broad therapeutic area with its subcategories."""

    name: str
    subcategories: list[str]


class FilterOptions(BaseModel):
    """Available filter options for the analogue selection UI."""

    therapeutic_areas: list[str]
    therapeutic_taxonomy: list[TherapeuticCategory] = []
    year_ranges: list[YearRange]
    statuses: list[str]
    mahs: list[str]
    atc_prefixes: list[ATCPrefix]
    prevalence_categories: list[str]
    molecule_types: list[str] = []
    routes_of_administration: list[str] = []
    moa_classes: list[str] = []


class AnalogueResponse(BaseModel):
    """Response for an analogue search query."""

    total: int
    results: list[AnalogueResult]
