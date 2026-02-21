/**
 * HTA Assessment Finder — Frontend Application
 *
 * Three modules:
 *   1. Global Secondary Resources: Country-level directory of official HTA/regulatory/reimbursement links
 *   2. Analogue Selection:  Filter EMA medicines by therapeutic area, orphan status, approval date, etc.
 *   3. HTA & Reimbursement [WIP]: Search medicine → View EMA indications → Select country → View assessments
 */

// ── Global Secondary Resources — country data ─────────────────────────

const GLOBAL_RESOURCES = [
  {
    code: "AT", name: "Austria", flag: "🇦🇹", region: "Europe",
    links: [
      { category: "Regulatory", label: "BASG / AGES Medizinmarktaufsicht", url: "https://www.basg.gv.at", desc: "Federal Office for Safety in Healthcare — Austrian medicines regulatory authority" },
      { category: "Pricing & Reimbursement", label: "Hauptverband — Erstattungskodex (EKO)", url: "https://www.sozialversicherung.at/cdscontent/?contentid=10007.772802", desc: "Austrian pharmaceutical reimbursement list managed by the social insurance federation" },
    ]
  },
  {
    code: "AU", name: "Australia", flag: "🇦🇺", region: "Asia-Pacific",
    links: [
      { category: "Regulatory", label: "TGA — Therapeutic Goods Administration", url: "https://www.tga.gov.au", desc: "Australian regulatory authority for therapeutic goods" },
      { category: "HTA", label: "PBAC — Pharmaceutical Benefits Advisory Committee", url: "https://www.pbs.gov.au/pbs/industry/listing/participants/pbac", desc: "Recommends medicines for inclusion on the Pharmaceutical Benefits Scheme" },
      { category: "Database", label: "PBS — Pharmaceutical Benefits Scheme", url: "https://www.pbs.gov.au", desc: "Australian government subsidy scheme for medicines — full PBS schedule" },
    ]
  },
  {
    code: "BE", name: "Belgium", flag: "🇧🇪", region: "Europe",
    links: [
      { category: "Regulatory", label: "FAMHP (AFMPS/FAGG)", url: "https://www.famhp.be", desc: "Federal Agency for Medicines and Health Products — Belgian regulatory authority" },
      { category: "HTA", label: "KCE — Belgian Health Care Knowledge Centre", url: "https://kce.fgov.be", desc: "Independent HTA research and clinical guidelines" },
      { category: "Pricing & Reimbursement", label: "NIHDI/INAMI — Drug Reimbursement", url: "https://www.inami.fgov.be", desc: "National Institute for Health and Disability Insurance — reimbursement decisions" },
    ]
  },
  {
    code: "BR", name: "Brazil", flag: "🇧🇷", region: "Americas",
    links: [
      { category: "Regulatory", label: "ANVISA", url: "https://www.gov.br/anvisa", desc: "Brazilian health regulatory agency — drug registration and pharmacovigilance" },
      { category: "HTA", label: "CONITEC — Comissão Nacional de I&A em Tecnologias de Saúde", url: "https://www.gov.br/conitec", desc: "National HTA committee for SUS (public health system) reimbursement decisions" },
    ]
  },
  {
    code: "CA", name: "Canada", flag: "🇨🇦", region: "Americas",
    links: [
      { category: "Regulatory", label: "Health Canada — Drug Products", url: "https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products.html", desc: "Drug authorization, notices of compliance, and Drug Product Database (DPD)" },
      { category: "HTA", label: "CADTH — Reimbursement Reviews", url: "https://www.cadth.ca/reimbursement-reviews", desc: "Pan-Canadian HTA — drug reimbursement recommendations for public drug plans" },
      { category: "Database", label: "Drug Product Database (DPD)", url: "https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products/drug-product-database.html", desc: "Health Canada's searchable database of authorized drug products" },
    ]
  },
  {
    code: "CN", name: "China", flag: "🇨🇳", region: "Asia-Pacific",
    links: [
      { category: "Regulatory", label: "NMPA — National Medical Products Administration", url: "https://www.nmpa.gov.cn", desc: "Drug registration, oversight and pharmacovigilance in China (formerly CFDA)" },
      { category: "Pricing & Reimbursement", label: "NHSA — National Healthcare Security Administration", url: "http://www.nhsa.gov.cn", desc: "Manages the National Reimbursement Drug List (NRDL) and price negotiations" },
    ]
  },
  {
    code: "CZ", name: "Czech Republic", flag: "🇨🇿", region: "Europe",
    links: [
      { category: "Regulatory", label: "SÚKL — State Institute for Drug Control", url: "https://www.sukl.cz", desc: "Czech regulatory authority — also handles reimbursement and pricing decisions" },
    ]
  },
  {
    code: "DE", name: "Germany", flag: "🇩🇪", region: "Europe",
    links: [
      { category: "Regulatory", label: "BfArM — Federal Institute for Drugs and Medical Devices", url: "https://www.bfarm.de", desc: "German national regulatory authority for medicines" },
      { category: "HTA", label: "G-BA — Frühe Nutzenbewertung (AMNOG)", url: "https://www.g-ba.de/themen/arzneimittel/arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/", desc: "Early benefit assessment decisions — Zusatznutzen (added benefit) ratings" },
      { category: "HTA", label: "IQWiG — Institute for Quality and Efficiency in Health Care", url: "https://www.iqwig.de", desc: "Conducts evidence reports and dossier assessments for G-BA" },
      { category: "Pricing & Reimbursement", label: "GKV-Spitzenverband", url: "https://www.gkv-spitzenverband.de", desc: "National Association of Statutory Health Insurance Funds — negotiates rebate contracts" },
    ]
  },
  {
    code: "DK", name: "Denmark", flag: "🇩🇰", region: "Europe",
    links: [
      { category: "Regulatory", label: "DKMA — Lægemiddelstyrelsen", url: "https://laegemiddelstyrelsen.dk", desc: "Danish Medicines Agency — regulatory authority" },
      { category: "HTA", label: "Medicinrådet (Medicine Council)", url: "https://medicinraadet.dk", desc: "Independent council issuing reimbursement recommendations for Danish regions" },
      { category: "Database", label: "Medicin.dk", url: "https://www.medicin.dk", desc: "Danish medicines information database" },
    ]
  },
  {
    code: "ES", name: "Spain", flag: "🇪🇸", region: "Europe",
    links: [
      { category: "Regulatory", label: "AEMPS — Agencia Española de Medicamentos", url: "https://www.aemps.gob.es", desc: "Spanish Agency for Medicines and Medical Devices — regulatory authority" },
      { category: "HTA", label: "AEMPS — IPT (Informe de Posicionamiento Terapéutico)", url: "https://www.aemps.gob.es/medicamentosUsoHumano/informesPublicos/home.htm", desc: "Therapeutic positioning reports — comparative effectiveness and place in therapy" },
      { category: "Pricing & Reimbursement", label: "CIPM / Ministerio de Sanidad", url: "https://www.sanidad.gob.es/profesionales/farmacia/home.htm", desc: "Interministerial Commission on Drug Prices — pricing and SNS reimbursement decisions" },
    ]
  },
  {
    code: "FI", name: "Finland", flag: "🇫🇮", region: "Europe",
    links: [
      { category: "Regulatory", label: "Fimea — Finnish Medicines Agency", url: "https://www.fimea.fi", desc: "National regulatory authority — also conducts relative effectiveness assessments" },
      { category: "Pricing & Reimbursement", label: "HILA — Pharmaceuticals Pricing Board", url: "https://www.hila.fi", desc: "Decides on reimbursement status and wholesale prices of medicines in Finland" },
    ]
  },
  {
    code: "FR", name: "France", flag: "🇫🇷", region: "Europe",
    links: [
      { category: "Regulatory", label: "ANSM — Agence Nationale de Sécurité du Médicament", url: "https://ansm.sante.fr", desc: "National Agency for Medicines and Health Products Safety — marketing authorisation & safety" },
      { category: "HTA", label: "HAS — Commission de la Transparence", url: "https://www.has-sante.fr/jcms/c_411115/fr/la-commission-de-la-transparence", desc: "Issues SMR (clinical benefit) and ASMR (added benefit vs. comparators) opinions" },
      { category: "Pricing & Reimbursement", label: "CEPS — Comité Économique des Produits de Santé", url: "https://www.economie.gouv.fr/ceps", desc: "Economic Committee for Health Products — negotiates medicine prices with manufacturers" },
      { category: "Database", label: "BDPM — Base de Données Publique des Médicaments", url: "https://base-donnees-publique.medicaments.gouv.fr", desc: "Public medicines database — SPCs, patient leaflets, and HAS transparency decisions" },
    ]
  },
  {
    code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe",
    links: [
      { category: "Regulatory", label: "MHRA — Medicines and Healthcare products Regulatory Agency", url: "https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency", desc: "UK medicines and medical devices regulatory authority" },
      { category: "HTA", label: "NICE — Technology Appraisals & HST", url: "https://www.nice.org.uk/about/what-we-do/our-programmes/nice-guidance/nice-technology-appraisal-guidance", desc: "Technology Appraisal (TA) and Highly Specialised Technologies (HST) guidance for England" },
      { category: "HTA", label: "SMC — Scottish Medicines Consortium", url: "https://www.scottishmedicines.org.uk", desc: "Reimbursement recommendations for NHS Scotland" },
      { category: "HTA", label: "AWMSG — All Wales Medicines Strategy Group", url: "https://awmsg.nhs.wales", desc: "Guidance on use of medicines for NHS Wales" },
      { category: "Database", label: "NHS BSA — Drug Tariff", url: "https://www.nhsbsa.nhs.uk/pharmacies-gp-practices-and-appliance-contractors/drug-tariff", desc: "NHS drug tariff — reimbursement prices for community pharmacies" },
    ]
  },
  {
    code: "GR", name: "Greece", flag: "🇬🇷", region: "Europe",
    links: [
      { category: "Regulatory", label: "EOF — National Organization for Medicines", url: "https://www.eof.gr", desc: "Greek regulatory authority for medicines — also manages the positive list" },
      { category: "Pricing & Reimbursement", label: "EOPYY — National Organisation for Healthcare Services Provision", url: "https://www.eopyy.gov.gr", desc: "Manages drug reimbursement decisions and the positive reimbursement list" },
    ]
  },
  {
    code: "HU", name: "Hungary", flag: "🇭🇺", region: "Europe",
    links: [
      { category: "Regulatory", label: "OGYÉI — National Institute of Pharmacy and Nutrition", url: "https://www.ogyei.gov.hu", desc: "Hungarian regulatory authority for medicines" },
      { category: "Pricing & Reimbursement", label: "NEAK — National Health Insurance Fund", url: "https://www.neak.gov.hu", desc: "Manages health insurance and drug reimbursement decisions" },
    ]
  },
  {
    code: "IE", name: "Ireland", flag: "🇮🇪", region: "Europe",
    links: [
      { category: "Regulatory", label: "HPRA — Health Products Regulatory Authority", url: "https://www.hpra.ie", desc: "Irish regulatory authority for medicines and medical devices" },
      { category: "HTA", label: "NCPE — National Centre for Pharmacoeconomics", url: "https://www.ncpe.ie", desc: "Pharmacoeconomic assessments to inform HSE reimbursement decisions" },
      { category: "HTA", label: "HIQA — Health Information and Quality Authority", url: "https://www.hiqa.ie", desc: "Conducts HTA for health technologies in the Irish public system" },
    ]
  },
  {
    code: "IL", name: "Israel", flag: "🇮🇱", region: "Middle East",
    links: [
      { category: "Regulatory", label: "MOH — Israel Ministry of Health", url: "https://www.health.gov.il", desc: "Drug registration, licensing, and the Israeli National Medicine Basket updates" },
    ]
  },
  {
    code: "IN", name: "India", flag: "🇮🇳", region: "Asia-Pacific",
    links: [
      { category: "Regulatory", label: "CDSCO — Central Drugs Standard Control Organisation", url: "https://cdsco.gov.in", desc: "Indian national regulatory body for pharmaceuticals and medical devices" },
      { category: "HTA", label: "HTAIn — Health Technology Assessment India", url: "https://htain.icmr.org.in", desc: "National HTA programme established under ICMR for informing coverage decisions" },
    ]
  },
  {
    code: "IT", name: "Italy", flag: "🇮🇹", region: "Europe",
    links: [
      { category: "Regulatory", label: "AIFA — Agenzia Italiana del Farmaco", url: "https://www.aifa.gov.it", desc: "Italian Medicines Agency — regulatory authority, HTA, and reimbursement decisions" },
      { category: "HTA", label: "AIFA — CTS / CPR Decisions (Determinazioni)", url: "https://www.aifa.gov.it/determinazioni", desc: "Technical Scientific Committee and Price & Reimbursement Committee formal decisions" },
      { category: "Database", label: "AIFA — Elenco Farmaci Rimborsabili", url: "https://www.aifa.gov.it/elenco-farmaci", desc: "National formulary — Class A (reimbursed), H (hospital), and C (non-reimbursed) lists" },
    ]
  },
  {
    code: "JP", name: "Japan", flag: "🇯🇵", region: "Asia-Pacific",
    links: [
      { category: "Regulatory", label: "PMDA — Pharmaceuticals and Medical Devices Agency", url: "https://www.pmda.go.jp/english/index.html", desc: "Reviews and approves drugs and medical devices for the Japanese market" },
      { category: "HTA", label: "MHLW — Chuikyo NHI Price Decisions", url: "https://www.mhlw.go.jp/stf/shingi/shingi-chuo_128154.html", desc: "Central Social Insurance Medical Council — NHI listing and cost-effectiveness decisions" },
      { category: "Database", label: "PMDA — Approved Drug Information", url: "https://www.pmda.go.jp/english/review-services/reviews/approved-information/drugs/0001.html", desc: "PMDA database of approved medical products with review reports" },
    ]
  },
  {
    code: "KR", name: "South Korea", flag: "🇰🇷", region: "Asia-Pacific",
    links: [
      { category: "Regulatory", label: "MFDS — Ministry of Food and Drug Safety", url: "https://www.mfds.go.kr/eng/index.do", desc: "Korean drug and medical device regulatory authority" },
      { category: "HTA", label: "HIRA — Health Insurance Review and Assessment Service", url: "https://www.hira.or.kr/eng/index.do", desc: "Assesses drugs for NHI coverage and manages pharmaceutical reimbursement prices" },
    ]
  },
  {
    code: "NL", name: "Netherlands", flag: "🇳🇱", region: "Europe",
    links: [
      { category: "Regulatory", label: "CBG-MEB — Medicines Evaluation Board", url: "https://www.cbg-meb.nl", desc: "Dutch national medicines authorisation authority" },
      { category: "HTA", label: "ZIN — Zorginstituut Nederland", url: "https://www.zorginstituutnederland.nl/geneesmiddelen", desc: "National Health Care Institute — package decisions and GVS list management" },
      { category: "Database", label: "GVS — Geneesmiddelenvergoedingssysteem", url: "https://www.zorginstituutnederland.nl/verzekerd-zijn/geneesmiddelen", desc: "Drug reimbursement system — list of reimbursed medicines and reference prices" },
    ]
  },
  {
    code: "NO", name: "Norway", flag: "🇳🇴", region: "Europe",
    links: [
      { category: "Regulatory", label: "NoMA — Norwegian Medicines Agency", url: "https://legemiddelverket.no/english", desc: "Regulatory authority — also conducts full HTA assessments for hospital medicines" },
      { category: "HTA", label: "NoMA — HTA Decisions", url: "https://legemiddelverket.no/english/market-authorisation/hta", desc: "Single technology assessments informing hospital formulary inclusion decisions" },
      { category: "Pricing & Reimbursement", label: "Blå resept (Blue Prescription) Scheme", url: "https://legemiddelverket.no/blaa-resept-og-pris/blaa-resept", desc: "Norwegian outpatient drug reimbursement scheme" },
    ]
  },
  {
    code: "PL", name: "Poland", flag: "🇵🇱", region: "Europe",
    links: [
      { category: "Regulatory", label: "URPL — Office for Registration of Medicinal Products", url: "https://www.urpl.gov.pl", desc: "Polish regulatory authority for medicines, medical devices and biocidal products" },
      { category: "HTA", label: "AOTMiT — Agency for HTA and Tariff Systems", url: "https://www.aotmit.gov.pl", desc: "Conducts HTA assessments and issues reimbursement recommendations to the Ministry" },
    ]
  },
  {
    code: "PT", name: "Portugal", flag: "🇵🇹", region: "Europe",
    links: [
      { category: "Regulatory", label: "INFARMED — National Authority of Medicines", url: "https://www.infarmed.pt", desc: "Portuguese regulatory body — also responsible for HTA and reimbursement" },
      { category: "Database", label: "INFOMED — Portuguese Medicines Database", url: "https://infomed.infarmed.pt", desc: "Searchable database of authorised medicines in Portugal" },
    ]
  },
  {
    code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East",
    links: [
      { category: "Regulatory", label: "SFDA — Saudi Food and Drug Authority", url: "https://www.sfda.gov.sa", desc: "Saudi regulatory authority for drugs, food and medical devices" },
      { category: "HTA", label: "SFDA — HTA Unit", url: "https://www.sfda.gov.sa/ar/drug/regulatoryaffairs/Pages/HTA.aspx", desc: "Health technology assessment unit supporting coverage decisions within the Kingdom" },
    ]
  },
  {
    code: "SE", name: "Sweden", flag: "🇸🇪", region: "Europe",
    links: [
      { category: "Regulatory", label: "MPA — Läkemedelsverket (Medical Products Agency)", url: "https://www.lakemedelsverket.se", desc: "Swedish national regulatory authority for medicines" },
      { category: "HTA", label: "TLV — Tandvårds- och läkemedelsförmånsverket", url: "https://www.tlv.se", desc: "Dental and Pharmaceutical Benefits Agency — reimbursement decisions and reference prices" },
      { category: "Database", label: "Fass.se", url: "https://www.fass.se", desc: "Swedish medicines information database — product information and labelling" },
    ]
  },
  {
    code: "CH", name: "Switzerland", flag: "🇨🇭", region: "Europe",
    links: [
      { category: "Regulatory", label: "Swissmedic", url: "https://www.swissmedic.ch", desc: "Swiss authorisation and supervisory authority for therapeutic products" },
      { category: "Pricing & Reimbursement", label: "BAG/OFSP — Spezialitätenliste (SL)", url: "https://www.bag.admin.ch/bag/de/home/versicherungen/krankenversicherung/krankenversicherung-leistungen-tarife/Arzneimittel/spezialitaetenliste.html", desc: "Federal list of reimbursed medicines under OKP/LAMal mandatory health insurance" },
    ]
  },
  {
    code: "TR", name: "Turkey", flag: "🇹🇷", region: "Europe",
    links: [
      { category: "Regulatory", label: "TITCK — Turkish Medicines and Medical Devices Agency", url: "https://www.titck.gov.tr", desc: "Turkish regulatory authority — drug registration, pricing and reimbursement decisions" },
    ]
  },
  {
    code: "TW", name: "Taiwan", flag: "🇹🇼", region: "Asia-Pacific",
    links: [
      { category: "Regulatory", label: "TFDA — Taiwan Food and Drug Administration", url: "https://www.fda.gov.tw", desc: "Taiwanese regulatory authority for medicines and health products" },
      { category: "Pricing & Reimbursement", label: "NHIA — National Health Insurance Administration", url: "https://www.nhi.gov.tw", desc: "NHI drug reimbursement, pricing, and pharmaceutical benefit schedule" },
    ]
  },
  {
    code: "US", name: "United States", flag: "🇺🇸", region: "Americas",
    links: [
      { category: "Regulatory", label: "FDA — Center for Drug Evaluation and Research (CDER)", url: "https://www.fda.gov/drugs", desc: "US drug regulatory authority — NDA/BLA approvals, Orange Book, Purple Book" },
      { category: "HTA", label: "ICER — Institute for Clinical and Economic Review", url: "https://icer.org", desc: "Independent non-profit conducting value-based price assessments (not government-mandated)" },
      { category: "Pricing & Reimbursement", label: "CMS — Medicare Drug Spending Data", url: "https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-provider-charge-data/drugs-and-biologicals", desc: "Medicare and Medicaid drug spending reports and Part D formulary information" },
      { category: "Database", label: "DailyMed (NLM / NIH)", url: "https://dailymed.nlm.nih.gov", desc: "FDA-approved drug labelling and prescribing information" },
      { category: "Database", label: "FDA Orange Book", url: "https://www.accessdata.fda.gov/scripts/cder/ob/", desc: "Approved drug products with therapeutic equivalence evaluations" },
    ]
  },
  {
    code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Africa",
    links: [
      { category: "Regulatory", label: "SAHPRA — South African Health Products Regulatory Authority", url: "https://www.sahpra.org.za", desc: "South African regulatory authority for medicines, medical devices and related products" },
    ]
  },
];

