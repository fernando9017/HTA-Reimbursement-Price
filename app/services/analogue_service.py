"""Analogue selection service.

Uses EMA medicine data to find analogues for a given therapy based on
configurable filters: therapeutic area, orphan status, years since
approval, first approval, authorisation status, ATC code, marketing
authorisation holder, regulatory pathway flags, prevalence category,
line of therapy, treatment setting, evidence tier, and HTA outcomes.
"""

import logging
import re
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# ── Line of therapy extraction ────────────────────────────────────────

LINE_OF_THERAPY_PATTERNS: dict[str, list[str]] = {
    "1L / First-line": [
        r"\bfirst[- ]line\b",
        r"\b1st[- ]line\b",
        r"\b1L\b",
        r"\btreatment[- ]na[iï]ve\b",
        r"\bpreviously untreated\b",
        r"\bnewly diagnosed\b",
        r"\binitial therapy\b",
        r"\bfront[- ]line\b",
    ],
    "2L / Second-line": [
        r"\bsecond[- ]line\b",
        r"\b2nd[- ]line\b",
        r"\b2L\b",
        r"\bpreviously treated\b",
        r"\bafter.*(?:prior|previous|failure)\b",
        r"\brelapsed\b",
        r"\brefractory\b",
    ],
    "3L+ / Later-line": [
        r"\bthird[- ]line\b",
        r"\b3rd[- ]line\b",
        r"\b3L\b",
        r"\blater[- ]line\b",
        r"\bheavily pretreated\b",
        r"\bmultiple prior\b",
    ],
    "Adjuvant": [
        r"\badjuvant\b",
    ],
    "Neoadjuvant": [
        r"\bneoadjuvant\b",
        r"\bneo-adjuvant\b",
    ],
    "Maintenance": [
        r"\bmaintenance\b",
    ],
}

TREATMENT_SETTING_PATTERNS: dict[str, list[str]] = {
    "Monotherapy": [
        r"\bmonotherapy\b",
        r"\bas a single agent\b",
        r"\bas monotherapy\b",
    ],
    "Combination": [
        r"\bcombination\b",
        r"\bin combination with\b",
        r"\bwith (?:chemotherapy|radiotherapy|platinum)\b",
    ],
}

# Compiled regex cache
_LOT_COMPILED: dict[str, list[re.Pattern]] = {
    lot: [re.compile(p, re.IGNORECASE) for p in patterns]
    for lot, patterns in LINE_OF_THERAPY_PATTERNS.items()
}
_SETTING_COMPILED: dict[str, list[re.Pattern]] = {
    s: [re.compile(p, re.IGNORECASE) for p in patterns]
    for s, patterns in TREATMENT_SETTING_PATTERNS.items()
}


def _extract_line_of_therapy(text: str) -> list[str]:
    """Extract line-of-therapy labels from indication text."""
    found: list[str] = []
    for lot, patterns in _LOT_COMPILED.items():
        for pat in patterns:
            if pat.search(text):
                found.append(lot)
                break
    return found


def _extract_treatment_setting(text: str) -> list[str]:
    """Extract treatment setting labels from indication text."""
    found: list[str] = []
    for setting, patterns in _SETTING_COMPILED.items():
        for pat in patterns:
            if pat.search(text):
                found.append(setting)
                break
    return found


def _classify_evidence_tier(
    conditional: bool, exceptional: bool, accelerated: bool,
    new_active_substance: bool, orphan: bool,
) -> str:
    """Infer evidence tier from regulatory pathway flags.

    Returns a label indicating the likely robustness of the evidence package.
    """
    if conditional:
        return "Conditional (limited data)"
    if exceptional:
        return "Exceptional circumstances"
    if accelerated and new_active_substance:
        return "Accelerated (strong package)"
    if orphan:
        return "Orphan (may have smaller trials)"
    return "Standard"


