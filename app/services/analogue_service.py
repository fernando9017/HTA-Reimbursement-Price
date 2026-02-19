"""Analogue selection service.

Uses EMA medicine data to find analogues for a given therapy based on
configurable filters: therapeutic area (hierarchical), orphan status,
years since approval, first approval, authorisation status, ATC code,
marketing authorisation holder, regulatory pathway flags, prevalence,
molecule type, route of administration, and mechanism of action.

Extends beyond raw EMA data by using:
- WHO INN (International Nonproprietary Name) suffix conventions
- Curated molecular reference data (app/data/molecule_reference.json)
- Pharmacological text-mining heuristics
"""

import json
import logging
import re
from datetime import date, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Molecule reference data (beyond EMA) ──────────────────────────────
# Curated dataset mapping known active substances to molecule type,
# route of administration, and MoA class.

_MOLECULE_REF: dict[str, dict] = {}
_MOLECULE_REF_PATH = Path(__file__).parent.parent / "data" / "molecule_reference.json"

try:
    with open(_MOLECULE_REF_PATH, encoding="utf-8") as f:
        _raw_ref = json.load(f)
        _MOLECULE_REF = _raw_ref.get("substances", {})
    logger.info("Molecule reference loaded: %d substances", len(_MOLECULE_REF))
except Exception:
    logger.warning("Could not load molecule reference data — will use INN rules only")

# ATC Level 1 anatomical main groups
ATC_LEVEL1 = {
    "A": "Alimentary tract and metabolism",
    "B": "Blood and blood forming organs",
    "C": "Cardiovascular system",
    "D": "Dermatologicals",
    "G": "Genito-urinary system and sex hormones",
    "H": "Systemic hormonal preparations",
    "J": "Anti-infectives for systemic use",
    "L": "Antineoplastic and immunomodulating agents",
    "M": "Musculo-skeletal system",
    "N": "Nervous system",
    "P": "Antiparasitic products, insecticides",
    "R": "Respiratory system",
    "S": "Sensory organs",
    "V": "Various",
}

# ── Therapeutic area taxonomy ──────────────────────────────────────
#
# Hierarchical classification: broad category → subcategories.
# Each entry has:
#   - atc_prefixes: ATC code prefixes that map to this category
#   - keywords: terms in indication/therapeutic_area text
#   - subcategories: dict of subcategory name → keyword list
#
# Classification priority: subcategory keywords checked first,
# then broad category keywords, then ATC prefix fallback.