// ── State ────────────────────────────────────────────────────────────

let selectedMedicine = null;
let selectedIndication = null; // currently selected indication text (null = all)
let countries = [];
let analogueFiltersLoaded = false;
let activeCountryCode = null;  // currently selected country in secondary resources

// ── DOM Elements — Module navigation ─────────────────────────────────

const moduleTabs = document.querySelectorAll(".module-tab");

// ── DOM Elements — Secondary Resources Module ─────────────────────────

const secondaryFilter = document.getElementById("secondary-filter");
const secondaryCountryGrid = document.getElementById("secondary-country-grid");
const secondaryCountryCount = document.getElementById("secondary-country-count");
const secondaryDetailCard = document.getElementById("secondary-detail-card");
const secondaryCountryDetail = document.getElementById("secondary-country-detail");

// ── DOM Elements — HTA Module ────────────────────────────────────────

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchStatus = document.getElementById("search-status");
const searchResults = document.getElementById("search-results");

const medicineSection = document.getElementById("medicine-section");
const medicineDetails = document.getElementById("medicine-details");

const assessmentSection = document.getElementById("assessment-section");
const countrySelect = document.getElementById("country-select");
const findAssessmentsBtn = document.getElementById("find-assessments-btn");
const assessmentStatus = document.getElementById("assessment-status");
const assessmentResults = document.getElementById("assessment-results");