def _split_indications(text: str) -> list[str]:
    """Split a multi-indication text into individual indication segments.

    EMA indication text may contain multiple indications separated by:
    - Bullet or numbered lists
    - Product name repeated at sentence boundaries (e.g. ``Product is
      indicated for X.  Product as monotherapy is indicated for Y.``)
    - HTML entities (``&nbsp;``) separating indication blocks
    - Semicolons after an ``indicated for:`` preamble
    """
    if not text or not text.strip():
        return [text] if text else []

    # ── Normalise HTML entities & whitespace ──────────────────────────
    t = re.sub(r"&nbsp;|&#160;", " ", text)
    t = re.sub(r"&[a-z]+;", " ", t)
    t = re.sub(r"&#\d+;", " ", t)
    t = re.sub(r"\s+", " ", t).strip()

    # 1. Bullet / numbered lists (newline-delimited)
    lines = t.split("\n")
    bullets = [
        ln.strip() for ln in lines
        if re.match(r"^\s*(?:[-•–]\s+|\d+[.)]\s+)", ln.strip())
    ]
    if len(bullets) >= 2:
        return [re.sub(r"^[-•–]\s+|\d+[.)]\s+", "", b).strip() for b in bullets]

    # 2. Product-name-repeated pattern
    #    Detect when the same product name introduces multiple indication
    #    clauses separated by sentence boundaries (period + space).
    name_m = re.match(r"^([A-Z][a-zA-Z0-9-]+)", t)
    if name_m:
        prod = name_m.group(1)
        # Split after a period (end of previous indication) before the
        # product name reappears to start a new clause.
        parts = re.split(
            r"(?<=\.)\s+(?=" + re.escape(prod) + r"\b)",
            t,
        )
        if len(parts) >= 2:
            return [p.strip() for p in parts if p.strip()]

    # 3. "indicated for/in:" followed by semicolons or dash-separated items
    cm = re.search(r"indicated\s+(?:for|in)\s*:?\s*", t, re.IGNORECASE)
    if cm:
        rest = t[cm.end():]
        dash_parts = re.split(r"\s*[-–]\s+(?=[A-Z])", rest)
        if len(dash_parts) >= 2:
            return [p.strip().rstrip(".;,") for p in dash_parts if p.strip()]
        semi_parts = [p.strip().rstrip(".;,") for p in rest.split(";") if p.strip()]
        if len(semi_parts) >= 2:
            return semi_parts

    # 4. Multiple sentences each containing "is indicated"
    sentences = re.split(r"(?<=\.)\s+", t)
    ind_sents = [
        s for s in sentences
        if re.search(r"\bis indicated\b", s, re.IGNORECASE)
    ]
    if len(ind_sents) >= 2:
        return [s.strip() for s in ind_sents]

    return [t]

# ── Therapeutic area taxonomy ─────────────────────────────────────────
# Broad categories with keyword-based classification and sub-categories.
# Keywords are matched case-insensitively against the combined text of the
# medicine's therapeutic area (condition) and therapeutic indication fields.

