/**
 * US Multiple Myeloma Pathways — Asset Demo: Elrexfio
 * Frontend logic for the MM pathway tracker module.
 * Depends on shared.js for: esc
 */

// ── Pathway Programs Registry ─────────────────────────────────────────

const PATHWAY_PROGRAMS = [
    {
        id: "uhc",
        name: "UnitedHealthcare Cancer Therapy Pathways",
        organization: "UnitedHealthcare (UHG)",
        type: "payer",
        access: "proprietary",
        coverage: "UHC Commercial, Medicare Advantage, Medicaid (27M members)",
        mmCoverage: true,
        description: "Evidence-based regimens for MM selected by UHC's Oncology Advisory Committee. Prior authorization for chemotherapy submitted via CGP tool. Providers earn $1,000 per on-pathway regimen (commercial, 75% adherence threshold). MM pathways cover all lines including BCMA-directed therapies with step-through requirements.",
        keyFeatures: [
            "Oncology Advisory Committee with disease-specific consultants",
            "$1,000 per on-pathway regimen incentive (commercial plans)",
            "MM pathways require CAR-T consideration before bispecifics",
            "Regimen PDF publicly hosted for monitoring",
        ],
        url: "https://www.uhcprovider.com/en/resource-library/cancer-therapy-pathways-program.html",
        pdfUrls: [],
        dataAvailability: "Regimen PDF publicly hosted; detailed data via CGP portal",
        lastChecked: "2026-03",
    },
    {
        id: "anthem",
        name: "Anthem / Elevance Cancer Care Quality Program",
        organization: "Elevance Health (formerly Anthem)",
        type: "payer",
        access: "proprietary",
        coverage: "Anthem BCBS plans nationally",
        mmCoverage: true,
        description: "Cancer Care Quality Program (CCQP) covering 20+ cancers with 300+ clinical pathways. Administered by Carelon Insights. MM pathways include step-edit requirements for BCMA-targeted bispecifics requiring prior CAR-T attempt or documented ineligibility.",
        keyFeatures: [
            "300+ clinical pathways across 20+ cancer types",
            "$350/month provider incentive for on-pathway treatment",
            "BCMA bispecifics require prior CAR-T documentation",
            "No penalty for off-pathway — incentive-based model",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Provider portal access; some criteria published in medical policies",
        lastChecked: "2026-03",
    },
    {
        id: "evicore",
        name: "eviCore / Cigna Oncology Solutions",
        organization: "eviCore by Evernorth (Cigna)",
        type: "payer",
        access: "proprietary",
        coverage: "Cigna, delegated Blues plans, regional payers",
        mmCoverage: true,
        description: "Clinical pathway engine managing oncology PA for Cigna and delegated plans. MM pathways enforce strict sequencing: BCMA-targeted bispecifics (including Elrexfio) require prior CAR-T failure or certified ineligibility documentation.",
        keyFeatures: [
            "Algorithmic PA engine with clinical criteria embedded",
            "Strict CAR-T-first requirement for BCMA bispecifics",
            "Real-time decision support at point of prescribing",
            "Quarterly guideline review cycle",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Criteria accessible to contracted providers via portal",
        lastChecked: "2026-03",
    },
    {
        id: "humana",
        name: "Humana Oncology Pathways",
        organization: "Humana Inc.",
        type: "payer",
        access: "proprietary",
        coverage: "Humana MA, Commercial, Tricare",
        mmCoverage: true,
        description: "Oncology pathways covering major tumour types including MM. Bispecific antibodies listed with conditions — class-level restrictions apply to all BCMA and GPRC5D bispecifics equally without target differentiation.",
        keyFeatures: [
            "Class-level restrictions for bispecific antibodies",
            "No differentiation between BCMA vs GPRC5D targets",
            "PA required for all novel MM therapies",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Limited; criteria via provider portal",
        lastChecked: "2026-03",
    },
    {
        id: "aetna",
        name: "Aetna Clinical Policy Bulletins — Oncology",
        organization: "Aetna (CVS Health)",
        type: "payer",
        access: "public",
        coverage: "Aetna Commercial, Medicare, Medicaid managed care",
        mmCoverage: true,
        description: "Clinical Policy Bulletins (CPBs) define medical necessity criteria for oncology drugs. MM CPBs publicly available with specific criteria for BCMA-directed therapies. Elrexfio covered with prior therapy documentation requirements.",
        keyFeatures: [
            "CPBs publicly available online",
            "Specific line-of-therapy requirements documented",
            "Quarterly update cycle for oncology CPBs",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Public — CPBs freely accessible",
        lastChecked: "2026-03",
    },
    {
        id: "usoncology",
        name: "US Oncology / McKesson Pathways",
        organization: "US Oncology Network (McKesson)",
        type: "provider",
        access: "semi-public",
        coverage: "~1,400 physicians across 400+ sites",
        mmCoverage: true,
        description: "Value Pathways powered by NCCN for the US Oncology Network. MM pathways closely align with NCCN. Bispecifics including Elrexfio are recommended in the appropriate line setting per NCCN. Community oncology focus enables bispecific administration outside academic centres.",
        keyFeatures: [
            "NCCN-aligned pathway content",
            "Community oncology network (1,400+ physicians)",
            "Bispecifics administrable in community setting",
            "Pathway compliance tracked and incentivised",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Semi-public; NCCN alignment documented",
        lastChecked: "2026-03",
    },
    {
        id: "oneoncology",
        name: "OneOncology Clinical Pathways",
        organization: "OneOncology",
        type: "provider",
        access: "proprietary",
        coverage: "750+ providers across partner practices",
        mmCoverage: true,
        description: "Evidence-based clinical pathways for the OneOncology network. MM pathways list bispecifics in later-line settings. Community-based administration model provides access advantage for bispecifics over CAR-T.",
        keyFeatures: [
            "Community oncology network pathways",
            "Bispecifics listed in 3L+ settings",
            "Focus on practical administration feasibility",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Internal to network partners",
        lastChecked: "2026-03",
    },
    {
        id: "moffitt",
        name: "Moffitt Cancer Center Clinical Pathways",
        organization: "Moffitt Cancer Center",
        type: "academic",
        access: "semi-public",
        coverage: "Moffitt Cancer Center patient population",
        mmCoverage: true,
        description: "Institution-specific treatment algorithms for MM including all BCMA-directed therapies. Moffitt recommends bispecifics as an option alongside CAR-T, with clinical judgement guiding sequencing based on patient factors.",
        keyFeatures: [
            "Academic centre with strong MM clinical trial portfolio",
            "Bispecifics recommended alongside CAR-T",
            "Clinical judgement-based sequencing",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Partially published; treatment algorithms referenced in publications",
        lastChecked: "2026-03",
    },
    {
        id: "mdanderson",
        name: "MD Anderson Myeloma Treatment Algorithms",
        organization: "MD Anderson Cancer Center",
        type: "academic",
        access: "semi-public",
        coverage: "MD Anderson patient population",
        mmCoverage: true,
        description: "Published treatment algorithms for MM. BCMA-directed bispecifics recommended in relapsed/refractory setting, with preference for CAR-T when logistically feasible. Elrexfio recommended as an alternative or bridge to CAR-T.",
        keyFeatures: [
            "Published in peer-reviewed journals",
            "CAR-T preferred when feasible",
            "Bispecifics recommended as bridge or alternative",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Published algorithms available; institutional protocols semi-public",
        lastChecked: "2026-03",
    },
    {
        id: "msk",
        name: "Memorial Sloan Kettering MM Pathways",
        organization: "Memorial Sloan Kettering Cancer Center",
        type: "academic",
        access: "semi-public",
        coverage: "MSK patient population",
        mmCoverage: true,
        description: "Institutional treatment pathways for MM. Strong CAR-T programme with preference for cellular therapy in eligible patients. Bispecifics listed but with institutional preference toward CAR-T when slots available.",
        keyFeatures: [
            "Major CAR-T referral centre",
            "Preference for CAR-T in eligible patients",
            "Bispecifics as bridge therapy or CAR-T alternative",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Semi-public; referenced in clinical publications",
        lastChecked: "2026-03",
    },
    {
        id: "mayo",
        name: "Mayo Clinic MM Treatment Protocols",
        organization: "Mayo Clinic",
        type: "academic",
        access: "semi-public",
        coverage: "Mayo Clinic patient population (3 campuses)",
        mmCoverage: true,
        description: "mSMART (Mayo Stratification for Myeloma And Risk-adapted Therapy) consensus guidelines. Updated regularly. Bispecifics including elranatamab recommended in triple-class exposed patients.",
        keyFeatures: [
            "mSMART consensus guidelines widely referenced",
            "Risk-stratified treatment approach",
            "Bispecifics recommended in TCE patients",
            "Published and freely accessible online",
        ],
        url: "https://www.msmart.org/",
        pdfUrls: [],
        dataAvailability: "Public — mSMART guidelines freely available",
        lastChecked: "2026-03",
    },
    {
        id: "va",
        name: "VA National Oncology Clinical Pathways — Myeloma",
        organization: "US Department of Veterans Affairs",
        type: "public",
        access: "public",
        coverage: "VA healthcare system nationally",
        mmCoverage: true,
        description: "VA clinical pathways for MM based on NCCN with VA formulary considerations. BCMA-directed therapies available but with formulary-based access. Elrexfio listed but not preferentially positioned.",
        keyFeatures: [
            "Public government pathway",
            "NCCN-aligned with VA formulary overlay",
            "Formulary committee reviews novel agents",
        ],
        url: "https://www.cancer.va.gov/clinical-pathways.html",
        pdfUrls: [],
        dataAvailability: "Public — pathways accessible on VA website",
        lastChecked: "2026-03",
    },
    {
        id: "nci",
        name: "NCI PDQ — Multiple Myeloma Treatment",
        organization: "National Cancer Institute",
        type: "public",
        access: "public",
        coverage: "Reference resource (non-prescriptive)",
        mmCoverage: true,
        description: "NCI Physician Data Query provides evidence-based treatment summaries for MM. Not a pathway per se, but widely referenced by pathway committees and used as a neutral benchmark.",
        keyFeatures: [
            "Evidence-based treatment summaries",
            "Updated regularly by expert editorial board",
            "Non-prescriptive — informational reference",
        ],
        url: "https://www.cancer.gov/types/myeloma/hp/myeloma-treatment-pdq",
        pdfUrls: [],
        dataAvailability: "Public — freely accessible",
        lastChecked: "2026-03",
    },
    {
        id: "mmit",
        name: "MMIT PULSE — Myeloma Analytics",
        organization: "Managed Markets Insight & Technology",
        type: "commercial",
        access: "proprietary",
        coverage: "Aggregated US payer coverage intelligence",
        mmCoverage: true,
        description: "Commercial analytics platform tracking payer coverage policies and pathway restrictions for oncology drugs including MM therapies. Provides granular formulary positioning data for BCMA-directed therapies.",
        keyFeatures: [
            "Real-time payer coverage tracking",
            "Formulary restriction monitoring",
            "Competitive positioning analytics",
        ],
        url: "#",
        pdfUrls: [],
        dataAvailability: "Subscription-based proprietary platform",
        lastChecked: "2026-03",
    },
];


// ── NCCN Data ──────────────────────────────────────────────────────────

const NCCN_DATA = {
    title: "NCCN Clinical Practice Guidelines — Multiple Myeloma",
    currentVersion: "Version 3.2026",
    url: "https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1445",
    recentUpdates: [
        "Updated BCMA-directed bispecific antibody recommendations (elranatamab, teclistamab)",
        "Ciltacabtagene autoleucel (Carvykti) expanded to 1-3 prior lines (KarMMa-3 / CARTITUDE-4)",
        "Talquetamab (Talvey) GPRC5D bispecific added as Category 2A",
        "Belantamab mafodotin (Blenrep) reinstated based on DREAMM-7/8 data",
        "Updated risk stratification incorporating MRD-guided therapy decisions",
    ],
};


// ── MM Drug Class Landscape ────────────────────────────────────────────

const MM_DRUG_CLASSES = [
    {
        drugClass: "Proteasome Inhibitors (PIs)",
        agents: ["Bortezomib (Velcade)", "Carfilzomib (Kyprolis)", "Ixazomib (Ninlaro)"],
        pathwayRelevance: "Foundation of frontline MM therapy; used in nearly all induction regimens",
        lines: "1L–3L+",
    },
    {
        drugClass: "Immunomodulatory Drugs (IMiDs)",
        agents: ["Lenalidomide (Revlimid)", "Pomalidomide (Pomalyst)", "Thalidomide (Thalomid)"],
        pathwayRelevance: "Backbone of maintenance and combination regimens across all lines",
        lines: "1L–3L+",
    },
    {
        drugClass: "Anti-CD38 Monoclonal Antibodies",
        agents: ["Daratumumab (Darzalex / Darzalex Faspro)", "Isatuximab (Sarclisa)"],
        pathwayRelevance: "Now standard in 1L combinations; key differentiator in pathway positioning",
        lines: "1L–3L+",
    },
    {
        drugClass: "BCMA-Directed CAR-T",
        agents: ["Ciltacabtagene autoleucel (Carvykti)", "Idecabtagene vicleucel (Abecma)"],
        pathwayRelevance: "NCCN preferred in R/R MM; requires certified treatment centres; 4-6 week manufacturing",
        lines: "2L+ (Carvykti), 4L+ (Abecma)",
    },
    {
        drugClass: "BCMA-Directed Bispecific Antibodies",
        agents: ["Elranatamab (Elrexfio)", "Teclistamab (Tecvayli)"],
        pathwayRelevance: "Off-the-shelf BCMA targeting; pathway restrictions often require prior CAR-T",
        lines: "4L+ (current); earlier-line trials ongoing",
    },
    {
        drugClass: "GPRC5D-Directed Bispecific Antibodies",
        agents: ["Talquetamab (Talvey)"],
        pathwayRelevance: "Non-BCMA bispecific target; may be used post-BCMA failure",
        lines: "4L+",
    },
    {
        drugClass: "Other Novel Agents",
        agents: ["Selinexor (Xpovio)", "Belantamab mafodotin (Blenrep)", "Elotuzumab (Empliciti)"],
        pathwayRelevance: "Niche positioning; Blenrep reinstated after DREAMM-7/8 data",
        lines: "3L+",
    },
];


// ── Pathway Institutions ──────────────────────────────────────────────

const PATHWAY_INSTITUTIONS = [
    { id: "nccn", name: "NCCN", fullName: "National Comprehensive Cancer Network", type: "guideline", version: "v3.2026", url: "https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1445" },
    { id: "va", name: "VA", fullName: "VA National Oncology Pathways", type: "public", version: "2026-Q1", url: "https://www.cancer.va.gov/clinical-pathways.html" },
    { id: "uhc", name: "UHC", fullName: "UnitedHealthcare Cancer Therapy Pathways", type: "payer", version: "2026-Q1", url: "#" },
    { id: "anthem", name: "Anthem", fullName: "Anthem / Elevance CCQP", type: "payer", version: "2026-Q1", url: "#" },
    { id: "evicore", name: "eviCore", fullName: "eviCore / Cigna Oncology", type: "payer", version: "2026-Q1", url: "#" },
    { id: "humana", name: "Humana", fullName: "Humana Oncology Pathways", type: "payer", version: "2026-Q1", url: "#" },
    { id: "aetna", name: "Aetna", fullName: "Aetna Clinical Policy Bulletins", type: "payer", version: "2026-Q1", url: "#" },
    { id: "usoncology", name: "US Onc", fullName: "US Oncology / McKesson Pathways", type: "provider", version: "2026-Q1", url: "#" },
    { id: "oneoncology", name: "OneOnc", fullName: "OneOncology Clinical Pathways", type: "provider", version: "2026-Q1", url: "#" },
    { id: "moffitt", name: "Moffitt", fullName: "Moffitt Cancer Center", type: "academic", version: "2026", url: "#" },
    { id: "mdanderson", name: "MDA", fullName: "MD Anderson Cancer Center", type: "academic", version: "2026", url: "#" },
    { id: "msk", name: "MSK", fullName: "Memorial Sloan Kettering", type: "academic", version: "2026", url: "#" },
    { id: "mayo", name: "Mayo", fullName: "Mayo Clinic (mSMART)", type: "academic", version: "2026", url: "https://www.msmart.org/" },
];

const INSTITUTION_VERIFICATION = {
    nccn:        { level: "verified",  source: "NCCN Guidelines v3.2026 — publicly registered access" },
    va:          { level: "published", source: "VA cancer.va.gov clinical pathways page" },
    uhc:        { level: "verified",  source: "UHC Cancer Therapy Pathways Regimens PDF" },
    anthem:      { level: "published", source: "Elevance CCQP medical policy documents" },
    evicore:     { level: "published", source: "eviCore oncology clinical criteria" },
    humana:      { level: "inferred",  source: "Humana provider communications; limited public data" },
    aetna:       { level: "verified",  source: "Aetna CPBs publicly available" },
    usoncology:  { level: "published", source: "US Oncology NCCN-aligned pathway documentation" },
    oneoncology: { level: "inferred",  source: "OneOncology limited public pathway data" },
    moffitt:     { level: "published", source: "Moffitt clinical publications and treatment algorithms" },
    mdanderson:  { level: "published", source: "MD Anderson published treatment algorithms" },
    msk:         { level: "published", source: "MSK clinical practice publications" },
    mayo:        { level: "verified",  source: "mSMART consensus guidelines — publicly available" },
};


// ── Therapy Comparison Matrix Data ────────────────────────────────────

const THERAPY_PREFERENCES = [
    {
        setting: "NDTE Induction",
        settingKey: "ndte-induction",
        therapies: [
            {
                agent: "Daratumumab + VRd (D-VRd)", brand: "Darzalex Faspro + Velcade/Revlimid/dex", manufacturer: "J&J / Takeda / BMS",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 — GRIFFIN/PERSEUS data" },
                    va: { status: "preferred", note: "Preferred 1L induction" },
                    uhc: { status: "preferred", note: "On-pathway preferred regimen" },
                    anthem: { status: "preferred", note: "Preferred induction" },
                    evicore: { status: "preferred", note: "Preferred pathway" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Meets medical necessity" },
                    usoncology: { status: "preferred", note: "NCCN-aligned preferred" },
                    oneoncology: { status: "preferred", note: "Preferred" },
                    moffitt: { status: "preferred", note: "Standard of care" },
                    mdanderson: { status: "preferred", note: "Preferred induction" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
            {
                agent: "VRd (Bortezomib/Lenalidomide/dex)", brand: "Velcade/Revlimid/dex", manufacturer: "Takeda / BMS",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Standard regimen" },
                    usoncology: { status: "preferred", note: "Preferred" },
                    oneoncology: { status: "preferred", note: "Preferred" },
                    moffitt: { status: "preferred", note: "Standard" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
            {
                agent: "IsaVRd (Isatuximab + VRd)", brand: "Sarclisa + VRd", manufacturer: "Sanofi / Takeda / BMS",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — GMMG-HD7" },
                    va: { status: "listed", note: "Available" },
                    uhc: { status: "listed", note: "Listed, not preferred" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "recommended", note: "Recommended" },
                    humana: { status: "listed", note: "Listed" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "NCCN-aligned" },
                    oneoncology: { status: "listed", note: "Available" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Option" },
                    msk: { status: "listed", note: "Available" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
            {
                agent: "KRd (Carfilzomib/Lenalidomide/dex)", brand: "Kyprolis/Revlimid/dex", manufacturer: "Amgen / BMS",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A" },
                    va: { status: "listed", note: "Available" },
                    uhc: { status: "listed", note: "Other option" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "listed", note: "Listed" },
                    humana: { status: "listed", note: "Listed" },
                    aetna: { status: "recommended", note: "Criteria met" },
                    usoncology: { status: "recommended", note: "NCCN-aligned" },
                    oneoncology: { status: "listed", note: "Available" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "listed", note: "Available" },
                    msk: { status: "listed", note: "Available" },
                    mayo: { status: "listed", note: "Option per mSMART" },
                },
            },
        ],
    },
    {
        setting: "NDTI (Transplant-Ineligible)",
        settingKey: "ndti",
        therapies: [
            {
                agent: "DRd (Daratumumab/Lenalidomide/dex)", brand: "Darzalex Faspro + Revlimid/dex", manufacturer: "J&J / BMS",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 — MAIA" },
                    va: { status: "preferred", note: "Preferred NDTI" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Standard" },
                    usoncology: { status: "preferred", note: "Preferred" },
                    oneoncology: { status: "preferred", note: "Preferred" },
                    moffitt: { status: "preferred", note: "Standard of care" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
            {
                agent: "VRd", brand: "Velcade/Revlimid/dex", manufacturer: "Takeda / BMS",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Standard" },
                    usoncology: { status: "preferred", note: "Preferred" },
                    oneoncology: { status: "preferred", note: "Preferred" },
                    moffitt: { status: "preferred", note: "Standard" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
            {
                agent: "D-VMP (Dara/Bortezomib/Melphalan/Pred)", brand: "Darzalex + VMP", manufacturer: "J&J / Takeda",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 1 — ALCYONE" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Recommended" },
                    evicore: { status: "recommended", note: "Recommended" },
                    humana: { status: "recommended", note: "Listed" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "NCCN-aligned" },
                    oneoncology: { status: "recommended", note: "Recommended" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Option" },
                    msk: { status: "recommended", note: "Option" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
        ],
    },
    {
        setting: "1st Relapse (Len-exposed)",
        settingKey: "1st-relapse",
        therapies: [
            {
                agent: "DPd (Daratumumab/Pomalidomide/dex)", brand: "Darzalex + Pomalyst/dex", manufacturer: "J&J / BMS",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Standard" },
                    usoncology: { status: "preferred", note: "Preferred" },
                    oneoncology: { status: "preferred", note: "Preferred" },
                    moffitt: { status: "preferred", note: "Preferred" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
            {
                agent: "IsaPd (Isatuximab/Pomalidomide/dex)", brand: "Sarclisa + Pomalyst/dex", manufacturer: "Sanofi / BMS",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 — ICARIA-MM" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "recommended", note: "Listed" },
                    anthem: { status: "recommended", note: "Listed" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "listed", note: "Available" },
                    aetna: { status: "preferred", note: "Meets criteria" },
                    usoncology: { status: "preferred", note: "NCCN-aligned" },
                    oneoncology: { status: "recommended", note: "Recommended" },
                    moffitt: { status: "preferred", note: "Option" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "recommended", note: "Option" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
            {
                agent: "DVd (Daratumumab/Bortezomib/dex)", brand: "Darzalex + Velcade/dex", manufacturer: "J&J / Takeda",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 — CASTOR" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "On-pathway" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Standard" },
                    usoncology: { status: "preferred", note: "Preferred" },
                    oneoncology: { status: "preferred", note: "Preferred" },
                    moffitt: { status: "preferred", note: "Preferred" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
            {
                agent: "Ciltacabtagene autoleucel (CAR-T)", brand: "Carvykti", manufacturer: "J&J / Legend Biotech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 — CARTITUDE-4 (1-3 prior lines)" },
                    va: { status: "preferred", note: "Preferred where available" },
                    uhc: { status: "preferred", note: "Preferred — certified centres" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Referral to certified centre" },
                    oneoncology: { status: "recommended", note: "Referral required" },
                    moffitt: { status: "preferred", note: "Preferred" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "mSMART preferred" },
                },
            },
        ],
    },
    {
        setting: "2nd Relapse",
        settingKey: "2nd-relapse",
        therapies: [
            {
                agent: "Ciltacabtagene autoleucel (CAR-T)", brand: "Carvykti", manufacturer: "J&J / Legend Biotech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1 — CARTITUDE-4" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "Preferred" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Referral" },
                    oneoncology: { status: "recommended", note: "Referral" },
                    moffitt: { status: "preferred", note: "Preferred" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "Preferred" },
                },
            },
            {
                agent: "Teclistamab (BCMA×CD3 bispecific)", brand: "Tecvayli", manufacturer: "J&J",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "listed", note: "Listed — PA required" },
                    anthem: { status: "listed", note: "Listed with conditions" },
                    evicore: { status: "listed", note: "Listed — CAR-T preferred" },
                    humana: { status: "listed", note: "Class restriction" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Recommended" },
                    oneoncology: { status: "recommended", note: "Recommended" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Bridge or alternative" },
                    msk: { status: "listed", note: "CAR-T preferred" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
            {
                agent: "Elranatamab (BCMA×CD3 bispecific)", brand: "Elrexfio", manufacturer: "Pfizer",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — MagnetisMM-3" },
                    va: { status: "listed", note: "Available, not preferred" },
                    uhc: { status: "restricted", note: "Requires prior CAR-T or documented ineligibility" },
                    anthem: { status: "restricted", note: "Step-through: CAR-T first" },
                    evicore: { status: "restricted", note: "PA required — CAR-T first" },
                    humana: { status: "listed", note: "Class restriction applies" },
                    aetna: { status: "recommended", note: "Meets criteria with documentation" },
                    usoncology: { status: "recommended", note: "Recommended per NCCN" },
                    oneoncology: { status: "listed", note: "Available" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Bridge/alternative to CAR-T" },
                    msk: { status: "listed", note: "CAR-T preferred when feasible" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
            {
                agent: "Talquetamab (GPRC5D×CD3 bispecific)", brand: "Talvey", manufacturer: "J&J",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — MonumenTAL-1" },
                    va: { status: "listed", note: "Available" },
                    uhc: { status: "listed", note: "Listed — PA required" },
                    anthem: { status: "listed", note: "Listed with conditions" },
                    evicore: { status: "listed", note: "Listed" },
                    humana: { status: "listed", note: "Class restriction" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Recommended" },
                    oneoncology: { status: "listed", note: "Available" },
                    moffitt: { status: "recommended", note: "Option — non-BCMA target" },
                    mdanderson: { status: "recommended", note: "Post-BCMA option" },
                    msk: { status: "listed", note: "Non-BCMA option" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
        ],
    },
    {
        setting: "3L+ / Triple-Class Exposed",
        settingKey: "3l-tce",
        therapies: [
            {
                agent: "Ciltacabtagene autoleucel (CAR-T)", brand: "Carvykti", manufacturer: "J&J / Legend Biotech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "Preferred" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Referral to certified centre" },
                    oneoncology: { status: "recommended", note: "Referral" },
                    moffitt: { status: "preferred", note: "Preferred" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "Preferred" },
                },
            },
            {
                agent: "Idecabtagene vicleucel (CAR-T)", brand: "Abecma", manufacturer: "BMS / 2seventy bio",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — KarMMa" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Recommended" },
                    evicore: { status: "recommended", note: "Recommended" },
                    humana: { status: "recommended", note: "Recommended" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Referral" },
                    oneoncology: { status: "recommended", note: "Referral" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Option" },
                    msk: { status: "recommended", note: "Option" },
                    mayo: { status: "recommended", note: "Option" },
                },
            },
            {
                agent: "Teclistamab (BCMA×CD3 bispecific)", brand: "Tecvayli", manufacturer: "J&J",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "restricted", note: "CAR-T step-through required" },
                    anthem: { status: "restricted", note: "Step-through" },
                    evicore: { status: "restricted", note: "CAR-T first" },
                    humana: { status: "listed", note: "Class restriction" },
                    aetna: { status: "recommended", note: "With documentation" },
                    usoncology: { status: "recommended", note: "Recommended" },
                    oneoncology: { status: "recommended", note: "Recommended" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Bridge/alternative" },
                    msk: { status: "listed", note: "CAR-T preferred" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
            {
                agent: "Elranatamab (BCMA×CD3 bispecific)", brand: "Elrexfio", manufacturer: "Pfizer",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — MagnetisMM-3" },
                    va: { status: "listed", note: "Available, not preferred" },
                    uhc: { status: "restricted", note: "Requires prior CAR-T or documented ineligibility" },
                    anthem: { status: "restricted", note: "Step-through: CAR-T first required" },
                    evicore: { status: "restricted", note: "PA required — must document CAR-T attempt/ineligibility" },
                    humana: { status: "listed", note: "Class restriction — no BCMA/GPRC5D differentiation" },
                    aetna: { status: "recommended", note: "Meets criteria with prior therapy documentation" },
                    usoncology: { status: "recommended", note: "Recommended per NCCN alignment" },
                    oneoncology: { status: "listed", note: "Available, community administrable" },
                    moffitt: { status: "recommended", note: "Option alongside CAR-T" },
                    mdanderson: { status: "recommended", note: "Bridge therapy or CAR-T alternative" },
                    msk: { status: "listed", note: "Institutional preference for CAR-T" },
                    mayo: { status: "recommended", note: "mSMART recommended in TCE" },
                },
            },
            {
                agent: "Talquetamab (GPRC5D×CD3 bispecific)", brand: "Talvey", manufacturer: "J&J",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A" },
                    va: { status: "listed", note: "Available" },
                    uhc: { status: "restricted", note: "CAR-T step-through" },
                    anthem: { status: "restricted", note: "Step-through" },
                    evicore: { status: "listed", note: "Listed — non-BCMA" },
                    humana: { status: "listed", note: "Class restriction" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Recommended" },
                    oneoncology: { status: "listed", note: "Available" },
                    moffitt: { status: "recommended", note: "Non-BCMA option" },
                    mdanderson: { status: "recommended", note: "Post-BCMA option" },
                    msk: { status: "recommended", note: "Non-BCMA alternative" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
            {
                agent: "Selinexor/dex", brand: "Xpovio + dex", manufacturer: "Karyopharm",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — STORM" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "listed", note: "Listed" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "listed", note: "Listed" },
                    humana: { status: "listed", note: "Listed" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "listed", note: "Available" },
                    oneoncology: { status: "listed", note: "Available" },
                    moffitt: { status: "listed", note: "Option" },
                    mdanderson: { status: "listed", note: "Option" },
                    msk: { status: "listed", note: "Option" },
                    mayo: { status: "listed", note: "Later-line option" },
                },
            },
            {
                agent: "Belantamab mafodotin (BCMA ADC)", brand: "Blenrep", manufacturer: "GSK",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — DREAMM-7/8 reinstatement" },
                    va: { status: "listed", note: "Available" },
                    uhc: { status: "listed", note: "Listed" },
                    anthem: { status: "listed", note: "Listed" },
                    evicore: { status: "listed", note: "Listed" },
                    humana: { status: "listed", note: "Listed" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Recommended" },
                    oneoncology: { status: "listed", note: "Available" },
                    moffitt: { status: "recommended", note: "Reinstated" },
                    mdanderson: { status: "recommended", note: "DREAMM data" },
                    msk: { status: "recommended", note: "Reinstated" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
        ],
    },
    {
        setting: "BCMA-Directed Therapy (4L+)",
        settingKey: "bcma-4l",
        therapies: [
            {
                agent: "Ciltacabtagene autoleucel (CAR-T)", brand: "Carvykti", manufacturer: "J&J / Legend Biotech",
                nccnCategory: "preferred",
                positions: {
                    nccn: { status: "preferred", note: "Category 1" },
                    va: { status: "preferred", note: "Preferred" },
                    uhc: { status: "preferred", note: "Preferred" },
                    anthem: { status: "preferred", note: "Preferred" },
                    evicore: { status: "preferred", note: "Preferred" },
                    humana: { status: "preferred", note: "Preferred" },
                    aetna: { status: "preferred", note: "Preferred" },
                    usoncology: { status: "recommended", note: "Referral to certified centre" },
                    oneoncology: { status: "recommended", note: "Referral required" },
                    moffitt: { status: "preferred", note: "Preferred" },
                    mdanderson: { status: "preferred", note: "Preferred" },
                    msk: { status: "preferred", note: "Preferred" },
                    mayo: { status: "preferred", note: "Preferred" },
                },
            },
            {
                agent: "Idecabtagene vicleucel (CAR-T)", brand: "Abecma", manufacturer: "BMS / 2seventy bio",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "recommended", note: "On-pathway" },
                    anthem: { status: "recommended", note: "Recommended" },
                    evicore: { status: "recommended", note: "Recommended" },
                    humana: { status: "recommended", note: "Recommended" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Referral" },
                    oneoncology: { status: "recommended", note: "Referral" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Option" },
                    msk: { status: "recommended", note: "Option" },
                    mayo: { status: "recommended", note: "Option" },
                },
            },
            {
                agent: "Elranatamab (BCMA×CD3 bispecific)", brand: "Elrexfio", manufacturer: "Pfizer",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — MagnetisMM-3: ORR 61%" },
                    va: { status: "listed", note: "Available but not preferred — formulary review" },
                    uhc: { status: "restricted", note: "RESTRICTED: Requires prior CAR-T failure or documented CAR-T ineligibility" },
                    anthem: { status: "restricted", note: "RESTRICTED: Step-through — must attempt/fail CAR-T first" },
                    evicore: { status: "restricted", note: "RESTRICTED: Extensive PA — CAR-T first, REMS documentation" },
                    humana: { status: "listed", note: "Listed with class-level conditions — no target differentiation" },
                    aetna: { status: "recommended", note: "Meets medical necessity with prior therapy documentation" },
                    usoncology: { status: "recommended", note: "Recommended — community setting advantage" },
                    oneoncology: { status: "listed", note: "Available — community administrable" },
                    moffitt: { status: "recommended", note: "Recommended as CAR-T alternative" },
                    mdanderson: { status: "recommended", note: "Bridge to CAR-T or alternative if ineligible" },
                    msk: { status: "listed", note: "Listed — institutional preference for CAR-T when slots available" },
                    mayo: { status: "recommended", note: "mSMART recommended in post-TCE setting" },
                },
            },
            {
                agent: "Teclistamab (BCMA×CD3 bispecific)", brand: "Tecvayli", manufacturer: "J&J",
                nccnCategory: "recommended",
                positions: {
                    nccn: { status: "recommended", note: "Category 2A — MajesTEC-1" },
                    va: { status: "recommended", note: "Recommended" },
                    uhc: { status: "restricted", note: "CAR-T step-through" },
                    anthem: { status: "restricted", note: "Step-through required" },
                    evicore: { status: "restricted", note: "CAR-T first" },
                    humana: { status: "listed", note: "Class restriction" },
                    aetna: { status: "recommended", note: "Meets criteria" },
                    usoncology: { status: "recommended", note: "Recommended" },
                    oneoncology: { status: "recommended", note: "Recommended" },
                    moffitt: { status: "recommended", note: "Option" },
                    mdanderson: { status: "recommended", note: "Bridge/alternative" },
                    msk: { status: "listed", note: "CAR-T preferred" },
                    mayo: { status: "recommended", note: "mSMART option" },
                },
            },
        ],
    },
];


// ── Elrexfio Spotlight Data ───────────────────────────────────────────

const ELREXFIO_SPOTLIGHT = {
    genericName: "elranatamab-bcmm",
    brandName: "Elrexfio",
    manufacturer: "Pfizer",
    target: "BCMA × CD3 bispecific T-cell engager",
    mechanismOfAction: "Redirects CD3+ T cells to BCMA-expressing myeloma cells, inducing T-cell-mediated cytotoxicity",
    approvalDate: "August 2023 (FDA accelerated approval)",
    indication: "Relapsed or refractory multiple myeloma in adults who have received at least 4 prior lines of therapy, including a proteasome inhibitor, an immunomodulatory agent, and an anti-CD38 monoclonal antibody",
    administration: "Subcutaneous injection; step-up dosing schedule (Days 1, 4 → weekly → biweekly)",
    nccnCategory: "Recommended (Category 2A)",
    pivotalTrial: "MagnetisMM-3 (Phase 2): ORR 61%, CR 35%, median DOR 17.2 months",
    competitors: [
        { name: "Tecvayli (teclistamab-cqyv)", manufacturer: "Janssen (J&J)", target: "BCMA × CD3 bispecific", nccn: "Recommended (Cat 2A)", approval: "October 2022", keyData: "MajesTEC-1: ORR 63%, CR 39.4%", administration: "SC, step-up dosing → weekly" },
        { name: "Talvey (talquetamab-tgvs)", manufacturer: "Janssen (J&J)", target: "GPRC5D × CD3 bispecific", nccn: "Recommended (Cat 2A)", approval: "August 2023", keyData: "MonumenTAL-1: ORR 73% (0.8mg), 74% (0.4mg)", administration: "SC, step-up → biweekly" },
        { name: "Carvykti (cilta-cel)", manufacturer: "J&J / Legend Biotech", target: "BCMA CAR-T cell therapy", nccn: "Preferred (Cat 1)", approval: "February 2022; 1-3L expansion 2024", keyData: "CARTITUDE-4: 76% reduction in PFS events vs SOC", administration: "Single IV infusion; 4-6 week manufacturing" },
        { name: "Abecma (ide-cel)", manufacturer: "BMS / 2seventy bio", target: "BCMA CAR-T cell therapy", nccn: "Recommended (Cat 2A)", approval: "March 2021", keyData: "KarMMa: ORR 73%, CR 33%", administration: "Single IV infusion; 4-6 week manufacturing" },
    ],
    pathwayBarriers: [
        { barrier: "CAR-T step-through requirement", description: "Several major payers require documented CAR-T failure or certified CAR-T ineligibility before approving BCMA-directed bispecific antibodies. This creates a structural barrier for Elrexfio as a first BCMA-directed option.", affectedPrograms: ["UHC", "Anthem/Carelon", "eviCore/Cigna"], impact: "high" },
        { barrier: "Class-level bispecific restrictions", description: "Some pathways restrict all bispecific antibodies equally without distinguishing between BCMA-directed (elranatamab, teclistamab) and GPRC5D-directed (talquetamab) agents, limiting individual differentiation.", affectedPrograms: ["Humana", "Aetna (partial)"], impact: "medium" },
        { barrier: "Academic centre CAR-T preference", description: "Major academic centres with active CAR-T programmes generally prefer CAR-T when logistically feasible, positioning bispecifics as bridge therapy or alternative only when CAR-T is not an option.", affectedPrograms: ["MD Anderson", "MSK", "Mayo Clinic"], impact: "medium" },
        { barrier: "Prior authorization burden", description: "Elrexfio requires extensive PA documentation including full prior therapy history, CAR-T eligibility assessment, and REMS enrolment confirmation. The administrative burden is higher than some competing agents.", affectedPrograms: ["UHC", "Anthem", "eviCore", "Humana"], impact: "high" },
        { barrier: "First-mover disadvantage vs Tecvayli", description: "Teclistamab (Tecvayli) gained approval 10 months earlier and established pathway positions first. Some pathway committees are slow to add a second BCMA bispecific or differentiate between them.", affectedPrograms: ["Multiple payer and provider pathways"], impact: "medium" },
    ],
    pathwayOpportunities: [
        { opportunity: "CAR-T manufacturing delays (4-6 weeks)", description: "CAR-T requires apheresis, manufacturing (4-6 weeks), and certified centre access. Bispecifics like Elrexfio provide immediate off-the-shelf treatment, creating a bridging opportunity and alternative for patients who cannot wait.", relevantPrograms: ["All pathways"] },
        { opportunity: "Community oncology administration", description: "Unlike CAR-T (which requires REMS-certified academic centres), Elrexfio can be administered in community oncology settings. This provides an access advantage for the ~70% of MM patients treated outside academic centres.", relevantPrograms: ["US Oncology", "OneOncology", "Community-based practices"] },
        { opportunity: "Subcutaneous convenience", description: "Elrexfio's SC administration and transition to biweekly dosing provides a practical advantage for patients and treatment centres compared to more complex administration schedules.", relevantPrograms: ["Community-based programmes"] },
        { opportunity: "Earlier-line clinical expansion", description: "MagnetisMM-7 (Ph3, 2-4L) and MagnetisMM-9 (Ph3, 1L NDTI) trials could dramatically shift pathway positioning if positive results support earlier use, before CAR-T is typically considered.", relevantPrograms: ["All — pending data readouts"] },
        { opportunity: "Post-CAR-T relapse setting", description: "Patients relapsing after CAR-T represent a growing population. Elrexfio provides a retreatment option targeting BCMA through a different mechanism (bispecific vs CAR-T).", relevantPrograms: ["Academic centres", "Payer pathways post-CAR-T"] },
    ],
    clinicalTrials: [
        { name: "MagnetisMM-3", phase: "Phase 2 (pivotal)", line: "4L+ R/R MM", status: "Published — basis for accelerated approval", result: "ORR 61%, CR rate 35%, median DOR 17.2 months, median PFS 17.2 months" },
        { name: "MagnetisMM-7", phase: "Phase 3", line: "2-4L R/R MM", status: "Enrolling", result: "Elrexfio + len/dex vs physician's choice — could support earlier-line positioning" },
        { name: "MagnetisMM-9", phase: "Phase 3", line: "1L NDTI", status: "Enrolling", result: "Elrexfio + Dara-Rd vs Dara-Rd — frontline combination potential" },
        { name: "MagnetisMM-5", phase: "Phase 1/2", line: "R/R MM combinations", status: "Ongoing", result: "Elrexfio + daratumumab, + pomalidomide, + lenalidomide combinations" },
        { name: "MagnetisMM-6", phase: "Phase 3", line: "4L+ R/R MM (confirmatory)", status: "Enrolling", result: "Confirmatory trial for full approval — Elrexfio vs physician's choice" },
    ],
    deviationSummary: {
        totalInstitutions: 12,
        restrictedCount: 3,
        listedWithConditions: 3,
        recommendedCount: 6,
        preferredCount: 0,
        keyInsight: "Elrexfio faces significant pathway headwinds compared to CAR-T therapies in the BCMA-directed space. While NCCN lists it as 'Recommended' (Category 2A), 3 of 12 tracked pathway programs impose explicit restrictions (primarily CAR-T step-through requirements), and an additional 3 list it with conditions that limit use. Zero pathways currently grant Elrexfio 'Preferred' status. This contrasts starkly with Carvykti, which achieves 'Preferred' status at NCCN and across 9 of 12 tracked programs. The data supports the hypothesis that pathway positioning is negatively impacting Elrexfio's commercial performance — the structural preference for CAR-T in pathway design, combined with step-through requirements at major payers covering ~70M+ lives, creates a significant access barrier that goes beyond NCCN category alone.",
    },
};


// ── NCCN MM Treatment Algorithm ───────────────────────────────────────

const NCCN_ALGORITHM = {
    version: "v3.2026",
    lastUpdated: "March 2026",
    sections: [
        {
            id: "risk-stratification",
            title: "1. Risk Stratification at Diagnosis",
            type: "diagnostic",
            items: [
                { test: "Cytogenetics / FISH", method: "del(17p), t(4;14), t(14;16), t(14;20), gain(1q)" },
                { test: "Gene Expression Profiling", method: "GEP70, SKY92 (if available)" },
                { test: "Revised ISS (R-ISS)", method: "Stage I–III based on LDH, β2M, albumin, cytogenetics" },
                { test: "Serum Free Light Chains", method: "κ/λ ratio" },
                { test: "MRD Assessment", method: "NGS-based (10⁻⁵ sensitivity) — increasingly guides therapy duration" },
            ],
        },
        {
            id: "transplant-eligible",
            title: "2. Transplant-Eligible Induction → ASCT → Maintenance",
            type: "treatment",
            branches: [
                { driver: "Preferred Induction", category: "1", preferred: ["D-VRd (Darzalex + Velcade/Revlimid/dex)", "VRd (Velcade/Revlimid/dex)"], other: ["IsaVRd", "KRd", "D-VTd"] },
                { driver: "Consolidation / ASCT", category: "1", preferred: ["High-dose melphalan + ASCT"], other: ["Tandem ASCT (high-risk)"] },
                { driver: "Maintenance", category: "1", preferred: ["Lenalidomide (standard risk)", "Lenalidomide + Bortezomib (high risk)"], other: ["Ixazomib maintenance"] },
            ],
        },
        {
            id: "transplant-ineligible",
            title: "3. Transplant-Ineligible Continuous Therapy",
            type: "treatment",
            branches: [
                { driver: "Preferred 1L NDTI", category: "1", preferred: ["DRd (Darzalex + Revlimid/dex)", "VRd"], other: ["D-VMP", "Rd"] },
            ],
        },
        {
            id: "first-relapse",
            title: "4. First Relapse (by prior exposure)",
            type: "treatment",
            branches: [
                { driver: "Len-exposed Relapse", category: "1", preferred: ["DPd", "DVd", "IsaPd", "Carvykti (1-3 prior lines)"], other: ["KPd", "EPd", "Isa-Kd"] },
                { driver: "PI-exposed, Len-sensitive", category: "1", preferred: ["DRd", "KRd", "IsaKd"], other: ["ERd", "DVd"] },
            ],
        },
        {
            id: "later-lines",
            title: "5. Relapsed/Refractory (3L+ / Triple-Class Exposed)",
            type: "treatment",
            branches: [
                { driver: "BCMA-Directed (Preferred)", category: "1", preferred: ["Carvykti (cilta-cel) — CAR-T"], other: ["Abecma (ide-cel) — CAR-T"] },
                { driver: "BCMA-Directed Bispecifics", category: "2A", preferred: [], other: ["Tecvayli (teclistamab)", "Elrexfio (elranatamab)"] },
                { driver: "GPRC5D-Directed", category: "2A", preferred: [], other: ["Talvey (talquetamab)"] },
                { driver: "Other Options", category: "2A", preferred: [], other: ["Selinexor/dex", "Belantamab mafodotin (Blenrep)", "Venetoclax (t(11;14))"] },
            ],
        },
    ],
};


// ── Render Functions ──────────────────────────────────────────────────

function renderStats() {
    const total = PATHWAY_PROGRAMS.length;
    const payer = PATHWAY_PROGRAMS.filter(p => p.type === "payer").length;
    const provider = PATHWAY_PROGRAMS.filter(p => p.type === "provider" || p.type === "academic" || p.type === "commercial").length;
    const publicSources = PATHWAY_PROGRAMS.filter(p => p.access === "public").length;

    document.getElementById("stat-total-programs").textContent = total;
    document.getElementById("stat-payer-programs").textContent = payer;
    document.getElementById("stat-provider-programs").textContent = provider;
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
    const featuresHtml = program.keyFeatures.map(f => `<li>${esc(f)}</li>`).join("");
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
            <div class="pathway-features"><strong>Key Features:</strong><ul>${featuresHtml}</ul></div>
            <div class="pathway-meta">
                <div><strong>Coverage:</strong> ${esc(program.coverage)}</div>
                <div><strong>MM Coverage:</strong> ${program.mmCoverage ? '<span class="pathway-nsclc-yes">Yes</span>' : '<span class="pathway-nsclc-no">No</span>'}</div>
                <div><strong>Data Access:</strong> ${esc(program.dataAvailability)}</div>
            </div>
            <div class="pathway-card-footer">
                <a href="${esc(program.url)}" target="_blank" class="pathway-source-link">Visit Source &rarr;</a>
                ${program.lastChecked ? `<span class="pathway-verified-badge" title="Last verified ${esc(program.lastChecked)}">Verified ${esc(program.lastChecked)}</span>` : ""}
            </div>
        </div>
    `;
}

function renderPrograms(filter = {}) {
    const grid = document.getElementById("mm-programs-grid");
    let programs = PATHWAY_PROGRAMS;
    if (filter.type) programs = programs.filter(p => p.type === filter.type);
    if (filter.search) {
        const q = filter.search.toLowerCase();
        programs = programs.filter(p => p.name.toLowerCase().includes(q) || p.organization.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    const countEl = document.getElementById("mm-pathway-results-count");
    if (countEl) {
        const hasFilters = filter.search || filter.type;
        countEl.textContent = hasFilters ? `${programs.length} of ${PATHWAY_PROGRAMS.length} programs` : `${programs.length} programs`;
    }
    if (programs.length === 0) { grid.innerHTML = '<p class="no-results">No pathway programs match your filters.</p>'; return; }
    grid.innerHTML = programs.map(renderProgramCard).join("");
}

function renderNCCNReference() {
    const container = document.getElementById("nccn-reference");
    if (!container) return;
    container.innerHTML = `
        <div class="nccn-ref-card">
            <div class="nccn-ref-meta">
                <span class="nccn-ref-version">${esc(NCCN_DATA.currentVersion)}</span>
                <a href="${esc(NCCN_DATA.url)}" target="_blank" class="pathway-source-link">View NCCN Guidelines &rarr;</a>
            </div>
            <div class="nccn-ref-updates">
                <strong>Recent Updates Relevant to MM Pathways:</strong>
                <ul>${NCCN_DATA.recentUpdates.map(u => `<li>${esc(u)}</li>`).join("")}</ul>
            </div>
        </div>
    `;
}

function renderDrugClassGrid() {
    const container = document.getElementById("mm-drug-class-grid");
    if (!container) return;
    container.innerHTML = `
        <table class="biomarker-table">
            <thead><tr><th>Drug Class</th><th>Key Agents</th><th>Lines</th><th>Pathway Relevance</th></tr></thead>
            <tbody>
                ${MM_DRUG_CLASSES.map(dc => `<tr>
                    <td><strong>${esc(dc.drugClass)}</strong></td>
                    <td>${dc.agents.map(a => `<span class="therapy-tag">${esc(a)}</span>`).join(" ")}</td>
                    <td>${esc(dc.lines)}</td>
                    <td>${esc(dc.pathwayRelevance)}</td>
                </tr>`).join("")}
            </tbody>
        </table>
    `;
}

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

function renderNCCNAlgorithm() {
    const container = document.getElementById("mm-nccn-algorithm");
    if (!container) return;
    const alg = NCCN_ALGORITHM;
    let html = `<div class="nccn-algo-header"><span class="nccn-algo-version">${esc(alg.version)}</span><span class="nccn-algo-updated">Updated: ${esc(alg.lastUpdated)}</span></div>`;
    const diagSection = alg.sections.find(s => s.type === "diagnostic");
    if (diagSection) {
        html += `<div class="nccn-algo-section"><h4 class="nccn-algo-section-title">${esc(diagSection.title)}</h4><div class="nccn-algo-tests">${diagSection.items.map(t => `<div class="nccn-test-item"><span class="nccn-test-name">${esc(t.test)}</span><span class="nccn-test-method">${esc(t.method)}</span></div>`).join("")}</div></div>`;
    }
    alg.sections.filter(s => s.type === "treatment").forEach(section => {
        html += `<div class="nccn-algo-section"><h4 class="nccn-algo-section-title">${esc(section.title)}</h4><div class="nccn-algo-branches">${section.branches.map(b => {
            const preferredHtml = b.preferred.map(p => `<span class="therapy-tag first-line">${esc(p)}</span>`).join(" ");
            const otherHtml = (b.other || []).map(o => `<span class="therapy-tag subsequent">${esc(o)}</span>`).join(" ");
            return `<div class="nccn-branch-card"><div class="nccn-branch-header"><span class="nccn-branch-driver">${esc(b.driver)}</span><span class="nccn-branch-cat">Cat ${esc(b.category)}</span></div><div class="nccn-branch-therapies">${preferredHtml ? `<div><strong>Preferred:</strong> ${preferredHtml}</div>` : ""}${otherHtml ? `<div class="nccn-branch-other"><strong>Other Recommended:</strong> ${otherHtml}</div>` : ""}</div></div>`;
        }).join("")}</div></div>`;
    });
    container.innerHTML = html;
}

function statusIcon(status) {
    switch (status) {
        case "preferred":   return '<span class="cmp-icon cmp-preferred" title="Preferred">P</span>';
        case "recommended": return '<span class="cmp-icon cmp-recommended" title="Recommended">R</span>';
        case "listed":      return '<span class="cmp-icon cmp-listed" title="Listed">L</span>';
        case "not listed":  return '<span class="cmp-icon cmp-not-listed" title="Not Listed">&mdash;</span>';
        case "restricted":  return '<span class="cmp-icon cmp-restricted" title="Restricted">X</span>';
        case "unknown":     return '<span class="cmp-icon cmp-unknown" title="Under Review">?</span>';
        default:            return '<span class="cmp-icon cmp-unknown">?</span>';
    }
}

function deviatesFromNCCN(nccnStatus, instStatus) {
    if (instStatus === "unknown") return false;
    if (nccnStatus === "preferred" && instStatus !== "preferred") return true;
    if (nccnStatus === "recommended" && (instStatus === "not listed" || instStatus === "restricted")) return true;
    return false;
}

function renderComparisonMatrix() {
    const container = document.getElementById("mm-comparison-matrix");
    if (!container) return;
    const lineFilter = document.getElementById("mm-line-filter");
    const deviationOnly = document.getElementById("mm-deviation-toggle");
    const selectedLine = lineFilter ? lineFilter.value : "";
    const showDeviationsOnly = deviationOnly ? deviationOnly.checked : false;
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    let filteredData = THERAPY_PREFERENCES;
    if (selectedLine) filteredData = filteredData.filter(d => d.settingKey === selectedLine);
    let html = "";
    filteredData.forEach(segment => {
        let therapies = segment.therapies;
        if (showDeviationsOnly) {
            therapies = therapies.filter(t => {
                const nccnStatus = t.positions.nccn ? t.positions.nccn.status : "unknown";
                return institutions.some(inst => { const pos = t.positions[inst.id]; return pos && deviatesFromNCCN(nccnStatus, pos.status); });
            });
        }
        if (therapies.length === 0) return;
        html += `<div class="cmp-segment"><div class="cmp-segment-header"><span class="cmp-biomarker">${esc(segment.setting)}</span></div><div class="cmp-table-wrapper"><table class="cmp-table"><thead><tr><th class="cmp-agent-col">Agent</th><th class="cmp-brand-col">Brand</th><th class="cmp-nccn-col">NCCN</th>${institutions.map(i => {
            const v = INSTITUTION_VERIFICATION[i.id]; const vClass = v ? ` cmp-hdr-${v.level}` : ""; const vTitle = v ? `${i.fullName} — ${v.level.toUpperCase()}` : i.fullName;
            return `<th class="cmp-inst-col${vClass}" title="${esc(vTitle)}">${esc(i.name)}${v && v.level === "inferred" ? '<span class="cmp-unverified-dot">*</span>' : ""}</th>`;
        }).join("")}</tr></thead><tbody>${therapies.map(t => {
            const nccnPos = t.positions.nccn || { status: "unknown", note: "" }; const isElrexfio = t.brand === "Elrexfio";
            return `<tr class="${isElrexfio ? "cmp-highlight-row" : ""}"><td class="cmp-agent-cell"><span class="cmp-agent-name">${esc(t.agent)}</span><span class="cmp-mfr">${esc(t.manufacturer)}</span></td><td class="cmp-brand-cell">${esc(t.brand)}</td><td class="cmp-nccn-cell" title="${esc(nccnPos.note)}">${statusIcon(nccnPos.status)}</td>${institutions.map(inst => {
                const pos = t.positions[inst.id] || { status: "unknown", note: "" }; const devClass = deviatesFromNCCN(nccnPos.status, pos.status) ? " cmp-deviation" : ""; const v = INSTITUTION_VERIFICATION[inst.id]; const inferredClass = (v && v.level === "inferred") ? " cmp-inferred" : "";
                return `<td class="cmp-inst-cell${devClass}${inferredClass}" title="${esc(inst.fullName)}: ${esc(pos.note)}">${statusIcon(pos.status)}</td>`;
            }).join("")}</tr>`;
        }).join("")}</tbody></table></div></div>`;
    });
    if (!html) html = '<p class="no-results">No deviations found for the selected filters.</p>';
    const legend = `<div class="cmp-legend"><span class="cmp-legend-item">${statusIcon("preferred")} Preferred</span><span class="cmp-legend-item">${statusIcon("recommended")} Recommended</span><span class="cmp-legend-item">${statusIcon("listed")} Listed</span><span class="cmp-legend-item">${statusIcon("restricted")} Restricted</span><span class="cmp-legend-item">${statusIcon("not listed")} Not Listed</span><span class="cmp-legend-item">${statusIcon("unknown")} Unknown</span><span class="cmp-legend-item"><span class="cmp-deviation-marker-inline">Orange</span> = Deviates from NCCN</span></div>`;
    container.innerHTML = legend + html;
}

function exportCSV() {
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const headers = ["Setting", "Agent", "Brand", "Manufacturer", "NCCN"];
    institutions.forEach(i => headers.push(i.name));
    const rows = [headers.join(",")];
    THERAPY_PREFERENCES.forEach(segment => {
        segment.therapies.forEach(t => {
            const nccnPos = t.positions.nccn || { status: "unknown" };
            const cols = [`"${segment.setting}"`, `"${t.agent}"`, `"${t.brand}"`, `"${t.manufacturer}"`, nccnPos.status];
            institutions.forEach(inst => { const pos = t.positions[inst.id] || { status: "unknown" }; cols.push(pos.status); });
            rows.push(cols.join(","));
        });
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mm_pathway_comparison_elrexfio.csv"; a.click();
    URL.revokeObjectURL(url);
}

function renderSpotlightOverview() {
    const container = document.getElementById("spotlight-overview-content");
    if (!container) return;
    const s = ELREXFIO_SPOTLIGHT;
    container.innerHTML = `
        <div class="inst-header-card">
            <div class="inst-meta" style="margin-bottom:1rem;">
                <span class="pathway-badge type-payer" style="font-size:1rem;padding:0.4rem 1rem;">BCMA × CD3 Bispecific</span>
                <span class="pathway-badge proprietary" style="font-size:1rem;padding:0.4rem 1rem;">Accelerated Approval</span>
            </div>
            <table class="biomarker-table" style="margin-bottom:1.5rem;">
                <tbody>
                    <tr><td><strong>Brand Name</strong></td><td>${esc(s.brandName)}</td></tr>
                    <tr><td><strong>Generic Name</strong></td><td>${esc(s.genericName)}</td></tr>
                    <tr><td><strong>Manufacturer</strong></td><td>${esc(s.manufacturer)}</td></tr>
                    <tr><td><strong>Target / Mechanism</strong></td><td>${esc(s.target)} — ${esc(s.mechanismOfAction)}</td></tr>
                    <tr><td><strong>FDA Approval</strong></td><td>${esc(s.approvalDate)}</td></tr>
                    <tr><td><strong>Indication</strong></td><td>${esc(s.indication)}</td></tr>
                    <tr><td><strong>Administration</strong></td><td>${esc(s.administration)}</td></tr>
                    <tr><td><strong>NCCN Category</strong></td><td>${esc(s.nccnCategory)}</td></tr>
                    <tr><td><strong>Pivotal Data</strong></td><td>${esc(s.pivotalTrial)}</td></tr>
                </tbody>
            </table>
        </div>`;
}

function renderSpotlightCompetitive() {
    const container = document.getElementById("spotlight-competitive-content");
    if (!container) return;
    const s = ELREXFIO_SPOTLIGHT;
    container.innerHTML = `<table class="cmp-table" style="margin-bottom:1.5rem;"><thead><tr><th>Competitor</th><th>Manufacturer</th><th>Target</th><th>NCCN</th><th>Approval</th><th>Key Data</th><th>Admin</th></tr></thead><tbody>
        <tr style="background:rgba(37,99,235,0.06);font-weight:500;"><td><strong>Elrexfio (elranatamab)</strong></td><td>Pfizer</td><td>BCMA×CD3</td><td>${esc(s.nccnCategory)}</td><td>${esc(s.approvalDate)}</td><td>${esc(s.pivotalTrial)}</td><td>${esc(s.administration)}</td></tr>
        ${s.competitors.map(c => `<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.manufacturer)}</td><td>${esc(c.target)}</td><td>${esc(c.nccn)}</td><td>${esc(c.approval)}</td><td>${esc(c.keyData)}</td><td>${esc(c.administration)}</td></tr>`).join("")}
    </tbody></table>`;
}

function renderSpotlightHeatmap() {
    const container = document.getElementById("spotlight-heatmap-content");
    if (!container) return;
    const bcmaSettings = THERAPY_PREFERENCES.filter(s => s.settingKey === "3l-tce" || s.settingKey === "bcma-4l" || s.settingKey === "2nd-relapse");
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const focusAgents = ["Elrexfio", "Tecvayli", "Talvey", "Carvykti", "Abecma"];
    let html = "";
    bcmaSettings.forEach(segment => {
        const relevantTherapies = segment.therapies.filter(t => focusAgents.some(f => t.brand.includes(f)));
        if (relevantTherapies.length === 0) return;
        html += `<div class="cmp-segment"><div class="cmp-segment-header"><span class="cmp-biomarker">${esc(segment.setting)}</span></div><div class="cmp-table-wrapper"><table class="cmp-table"><thead><tr><th class="cmp-agent-col">Therapy</th><th class="cmp-nccn-col">NCCN</th>${institutions.map(i => `<th class="cmp-inst-col">${esc(i.name)}</th>`).join("")}</tr></thead><tbody>${relevantTherapies.map(t => {
            const nccnPos = t.positions.nccn || { status: "unknown", note: "" }; const isElrexfio = t.brand === "Elrexfio";
            return `<tr class="${isElrexfio ? "cmp-highlight-row" : ""}"><td class="cmp-agent-cell"><strong>${esc(t.brand)}</strong><br><span class="cmp-mfr">${esc(t.manufacturer)}</span></td><td class="cmp-nccn-cell" title="${esc(nccnPos.note)}">${statusIcon(nccnPos.status)}</td>${institutions.map(inst => {
                const pos = t.positions[inst.id] || { status: "unknown", note: "" }; const devClass = deviatesFromNCCN(nccnPos.status, pos.status) ? " cmp-deviation" : "";
                return `<td class="cmp-inst-cell${devClass}" title="${esc(inst.fullName)}: ${esc(pos.note)}">${statusIcon(pos.status)}</td>`;
            }).join("")}</tr>`;
        }).join("")}</tbody></table></div></div>`;
    });
    const legend = `<div class="cmp-legend" style="margin-bottom:1rem;"><span class="cmp-legend-item">${statusIcon("preferred")} Preferred</span><span class="cmp-legend-item">${statusIcon("recommended")} Recommended</span><span class="cmp-legend-item">${statusIcon("listed")} Listed</span><span class="cmp-legend-item">${statusIcon("restricted")} Restricted</span><span class="cmp-legend-item"><span class="cmp-deviation-marker-inline">Orange</span> = Deviates from NCCN</span></div>`;
    container.innerHTML = legend + html;
}

function renderSpotlightBarriers() {
    const container = document.getElementById("spotlight-barriers-content");
    if (!container) return;
    const s = ELREXFIO_SPOTLIGHT;
    let html = `<h3 style="color:var(--danger);margin-bottom:1rem;">Pathway Barriers</h3><div class="pathway-programs-grid">`;
    s.pathwayBarriers.forEach(b => {
        html += `<div class="pathway-program-card" style="border-left:4px solid ${b.impact === 'high' ? 'var(--danger)' : 'var(--warning,#f59e0b)'};">
            <div class="pathway-card-header"><h3>${esc(b.barrier)}</h3><span class="pathway-badge ${b.impact === 'high' ? 'proprietary' : 'semi-public'}">${esc(b.impact.toUpperCase())} IMPACT</span></div>
            <p class="pathway-desc">${esc(b.description)}</p>
            <div class="pathway-meta"><strong>Affected Programs:</strong> ${b.affectedPrograms.map(p => `<span class="therapy-tag">${esc(p)}</span>`).join(" ")}</div>
        </div>`;
    });
    html += `</div><h3 style="color:var(--success);margin:2rem 0 1rem;">Pathway Opportunities</h3><div class="pathway-programs-grid">`;
    s.pathwayOpportunities.forEach(o => {
        html += `<div class="pathway-program-card" style="border-left:4px solid var(--success);">
            <div class="pathway-card-header"><h3>${esc(o.opportunity)}</h3></div>
            <p class="pathway-desc">${esc(o.description)}</p>
            <div class="pathway-meta"><strong>Relevant Programs:</strong> ${o.relevantPrograms.map(p => `<span class="therapy-tag">${esc(p)}</span>`).join(" ")}</div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function renderSpotlightPipeline() {
    const container = document.getElementById("spotlight-pipeline-content");
    if (!container) return;
    const s = ELREXFIO_SPOTLIGHT;
    container.innerHTML = `<table class="cmp-table"><thead><tr><th>Trial</th><th>Phase</th><th>Setting</th><th>Status</th><th>Key Data / Design</th></tr></thead><tbody>${s.clinicalTrials.map(t => `<tr><td><strong>${esc(t.name)}</strong></td><td>${esc(t.phase)}</td><td>${esc(t.line)}</td><td><span class="pathway-badge ${t.status.includes("Published") ? "public" : "semi-public"}">${esc(t.status)}</span></td><td>${esc(t.result)}</td></tr>`).join("")}</tbody></table>`;
}

function renderSpotlightInsights() {
    const container = document.getElementById("spotlight-insights-content");
    if (!container) return;
    const s = ELREXFIO_SPOTLIGHT.deviationSummary;
    const total = s.totalInstitutions;
    container.innerHTML = `
        <div class="inst-summary" style="margin-bottom:2rem;">
            <div class="pathway-stat-card"><div class="pathway-stat-number">${total}</div><div class="pathway-stat-label">Institutions Tracked</div></div>
            <div class="pathway-stat-card"><div class="pathway-stat-number stat-deviation" style="color:var(--danger);">${s.restrictedCount}</div><div class="pathway-stat-label">Restricted (${Math.round(s.restrictedCount/total*100)}%)</div></div>
            <div class="pathway-stat-card"><div class="pathway-stat-number" style="color:var(--warning,#f59e0b);">${s.listedWithConditions}</div><div class="pathway-stat-label">Listed w/ Conditions (${Math.round(s.listedWithConditions/total*100)}%)</div></div>
            <div class="pathway-stat-card"><div class="pathway-stat-number" style="color:var(--primary);">${s.recommendedCount}</div><div class="pathway-stat-label">Recommended (${Math.round(s.recommendedCount/total*100)}%)</div></div>
            <div class="pathway-stat-card"><div class="pathway-stat-number stat-deviation" style="color:var(--danger);">${s.preferredCount}</div><div class="pathway-stat-label">Preferred</div></div>
        </div>
        <div class="card" style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);padding:1.5rem;margin-bottom:1.5rem;">
            <h3 style="color:var(--danger);margin-bottom:0.75rem;">Key Insight: Pathway Positioning Is a Commercial Headwind</h3>
            <p style="line-height:1.7;">${esc(s.keyInsight)}</p>
        </div>
        <div class="card" style="padding:1.5rem;">
            <h3 style="margin-bottom:1rem;">Elrexfio vs Carvykti — Pathway Positioning Comparison</h3>
            <table class="biomarker-table">
                <thead><tr><th>Metric</th><th>Elrexfio (elranatamab)</th><th>Carvykti (cilta-cel)</th></tr></thead>
                <tbody>
                    <tr><td><strong>NCCN Category</strong></td><td>Recommended (Cat 2A)</td><td style="color:var(--success);font-weight:600;">Preferred (Cat 1)</td></tr>
                    <tr><td><strong>Preferred Status (of 12)</strong></td><td style="color:var(--danger);font-weight:600;">0 pathways</td><td style="color:var(--success);font-weight:600;">9+ pathways</td></tr>
                    <tr><td><strong>Restricted Status (of 12)</strong></td><td style="color:var(--danger);font-weight:600;">3 pathways (25%)</td><td>0 pathways</td></tr>
                    <tr><td><strong>Step-Through Barrier</strong></td><td style="color:var(--danger);">Subject to CAR-T step-through</td><td style="color:var(--success);">No step-through (is the step-through target)</td></tr>
                    <tr><td><strong>Administration Setting</strong></td><td>Community + Academic (SC)</td><td>Academic/Certified Centres only</td></tr>
                    <tr><td><strong>Time to Treatment</strong></td><td style="color:var(--success);">Immediate (off-the-shelf)</td><td>4-6 weeks (manufacturing)</td></tr>
                    <tr><td><strong>Approval Timeline</strong></td><td>August 2023</td><td>February 2022 (18-month head start)</td></tr>
                </tbody>
            </table>
        </div>`;
}

function renderAppendix() {
    const container = document.getElementById("mm-appendix-content");
    if (!container) return;
    let html = `<div class="appendix-intro"><p>This appendix documents sourcing methodology for pathway programs tracked in this module.</p><div class="appendix-legend"><strong>Verification:</strong> <span class="appendix-confidence appendix-confidence-high">Verified</span> Direct public data <span class="appendix-confidence appendix-confidence-medium">Published</span> Official pages/literature <span class="appendix-confidence appendix-confidence-low">Inferred</span> Estimated positions</div></div>`;
    PATHWAY_PROGRAMS.forEach(prog => {
        const v = INSTITUTION_VERIFICATION[prog.id]; if (!v) return;
        const cls = v.level === "verified" ? "high" : v.level === "published" ? "medium" : "low";
        html += `<div class="appendix-entry"><div class="appendix-entry-header"><h4>${esc(prog.name)}</h4><span class="appendix-confidence appendix-confidence-${cls}">${esc(v.level)}</span></div><div class="appendix-org">${esc(prog.organization)}</div><div class="appendix-field"><strong>Source:</strong> ${esc(v.source)}</div><div class="appendix-field"><strong>Data:</strong> ${esc(prog.dataAvailability)}</div></div>`;
    });
    container.innerHTML = html;
}

function toggleAppendix() {
    const modal = document.getElementById("mm-appendix-modal");
    if (!modal) return;
    if (modal.classList.contains("open")) { modal.classList.remove("open"); document.body.style.overflow = ""; }
    else { modal.classList.add("open"); document.body.style.overflow = "hidden"; renderAppendix(); }
}

// ── Event Listeners & Init ──────────────────────────────────────────

document.getElementById("mm-appendix-open-btn").addEventListener("click", toggleAppendix);
document.getElementById("mm-appendix-close-btn").addEventListener("click", toggleAppendix);
document.getElementById("mm-appendix-modal").addEventListener("click", (e) => { if (e.target.id === "mm-appendix-modal") toggleAppendix(); });

document.getElementById("mm-pathway-search").addEventListener("input", () => {
    renderPrograms({ search: document.getElementById("mm-pathway-search").value, type: document.getElementById("mm-pathway-type-filter").value });
});
document.getElementById("mm-pathway-type-filter").addEventListener("change", () => {
    renderPrograms({ search: document.getElementById("mm-pathway-search").value, type: document.getElementById("mm-pathway-type-filter").value });
});
document.getElementById("mm-pathway-reset-filters").addEventListener("click", () => {
    document.getElementById("mm-pathway-search").value = ""; document.getElementById("mm-pathway-type-filter").value = ""; renderPrograms();
});

document.getElementById("mm-line-filter").addEventListener("change", renderComparisonMatrix);
document.getElementById("mm-deviation-toggle").addEventListener("change", renderComparisonMatrix);
document.getElementById("mm-cmp-reset-filters").addEventListener("click", () => {
    document.getElementById("mm-line-filter").value = ""; document.getElementById("mm-deviation-toggle").checked = false; renderComparisonMatrix();
});
document.getElementById("mm-cmp-export-csv").addEventListener("click", exportCSV);

// Initial render
renderStats();
renderPrograms();
renderNCCNReference();
renderDrugClassGrid();
initTabs();
renderNCCNAlgorithm();
renderComparisonMatrix();
renderSpotlightOverview();
renderSpotlightCompetitive();
renderSpotlightHeatmap();
renderSpotlightBarriers();
renderSpotlightPipeline();
renderSpotlightInsights();