// ── DOM Elements — Analogue Module ───────────────────────────────────

const filterArea = document.getElementById("filter-area");
const filterOrphan = document.getElementById("filter-orphan");
const filterYears = document.getElementById("filter-years");
const filterFirst = document.getElementById("filter-first");
const filterStatus = document.getElementById("filter-status");
const filterSubstance = document.getElementById("filter-substance");
const filterExclGenerics = document.getElementById("filter-excl-generics");
const filterExclBiosimilars = document.getElementById("filter-excl-biosimilars");
const filterPrevalence = document.getElementById("filter-prevalence");
const filterIndication = document.getElementById("filter-indication");
const filterATC = document.getElementById("filter-atc");
const filterMAH = document.getElementById("filter-mah");
const filterNewSubstance = document.getElementById("filter-new-substance");
const filterConditional = document.getElementById("filter-conditional");
const filterExceptional = document.getElementById("filter-exceptional");
const filterAccelerated = document.getElementById("filter-accelerated");
const filterMonitoring = document.getElementById("filter-monitoring");
const analogueSearchBtn = document.getElementById("analogue-search-btn");
const analogueResetBtn = document.getElementById("analogue-reset-btn");
const analogueStatus = document.getElementById("analogue-status");
const analogueResultsDiv = document.getElementById("analogue-results");