THERAPEUTIC_TAXONOMY: dict[str, dict] = {
    "Oncology": {
        "keywords": [
            "oncology", "cancer", "neoplasm", "tumour", "tumor",
            "carcinoma", "malignant", "malignancy", "antineoplastic",
            "leukaemia", "leukemia", "lymphoma", "myeloma", "sarcoma",
            "melanoma", "glioblastoma", "glioma", "mesothelioma",
        ],
        "subcategories": {
            "Solid Tumours": [
                "breast", "lung", "nsclc", "non-small cell", "small cell lung",
                "prostate", "colorectal", "colon", "rectal",
                "melanoma", "renal", "kidney",
                "hepatocellular", "liver cancer", "pancrea",
                "gastric", "stomach", "ovarian", "endometrial", "uterine",
                "bladder", "urothelial", "thyroid",
                "glioblastoma", "glioma", "mesothelioma",
                "cholangiocarcinoma", "oesophageal", "esophageal",
                "head and neck", "cervical cancer",
                "sarcoma", "neuroblastoma", "retinoblastoma",
                "squamous cell", "basal cell", "merkel",
            ],
            "Haematological Malignancies": [
                "leukaemia", "leukemia", "lymphoma", "myeloma",
                "acute myeloid", "chronic myeloid", "myelodysplastic",
                "myelofibrosis", "hodgkin", "lymphocytic", "lymphoblastic",
                "mantle cell", "follicular", "waldenstrom",
                "polycythaemia", "myeloproliferative",
            ],
        },
    },
    "Immunology": {
        "keywords": [
            "immunolog", "autoimmun", "rheumatol", "transplant",
            "graft", "lupus", "psoriatic arthritis", "ankylosing",
        ],
        "subcategories": {
            "Autoimmune & Inflammatory": [
                "rheumatoid", "lupus", "psoriatic arthritis",
                "ankylosing spondylitis", "axial spondyloarthritis",
                "vasculitis", "scleroderma", "dermatomyositis",
                "myasthenia", "autoimmun",
            ],
            "Transplantation": [
                "transplant", "graft rejection", "graft-versus-host",
            ],
        },
    },
    "Neurology": {
        "keywords": [
            "neurology", "neurolog", "epilepsy", "seizure",
            "parkinson", "alzheimer", "dementia", "migraine",
            "multiple sclerosis", "spinal muscular atrophy",
            "narcolepsy", "huntington", "amyotrophic",
        ],
        "subcategories": {
            "Neurodegenerative": [
                "parkinson", "alzheimer", "dementia", "huntington",
                "amyotrophic", "motor neuron",
            ],
            "Neuromuscular": [
                "spinal muscular atrophy", "muscular dystrophy",
                "duchenne", "myasthenia", "neuropath",
                "charcot-marie", "myotonic",
            ],
            "Epilepsy & Seizures": [
                "epilepsy", "seizure", "dravet", "lennox",
            ],
            "Pain & Migraine": [
                "migraine", "neuropathic pain", "fibromyalgia",
                "chronic pain",
            ],
        },
    },
    "Infectious Diseases": {
        "keywords": [
            "infection", "infectious", "anti-infective",
            "antiviral", "antibacterial", "antifungal",
            "hiv", "hepatitis", "tuberculosis", "vaccine",
            "immunisation", "immunization", "covid",
            "influenza", "malaria",
        ],
        "subcategories": {
            "HIV": ["hiv", "human immunodeficiency"],
            "Hepatitis": ["hepatitis"],
            "Vaccines": [
                "vaccine", "immunisation", "immunization",
                "prevention of covid", "prevention of influenza",
            ],
            "Bacterial & Fungal": [
                "antibacterial", "antifungal", "bacterial",
                "fungal", "tuberculosis", "pneumonia",
                "sepsis", "mrsa",
            ],
        },
    },
    "Endocrinology & Metabolism": {
        "keywords": [
            "endocrin", "metaboli", "diabetes", "thyroid",
            "adrenal", "pituitary", "glycaemi", "insulin",
            "obesity", "lipodystrophy",
        ],
        "subcategories": {
            "Diabetes": [
                "diabetes", "glycaemi", "glycemi", "insulin",
                "hyperglycaemia",
            ],
            "Metabolic Disorders": [
                "fabry", "gaucher", "pompe", "mucopolysaccharid",
                "phenylketonuria", "metabolic", "lysosomal",
                "lipodystrophy",
            ],
            "Hormonal & Growth": [
                "growth hormone", "acromegaly", "thyroid",
                "adrenal", "pituitary", "hypogonadism",
                "testosterone", "cushing",
            ],
        },
    },
    "Cardiology": {
        "keywords": [
            "cardio", "cardiovascular", "heart", "hypertension",
            "arrhythmia", "coronary", "atherosclerosis",
            "atrial fibrillation",
        ],
        "subcategories": {
            "Heart Failure & Hypertension": [
                "heart failure", "hypertension", "cardiomyopathy",
                "angina",
            ],
            "Thrombosis & Anticoagulation": [
                "thrombosis", "embolism", "anticoagul",
                "antithrombotic", "dvt", "atrial fibrillation",
            ],
            "Lipid Disorders": [
                "cholesterol", "hypercholesterol",
                "hyperlipid", "dyslipid",
            ],
        },
    },
    "Respiratory": {
        "keywords": [
            "respiratory", "pulmonary", "lung disease",
            "asthma", "copd", "bronch", "cystic fibrosis",
        ],
        "subcategories": {
            "Asthma & COPD": [
                "asthma", "copd", "chronic obstructive", "bronch",
            ],
            "Pulmonary Hypertension": [
                "pulmonary arterial hypertension",
                "pulmonary hypertension",
            ],
            "Cystic Fibrosis": ["cystic fibrosis"],
        },
    },
    "Haematology": {
        "keywords": [
            "haematolog", "hematolog", "anaemia", "anemia",
            "haemophilia", "hemophilia", "thalassaemia", "thalassemia",
            "sickle cell", "coagulation disorder", "bleeding",
        ],
        "subcategories": {
            "Anaemia & Haemoglobinopathies": [
                "anaemia", "anemia", "iron deficiency",
                "thalassaemia", "thalassemia", "sickle cell",
            ],
            "Coagulation Disorders": [
                "haemophilia", "hemophilia", "von willebrand",
                "coagulation", "bleeding disorder",
            ],
        },
    },
    "Gastroenterology": {
        "keywords": [
            "gastro", "intestin", "bowel", "crohn",
            "colitis", "digestive",
        ],
        "subcategories": {
            "IBD": [
                "crohn", "ulcerative colitis", "inflammatory bowel",
            ],
            "Other GI": [
                "gastro", "reflux", "irritable bowel",
                "constipation", "pancreatitis",
            ],
        },
    },
    "Hepatology": {
        "keywords": [
            "hepat", "liver", "cirrhosis", "biliary",
            "nafld", "nash",
        ],
        "subcategories": {},
    },
    "Dermatology": {
        "keywords": [
            "dermatol", "skin", "psoriasis", "dermatitis",
            "eczema", "alopecia", "vitiligo",
        ],
        "subcategories": {
            "Psoriasis": ["psoriasis"],
            "Atopic Dermatitis & Eczema": [
                "atopic dermatitis", "eczema",
            ],
        },
    },
    "Ophthalmology": {
        "keywords": [
            "ophthalm", "retinal", "macular", "glaucoma",
            "vision loss", "eye disease",
        ],
        "subcategories": {
            "Retinal Disorders": [
                "macular", "retinal", "retinitis", "retinopathy",
            ],
        },
    },
    "Rare & Genetic Diseases": {
        "keywords": [
            "rare disease", "genetic disorder", "gene therapy",
            "hereditary", "congenital",
        ],
        "subcategories": {
            "Gene Therapies": ["gene therapy", "gene replacement"],
            "Genetic Disorders": [
                "genetic", "hereditary", "congenital",
            ],
        },
    },
}


