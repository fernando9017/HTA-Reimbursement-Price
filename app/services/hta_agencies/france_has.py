"""France HAS (Haute Autorité de Santé) adapter.

Data source: BDPM (Base de Données Publique des Médicaments) TSV files.
Provides SMR (Service Médical Rendu) and ASMR (Amélioration du SMR) ratings
from the Commission de la Transparence opinions.

The BDPM database is the canonical source for all French medicines with their
HTA assessment outcomes.  It contains 12,000+ medicines with SMR/ASMR data.

No authentication required. Files are Latin-1 encoded, tab-separated, no headers.
"""

import asyncio
import logging
import re
from collections import defaultdict
from pathlib import Path

import httpx

from app.config import BDPM_BASE_URL, BDPM_ENCODING, BDPM_FILES, BDPM_SEPARATOR, REQUEST_TIMEOUT, SSL_VERIFY
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Number of retry attempts for each BDPM file download
_BDPM_MAX_RETRIES = 3

_SMR_EN: dict[str, str] = {
    "Important": "Major clinical benefit",
    "Modéré": "Moderate clinical benefit",
    "Faible": "Minor clinical benefit",
    "Insuffisant": "Insufficient clinical benefit",
    # Variant spellings and edge cases in BDPM data
    "important": "Major clinical benefit",
    "modéré": "Moderate clinical benefit",
    "faible": "Minor clinical benefit",
    "insuffisant": "Insufficient clinical benefit",
    "Bien fondé non déterminé": "Benefit not determined",
    "Non précisé": "Not specified",
}

_ASMR_EN: dict[str, str] = {
    "I": "Major therapeutic improvement",
    "II": "Important therapeutic improvement",
    "III": "Moderate therapeutic improvement",
    "IV": "Minor therapeutic improvement",
    "V": "No therapeutic improvement",
    "Sans objet": "Not applicable",
    "Non précisée": "Not specified",
}

_MOTIF_EN: dict[str, str] = {
    "Inscription": "Initial registration",
    "Inscription (première évaluation)": "Initial registration (first evaluation)",
    "Inscription (collectivités)": "Registration (hospital use)",
    "Renouvellement": "Renewal",
    "Renouvellement d'inscription": "Registration renewal",
    "Extension d'indication": "Indication extension",
    "Modification": "Modification",
    "Modification des conditions d'inscription": "Registration conditions modification",
    "Réévaluation": "Re-evaluation",
    "Réévaluation SMR et ASMR": "SMR and ASMR re-evaluation",
    "Radiation": "Delisting",
    "Rectificatif": "Correction",
}