// ═══════════════════════════════════════════════════════════════════════
//  MODULE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════

moduleTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.module;

        // Update tab active state
        moduleTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // Show target module, hide all others
        document.querySelectorAll(".module-content").forEach(m => m.classList.add("hidden"));
        document.getElementById("module-" + target).classList.remove("hidden");

        // Lazy-load analogue filters on first switch
        if (target === "analogues" && !analogueFiltersLoaded) {
            loadAnalogueFilters();
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════
//  MODULE 1: GLOBAL SECONDARY RESOURCES
// ═══════════════════════════════════════════════════════════════════════

function initSecondaryResources() {
    renderCountryGrid(GLOBAL_RESOURCES);

    secondaryFilter.addEventListener("input", () => {
        const query = secondaryFilter.value.trim().toLowerCase();
        const filtered = GLOBAL_RESOURCES.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.region.toLowerCase().includes(query) ||
            c.code.toLowerCase().includes(query)
        );
        renderCountryGrid(filtered);
        // Clear detail if active country filtered out
        if (activeCountryCode && !filtered.find(c => c.code === activeCountryCode)) {
            secondaryDetailCard.classList.add("hidden");
            activeCountryCode = null;
        }
    });
}

function renderCountryGrid(list) {
    secondaryCountryCount.textContent =
        `${list.length} ${list.length === 1 ? "country" : "countries"}`;

    if (list.length === 0) {
        secondaryCountryGrid.innerHTML = '<div class="no-results">No countries match your search.</div>';
        return;
    }

    secondaryCountryGrid.innerHTML = list.map(c => `
        <div class="country-card${activeCountryCode === c.code ? " active" : ""}" data-code="${esc(c.code)}">
            <div class="country-flag">${c.flag}</div>
            <div class="country-card-name">${esc(c.name)}</div>
            <div class="country-card-region">${esc(c.region)}</div>
        </div>
    `).join("");

    secondaryCountryGrid.querySelectorAll(".country-card").forEach(card => {
        card.addEventListener("click", () => {
            const code = card.dataset.code;
            const country = GLOBAL_RESOURCES.find(c => c.code === code);
            if (country) selectSecondaryCountry(country);
        });
    });
}