def _classify_therapeutic_area(
    therapeutic_area: str, indication: str, atc_code: str = "",
) -> tuple[str, str]:
    """Classify a medicine into a broad therapeutic category and sub-category.

    Returns (category, subcategory) tuple.  Falls back to ("Other", "") when
    no taxonomy keywords match.
    """
    combined = f"{therapeutic_area} {indication}".lower()

    best_cat = ""
    best_cat_score = 0
    best_sub = ""

    for category, spec in THERAPEUTIC_TAXONOMY.items():
        cat_score = sum(1 for kw in spec["keywords"] if kw in combined)
        if cat_score > best_cat_score:
            best_cat_score = cat_score
            best_cat = category
            # Check subcategories
            best_sub = ""
            best_sub_score = 0
            for sub_name, sub_keywords in spec["subcategories"].items():
                sub_score = sum(1 for kw in sub_keywords if kw in combined)
                if sub_score > best_sub_score:
                    best_sub_score = sub_score
                    best_sub = sub_name

    if not best_cat:
        return ("Other", "")

    return (best_cat, best_sub)


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


# ── HTA-to-indication matching helpers ────────────────────────────────

_INDICATION_STOP_WORDS = frozenset({
    "the", "for", "and", "with", "who", "have", "has", "been", "that",
    "this", "from", "are", "were", "was", "will", "being", "their",
    "which", "after", "prior", "other", "than", "also", "used",
    "indicated", "treatment", "patients", "adult", "adults", "therapy",
    "received", "given", "following", "either", "more", "those",
    "should", "dose", "including",
})