# French → English medical term translations for indication text.
# Keys are lowercase French terms; values are English replacements.
# Terms are applied via longest-match-first substitution.
_INDICATION_FR_EN: dict[str, str] = {
    # ── Oncology ──────────────────────────────────────────────────────
    "cancer du sein": "breast cancer",
    "cancer du sein her2-positif": "HER2-positive breast cancer",
    "cancer du sein her2-négatif": "HER2-negative breast cancer",
    "cancer du sein triple négatif": "triple-negative breast cancer",
    "cancer du sein rh+/her2-": "HR+/HER2- breast cancer",
    "cancer du sein hormono-dépendant": "hormone receptor-positive breast cancer",
    "cancer du poumon": "lung cancer",
    "cancer du poumon non à petites cellules": "non-small cell lung cancer",
    "cancer du poumon à petites cellules": "small cell lung cancer",
    "cancer bronchique non à petites cellules": "non-small cell lung cancer",
    "cancer bronchique à petites cellules": "small cell lung cancer",
    "cancer de la prostate": "prostate cancer",
    "cancer de la prostate résistant à la castration": "castration-resistant prostate cancer",
    "cancer de la prostate métastatique": "metastatic prostate cancer",
    "cancer de la prostate hormonosensible": "hormone-sensitive prostate cancer",
    "cancer du rein": "renal cell carcinoma",
    "cancer du rein avancé": "advanced renal cell carcinoma",
    "cancer de l'ovaire": "ovarian cancer",
    "cancer de l'estomac": "gastric cancer",
    "cancer de la vessie": "bladder cancer",
    "cancer urothélial": "urothelial cancer",
    "cancer du côlon": "colon cancer",
    "cancer colorectal": "colorectal cancer",
    "cancer colorectal métastatique": "metastatic colorectal cancer",
    "cancer du pancréas": "pancreatic cancer",
    "cancer du foie": "liver cancer",
    "cancer de l'endomètre": "endometrial cancer",
    "cancer de la thyroïde": "thyroid cancer",
    "cancer du col de l'utérus": "cervical cancer",
    "cancer gastrique": "gastric cancer",
    "cancer de l'œsophage": "oesophageal cancer",
    "cancer de la tête et du cou": "head and neck cancer",
    "cancer des voies biliaires": "biliary tract cancer",
    "cancer du cholangiocarcinome": "cholangiocarcinoma",
    "cholangiocarcinome": "cholangiocarcinoma",
    "cancer médullaire de la thyroïde": "medullary thyroid cancer",
    "cancer différencié de la thyroïde": "differentiated thyroid cancer",
    "cancer des voies aérodigestives supérieures": "head and neck squamous cell carcinoma",
    "cancer épidermoïde de la tête et du cou": "head and neck squamous cell carcinoma",
    "cancer de la jonction gastro-œsophagienne": "gastro-oesophageal junction cancer",
    "adénocarcinome gastrique": "gastric adenocarcinoma",
    "adénocarcinome": "adenocarcinoma",
    "adénocarcinome pancréatique": "pancreatic adenocarcinoma",
    "carcinome hépatocellulaire": "hepatocellular carcinoma",
    "carcinome épidermoïde": "squamous cell carcinoma",
    "carcinome épidermoïde cutané": "cutaneous squamous cell carcinoma",
    "carcinome rénal": "renal cell carcinoma",
    "carcinome rénal à cellules claires": "clear cell renal cell carcinoma",
    "carcinome basocellulaire": "basal cell carcinoma",
    "carcinome urothélial": "urothelial carcinoma",
    "carcinome à cellules de merkel": "Merkel cell carcinoma",
    "carcinome médullaire de la thyroïde": "medullary thyroid carcinoma",
    "carcinome corticosurrénalien": "adrenocortical carcinoma",
    "mélanome": "melanoma",
    "mélanome avancé": "advanced melanoma",
    "mélanome métastatique": "metastatic melanoma",
    "mélanome cutané": "cutaneous melanoma",
    "mélanome uvéal": "uveal melanoma",
    "lymphome": "lymphoma",
    "lymphome hodgkinien": "Hodgkin lymphoma",
    "lymphome de hodgkin": "Hodgkin lymphoma",
    "lymphome non hodgkinien": "non-Hodgkin lymphoma",
    "lymphome diffus à grandes cellules b": "diffuse large B-cell lymphoma",
    "lymphome à cellules du manteau": "mantle cell lymphoma",
    "lymphome folliculaire": "follicular lymphoma",
    "lymphome de la zone marginale": "marginal zone lymphoma",
    "lymphome à cellules t": "T-cell lymphoma",
    "lymphome primitif du médiastin": "primary mediastinal B-cell lymphoma",
    "leucémie": "leukaemia",
    "leucémie lymphoïde chronique": "chronic lymphocytic leukaemia",
    "leucémie myéloïde chronique": "chronic myeloid leukaemia",
    "leucémie myéloïde aiguë": "acute myeloid leukaemia",
    "leucémie aiguë lymphoblastique": "acute lymphoblastic leukaemia",
    "leucémie aiguë myéloblastique": "acute myeloblastic leukaemia",
    "myélome multiple": "multiple myeloma",
    "myélome": "myeloma",
    "glioblastome": "glioblastoma",
    "gliome": "glioma",
    "mésothéliome": "mesothelioma",
    "mésothéliome pleural malin": "malignant pleural mesothelioma",
    "sarcome": "sarcoma",
    "sarcome des tissus mous": "soft tissue sarcoma",
    "liposarcome": "liposarcoma",
    "ostéosarcome": "osteosarcoma",
    "neuroblastome": "neuroblastoma",
    "rétinoblastome": "retinoblastoma",
    "tumeur stromale gastro-intestinale": "gastrointestinal stromal tumour",
    "tumeurs solides": "solid tumours",
    "tumeur solide": "solid tumour",
    "tumeur neuroendocrine": "neuroendocrine tumour",
    "tumeurs neuroendocrines": "neuroendocrine tumours",
    "tumeur desmoïde": "desmoid tumour",
    "tumeur cérébrale": "brain tumour",
    "tumeur du cerveau": "brain tumour",
    "macroglobulinémie de waldenström": "Waldenström's macroglobulinaemia",
    "syndrome myélodysplasique": "myelodysplastic syndrome",
    "syndromes myélodysplasiques": "myelodysplastic syndromes",
    "myélofibrose": "myelofibrosis",
    "polycythémie vraie": "polycythaemia vera",
    "maladie de vaquez": "polycythaemia vera",
    "néoplasme myéloprolifératif": "myeloproliferative neoplasm",
    "mastocytose": "mastocytosis",
    "mastocytose systémique": "systemic mastocytosis",
    "thymome": "thymoma",
    "tumeur de la prostate": "prostate tumour",
    "instabilité des microsatellites": "microsatellite instability",
    "déficience du système de réparation des mésappariements": "mismatch repair deficiency",
    "cbnpc": "NSCLC",
    # ── Haematology ───────────────────────────────────────────────────
    "anémie": "anaemia",
    "anémie aplasique": "aplastic anaemia",
    "anémie ferriprive": "iron deficiency anaemia",
    "anémie hémolytique auto-immune": "autoimmune haemolytic anaemia",
    "thrombocytopénie": "thrombocytopenia",
    "thrombocytopénie immune": "immune thrombocytopenia",
    "hémophilie": "haemophilia",
    "hémophilie a": "haemophilia A",
    "hémophilie b": "haemophilia B",
    "neutropénie": "neutropenia",
    "neutropénie fébrile": "febrile neutropenia",
    "drépanocytose": "sickle cell disease",
    "thalassémie": "thalassaemia",
    "bêta-thalassémie": "beta-thalassaemia",
    "maladie de von willebrand": "von Willebrand disease",
    "purpura thrombopénique immunologique": "immune thrombocytopenic purpura",
    "purpura thrombotique thrombocytopénique": "thrombotic thrombocytopenic purpura",
    "coagulation intravasculaire disséminée": "disseminated intravascular coagulation",
    "maladie de castleman": "Castleman disease",
    "maladie du greffon contre l'hôte": "graft-versus-host disease",
    # ── Immunology / Rheumatology ─────────────────────────────────────
    "polyarthrite rhumatoïde": "rheumatoid arthritis",
    "rhumatisme psoriasique": "psoriatic arthritis",
    "arthrite psoriasique": "psoriatic arthritis",
    "arthrite juvénile idiopathique": "juvenile idiopathic arthritis",
    "arthrite": "arthritis",
    "spondylarthrite ankylosante": "ankylosing spondylitis",
    "spondyloarthrite axiale": "axial spondyloarthritis",
    "spondylarthrite": "spondyloarthritis",
    "lupus érythémateux systémique": "systemic lupus erythematosus",
    "lupus": "lupus",
    "sclérose en plaques": "multiple sclerosis",
    "sclérodermie systémique": "systemic sclerosis",
    "vascularite": "vasculitis",
    "vascularite à anca": "ANCA-associated vasculitis",
    "artérite à cellules géantes": "giant cell arteritis",
    "maladie de behçet": "Behçet's disease",
    "psoriasis": "psoriasis",
    "psoriasis en plaques": "plaque psoriasis",
    "dermatite atopique": "atopic dermatitis",
    "eczéma": "eczema",
    "urticaire chronique spontanée": "chronic spontaneous urticaria",
    "urticaire": "urticaria",
    "alopécie areata": "alopecia areata",
    "vitiligo": "vitiligo",
    "hidradénite suppurée": "hidradenitis suppurativa",
    "pemphigus": "pemphigus",
    "maladie de crohn": "Crohn's disease",
    "rectocolite hémorragique": "ulcerative colitis",
    "colite ulcéreuse": "ulcerative colitis",
    "maladie inflammatoire chronique de l'intestin": "inflammatory bowel disease",
    # ── Cardiology / Vascular ─────────────────────────────────────────
    "insuffisance cardiaque": "heart failure",
    "insuffisance cardiaque chronique": "chronic heart failure",
    "insuffisance cardiaque à fraction d'éjection réduite": "heart failure with reduced ejection fraction",
    "insuffisance cardiaque à fraction d'éjection préservée": "heart failure with preserved ejection fraction",
    "hypertension artérielle": "arterial hypertension",
    "hypertension artérielle pulmonaire": "pulmonary arterial hypertension",
    "hypertension": "hypertension",
    "fibrillation auriculaire": "atrial fibrillation",
    "fibrillation auriculaire non valvulaire": "non-valvular atrial fibrillation",
    "infarctus du myocarde": "myocardial infarction",
    "maladie coronarienne": "coronary artery disease",
    "syndrome coronarien aigu": "acute coronary syndrome",
    "embolie pulmonaire": "pulmonary embolism",
    "thrombose veineuse profonde": "deep vein thrombosis",
    "maladie thromboembolique veineuse": "venous thromboembolism",
    "athérosclérose": "atherosclerosis",
    "hypercholestérolémie": "hypercholesterolaemia",
    "hypercholestérolémie familiale": "familial hypercholesterolaemia",
    "dyslipidémie": "dyslipidaemia",
    "hypertriglycéridémie": "hypertriglyceridaemia",
    "cardiomyopathie": "cardiomyopathy",
    "cardiomyopathie hypertrophique obstructive": "obstructive hypertrophic cardiomyopathy",
    "amylose cardiaque à transthyrétine": "transthyretin amyloid cardiomyopathy",
    "amylose": "amyloidosis",
    "accident vasculaire cérébral": "stroke",
    "avc": "stroke",
    "maladie artérielle périphérique": "peripheral arterial disease",
    "artériopathie oblitérante des membres inférieurs": "peripheral arterial disease",
    # ── Endocrinology / Metabolic ─────────────────────────────────────
    "diabète de type 2": "type 2 diabetes",
    "diabète de type 1": "type 1 diabetes",
    "diabète": "diabetes",
    "obésité": "obesity",
    "surpoids": "overweight",
    "hypothyroïdie": "hypothyroidism",
    "hyperthyroïdie": "hyperthyroidism",
    "maladie de basedow": "Graves' disease",
    "syndrome de cushing": "Cushing's syndrome",
    "insuffisance surrénalienne": "adrenal insufficiency",
    "maladie de gaucher": "Gaucher disease",
    "maladie de fabry": "Fabry disease",
    "maladie de pompe": "Pompe disease",
    "maladie de hunter": "Hunter syndrome",
    "maladie de hurler": "Hurler syndrome",
    "mucopolysaccharidose": "mucopolysaccharidosis",
    "phénylcétonurie": "phenylketonuria",
    "hyperparathyroïdie": "hyperparathyroidism",
    "hypoparathyroïdie": "hypoparathyroidism",
    "acromégalie": "acromegaly",
    "ostéoporose": "osteoporosis",
    "ostéoporose post-ménopausique": "postmenopausal osteoporosis",
    "goutte": "gout",
    "hyperuricémie": "hyperuricaemia",
    "syndrome métabolique": "metabolic syndrome",
    "hypoglycémie": "hypoglycaemia",
    "acidose tubulaire rénale distale": "distal renal tubular acidosis",
    "maladie de wilson": "Wilson's disease",
    "hémochromatose": "haemochromatosis",
    "déficit en hormone de croissance": "growth hormone deficiency",
    "retard de croissance": "growth retardation",
    # ── Neurology ─────────────────────────────────────────────────────
    "épilepsie": "epilepsy",
    "crises épileptiques": "epileptic seizures",
    "maladie de parkinson": "Parkinson's disease",
    "maladie d'alzheimer": "Alzheimer's disease",
    "démence": "dementia",
    "migraine": "migraine",
    "migraine chronique": "chronic migraine",
    "sclérose latérale amyotrophique": "amyotrophic lateral sclerosis",
    "neuropathie": "neuropathy",
    "neuropathie périphérique": "peripheral neuropathy",
    "neuropathie diabétique": "diabetic neuropathy",
    "amyotrophie spinale": "spinal muscular atrophy",
    "dystrophie musculaire de duchenne": "Duchenne muscular dystrophy",
    "dystrophie musculaire": "muscular dystrophy",
    "myasthénie": "myasthenia gravis",
    "syndrome de guillain-barré": "Guillain-Barré syndrome",
    "maladie de huntington": "Huntington's disease",
    "atrophie multisystématisée": "multiple system atrophy",
    "narcolepsie": "narcolepsy",
    "syndrome des jambes sans repos": "restless legs syndrome",
    "troubles du spectre de la neuromyélite optique": "neuromyelitis optica spectrum disorder",
    "douleur neuropathique": "neuropathic pain",
    "douleur chronique": "chronic pain",
    "douleur": "pain",
    "céphalée": "headache",
    # ── Psychiatry ────────────────────────────────────────────────────
    "dépression": "depression",
    "trouble dépressif majeur": "major depressive disorder",
    "dépression majeure": "major depression",
    "trouble bipolaire": "bipolar disorder",
    "schizophrénie": "schizophrenia",
    "trouble obsessionnel compulsif": "obsessive-compulsive disorder",
    "trouble du déficit de l'attention": "attention deficit disorder",
    "tdah": "ADHD",
    "trouble anxieux généralisé": "generalised anxiety disorder",
    "anxiété": "anxiety",
    "insomnie": "insomnia",
    "trouble du spectre autistique": "autism spectrum disorder",
    # ── Respiratory ───────────────────────────────────────────────────
    "asthme": "asthma",
    "asthme sévère": "severe asthma",
    "asthme éosinophilique": "eosinophilic asthma",
    "bronchopneumopathie chronique obstructive": "chronic obstructive pulmonary disease",
    "bpco": "COPD",
    "mucoviscidose": "cystic fibrosis",
    "fibrose pulmonaire idiopathique": "idiopathic pulmonary fibrosis",
    "fibrose pulmonaire": "pulmonary fibrosis",
    "pneumonie": "pneumonia",
    "bronchiolite": "bronchiolitis",
    "bronchectasie": "bronchiectasis",
    "sarcoïdose": "sarcoidosis",
    "pneumopathie interstitielle diffuse": "diffuse interstitial lung disease",
    # ── Infectious diseases ───────────────────────────────────────────
    "infection par le vih": "HIV infection",
    "vih": "HIV",
    "vih-1": "HIV-1",
    "hépatite c": "hepatitis C",
    "hépatite b": "hepatitis B",
    "hépatite b chronique": "chronic hepatitis B",
    "hépatite c chronique": "chronic hepatitis C",
    "hépatite": "hepatitis",
    "tuberculose": "tuberculosis",
    "covid-19": "COVID-19",
    "infection à cytomégalovirus": "cytomegalovirus infection",
    "cmv": "CMV",
    "infection fongique invasive": "invasive fungal infection",
    "aspergillose invasive": "invasive aspergillosis",
    "infection urinaire": "urinary tract infection",
    "infection à clostridioides difficile": "Clostridioides difficile infection",
    "infection par le virus respiratoire syncytial": "respiratory syncytial virus infection",
    "vrs": "RSV",
    "paludisme": "malaria",
    "infection bactérienne": "bacterial infection",
    "sepsis": "sepsis",
    "méningite": "meningitis",
    "endocardite": "endocarditis",
    # ── Ophthalmology ─────────────────────────────────────────────────
    "dégénérescence maculaire liée à l'âge": "age-related macular degeneration",
    "dégénérescence maculaire": "macular degeneration",
    "dmla": "AMD",
    "œdème maculaire diabétique": "diabetic macular oedema",
    "œdème maculaire": "macular oedema",
    "glaucome": "glaucoma",
    "glaucome à angle ouvert": "open-angle glaucoma",
    "rétinopathie diabétique": "diabetic retinopathy",
    "rétinite pigmentaire": "retinitis pigmentosa",
    "uvéite": "uveitis",
    "kératite": "keratitis",
    "sécheresse oculaire": "dry eye disease",
    "occlusion veineuse rétinienne": "retinal vein occlusion",
    # ── Nephrology ────────────────────────────────────────────────────
    "insuffisance rénale chronique": "chronic kidney disease",
    "insuffisance rénale": "renal insufficiency",
    "maladie rénale chronique": "chronic kidney disease",
    "glomérulonéphrite": "glomerulonephritis",
    "néphropathie à iga": "IgA nephropathy",
    "néphropathie": "nephropathy",
    "syndrome néphrotique": "nephrotic syndrome",
    "néphrite lupique": "lupus nephritis",
    "glomérulosclérose segmentaire et focale": "focal segmental glomerulosclerosis",
    "maladie polykystique des reins": "polycystic kidney disease",
    "syndrome hémolytique et urémique": "haemolytic uraemic syndrome",
    # ── Gastroenterology / Hepatology ─────────────────────────────────
    "cirrhose": "cirrhosis",
    "cirrhose biliaire primitive": "primary biliary cholangitis",
    "cholangite biliaire primitive": "primary biliary cholangitis",
    "cholangite sclérosante primitive": "primary sclerosing cholangitis",
    "stéatohépatite non alcoolique": "non-alcoholic steatohepatitis",
    "stéatose hépatique": "hepatic steatosis",
    "syndrome de l'intestin court": "short bowel syndrome",
    "reflux gastro-œsophagien": "gastro-oesophageal reflux disease",
    "syndrome de l'intestin irritable": "irritable bowel syndrome",
    "maladie cœliaque": "coeliac disease",
    "pancréatite": "pancreatitis",
    "pancréatite chronique": "chronic pancreatitis",
    "insuffisance pancréatique exocrine": "exocrine pancreatic insufficiency",
    "fibrose hépatique": "hepatic fibrosis",
    # ── Rare diseases ─────────────────────────────────────────────────
    "hémoglobinurie paroxystique nocturne": "paroxysmal nocturnal haemoglobinuria",
    "syndrome hémolytique et urémique atypique": "atypical haemolytic uraemic syndrome",
    "angio-œdème héréditaire": "hereditary angioedema",
    "angioedème héréditaire": "hereditary angioedema",
    "déficit immunitaire": "immunodeficiency",
    "déficit immunitaire primitif": "primary immunodeficiency",
    "déficit immunitaire combiné sévère": "severe combined immunodeficiency",
    "maladie de still": "Still's disease",
    "fièvre méditerranéenne familiale": "familial Mediterranean fever",
    "syndrome auto-inflammatoire": "autoinflammatory syndrome",
    "syndrome périodique associé à la cryopyrine": "cryopyrin-associated periodic syndrome",
    "sclérose tubéreuse de bourneville": "tuberous sclerosis complex",
    "neurofibromatose": "neurofibromatosis",
    "syndrome de prader-willi": "Prader-Willi syndrome",
    "syndrome de turner": "Turner syndrome",
    "syndrome de noonan": "Noonan syndrome",
    "maladie de niemann-pick": "Niemann-Pick disease",
    "ataxie de friedreich": "Friedreich's ataxia",
    "maladie de batten": "Batten disease",
    "déficit en alpha-1 antitrypsine": "alpha-1 antitrypsin deficiency",
    "syndrome d'ehlers-danlos": "Ehlers-Danlos syndrome",
    "maladie de ménière": "Ménière's disease",
    "fibrodysplasie ossifiante progressive": "fibrodysplasia ossificans progressiva",
    "xérodermie pigmentaire": "xeroderma pigmentosum",
    "dystrophie rétinienne héréditaire": "inherited retinal dystrophy",
    "amaurose congénitale de leber": "Leber congenital amaurosis",
    "syndrome de dravet": "Dravet syndrome",
    "syndrome de lennox-gastaut": "Lennox-Gastaut syndrome",
    "déficit en sphingomyélinase acide": "acid sphingomyelinase deficiency",
    # ── Urology ───────────────────────────────────────────────────────
    "hyperplasie bénigne de la prostate": "benign prostatic hyperplasia",
    "hypertrophie bénigne de la prostate": "benign prostatic hyperplasia",
    "incontinence urinaire": "urinary incontinence",
    "vessie hyperactive": "overactive bladder",
    "cystite interstitielle": "interstitial cystitis",
    "lithiase urinaire": "urolithiasis",
    "dysfonction érectile": "erectile dysfunction",
    # ── Dermatology ───────────────────────────────────────────────────
    "mélanome malin": "malignant melanoma",
    "kératose actinique": "actinic keratosis",
    "rosacée": "rosacea",
    "acné": "acne",
    "zona": "herpes zoster",
    "prurigo nodulaire": "prurigo nodularis",
    "prurit": "pruritus",
    # ── Transplantation ───────────────────────────────────────────────
    "rejet de greffe": "graft rejection",
    "rejet aigu de greffe": "acute graft rejection",
    "transplantation rénale": "kidney transplantation",
    "transplantation hépatique": "liver transplantation",
    "transplantation cardiaque": "heart transplantation",
    # ── Other ─────────────────────────────────────────────────────────
    "fibromyalgie": "fibromyalgia",
    "endométriose": "endometriosis",
    "fibromes utérins": "uterine fibroids",
    "syndrome des ovaires polykystiques": "polycystic ovary syndrome",
    "ménopause": "menopause",
    "infertilité": "infertility",
    "hématurie": "haematuria",
    "apnée du sommeil": "sleep apnoea",
    "syndrome d'apnées obstructives du sommeil": "obstructive sleep apnoea syndrome",
    "allergie": "allergy",
    "rhinite allergique": "allergic rhinitis",
    "choc anaphylactique": "anaphylaxis",
    "œdème": "oedema",
    "douleur post-opératoire": "postoperative pain",
    "nausées et vomissements": "nausea and vomiting",
    "constipation": "constipation",
    "diarrhée": "diarrhoea",
    "anorexie": "anorexia",
    "cachexie": "cachexia",
    "convulsions": "seizures",
    "spasticité": "spasticity",
    "spasmes": "spasms",
    "syndrome de sjögren": "Sjögren's syndrome",
    "maladie de paget": "Paget's disease",
    "hyperplasie": "hyperplasia",
    "fibrose": "fibrosis",
    "nécrose": "necrosis",
    "infection": "infection",
    "inflammation": "inflammation",
    "septicémie": "septicaemia",
    "vaccination": "vaccination",
    "prophylaxie": "prophylaxis",
    "prévention": "prevention",
    "immunisation": "immunisation",
    # ── General medical terms (adjectives & qualifiers) ───────────────
    "avancé": "advanced",
    "avancée": "advanced",
    "métastatique": "metastatic",
    "localement avancé": "locally advanced",
    "localement avancée": "locally advanced",
    "localement avancé ou métastatique": "locally advanced or metastatic",
    "avancé ou métastatique": "advanced or metastatic",
    "non résécable": "unresectable",
    "non opérable": "inoperable",
    "inopérable": "inoperable",
    "récidivant": "recurrent",
    "récidivante": "recurrent",
    "réfractaire": "refractory",
    "récidivant ou réfractaire": "relapsed or refractory",
    "récidivante ou réfractaire": "relapsed or refractory",
    "en rechute": "relapsed",
    "résistant": "resistant",
    "résistante": "resistant",
    "chronique": "chronic",
    "aigu": "acute",
    "aiguë": "acute",
    "sévère": "severe",
    "grave": "severe",
    "modéré": "moderate",
    "modérée": "moderate",
    "léger": "mild",
    "légère": "mild",
    "modéré à sévère": "moderate to severe",
    "modérée à sévère": "moderate to severe",
    "léger à modéré": "mild to moderate",
    "légère à modérée": "mild to moderate",
    "progressif": "progressive",
    "progressive": "progressive",
    "actif": "active",
    "active": "active",
    "en monothérapie": "as monotherapy",
    "en association": "in combination",
    "en association avec": "in combination with",
    "en première ligne": "first-line",
    "en deuxième ligne": "second-line",
    "en troisième ligne": "third-line",
    "de première ligne": "first-line",
    "de deuxième ligne": "second-line",
    "de troisième ligne": "third-line",
    "traitement adjuvant": "adjuvant treatment",
    "traitement néoadjuvant": "neoadjuvant treatment",
    "traitement de maintien": "maintenance treatment",
    "traitement d'entretien": "maintenance therapy",
    "chez l'adulte": "in adults",
    "chez les adultes": "in adults",
    "chez l'enfant": "in children",
    "chez les enfants": "in children",
    "chez les adolescents": "in adolescents",
    "chez le nourrisson": "in infants",
    "chez les nourrissons": "in infants",
    "chez les patients": "in patients",
    "chez les patients adultes": "in adult patients",
    "chez des patients": "in patients",
    "pédiatrique": "paediatric",
    "adulte": "adult",
    "adultes": "adults",
    "patients": "patients",
    "nouveau-né": "neonate",
    "nouveau-nés": "neonates",
    "positif": "positive",
    "positive": "positive",
    "négatif": "negative",
    "négative": "negative",
    "non préalablement traités": "previously untreated",
    "non traités antérieurement": "previously untreated",
    "préalablement traités": "previously treated",
    "prétraités": "pre-treated",
    "ayant reçu": "who have received",
    "n'ayant pas reçu": "who have not received",
    "après échec": "after failure of",
    "en cas d'échec": "in case of failure of",
    "intolérance": "intolerance",
    "contre-indication": "contraindication",
    "intolérants": "intolerant",
    "inéligibles": "ineligible",
    "éligibles": "eligible",
    "atteints de": "with",
    "atteintes de": "with",
    "atteint de": "with",
    "atteinte de": "with",
    "porteurs de": "carrying",
    "présentant": "presenting with",
    "exprimant": "expressing",
    "surexprimant": "overexpressing",
    "nouvellement diagnostiqué": "newly diagnosed",
    "nouvellement diagnostiquée": "newly diagnosed",
    "non traité": "untreated",
    "non traitée": "untreated",
    # ── Common connecting / structural phrases ────────────────────────
    "traitement": "treatment",
    "le traitement": "the treatment",
    "le traitement de": "the treatment of",
    "le traitement du": "the treatment of",
    "le traitement de la": "the treatment of",
    "le traitement des": "the treatment of",
    "le traitement d'": "the treatment of",
    "la prévention": "the prevention",
    "la prévention de": "the prevention of",
    "la prévention des": "the prevention of",
    "la prise en charge": "the management",
    "la prise en charge de": "the management of",
    "la prise en charge du": "the management of",
    "la prise en charge des": "the management of",
    "la réduction": "the reduction",
    "la réduction du risque": "the reduction of the risk",
    "le risque": "the risk",
    "la progression": "progression",
    "la récidive": "recurrence",
    "l'éradication": "eradication",
    "ou": "or",
    "et": "and",
    "avec": "with",
    "sans": "without",
    "après": "after",
    "avant": "before",
    "par": "by",
    "sur": "on",
    "pour": "for",
    "dont": "whose",
    "qui": "who",
    "à": "at",
    "au moins": "at least",
    "au moins un": "at least one",
    "associé à": "combined with",
    "associée à": "combined with",
    "lié à": "associated with",
    "liée à": "associated with",
    "liés à": "associated with",
    "liées à": "associated with",
    "dû à": "due to",
    "due à": "due to",
    "induit par": "induced by",
    "induite par": "induced by",
    "secondaire à": "secondary to",
    "résistant à": "resistant to",
    "résistante à": "resistant to",
    "inadéquatement contrôlé": "inadequately controlled",
    "insuffisamment contrôlé": "insufficiently controlled",
    "ne répondant pas": "not responding",
    "ayant échoué": "who have failed",
    "muté": "mutated",
    "mutée": "mutated",
    "mutation": "mutation",
    "mutations": "mutations",
    "porteur de la mutation": "carrying the mutation",
    "expression de": "expression of",
    "surexpression de": "overexpression of",
    "déficience en": "deficiency in",
    "déficit en": "deficiency in",
    "excès de": "excess of",
}