function selectSecondaryCountry(country) {
    activeCountryCode = country.code;

    // Update active state on all visible cards
    secondaryCountryGrid.querySelectorAll(".country-card").forEach(card => {
        card.classList.toggle("active", card.dataset.code === country.code);
    });

    // Build grouped links by category
    const categoryOrder = ["Regulatory", "HTA", "Pricing & Reimbursement", "Pricing", "Reimbursement", "Database"];
    const groups = {};
    country.links.forEach(link => {
        if (!groups[link.category]) groups[link.category] = [];
        groups[link.category].push(link);
    });
    const sortedCats = Object.keys(groups).sort((a, b) => {
        const ai = categoryOrder.indexOf(a);
        const bi = categoryOrder.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    secondaryCountryDetail.innerHTML = `
        <div class="secondary-detail-header">
            <span class="secondary-detail-flag">${country.flag}</span>
            <span class="secondary-detail-name">${esc(country.name)}</span>
        </div>
        <div class="secondary-link-categories">
            ${sortedCats.map(cat => `
                <div class="secondary-link-category ${catBorderClass(cat)}">
                    <div class="secondary-link-category-title">${esc(cat)}</div>
                    <div class="secondary-link-list">
                        ${groups[cat].map(link => `
                            <div class="secondary-link-item">
                                <div>
                                    <a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)}</a>
                                </div>
                                ${link.desc ? `<div class="secondary-link-desc">${esc(link.desc)}</div>` : ""}
                            </div>
                        `).join("")}
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    secondaryDetailCard.classList.remove("hidden");
    secondaryDetailCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function catBorderClass(category) {
    const c = category.toLowerCase();
    if (c.includes("hta")) return "cat-border-hta";
    if (c.includes("reimbursement") || c.includes("pricing")) return "cat-border-reimbursement";
    if (c.includes("database")) return "cat-border-database";
    return "cat-border-regulatory";
}

// ═══════════════════════════════════════════════════════════════════════
//  MODULE 3: HTA & REIMBURSEMENT
// ═══════════════════════════════════════════════════════════════════════

// ── Init ─────────────────────────────────────────────────────────────

async function init() {
    try {
        const resp = await fetch("/api/countries");
        countries = await resp.json();
        countrySelect.innerHTML = countries
            .map(c => `<option value="${c.code}">${c.name} (${c.agency})</option>`)
            .join("");
    } catch {
        countrySelect.innerHTML = '<option value="FR">France (HAS)</option>';
    }
}

init();
initSecondaryResources();

// ── Search ───────────────────────────────────────────────────────────

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") doSearch();
});

async function doSearch() {
    const query = searchInput.value.trim();
    if (query.length < 2) {
        showStatus(searchStatus, "Please enter at least 2 characters.", "info");
        return;
    }

    showStatus(searchStatus, "Searching EMA database...", "loading");
    searchResults.classList.add("hidden");
    medicineSection.classList.add("hidden");
    assessmentSection.classList.add("hidden");
    selectedMedicine = null;
    selectedIndication = null;

    try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${resp.status})`);
        }
        const medicines = await resp.json();
        renderSearchResults(medicines);
    } catch (err) {
        showStatus(searchStatus, `Error: ${err.message}`, "error");
    }
}

function renderSearchResults(medicines) {
    if (medicines.length === 0) {
        showStatus(searchStatus, "No medicines found. Try a different name or substance.", "info");
        searchResults.classList.add("hidden");
        return;
    }

    hideStatus(searchStatus);
    searchResults.classList.remove("hidden");

    searchResults.innerHTML = medicines
        .map((med, i) => `
            <div class="result-item" data-index="${i}">
                <div class="med-name">${esc(med.name)}</div>
                <div class="med-substance">${esc(med.active_substance)}</div>
                ${med.authorisation_status
                    ? `<span class="med-status">${esc(med.authorisation_status)}</span>`
                    : ""}
            </div>
        `)
        .join("");

    // Store medicines for click handling
    searchResults._medicines = medicines;

    searchResults.querySelectorAll(".result-item").forEach(item => {
        item.addEventListener("click", () => {
            const idx = parseInt(item.dataset.index);
            selectMedicine(searchResults._medicines[idx], item);
        });
    });
}

function selectMedicine(medicine, element) {
    // Highlight selected
    searchResults.querySelectorAll(".result-item").forEach(el => el.classList.remove("selected"));
    element.classList.add("selected");

    selectedMedicine = medicine;
    renderMedicineDetails(medicine);
}

// ── Medicine details ─────────────────────────────────────────────────

function renderMedicineDetails(med) {
    medicineSection.classList.remove("hidden");
    assessmentSection.classList.remove("hidden");
    assessmentResults.classList.add("hidden");
    hideStatus(assessmentStatus);

    const indicationText = med.therapeutic_indication || "";
    const indications = splitIndications(indicationText, med.name);
    selectedIndication = null;

    let indicationsHTML;
    if (indications.length <= 1) {
        // Single indication — show as plain text, no selection needed
        indicationsHTML = `<div class="indication-text">${esc(indicationText || "No indication text available.")}</div>`;
    } else {
        // Multiple indications — show as selectable cards
        indicationsHTML = `
            <p class="indication-prompt">Select an indication to filter HTA assessments, or search all:</p>
            <div class="indication-list">
                <div class="indication-item indication-all selected" data-index="-1">
                    <span class="indication-label">All indications</span>
                </div>
                ${indications.map((ind, i) => `
                    <div class="indication-item" data-index="${i}">
                        <span class="indication-number">${i + 1}</span>
                        <span class="indication-label">${esc(ind)}</span>
                    </div>
                `).join("")}
            </div>
        `;
    }

    medicineDetails.innerHTML = `
        <div class="medicine-header">
            <div>
                <div class="name">${esc(med.name)}</div>
                <div class="substance">${esc(med.active_substance)}</div>
            </div>
            ${med.ema_number ? `<span class="med-status">${esc(med.ema_number)}</span>` : ""}
        </div>
        ${indicationsHTML}
    `;

    // Bind indication selection if multiple
    if (indications.length > 1) {
        medicineDetails._indications = indications;
        medicineDetails.querySelectorAll(".indication-item").forEach(item => {
            item.addEventListener("click", () => {
                medicineDetails.querySelectorAll(".indication-item").forEach(el => el.classList.remove("selected"));
                item.classList.add("selected");
                const idx = parseInt(item.dataset.index);
                selectedIndication = idx === -1 ? null : indications[idx];
            });
        });
    }

    // Scroll to medicine section
    medicineSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Split a therapeutic indication text block into individual indications.
 *
 * EMA indication text is typically a single paragraph with multiple indications
 * separated by the product name or newlines. For example:
 *   "Padcev as monotherapy is indicated for ... Padcev in combination with
 *    pembrolizumab is indicated for ..."
 */
function splitIndications(text, productName) {
    if (!text || !text.trim()) return [];

    text = text.trim();

    // 1. Try splitting on double newlines
    let parts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    // 2. Try splitting where the product name starts a new sentence after a period
    if (productName) {
        const escaped = escRegex(productName);
        // Split on ". ProductName" or ".\nProductName"
        const re = new RegExp(`\\.\\s+(?=${escaped}\\b)`, "gi");
        parts = text.split(re).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return parts;

        // 3. Try splitting on newline followed by product name
        const re2 = new RegExp(`\\n\\s*(?=${escaped}\\b)`, "gi");
        parts = text.split(re2).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return parts;
    }

    // 4. Try splitting on " - " dash items (sometimes used for sub-indications)
    parts = text.split(/\n\s*[-–]\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    // Single indication
    return [text];
}

/** Escape a string for use in a RegExp. */
function escRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Assessments ──────────────────────────────────────────────────────

findAssessmentsBtn.addEventListener("click", findAssessments);

async function findAssessments() {
    if (!selectedMedicine) {
        showStatus(assessmentStatus, "Please select a medicine first.", "info");
        return;
    }

    const countryCode = countrySelect.value;
    const substance = selectedMedicine.active_substance;
    const product = selectedMedicine.name;

    showStatus(assessmentStatus, `Searching for assessments in ${countryName(countryCode)}...`, "loading");
    assessmentResults.classList.add("hidden");

    try {
        const params = new URLSearchParams({ substance, product });
        if (selectedIndication) {
            params.set("indication", selectedIndication);
        }
        const resp = await fetch(`/api/assessments/${countryCode}?${params}`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${resp.status})`);
        }
        const data = await resp.json();
        renderAssessments(data);
    } catch (err) {
        showStatus(assessmentStatus, `Error: ${err.message}`, "error");
    }
}