THERAPEUTIC_TAXONOMY: dict[str, dict] = {
    "Oncology": {
        "atc_prefixes": ["L01"],
        "keywords": [
            "cancer", "carcinoma", "tumour", "tumor", "neoplasm",
            "malignant", "malignancy", "oncology", "antineoplastic",
            "metastatic", "metastases", "leukaemia", "leukemia",
            "lymphoma", "myeloma", "myeloid", "lymphocytic",
        ],
        "subcategories": {
            "Solid Tumors": [
                "lung", "nsclc", "non-small cell", "small cell lung",
                "breast", "colorectal", "colon cancer", "rectal cancer",
                "gastric", "oesophageal", "esophageal", "hepatocellular",
                "pancreatic", "cholangiocarcinoma", "biliary",
                "renal cell", "kidney", "bladder", "urothelial",
                "prostate", "ovarian", "endometrial", "cervical",
                "head and neck", "thyroid", "melanoma", "basal cell",
                "merkel cell", "sarcoma", "glioblastoma", "glioma",
                "mesothelioma", "neuroblastoma",
            ],
            "Hematological Malignancies": [
                "leukaemia", "leukemia", "lymphoma", "myeloma",
                "myeloid", "lymphocytic", "hodgkin", "myelofibrosis",
                "myelodysplastic", "mantle cell", "follicular",
                "diffuse large b-cell", "waldenstr",
            ],
        },
    },
    "Immunology & Inflammation": {
        "atc_prefixes": ["L04"],
        "keywords": [
            "autoimmune", "inflammatory", "inflammation", "immune-mediated",
            "immunomodulat", "psoriasis", "atopic dermatitis", "eczema",
            "rheumatoid", "crohn", "ulcerative colitis",
        ],
        "subcategories": {
            "Autoimmune & Rheumatology": [
                "rheumatoid", "psoriatic arthritis", "ankylosing spondylitis",
                "axial spondyloarthritis", "juvenile idiopathic arthritis",
                "lupus", "scleroderma", "vasculitis", "sjogren",
                "myasthenia gravis", "gout",
                "transplant", "graft-versus-host", "gvhd", "rejection",
            ],
            "Dermatology": [
                "psoriasis", "atopic dermatitis", "eczema",
                "hidradenitis", "alopecia areata", "vitiligo",
            ],
            "GI Inflammatory": [
                "crohn", "ulcerative colitis", "inflammatory bowel",
            ],
        },
    },
    "Neuroscience": {
        "atc_prefixes": ["N"],
        "keywords": [
            "neurolog", "nervous system", "neurodegen",
            "depression", "schizophrenia", "bipolar", "anxiety",
            "psychosis", "migraine", "pain", "epilepsy", "seizure",
        ],
        "subcategories": {
            "Neurodegeneration & Movement": [
                "alzheimer", "parkinson", "huntington",
                "amyotrophic lateral sclerosis", "motor neuron",
                "dementia", "multiple sclerosis", "neuromyelitis",
            ],
            "Neuromuscular & Rare Neuro": [
                "spinal muscular atrophy", "duchenne", "myasthenia",
                "muscular dystrophy", "epilepsy", "seizure",
                "lennox-gastaut", "dravet",
            ],
            "Psychiatry & Pain": [
                "depression", "schizophrenia", "bipolar", "anxiety",
                "psychosis", "adhd", "obsessive",
                "migraine", "neuropathic", "fibromyalgia",
            ],
        },
    },
    "Cardiometabolic": {
        "atc_prefixes": ["C", "A10", "H"],
        "keywords": [
            "cardiovascular", "cardiac", "heart", "vascular",
            "diabetes", "metaboli", "endocrin", "hormonal",
            "respiratory", "pulmonary", "lung disease", "airway",
            "asthma", "copd",
        ],
        "subcategories": {
            "Cardiovascular": [
                "heart failure", "cardiomyopathy",
                "thrombosis", "anticoagul", "embolism", "atrial fibrillation",
                "hypertension", "hypercholesterol", "dyslipid",
                "pulmonary arterial hypertension",
            ],
            "Diabetes & Obesity": [
                "diabetes", "glycaemic", "glycemic", "insulin",
                "hyperglycaemia", "obesity", "overweight",
                "weight management", "body mass index",
            ],
            "Respiratory": [
                "asthma", "copd", "chronic obstructive",
                "cystic fibrosis", "cftr",
                "pulmonary fibrosis", "interstitial lung",
            ],
        },
    },
    "Rare & Specialty": {
        "atc_prefixes": ["B", "S01"],
        "keywords": [
            "gene therapy", "orphan", "enzyme replacement",
            "hematolog", "haematolog",
            "ophthalm", "retinal", "macular", "eye",
        ],
        "subcategories": {
            "Hematology (Non-Malignant)": [
                "haemophilia", "hemophilia", "von willebrand",
                "bleeding", "coagulation",
                "anaemia", "anemia", "thalassaemia", "thalassemia",
                "sickle cell", "thrombocytopeni", "neutropeni",
                "paroxysmal nocturnal",
            ],
            "Ophthalmology": [
                "macular degeneration", "macular oedema", "macular edema",
                "diabetic retinopathy", "retinal", "glaucoma",
                "intraocular pressure", "ophthalm",
            ],
            "Gene Therapy & Rare Genetic": [
                "gene therapy", "gene replacement", "adeno-associated",
                "lentiviral", "enzyme replacement", "recombinant enzyme",
                "fabry", "gaucher", "pompe", "phenylketonuria",
                "lysosomal", "mucopolysaccharidos", "niemann-pick",
                "acromegaly", "cushing",
            ],
            "Infectious Diseases": [
                "hiv", "hepatitis", "viral", "herpes", "influenza",
                "covid", "sars-cov", "antiviral", "rsv",
                "bacterial", "antibiotic", "tuberculosis",
                "fungal", "antifungal", "parasit", "malaria",
                "vaccine", "immunisation", "immunization", "prophylaxis",
                "infection", "infectious", "anti-infective",
            ],
        },
    },
}


def _classify_therapeutic_area(
    indication: str, therapeutic_area: str, atc_code: str,
) -> tuple[str, str]:
    """Classify a medicine into broad category and subcategory.

    Returns (broad_category, subcategory). Both default to "" if no match.
    Checks subcategory keywords first (more specific), then broad keywords,
    then ATC prefix as fallback.
    """
    text = f"{indication} {therapeutic_area}".lower()
    atc_upper = atc_code.upper() if atc_code else ""

    # First pass: check subcategory keywords (most specific match)
    for broad, config in THERAPEUTIC_TAXONOMY.items():
        for sub_name, sub_keywords in config["subcategories"].items():
            for kw in sub_keywords:
                if kw in text:
                    return broad, sub_name

    # Second pass: check broad category keywords
    for broad, config in THERAPEUTIC_TAXONOMY.items():
        for kw in config["keywords"]:
            if kw in text:
                return broad, ""

    # Third pass: ATC prefix fallback
    if atc_upper:
        for broad, config in THERAPEUTIC_TAXONOMY.items():
            for prefix in config["atc_prefixes"]:
                if atc_upper.startswith(prefix):
                    return broad, ""

    return "", ""