def _translate_indication(french_text: str) -> str:
    """Translate a French indication text to English using term dictionary.

    Performs longest-match-first substitution of known French medical terms,
    then cleans up remaining French articles/prepositions that commonly
    survive the first pass.
    """
    if not french_text:
        return ""

    result = french_text
    lower = result.lower()

    # Sort terms by length (longest first) to match "cancer du sein her2-positif"
    # before "cancer du sein"
    for fr_term, en_term in sorted(
        _INDICATION_FR_EN.items(), key=lambda x: len(x[0]), reverse=True
    ):
        # Case-insensitive find-and-replace preserving surrounding context
        idx = lower.find(fr_term)
        if idx != -1:
            result = result[:idx] + en_term + result[idx + len(fr_term):]
            lower = result.lower()

    # Post-processing: clean up remaining French articles/prepositions
    result = _cleanup_french_remnants(result)

    return result


# French articles and prepositions that commonly survive term substitution.
# Applied as a final cleanup pass via regex word-boundary matching.
_FRENCH_REMNANTS: list[tuple[str, str]] = [
    # Multi-word phrases first (longest match)
    (r"\bde l['\u2019]", "of "),
    (r"\bde la\b", "of"),
    (r"\bà l['\u2019]", "at "),
    (r"\bl['\u2019](?=[a-zà-ÿ])", ""),
    (r"\bd['\u2019](?=[a-zà-ÿ])", "of "),
    (r"\bn['\u2019](?=[a-zà-ÿ])", "not "),
    (r"\bdu\b", "of"),
    (r"\bdes\b", "of"),
    (r"\bau\b", "in"),
    (r"\baux\b", "in"),
    (r"\ble\b", "the"),
    (r"\bla\b", "the"),
    (r"\bles\b", "the"),
    (r"\bun\b", "a"),
    (r"\bune\b", "a"),
    (r"\bce\b", "this"),
    (r"\bcette\b", "this"),
    (r"\bces\b", "these"),
    (r"\bson\b", "its"),
    (r"\bsa\b", "its"),
    (r"\bleur\b", "their"),
    (r"\bleurs\b", "their"),
    (r"\bplus\b", "more"),
    (r"\bmoins\b", "less"),
    (r"\btrès\b", "very"),
    (r"\bnon\b", "non"),
    (r"\bne\b", "not"),
    (r"\bpas\b", "not"),
    (r"\baussi\b", "also"),
    (r"\bnotamment\b", "including"),
    (r"\bégalement\b", "also"),
    (r"\bainsi que\b", "as well as"),
    (r"\btels que\b", "such as"),
    (r"\btelles que\b", "such as"),
    (r"\bc'est-à-dire\b", "i.e."),
    (r"\ben particulier\b", "in particular"),
    (r"\ben cas de\b", "in case of"),
    (r"\bâgés de\b", "aged"),
    (r"\bâgé de\b", "aged"),
    (r"\bâgée de\b", "aged"),
    (r"\bâgées de\b", "aged"),
    (r"\bans\b", "years"),
    (r"\bâge\b", "age"),
]