function renderAssessments(data) {
    if (data.assessments.length === 0) {
        showStatus(
            assessmentStatus,
            `No assessments found for "${selectedMedicine.active_substance}" in ${data.country_name} (${data.agency}).`,
            "info"
        );
        assessmentResults.classList.add("hidden");
        return;
    }

    hideStatus(assessmentStatus);
    assessmentResults.classList.remove("hidden");

    assessmentResults.innerHTML = `
        <p style="margin-bottom:8px;color:var(--text-light);font-size:0.9rem;">
            Found <strong>${data.assessments.length}</strong> assessment(s) from
            <strong>${esc(data.agency)}</strong> (${esc(data.country_name)})
        </p>
        ${data.assessments.map(renderSingleAssessment).join("")}
    `;

    assessmentResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSingleAssessment(a) {
    // France (HAS) badges
    const smrBadge = a.smr_value
        ? `<span class="badge badge-smr ${smrClass(a.smr_value)}">
            <span class="label">SMR:</span> ${esc(a.smr_value)}
           </span>`
        : "";

    const asmrBadge = a.asmr_value
        ? `<span class="badge badge-asmr">
            <span class="label">ASMR:</span> ${esc(a.asmr_value)}
           </span>`
        : "";

    // Germany (G-BA) badges
    const benefitBadge = a.benefit_rating
        ? `<span class="badge badge-benefit ${benefitClass(a.benefit_rating)}">
            <span class="label">Zusatznutzen:</span> ${esc(a.benefit_rating)}
           </span>`
        : "";

    const evidenceBadge = a.evidence_level
        ? `<span class="badge badge-evidence">
            <span class="label">Evidence:</span> ${esc(a.evidence_level)}
           </span>`
        : "";

    const comparatorBadge = a.comparator
        ? `<span class="badge badge-comparator">
            <span class="label">vs.</span> ${esc(a.comparator)}
           </span>`
        : "";

    // UK (NICE) badges
    const niceRecBadge = a.nice_recommendation
        ? `<span class="badge badge-nice-rec ${niceRecClass(a.nice_recommendation)}">
            <span class="label">NICE:</span> ${esc(a.nice_recommendation)}
           </span>`
        : "";

    const guidanceRefBadge = a.guidance_reference
        ? `<span class="badge badge-guidance-ref">
            ${esc(a.guidance_reference)}
           </span>`
        : "";

    // Spain (AEMPS) badges
    const iptBadge = a.therapeutic_positioning
        ? `<span class="badge badge-ipt ${iptClass(a.therapeutic_positioning)}">
            <span class="label">IPT:</span> ${esc(a.therapeutic_positioning)}
           </span>`
        : "";

    const iptRefBadge = a.ipt_reference
        ? `<span class="badge badge-ipt-ref">
            ${esc(a.ipt_reference)}
           </span>`
        : "";

    // Japan (PMDA) badges
    const pmdaBadge = a.pmda_review_type
        ? `<span class="badge badge-pmda">
            <span class="label">PMDA:</span> ${esc(a.pmda_review_type)}
           </span>`
        : "";

    // Determine link text based on what's present
    const isGermany = !!a.benefit_rating;
    const isNICE = !!a.nice_recommendation || !!a.guidance_reference;
    const isSpain = !!a.therapeutic_positioning || !!a.ipt_reference;
    const isJapan = !!a.pmda_review_type;
    const linkText = isNICE ? "View on NICE"
        : isGermany ? "View on G-BA"
        : isSpain ? "View IPT on AEMPS"
        : isJapan ? "View on PMDA"
        : "View full assessment on HAS";
    const link = a.assessment_url
        ? `<a class="assessment-link" href="${esc(a.assessment_url)}" target="_blank" rel="noopener">
            ${linkText} &rarr;
           </a>`
        : "";

    // Descriptions
    const smrDesc = a.smr_description
        ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>SMR:</strong> ${esc(a.smr_description)}
           </div>`
        : "";

    const asmrDesc = a.asmr_description
        ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>ASMR:</strong> ${esc(a.asmr_description)}
           </div>`
        : "";

    const benefitDesc = a.benefit_rating_description && a.benefit_rating_description !== a.benefit_rating
        ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            ${esc(a.benefit_rating_description)}
           </div>`
        : "";

    const patientGroup = a.patient_group
        ? `<div style="font-size:0.85rem;color:var(--text);margin-bottom:8px;">
            <strong>Patient group:</strong> ${esc(a.patient_group)}
           </div>`
        : "";

    return `
        <div class="assessment-card">
            <div class="assessment-header">
                <span class="product-name">${esc(a.product_name)}</span>
                <span class="opinion-date">${esc(a.opinion_date)}</span>
            </div>
            ${a.evaluation_reason ? `<div class="reason">${esc(a.evaluation_reason)}</div>` : ""}
            ${patientGroup}
            <div class="rating-badges">
                ${smrBadge}
                ${asmrBadge}
                ${benefitBadge}
                ${evidenceBadge}
                ${comparatorBadge}
                ${niceRecBadge}
                ${guidanceRefBadge}
                ${iptBadge}
                ${iptRefBadge}
                ${pmdaBadge}
            </div>
            ${smrDesc}
            ${asmrDesc}
            ${benefitDesc}
            ${link}
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════
//  MODULE 2: ANALOGUE SELECTION
// ═══════════════════════════════════════════════════════════════════════

async function loadAnalogueFilters() {
    try {
        const resp = await fetch("/api/analogues/filters");
        if (!resp.ok) {
            showStatus(analogueStatus, "Failed to load filter options. Data may still be loading.", "error");
            return;
        }
        const data = await resp.json();

        // Populate therapeutic areas
        filterArea.innerHTML = '<option value="">All therapeutic areas</option>' +
            data.therapeutic_areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");

        // Populate statuses
        filterStatus.innerHTML = '<option value="">All statuses</option>' +
            data.statuses.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

        // Populate MAHs (companies)
        filterMAH.innerHTML = '<option value="">All companies</option>' +
            data.mahs.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("");

        // Populate ATC prefixes
        filterATC.innerHTML = '<option value="">All ATC codes</option>' +
            data.atc_prefixes.map(a => `<option value="${esc(a.code)}">${esc(a.label)}</option>`).join("");

        analogueFiltersLoaded = true;
    } catch {
        showStatus(analogueStatus, "Failed to load filter options. Please try again.", "error");
    }
}

analogueSearchBtn.addEventListener("click", searchAnalogues);
analogueResetBtn.addEventListener("click", resetAnalogueFilters);
filterSubstance.addEventListener("keydown", e => {
    if (e.key === "Enter") searchAnalogues();
});
filterIndication.addEventListener("keydown", e => {
    if (e.key === "Enter") searchAnalogues();
});

async function searchAnalogues() {
    const params = new URLSearchParams();

    // Disease & Epidemiology
    if (filterArea.value) params.set("therapeutic_area", filterArea.value);
    if (filterPrevalence.value) params.set("prevalence_category", filterPrevalence.value);
    if (filterOrphan.value) params.set("orphan", filterOrphan.value);
    if (filterIndication.value.trim()) params.set("indication_keyword", filterIndication.value.trim());
    // Product Classification
    if (filterATC.value) params.set("atc_code", filterATC.value);
    if (filterSubstance.value.trim()) params.set("substance", filterSubstance.value.trim());
    if (filterMAH.value) params.set("mah", filterMAH.value);
    if (filterNewSubstance.value) params.set("new_active_substance", filterNewSubstance.value);
    // Regulatory Pathway
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (filterYears.value !== "0") params.set("years", filterYears.value);
    if (filterFirst.value) params.set("first_approval", filterFirst.value);
    if (filterConditional.value) params.set("conditional_approval", filterConditional.value);
    if (filterExceptional.value) params.set("exceptional_circumstances", filterExceptional.value);
    if (filterAccelerated.value) params.set("accelerated_assessment", filterAccelerated.value);
    if (filterMonitoring.value) params.set("additional_monitoring", filterMonitoring.value);
    // Exclusions
    if (filterExclGenerics.checked) params.set("exclude_generics", "true");
    if (filterExclBiosimilars.checked) params.set("exclude_biosimilars", "true");

    showStatus(analogueStatus, "Searching for analogues...", "loading");
    analogueResultsDiv.innerHTML = "";

    try {
        const resp = await fetch(`/api/analogues/search?${params}`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${resp.status})`);
        }
        const data = await resp.json();
        renderAnalogueResults(data);
    } catch (err) {
        showStatus(analogueStatus, `Error: ${err.message}`, "error");
    }
}

function resetAnalogueFilters() {
    // Disease & Epidemiology
    filterArea.value = "";
    filterPrevalence.value = "";
    filterOrphan.value = "";
    filterIndication.value = "";
    // Product Classification
    filterATC.value = "";
    filterSubstance.value = "";
    filterMAH.value = "";
    filterNewSubstance.value = "";
    // Regulatory Pathway
    filterStatus.value = "";
    filterYears.value = "0";
    filterFirst.value = "";
    filterConditional.value = "";
    filterExceptional.value = "";
    filterAccelerated.value = "";
    filterMonitoring.value = "";
    // Exclusions
    filterExclGenerics.checked = false;
    filterExclBiosimilars.checked = false;
    hideStatus(analogueStatus);
    analogueResultsDiv.innerHTML = "";
}

function renderAnalogueResults(data) {
    if (data.total === 0) {
        showStatus(analogueStatus, "No medicines found matching your criteria. Try adjusting the filters.", "info");
        analogueResultsDiv.innerHTML = "";
        return;
    }

    hideStatus(analogueStatus);

    const header = `
        <p class="results-summary">
            Found <strong>${data.total}</strong> medicine(s) matching your criteria
        </p>
    `;

    const table = `
        <div class="analogue-table-wrapper">
        <table class="analogue-table">
            <thead>
                <tr>
                    <th>Medicine</th>
                    <th>Active Substance</th>
                    <th>MAH</th>
                    <th>Therapeutic Area</th>
                    <th>Auth. Date</th>
                    <th>Prevalence</th>
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody>
                ${data.results.map(renderAnalogueRow).join("")}
            </tbody>
        </table>
        </div>
    `;

    analogueResultsDiv.innerHTML = header + table;
}

function renderAnalogueRow(med) {
    const tags = [];
    if (med.orphan_medicine) tags.push('<span class="tag tag-orphan">Orphan</span>');
    if (med.first_approval) tags.push('<span class="tag tag-first">1st Approval</span>');
    if (med.new_active_substance) tags.push('<span class="tag tag-new-substance">New Substance</span>');
    if (med.conditional_approval) tags.push('<span class="tag tag-conditional">Conditional</span>');
    if (med.accelerated_assessment) tags.push('<span class="tag tag-accelerated">Accelerated</span>');
    if (med.exceptional_circumstances) tags.push('<span class="tag tag-exceptional">Exceptional</span>');
    if (med.additional_monitoring) tags.push('<span class="tag tag-monitoring">Black Triangle</span>');
    if (med.generic) tags.push('<span class="tag tag-generic">Generic</span>');
    if (med.biosimilar) tags.push('<span class="tag tag-biosimilar">Biosimilar</span>');

    const nameCell = med.url
        ? `<a href="${esc(med.url)}" target="_blank" rel="noopener">${esc(med.name)}</a>`
        : esc(med.name);

    const prevalenceTag = med.prevalence_category
        ? `<span class="tag tag-prevalence-${med.prevalence_category}">${esc(med.prevalence_category)}</span>`
        : "";

    return `
        <tr>
            <td class="col-name">${nameCell}</td>
            <td>${esc(med.active_substance)}</td>
            <td class="col-mah">${esc(med.marketing_authorisation_holder)}</td>
            <td class="col-area">${esc(med.therapeutic_area)}</td>
            <td class="col-date">${esc(med.authorisation_date)}</td>
            <td>${prevalenceTag}</td>
            <td class="col-tags">${tags.join(" ")}</td>
        </tr>
    `;
}

// ═══════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════

function smrClass(value) {
    const v = value.toLowerCase();
    if (v.includes("insuffisant")) return "insufficient";
    if (v.includes("faible")) return "low";
    if (v.includes("modéré") || v.includes("modere")) return "moderate";
    return ""; // defaults to green (important)
}

function benefitClass(value) {
    const v = value.toLowerCase();
    if (v.includes("geringerer")) return "lesser";
    if (v.includes("kein") || v.includes("nicht belegt")) return "none";
    if (v.includes("nicht quantifizierbar")) return "non-quantifiable";
    if (v.includes("gering")) return "minor";
    if (v.includes("beträchtlich") || v.includes("betrachtlich")) return "considerable";
    if (v.includes("erheblich")) return ""; // defaults to green (major)
    return "";
}

function niceRecClass(value) {
    const v = value.toLowerCase();
    if (v.includes("not recommended")) return "not-recommended";
    if (v.includes("only in research")) return "research-only";
    if (v.includes("terminated")) return "terminated";
    if (v.includes("restrictions") || v.includes("optimised")) return "optimised";
    if (v.includes("recommended")) return "recommended";
    return "";
}

function iptClass(value) {
    const v = value.toLowerCase();
    if (v.includes("unfavorable") || v.includes("desfavorable") || v.includes("no favorable")) return "unfavorable";
    if (v.includes("conditions") || v.includes("condicionado")) return "conditional";
    if (v.includes("favorable")) return "favorable";
    if (v.includes("pending") || v.includes("pendiente")) return "pending";
    return "";
}

function countryName(code) {
    const c = countries.find(c => c.code === code);
    return c ? `${c.name} (${c.agency})` : code;
}

function showStatus(el, message, type) {
    el.textContent = message;
    el.className = `status-msg ${type}`;
    el.classList.remove("hidden");
}

function hideStatus(el) {
    el.classList.add("hidden");
}

function esc(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