# Keywords suggesting ultra-rare conditions (prevalence < 1 in 50,000)
_ULTRA_RARE_KEYWORDS = [
    "ultra-rare", "ultra rare",
    "spinal muscular atrophy", "sma type",
    "duchenne", "haemophilia", "hemophilia",
    "huntington", "cystic fibrosis",
    "beta-thalassaemia", "thalassemia",
    "batten disease", "fabry", "gaucher", "pompe",
    "mucopolysaccharidos", "mps i", "mps ii",
    "phenylketonuria", "pku",
    "retinal dystrophy", "leber",
]

# Keywords suggesting rare conditions (prevalence < 5 in 10,000)
_RARE_KEYWORDS = [
    "rare", "orphan",
    "amyotrophic lateral sclerosis", "als",
    "multiple sclerosis",
    "pulmonary arterial hypertension", "pah",
    "idiopathic pulmonary fibrosis",
    "systemic lupus erythematosus",
    "myasthenia gravis",
    "sickle cell", "sickle-cell",
    "narcolepsy", "acromegaly",
    "glioblastoma", "glioma",
    "acute lymphoblastic",
    "acute myeloid",
    "chronic lymphocytic",
    "mantle cell lymphoma",
    "follicular lymphoma",
    "hodgkin",
    "myelofibrosis",
    "myelodysplastic",
    "neuroblastoma", "retinoblastoma",
    "mesothelioma",
    "cholangiocarcinoma",
    "hepatocellular carcinoma",
    "pancreatic",
    "oesophageal", "esophageal",
    "gastric cancer",
    "ovarian",
    "endometrial",
    "soft tissue sarcoma", "osteosarcoma",
]


def _classify_prevalence(orphan: bool, indication: str) -> str:
    """Classify a medicine's target indication prevalence.

    Uses orphan status and indication text keywords as proxies.
    Returns: 'ultra-rare', 'rare', or 'non-rare'.
    """
    ind_lower = indication.lower()

    if orphan:
        for kw in _ULTRA_RARE_KEYWORDS:
            if kw in ind_lower:
                return "ultra-rare"
        return "rare"

    # Some non-orphan drugs target relatively rare conditions
    for kw in _ULTRA_RARE_KEYWORDS:
        if kw in ind_lower:
            return "ultra-rare"
    for kw in _RARE_KEYWORDS:
        if kw in ind_lower:
            return "rare"

    return "non-rare"


# ── Molecule Type Classification ──────────────────────────────────────
#
# Uses INN (International Nonproprietary Name) suffix conventions from
# WHO plus curated reference data to classify medicines by molecule type.
# Priority: reference data > INN suffix > EMA medicine_type > heuristics.

# INN suffix → molecule type (order: most specific first)
_INN_MOLECULE_RULES: list[tuple[str, str]] = [
    # ADC payloads (check before -mab)
    ("vedotin", "Antibody-Drug Conjugate"),
    ("deruxtecan", "Antibody-Drug Conjugate"),
    ("govitecan", "Antibody-Drug Conjugate"),
    ("mafodotin", "Antibody-Drug Conjugate"),
    ("ozogamicin", "Antibody-Drug Conjugate"),
    ("emtansine", "Antibody-Drug Conjugate"),
    ("ravtansine", "Antibody-Drug Conjugate"),
    ("tesirine", "Antibody-Drug Conjugate"),
    ("soravtansine", "Antibody-Drug Conjugate"),
    # Gene therapy (AAV vectors)
    ("parvovec", "Gene Therapy"),
    # Cell therapy
    ("leucel", "CAR-T / Cell Therapy"),
    ("autoleucel", "CAR-T / Cell Therapy"),
    ("autotemcel", "Gene Therapy"),
    # Antisense / RNA
    ("nersen", "Antisense / RNA Therapy"),
    ("siran", "Antisense / RNA Therapy"),
    # Fusion proteins
    ("cept", "Fusion Protein"),
    # Peptides
    ("glutide", "Peptide"),
    ("reotide", "Peptide"),
    ("pressin", "Peptide"),
    ("relin", "Peptide"),
    ("tide", "Peptide"),
    # Monoclonal antibodies (generic -mab suffix)
    ("mab", "Monoclonal Antibody"),
    # Small molecule suffixes
    ("nib", "Small Molecule"),
    ("tinib", "Small Molecule"),
    ("ciclib", "Small Molecule"),
    ("parib", "Small Molecule"),
    ("clax", "Small Molecule"),
    ("rafenib", "Small Molecule"),
    ("metinib", "Small Molecule"),
    ("zomib", "Small Molecule"),
    ("domide", "Small Molecule"),
    ("gliflozin", "Small Molecule"),
    ("gliptin", "Small Molecule"),
    ("sartan", "Small Molecule"),
    ("pril", "Small Molecule"),
    ("statin", "Small Molecule"),
    ("olol", "Small Molecule"),
    ("dipine", "Small Molecule"),
    ("azole", "Small Molecule"),
    ("cillin", "Small Molecule"),
    ("mycin", "Small Molecule"),
    ("floxacin", "Small Molecule"),
    ("cycline", "Small Molecule"),
    ("aftor", "Small Molecule"),
    ("acaftor", "Small Molecule"),
    ("xaban", "Small Molecule"),
    ("vir", "Small Molecule"),
    ("ib", "Small Molecule"),
]