def _cleanup_french_remnants(text: str) -> str:
    """Replace common leftover French articles/prepositions with English."""
    for pattern, replacement in _FRENCH_REMNANTS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    # Collapse multiple spaces into one and strip
    text = re.sub(r"\s{2,}", " ", text).strip()

    return text


# Additional French → English phrases for translating full description sentences.
# Keys are lowercase French terms; values are English replacements.
# Terms are applied via longest-match-first substitution.
_DESCRIPTION_FR_EN: dict[str, str] = {
    # ── SMR descriptions ─────────────────────────────────────────────
    "le service médical rendu par": "the clinical benefit of",
    "le service médical rendu est": "the clinical benefit is",
    "le service médical rendu de": "the clinical benefit of",
    "service médical rendu": "clinical benefit (SMR)",
    "est important": "is major",
    "est modéré": "is moderate",
    "est faible": "is minor",
    "est insuffisant": "is insufficient",

    # ── ASMR descriptions ────────────────────────────────────────────
    "amélioration du service médical rendu": "therapeutic improvement (ASMR)",
    "pas d'amélioration du service médical rendu": "no therapeutic improvement (ASMR V)",
    "apporte une amélioration du service médical rendu": "provides a therapeutic improvement (ASMR)",
    "n'apporte pas d'amélioration du service médical rendu": "does not provide a therapeutic improvement (ASMR V)",
    "asmr modérée": "moderate therapeutic improvement (ASMR III)",
    "asmr mineure": "minor therapeutic improvement (ASMR IV)",
    "asmr majeure": "major therapeutic improvement (ASMR I)",
    "asmr importante": "important therapeutic improvement (ASMR II)",

    # ── Commission / committee phrases ───────────────────────────────
    "la commission considère que": "the Committee considers that",
    "la commission de la transparence": "the Transparency Committee",
    "la commission estime que": "the Committee considers that",
    "commission de la transparence": "Transparency Committee",
    "compte tenu": "considering",
    "compte-tenu": "considering",

    # ── Study design & evidence ──────────────────────────────────────
    "dans une étude de phase iii randomisée en ouvert": "in an open-label randomised phase III study",
    "dans une étude de phase iii randomisée en double aveugle": "in a double-blind randomised phase III study",
    "dans une étude de phase iii randomisée": "in a randomised phase III study",
    "dans une étude de phase ii randomisée": "in a randomised phase II study",
    "dans une étude de phase iii": "in a phase III study",
    "dans une étude de phase ii": "in a phase II study",
    "dans une étude randomisée": "in a randomised study",
    "étude de phase iii": "phase III study",
    "étude de phase ii": "phase II study",
    "étude de phase i": "phase I study",
    "étude randomisée en ouvert": "open-label randomised study",
    "étude randomisée en double aveugle": "double-blind randomised study",
    "étude randomisée": "randomised study",
    "randomisée en ouvert": "open-label randomised",
    "randomisée en double aveugle": "double-blind randomised",
    "en ouvert": "open-label",
    "en double aveugle": "double-blind",
    "en simple aveugle": "single-blind",
    "essai clinique": "clinical trial",
    "essai contrôlé randomisé": "randomised controlled trial",

    # ── Efficacy / survival endpoints ────────────────────────────────
    "en termes de survie globale": "in terms of overall survival",
    "en termes de survie sans progression": "in terms of progression-free survival",
    "en termes de": "in terms of",
    "survie globale": "overall survival",
    "survie sans progression": "progression-free survival",
    "survie sans récidive": "recurrence-free survival",
    "survie sans événement": "event-free survival",
    "survie sans maladie": "disease-free survival",
    "taux de réponse globale": "overall response rate",
    "taux de réponse objective": "objective response rate",
    "taux de réponse": "response rate",
    "taux de réponse complète": "complete response rate",
    "réponse complète": "complete response",
    "réponse partielle": "partial response",
    "durée de réponse": "duration of response",
    "durée médiane de réponse": "median duration of response",
    "médiane de survie globale": "median overall survival",
    "médiane de survie sans progression": "median progression-free survival",
    "temps jusqu'à progression": "time to progression",
    "temps jusqu'à progression de la douleur": "time to pain progression",
    "le temps jusqu'à progression": "time to progression",

    # ── Statistical terms ────────────────────────────────────────────
    "de la démonstration de la supériorité de": "the demonstrated superiority of",
    "de la démonstration de la non-infériorité de": "the demonstrated non-inferiority of",
    "démonstration de la supériorité": "demonstrated superiority",
    "démonstration de la non-infériorité": "demonstrated non-inferiority",
    "la supériorité de": "the superiority of",
    "la non-infériorité de": "the non-inferiority of",
    "différence statistiquement significative": "statistically significant difference",
    "statistiquement significative": "statistically significant",
    "statistiquement significatif": "statistically significant",
    "intervalle de confiance": "confidence interval",
    "hazard ratio": "hazard ratio",
    "rapport de risque": "hazard ratio",
    "critère de jugement principal": "primary endpoint",
    "critère principal": "primary endpoint",
    "critères secondaires": "secondary endpoints",
    "critère secondaire": "secondary endpoint",
    "critère exploratoire": "exploratory endpoint",
    "critères exploratoires": "exploratory endpoints",
    "critère de jugement": "endpoint",
    "bras contrôle": "control arm",
    "bras expérimental": "experimental arm",
    "groupe contrôle": "control group",
    "groupe traité": "treatment group",

    # ── Connecting phrases / sentence structure ──────────────────────
    "dans le cadre de": "in the context of",
    "dans le traitement": "in the treatment",
    "dans le traitement de": "in the treatment of",
    "en association avec": "in combination with",
    "en association au": "in combination with",
    "en association à": "in combination with",
    "en association": "in combination",
    "en monothérapie": "as monotherapy",
    "par rapport à": "compared to",
    "par rapport au": "compared to",
    "par rapport aux": "compared to",
    "à base de sels de platine": "platinum-based",
    "à base de platine": "platinum-based",
    "sels de platine": "platinum salts",
    "chez les patients adultes": "in adult patients",
    "chez les patients": "in patients",
    "chez les adultes": "in adults",
    "chez l'adulte": "in adults",
    "chez l'enfant": "in children",
    "chez les enfants": "in children",
    "chez les adolescents": "in adolescents",
    "chez les patients âgés": "in elderly patients",
    "chez des patients": "in patients",
    "non préalablement traités": "previously untreated",
    "préalablement traités": "previously treated",
    "ayant reçu au moins": "who have received at least",
    "ayant reçu": "who have received",
    "n'ayant pas reçu": "who have not received",
    "après échec de": "after failure of",
    "après échec": "after failure of",
    "après progression": "after progression",
    "en cas d'échec": "in case of failure",
    "en première ligne de traitement": "as first-line treatment",
    "en deuxième ligne de traitement": "as second-line treatment",
    "en troisième ligne de traitement": "as third-line treatment",
    "en première ligne": "first-line",
    "en deuxième ligne": "second-line",
    "en troisième ligne": "third-line",
    "de deuxième ligne": "second-line",
    "de première ligne": "first-line",
    "de troisième ligne": "third-line",
    "localement avancé ou métastatique": "locally advanced or metastatic",
    "localement avancé": "locally advanced",
    "non résécable": "unresectable",
    "avancé ou métastatique": "advanced or metastatic",
    "inopérable ou métastatique": "inoperable or metastatic",

    # ── Safety / tolerability phrases ────────────────────────────────
    "et malgré": "and despite",
    "malgré": "despite",
    "une absence de gain démontré sur": "no demonstrated gain in",
    "une absence de gain sur": "no gain in",
    "absence de gain": "no gain",
    "absence de données": "lack of data",
    "absence de démonstration": "lack of evidence",
    "un profil de toxicité marqué": "a notable toxicity profile",
    "un profil de toxicité": "a toxicity profile",
    "profil de tolérance": "tolerability profile",
    "profil de toxicité": "toxicity profile",
    "profil d'effets indésirables": "adverse event profile",
    "la survenue fréquente": "frequent occurrence",
    "survenue fréquente": "frequent occurrence",
    "effets indésirables": "adverse events",
    "effets indésirables graves": "serious adverse events",
    "événements indésirables": "adverse events",
    "événements indésirables graves": "serious adverse events",
    "événement indésirable": "adverse event",
    "événement indésirable grave": "serious adverse event",
    "arrêts de traitement pour événement indésirable": "treatment discontinuations due to adverse events",
    "arrêts de traitement pour événements indésirables": "treatment discontinuations due to adverse events",
    "arrêts de traitement": "treatment discontinuations",
    "arrêt de traitement": "treatment discontinuation",
    "atteintes cutanées": "skin disorders",
    "neuropathies sensorielles périphériques": "peripheral sensory neuropathies",
    "neuropathie sensorielle périphérique": "peripheral sensory neuropathy",
    "neuropathie périphérique": "peripheral neuropathy",
    "neuropathies périphériques": "peripheral neuropathies",
    "pour événement indésirable": "due to adverse events",
    "pour événements indésirables": "due to adverse events",
    "toxicité": "toxicity",
    "tolérance": "tolerability",
    "toxicités": "toxicities",

    # ── Quality of life / PROs ───────────────────────────────────────
    "qualité de vie": "quality of life",
    "qualité de vie liée à la santé": "health-related quality of life",
    "données de qualité de vie": "quality of life data",
    "gain en qualité de vie": "quality of life gain",
    "maintien de la qualité de vie": "maintenance of quality of life",
    "résultats rapportés par les patients": "patient-reported outcomes",

    # ── Treatment descriptions ───────────────────────────────────────
    "chimiothérapie": "chemotherapy",
    "chimiothérapies": "chemotherapies",
    "chimiothérapies à base de": "chemotherapy regimens based on",
    "chimiothérapie à base de": "chemotherapy based on",
    "immunothérapie": "immunotherapy",
    "thérapie ciblée": "targeted therapy",
    "radiothérapie": "radiotherapy",
    "hormonothérapie": "hormone therapy",
    "corticothérapie": "corticosteroid therapy",
    "traitement de référence": "standard of care",
    "traitement standard": "standard treatment",
    "traitement conventionnel": "conventional treatment",
    "traitement symptomatique": "symptomatic treatment",
    "meilleur traitement de support": "best supportive care",
    "soins de support": "supportive care",
    "traitement de support": "supportive care",
    "traitement adjuvant": "adjuvant treatment",
    "traitement néoadjuvant": "neoadjuvant treatment",
    "traitement d'entretien": "maintenance treatment",
    "traitement de maintenance": "maintenance treatment",
    "traitement de consolidation": "consolidation treatment",
    "prise en charge thérapeutique": "therapeutic management",
    "prise en charge": "management",
    "stratégie thérapeutique": "therapeutic strategy",
    "arsenal thérapeutique": "therapeutic arsenal",
    "alternative thérapeutique": "therapeutic alternative",
    "alternatives thérapeutiques": "therapeutic alternatives",
    "besoin thérapeutique": "therapeutic need",
    "besoin médical": "medical need",
    "place dans la stratégie thérapeutique": "place in the therapeutic strategy",

    # ── Drug forms / pharmaceutical terms ────────────────────────────
    "poudre pour solution à diluer pour perfusion": "powder for concentrate for solution for infusion",
    "solution à diluer pour perfusion": "concentrate for solution for infusion",
    "solution pour perfusion": "solution for infusion",
    "solution injectable": "solution for injection",
    "solution injectable en seringue préremplie": "solution for injection in pre-filled syringe",
    "solution injectable en stylo prérempli": "solution for injection in pre-filled pen",
    "comprimé pelliculé": "film-coated tablet",
    "comprimés pelliculés": "film-coated tablets",
    "gélule": "capsule",
    "gélules": "capsules",
    "comprimé": "tablet",
    "comprimés": "tablets",

    # ── General HTA / regulatory phrases ─────────────────────────────
    "apporte une": "provides a",
    "n'apporte pas de": "does not provide",
    "inscription": "registration",
    "première évaluation": "first evaluation",
    "extension d'indication": "indication extension",
    "renouvellement d'inscription": "registration renewal",
    "population cible": "target population",
    "population concernée": "concerned population",
    "indication évaluée": "evaluated indication",
    "indication retenue": "approved indication",
    "données cliniques": "clinical data",
    "données disponibles": "available data",
    "données insuffisantes": "insufficient data",
    "rapport efficacité/tolérance": "efficacy/tolerability ratio",
    "rapport bénéfice/risque": "benefit/risk ratio",
    "bénéfice clinique": "clinical benefit",
    "intérêt de santé publique": "public health interest",
    "progrès thérapeutique": "therapeutic progress",
    "comparateur cliniquement pertinent": "clinically relevant comparator",
    "comparaison indirecte": "indirect comparison",
    "comparaison directe": "direct comparison",
    "en l'absence de": "in the absence of",
    "en l'état actuel des données": "based on currently available data",
    "au regard de": "in light of",
    "au vu de": "in view of",

    # ── Prepositions / connectors common in descriptions ─────────────
    "notamment par": "notably by",
    "notamment": "notably",
    "cependant": "however",
    "toutefois": "however",
    "néanmoins": "nevertheless",
    "en revanche": "on the other hand",
    "par ailleurs": "furthermore",
    "en effet": "indeed",
    "ainsi": "thus",
    "de plus": "furthermore",
    "en outre": "moreover",
    "c'est-à-dire": "i.e.",
    "à savoir": "namely",
    "selon": "according to",
    "d'après": "according to",
    "afin de": "in order to",
    "au cours de": "during",
    "au cours du traitement": "during treatment",
    "lors de": "during",
    "lors du traitement": "during treatment",
    "à long terme": "long-term",
    "à court terme": "short-term",
    "à ce jour": "to date",
    "sous traitement": "under treatment",
    "versus": "versus",
    "et": "and",
    "ou": "or",
    "mais": "but",
    "donc": "therefore",
    "car": "because",
    "si": "if",
    "avec": "with",
    "sans": "without",
    "pour": "for",
    "dans": "in",
    "sur": "on",
    "entre": "between",
    "après": "after",
    "avant": "before",
    "depuis": "since",
    "pendant": "during",
    "contre": "against",
    "comme": "as",
    "dont": "of which",
    "chez": "in",
    "dès": "from",
    "sous": "under",
    "hors": "outside of",
    "parmi": "among",
    "environ": "approximately",
    "également": "also",
}


