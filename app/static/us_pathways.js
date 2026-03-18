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
        url: "https://providers.carelonmedicalbenefitsmanagement.com/medoncology-ccqp/about-the-program/carelon-cancer-treatment-pathways/",
        dataAvailability: "Carelon NSCLC guidelines page exists (login-gated); CCQP FAQ PDFs public; published adherence data in PMC",
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
        access: "semi-public",
        coverage: "Multiple health plan clients (NHPRI, EmblemHealth, Humana, AON, others)",
        nsclcCoverage: true,
        description: "Manages oncology prior authorisations for health plans with pathways embedded in utilisation review. Publishes an Oncology Drug List (ODL) with preferred/nonpreferred agent designations and individual Evolent Clinical Guidelines (ECGs) for specific drugs. ODL and ECGs are publicly accessible via contracted health plan websites.",
        keyFeatures: [
            "Oncology Drug List (ODL) with preferred/nonpreferred agent tiers — publicly accessible",
            "Individual ECGs with drug-specific NSCLC coverage criteria and positions",
            "Notably prefers cemiplimab over pembrolizumab for frontline PD-L1 ≥1% NSCLC (cost-driven)",
            "Embedded pathways in utilisation review for multiple health plans",
            "Peer-to-peer counselling model for pathway deviations",
        ],
        url: "https://www.nhpri.org/blobnhpri08e0944faa/wp-content/uploads/2026/01/Evolent-Oncology-Drug-List-ODL-January-2026_final-1.pdf",
        pdfUrls: [
            { label: "Evolent ODL January 2026 (NHPRI)", url: "https://www.nhpri.org/blobnhpri08e0944faa/wp-content/uploads/2026/01/Evolent-Oncology-Drug-List-ODL-January-2026_final-1.pdf" },
            { label: "ECG-3000: Abraxane (nab-paclitaxel)", url: "https://www.nhpri.org/blobnhpri08e0944faa/wp-content/uploads/2025/05/ECG-3000-for-Abraxane-nab-paclitaxel_final.pdf" },
            { label: "ECG-3021: Tarceva (erlotinib)", url: "https://www.nhpri.org/blobnhpri08e0944faa/wp-content/uploads/2025/05/ECG-3021-for-Tarceva-erlotinib_final.pdf" },
        ],
        dataAvailability: "ODL and ECGs publicly accessible via contracted health plan websites (NHPRI, EmblemHealth)",
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
        description: "OneOncology has finalised 25 oncology and hematology pathways covering lung, breast, GI, GU, and hematology disease groups. ASCO-certified (May 2024, only 5th programme to achieve certification). Delivered through an internal clinical decision support tool. Pathways are NCCN-concordant and updated in real-time for new FDA approvals. Target adherence rate: 80%.",
        keyFeatures: [
            "25 ASCO-certified oncology and hematology pathways",
            "NCCN-concordant with real-time updates for new FDA approvals",
            "Covers lung, breast, GI, GU, and hematology",
            "80% adherence target met by all practices",
            "Published methodology in AJMC",
        ],
        url: "https://www.oneoncology.com/blog/oneoncologys-treatment-pathways-certified-by-asco/",
        dataAvailability: "ASCO-certified methodology published; specific regimen detail internal to network",
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
        description: "Pharmacist-driven clinical pathways supporting value-based care across the AON network. In November 2025, AON partnered with Evolent Health to embed treatment pathways directly in EHR, eliminating prior authorisation for providers adhering to high-quality pathways. Uses MiBA (Meaningful Insights Biotech Analytics) co-developed analytics platform.",
        keyFeatures: [
            "Evolent/AON partnership eliminates PA for on-pathway treatment (Nov 2025)",
            "Pharmacist-driven pathway implementation",
            "EHR-embedded Evolent Level 1 pathways",
            "MiBA analytics platform for evidence-based insights",
            "Published JCP study on treatment selection patterns",
        ],
        url: "https://www.aoncology.com/2025/11/06/evolent-and-american-oncology-network-unveil-innovative-model/",
        dataAvailability: "Evolent/AON partnership model published; EHR-embedded pathways; regimen detail internal",
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

    {
        id: "aetna",
        name: "Aetna / CVS Health Oncology Management",
        organization: "Aetna (CVS Health)",
        type: "payer",
        access: "proprietary",
        coverage: "~23M medical members nationally",
        nsclcCoverage: true,
        description: "Aetna uses clinical policy bulletins and prior authorisation pathways for oncology, partnering with AIM Specialty Health for oncology utilization management. Covers major cancer types including NSCLC across commercial, Medicare Advantage, and Medicaid plans.",
        keyFeatures: [
            "Clinical policy bulletins for oncology coverage decisions",
            "AIM Specialty Health partnership for oncology PA",
            "~23M medical members nationally",
            "Covers commercial, Medicare Advantage, and Medicaid",
        ],
        url: "https://www.aetna.com/health-care-professionals/clinical-policy-bulletins.html",
        dataAvailability: "Not publicly available; provider portal access only",
        lastChecked: "2026-03",
    },

    // ── Academic / Major Cancer Centre Pathways ─────────────────────
    {
        id: "mdanderson",
        name: "MD Anderson Clinical Practice Algorithms",
        organization: "The University of Texas MD Anderson Cancer Center",
        type: "academic",
        access: "semi-public",
        coverage: "MD Anderson network + widely referenced by community oncologists",
        nsclcCoverage: true,
        description: "MD Anderson publishes detailed clinical practice algorithms for all major cancer types including NSCLC. Their Oncology Expert Advisor (OEA) platform provides evidence-based treatment recommendations. Among the most widely referenced institutional pathways in the US.",
        keyFeatures: [
            "Publicly available clinical algorithms for NSCLC",
            "Oncology Expert Advisor (OEA) decision support platform",
            "Regularly updated with latest evidence",
            "Covers full treatment continuum from diagnosis to survivorship",
        ],
        url: "https://www.mdanderson.org/for-physicians/clinical-tools-resources/clinical-practice-algorithms.html",
        dataAvailability: "Algorithms freely available online; OEA platform subscription-based",
        lastChecked: "2026-03",
    },
    {
        id: "msk",
        name: "Memorial Sloan Kettering Clinical Guidelines",
        organization: "Memorial Sloan Kettering Cancer Center",
        type: "academic",
        access: "semi-public",
        coverage: "MSK network + MSK Alliance community oncology partners",
        nsclcCoverage: true,
        description: "MSK develops institutional clinical pathways and maintains OncoKB, an FDA-partially-recognized precision oncology knowledge base with structured gene-drug pairs for NSCLC. MSK-CHORD (Nature 2024) provides real-world treatment data from 7,809 NSCLC patients. As an NCCN founding member, MSK's guidelines influence national oncology practice.",
        keyFeatures: [
            "OncoKB (oncokb.org) — publicly accessible precision oncology knowledge base with NSCLC Level 1 gene-drug pairs",
            "MSK-CHORD: 7,809 NSCLC patients with real-world clinicogenomic treatment data (Nature 2024)",
            "MSK-IMPACT: 10,000+ patients sequenced; public data via cBioPortal",
            "NCCN founding member — Riely and Yu are key NSCLC guideline contributors",
            "MSK Alliance network extends genomics-driven protocols to community practices",
        ],
        url: "https://www.oncokb.org/actionable-genes",
        dataAvailability: "OncoKB gene-drug pairs publicly accessible; MSK-CHORD treatment data via Nature; formal institutional pathways internal only",
        lastChecked: "2026-03",
    },
    {
        id: "mayo",
        name: "Mayo Clinic Oncology Clinical Pathways",
        organization: "Mayo Clinic",
        type: "academic",
        access: "proprietary",
        coverage: "Mayo Clinic network (Rochester, Phoenix, Jacksonville, Mayo Clinic Health System)",
        nsclcCoverage: true,
        description: "Mayo Clinic maintains internal oncology pathways across its multi-site network. Pathways integrate with their EHR system for clinical decision support. As an NCCN member, Mayo closely aligns with national guidelines while incorporating institution-specific preferences.",
        keyFeatures: [
            "Internal clinical decision support across Mayo network",
            "EHR-integrated oncology pathways",
            "Multi-site consistency (Rochester, Phoenix, Jacksonville)",
            "NCCN member institution",
        ],
        url: "https://www.mayoclinicproceedings.org/article/S0025-6196(19)30070-9/fulltext",
        dataAvailability: "Mayo Clinic Proceedings (2019) published NSCLC treatment algorithm; CancerNetwork (2024) panel reveals EGFR preferences; formal pathways internal only",
        lastChecked: "2026-03",
    },
    {
        id: "flatiron",
        name: "Flatiron Health OncoEMR Platform",
        organization: "Flatiron Health (Roche subsidiary)",
        type: "commercial",
        access: "proprietary",
        coverage: "280+ community oncology practices, ~3,000 clinicians, 2.4M+ patient records",
        nsclcCoverage: true,
        description: "Flatiron Health's OncoEMR platform includes clinical decision support and treatment analytics used by 280+ community oncology practices. Their real-world data platform tracks treatment patterns across ~3,000 clinicians. Widely used for pathway adherence monitoring and real-world evidence generation.",
        keyFeatures: [
            "EHR-integrated clinical decision support (OncoEMR)",
            "Real-world evidence from 2.4M+ patient records",
            "Treatment pattern analytics for 280+ practices",
            "Pathway adherence monitoring and benchmarking",
        ],
        url: "https://flatiron.com/",
        dataAvailability: "Subscription-based; aggregated data available for research partnerships",
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


// ── Data Sourcing Methodology (Appendix) ─────────────────────────────
// Documents how each program entry was sourced, what evidence is available,
// and an honest confidence rating for QC purposes.
// confidence: "high" = direct public data, "medium" = verifiable but indirect, "low" = inferred from secondary sources

const DATA_METHODOLOGY = {
    uhc: {
        confidence: "high",
        urlQuality: "Direct link to pathway program page with regimen PDF",
        primarySources: [
            "UHC Provider Portal — Cancer Therapy Pathways Program page (publicly accessible)",
            "Cancer Therapy Pathways Regimens PDF (publicly hosted, lists all on-pathway regimens by tumour type)",
        ],
        secondarySources: [
            "CMS Innovation Center OCM model documentation (UHC participation)",
            "Peer-reviewed: Hoverman et al. (JOP 2011) — pathway adherence outcomes at US Oncology",
        ],
        methodology: "Regimen list extracted directly from the publicly hosted PDF. Program structure, incentive amounts ($1,000/regimen), and coverage (27M members) verified from UHC provider communications and ASCO/AMCP conference presentations.",
        limitations: "PDF may lag behind portal-level updates. Detailed clinical notes/restrictions visible only to contracted providers via the CGP tool.",
        dataInComparison: "Therapy positions in the Comparison Matrix are derived from the public regimen PDF. Statuses (preferred/recommended) inferred from regimen listing and NCCN alignment.",
    },
    anthem: {
        confidence: "medium",
        urlQuality: "Carelon NSCLC guidelines page exists (login-gated); CCQP FAQ PDFs publicly available",
        primarySources: [
            "Carelon Clinical Guidelines: Lung Cancer, Non-Small Cell (guidelines.carelonmedicalbenefitsmanagement.com/lung-cancer-non-small-cell/) — page confirmed but regimen detail behind login",
            "Carelon CCQP FAQ PDF (publicly hosted): providers.carelonmedicalbenefitsmanagement.com/medoncology-ccqp/wp-content/uploads/sites/9/2022/12/Elevance_CCQP_FAQ.pdf",
            "Carelon Cancer Treatment Pathways programme page (public): providers.carelonmedicalbenefitsmanagement.com/medoncology-ccqp/about-the-program/carelon-cancer-treatment-pathways/",
        ],
        secondarySources: [
            "PMC5584892: Validation of clinical data from CCQP integrated with administrative claims data",
            "PMC4570054: Anthem's Clinical Pathways Demonstrate Value — The Payer Perspective",
            "Carelon Research: P4P Program Boosted Evidence-Based Care",
        ],
        methodology: "Programme structure confirmed from publicly accessible Carelon pages and FAQ PDFs. NSCLC-specific pathway worksheet exists (Lung-NSCLC_WS_AIM_Eff-2025-04-21.pdf) but is 403-protected on the Carelon server. PMC4570054 reports 63% NSCLC on-pathway adherence and 60 programme-endorsed regimens out of 402 prescribed. Pathways developed by Carelon oncologists/pharmacists consulting with academic/community oncologist panel, based on NCCN guidelines. Updated at least quarterly. $350/month provider incentive with no off-pathway penalty (note: enhanced reimbursement discontinued in some states, e.g. Ohio Dec 2022).",
        limitations: "NSCLC pathway worksheet PDF exists on Carelon server but returns 403 (requires provider login). Published literature reports aggregate adherence data (63% NSCLC on-pathway, 60 endorsed regimens) but does not enumerate specific regimen lists. $350/month enhanced reimbursement has been discontinued in some states.",
        dataInComparison: "Therapy positions based on Carelon's documented NCCN alignment and published adherence data. Medium confidence — programme is well-documented but regimen-level detail requires portal access.",
    },
    humana: {
        confidence: "medium",
        urlQuality: "Generic provider portal; Evolent ODL (publicly accessible) provides drug tier data applicable to Humana plans",
        primarySources: [
            "Evolent Oncology Drug List (ODL) January 2026 — Humana partners with Evolent for oncology PA management; ODL publicly accessible via NHPRI",
            "Humana provider communications mentioning oncology quality management",
            "Evolent/AON partnership documentation (Humana is a key Evolent client)",
        ],
        secondarySources: [
            "AJMC coverage of Humana oncology management programme",
            "Evolent Health investor presentations referencing Humana partnership",
        ],
        methodology: "Humana's oncology management is administered by Evolent Health (formerly New Century Health). The Evolent ODL January 2026 provides preferred/nonpreferred drug tiers that are applicable to Humana plans. Key data: cemiplimab preferred over pembrolizumab for PD-L1 ≥1% NSCLC; abraxane not supported; erlotinib restricted. Programme structure (peer-to-peer counseling, pre-certification integration) from published Humana provider descriptions.",
        limitations: "Evolent ODL is published via NHPRI, not directly by Humana. The degree to which Humana-specific plans follow the exact Evolent ODL tiers may vary. Humana provider portal still has no direct pathway content.",
        dataInComparison: "Therapy positions now informed by Evolent ODL preferred/nonpreferred designations. Medium confidence — ODL data is publicly citable but applicability to specific Humana plans may vary.",
    },
    "bcbs-michigan": {
        confidence: "low",
        urlQuality: "Generic BCBSM corporate homepage; original Cardinal Health pathway programme may have been superseded by Carelon",
        primarySources: [
            "Published literature: Neubauer et al. (JOP 2010, PMC3348604) — BCBSM/Cardinal Health pathway pilot outcomes (8% reduction in treatment variation, ~$8.5M savings year 1)",
            "BCBSM oncology PA FAQ indicates transition to Carelon (formerly AIM Specialty Health) for oncology management",
        ],
        secondarySources: [
            "MOQC (Michigan Oncology Quality Consortium) continues as BCBSM-funded quality collaborative",
            "BCBSM Oncology Value Management via Carelon FAQ PDF (ereferrals.bcbsm.com)",
        ],
        methodology: "One of the earliest documented payer-provider pathway programs. Programme structure and outcomes well-documented in peer-reviewed literature. However, oncology PA appears to have transitioned to Carelon, suggesting the original Cardinal Health programme may be superseded.",
        limitations: "Published research is from 2010-2012 — programme has likely evolved significantly or been replaced by Carelon. No current regimen lists available. MOQC quality collaborative continues but does not publish regimen-level pathway data.",
        dataInComparison: "Not included in the Comparison Matrix due to insufficient current regimen-level data and uncertainty about current programme status.",
    },
    evicore: {
        confidence: "medium",
        urlQuality: "Direct link to eviCore pathways programme page with programme description",
        primarySources: [
            "eviCore Insights — Pathways Program page (publicly accessible)",
            "eviCore provider communications and clinical guidelines",
        ],
        secondarySources: [
            "Evernorth/Cigna investor presentations on oncology utilisation management",
            "AMCP conference presentations on eviCore pathway outcomes",
        ],
        methodology: "Programme structure confirmed from the eviCore website. Immediate PA approval for on-pathway regimens is documented in provider-facing materials. Specific regimen lists are accessible only through the eviCore provider portal.",
        limitations: "While the programme page is informative, actual regimen-level pathway data is behind the provider portal. Therapy positions require portal access to verify.",
        dataInComparison: "Therapy positions inferred from documented NCCN alignment and available provider communications. Medium confidence — positions reflect expected NCCN-aligned behaviour.",
    },
    evolent: {
        confidence: "high",
        urlQuality: "Evolent Oncology Drug List (ODL) and individual ECGs publicly accessible via contracted health plan websites",
        primarySources: [
            "Evolent Oncology Drug List (ODL) January 2026 — publicly hosted on NHPRI (nhpri.org/.../Evolent-Oncology-Drug-List-ODL-January-2026_final-1.pdf)",
            "Evolent Clinical Guideline ECG-3000: Abraxane — 'Not supported' for NSCLC (nhpri.org/.../ECG-3000-for-Abraxane-nab-paclitaxel_final.pdf)",
            "Evolent Clinical Guideline ECG-3021: Tarceva — restricted based on lack of Level 1 evidence vs alternatives",
            "Evolent Clinical Guideline ECG-3018: Opdivo (nivolumab) — coverage criteria for NSCLC",
            "Evolent Clinical Guideline ECG-3105: Imfinzi (durvalumab) — supported for stage II-III consolidation only",
        ],
        secondarySources: [
            "Evolent ODL June 2024 (nhpri.org) — earlier version for comparison",
            "Evolent/AON partnership press release (Nov 2025)",
        ],
        methodology: "Drug-level preferred/nonpreferred designations extracted directly from Evolent ODL January 2026 PDF. Individual ECGs provide detailed coverage criteria and institutional positions for specific drugs. These documents are publicly hosted on health plan websites (NHPRI, EmblemHealth) because those plans contract with Evolent for oncology PA management. Key finding: cemiplimab (Libtayo) is PREFERRED over pembrolizumab (Keytruda) for frontline PD-L1 ≥1% NSCLC monotherapy — this diverges from NCCN and likely reflects cost/contracting considerations.",
        limitations: "ODL reflects Evolent's UM position, not necessarily clinical consensus. Cemiplimab preference over pembrolizumab is cost-driven and diverges from NCCN. ECGs are hosted on specific plan websites — availability may vary. Evolent serves as PA management infrastructure, so its positions are applied across multiple plans (Humana, NHPRI, etc.).",
        dataInComparison: "Not currently a separate column in the Comparison Matrix, but Evolent's ODL positions inform the Humana column (as Humana partners with Evolent for oncology management). High confidence for the documented preferred/nonpreferred designations.",
    },
    moffitt: {
        confidence: "low",
        urlQuality: "Direct link to Moffitt clinical pathways page — minimal public content; pathway data delivered via EvidenceCare/OncologyCare EHR integration",
        primarySources: [
            "Moffitt Cancer Center: Clinical Pathways landing page (moffitt.org/for-healthcare-professionals/clinical-pathways/)",
            "AJMC: 'From Making Oncology Clinical Pathways Multidisciplinary, to Adding the Patient's Voice' — describes Moffitt's pathway programme history (since 2009) and methodology",
            "EvidenceCare/OncologyCare partnership with Moffitt (evidence.care/carepathways/oncologycare/) — EHR-integrated pathway delivery platform",
        ],
        secondarySources: [
            "AJMC: 'With Broad Input, Clinical Pathways Making a Difference for End Users' — Moffitt pathway details",
            "Moffitt NSCLC treatment pages (moffitt.org/cancers/lung-cancer/) — general treatment approach but not pathway-specific",
        ],
        methodology: "Moffitt's pathway programme (established 2009) is well-documented in AJMC publications. Pathways are EHR-integrated via EvidenceCare/OncologyCare platform, incorporating clinical trials and drug costs. Pathways are truly multidisciplinary (medical, surgical, radiation oncology). However, the actual regimen-level pathway content is only accessible to Moffitt-affiliated clinicians through the EHR-integrated platform.",
        limitations: "Despite the public pathway page and published programme descriptions, no regimen-level NSCLC data is publicly accessible. The EvidenceCare platform delivers pathways within the EHR — content cannot be extracted without institutional access. Programme methodology is documented but specific therapy preferences are not.",
        dataInComparison: "Therapy positions are inferred from Moffitt's NCCN alignment, published multidisciplinary approach, and general treatment descriptions. Low confidence — these are approximations, not verified extractions.",
    },
    "upmc-hillman": {
        confidence: "medium",
        urlQuality: "Direct link to UPMC Hillman treatment pathways page with programme description",
        primarySources: [
            "UPMC Hillman Cancer Center — Treatment Pathways page (public)",
            "Published research: Ellis et al. (JOP 2017) — Via Oncology pathway outcomes in NSCLC",
        ],
        secondarySources: [
            "Elsevier ClinicalPath product documentation",
            "Via Oncology publications on pathway development methodology",
        ],
        methodology: "The URL has a public-facing description of the pathways programme. Detailed programme structure, cost outcomes (35% lower outpatient costs), and clinical trial accrual data from peer-reviewed publications. Powered by Elsevier ClinicalPath — same platform used commercially.",
        limitations: "Actual pathway regimen selections are behind the ClinicalPath platform subscription. Published data demonstrates outcomes but doesn't expose current regimen choices.",
        dataInComparison: "Positions derived from published ClinicalPath outcomes literature and platform methodology documentation. Reasonable confidence for major regimens; less certain for newer therapies.",
    },
    "us-oncology": {
        confidence: "medium",
        urlQuality: "McKesson specialty solutions page — programme description but no regimen data",
        primarySources: [
            "McKesson Specialty — Oncology Clinical Management Technology page",
            "Ontada / Clear Value Plus platform documentation",
            "Published: Hoverman et al. (JOP 2011) — Value Pathways cost/survival outcomes",
        ],
        secondarySources: [
            "NCCN partnership announcements for Value Pathways",
            "McKesson investor presentations on US Oncology Network",
        ],
        methodology: "Programme structure documented through McKesson/Ontada product pages and NCCN partnership materials. Cost and survival outcomes from peer-reviewed literature. '90% physician adherence' figure from US Oncology Network internal reporting cited in presentations.",
        limitations: "URL is a product overview page, not a regimen list. Value Pathways content is proprietary to US Oncology Network practices. 'Level I Pathway' designations not publicly available.",
        dataInComparison: "Positions based on documented NCCN alignment (programme is literally 'powered by NCCN') and published outcomes. High confidence for NCCN-preferred agents; less certain for positioning differences.",
    },
    oneoncology: {
        confidence: "medium",
        urlQuality: "Corporate homepage; pathway details published in AJMC and ASCO certification documentation",
        primarySources: [
            "OneOncology blog: 'Finalizes 25 Oncology and Hematology Pathways' (oneoncology.com/blog/oneoncology-finalizes-25-oncology-and-hematology-pathways/)",
            "OneOncology blog: 'Treatment Pathways Certified by ASCO' (oneoncology.com/blog/oneoncologys-treatment-pathways-certified-by-asco/) — 5th programme to achieve ASCO certification (May 2024)",
            "AJMC: 'OneOncology Finalizes 25 Clinical Pathways in Oncology and Hematology' — published programme methodology and adherence targets",
        ],
        secondarySources: [
            "AJMC: 'In Oncology Clinical Pathways, the Variability Isn't With the Drugs' — OneOncology physician interviews on pathway selection criteria",
            "AJMC: 'Clinical Pathways Must Be More Dynamic as Oncology Care Evolves Faster' — Edward Arrowsmith MD on NSCLC pathway approach",
        ],
        methodology: "Programme scope (25 pathways incl. lung, breast, GI, GU, hematology) and methodology published in AJMC. ASCO certification confirms concordance with evidence-based guidelines. 80% adherence target documented. Pathways are NCCN-concordant and updated in real-time for new FDA approvals. Efficacy and safety are primary criteria; cost considered secondarily within drug class.",
        limitations: "Specific regimen-level pathway selections (preferred vs. alternate agents) are internal to OneOncology's clinical decision support tool. Published AJMC articles describe methodology but not specific agent rankings.",
        dataInComparison: "Therapy positions based on documented NCCN concordance, ASCO certification, and published methodology descriptions. Medium confidence — methodology is transparent but specific agent preferences are not publicly disclosed.",
    },
    aon: {
        confidence: "medium",
        urlQuality: "Corporate homepage; pathway model published via Evolent partnership press release and JCP study",
        primarySources: [
            "Evolent/AON press release (Nov 2025): 'Innovative model seeking to improve cancer care while eliminating prior authorization burden' (aoncology.com/2025/11/06/evolent-and-american-oncology-network-unveil-innovative-model/)",
            "Journal of Clinical Pathways: Real-world study of treatment selection patterns across AON medical oncologists with EHR-embedded Evolent Level 1 pathways",
            "AON corporate: pharmacist-driven clinical pathway implementation documentation",
        ],
        secondarySources: [
            "Evolent investor presentations referencing AON partnership model",
            "AON P&T committee drug shortage management protocols",
            "MiBA (Meaningful Insights Biotech Analytics) platform documentation — co-developed with AON",
        ],
        methodology: "Evolent/AON partnership model well-documented in press release and JCP publication. Providers adhering to high-quality treatment pathways no longer need prior authorization for most tests/treatments. Evolent Level 1 pathways embedded in EHR. Pharmacist-driven implementation with MiBA analytics platform for evidence-based insights.",
        limitations: "Specific NSCLC regimen rankings are internal to the Evolent/AON pathway platform. Published JCP study provides adherence data but not specific preferred agent lists. Weight-based dosing initiative (e.g. pembrolizumab) documented but not regimen preference.",
        dataInComparison: "Not included in the Comparison Matrix due to insufficient regimen-level data. However, programme methodology is now well-documented from published sources.",
    },
    eviti: {
        confidence: "medium",
        urlQuality: "Direct product page with programme description and coverage details",
        primarySources: [
            "NantHealth — eviti Connect for Oncology product page",
            "ASCO classification of eviti as clinical decision support tool",
        ],
        secondarySources: [
            "Published literature on eviti integration with AllScripts EHR",
            "Payer utilization management documentation referencing eviti",
        ],
        methodology: "Product description and reach (7,700+ practices) from NantHealth product page. ASCO classification as 'decision support' rather than 'traditional pathway' from published ASCO oncology pathway landscape review.",
        limitations: "eviti operates as decision support integrated into EHR workflow — its 'pathway' recommendations are generated dynamically, not published as static lists. Therapy positions are harder to extract than static pathway programmes.",
        dataInComparison: "Positions based on eviti's documented NCCN alignment and available provider documentation. Medium confidence.",
    },
    aetna: {
        confidence: "high",
        urlQuality: "Direct link to Aetna Clinical Policy Bulletins — detailed NSCLC drug coverage criteria publicly accessible",
        primarySources: [
            "Aetna CPB #0890: Pembrolizumab (Keytruda) — NSCLC coverage criteria including PD-L1 thresholds, combination regimens, and continuation criteria (aetna.com/cpb/medical/data/800_899/0890.html)",
            "Aetna CPB #0995: Amivantamab (Rybrevant) — EGFR mutation-specific NSCLC criteria (aetna.com/cpb/medical/data/900_999/0995.html)",
            "Aetna Specialty Pharmacy Policy #1663-A: Osimertinib (Tagrisso) — EGFR exon 19del/L858R and T790M criteria (aetna.com/products/rxnonmedicare/data/2024/Tagrisso_1663-A_SGM_P2024.html)",
            "Aetna Medicare Part B Step Therapy criteria: cemiplimab preferred over pembrolizumab/nivolumab for NSCLC (aetna.com/content/dam/aetna/pdfs/.../PD1-PDL1-inhibitors-1022-AMBST.pdf)",
        ],
        secondarySources: [
            "Aetna 2026 Commercial Clinical Program Summary PDF",
        ],
        methodology: "Therapy positions extracted directly from publicly accessible Aetna CPBs. Each CPB specifies exactly which NSCLC indications are considered 'medically necessary' including biomarker requirements, line of therapy, and combination regimen details. Medicare Part B step therapy criteria provide additional preference ranking data (cemiplimab preferred over other PD-1/PD-L1 agents).",
        limitations: "CPBs define coverage (medically necessary vs. not), not pathway preference in the traditional sense. Distinction between 'preferred' and 'covered' is mapped from step therapy tier (preferred = step 1, covered = standard PA). Policies are updated regularly — positions reflect last verification date.",
        dataInComparison: "Therapy positions extracted from CPBs. High confidence for coverage status and biomarker-specific indications. Step therapy preferences verified from Medicare Part B step criteria documents.",
    },
    mdanderson: {
        confidence: "medium",
        urlQuality: "Direct link to MD Anderson Clinical Practice Algorithms page — algorithms now appear to require login for full access",
        primarySources: [
            "MD Anderson Clinical Practice Algorithms landing page (mdanderson.org/for-physicians/clinical-tools-resources/clinical-practice-algorithms.html)",
            "MD Anderson Cancer Treatment Algorithms page (mdanderson.org/.../cancer-treatment-algorithms.html) — confirmed to list treatment algorithms but full content requires credentials",
            "MD Anderson Research Library guide on Clinical Practice Algorithms (mdanderson.libguides.com/c.php?g=564859&p=3890701)",
        ],
        secondarySources: [
            "Published MD Anderson research on NSCLC treatment outcomes (npj Precision Oncology 2026)",
            "MD Anderson contributions to NCCN Guidelines",
        ],
        methodology: "MD Anderson maintains clinical practice algorithms for cancer treatment and clinical management. Algorithm pages are publicly listed but full content now appears to require institutional login. MD Anderson is an NCCN member institution, so their algorithms are expected to align closely with NCCN recommendations. Published MD Anderson NSCLC research provides additional evidence for treatment preferences.",
        limitations: "Full algorithm content now appears login-gated (was previously more openly accessible). OEA platform is subscription-only. Therapy positions rely partly on published research and NCCN alignment rather than direct algorithm extraction.",
        dataInComparison: "Therapy positions based on MD Anderson's published research and NCCN membership. Medium-high confidence — MD Anderson algorithms are well-documented but current content requires institutional access to verify.",
    },
    msk: {
        confidence: "medium",
        urlQuality: "OncoKB (oncokb.org) is publicly accessible with structured gene-drug pair data; MSK clinical updates pages viewable in browser",
        primarySources: [
            "OncoKB (oncokb.org/actionable-genes) — MSK's FDA-partially-recognized precision oncology knowledge base with Level 1 gene-drug pairs for NSCLC including EGFR, ALK, ROS1, BRAF, KRAS G12C, RET, MET, HER2, NTRK",
            "MSK-CHORD (Nature 2024, doi:10.1038/s41586-024-08167-5) — 7,809 NSCLC patients with clinicogenomic real-world data including medication data",
            "MSK Clinical Updates: 'Systemic Therapy for Locally Advanced and Metastatic NSCLC' (mskcc.org/clinical-updates/) — biomarker-specific treatment discussions",
            "Chakravarty et al. JCO Precision Oncology 2017 — OncoKB foundational paper",
        ],
        secondarySources: [
            "Jordan et al. Cancer Discovery 2017 (PMC5482929): 93% of EGFR/ALK/ROS1+ patients received matched therapy at MSK",
            "Rizvi et al. Clin Cancer Res (PMC5026567): MSK data on PD-1 response rates by driver status",
            "cBioPortal MSK-IMPACT datasets — public genomic + treatment data (cbioportal.org)",
            "NCCN founding member — Riely MD PhD and Yu MD are key NSCLC guideline contributors",
        ],
        methodology: "OncoKB provides structured, citable MSK therapy preference data by biomarker-drug pair with evidence levels. Level 1 pairs represent FDA-approved indications curated by MSK. MSK-CHORD provides actual real-world treatment patterns from MSK's patient population. Clinical updates pages contain biomarker-specific treatment discussions. MSK does not publish a NCCN-style stepwise pathway under its own name, but OncoKB effectively serves as their precision oncology treatment guide.",
        limitations: "OncoKB lists gene-drug matches by evidence level but does not rank between drugs within the same level (e.g., does not distinguish between osimertinib vs. erlotinib as 'preferred' for EGFR). MSK clinical updates pages are blocked for automated access (403) but viewable in browser. No formal institutional pathway document with preference rankings exists publicly.",
        dataInComparison: "Therapy positions based on OncoKB Level 1 designations, MSK-CHORD treatment patterns, and published MSK research. Medium confidence — drug-biomarker matches are well-documented but within-class preference rankings are inferred.",
    },
    mayo: {
        confidence: "medium",
        urlQuality: "Generic medical professionals portal; institutional preferences documented in published literature and expert panels",
        primarySources: [
            "Mayo Clinic Proceedings 2019: 'Non-Small Cell Lung Cancer: Epidemiology, Screening, Diagnosis, and Treatment' (Duma, Santana-Davila, Molina — Mayo Division of Medical Oncology) DOI: 10.1016/j.mayocp.2019.01.013 — includes treatment algorithm figures for metastatic NSCLC",
            "CancerNetwork 2024: 'Mayo Clinic on AE Management Strategies for EGFR-Mutated NSCLC' (Leventakos, Mayo thoracic oncology) — states institutional preference for osimertinib + chemo over amivantamab + lazertinib in medically fit patients",
            "PMC9425065: Mayo systematic review on ICI efficacy by PD-L1 status (Yang, Adjei, Leventakos, Duma, Molina et al.)",
        ],
        secondarySources: [
            "Mayo Clinic Elsevier Pure: real-world ALK+ NSCLC treatment patterns study",
            "NCCN member institution — contributes to national guideline panels",
        ],
        methodology: "Mayo does not publish formal institutional pathways, but specific therapy preferences are documented in published literature and expert panel discussions. EGFR treatment preferences (osimertinib + chemo preferred) confirmed from 2024 CancerNetwork panel featuring Mayo thoracic oncologists. Broader NSCLC treatment algorithm published in Mayo Clinic Proceedings (2019) with biomarker-driven sequencing. ICI biomarker selection data from Mayo systematic review.",
        limitations: "No formal pathway document available publicly. Mayo Clinic Proceedings algorithm (2019) predates many current approvals (sotorasib, adagrasib, adjuvant osimertinib data, etc.). Specific preferences for KRAS G12C, ROS1, RET, MET, BRAF, or NTRK-driven NSCLC are not publicly documented. Immunotherapy regimen preferences (pembrolizumab vs. nivolumab/ipilimumab) for driver-negative NSCLC are not disclosed.",
        dataInComparison: "EGFR therapy positions based on published Mayo expert preferences (high confidence for osimertinib/osimertinib+chemo). Other biomarker positions inferred from NCCN alignment and published systematic reviews. Medium overall confidence — some positions are well-sourced, others remain estimates.",
    },
    flatiron: {
        confidence: "medium",
        urlQuality: "Corporate homepage — general product description but no pathway data",
        primarySources: [
            "Flatiron Health product documentation for OncoEMR",
            "Roche/Flatiron press releases on real-world data platform",
        ],
        secondarySources: [
            "Published Flatiron real-world evidence studies on NSCLC treatment patterns",
            "FDA regulatory filings using Flatiron real-world data",
        ],
        methodology: "Programme reach (280+ practices, 2.4M+ records) from Flatiron corporate materials. Flatiron functions primarily as a data/analytics platform rather than a pathway publisher. Treatment pattern data from published RWE studies.",
        limitations: "Flatiron is a platform/data company, not a traditional pathway programme. 'Pathway' positioning reflects their treatment analytics rather than explicit pathway recommendations. URL is corporate homepage.",
        dataInComparison: "Therapy positions reflect treatment patterns observed in Flatiron's published RWE studies rather than explicit 'pathway' recommendations. Medium confidence for pattern data; not direct pathway positions.",
    },
    va: {
        confidence: "high",
        urlQuality: "Direct link to VA Clinical Pathways hub with downloadable PDFs",
        primarySources: [
            "VA Cancer.gov — Clinical Pathways page with downloadable PDF files",
            "Lung Cancer Clinical Pathways V2.2025 PDF (508-compliant)",
            "VA Clinical Pathways Reference Sheet PDF",
        ],
        secondarySources: [
            "VA National Oncology Program documentation",
        ],
        methodology: "Therapy data extracted directly from VA Lung Cancer Clinical Pathways PDF V2.2025. PDFs are freely downloadable, publicly accessible, and regularly updated. Most reliable public US oncology pathway source. Stage-by-stage, biomarker-stratified treatment algorithms with explicit preferred/alternative designations.",
        limitations: "VA pathways are designed for the VA patient population (predominantly male, older, high comorbidity burden) — preferences may differ from commercial/community settings. Update cycle is quarterly.",
        dataInComparison: "Therapy positions directly extracted from VA PDF. High confidence — these are explicit, documented positions.",
    },
    "nci-pdq": {
        confidence: "high",
        urlQuality: "Direct link to NCI PDQ NSCLC Treatment Summary — full content visible",
        primarySources: [
            "NCI PDQ NSCLC Treatment Summary (Health Professional Version) — full text online",
            "NCBI Bookshelf PDQ mirror",
            "NCI Content Syndication API",
        ],
        secondarySources: [],
        methodology: "PDQ content is US government public domain, fully accessible online. Treatment options listed by stage with evidence levels. While not a 'pathway' in the traditional sense (no preferred/restricted designations), it documents evidence-supported treatment options comprehensively.",
        limitations: "PDQ summarises evidence rather than making pathway-style preference recommendations. It documents what is supported by evidence, not what should be preferred over alternatives. More useful as a reference than a pathway.",
        dataInComparison: "Not included in the Comparison Matrix as PDQ does not make preference designations between therapies.",
    },
    "mmit-pulse": {
        confidence: "medium",
        urlQuality: "Direct link to PULSE Analytics product page with programme description",
        primarySources: [
            "MMIT / Norstella — PULSE Analytics product page",
            "PULSE Analytics marketing materials and case studies",
        ],
        secondarySources: [
            "Norstella investor/partner presentations",
            "Published industry analyses referencing PULSE data",
        ],
        methodology: "Product scope (300+ brands, 69 indications) from MMIT marketing materials. PULSE is a monitoring platform that TRACKS pathway positions across programmes — it does not create pathways itself. Included as a key industry data source.",
        limitations: "PULSE is a commercial intelligence platform, not a pathway programme. Subscription-based access. No public data available.",
        dataInComparison: "Not applicable — PULSE is a monitoring tool, not a pathway programme with therapy positions.",
    },
    dedham: {
        confidence: "medium",
        urlQuality: "Direct link to Dedham Group pathways strategy service page",
        primarySources: [
            "The Dedham Group — Clinical Pathways Strategy service page",
            "Dedham Group marketing materials and whitepapers",
        ],
        secondarySources: [
            "Industry conference presentations featuring Dedham Group data",
        ],
        methodology: "Dedham Group is a consulting firm specialising in oncology pathway strategy, not a pathway publisher. Included because it is the premier US firm for pathway intelligence and influences how pharmaceutical companies interact with pathways. Service description from their website.",
        limitations: "Dedham Group produces proprietary analysis for pharmaceutical clients. Not a pathway programme. No public data.",
        dataInComparison: "Not applicable — consulting firm, not a pathway programme.",
    },
    clinicalpath: {
        confidence: "medium",
        urlQuality: "Direct link to Elsevier ClinicalPath product page with detailed description",
        primarySources: [
            "Elsevier — ClinicalPath product page with platform description",
            "Published: Ellis et al. (JOP 2017) — ClinicalPath/Via Oncology NSCLC outcomes",
        ],
        secondarySources: [
            "Via Oncology historical publications on pathway methodology",
            "MedTech Breakthrough 2019 award documentation",
        ],
        methodology: "Platform scope (2,000+ patient presentations, 1,500+ providers) from Elsevier product page. Pathway methodology and outcomes from published research (originally Via Oncology at UPMC). Clinical algorithms are expert-defined and reviewed quarterly.",
        limitations: "Actual pathway content is behind a subscription paywall. Published research provides methodology context but not current regimen selections. Platform is dynamic — positions may change between quarterly reviews.",
        dataInComparison: "Therapy positions based on published ClinicalPath literature and documented methodology. Medium confidence — positions reflect the platform's general approach rather than extracted current data.",
    },
};


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
    document.getElementById("stat-provider-programs").textContent = provider + PATHWAY_PROGRAMS.filter(p => p.type === "commercial" || p.type === "academic").length;
    document.getElementById("stat-public-sources").textContent = publicSources;
}

