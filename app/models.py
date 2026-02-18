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


class AssessmentResponse(BaseModel):
    """Full response for an HTA assessment query."""

    country_code: str
    country_name: str
    agency: str
    active_substance: str
    assessments: list[AssessmentResult]