def _translate_description(french_text: str) -> str:
    """Translate a full French SMR/ASMR description to English.

    Applies both the indication dictionary and the description-specific
    phrases via longest-match-first substitution, then cleans up any
    remaining French articles/prepositions.
    """
    if not french_text:
        return ""

    result = french_text
    lower = result.lower()

    # Merge both dictionaries; description phrases take priority for overlapping keys
    combined = {**_INDICATION_FR_EN, **_DESCRIPTION_FR_EN}

    for fr_term, en_term in sorted(
        combined.items(), key=lambda x: len(x[0]), reverse=True
    ):
        idx = lower.find(fr_term)
        while idx != -1:
            result = result[:idx] + en_term + result[idx + len(fr_term):]
            lower = result.lower()
            # Search for further occurrences after the replacement
            idx = lower.find(fr_term, idx + len(en_term))

    # Clean up remaining French articles/prepositions
    result = _cleanup_french_remnants(result)

    return result


def _build_summary_en(
    smr_value: str,
    asmr_value: str,
    motif: str,
    indication: str = "",
) -> str:
    """Compose a concise English summary from French HAS rating codes."""
    parts: list[str] = []
    if indication:
        parts.append(f"Indication: {indication}")
    if smr_value:
        label = _SMR_EN.get(smr_value, smr_value)
        parts.append(f"SMR: {label}")
    if asmr_value:
        label = _ASMR_EN.get(asmr_value, f"ASMR {asmr_value}")
        parts.append(f"ASMR {asmr_value}: {label}")
    if motif:
        reason = _MOTIF_EN.get(motif, motif)
        parts.append(f"Evaluation purpose: {reason}")
    return " | ".join(parts)