# EMA medicine_type field values → molecule type
_MEDICINE_TYPE_MAP: dict[str, str] = {
    "generic": "Small Molecule",
    "biosimilar": "Monoclonal Antibody",
}

# Keywords in indication text hinting at molecule type
_MOLECULE_TEXT_HINTS: list[tuple[str, str]] = [
    ("gene therapy", "Gene Therapy"),
    ("gene replacement", "Gene Therapy"),
    ("car-t", "CAR-T / Cell Therapy"),
    ("car t", "CAR-T / Cell Therapy"),
    ("chimeric antigen receptor", "CAR-T / Cell Therapy"),
    ("vaccine", "Vaccine"),
    ("immunisation", "Vaccine"),
    ("immunization", "Vaccine"),
    ("prophylaxis of", "Vaccine"),
    ("enzyme replacement", "Enzyme Replacement"),
    ("recombinant enzyme", "Enzyme Replacement"),
]


def _classify_molecule_type(
    substance: str,
    medicine_type: str,
    indication: str,
) -> str:
    """Classify a medicine's molecule type.

    Priority:
    1. Curated reference data (most reliable)
    2. INN suffix rules (WHO naming conventions)
    3. EMA medicine_type field mapping
    4. Indication text heuristics
    """
    substance_lower = substance.lower().strip()

    # 1. Check curated reference data
    ref = _MOLECULE_REF.get(substance_lower)
    if ref:
        return ref.get("molecule_type", "")

    # For combination substances, try each component
    for sep in [" / ", "/", " and ", ", "]:
        if sep in substance_lower:
            parts = [p.strip() for p in substance_lower.split(sep) if p.strip()]
            for part in parts:
                ref = _MOLECULE_REF.get(part)
                if ref:
                    return ref.get("molecule_type", "")

    # 2. INN suffix rules
    # Check each word in the substance name
    words = substance_lower.split()
    for word in words:
        for suffix, mol_type in _INN_MOLECULE_RULES:
            if word.endswith(suffix):
                return mol_type

    # 3. EMA medicine_type field
    mt_lower = medicine_type.lower().strip()
    for key, mol_type in _MEDICINE_TYPE_MAP.items():
        if key in mt_lower:
            return mol_type

    # 4. Indication text heuristics
    ind_lower = indication.lower()
    for hint, mol_type in _MOLECULE_TEXT_HINTS:
        if hint in ind_lower:
            return mol_type

    return ""


# ── Route of Administration Classification ────────────────────────────
#
# Classifies medicines by route of administration using curated reference
# data, molecule type defaults, and indication text parsing.

# Molecule type → default route (for when no specific data available)
_DEFAULT_ROUTES: dict[str, str] = {
    "Small Molecule": "Oral",
    "Monoclonal Antibody": "IV",
    "Antibody-Drug Conjugate": "IV",
    "Bispecific Antibody": "IV",
    "CAR-T / Cell Therapy": "IV",
    "Gene Therapy": "IV",
    "Fusion Protein": "SC",
    "Enzyme Replacement": "IV",
    "Vaccine": "IM",
    "mRNA Vaccine": "IM",
}