function accessBadgeClass(access) {
    if (access === "public") return "public";
    if (access === "semi-public") return "semi-public";
    return "proprietary";
}

function typeBadgeLabel(type) {
    const labels = { payer: "Payer", provider: "Provider", public: "Public/Gov", commercial: "Analytics", academic: "Academic" };
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
            <div class="pathway-card-footer">
                <a href="${esc(program.url)}" target="_blank" class="pathway-source-link">Visit Source &rarr;</a>
                ${program.lastChecked ? `<span class="pathway-verified-badge" title="Last verified ${esc(program.lastChecked)}">Verified ${esc(program.lastChecked)}</span>` : ""}
            </div>
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

    // Update results count
    const countEl = document.getElementById("pathway-results-count");
    if (countEl) {
        const hasFilters = filter.search || filter.type || filter.access;
        countEl.textContent = hasFilters ? `${programs.length} of ${PATHWAY_PROGRAMS.length} programs` : `${programs.length} programs`;
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
document.getElementById("pathway-reset-filters").addEventListener("click", () => {
    document.getElementById("pathway-search").value = "";
    document.getElementById("pathway-type-filter").value = "";
    document.getElementById("pathway-access-filter").value = "";
    renderPrograms({});
});

// ── Curated Therapy Preferences by Pathway Institution ──────────────
// This data is locally stored and curated from publicly available sources.
// Status values: "preferred" | "recommended" | "listed" | "not listed" | "restricted" | "unknown"
// nccnCategory: "preferred" | "other recommended" | "useful in certain circumstances"
//
// VERIFICATION STATUS: Each institution has a verification level indicating data provenance.
// "verified"   = positions extracted from a publicly accessible primary source (PDF, webpage, algorithm)
// "published"  = positions supported by published literature (journal articles, conference presentations)
// "inferred"   = positions assumed from NCCN alignment or general institutional reputation; no direct source

const PATHWAY_INSTITUTIONS = [
    { id: "nccn", name: "NCCN", fullName: "National Comprehensive Cancer Network", type: "guideline", version: "v5.2026", url: "https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1450" },
    { id: "va", name: "VA", fullName: "VA Oncology Pathways", type: "public", version: "V2.2025", url: "https://www.cancer.va.gov/clinical-pathways.html" },
    { id: "uhc", name: "UHC", fullName: "UnitedHealthcare Cancer Therapy Pathways", type: "payer", version: "2026", url: "https://www.uhcprovider.com/en/resource-library/cancer-therapy-pathways-program.html" },
    { id: "anthem", name: "Anthem", fullName: "Anthem / Elevance CCQP", type: "payer", version: "2026", url: "https://providers.carelonmedicalbenefitsmanagement.com/medoncology-ccqp/about-the-program/carelon-cancer-treatment-pathways/" },
    { id: "evicore", name: "eviCore", fullName: "eviCore Oncology (Cigna/Evernorth)", type: "payer", version: "2026", url: "https://www.evicore.com/insights/pathways-program" },
    { id: "humana", name: "Humana", fullName: "Humana Oncology Quality Management", type: "payer", version: "2026", url: "https://www.humana.com/provider" },
    { id: "us-oncology", name: "US Onc/NCCN", fullName: "Value Pathways powered by NCCN", type: "provider", version: "2026", url: "https://www.mckesson.com/specialty/technology-solutions-specialty-practices/oncology-clinical-management-technology/" },
    { id: "moffitt", name: "Moffitt", fullName: "Moffitt Cancer Center Clinical Pathways", type: "provider", version: "2026", url: "https://www.moffitt.org/for-healthcare-professionals/clinical-pathways/" },
    { id: "oneoncology", name: "OneOnc", fullName: "OneOncology Clinical Pathways", type: "provider", version: "2026", url: "https://www.oneoncology.com/" },
    { id: "aetna", name: "Aetna", fullName: "Aetna / CVS Health Oncology", type: "payer", version: "2026", url: "https://www.aetna.com/health-care-professionals/clinical-policy-bulletins.html" },
    { id: "mdanderson", name: "MDA", fullName: "MD Anderson Clinical Algorithms", type: "academic", version: "2026", url: "https://www.mdanderson.org/for-physicians/clinical-tools-resources/clinical-practice-algorithms.html" },
    { id: "msk", name: "MSK", fullName: "Memorial Sloan Kettering Guidelines", type: "academic", version: "2026", url: "https://www.oncokb.org/actionable-genes" },
    { id: "mayo", name: "Mayo", fullName: "Mayo Clinic Oncology Pathways", type: "academic", version: "2026", url: "https://www.mayoclinicproceedings.org/article/S0025-6196(19)30070-9/fulltext" },
    { id: "clinicalpath", name: "ClinicalPath", fullName: "Elsevier ClinicalPath (Via Oncology)", type: "commercial", version: "2026", url: "https://www.elsevier.com/products/clinicalpath" },
    { id: "eviti", name: "eviti", fullName: "eviti Connect (NantHealth)", type: "commercial", version: "2026", url: "https://nanthealth.com/payers/eviti-connect/eviti-oncology/" },
    { id: "flatiron", name: "Flatiron", fullName: "Flatiron Health OncoEMR", type: "commercial", version: "2026", url: "https://flatiron.com/" },
];

// Verification level per institution — determines how positions are displayed in the matrix
// "verified"  = extracted from a publicly accessible primary document
// "published" = supported by published literature (peer-reviewed or official presentations)
// "inferred"  = assumed from NCCN alignment; no direct source available
const INSTITUTION_VERIFICATION = {
    nccn:        { level: "verified",  source: "NCCN Guidelines v5.2026 (registration-gated but freely accessible)" },
    va:          { level: "verified",  source: "VA Lung Cancer Clinical Pathways PDF V2.2025 — directly downloadable" },
    uhc:         { level: "verified",  source: "UHC Cancer Therapy Pathways Regimens PDF — publicly hosted, regimen list extractable" },
    aetna:       { level: "verified",  source: "Aetna CPBs publicly accessible: pembrolizumab (#0890), amivantamab (#0995), osimertinib (#1663-A) with NSCLC-specific coverage criteria" },
    mdanderson:  { level: "published", source: "MD Anderson Clinical Practice Algorithms page exists but now requires login; algorithm content confirmed via MD Anderson research library guides" },
    "us-oncology": { level: "published", source: "Published: Hoverman et al. JOP 2011 (cost/survival outcomes); NCCN partnership — programme is 'Value Pathways powered by NCCN'" },
    evicore:     { level: "published", source: "eviCore clinical guidelines portal (medical oncology solution page); radiation/imaging guidelines publicly available as PDFs; medical oncology regimens require provider portal access" },
    clinicalpath:{ level: "published", source: "Via Oncology / ClinicalPath published methodology: Ellis et al. JOP 2017; Elsevier ClinicalPath publications page" },
    eviti:       { level: "published", source: "NantHealth product documentation; ASCO classification as clinical decision support tool" },
    anthem:      { level: "published", source: "Carelon NSCLC guidelines page confirmed (guidelines.carelonmedicalbenefitsmanagement.com/lung-cancer-non-small-cell/); CCQP FAQ PDFs public; PMC published adherence data (PMC5584892); regimen detail behind provider portal" },
    oneoncology: { level: "published", source: "25 pathways ASCO-certified (May 2024, 5th programme certified); published methodology in AJMC; 80% adherence target documented; regimen detail internal to network" },
    aon:         { level: "published", source: "Evolent/AON partnership (Nov 2025) with EHR-embedded pathways; JCP published adherence study; pharmacist-driven model documented" },
    humana:      { level: "published", source: "Humana partners with Evolent Health; Evolent ODL Jan 2026 (publicly accessible via NHPRI) provides preferred/nonpreferred drug tiers applicable to Humana plans" },
    moffitt:     { level: "inferred",  source: "EvidenceCare/OncologyCare EHR partnership confirmed (AJMC); pathway page exists but content behind institutional credentials; no public regimen data" },
    msk:         { level: "published", source: "OncoKB (oncokb.org) — MSK's FDA-recognized precision oncology knowledge base with Level 1 gene-drug pairs; MSK-CHORD (Nature 2024) real-world NSCLC treatment data; MSK clinical updates pages" },
    mayo:        { level: "published", source: "Mayo Clinic Proceedings 2019 (Duma, Molina et al.) published NSCLC treatment algorithm; CancerNetwork 2024 panel: Mayo experts prefer osimertinib+chemo over amivantamab+lazertinib for EGFR 1L" },
    flatiron:    { level: "inferred",  source: "Flatiron RWE publications reflect treatment patterns, not explicit pathway positions; platform/analytics company" },
};

const THERAPY_PREFERENCES = [
    // ── EGFR exon 19del / L858R — First Line ────────────────────────
    {
        biomarker: "EGFR (exon 19 del / L858R)",
        line: "1L",
        therapies: [
            {
                agent: "Osimertinib",
                brand: "Tagrisso",
                manufacturer: "AstraZeneca",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred 1L" },
                    uhc: { status: "preferred", note: "On-pathway regimen" },
                    anthem: { status: "preferred", note: "Standard on-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA approval" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I Pathway" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Algorithm-preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Osimertinib + carboplatin/pemetrexed",
                brand: "Tagrisso + chemo",
                manufacturer: "AstraZeneca",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (FLAURA2)" },
                    va: { status: "preferred", note: "Category 1" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "FLAURA2 protocol" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Amivantamab + lazertinib",
                brand: "Rybrevant + Lazcluze",
                manufacturer: "Janssen (J&J)",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (MARIPOSA)" },
                    va: { status: "preferred", note: "Listed as preferred" },
                    uhc: { status: "recommended", note: "Under review" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA pathway" },
                    humana: { status: "unknown", note: "Under review" },
                    "us-oncology": { status: "recommended", note: "Included" },
                    moffitt: { status: "recommended", note: "MARIPOSA protocol" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "Listed" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Erlotinib",
                brand: "Tarceva",
                manufacturer: "Roche/Genentech",
                nccnCategory: "useful in certain circumstances",
                positions: {
                    nccn: { status: "listed", note: "Other recommended" },
                    va: { status: "not listed", note: "Not on current pathway" },
                    uhc: { status: "not listed", note: "" },
                    anthem: { status: "not listed", note: "" },
                    evicore: { status: "restricted", note: "If osimertinib not tolerated" },
                    humana: { status: "not listed", note: "" },
                    "us-oncology": { status: "not listed", note: "" },
                    moffitt: { status: "not listed", note: "" },
                    oneoncology: { status: "not listed", note: "" },
                    clinicalpath: { status: "not listed", note: "" },
                    eviti: { status: "restricted", note: "Only if TKI-intolerant" },
                    aetna: { status: "not listed", note: "" },
                    mdanderson: { status: "listed", note: "Algorithm-listed" },
                    msk: { status: "listed", note: "Listed" },
                    mayo: { status: "listed", note: "Listed" },
                    flatiron: { status: "listed", note: "Low adoption" },
                },
            },
        ],
    },
    // ── EGFR exon 20 insertion — First Line ─────────────────────────
    {
        biomarker: "EGFR (exon 20 insertion)",
        line: "1L",
        therapies: [
            {
                agent: "Amivantamab + chemo + lazertinib",
                brand: "Rybrevant + chemo + Lazcluze",
                manufacturer: "Janssen (J&J)",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (PAPILLON)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Listed" },
                    moffitt: { status: "preferred", note: "PAPILLON protocol" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Platinum + pemetrexed + pembrolizumab",
                brand: "Chemo + Keytruda",
                manufacturer: "Merck",
                nccnCategory: "other recommended",
                positions: {
                    nccn: { status: "recommended", note: "Other recommended" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Standard" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Listed" },
                    moffitt: { status: "recommended", note: "Standard option" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "On-pathway" },
                    mdanderson: { status: "recommended", note: "Algorithm-listed" },
                    msk: { status: "recommended", note: "Listed" },
                    mayo: { status: "recommended", note: "Listed" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── ALK Rearrangement — First Line ──────────────────────────────
    {
        biomarker: "ALK rearrangement",
        line: "1L",
        therapies: [
            {
                agent: "Lorlatinib",
                brand: "Lorbrena",
                manufacturer: "Pfizer",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (CROWN)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Alectinib",
                brand: "Alecensa",
                manufacturer: "Roche/Genentech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (ALEX)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Brigatinib",
                brand: "Alunbrig",
                manufacturer: "Takeda",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (ALTA-1L)" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Level II" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── ROS1 fusion — First Line ─────────────────────────────────────
    {
        biomarker: "ROS1 fusion",
        line: "1L",
        therapies: [
            {
                agent: "Entrectinib",
                brand: "Rozlytrek",
                manufacturer: "Roche/Genentech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (STARTRK-2)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Crizotinib",
                brand: "Xalkori",
                manufacturer: "Pfizer",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (PROFILE 1001)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Repotrectinib",
                brand: "Augtyro",
                manufacturer: "Bristol-Myers Squibb",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (TRIDENT-1)" },
                    va: { status: "recommended", note: "Listed" },
                    uhc: { status: "recommended", note: "Under review" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "unknown", note: "Under review" },
                    "us-oncology": { status: "recommended", note: "Listed" },
                    moffitt: { status: "recommended", note: "TRIDENT-1 data" },
                    oneoncology: { status: "unknown", note: "Under review" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "Listed" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── NTRK fusion — First Line ──────────────────────────────────────
    {
        biomarker: "NTRK fusion",
        line: "1L",
        therapies: [
            {
                agent: "Larotrectinib",
                brand: "Vitrakvi",
                manufacturer: "Bayer",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (tumor-agnostic)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Entrectinib",
                brand: "Rozlytrek",
                manufacturer: "Roche/Genentech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (tumor-agnostic)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Repotrectinib",
                brand: "Augtyro",
                manufacturer: "Bristol-Myers Squibb",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (TRIDENT-1)" },
                    va: { status: "recommended", note: "Listed" },
                    uhc: { status: "recommended", note: "Under review" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "unknown", note: "Under review" },
                    "us-oncology": { status: "recommended", note: "Listed" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "unknown", note: "Under review" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "Listed" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── KRAS G12C — Second Line ─────────────────────────────────────
    {
        biomarker: "KRAS G12C",
        line: "2L+",
        therapies: [
            {
                agent: "Sotorasib",
                brand: "Lumakras",
                manufacturer: "Amgen",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (CodeBreaK 200)" },
                    va: { status: "preferred", note: "Preferred 2L" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Adagrasib",
                brand: "Krazati",
                manufacturer: "Mirati (BMS)",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (KRYSTAL-1)" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Listed" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── BRAF V600E — First Line ─────────────────────────────────────
    {
        biomarker: "BRAF V600E",
        line: "1L",
        therapies: [
            {
                agent: "Dabrafenib + trametinib",
                brand: "Tafinlar + Mekinist",
                manufacturer: "Novartis",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Encorafenib + binimetinib",
                brand: "Braftovi + Mektovi",
                manufacturer: "Pfizer (Array)",
                nccnCategory: "other recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "listed", note: "Level II" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "listed", note: "Listed" },
                    clinicalpath: { status: "listed", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "On-pathway" },
                    mdanderson: { status: "recommended", note: "Algorithm-listed" },
                    msk: { status: "recommended", note: "Listed" },
                    mayo: { status: "recommended", note: "Listed" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── MET exon 14 skipping — First Line ───────────────────────────
    {
        biomarker: "MET exon 14 skipping",
        line: "1L",
        therapies: [
            {
                agent: "Capmatinib",
                brand: "Tabrecta",
                manufacturer: "Novartis",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Tepotinib",
                brand: "Tepmetko",
                manufacturer: "Merck KGaA (EMD Serono)",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Listed" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── RET fusion — First Line ─────────────────────────────────────
    {
        biomarker: "RET fusion",
        line: "1L",
        therapies: [
            {
                agent: "Selpercatinib",
                brand: "Retevmo",
                manufacturer: "Eli Lilly",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (LIBRETTO-431)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Pralsetinib",
                brand: "Gavreto",
                manufacturer: "Roche/Genentech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Listed" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── PD-L1 >= 50% (no drivers) — First Line ─────────────────────
    {
        biomarker: "PD-L1 >= 50% (no actionable drivers)",
        line: "1L",
        therapies: [
            {
                agent: "Pembrolizumab monotherapy",
                brand: "Keytruda",
                manufacturer: "Merck",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (KEYNOTE-024)" },
                    va: { status: "preferred", note: "Preferred mono" },
                    uhc: { status: "preferred", note: "On-pathway — cost-effective" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Pembrolizumab + platinum/pemetrexed",
                brand: "Keytruda + chemo",
                manufacturer: "Merck",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (KN-189)" },
                    va: { status: "preferred", note: "Preferred combo" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Cemiplimab",
                brand: "Libtayo",
                manufacturer: "Regeneron/Sanofi",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (EMPOWER-01)" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "listed", note: "PA required" },
                    humana: { status: "listed", note: "Listed" },
                    "us-oncology": { status: "listed", note: "Listed" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "listed", note: "Listed" },
                    clinicalpath: { status: "listed", note: "Listed" },
                    eviti: { status: "listed", note: "PA required" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Nivolumab + ipilimumab",
                brand: "Opdivo + Yervoy",
                manufacturer: "Bristol-Myers Squibb",
                nccnCategory: "other recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 1 (CheckMate 227)" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Level II" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "On-pathway" },
                    mdanderson: { status: "recommended", note: "Algorithm-listed" },
                    msk: { status: "recommended", note: "Listed" },
                    mayo: { status: "recommended", note: "Listed" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── PD-L1 1-49% (no drivers) — First Line ──────────────────────
    {
        biomarker: "PD-L1 1-49% (no actionable drivers)",
        line: "1L",
        therapies: [
            {
                agent: "Pembrolizumab + platinum/pemetrexed",
                brand: "Keytruda + chemo",
                manufacturer: "Merck",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Nivolumab + ipilimumab + chemo",
                brand: "Opdivo + Yervoy + chemo",
                manufacturer: "Bristol-Myers Squibb",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (CM9LA)" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Level II" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── PD-L1 < 1% (no drivers) — First Line ───────────────────────
    {
        biomarker: "PD-L1 < 1% (no actionable drivers)",
        line: "1L",
        therapies: [
            {
                agent: "Pembrolizumab + platinum/pemetrexed",
                brand: "Keytruda + chemo",
                manufacturer: "Merck",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "On-pathway" },
                    evicore: { status: "preferred", note: "Immediate PA" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "preferred", note: "On-pathway" },
                    mdanderson: { status: "preferred", note: "Algorithm-preferred" },
                    msk: { status: "preferred", note: "Institutional preferred" },
                    mayo: { status: "preferred", note: "Institutional preferred" },
                    flatiron: { status: "preferred", note: "High adoption" },
                },
            },
            {
                agent: "Nivolumab + ipilimumab + chemo",
                brand: "Opdivo + Yervoy + chemo",
                manufacturer: "Bristol-Myers Squibb",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 (CM9LA)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "On-pathway" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Level II" },
                    moffitt: { status: "recommended", note: "Alternative" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Carboplatin + paclitaxel + bevacizumab + atezolizumab",
                brand: "Chemo + Avastin + Tecentriq",
                manufacturer: "Roche/Genentech",
                nccnCategory: "other recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A (IMpower150)" },
                    va: { status: "listed", note: "Consider" },
                    uhc: { status: "listed", note: "Listed" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "listed", note: "PA required" },
                    humana: { status: "listed", note: "Listed" },
                    "us-oncology": { status: "listed", note: "Level III" },
                    moffitt: { status: "listed", note: "Consider" },
                    oneoncology: { status: "listed", note: "Listed" },
                    clinicalpath: { status: "listed", note: "Listed" },
                    eviti: { status: "listed", note: "PA required" },
                    aetna: { status: "recommended", note: "On-pathway" },
                    mdanderson: { status: "recommended", note: "Algorithm-listed" },
                    msk: { status: "recommended", note: "Listed" },
                    mayo: { status: "recommended", note: "Listed" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── EGFR-mutated — Second Line (post-osimertinib) ───────────────
    {
        biomarker: "EGFR (post-osimertinib progression)",
        line: "2L+",
        therapies: [
            {
                agent: "Datopotamab deruxtecan",
                brand: "Dato-DXd",
                manufacturer: "Daiichi Sankyo / AstraZeneca",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (TROPION-Lung05)" },
                    va: { status: "preferred", note: "Preferred 2L" },
                    uhc: { status: "recommended", note: "Under review" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "recommended", note: "PA pathway" },
                    humana: { status: "unknown", note: "Under review" },
                    "us-oncology": { status: "recommended", note: "Included" },
                    moffitt: { status: "preferred", note: "TROPION protocol" },
                    oneoncology: { status: "recommended", note: "Listed" },
                    clinicalpath: { status: "recommended", note: "Listed" },
                    eviti: { status: "recommended", note: "Listed" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Amivantamab + chemotherapy",
                brand: "Rybrevant + chemo",
                manufacturer: "Janssen (J&J)",
                nccnCategory: "other recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A (MARIPOSA-2)" },
                    va: { status: "recommended", note: "Alternative" },
                    uhc: { status: "listed", note: "Listed" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "listed", note: "PA required" },
                    humana: { status: "listed", note: "Listed" },
                    "us-oncology": { status: "listed", note: "Listed" },
                    moffitt: { status: "recommended", note: "MARIPOSA-2 data" },
                    oneoncology: { status: "listed", note: "Listed" },
                    clinicalpath: { status: "listed", note: "Listed" },
                    eviti: { status: "listed", note: "PA required" },
                    aetna: { status: "recommended", note: "On-pathway" },
                    mdanderson: { status: "recommended", note: "Algorithm-listed" },
                    msk: { status: "recommended", note: "Listed" },
                    mayo: { status: "recommended", note: "Listed" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Platinum-based chemotherapy",
                brand: "Chemo",
                manufacturer: "Generic",
                nccnCategory: "other recommended",
                positions: {
                    nccn: { status: "recommended", note: "Standard" },
                    va: { status: "recommended", note: "Standard" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Standard" },
                    evicore: { status: "recommended", note: "PA approved" },
                    humana: { status: "recommended", note: "On-pathway" },
                    "us-oncology": { status: "recommended", note: "Standard" },
                    moffitt: { status: "recommended", note: "Standard" },
                    oneoncology: { status: "recommended", note: "Standard" },
                    clinicalpath: { status: "recommended", note: "Standard" },
                    eviti: { status: "recommended", note: "On-pathway" },
                    aetna: { status: "recommended", note: "On-pathway" },
                    mdanderson: { status: "recommended", note: "Algorithm-listed" },
                    msk: { status: "recommended", note: "Listed" },
                    mayo: { status: "recommended", note: "Listed" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
    // ── HER2 (ERBB2) mutation — Second Line ────────────────────────
    {
        biomarker: "HER2 (ERBB2) mutation",
        line: "2L+",
        therapies: [
            {
                agent: "Trastuzumab deruxtecan",
                brand: "Enhertu",
                manufacturer: "Daiichi Sankyo / AstraZeneca",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 2A (DESTINY-Lung02)" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "preferred", note: "PA approved" },
                    humana: { status: "preferred", note: "On-pathway" },
                    "us-oncology": { status: "preferred", note: "Level I" },
                    moffitt: { status: "preferred", note: "Institutional preferred" },
                    oneoncology: { status: "preferred", note: "Pathway preferred" },
                    clinicalpath: { status: "preferred", note: "Preferred" },
                    eviti: { status: "preferred", note: "On-pathway" },
                    aetna: { status: "recommended", note: "Listed" },
                    mdanderson: { status: "preferred", note: "Algorithm-listed" },
                    msk: { status: "preferred", note: "Institutional protocol" },
                    mayo: { status: "preferred", note: "Institutional protocol" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
            {
                agent: "Sevabertinib",
                brand: "Sevabertinib",
                manufacturer: "Nuvation Bio",
                nccnCategory: "other recommended",
                positions: {
                    nccn: { status: "recommended", note: "Newly added" },
                    va: { status: "unknown", note: "Under review" },
                    uhc: { status: "unknown", note: "Under review" },
                    anthem: { status: "unknown", note: "Under review" },
                    evicore: { status: "unknown", note: "Under review" },
                    humana: { status: "unknown", note: "Under review" },
                    "us-oncology": { status: "unknown", note: "Under review" },
                    moffitt: { status: "unknown", note: "Under review" },
                    oneoncology: { status: "unknown", note: "Under review" },
                    clinicalpath: { status: "unknown", note: "Under review" },
                    eviti: { status: "unknown", note: "Under review" },
                    aetna: { status: "recommended", note: "On-pathway" },
                    mdanderson: { status: "recommended", note: "Algorithm-listed" },
                    msk: { status: "recommended", note: "Listed" },
                    mayo: { status: "recommended", note: "Listed" },
                    flatiron: { status: "recommended", note: "Moderate adoption" },
                },
            },
        ],
    },
];

// ── NCCN Treatment Algorithm (structured for visual rendering) ──────

const NCCN_ALGORITHM = {
    version: "Version 5.2026",
    lastUpdated: "2026-03",
    sections: [
        {
            id: "molecular-testing",
            title: "Molecular Testing (Required Before Systemic Therapy)",
            type: "decision",
            items: [
                { test: "EGFR mutations", method: "NGS panel (preferred) or PCR", mandatory: true },
                { test: "ALK rearrangement", method: "NGS or FISH or IHC (Ventana D5F3)", mandatory: true },
                { test: "ROS1 fusion", method: "NGS or FISH", mandatory: true },
                { test: "BRAF V600E", method: "NGS", mandatory: true },
                { test: "KRAS G12C", method: "NGS", mandatory: true },
                { test: "MET exon 14 skipping", method: "NGS (RNA-based preferred)", mandatory: true },
                { test: "RET fusion", method: "NGS (DNA or RNA-based)", mandatory: true },
                { test: "NTRK 1/2/3 fusion", method: "NGS", mandatory: true },
                { test: "HER2 (ERBB2) mutation", method: "NGS", mandatory: true },
                { test: "PD-L1 (TPS)", method: "IHC (22C3 preferred)", mandatory: true },
            ],
        },
        {
            id: "driver-positive",
            title: "Actionable Driver Mutation Detected",
            type: "treatment",
            branches: [
                { driver: "EGFR ex19/L858R", preferred: ["Osimertinib", "Osimertinib + chemo", "Amivantamab + lazertinib"], category: "1" },
                { driver: "EGFR ex20 ins", preferred: ["Amivantamab + chemo + lazertinib"], category: "1" },
                { driver: "ALK+", preferred: ["Lorlatinib", "Alectinib", "Brigatinib"], category: "1" },
                { driver: "ROS1+", preferred: ["Crizotinib", "Entrectinib", "Repotrectinib"], category: "2A" },
                { driver: "BRAF V600E", preferred: ["Dabrafenib + trametinib"], category: "2A" },
                { driver: "KRAS G12C", preferred: ["Sotorasib (2L)", "Adagrasib (2L)"], category: "2A" },
                { driver: "MET ex14 skip", preferred: ["Capmatinib", "Tepotinib"], category: "2A" },
                { driver: "RET+", preferred: ["Selpercatinib"], category: "1" },
                { driver: "NTRK+", preferred: ["Larotrectinib", "Entrectinib"], category: "2A" },
                { driver: "HER2 mut", preferred: ["T-DXd (2L)"], category: "2A" },
            ],
        },
        {
            id: "no-drivers",
            title: "No Actionable Drivers — Treatment by PD-L1",
            type: "treatment",
            branches: [
                {
                    driver: "PD-L1 >= 50%",
                    preferred: ["Pembrolizumab mono", "Pembrolizumab + chemo", "Cemiplimab"],
                    other: ["Nivolumab + ipilimumab", "Atezolizumab"],
                    category: "1",
                },
                {
                    driver: "PD-L1 1-49%",
                    preferred: ["Pembrolizumab + chemo", "Nivolumab + ipilimumab + chemo"],
                    category: "1",
                },
                {
                    driver: "PD-L1 < 1%",
                    preferred: ["Pembrolizumab + chemo", "Nivolumab + ipilimumab + chemo"],
                    other: ["Carbo/paclitaxel/bev/atezo (IMpower150)"],
                    category: "1",
                },
            ],
        },
        {
            id: "perioperative",
            title: "Perioperative / Adjuvant Therapy",
            type: "treatment",
            branches: [
                { driver: "Resected IB-IIIA EGFR+", preferred: ["Adjuvant osimertinib (3 years)"], category: "1" },
                { driver: "Resected II-III (no drivers)", preferred: ["Neoadjuvant nivolumab + chemo then adjuvant nivo", "Neoadjuvant pembro + chemo then adjuvant pembro"], category: "1" },
                { driver: "Unresectable III EGFR+", preferred: ["CRT then osimertinib consolidation (LAURA)"], category: "1" },
                { driver: "Unresectable III (no drivers)", preferred: ["CRT then durvalumab consolidation (PACIFIC)"], category: "1" },
            ],
        },
    ],
};


// ── Tab Navigation ──────────────────────────────────────────────────

function initTabs() {
    const tabs = document.querySelectorAll(".pw-tab-btn");
    const panels = document.querySelectorAll(".pw-tab-panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add("active");
        });
    });
}


// ── NCCN Algorithm Visual Renderer ──────────────────────────────────

function renderNCCNAlgorithm() {
    const container = document.getElementById("nccn-algorithm-view");
    if (!container) return;

    const alg = NCCN_ALGORITHM;
    let html = `
        <div class="nccn-algo-header">
            <span class="nccn-algo-version">${esc(alg.version)}</span>
            <span class="nccn-algo-updated">Updated: ${esc(alg.lastUpdated)}</span>
        </div>
    `;

    // Molecular testing section
    const testSection = alg.sections.find(s => s.id === "molecular-testing");
    if (testSection) {
        html += `<div class="nccn-algo-section">
            <h4 class="nccn-algo-section-title">${esc(testSection.title)}</h4>
            <div class="nccn-algo-tests">
                ${testSection.items.map(t => `
                    <div class="nccn-test-item">
                        <span class="nccn-test-name">${esc(t.test)}</span>
                        <span class="nccn-test-method">${esc(t.method)}</span>
                    </div>
                `).join("")}
            </div>
        </div>`;
    }

    // Treatment branches
    const treatmentSections = alg.sections.filter(s => s.type === "treatment");
    treatmentSections.forEach(section => {
        html += `<div class="nccn-algo-section">
            <h4 class="nccn-algo-section-title">${esc(section.title)}</h4>
            <div class="nccn-algo-branches">
                ${section.branches.map(b => {
                    const preferredHtml = b.preferred.map(p =>
                        `<span class="therapy-tag first-line">${esc(p)}</span>`
                    ).join(" ");
                    const otherHtml = (b.other || []).map(o =>
                        `<span class="therapy-tag subsequent">${esc(o)}</span>`
                    ).join(" ");
                    return `
                        <div class="nccn-branch-card">
                            <div class="nccn-branch-header">
                                <span class="nccn-branch-driver">${esc(b.driver)}</span>
                                <span class="nccn-branch-cat">Cat ${esc(b.category)}</span>
                            </div>
                            <div class="nccn-branch-therapies">
                                <div><strong>Preferred:</strong> ${preferredHtml}</div>
                                ${otherHtml ? `<div class="nccn-branch-other"><strong>Other:</strong> ${otherHtml}</div>` : ""}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}


// ── Comparison Matrix Renderer ──────────────────────────────────────

function statusIcon(status) {
    switch (status) {
        case "preferred":  return '<span class="cmp-icon cmp-preferred" title="Preferred">P</span>';
        case "recommended": return '<span class="cmp-icon cmp-recommended" title="Recommended">R</span>';
        case "listed":     return '<span class="cmp-icon cmp-listed" title="Listed">L</span>';
        case "not listed": return '<span class="cmp-icon cmp-not-listed" title="Not Listed">&mdash;</span>';
        case "restricted": return '<span class="cmp-icon cmp-restricted" title="Restricted">X</span>';
        case "unknown":    return '<span class="cmp-icon cmp-unknown" title="Under Review">?</span>';
        default:           return '<span class="cmp-icon cmp-unknown">?</span>';
    }
}

function deviatesFromNCCN(nccnStatus, instStatus) {
    if (instStatus === "unknown") return false;
    if (nccnStatus === "preferred" && instStatus !== "preferred") return true;
    if (nccnStatus === "recommended" && (instStatus === "not listed" || instStatus === "restricted")) return true;
    return false;
}

function renderComparisonMatrix() {
    const container = document.getElementById("comparison-matrix-view");
    if (!container) return;

    const biomarkerFilter = document.getElementById("cmp-biomarker-filter");
    const lineFilter = document.getElementById("cmp-line-filter");
    const deviationOnly = document.getElementById("cmp-deviation-toggle");

    const selectedBiomarker = biomarkerFilter ? biomarkerFilter.value : "";
    const selectedLine = lineFilter ? lineFilter.value : "";
    const showDeviationsOnly = deviationOnly ? deviationOnly.checked : false;

    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");

    let filteredData = THERAPY_PREFERENCES;
    if (selectedBiomarker) {
        filteredData = filteredData.filter(d => d.biomarker === selectedBiomarker);
    }
    if (selectedLine) {
        filteredData = filteredData.filter(d => d.line === selectedLine);
    }

    let html = "";

    filteredData.forEach(segment => {
        let therapies = segment.therapies;

        if (showDeviationsOnly) {
            therapies = therapies.filter(t => {
                const nccnStatus = t.positions.nccn ? t.positions.nccn.status : "unknown";
                return institutions.some(inst => {
                    const pos = t.positions[inst.id];
                    return pos && deviatesFromNCCN(nccnStatus, pos.status);
                });
            });
        }

        if (therapies.length === 0) return;

        html += `
            <div class="cmp-segment">
                <div class="cmp-segment-header">
                    <span class="cmp-biomarker">${esc(segment.biomarker)}</span>
                    <span class="cmp-line-badge">${esc(segment.line)}</span>
                </div>
                <div class="cmp-table-wrapper">
                    <table class="cmp-table">
                        <thead>
                            <tr>
                                <th class="cmp-agent-col">Agent</th>
                                <th class="cmp-brand-col">Brand</th>
                                <th class="cmp-nccn-col"><a href="${esc(PATHWAY_INSTITUTIONS.find(i => i.id === 'nccn').url)}" target="_blank" rel="noopener" class="cmp-header-link" title="NCCN Guidelines">NCCN</a></th>
                                ${institutions.map(i => {
                                    const v = INSTITUTION_VERIFICATION[i.id];
                                    const vClass = v ? ` cmp-hdr-${v.level}` : "";
                                    const vTitle = v ? `${i.fullName} — ${v.level.toUpperCase()}: ${v.source}` : i.fullName;
                                    return `<th class="cmp-inst-col${vClass}" title="${esc(vTitle)}"><a href="${esc(i.url)}" target="_blank" rel="noopener" class="cmp-header-link">${esc(i.name)}</a>${v && v.level === "inferred" ? '<span class="cmp-unverified-dot" title="Unverified — positions inferred from NCCN alignment">*</span>' : ""}</th>`;
                                }).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            ${therapies.map(t => {
                                const nccnPos = t.positions.nccn || { status: "unknown", note: "" };
                                return `<tr>
                                    <td class="cmp-agent-cell">
                                        <span class="cmp-agent-name">${esc(t.agent)}</span>
                                        <span class="cmp-mfr">${esc(t.manufacturer)}</span>
                                    </td>
                                    <td class="cmp-brand-cell">${esc(t.brand)}</td>
                                    <td class="cmp-nccn-cell" title="${esc(nccnPos.note)}">${statusIcon(nccnPos.status)}</td>
                                    ${institutions.map(inst => {
                                        const pos = t.positions[inst.id] || { status: "unknown", note: "" };
                                        const devClass = deviatesFromNCCN(nccnPos.status, pos.status) ? " cmp-deviation" : "";
                                        const v = INSTITUTION_VERIFICATION[inst.id];
                                        const inferredClass = (v && v.level === "inferred") ? " cmp-inferred" : "";
                                        const titleSource = v ? ` [${v.level}]` : "";
                                        return `<td class="cmp-inst-cell${devClass}${inferredClass}" title="${esc(inst.fullName)}: ${esc(pos.note)}${titleSource}">${statusIcon(pos.status)}</td>`;
                                    }).join("")}
                                </tr>`;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    if (!html) {
        html = '<p class="no-results">No deviations found for the selected filters.</p>';
    }

    // Legend
    const legend = `
        <div class="cmp-legend">
            <span class="cmp-legend-item">${statusIcon("preferred")} Preferred</span>
            <span class="cmp-legend-item">${statusIcon("recommended")} Recommended</span>
            <span class="cmp-legend-item">${statusIcon("listed")} Listed</span>
            <span class="cmp-legend-item">${statusIcon("not listed")} Not Listed</span>
            <span class="cmp-legend-item">${statusIcon("restricted")} Restricted</span>
            <span class="cmp-legend-item">${statusIcon("unknown")} Under Review</span>
            <span class="cmp-legend-item"><span class="cmp-deviation-marker"></span> Deviates from NCCN</span>
            <span class="cmp-legend-divider">|</span>
            <span class="cmp-legend-item cmp-legend-verified">Verified — from public source</span>
            <span class="cmp-legend-item cmp-legend-published">Published — supported by literature</span>
            <span class="cmp-legend-item cmp-legend-inferred"><span class="cmp-unverified-dot">*</span> Inferred — assumed from NCCN alignment (unverified)</span>
        </div>
    `;

    container.innerHTML = legend + html;
}

function populateComparisonFilters() {
    const biomarkerFilter = document.getElementById("cmp-biomarker-filter");
    const lineFilter = document.getElementById("cmp-line-filter");
    if (!biomarkerFilter || !lineFilter) return;

    const biomarkers = [...new Set(THERAPY_PREFERENCES.map(d => d.biomarker))];
    const lines = [...new Set(THERAPY_PREFERENCES.map(d => d.line))];

    biomarkers.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        biomarkerFilter.appendChild(opt);
    });

    lines.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l;
        opt.textContent = l;
        lineFilter.appendChild(opt);
    });

    biomarkerFilter.addEventListener("change", renderComparisonMatrix);
    lineFilter.addEventListener("change", renderComparisonMatrix);
    document.getElementById("cmp-deviation-toggle").addEventListener("change", renderComparisonMatrix);

    document.getElementById("cmp-reset-filters").addEventListener("click", () => {
        biomarkerFilter.value = "";
        lineFilter.value = "";
        document.getElementById("cmp-deviation-toggle").checked = false;
        renderComparisonMatrix();
    });

    document.getElementById("cmp-export-csv").addEventListener("click", exportComparisonCSV);
}

function exportComparisonCSV() {
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const biomarkerFilter = document.getElementById("cmp-biomarker-filter");
    const lineFilter = document.getElementById("cmp-line-filter");
    const selectedBiomarker = biomarkerFilter ? biomarkerFilter.value : "";
    const selectedLine = lineFilter ? lineFilter.value : "";

    let data = THERAPY_PREFERENCES;
    if (selectedBiomarker) data = data.filter(d => d.biomarker === selectedBiomarker);
    if (selectedLine) data = data.filter(d => d.line === selectedLine);

    const headers = ["Biomarker", "Line", "Agent", "Brand", "Manufacturer", "NCCN"];
    institutions.forEach(i => {
        const v = INSTITUTION_VERIFICATION[i.id];
        const vLabel = v ? ` [${v.level}]` : "";
        headers.push(i.name + vLabel);
    });
    const rows = [headers.join(",")];

    data.forEach(segment => {
        segment.therapies.forEach(t => {
            const nccnPos = t.positions.nccn || { status: "unknown", note: "" };
            const cols = [
                `"${segment.biomarker}"`,
                segment.line,
                `"${t.agent}"`,
                `"${t.brand}"`,
                `"${t.manufacturer}"`,
                nccnPos.status,
            ];
            institutions.forEach(inst => {
                const pos = t.positions[inst.id] || { status: "unknown" };
                const v = INSTITUTION_VERIFICATION[inst.id];
                const suffix = (v && v.level === "inferred") ? " (unverified)" : "";
                cols.push(pos.status + suffix);
            });
            rows.push(cols.join(","));
        });
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nsclc_pathway_comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
}


// ── Institution Detail View ─────────────────────────────────────────

function renderInstitutionDetail() {
    const container = document.getElementById("institution-detail-view");
    const selector = document.getElementById("inst-selector");
    if (!container || !selector) return;

    const instId = selector.value;
    if (!instId) {
        container.innerHTML = '<p class="no-results">Select an institution above to view its detailed pathway preferences.</p>';
        return;
    }

    const inst = PATHWAY_INSTITUTIONS.find(i => i.id === instId);
    if (!inst) return;

    const program = PATHWAY_PROGRAMS.find(p => p.id === instId);

    let html = `
        <div class="inst-header-card">
            <h3>${inst.url ? `<a href="${esc(inst.url)}" target="_blank" rel="noopener" class="cmp-header-link">${esc(inst.fullName)}</a>` : esc(inst.fullName)}</h3>
            <div class="inst-meta">
                <span class="pathway-badge type-${esc(inst.type)}">${esc(inst.type.toUpperCase())}</span>
                <span class="inst-version">Version: ${esc(inst.version)}</span>
            </div>
            ${program ? `<p class="inst-desc">${esc(program.description)}</p>` : ""}
            ${(() => {
                const v = INSTITUTION_VERIFICATION[instId];
                if (!v) return "";
                const cls = v.level === "verified" ? "appendix-confidence-high" : v.level === "published" ? "appendix-confidence-medium" : "appendix-confidence-low";
                const label = v.level === "verified" ? "Verified" : v.level === "published" ? "Published" : "Inferred (Unverified)";
                return `<div class="inst-verification-banner inst-verification-${v.level}">
                    <span class="appendix-confidence ${cls}">${label}</span>
                    <span class="inst-verification-source">${esc(v.source)}</span>
                </div>`;
            })()}
        </div>
    `;

    // Show all therapy positions for this institution grouped by biomarker
    THERAPY_PREFERENCES.forEach(segment => {
        const rows = segment.therapies.map(t => {
            const pos = t.positions[instId] || { status: "unknown", note: "" };
            const nccnPos = t.positions.nccn || { status: "unknown", note: "" };
            const devClass = deviatesFromNCCN(nccnPos.status, pos.status) ? " cmp-deviation" : "";
            return `
                <tr class="${devClass}">
                    <td><strong>${esc(t.agent)}</strong><br><span class="cmp-mfr">${esc(t.brand)} — ${esc(t.manufacturer)}</span></td>
                    <td>${statusIcon(nccnPos.status)} <span class="inst-note">${esc(nccnPos.note)}</span></td>
                    <td>${statusIcon(pos.status)} <span class="inst-note">${esc(pos.note)}</span></td>
                    <td>${deviatesFromNCCN(nccnPos.status, pos.status) ? '<span class="cmp-icon cmp-deviation-flag">DIFFERS</span>' : '<span class="inst-aligned">Aligned</span>'}</td>
                </tr>
            `;
        }).join("");

        html += `
            <div class="inst-segment">
                <div class="inst-segment-header">
                    <span class="cmp-biomarker">${esc(segment.biomarker)}</span>
                    <span class="cmp-line-badge">${esc(segment.line)}</span>
                </div>
                <table class="inst-table">
                    <thead>
                        <tr>
                            <th>Agent</th>
                            <th>NCCN Position</th>
                            <th>${esc(inst.name)} Position</th>
                            <th>Alignment</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    });

    // Summary stats
    let totalTherapies = 0, aligned = 0, deviations = 0;
    THERAPY_PREFERENCES.forEach(segment => {
        segment.therapies.forEach(t => {
            const pos = t.positions[instId];
            const nccnPos = t.positions.nccn;
            if (pos && nccnPos) {
                totalTherapies++;
                if (deviatesFromNCCN(nccnPos.status, pos.status)) deviations++;
                else aligned++;
            }
        });
    });

    const summaryHtml = `
        <div class="inst-summary">
            <div class="pathway-stat-card"><div class="pathway-stat-number">${totalTherapies}</div><div class="pathway-stat-label">Therapies Tracked</div></div>
            <div class="pathway-stat-card"><div class="pathway-stat-number stat-aligned">${aligned}</div><div class="pathway-stat-label">Aligned with NCCN</div></div>
            <div class="pathway-stat-card"><div class="pathway-stat-number stat-deviation">${deviations}</div><div class="pathway-stat-label">Deviations from NCCN</div></div>
            <div class="pathway-stat-card"><div class="pathway-stat-number">${totalTherapies > 0 ? Math.round(aligned / totalTherapies * 100) : 0}%</div><div class="pathway-stat-label">Alignment Rate</div></div>
        </div>
    `;

    container.innerHTML = summaryHtml + html;
}

function populateInstitutionSelector() {
    const selector = document.getElementById("inst-selector");
    if (!selector) return;

    PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn").forEach(inst => {
        const opt = document.createElement("option");
        opt.value = inst.id;
        opt.textContent = `${inst.name} — ${inst.fullName}`;
        selector.appendChild(opt);
    });

    selector.addEventListener("change", renderInstitutionDetail);
}


// ── Appendix: Data Sources & Methodology ─────────────────────────────

function confidenceBadge(level) {
    const labels = { high: "High", medium: "Medium", low: "Low" };
    return `<span class="appendix-confidence appendix-confidence-${level}">${labels[level] || level}</span>`;
}

function renderAppendix() {
    const container = document.getElementById("appendix-content");
    if (!container) return;

    let html = `
        <div class="appendix-intro">
            <p>This appendix documents the sourcing methodology for every programme listed in this module. Each entry includes the primary and secondary sources used, how data was gathered, known limitations, and a confidence rating.</p>
            <div class="appendix-legend">
                <strong>Confidence Ratings:</strong>
                ${confidenceBadge("high")} Direct public data — regimen lists, PDFs, or algorithms directly accessible and verifiable
                ${confidenceBadge("medium")} Verifiable but indirect — programme confirmed from official pages, detail from published literature or provider docs
                ${confidenceBadge("low")} Inferred from secondary sources — programme existence confirmed but URL has minimal/no pathway content; therapy positions are estimates
            </div>
        </div>
    `;

    PATHWAY_PROGRAMS.forEach(prog => {
        const m = DATA_METHODOLOGY[prog.id];
        if (!m) return;

        const primaryHtml = m.primarySources.map(s => `<li>${esc(s)}</li>`).join("");
        const secondaryHtml = m.secondarySources.length
            ? m.secondarySources.map(s => `<li>${esc(s)}</li>`).join("")
            : "<li><em>None</em></li>";

        html += `
            <div class="appendix-entry">
                <div class="appendix-entry-header">
                    <h4>${esc(prog.name)}</h4>
                    ${confidenceBadge(m.confidence)}
                </div>
                <div class="appendix-org">${esc(prog.organization)}</div>

                <div class="appendix-field">
                    <strong>URL Quality:</strong>
                    <span class="${m.confidence === 'low' ? 'appendix-url-warning' : ''}">${esc(m.urlQuality)}</span>
                </div>

                <div class="appendix-field">
                    <strong>Source URL:</strong>
                    <a href="${esc(prog.url)}" target="_blank" rel="noopener">${esc(prog.url)}</a>
                </div>

                <div class="appendix-sources-grid">
                    <div>
                        <strong>Primary Sources:</strong>
                        <ul>${primaryHtml}</ul>
                    </div>
                    <div>
                        <strong>Secondary Sources:</strong>
                        <ul>${secondaryHtml}</ul>
                    </div>
                </div>

                <div class="appendix-field">
                    <strong>Methodology:</strong>
                    <p>${esc(m.methodology)}</p>
                </div>

                <div class="appendix-field appendix-limitations">
                    <strong>Limitations & Caveats:</strong>
                    <p>${esc(m.limitations)}</p>
                </div>

                <div class="appendix-field">
                    <strong>Data in Comparison Matrix:</strong>
                    <p>${esc(m.dataInComparison)}</p>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleAppendix() {
    const modal = document.getElementById("appendix-modal");
    if (!modal) return;
    const isOpen = modal.classList.contains("open");
    if (isOpen) {
        modal.classList.remove("open");
        document.body.style.overflow = "";
    } else {
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
        renderAppendix();
    }
}


// ── Event Listeners & Init ──────────────────────────────────────────

// Appendix modal
document.getElementById("appendix-open-btn").addEventListener("click", toggleAppendix);
document.getElementById("appendix-close-btn").addEventListener("click", toggleAppendix);
document.getElementById("appendix-modal").addEventListener("click", (e) => {
    if (e.target.id === "appendix-modal") toggleAppendix();
});

// Initial render — Directory tab
renderStats();
renderPrograms();
renderVAPathways();
renderNCIReference();
renderNCCNReference();
renderMonitoringLandscape();
renderBiomarkerGrid();

// New tabs
initTabs();
renderNCCNAlgorithm();
populateComparisonFilters();
renderComparisonMatrix();
populateInstitutionSelector();
renderInstitutionDetail();
