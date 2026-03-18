/**
 * US NSCLC Pathways Tracker — Frontend logic.
 *
 * Renders a directory of US oncology clinical pathway programs for NSCLC,
 * with curated data on payer-driven, provider-driven, and public sources.
 *
 * Depends on shared.js for: esc
 */

// ── Pathway Programs Registry ─────────────────────────────────────────

const PATHWAY_PROGRAMS = [
    // ── Payer-Driven Pathways ──────────────────────────────────────────
    {
        id: "uhc",
        name: "UnitedHealthcare Cancer Therapy Pathways",
        organization: "UnitedHealthcare (UHG)",
        type: "payer",
        access: "proprietary",
        coverage: "UHC Community Plan, Medicare Advantage, Commercial",
        nsclcCoverage: true,
        description: "Evidence-based regimens selected through rigorous evaluation by UHC's Oncology Advisory Committee (practicing oncologists from academic and community settings). Prior authorization for chemotherapy requires submission through their CGP tool. Covers 27 million members. Providers earn $1,000 per pathway regimen followed (commercial plans, 75% adherence threshold).",
        keyFeatures: [
            "Oncology Advisory Committee reviews pathways with disease-specific expert consultants",
            "Providers earn $1,000 per on-pathway regimen (commercial plans)",
            "Covers UHC Commercial, Medicare Advantage, and Medicaid managed care (27M members)",
            "Pathway selection not required for PA approval, but incentivised",
            "Regimen PDF publicly hosted (monitorable data source)",
        ],
        url: "https://www.uhcprovider.com/en/resource-library/cancer-therapy-pathways-program.html",
        pdfUrls: [
            { label: "Cancer Therapy Pathways Regimens PDF", url: "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/oncology/ctpp/Cancer-Therapy-Pathways-Program-Regimens.pdf" },
        ],
        dataAvailability: "Regimen PDF publicly hosted; detailed regimen-level data available via CGP portal to contracted providers",
        lastChecked: "2026-03",
    },
    {
        id: "anthem",
        name: "Anthem / Elevance Cancer Treatment Pathways",
        organization: "Elevance Health (formerly Anthem)",
        type: "payer",
        access: "proprietary",
        coverage: "Anthem BCBS plans nationally",
        nsclcCoverage: true,
        description: "Now the Cancer Care Quality Program (CCQP), covering 20+ cancers with 300+ clinical pathways and 80+ clinical scenarios. Administered by Carelon Insights with dedicated oncology nurses and pharmacists. Providers receive $350/month for on-pathway treatment with no penalty for off-pathway choices.",
        keyFeatures: [
            "300+ clinical pathways across 20+ cancer types",
            "NSCLC is a priority tumour type (63% adherence reported initially)",
            "$350/month provider incentive for on-pathway treatment",
            "No penalty for off-pathway choices — incentive-based model",
            "Administered by Carelon Insights with dedicated oncology staff",
        ],
        url: "https://www.elevancehealth.com/",
        dataAvailability: "Aggregated adherence data published in literature; regimen-level detail proprietary",
        lastChecked: "2026-03",
    },
    {
        id: "humana",
        name: "Humana Oncology Quality Management Program",
        organization: "Humana",
        type: "payer",
        access: "proprietary",
        coverage: "Humana Medicare Advantage and Commercial plans",
        nsclcCoverage: true,
        description: "Humana partners with New Century Health and Oncology Analytics to administer their Oncology Quality Management Program. Uses evidence-based pathways with a peer-to-peer counseling model integrated into traditional pre-certification.",
        keyFeatures: [
            "Partnered with New Century Health and Oncology Analytics",
            "Peer-to-peer counseling model for pathway deviation",
            "Integrated into pre-certification workflow",
            "Covers major solid tumour types including NSCLC",
        ],
        url: "https://www.humana.com/provider",
        dataAvailability: "Not publicly available; accessible to contracted providers",
        lastChecked: "2026-03",
    },
    {
        id: "bcbs-michigan",
        name: "Blue Cross Blue Shield of Michigan Cancer Pathways",
        organization: "BCBSM / Physician Resource Management",
        type: "payer",
        access: "proprietary",
        coverage: "BCBSM members in Michigan",
        nsclcCoverage: true,
        description: "A statewide payer-provider collaboration between BCBSM, Physician Resource Management, and Cardinal Health Specialty Solutions. One of the earliest and most cited payer-provider pathway collaborations in the US.",
        keyFeatures: [
            "Statewide payer-provider collaborative model",
            "Supported by Cardinal Health Specialty Solutions",
            "Demonstrated cost savings without survival compromise",
            "Serves as a model for other BCBS plans nationally",
        ],
        url: "https://www.bcbsm.com/",
        dataAvailability: "Results published in peer-reviewed literature; regimen lists not publicly available",
        lastChecked: "2026-03",
    },

    {
        id: "evicore",
        name: "EviCore Oncology Pathways (Cigna / Evernorth)",
        organization: "EviCore by Evernorth (Cigna)",
        type: "payer",
        access: "proprietary",
        coverage: "Cigna plans + external payer clients",
        nsclcCoverage: true,
        description: "Pathway regimens are a subset of NCCN-recommended regimens, reviewed by an advisory panel of board-certified oncologists from Cigna, eviCore, and community practices. On-pathway regimens receive immediate prior authorization approval. Also functions as a utilisation management / decision support tool for other payers.",
        keyFeatures: [
            "On-pathway regimens receive immediate PA approval",
            "Advisory panel includes community and academic oncologists",
            "Serves both Cigna plans and external payer clients",
            "Integrated into utilisation management workflow",
        ],
        url: "https://www.evicore.com/insights/pathways-program",
        dataAvailability: "Not publicly available; accessible through eviCore provider portal",
        lastChecked: "2026-03",
    },
    {
        id: "evolent",
        name: "Evolent Health Oncology Management (formerly New Century Health)",
        organization: "Evolent Health",
        type: "payer",
        access: "proprietary",
        coverage: "Multiple health plan clients",
        nsclcCoverage: true,
        description: "Manages oncology prior authorisations for health plans with pathways embedded in utilisation review. Functions as a quality management company serving as an intermediary between payers and oncology providers.",
        keyFeatures: [
            "Embedded pathways in utilisation review process",
            "Serves as oncology PA management for multiple health plans",
            "Peer-to-peer counselling model for pathway deviations",
            "Partners with Humana and other major payers",
        ],
        url: "https://www.evolenthealth.com/",
        dataAvailability: "Not publicly available; internal to contracted health plans",
        lastChecked: "2026-03",
    },

    // ── Provider/Institution-Driven Pathways ───────────────────────────
    {
        id: "moffitt",
        name: "Moffitt Cancer Center Clinical Pathways",
        organization: "Moffitt Cancer Center",
        type: "provider",
        access: "proprietary",
        coverage: "Moffitt Cancer Center network (Tampa, FL)",
        nsclcCoverage: true,
        description: "Moffitt Cancer Center develops and maintains clinical pathways for its healthcare professionals. Pathways are institution-specific, evidence-based treatment protocols integrated into their clinical workflow.",
        keyFeatures: [
            "NCI-designated Comprehensive Cancer Center",
            "Institution-specific pathways updated with latest evidence",
            "Integrated into EHR order sets",
            "High clinical trial accrual rates",
        ],
        url: "https://www.moffitt.org/for-healthcare-professionals/clinical-pathways/",
        dataAvailability: "Available to Moffitt-affiliated providers only; not publicly accessible",
        lastChecked: "2026-03",
    },
    {
        id: "upmc-hillman",
        name: "UPMC Hillman Cancer Center Pathways (ClinicalPath)",
        organization: "UPMC / Elsevier ClinicalPath",
        type: "provider",
        access: "proprietary",
        coverage: "UPMC Hillman Cancer Center network (Pittsburgh, PA)",
        nsclcCoverage: true,
        description: "Powered by Elsevier ClinicalPath (formerly Via Oncology), these pathways were first developed at UPMC Hillman in 2004 and cover >90% of cancer types with evidence-based recommendations reviewed quarterly. Pathway introduction in metastatic NSCLC decreased cost of care significantly with no survival compromise.",
        keyFeatures: [
            "Birthplace of Via Oncology pathways (2004)",
            "Covers >2,000 unique patient presentations",
            "Quarterly review and update cycle",
            "Demonstrated 35% lower NSCLC outpatient costs on-pathway vs off-pathway",
            "Clinical trial accrual rose from 27 to 66/year after pathway implementation",
        ],
        url: "https://hillman.upmc.com/health-care-professionals/treatment-pathways",
        dataAvailability: "Not publicly available; powered by Elsevier ClinicalPath subscription platform",
        lastChecked: "2026-03",
    },
    {
        id: "us-oncology",
        name: "Value Pathways powered by NCCN (US Oncology Network)",
        organization: "McKesson / US Oncology Network / NCCN",
        type: "provider",
        access: "proprietary",
        coverage: "~1,400 physicians across US Oncology Network sites",
        nsclcCoverage: true,
        description: "A collaboration between NCCN, McKesson, and The US Oncology Network. Value Pathways are a refinement of NCCN Guidelines that highlight evidence-based treatment options based on efficacy, toxicity, and financial impact. Up to 90% of US Oncology Network medical oncologists follow these pathways. Ontada's Clear Value Plus platform has supported 800,000+ chemotherapy treatment decisions.",
        keyFeatures: [
            "Joint development by NCCN, McKesson, and US Oncology Network",
            "~90% physician adherence within the network",
            "NSCLC Level I Pathway patients had 35% lower annual outpatient costs",
            "No difference in 12-month overall survival on- vs off-pathway",
            "Ontada's Clear Value Plus: 800,000+ chemotherapy treatment decisions",
            "Financial impact (Medicare reimbursement) evaluated alongside efficacy/toxicity",
        ],
        url: "https://www.mckesson.com/specialty/technology-solutions-specialty-practices/oncology-clinical-management-technology/",
        dataAvailability: "Available to US Oncology Network practices; not publicly downloadable",
        lastChecked: "2026-03",
    },

    {
        id: "oneoncology",
        name: "OneOncology Pathways",
        organization: "OneOncology",
        type: "provider",
        access: "proprietary",
        coverage: "OneOncology network practices across 19+ states",
        nsclcCoverage: true,
        description: "OneOncology has finalised 25 oncology and hematology pathways covering lung, breast, GI, GU, and hematology disease groups. Delivered through an internal clinical decision support tool to network practices.",
        keyFeatures: [
            "25 finalised oncology and hematology pathways",
            "Covers lung, breast, GI, GU, and hematology",
            "Internal clinical decision support tool",
            "Growing network across 19+ states",
        ],
        url: "https://www.oneoncology.com/",
        dataAvailability: "Internal to OneOncology network; not publicly accessible",
        lastChecked: "2026-03",
    },
    {
        id: "aon",
        name: "American Oncology Network (AON) Pathways",
        organization: "American Oncology Network",
        type: "provider",
        access: "proprietary",
        coverage: "AON practices across 19 states",
        nsclcCoverage: true,
        description: "Pharmacist-driven clinical pathways supporting value-based care across the AON network. Focus on data, technology, and collaboration to standardise evidence-based treatment.",
        keyFeatures: [
            "Pharmacist-driven pathway implementation",
            "Focus on value-based care delivery",
            "Data and technology integration",
            "Practices across 19 states",
        ],
        url: "https://www.americanoncologynetwork.com/",
        dataAvailability: "Internal to AON network; not publicly accessible",
        lastChecked: "2026-03",
    },
    {
        id: "eviti",
        name: "eviti Connect for Oncology (NantHealth)",
        organization: "NantHealth",
        type: "provider",
        access: "proprietary",
        coverage: "7,700+ practices nationwide",
        nsclcCoverage: true,
        description: "Clinical decision support tool used by 7,700+ practices. Classified by ASCO as a decision support tool rather than a traditional pathway. Integrated into AllScripts EHR for real-time authorisation code generation. Serves payers as a pre-authorisation tool.",
        keyFeatures: [
            "7,700+ practices nationwide",
            "EHR-integrated (AllScripts) real-time decision support",
            "Real-time authorisation code generation",
            "Serves both providers and payers for pre-authorisation",
            "ASCO classifies as decision support rather than traditional pathway",
        ],
        url: "https://nanthealth.com/payers/eviti-connect/eviti-oncology/",
        dataAvailability: "Not publicly available; provider/payer portal access only",
        lastChecked: "2026-03",
    },

    // ── Public / Government Pathways ──────────────────────────────────
    {
        id: "va",
        name: "VA Oncology Clinical Pathways — Lung Cancer",
        organization: "Department of Veterans Affairs (VA)",
        type: "public",
        access: "public",
        coverage: "VA healthcare system nationally (~170 VA medical centres)",
        nsclcCoverage: true,
        description: "The VA National Oncology Program publishes clinical pathways as publicly available PDFs. Lung cancer pathways cover both NSCLC and SCLC with stage-based, biomarker-driven treatment algorithms. Updated at least quarterly by an interdisciplinary subject matter expert group.",
        keyFeatures: [
            "Freely available PDFs — most comprehensive public US oncology pathways",
            "Updated quarterly by interdisciplinary SME panels",
            "Based on national guidelines, published literature, and institutional experience",
            "Covers staging, molecular testing, first-line through subsequent therapy",
            "Integrated into VA EHR via Clinical Pathway templates",
        ],
        url: "https://www.cancer.va.gov/clinical-pathways.html",
        pdfUrls: [
            { label: "Lung Cancer Pathways V2.2025 (508-compliant)", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/Lung_Cancer_Clinical_Pathways_V2_2025_508.pdf" },
            { label: "Lung Cancer Pathways (original)", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/lung.pdf" },
            { label: "Clinical Pathways Reference Sheet", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/reference-sheet.pdf" },
        ],
        dataAvailability: "Fully public — PDFs freely downloadable from cancer.va.gov",
        lastChecked: "2026-03",
    },
    {
        id: "nci-pdq",
        name: "NCI PDQ — NSCLC Treatment Summary",
        organization: "National Cancer Institute (NCI)",
        type: "public",
        access: "public",
        coverage: "National reference standard (US government)",
        nsclcCoverage: true,
        description: "Comprehensive, peer-reviewed, evidence-based treatment summaries maintained by the NCI. PDQ summaries cover treatment options by stage, including surgery, radiation, chemotherapy, targeted therapy, and immunotherapy. Content is public domain (US government funded) and available via NCBI Bookshelf and NCI Content Syndication API.",
        keyFeatures: [
            "Public domain — freely reusable (US government funded)",
            "Peer-reviewed by editorial boards of cancer specialists",
            "Available via NCBI Bookshelf and NCI Content Syndication API",
            "Health Professional and Patient versions available",
            "Covers all stages of NSCLC with current treatment options",
        ],
        url: "https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq",
        dataAvailability: "Fully public — accessible via web, NCBI Bookshelf, and NCI syndication API",
        lastChecked: "2026-03",
    },

    // ── Commercial Analytics / Monitoring ──────────────────────────────
    {
        id: "mmit-pulse",
        name: "MMIT PULSE Analytics — Pathways Module",
        organization: "MMIT / Norstella",
        type: "commercial",
        access: "proprietary",
        coverage: "300+ brands across 69 oncology indications",
        nsclcCoverage: true,
        description: "PULSE Analytics provides accurate, timely, and granular data for pharmaceutical companies to understand pathway positioning. Tracks pathway placement across payer and provider programs, identifies key decision makers, and monitors competitive positioning. Part of the Norstella family (with Citeline, Evaluate, MMIT, Panalgo).",
        keyFeatures: [
            "Tracks 300+ brands across 69 oncology indications",
            "PULSE Provider — IDN pathways data",
            "PULSE Pathways — third-party pathway developer data",
            "PULSE APM — value-based reimbursement model monitoring",
            "Pre-launch prediction of pathway placement using analogues",
            "Post-launch competitive tracking and restriction monitoring",
        ],
        url: "https://www.mmitnetwork.com/pulse-analytics/",
        dataAvailability: "Subscription-based platform; not publicly accessible",
        lastChecked: "2026-03",
    },
    {
        id: "dedham",
        name: "The Dedham Group — Clinical Pathways Strategy",
        organization: "The Dedham Group / Norstella",
        type: "commercial",
        access: "proprietary",
        coverage: "US oncology & specialty therapeutics",
        nsclcCoverage: true,
        description: "The premier US oncology & specialty therapeutics strategy consulting firm. Offers comprehensive pathways support including evidence requirements, data generation & submission strategy, and proprietary monitoring via PULSE Analytics. Part of the Norstella family alongside MMIT.",
        keyFeatures: [
            "Decades of experience in the pathways space",
            "Proprietary in-house pathway monitoring via PULSE Analytics",
            "Evidence requirement analysis for pathway positioning",
            "Data generation & submission strategy for favorable positioning",
            "Monthly newsletter with pathway landscape updates",
            "Decade of curated proprietary data across the oncology access continuum",
        ],
        url: "https://dedhamgroup.com/services/clinical-pathways-strategy/",
        dataAvailability: "Proprietary consulting service; engagement-based access",
        lastChecked: "2026-03",
    },
    {
        id: "clinicalpath",
        name: "Elsevier ClinicalPath (formerly Via Oncology)",
        organization: "Elsevier",
        type: "commercial",
        access: "proprietary",
        coverage: "1,500+ US cancer care providers",
        nsclcCoverage: true,
        description: "Clinical decision support tool that provides evidence-based pathways for oncology. Originally developed at UPMC (2004), commercialised by Via Oncology (2009), acquired by Elsevier (2018), rebranded to ClinicalPath (2019). Covers >2,000 unique patient presentations with EHR integration.",
        keyFeatures: [
            "Addresses >2,000 unique patient presentations",
            "Expert-defined clinical algorithms reviewed quarterly",
            "EHR-integrated decision support at point of care",
            "Won 'Best Computerized Decision Support Solution' (MedTech Breakthrough 2019)",
            "Published research showing cost savings without survival compromise in NSCLC",
        ],
        url: "https://www.elsevier.com/products/clinicalpath",
        dataAvailability: "Subscription-based; available to subscribing cancer centres only",
        lastChecked: "2026-03",
    },
];


// ── VA Pathway Data (public) ──────────────────────────────────────────

const VA_PATHWAY_DATA = {
    title: "VA Oncology Clinical Pathways — Lung Cancer",
    version: "V2.2025",
    lastUpdated: "2025",
    source: "VA National Oncology Program Office",
    mainUrl: "https://www.cancer.va.gov/clinical-pathways.html",
    pdfUrl: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/Lung_Cancer_Clinical_Pathways_V2_2025_508.pdf",
    contact: "VHAOncologyPathways@va.gov",
    sections: [
        {
            title: "Molecular Testing Requirements",
            content: "VA pathways require comprehensive molecular testing for all advanced/metastatic NSCLC patients before initiating systemic therapy. Key biomarkers include EGFR mutations (exon 19 del, L858R, exon 20 ins, S768I, L861Q, G719X), ALK rearrangements, ROS1 fusions, BRAF V600E, KRAS G12C, MET exon 14 skipping, RET fusions, NTRK fusions, HER2 (ERBB2) mutations, and PD-L1 expression (TPS).",
        },
        {
            title: "First-Line Treatment — Actionable Mutations",
            content: "EGFR exon 19/L858R: Osimertinib (preferred) or osimertinib + chemotherapy (category 1). Amivantamab + lazertinib also listed as preferred. ALK+: Alectinib, brigatinib, or lorlatinib (preferred). ROS1+: Crizotinib or entrectinib. BRAF V600E: Dabrafenib + trametinib. KRAS G12C: Pathway-specific recommendations available. RET+: Selpercatinib or pralsetinib. MET exon 14 skip: Capmatinib or tepotinib.",
        },
        {
            title: "First-Line Treatment — No Actionable Mutations",
            content: "PD-L1 ≥50%: Pembrolizumab monotherapy or pembrolizumab + chemotherapy. PD-L1 1-49%: Pembrolizumab + chemotherapy (preferred); nivolumab + ipilimumab + chemotherapy as alternative. PD-L1 <1%: Pembrolizumab + chemotherapy or nivolumab + ipilimumab + chemotherapy. Shared decision-making is critical at time of pembrolizumab consideration if PD-L1 >1%.",
        },
        {
            title: "Second-Line and Subsequent Therapy",
            content: "EGFR-mutated after osimertinib progression: Datopotamab deruxtecan (Dato-DXd) is a preferred option. Other options include platinum-based chemotherapy combinations. For non-mutated NSCLC: Docetaxel ± ramucirumab, or immunotherapy if not previously received. Biomarker-specific subsequent therapies depend on resistance mechanisms.",
        },
        {
            title: "Perioperative / Adjuvant Therapy",
            content: "Stage IB-IIIA with resected EGFR exon 19/21 mutations: Adjuvant osimertinib (FDA approved for Stage IB, though OS benefit smaller in this subset — discuss both adjuvant osimertinib and surveillance with patient). Stage II-III node-positive without actionable mutations: Evaluate for preoperative immunotherapy + chemotherapy. Stage III unresectable: Consolidation osimertinib after chemoradiation for EGFR+ (LAURA trial, category 1 for stage III).",
        },
        {
            title: "Surveillance",
            content: "Initial baseline CT chest scan within 3 months of definitive treatment. More frequent scanning may be required based on clinical circumstances. Clinical trial consideration recommended — contact CancerClinicalTrialsNavigation@va.gov.",
        },
    ],
    otherCancerPathways: [
        { name: "Breast Cancer", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/breast.pdf" },
        { name: "Colon Cancer", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/colon.pdf" },
        { name: "Prostate Cancer", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/prostate.pdf" },
        { name: "Classic Hodgkin Lymphoma", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/chl.pdf" },
        { name: "MDS", url: "https://www.cancer.va.gov/CANCER/assets/pdf/clinical-pathways/mds.pdf" },
        { name: "Gastric Cancer", url: "https://cancer.va.gov/CANCER/assets/pdf/clinical-pathways/gastric-cancer.pdf" },
        { name: "Hepatocellular Carcinoma", url: "https://www.cancer.va.gov/assets/pdf/clinical-pathways/hcc.pdf" },
    ],
};


// ── NCI PDQ Reference Data ────────────────────────────────────────────

const NCI_PDQ_DATA = {
    title: "Non-Small Cell Lung Cancer Treatment (PDQ)",
    organization: "National Cancer Institute",
    healthProfessionalUrl: "https://www.cancer.gov/types/lung/hp/non-small-cell-lung-treatment-pdq",
    patientUrl: "https://www.cancer.gov/types/lung/patient/non-small-cell-lung-treatment-pdq",
    ncbiBookshelfUrl: "https://www.ncbi.nlm.nih.gov/books/NBK65865/",
    syndicationApiUrl: "https://www.cancer.gov/syndication/api",
    clinicalTrialsApiUrl: "https://www.cancer.gov/syndication/api",
    description: "Comprehensive, peer-reviewed, evidence-based summary of NSCLC treatment. Covers all stages, treatment modalities, and molecular subtypes. Public domain content (US government funded).",
    stageOverview: [
        { stage: "Occult / Stage 0", treatment: "Surgery; photodynamic therapy; endobronchial therapies" },
        { stage: "Stage I", treatment: "Lobectomy (preferred); segmentectomy/wedge for high-risk patients; SBRT for non-surgical candidates; adjuvant chemotherapy for tumours ≥4 cm" },
        { stage: "Stage II", treatment: "Surgery + adjuvant chemotherapy; adjuvant osimertinib for EGFR+ (IB-IIIA); preoperative immunotherapy + chemo consideration" },
        { stage: "Stage IIIA (resectable)", treatment: "Neoadjuvant chemoimmunotherapy → surgery → adjuvant immunotherapy; concurrent chemoradiation; trimodality approaches" },
        { stage: "Stage IIIB/C (unresectable)", treatment: "Concurrent chemoradiation → durvalumab consolidation (PACIFIC); osimertinib consolidation for EGFR+ (LAURA)" },
        { stage: "Stage IV / Metastatic (driver+)", treatment: "Targeted therapy by biomarker: osimertinib (EGFR), alectinib/lorlatinib (ALK), selpercatinib (RET), sotorasib/adagrasib (KRAS G12C), etc." },
        { stage: "Stage IV / Metastatic (driver−)", treatment: "ICI ± chemotherapy based on PD-L1: pembrolizumab mono (≥50%), pembrolizumab + chemo (all PD-L1), nivo + ipi + chemo; cemiplimab for PD-L1 ≥50%" },
    ],
};


// ── NCCN Reference Data ───────────────────────────────────────────────

const NCCN_DATA = {
    title: "NCCN Clinical Practice Guidelines — Non-Small Cell Lung Cancer",
    currentVersion: "Version 5.2026",
    url: "https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1450",
    navigatorUrl: "https://www.nccn.org/guidelines/nccn-guidelines-navigator",
    patientGuidelinesUrl: "https://www.nccn.org/patientresources/patient-resources/guidelines-for-patients",
    accessNote: "Free with NCCN account registration. Copyrighted — cannot be reproduced without written permission.",
    recentUpdates: [
        "Datopotamab deruxtecan (Dato-DXd) added as preferred 2L option for EGFR-mutated NSCLC after osimertinib + chemo progression",
        "Osimertinib + platinum/pemetrexed and amivantamab + lazertinib moved to category 1 preferred 1L (from 'other recommended')",
        "Sevabertinib added as preferred option for HER2-mutated NSCLC (previously treated)",
        "Osimertinib consolidation after chemoradiation for unresectable stage II-III EGFR+ (LAURA trial; category 1 for stage III)",
        "Preoperative immunotherapy + chemotherapy recommended for tumours ≥4 cm or node-positive without actionable drivers",
        "NCCN Guidelines Navigator interactive digital tool launched (October 2025) for 12+ cancer types",
    ],
};


// ── NSCLC Biomarker-Therapy Mapping ───────────────────────────────────

const BIOMARKER_THERAPIES = [
    {
        biomarker: "EGFR (exon 19 del / L858R)",
        prevalence: "~15-20% (non-squamous)",
        firstLine: ["Osimertinib (preferred)", "Osimertinib + carboplatin/pemetrexed", "Amivantamab + lazertinib"],
        subsequent: ["Datopotamab deruxtecan (Dato-DXd)", "Amivantamab + chemo", "Platinum-based chemotherapy"],
        pathwayRelevance: "Most competitive pathway segment — multiple targeted options with OS data",
    },
    {
        biomarker: "EGFR (exon 20 insertion)",
        prevalence: "~2-3%",
        firstLine: ["Amivantamab + chemo + lazertinib", "Platinum-based chemotherapy + pembrolizumab"],
        subsequent: ["Amivantamab", "Mobocertinib"],
        pathwayRelevance: "Rapidly evolving; amivantamab combinations reshaping pathway placement",
    },
    {
        biomarker: "ALK rearrangement",
        prevalence: "~3-5%",
        firstLine: ["Lorlatinib (preferred)", "Alectinib (preferred)", "Brigatinib"],
        subsequent: ["Lorlatinib (if not used 1L)", "Platinum-based chemotherapy"],
        pathwayRelevance: "Multiple preferred 1L options; lorlatinib gaining ground on pathways post-CROWN data",
    },
    {
        biomarker: "ROS1 fusion",
        prevalence: "~1-2%",
        firstLine: ["Crizotinib", "Entrectinib", "Repotrectinib"],
        subsequent: ["Lorlatinib", "Platinum-based chemotherapy"],
        pathwayRelevance: "Small population; limited pathway competition",
    },
    {
        biomarker: "KRAS G12C",
        prevalence: "~13% (non-squamous)",
        firstLine: ["Platinum + pemetrexed + pembrolizumab (standard)", "Clinical trials with KRAS G12C inhibitor combos"],
        subsequent: ["Sotorasib", "Adagrasib"],
        pathwayRelevance: "High prevalence makes this commercially significant; 2L pathway placement is competitive",
    },
    {
        biomarker: "BRAF V600E",
        prevalence: "~2-4%",
        firstLine: ["Dabrafenib + trametinib (preferred)", "Encorafenib + binimetinib"],
        subsequent: ["Platinum-based chemotherapy", "Immunotherapy if not received"],
        pathwayRelevance: "Targeted combo is well-established on pathways",
    },
    {
        biomarker: "MET exon 14 skipping",
        prevalence: "~3-4%",
        firstLine: ["Capmatinib", "Tepotinib"],
        subsequent: ["Platinum-based chemotherapy ± immunotherapy"],
        pathwayRelevance: "Two competing TKIs; pathway placement varies by program",
    },
    {
        biomarker: "RET fusion",
        prevalence: "~1-2%",
        firstLine: ["Selpercatinib (preferred)", "Pralsetinib"],
        subsequent: ["Platinum-based chemotherapy ± immunotherapy"],
        pathwayRelevance: "Selpercatinib has frontline approval; pathway positioning evolving",
    },
    {
        biomarker: "NTRK fusion",
        prevalence: "<1%",
        firstLine: ["Larotrectinib", "Entrectinib"],
        subsequent: ["Repotrectinib", "Platinum-based chemotherapy"],
        pathwayRelevance: "Ultra-rare; tumour-agnostic approvals",
    },
    {
        biomarker: "HER2 (ERBB2) mutation",
        prevalence: "~2-3%",
        firstLine: ["Platinum-based chemotherapy + pembrolizumab"],
        subsequent: ["Trastuzumab deruxtecan (T-DXd)", "Sevabertinib (newly added to NCCN)"],
        pathwayRelevance: "T-DXd and sevabertinib competing for 2L+ pathway placement",
    },
    {
        biomarker: "PD-L1 ≥50% (no drivers)",
        prevalence: "~25-30%",
        firstLine: ["Pembrolizumab monotherapy", "Pembrolizumab + chemotherapy", "Cemiplimab", "Atezolizumab"],
        subsequent: ["Docetaxel ± ramucirumab", "Chemotherapy"],
        pathwayRelevance: "Pembro mono vs pembro+chemo is a key pathway decision point; cost-sensitive",
    },
    {
        biomarker: "PD-L1 1-49% (no drivers)",
        prevalence: "~25-30%",
        firstLine: ["Pembrolizumab + chemotherapy (preferred)", "Nivolumab + ipilimumab + chemotherapy"],
        subsequent: ["Docetaxel ± ramucirumab", "Immunotherapy if not received"],
        pathwayRelevance: "Pembrolizumab + chemo is standard on most pathways",
    },
    {
        biomarker: "PD-L1 <1% (no drivers)",
        prevalence: "~30-40%",
        firstLine: ["Pembrolizumab + chemotherapy", "Nivolumab + ipilimumab + chemotherapy"],
        subsequent: ["Docetaxel ± ramucirumab"],
        pathwayRelevance: "Multiple ICI+chemo combos compete; pathway programs may differentiate by cost",
    },
];


// ── Commercial Monitoring Landscape ───────────────────────────────────

const MONITORING_PLATFORMS = [
    {
        name: "MMIT PULSE Analytics",
        provider: "MMIT / Norstella",
        description: "Industry-leading pathway tracking platform. Monitors 300+ brands across 69 oncology indications with payer and provider pathway positioning data.",
        capabilities: ["Brand pathway placement tracking", "Competitor positioning analysis", "Key decision-maker identification", "Pre-launch pathway prediction", "Value-based reimbursement model monitoring"],
        url: "https://www.mmitnetwork.com/pulse-analytics/",
    },
    {
        name: "The Dedham Group Pathways Consulting",
        provider: "The Dedham Group / Norstella",
        description: "Premier US oncology consulting firm with decades of pathways expertise. Proprietary monitoring through PULSE Analytics plus strategic advisory.",
        capabilities: ["Evidence requirement analysis", "Submission strategy for pathway placement", "Monthly pathway landscape newsletters", "Curated proprietary data (decade+)", "Lifecycle pathway management"],
        url: "https://dedhamgroup.com/services/clinical-pathways-strategy/",
    },
    {
        name: "Elsevier ClinicalPath",
        provider: "Elsevier",
        description: "Clinical decision support tool used by 1,500+ US cancer care providers. Provides both the pathway content and analytics on pathway adherence.",
        capabilities: [">2,000 patient presentation algorithms", "EHR-integrated decision support", "Quarterly evidence review cycle", "Adherence analytics and reporting", "Biomarker testing pattern analysis"],
        url: "https://www.elsevier.com/products/clinicalpath",
    },
];


// ── Render Functions ──────────────────────────────────────────────────

function renderStats() {
    const total = PATHWAY_PROGRAMS.length;
    const payer = PATHWAY_PROGRAMS.filter(p => p.type === "payer").length;
    const provider = PATHWAY_PROGRAMS.filter(p => p.type === "provider").length;
    const publicSources = PATHWAY_PROGRAMS.filter(p => p.access === "public").length;

    document.getElementById("stat-total-programs").textContent = total;
    document.getElementById("stat-payer-programs").textContent = payer;
    document.getElementById("stat-provider-programs").textContent = provider + PATHWAY_PROGRAMS.filter(p => p.type === "commercial").length;
    document.getElementById("stat-public-sources").textContent = publicSources;
}

function accessBadgeClass(access) {
    if (access === "public") return "public";
    if (access === "semi-public") return "semi-public";
    return "proprietary";
}

function typeBadgeLabel(type) {
    const labels = { payer: "Payer", provider: "Provider", public: "Public/Gov", commercial: "Analytics" };
    return labels[type] || type;
}

function renderProgramCard(program) {
    const featuresHtml = program.keyFeatures
        .map(f => `<li>${esc(f)}</li>`)
        .join("");

    const pdfLinksHtml = (program.pdfUrls || [])
        .map(p => `<a href="${esc(p.url)}" target="_blank" class="pathway-pdf-link">${esc(p.label)}</a>`)
        .join("");

    return `
        <div class="pathway-program-card" data-type="${esc(program.type)}" data-access="${esc(program.access)}">
            <div class="pathway-card-header">
                <h3>${esc(program.name)}</h3>
                <div class="pathway-card-badges">
                    <span class="pathway-badge ${accessBadgeClass(program.access)}">${esc(program.access.toUpperCase())}</span>
                    <span class="pathway-badge type-${esc(program.type)}">${typeBadgeLabel(program.type)}</span>
                </div>
            </div>
            <p class="pathway-org">${esc(program.organization)}</p>
            <p class="pathway-desc">${esc(program.description)}</p>
            <div class="pathway-features">
                <strong>Key Features:</strong>
                <ul>${featuresHtml}</ul>
            </div>
            <div class="pathway-meta">
                <div><strong>Coverage:</strong> ${esc(program.coverage)}</div>
                <div><strong>NSCLC:</strong> ${program.nsclcCoverage ? '<span class="pathway-nsclc-yes">Yes</span>' : '<span class="pathway-nsclc-no">No</span>'}</div>
                <div><strong>Data Access:</strong> ${esc(program.dataAvailability)}</div>
            </div>
            ${pdfLinksHtml ? `<div class="pathway-pdf-links">${pdfLinksHtml}</div>` : ""}
            <a href="${esc(program.url)}" target="_blank" class="pathway-source-link">Visit Source &rarr;</a>
        </div>
    `;
}

function renderPrograms(filter = {}) {
    const grid = document.getElementById("pathway-programs-grid");
    let programs = PATHWAY_PROGRAMS;

    if (filter.type) {
        programs = programs.filter(p => p.type === filter.type);
    }
    if (filter.access) {
        programs = programs.filter(p => p.access === filter.access);
    }
    if (filter.search) {
        const q = filter.search.toLowerCase();
        programs = programs.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.organization.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }

    if (programs.length === 0) {
        grid.innerHTML = '<p class="no-results">No pathway programs match your filters.</p>';
        return;
    }

    grid.innerHTML = programs.map(renderProgramCard).join("");
}

function renderVAPathways() {
    const container = document.getElementById("va-pathway-details");
    const data = VA_PATHWAY_DATA;

    const sectionsHtml = data.sections
        .map(s => `
            <div class="va-section">
                <h4>${esc(s.title)}</h4>
                <p>${esc(s.content)}</p>
            </div>
        `)
        .join("");

    const pdfLinksHtml = data.pdfUrls
        ? data.pdfUrls.map(p => `<a href="${esc(p.url)}" target="_blank" class="pathway-pdf-link">${esc(p.label)}</a>`).join("")
        : "";

    const otherPathwaysHtml = data.otherCancerPathways
        .map(p => `<a href="${esc(p.url)}" target="_blank" class="va-other-pathway">${esc(p.name)}</a>`)
        .join(" | ");

    // Use pdfUrls from the VA program entry if available
    const vaProgram = PATHWAY_PROGRAMS.find(p => p.id === "va");
    const vaPdfLinks = (vaProgram && vaProgram.pdfUrls || [])
        .map(p => `<a href="${esc(p.url)}" target="_blank" class="pathway-pdf-link">${esc(p.label)}</a>`)
        .join("");

    container.innerHTML = `
        <div class="va-header">
            <div><strong>Version:</strong> ${esc(data.version)} &nbsp;|&nbsp; <strong>Updated:</strong> ${esc(data.lastUpdated)} &nbsp;|&nbsp; <strong>Contact:</strong> <a href="mailto:${esc(data.contact)}">${esc(data.contact)}</a></div>
        </div>
        <div class="va-pdf-links">
            <strong>Download PDFs:</strong><br>
            ${vaPdfLinks}
        </div>
        ${sectionsHtml}
        <div class="va-other-pathways">
            <h4>Other VA Cancer Pathways Available</h4>
            <p>${otherPathwaysHtml}</p>
        </div>
    `;
}

function renderNCIReference() {
    const container = document.getElementById("nci-reference");
    const data = NCI_PDQ_DATA;

    const stagesHtml = data.stageOverview
        .map(s => `
            <tr>
                <td><strong>${esc(s.stage)}</strong></td>
                <td>${esc(s.treatment)}</td>
            </tr>
        `)
        .join("");

    container.innerHTML = `
        <p>${esc(data.description)}</p>
        <div class="nci-links">
            <a href="${esc(data.healthProfessionalUrl)}" target="_blank" class="pathway-source-link">Health Professional Version &rarr;</a>
            <a href="${esc(data.patientUrl)}" target="_blank" class="pathway-source-link">Patient Version &rarr;</a>
            <a href="${esc(data.ncbiBookshelfUrl)}" target="_blank" class="pathway-source-link">NCBI Bookshelf &rarr;</a>
        </div>
        <h4>Treatment Options by Stage</h4>
        <table class="pathway-table">
            <thead>
                <tr><th>Stage</th><th>Standard Treatment Options</th></tr>
            </thead>
            <tbody>${stagesHtml}</tbody>
        </table>
    `;
}

function renderNCCNReference() {
    const container = document.getElementById("nccn-reference");
    const data = NCCN_DATA;

    const updatesHtml = data.recentUpdates
        .map(u => `<li>${esc(u)}</li>`)
        .join("");

    container.innerHTML = `
        <div class="nccn-header">
            <div><strong>Current Version:</strong> ${esc(data.currentVersion)}</div>
            <div><strong>Access:</strong> ${esc(data.accessNote)}</div>
        </div>
        <div class="nccn-links">
            <a href="${esc(data.url)}" target="_blank" class="pathway-source-link">View Guidelines (requires login) &rarr;</a>
            <a href="${esc(data.navigatorUrl)}" target="_blank" class="pathway-source-link">NCCN Guidelines Navigator &rarr;</a>
            <a href="${esc(data.patientGuidelinesUrl)}" target="_blank" class="pathway-source-link">Patient Guidelines &rarr;</a>
        </div>
        <h4>Recent Key Updates (2025-2026)</h4>
        <ul class="nccn-updates">${updatesHtml}</ul>
    `;
}

function renderMonitoringLandscape() {
    const container = document.getElementById("monitoring-landscape");

    const cardsHtml = MONITORING_PLATFORMS
        .map(p => {
            const capsHtml = p.capabilities.map(c => `<li>${esc(c)}</li>`).join("");
            return `
                <div class="monitoring-card">
                    <h4>${esc(p.name)}</h4>
                    <p class="monitoring-provider">${esc(p.provider)}</p>
                    <p>${esc(p.description)}</p>
                    <ul>${capsHtml}</ul>
                    <a href="${esc(p.url)}" target="_blank" class="pathway-source-link">Learn More &rarr;</a>
                </div>
            `;
        })
        .join("");

    container.innerHTML = cardsHtml;
}

function renderBiomarkerGrid() {
    const container = document.getElementById("biomarker-grid");

    const rowsHtml = BIOMARKER_THERAPIES
        .map(b => {
            const firstLineHtml = b.firstLine.map(t => `<span class="therapy-tag first-line">${esc(t)}</span>`).join(" ");
            const subsequentHtml = b.subsequent.map(t => `<span class="therapy-tag subsequent">${esc(t)}</span>`).join(" ");
            return `
                <div class="biomarker-card">
                    <div class="biomarker-header">
                        <h4>${esc(b.biomarker)}</h4>
                        <span class="biomarker-prevalence">${esc(b.prevalence)}</span>
                    </div>
                    <div class="biomarker-therapies">
                        <div class="therapy-line">
                            <strong>1L:</strong> ${firstLineHtml}
                        </div>
                        <div class="therapy-line">
                            <strong>2L+:</strong> ${subsequentHtml}
                        </div>
                    </div>
                    <p class="biomarker-relevance"><em>${esc(b.pathwayRelevance)}</em></p>
                </div>
            `;
        })
        .join("");

    container.innerHTML = rowsHtml;
}


// ── Event Listeners & Init ────────────────────────────────────────────

function getFilters() {
    return {
        search: document.getElementById("pathway-search").value.trim(),
        type: document.getElementById("pathway-type-filter").value,
        access: document.getElementById("pathway-access-filter").value,
    };
}

document.getElementById("pathway-search").addEventListener("input", () => renderPrograms(getFilters()));
document.getElementById("pathway-type-filter").addEventListener("change", () => renderPrograms(getFilters()));
document.getElementById("pathway-access-filter").addEventListener("change", () => renderPrograms(getFilters()));

// Initial render
renderStats();
renderPrograms();
renderVAPathways();
renderNCIReference();
renderNCCNReference();
renderMonitoringLandscape();
renderBiomarkerGrid();