# Text patterns in indication/product name suggesting a specific route
_ROUTE_TEXT_HINTS: list[tuple[str, str]] = [
    ("for oral use", "Oral"),
    ("oral solution", "Oral"),
    ("film-coated tablet", "Oral"),
    ("tablet", "Oral"),
    ("capsule", "Oral"),
    ("oral", "Oral"),
    ("for infusion", "IV"),
    ("intravenous", "IV"),
    ("concentrate for solution for infusion", "IV"),
    ("for injection", "SC"),
    ("subcutaneous", "SC"),
    ("solution for injection", "SC"),
    ("pre-filled syringe", "SC"),
    ("pre-filled pen", "SC"),
    ("intramuscular", "IM"),
    ("intravitreal", "Intravitreal"),
    ("intrathecal", "Intrathecal"),
    ("inhalation", "Inhaled"),
    ("inhaler", "Inhaled"),
    ("nebuliser", "Inhaled"),
    ("topical", "Topical"),
    ("cream", "Topical"),
    ("ointment", "Topical"),
    ("transdermal", "Topical"),
    ("eye drops", "Ophthalmic"),
]


def _classify_route(
    substance: str,
    molecule_type: str,
    indication: str,
    product_name: str = "",
) -> str:
    """Classify a medicine's route of administration.

    Priority:
    1. Curated reference data
    2. Indication/product text parsing
    3. Molecule type default route
    """
    substance_lower = substance.lower().strip()

    # 1. Check curated reference data
    ref = _MOLECULE_REF.get(substance_lower)
    if ref:
        return ref.get("route", "")

    # For combination substances, try each component
    for sep in [" / ", "/", " and ", ", "]:
        if sep in substance_lower:
            parts = [p.strip() for p in substance_lower.split(sep) if p.strip()]
            for part in parts:
                ref = _MOLECULE_REF.get(part)
                if ref:
                    return ref.get("route", "")

    # 2. Text parsing from indication + product name
    text = f"{indication} {product_name}".lower()
    for hint, route in _ROUTE_TEXT_HINTS:
        if hint in text:
            return route

    # 3. Molecule type default
    if molecule_type:
        return _DEFAULT_ROUTES.get(molecule_type, "")

    return ""


# ── MoA Class Classification ─────────────────────────────────────────


def _classify_moa(substance: str) -> str:
    """Get the mechanism of action class from reference data."""
    substance_lower = substance.lower().strip()

    ref = _MOLECULE_REF.get(substance_lower)
    if ref:
        return ref.get("moa_class", "")

    # For combination substances, collect MoA classes
    for sep in [" / ", "/", " and ", ", "]:
        if sep in substance_lower:
            parts = [p.strip() for p in substance_lower.split(sep) if p.strip()]
            moas = []
            for part in parts:
                ref = _MOLECULE_REF.get(part)
                if ref and ref.get("moa_class"):
                    moas.append(ref["moa_class"])
            if moas:
                return " + ".join(moas)

    return ""