class FranceHAS(HTAAgency):
    """HAS (Haute Autorité de Santé) — France's HTA agency."""

    def __init__(self) -> None:
        # CIS code → medicine name
        self._medicines: dict[str, str] = {}
        # CIS code → list of active substance names
        self._compositions: dict[str, list[str]] = defaultdict(list)
        # CIS code → list of SMR dicts
        self._smr: dict[str, list[dict]] = defaultdict(list)
        # CIS code → list of ASMR dicts
        self._asmr: dict[str, list[dict]] = defaultdict(list)
        # HAS dossier code → URL
        self._ct_links: dict[str, str] = {}
        # Reverse index: lowercase substance name → set of CIS codes
        self._substance_index: dict[str, set[str]] = defaultdict(set)
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "FR"

    @property
    def country_name(self) -> str:
        return "France"

    @property
    def agency_abbreviation(self) -> str:
        return "HAS"

    @property
    def agency_full_name(self) -> str:
        return "Haute Autorité de Santé"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch all BDPM data files and parse them.

        Core files (medicines, compositions, SMR, ASMR) must load
        successfully.  Supplementary files (CT links) are loaded on a
        best-effort basis — a failure there does not prevent the module
        from being marked as loaded.
        """
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            verify=SSL_VERIFY,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; VAP-Global-Resources/1.0; "
                    "+https://github.com/fernando9017/HTA-Reimbursement-Price)"
                ),
            },
        ) as client:
            # Core files — all must succeed
            await self._load_medicines(client)
            await self._load_compositions(client)
            await self._load_smr(client)
            await self._load_asmr(client)

            # Supplementary file — best-effort
            try:
                await self._load_ct_links(client)
            except Exception:
                logger.warning(
                    "Failed to load BDPM CT links file — assessment URLs "
                    "will be unavailable, but SMR/ASMR data is intact",
                    exc_info=True,
                )

        if not self._medicines:
            raise RuntimeError("BDPM medicines file returned no records")

        smr_count = sum(len(v) for v in self._smr.values())
        asmr_count = sum(len(v) for v in self._asmr.values())
        if smr_count == 0 and asmr_count == 0:
            raise RuntimeError("BDPM SMR and ASMR files returned no records")

        self._build_substance_index()
        self._loaded = True
        logger.info(
            "France HAS data loaded: %d medicines, %d compositions, "
            "%d SMR records, %d ASMR records, %d CT links",
            len(self._medicines),
            sum(len(v) for v in self._compositions.values()),
            smr_count,
            asmr_count,
            len(self._ct_links),
        )

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find HAS assessments matching the given active substance."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        # Find all CIS codes where the active substance matches.
        # Use the pre-built substance index for O(1) exact lookups,
        # falling back to prefix matching for partial queries.
        matching_cis: set[str] = set()

        # Try exact match in the index first
        if substance_lower in self._substance_index:
            matching_cis.update(self._substance_index[substance_lower])
        else:
            # Check comma/semicolon-separated parts of the query
            query_parts = {p.strip() for p in re.split(r"[,;/+]", substance_lower) if p.strip()}
            for qp in query_parts:
                if qp in self._substance_index:
                    matching_cis.update(self._substance_index[qp])

            # Prefix/partial matching against indexed substance names
            if not matching_cis:
                for indexed_subst, cis_codes in self._substance_index.items():
                    if _substance_matches(substance_lower, indexed_subst):
                        matching_cis.update(cis_codes)

        # Also search by product name in medicine denominations
        if product_lower:
            for cis_code, denomination in self._medicines.items():
                if product_lower in denomination.lower():
                    matching_cis.add(cis_code)

        if not matching_cis:
            return []

        # Collect all assessments for matching CIS codes.
        # Group by dossier code + date to merge SMR and ASMR from the
        # same opinion AND deduplicate across multiple CIS codes
        # (different presentations of the same medicine sharing a dossier).
        dossier_assessments: dict[str, dict] = {}

        for cis_code in matching_cis:
            med_name = self._medicines.get(cis_code, "")

            for smr in self._smr.get(cis_code, []):
                dossier_code = smr["dossier_code"]
                key = f"{dossier_code}_{smr['date']}"
                if key not in dossier_assessments:
                    dossier_assessments[key] = {
                        "product_name": med_name,
                        "cis_code": cis_code,
                        "dossier_code": dossier_code,
                        "evaluation_reason": smr["motif"],
                        "opinion_date": smr["date"],
                        "smr_value": smr["value"],
                        "smr_description": smr["label"],
                        "asmr_value": "",
                        "asmr_description": "",
                        "assessment_url": _normalize_has_url(
                            self._ct_links.get(dossier_code, "")
                        ),
                    }
                else:
                    # Update SMR if this dossier already has ASMR
                    dossier_assessments[key]["smr_value"] = smr["value"]
                    dossier_assessments[key]["smr_description"] = smr["label"]

            for asmr in self._asmr.get(cis_code, []):
                dossier_code = asmr["dossier_code"]
                key = f"{dossier_code}_{asmr['date']}"
                if key not in dossier_assessments:
                    dossier_assessments[key] = {
                        "product_name": med_name,
                        "cis_code": cis_code,
                        "dossier_code": dossier_code,
                        "evaluation_reason": asmr["motif"],
                        "opinion_date": asmr["date"],
                        "smr_value": "",
                        "smr_description": "",
                        "asmr_value": asmr["value"],
                        "asmr_description": asmr["label"],
                        "assessment_url": _normalize_has_url(
                            self._ct_links.get(dossier_code, "")
                        ),
                    }
                else:
                    dossier_assessments[key]["asmr_value"] = asmr["value"]
                    dossier_assessments[key]["asmr_description"] = asmr["label"]

        results = []
        for data in dossier_assessments.values():
            indication_fr = _extract_indication(
                data.get("smr_description", ""),
                data.get("asmr_description", ""),
            )
            indication_en = _translate_indication(indication_fr)
            smr_desc_en = _translate_description(data.get("smr_description", ""))
            asmr_desc_en = _translate_description(data.get("asmr_description", ""))
            results.append(
                AssessmentResult(
                    **data,
                    indication=indication_fr,
                    indication_en=indication_en,
                    smr_description_en=smr_desc_en,
                    asmr_description_en=asmr_desc_en,
                    summary_en=_build_summary_en(
                        data.get("smr_value", ""),
                        data.get("asmr_value", ""),
                        data.get("evaluation_reason", ""),
                        indication_en if indication_en != indication_fr else indication_fr,
                    ),
                )
            )
        # Sort by opinion date descending (most recent first)
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading helpers ──────────────────────────────────────────

    async def _fetch_file(self, client: httpx.AsyncClient, file_key: str) -> str:
        """Download a BDPM file and return its content as a string.

        Retries up to _BDPM_MAX_RETRIES times with exponential backoff to
        handle transient network failures.
        """
        url = BDPM_BASE_URL + BDPM_FILES[file_key]
        logger.info("Fetching BDPM file: %s (%s)", file_key, url)

        last_error: Exception | None = None
        for attempt in range(1, _BDPM_MAX_RETRIES + 1):
            try:
                response = await client.get(url)
                response.raise_for_status()
                # Try primary encoding, fall back to utf-8 with replacement
                try:
                    content = response.content.decode(BDPM_ENCODING)
                except UnicodeDecodeError:
                    content = response.content.decode("utf-8", errors="replace")
                    logger.warning("BDPM %s: fell back to utf-8 decoding", file_key)
                logger.info(
                    "BDPM %s fetched: %d bytes, %d lines",
                    file_key, len(response.content), content.count("\n"),
                )
                return content
            except Exception as exc:
                last_error = exc
                if attempt < _BDPM_MAX_RETRIES:
                    wait = 2 ** attempt
                    logger.warning(
                        "BDPM %s fetch attempt %d/%d failed, retrying in %ds: %s",
                        file_key, attempt, _BDPM_MAX_RETRIES, wait, exc,
                    )
                    await asyncio.sleep(wait)

        raise RuntimeError(f"BDPM {file_key} fetch failed after {_BDPM_MAX_RETRIES} attempts: {last_error}")

    def _parse_rows(self, content: str) -> list[list[str]]:
        """Split file content into rows of tab-separated fields."""
        rows = []
        for line in content.splitlines():
            line = line.strip()
            if line:
                rows.append([field.strip() for field in line.split(BDPM_SEPARATOR)])
        return rows

    def _build_substance_index(self) -> None:
        """Build a reverse index from lowercase substance name to CIS codes.

        This allows O(1) lookup by substance instead of scanning all
        compositions on every search_assessments() call.
        """
        self._substance_index = defaultdict(set)
        for cis_code, substances in self._compositions.items():
            for subst in substances:
                self._substance_index[subst.lower().strip()].add(cis_code)

    async def _load_medicines(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_bdpm.txt: CIS code → denomination."""
        content = await self._fetch_file(client, "medicines")
        for row in self._parse_rows(content):
            if len(row) >= 2:
                cis_code = row[0]
                denomination = row[1]
                self._medicines[cis_code] = denomination

    async def _load_compositions(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_COMPO_bdpm.txt: CIS code → active substance names.

        Accepts all substance types (SA, FT, ST, and empty) to ensure
        comprehensive coverage.  The BDPM composition file uses:
        - SA = substance active (active substance)
        - FT = fraction thérapeutique (therapeutic fraction)
        - ST = substance for testing (less common)
        """
        content = await self._fetch_file(client, "compositions")
        for row in self._parse_rows(content):
            if len(row) >= 4:
                cis_code = row[0]
                substance_name = row[3].strip()
                if substance_name and substance_name not in self._compositions[cis_code]:
                    self._compositions[cis_code].append(substance_name)

    async def _load_smr(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_HAS_SMR_bdpm.txt."""
        content = await self._fetch_file(client, "smr")
        for row in self._parse_rows(content):
            if len(row) >= 5:
                cis_code = row[0]
                self._smr[cis_code].append(
                    {
                        "dossier_code": row[1] if len(row) > 1 else "",
                        "motif": row[2] if len(row) > 2 else "",
                        "date": _format_date(row[3]) if len(row) > 3 else "",
                        "value": row[4] if len(row) > 4 else "",
                        "label": row[5] if len(row) > 5 else "",
                    }
                )

    async def _load_asmr(self, client: httpx.AsyncClient) -> None:
        """Parse CIS_HAS_ASMR_bdpm.txt."""
        content = await self._fetch_file(client, "asmr")
        for row in self._parse_rows(content):
            if len(row) >= 5:
                cis_code = row[0]
                self._asmr[cis_code].append(
                    {
                        "dossier_code": row[1] if len(row) > 1 else "",
                        "motif": row[2] if len(row) > 2 else "",
                        "date": _format_date(row[3]) if len(row) > 3 else "",
                        "value": row[4] if len(row) > 4 else "",
                        "label": row[5] if len(row) > 5 else "",
                    }
                )

    async def _load_ct_links(self, client: httpx.AsyncClient) -> None:
        """Parse HAS_LiensPageCT_bdpm.txt: dossier code → URL."""
        content = await self._fetch_file(client, "ct_links")
        for row in self._parse_rows(content):
            if len(row) >= 2:
                dossier_code = row[0]
                url = _normalize_has_url(row[1])
                self._ct_links[dossier_code] = url

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), dict):
            return False
        data = payload["data"]
        try:
            self._medicines = dict(data.get("medicines", {}))
            self._compositions = defaultdict(list, data.get("compositions", {}))
            self._smr = defaultdict(list, data.get("smr", {}))
            self._asmr = defaultdict(list, data.get("asmr", {}))
            self._ct_links = dict(data.get("ct_links", {}))
        except Exception:
            logger.warning("%s: malformed data in %s", self.agency_abbreviation, data_file)
            return False

        smr_count = sum(len(v) for v in self._smr.values())
        asmr_count = sum(len(v) for v in self._asmr.values())
        # Require medicines AND at least some SMR/ASMR records
        loaded = bool(self._medicines) and (smr_count > 0 or asmr_count > 0)
        if loaded:
            self._build_substance_index()
        self._loaded = loaded
        if self._loaded:
            logger.info(
                "%s loaded from %s: %d medicines, %d SMR, %d ASMR, %d CT links",
                self.agency_abbreviation, data_file,
                len(self._medicines), smr_count, asmr_count, len(self._ct_links),
            )
        else:
            logger.warning(
                "%s: cache %s has insufficient data (%d medicines, %d SMR, %d ASMR)",
                self.agency_abbreviation, data_file,
                len(self._medicines), smr_count, asmr_count,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        data = {
            "medicines": self._medicines,
            "compositions": dict(self._compositions),
            "smr": dict(self._smr),
            "asmr": dict(self._asmr),
            "ct_links": self._ct_links,
        }
        self._safe_write_json_file(data_file, self._make_envelope(data))
        logger.info(
            "%s saved %d medicines to %s",
            self.agency_abbreviation, len(self._medicines), data_file,
        )


def _format_date(raw: str) -> str:
    """Convert YYYYMMDD to YYYY-MM-DD. Pass through if already formatted or invalid."""
    raw = raw.strip()
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw


def _extract_indication(smr_label: str, asmr_label: str) -> str:
    """Extract the therapeutic indication from the SMR or ASMR label text.

    BDPM labels typically follow patterns like:
    - "Le service médical rendu par KEYTRUDA est important dans le mélanome avancé"
    - "SMR important dans le cancer urothélial"
    - "ASMR modérée dans le mélanome"
    - "...dans le traitement du cancer du poumon non à petites cellules (CBNPC)"
    - "...en monothérapie dans le cancer du sein HER2-positif"
    - "...en association avec le carboplatine dans le cancer de l'ovaire"
    - "...chez les patients adultes atteints de mélanome avancé"

    Returns the indication text, or empty string if it cannot be extracted.
    """
    for label in (smr_label, asmr_label):
        if not label:
            continue

        # Pattern 1: "dans le/la/l'/les [indication]" — most common format
        match = re.search(
            r"\bdans\s+(le |la |l['\u2019]|les |l\u2019|son |cette |)"
            r"(.+?)\.?\s*$",
            label,
            re.IGNORECASE,
        )
        if match:
            indication = (match.group(1) + match.group(2)).strip().rstrip(".")
            # Skip generic descriptions
            if "indication évaluée" in indication.lower():
                continue
            if "indication retenue" in indication.lower():
                continue
            # Capitalize first letter
            if indication:
                indication = indication[0].upper() + indication[1:]
            return indication

        # Pattern 2: "chez les patients/adultes atteints de [disease]"
        match = re.search(
            r"\bchez\s+les\s+(?:patients?\s+)?(?:adultes?\s+)?atteints?\s+(?:de |d['\u2019])"
            r"(.+?)\.?\s*$",
            label,
            re.IGNORECASE,
        )
        if match:
            indication = match.group(1).strip().rstrip(".")
            if indication:
                indication = indication[0].upper() + indication[1:]
            return indication

        # Pattern 3: "pour le traitement de/du/des [indication]"
        match = re.search(
            r"\bpour\s+le\s+traitement\s+(?:de |du |des |d['\u2019])"
            r"(.+?)\.?\s*$",
            label,
            re.IGNORECASE,
        )
        if match:
            indication = match.group(1).strip().rstrip(".")
            if indication:
                indication = indication[0].upper() + indication[1:]
            return indication

    return ""


def _shorten_trade_name(denomination: str) -> str:
    """Extract just the brand name from a BDPM denomination.

    BDPM denominations include dosage, form, and route details, e.g.:
      "KEYTRUDA 25 mg/mL, solution à diluer pour perfusion"
      "OPDIVO 10 mg/mL, solution à diluer pour perfusion"
      "HUMIRA 40 mg, solution injectable en seringue préremplie"

    Returns just the brand name portion (e.g. "KEYTRUDA", "OPDIVO", "HUMIRA").
    """
    if not denomination:
        return ""

    # Strip at first comma (form/route details)
    name = denomination.split(",")[0].strip()

    # Strip at first numeric dosage pattern (e.g. "25 mg", "10 mg/mL", "0,5 mg")
    match = re.match(r"^(.+?)\s+\d", name)
    if match:
        name = match.group(1).strip()

    return name


def _substance_matches(query: str, candidate: str) -> bool:
    """Check whether *query* matches *candidate* as a substance name.

    Prevents "trastuzumab" from matching "trastuzumab deruxtecan" or
    "trastuzumab emtansine" — those are distinct molecules (antibody-drug
    conjugates) despite sharing a prefix.

    Matching rules:
    1. Exact match (same string)
    2. One is a comma/semicolon-separated list containing the other
       as an exact element (multi-substance products like "pertuzumab, trastuzumab")
    3. Partial INN prefix matching within a single-word substance
       (e.g., "pembroliz" matches "pembrolizumab" since the candidate
       is a single word, but "trastuzumab" does NOT match "trastuzumab
       deruxtecan" since the candidate is multi-word)
    """
    if query == candidate:
        return True

    # Split both on comma/semicolon separators to handle multi-substance
    # products (e.g., "pertuzumab, trastuzumab")
    query_parts = {p.strip() for p in re.split(r"[,;/+]", query) if p.strip()}
    candidate_parts = {p.strip() for p in re.split(r"[,;/+]", candidate) if p.strip()}

    # Match if any exact element from one appears in the other
    if query_parts & candidate_parts:
        return True

    # Partial INN prefix matching: allow "pembroliz" to match "pembrolizumab"
    # but NOT "trastuzumab" to match "trastuzumab deruxtecan".
    # The rule: a query is a valid partial match only if it's a substring
    # of a SINGLE-WORD substance element (no spaces).
    for qp in query_parts:
        for cp in candidate_parts:
            # Only allow partial matching within single-word substances
            if " " not in cp and qp in cp:
                return True
            if " " not in qp and cp in qp:
                return True

    return False


def _normalize_has_url(url: str) -> str:
    """Normalize HAS assessment URLs to the current website format.

    The BDPM CT links file may contain older URLs using the ``/portail/``
    path or plain ``http://``.  The HAS website now uses ``https://`` and
    has dropped the ``/portail/`` prefix.
    """
    if not url:
        return url

    # http → https
    if url.startswith("http://"):
        url = "https://" + url[7:]

    # Remove legacy /portail/ path segment
    url = url.replace("/portail/jcms/", "/jcms/")

    # Ensure /fr/ locale is present in the path
    if "/jcms/" in url and "/fr/" not in url and "/en/" not in url:
        # Insert /fr/ before the slug: /jcms/c_123456/slug → /jcms/c_123456/fr/slug
        url = re.sub(r"(/jcms/[cp]_\d+)/", r"\1/fr/", url, count=1)

    return url