def _extract_indication_keywords(text: str) -> set[str]:
    """Extract significant words (4+ chars, not stop-words) from text."""
    return {
        w for w in re.findall(r"[a-zA-Z]{4,}", text.lower())
        if w not in _INDICATION_STOP_WORDS
    }


def _match_assessment_to_indication(
    assessments: list[dict], indication: str,
) -> dict:
    """Pick the assessment best matching a specific indication segment.

    Scores each assessment by keyword overlap with the indication text.
    Prefers higher overlap; ties broken by most recent date.  Falls back
    to the first (most recent) assessment when nothing matches.
    """
    if not assessments:
        return {}
    if not indication:
        return assessments[0]

    keywords = _extract_indication_keywords(indication)
    if not keywords:
        return assessments[0]

    best_score = 0.0
    best = assessments[0]  # default: most recent

    for a in assessments:
        a_text = a.get("indication_text", "").lower()
        if not a_text:
            continue
        matches = sum(1 for kw in keywords if kw in a_text)
        score = matches / len(keywords)
        if score > best_score or (
            score > 0 and score == best_score
            and a.get("date", "") > best.get("date", "")
        ):
            best_score = score
            best = a

    return best


class AnalogueService:
    """Finds analogue medicines from EMA data using multi-criteria filters."""

    def __init__(self) -> None:
        self._medicines: list[dict] = []
        self._first_approval_dates: dict[str, str] = {}
        self._therapeutic_areas: list[str] = []
        self._therapeutic_taxonomy: dict[str, list[str]] = {}
        self._mahs: list[str] = []
        self._atc_prefixes: list[str] = []
        # HTA cross-reference: substance_lower → {country_code → summary_dict}
        self._hta_summaries: dict[str, dict[str, dict]] = {}
        self._hta_countries: list[str] = []
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_from_ema(self, raw_medicines: list[dict]) -> None:
        """Enrich and index EMA medicine records for analogue filtering."""
        enriched: list[dict] = []
        substance_dates: dict[str, list[str]] = {}
        area_set: set[str] = set()
        taxonomy_index: dict[str, set[str]] = {}
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

            # Medicine type / legal basis
            medicine_type = _get_str(
                med, "medicineType", "medicine_type", "product_type",
                "productGroup", "product_group",
            )

            # Prevalence category (derived from orphan + indication text)
            prevalence = _classify_prevalence(orphan, indication)

            # Therapeutic category classification
            t_category, t_subcategory = _classify_therapeutic_area(
                therapeutic_area, indication, atc_code,
            )

            # Line of therapy and treatment setting (from indication text)
            lot = _extract_line_of_therapy(indication)
            treatment_setting = _extract_treatment_setting(indication)

            # Evidence tier (from regulatory pathway flags)
            evidence_tier = _classify_evidence_tier(
                conditional, exceptional, accelerated, new_active_substance, orphan,
            )

            # Split indications into segments
            indication_segments = _split_indications(indication)

            # Track taxonomy (category → subcategories that exist in data)
            if t_category:
                if t_category not in taxonomy_index:
                    taxonomy_index[t_category] = set()
                if t_subcategory:
                    taxonomy_index[t_category].add(t_subcategory)

            # Track therapeutic areas
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
                "indication_segments": indication_segments,
                "authorisation_status": status,
                "ema_number": ema_number,
                "therapeutic_area": therapeutic_area,
                "therapeutic_category": t_category,
                "therapeutic_subcategory": t_subcategory,
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
                "medicine_type": medicine_type,
                "prevalence_category": prevalence,
                "line_of_therapy": lot,
                "treatment_setting": treatment_setting,
                "evidence_tier": evidence_tier,
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
        self._therapeutic_taxonomy = {
            cat: sorted(subs) for cat, subs in sorted(taxonomy_index.items())
        }
        self._mahs = sorted(mah_set)
        self._atc_prefixes = sorted(atc_set)
        self._loaded = True
        logger.info(
            "Analogue service loaded: %d medicines, %d therapeutic categories, "
            "%d MAHs, %d ATC prefixes",
            len(self._medicines), len(self._therapeutic_taxonomy),
            len(self._mahs), len(self._atc_prefixes),
        )

    def get_therapeutic_areas(self) -> list[str]:
        return self._therapeutic_areas

    def unique_substances(self) -> list[str]:
        """Return sorted list of unique active substances."""
        return sorted({
            med["active_substance"]
            for med in self._medicines
            if med["active_substance"]
        })

    def set_hta_summaries(
        self,
        summaries: dict[str, dict[str, dict]],
        countries: list[str],
    ) -> None:
        """Store pre-computed HTA cross-reference data.

        Args:
            summaries: substance_lower → {country_code → summary_dict}
            countries: list of country codes with loaded HTA data
        """
        self._hta_summaries = summaries
        self._hta_countries = countries
        logger.info(
            "HTA cross-reference loaded: %d substances with assessments across %s",
            len(summaries), ", ".join(countries),
        )

    def get_filter_options(self) -> dict:
        """Return all available filter options for the frontend."""
        statuses: set[str] = set()
        lot_set: set[str] = set()
        setting_set: set[str] = set()
        tier_set: set[str] = set()
        for med in self._medicines:
            if med["authorisation_status"]:
                statuses.add(med["authorisation_status"])
            for lot in med.get("line_of_therapy", []):
                lot_set.add(lot)
            for s in med.get("treatment_setting", []):
                setting_set.add(s)
            tier = med.get("evidence_tier", "")
            if tier:
                tier_set.add(tier)

        return {
            "therapeutic_areas": self._therapeutic_areas,
            "therapeutic_taxonomy": [
                {"category": cat, "subcategories": subs}
                for cat, subs in self._therapeutic_taxonomy.items()
            ],
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
            "lines_of_therapy": sorted(lot_set),
            "treatment_settings": sorted(setting_set),
            "evidence_tiers": sorted(tier_set),
            "hta_countries": self._hta_countries,
        }

    def search(
        self,
        therapeutic_area: str = "",
        therapeutic_areas: list[str] | None = None,
        therapeutic_category: str = "",
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
        prevalence_category: str = "",
        indication_keyword: str = "",
        line_of_therapy: str = "",
        treatment_setting: str = "",
        evidence_tier: str = "",
        hta_country: str = "",
        limit: int = 200,
    ) -> list[dict]:
        """Search for analogue medicines matching the given filters.

        When indication_keyword is provided, results are expanded to
        per-indication rows (one row per matching indication segment).
        """
        if not self._loaded:
            return []

        cutoff_date = ""
        if years_since_approval > 0:
            cutoff = date.today() - timedelta(days=years_since_approval * 365)
            cutoff_date = cutoff.isoformat()

        results = []
        # Support both single string and list of areas (OR logic)
        areas_lower: list[str] = []
        if therapeutic_areas:
            areas_lower = [a.lower().strip() for a in therapeutic_areas if a.strip()]
        elif therapeutic_area:
            areas_lower = [therapeutic_area.lower().strip()]
        category_lower = therapeutic_category.lower().strip()
        subcategory_lower = therapeutic_subcategory.lower().strip()
        status_lower = status.lower().strip()
        substance_lower = substance.lower().strip()
        name_lower = name.lower().strip()
        atc_lower = atc_code.lower().strip()
        mah_lower = mah.lower().strip()
        prevalence_lower = prevalence_category.lower().strip()
        keyword_lower = indication_keyword.lower().strip()
        lot_filter = line_of_therapy.strip()
        setting_filter = treatment_setting.strip()
        tier_filter = evidence_tier.strip().lower()
        hta_filter = hta_country.upper().strip()

        for med in self._medicines:
            # Filter: therapeutic category (broad)
            if category_lower and med["therapeutic_category"].lower() != category_lower:
                continue

            # Filter: therapeutic subcategory (narrow)
            if subcategory_lower and med["therapeutic_subcategory"].lower() != subcategory_lower:
                continue

            # Filter: therapeutic area(s) — OR logic across multiple areas (legacy)
            if areas_lower:
                med_area_lower = med["therapeutic_area"].lower()
                if not any(a in med_area_lower for a in areas_lower):
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

            # Filter: prevalence category
            if prevalence_lower and med["prevalence_category"] != prevalence_lower:
                continue

            # Filter: line of therapy
            if lot_filter and lot_filter not in med.get("line_of_therapy", []):
                continue

            # Filter: treatment setting
            if setting_filter and setting_filter not in med.get("treatment_setting", []):
                continue

            # Filter: evidence tier
            if tier_filter and med.get("evidence_tier", "").lower() != tier_filter:
                continue

            # Filter: HTA country (only show medicines with an HTA assessment in this country)
            if hta_filter:
                subst_key = med["active_substance"].lower().strip()
                hta_data = self._hta_summaries.get(subst_key, {})
                if hta_filter not in hta_data:
                    continue

            # Filter: indication keyword search — with per-indication expansion
            if keyword_lower:
                segments = med.get("indication_segments", [med["therapeutic_indication"]])
                matching_segments = [
                    seg for seg in segments if keyword_lower in seg.lower()
                ]
                if not matching_segments:
                    continue
                # Expand to per-indication rows
                for seg in matching_segments:
                    row = self._build_result_row(med, indication_segment=seg)
                    results.append(row)
                continue

            results.append(self._build_result_row(med))

        results.sort(key=lambda r: r.get("authorisation_date", ""), reverse=True)
        return results[:limit]

    def _build_result_row(
        self, med: dict, indication_segment: str = "",
    ) -> dict:
        """Build a result dict from a medicine record, attaching HTA summaries.

        When *indication_segment* is provided the best-matching assessment per
        country is selected via keyword overlap; otherwise the most recent
        assessment is used.
        """
        subst_key = med["active_substance"].lower().strip()
        hta_data = self._hta_summaries.get(subst_key, {})
        hta_list = []

        for cc, country_data in hta_data.items():
            assessments = country_data.get("assessments", [])
            if not assessments:
                continue

            best = _match_assessment_to_indication(assessments, indication_segment)

            hta_list.append({
                "country_code": cc,
                "agency": country_data["agency"],
                "has_assessment": True,
                "latest_date": best.get("date", ""),
                "rating": best.get("rating", ""),
                "rating_detail": best.get("rating_detail", ""),
            })

        row = {
            "name": med["name"],
            "active_substance": med["active_substance"],
            "therapeutic_indication": med["therapeutic_indication"],
            "indication_segment": indication_segment,
            "authorisation_status": med["authorisation_status"],
            "ema_number": med["ema_number"],
            "therapeutic_area": med["therapeutic_area"],
            "therapeutic_category": med["therapeutic_category"],
            "therapeutic_subcategory": med["therapeutic_subcategory"],
            "orphan_medicine": med["orphan_medicine"],
            "authorisation_date": med["authorisation_date"],
            "first_approval": med["first_approval"],
            "url": med["url"],
            "generic": med["generic"],
            "biosimilar": med["biosimilar"],
            "atc_code": med["atc_code"],
            "marketing_authorisation_holder": med["marketing_authorisation_holder"],
            "conditional_approval": med["conditional_approval"],
            "exceptional_circumstances": med["exceptional_circumstances"],
            "accelerated_assessment": med["accelerated_assessment"],
            "new_active_substance": med["new_active_substance"],
            "medicine_type": med["medicine_type"],
            "prevalence_category": med["prevalence_category"],
            "line_of_therapy": med.get("line_of_therapy", []),
            "treatment_setting": med.get("treatment_setting", []),
            "evidence_tier": med.get("evidence_tier", ""),
            "hta_summaries": hta_list,
        }
        return row


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