class AnalogueService:
    """Finds analogue medicines from EMA data using multi-criteria filters."""

    def __init__(self) -> None:
        self._medicines: list[dict] = []
        self._first_approval_dates: dict[str, str] = {}
        self._therapeutic_areas: list[str] = []
        self._mahs: list[str] = []
        self._atc_prefixes: list[str] = []
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_from_ema(self, raw_medicines: list[dict]) -> None:
        """Enrich and index EMA medicine records for analogue filtering."""
        enriched: list[dict] = []
        substance_dates: dict[str, list[str]] = {}
        area_set: set[str] = set()
        mah_set: set[str] = set()
        atc_set: set[str] = set()

        for med in raw_medicines:
            name = _get_str(med, "medicineName", "name_of_medicine", "medicine_name")
            substance = _get_str(
                med, "activeSubstance", "active_substance",
                "inn_common_name", "internationalNonProprietaryNameINN",
            )
            indication = _get_str(
                med, "therapeuticIndication", "therapeutic_indication",
                "condition_indication",
            )
            status = _get_str(
                med, "authorisationStatus", "authorisation_status",
                "marketing_authorisation_status",
            )
            ema_number = _get_str(
                med, "emaNumber", "ema_product_number", "product_number",
            )
            therapeutic_area = _get_str(
                med, "condition", "therapeutic_area",
                "therapeuticArea", "therapeutic_area_mesh",
            )
            url = _get_str(med, "url", "product_page_url", "ema_url")

            # Construct EMA product page URL if not provided
            if not url and name:
                slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                url = f"https://www.ema.europa.eu/en/medicines/human/EPAR/{slug}"

            # Orphan status
            orphan_raw = _get_str(
                med, "orphanMedicine", "orphan_medicine",
                "orphan_designation", "orphan",
            ).lower()
            orphan = orphan_raw in ("yes", "true", "1", "orphan")

            # Authorisation date
            auth_date = _get_str(
                med, "authorisationDate", "marketing_authorisation_date",
                "first_published", "initial_authorisation_date",
                "marketingAuthorisationDate",
            )
            auth_date = _normalize_date(auth_date)

            # Generic / biosimilar
            generic_raw = _get_str(
                med, "generic", "genericMedicine", "generic_medicine",
            ).lower()
            biosimilar_raw = _get_str(
                med, "biosimilar", "biosimilarMedicine", "biosimilar_medicine",
            ).lower()
            is_generic = generic_raw in ("yes", "true", "1")
            is_biosimilar = biosimilar_raw in ("yes", "true", "1")

            # Fallback: check medicine_type / product_group for biosimilar/generic
            medicine_type = _get_str(
                med, "medicineType", "medicine_type", "product_type",
                "productGroup", "product_group",
            )
            mt_lower = medicine_type.lower()
            if not is_biosimilar and "biosimilar" in mt_lower:
                is_biosimilar = True
            if not is_generic and "generic" in mt_lower:
                is_generic = True

            # ATC code
            atc_code = _get_str(med, "atcCode", "atc_code", "ATC_code")

            # Marketing authorisation holder (company)
            mah = _get_str(
                med, "marketingAuthorisationHolder",
                "marketing_authorisation_holder_company_name",
                "marketing_authorisation_holder", "mah",
            )

            # Regulatory pathway flags
            conditional_raw = _get_str(
                med, "conditionalApproval", "conditional_approval",
                "conditional", "conditionalMA",
            ).lower()
            conditional = conditional_raw in ("yes", "true", "1")

            exceptional_raw = _get_str(
                med, "exceptionalCircumstances", "exceptional_circumstances",
                "exceptional",
            ).lower()
            exceptional = exceptional_raw in ("yes", "true", "1")

            accelerated_raw = _get_str(
                med, "acceleratedAssessment", "accelerated_assessment",
                "accelerated",
            ).lower()
            accelerated = accelerated_raw in ("yes", "true", "1")

            new_substance_raw = _get_str(
                med, "newActiveSubstance", "new_active_substance",
                "novel_active_substance", "activeSubstanceNew",
            ).lower()
            new_active_substance = new_substance_raw in ("yes", "true", "1")

            additional_monitoring_raw = _get_str(
                med, "additionalMonitoring", "additional_monitoring",
                "blackTriangle", "black_triangle",
            ).lower()
            additional_monitoring = additional_monitoring_raw in ("yes", "true", "1")

            # Prevalence category (derived from orphan + indication text)
            prevalence = _classify_prevalence(orphan, indication)

            # Hierarchical therapeutic area classification
            broad_category, subcategory = _classify_therapeutic_area(
                indication, therapeutic_area, atc_code,
            )

            # Molecule type classification (uses reference data + INN rules)
            mol_type = _classify_molecule_type(substance, medicine_type, indication)

            # Route of administration (uses reference data + defaults)
            route = _classify_route(substance, mol_type, indication, name)

            # Mechanism of action class (from reference data)
            moa = _classify_moa(substance)

            # Track raw therapeutic areas (for backward compat)
            if therapeutic_area:
                for area in re.split(r"[;,]", therapeutic_area):
                    area = area.strip()
                    if area:
                        area_set.add(area)

            # Track MAHs
            if mah:
                mah_set.add(mah)

            # Track ATC Level 1+2 codes (e.g. "L01" from "L01FF02")
            if atc_code and len(atc_code) >= 3:
                prefix = atc_code[:3].upper()
                atc_set.add(prefix)

            # Track first approval per substance
            substance_key = substance.lower().strip()
            if substance_key and auth_date:
                substance_dates.setdefault(substance_key, []).append(auth_date)

            record = {
                "name": name,
                "active_substance": substance,
                "therapeutic_indication": indication,
                "authorisation_status": status,
                "ema_number": ema_number,
                "therapeutic_area": therapeutic_area,
                "broad_therapeutic_area": broad_category,
                "therapeutic_subcategory": subcategory,
                "orphan_medicine": orphan,
                "authorisation_date": auth_date,
                "url": url,
                "generic": is_generic,
                "biosimilar": is_biosimilar,
                "atc_code": atc_code,
                "marketing_authorisation_holder": mah,
                "conditional_approval": conditional,
                "exceptional_circumstances": exceptional,
                "accelerated_assessment": accelerated,
                "new_active_substance": new_active_substance,
                "additional_monitoring": additional_monitoring,
                "medicine_type": medicine_type,
                "prevalence_category": prevalence,
                "molecule_type": mol_type,
                "route_of_administration": route,
                "moa_class": moa,
            }
            enriched.append(record)

        # Compute first approval dates per substance
        for subst, dates in substance_dates.items():
            sorted_dates = sorted(d for d in dates if d)
            if sorted_dates:
                self._first_approval_dates[subst] = sorted_dates[0]

        # Mark first_approval flag on each record
        for rec in enriched:
            subst_key = rec["active_substance"].lower().strip()
            first_date = self._first_approval_dates.get(subst_key, "")
            rec["first_approval"] = (
                bool(rec["authorisation_date"])
                and rec["authorisation_date"] == first_date
            )

        self._medicines = enriched
        self._therapeutic_areas = sorted(area_set)
        self._mahs = sorted(mah_set)
        self._atc_prefixes = sorted(atc_set)
        self._loaded = True
        logger.info(
            "Analogue service loaded: %d medicines, %d therapeutic areas, "
            "%d MAHs, %d ATC prefixes",
            len(self._medicines), len(self._therapeutic_areas),
            len(self._mahs), len(self._atc_prefixes),
        )

    def get_therapeutic_areas(self) -> list[str]:
        return self._therapeutic_areas

    def get_filter_options(self) -> dict:
        """Return all available filter options for the frontend."""
        statuses: set[str] = set()
        molecule_types: set[str] = set()
        routes: set[str] = set()
        moa_classes: set[str] = set()
        # Collect which broad categories and subcategories actually have medicines
        category_subs: dict[str, set[str]] = {}

        for med in self._medicines:
            if med["authorisation_status"]:
                statuses.add(med["authorisation_status"])
            broad = med.get("broad_therapeutic_area", "")
            sub = med.get("therapeutic_subcategory", "")
            if broad:
                category_subs.setdefault(broad, set())
                if sub:
                    category_subs[broad].add(sub)
            if med.get("molecule_type"):
                molecule_types.add(med["molecule_type"])
            if med.get("route_of_administration"):
                routes.add(med["route_of_administration"])
            if med.get("moa_class"):
                moa_classes.add(med["moa_class"])

        # Build taxonomy for frontend: only categories that have medicines
        taxonomy = []
        for broad_name in sorted(category_subs.keys()):
            subs = sorted(category_subs[broad_name])
            taxonomy.append({
                "name": broad_name,
                "subcategories": subs,
            })

        return {
            "therapeutic_areas": self._therapeutic_areas,
            "therapeutic_taxonomy": taxonomy,
            "year_ranges": [
                {"label": "Last 3 years", "value": 3},
                {"label": "Last 5 years", "value": 5},
                {"label": "Last 10 years", "value": 10},
                {"label": "Last 15 years", "value": 15},
                {"label": "All time", "value": 0},
            ],
            "statuses": sorted(statuses),
            "mahs": self._mahs,
            "atc_prefixes": [
                {"code": code, "label": f"{code} — {ATC_LEVEL1.get(code[0], '')}"}
                for code in self._atc_prefixes
            ],
            "prevalence_categories": ["ultra-rare", "rare", "non-rare"],
            "molecule_types": sorted(molecule_types),
            "routes_of_administration": sorted(routes),
            "moa_classes": sorted(moa_classes),
        }

    def search(
        self,
        therapeutic_area: str = "",
        broad_therapeutic_area: str = "",
        therapeutic_subcategory: str = "",
        orphan: str = "",
        years_since_approval: int = 0,
        first_approval: str = "",
        status: str = "",
        substance: str = "",
        name: str = "",
        exclude_generics: bool = False,
        exclude_biosimilars: bool = False,
        atc_code: str = "",
        mah: str = "",
        conditional_approval: str = "",
        exceptional_circumstances: str = "",
        accelerated_assessment: str = "",
        new_active_substance: str = "",
        additional_monitoring: str = "",
        prevalence_category: str = "",
        indication_keyword: str = "",
        molecule_type: str = "",
        route_of_administration: str = "",
        moa_class: str = "",
        limit: int = 0,
    ) -> list[dict]:
        """Search for analogue medicines matching the given filters.

        Args:
            limit: Maximum number of results to return. 0 means no limit.
        """
        if not self._loaded:
            return []

        cutoff_date = ""
        if years_since_approval > 0:
            cutoff = date.today() - timedelta(days=years_since_approval * 365)
            cutoff_date = cutoff.isoformat()

        results = []
        area_lower = therapeutic_area.lower().strip()
        broad_lower = broad_therapeutic_area.lower().strip()
        sub_lower = therapeutic_subcategory.lower().strip()
        status_lower = status.lower().strip()
        substance_lower = substance.lower().strip()
        name_lower = name.lower().strip()
        atc_lower = atc_code.lower().strip()
        mah_lower = mah.lower().strip()
        prevalence_lower = prevalence_category.lower().strip()
        keyword_lower = indication_keyword.lower().strip()
        mol_type_lower = molecule_type.lower().strip()
        route_lower = route_of_administration.lower().strip()
        moa_lower = moa_class.lower().strip()

        for med in self._medicines:
            # Filter: broad therapeutic area (hierarchical)
            if broad_lower and med.get("broad_therapeutic_area", "").lower() != broad_lower:
                continue

            # Filter: therapeutic subcategory (hierarchical)
            if sub_lower and med.get("therapeutic_subcategory", "").lower() != sub_lower:
                continue

            # Filter: raw therapeutic area (legacy, backward compatible)
            if area_lower and area_lower not in med["therapeutic_area"].lower():
                continue

            # Filter: orphan status
            if orphan == "yes" and not med["orphan_medicine"]:
                continue
            if orphan == "no" and med["orphan_medicine"]:
                continue

            # Filter: years since approval
            if cutoff_date:
                if not med["authorisation_date"] or med["authorisation_date"] < cutoff_date:
                    continue

            # Filter: first approval
            if first_approval == "yes" and not med["first_approval"]:
                continue
            if first_approval == "no" and med["first_approval"]:
                continue

            # Filter: authorisation status
            if status_lower and med["authorisation_status"].lower() != status_lower:
                continue

            # Filter: substance name (partial match)
            if substance_lower and substance_lower not in med["active_substance"].lower():
                continue

            # Filter: medicine name (partial match)
            if name_lower and name_lower not in med["name"].lower():
                continue

            # Filter: exclude generics
            if exclude_generics and med["generic"]:
                continue

            # Filter: exclude biosimilars
            if exclude_biosimilars and med["biosimilar"]:
                continue

            # Filter: ATC code (prefix match)
            if atc_lower and not med["atc_code"].lower().startswith(atc_lower):
                continue

            # Filter: MAH / company (partial match)
            if mah_lower and mah_lower not in med["marketing_authorisation_holder"].lower():
                continue

            # Filter: conditional approval
            if conditional_approval == "yes" and not med["conditional_approval"]:
                continue
            if conditional_approval == "no" and med["conditional_approval"]:
                continue

            # Filter: exceptional circumstances
            if exceptional_circumstances == "yes" and not med["exceptional_circumstances"]:
                continue
            if exceptional_circumstances == "no" and med["exceptional_circumstances"]:
                continue

            # Filter: accelerated assessment
            if accelerated_assessment == "yes" and not med["accelerated_assessment"]:
                continue
            if accelerated_assessment == "no" and med["accelerated_assessment"]:
                continue

            # Filter: new active substance
            if new_active_substance == "yes" and not med["new_active_substance"]:
                continue
            if new_active_substance == "no" and med["new_active_substance"]:
                continue

            # Filter: additional monitoring (black triangle)
            if additional_monitoring == "yes" and not med["additional_monitoring"]:
                continue
            if additional_monitoring == "no" and med["additional_monitoring"]:
                continue

            # Filter: prevalence category
            if prevalence_lower and med["prevalence_category"] != prevalence_lower:
                continue

            # Filter: indication keyword search
            if keyword_lower and keyword_lower not in med["therapeutic_indication"].lower():
                continue

            # Filter: molecule type (partial match for text input)
            if mol_type_lower and mol_type_lower not in med.get("molecule_type", "").lower():
                continue

            # Filter: route of administration (partial match for text input)
            if route_lower and route_lower not in med.get("route_of_administration", "").lower():
                continue

            # Filter: mechanism of action class (partial match)
            if moa_lower and moa_lower not in med.get("moa_class", "").lower():
                continue

            results.append(med)

        results.sort(key=lambda r: r.get("authorisation_date", ""), reverse=True)
        return results[:limit] if limit > 0 else results


def _get_str(data: dict, *keys: str) -> str:
    """Try multiple possible key names, return first non-empty value."""
    for key in keys:
        val = data.get(key)
        if val is not None:
            return str(val).strip()
    return ""


def _normalize_date(raw: str) -> str:
    """Normalize various date formats to YYYY-MM-DD."""
    raw = raw.strip()
    if not raw:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw
    if re.match(r"^\d{8}$", raw):
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    m = re.match(r"^(\d{1,2})[./](\d{1,2})[./](\d{4})$", raw)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    m = re.match(r"^(\d{4}-\d{2}-\d{2})T", raw)
    if m:
        return m.group(1)
    m = re.match(r"^(\d{4})$", raw)
    if m:
        return f"{raw}-01-01"
    return raw
