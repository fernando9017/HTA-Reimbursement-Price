/**
 * Global Secondary Resources module — Frontend logic.
 *
 * Renders a filterable grid of country flag cards. Clicking a country
 * expands a detail panel with links and notes for marketing authorisation,
 * reimbursement, pricing, and additional resources.
 *
 * Depends on shared.js for: esc
 */

// ── EMA Centralized Procedure link (injected for all EU/EEA countries) ──

const EMA_LINK = {
    label: "EMA — Centralised Procedure",
    url: "https://www.ema.europa.eu/en/human-regulatory-overview/marketing-authorisation/centralised-procedure",
};

// ── Region mapping (country code → region) ──────────────────────────────

const REGION_MAP = {
    // Europe
    DZ: "Africa",      AR: "Americas",    AU: "Asia-Pacific",
    AT: "Europe",      BE: "Europe",      BR: "Americas",
    BG: "Europe",      CA: "Americas",    CL: "Americas",
    CN: "Asia-Pacific", CO: "Americas",   HR: "Europe",
    CY: "Europe",      CZ: "Europe",     DK: "Europe",
    EG: "Africa",      EE: "Europe",     FI: "Europe",
    FR: "Europe",      DE: "Europe",     GR: "Europe",
    HK: "Asia-Pacific", HU: "Europe",    IS: "Europe",
    ID: "Asia-Pacific", IE: "Europe",    IL: "Middle East",
    IT: "Europe",      JP: "Asia-Pacific", LV: "Europe",
    LB: "Middle East", LT: "Europe",     LU: "Europe",
    MT: "Europe",      MX: "Americas",   ME: "Europe",
    NL: "Europe",      NO: "Europe",     OM: "Middle East",
    PE: "Americas",    PH: "Asia-Pacific", PL: "Europe",
    PT: "Europe",      PR: "Americas",   QA: "Middle East",
    RO: "Europe",      RU: "Europe",     SA: "Middle East",
    SG: "Asia-Pacific", SK: "Europe",    SI: "Europe",
    KR: "Asia-Pacific", ES: "Europe",    SE: "Europe",
    CH: "Europe",      TH: "Asia-Pacific", TW: "Asia-Pacific",
    TR: "Europe",      AE: "Middle East", GB: "Europe",
    VN: "Asia-Pacific", GT: "Americas",  IN: "Asia-Pacific",
    JO: "Middle East", KZ: "Asia-Pacific", KW: "Middle East",
    MY: "Asia-Pacific", MA: "Africa",    NZ: "Asia-Pacific",
    NG: "Africa",      PK: "Asia-Pacific", ZA: "Africa",
    UA: "Europe",      BD: "Asia-Pacific", CR: "Americas",
    EC: "Americas",    KE: "Africa",     RS: "Europe",
};

// Ordered list of regions for display
const REGION_ORDER = ["Americas", "Europe", "Asia-Pacific", "Middle East", "Africa"];

// ── Worked Example Priority List ─────────────────────────────────────
// Countries are enhanced in batches of 10 with detailed drugExample
// timelines showing the full market access journey for a real drug.
//
// Data sourcing methodology:
//   - Regulatory approvals: EMA EPAR, national agency databases (SÚKL, COFEPRIS,
//     TFDA, BPOM, etc.), press releases, and regulatory news sources
//   - HTA assessments: National HTA body publications (HITAP, ACE, IETS, CDE Taiwan),
//     ISPOR conference abstracts, published cost-effectiveness analyses
//   - Reimbursement decisions: National reimbursement list databases (NRDL, NHI, NLEM,
//     Fornas, CNAS, EOPYY, SGK SUT), government gazette announcements
//   - Pricing: SISMED (Colombia), NHSA (China), public procurement portals (CompraNet,
//     e-Katalog, NUPCO), published market reports
//   - Timelines cross-referenced against EMA EPAR milestones, WHO/WIPO/WTO reports,
//     and published academic literature on market access timelines
//   - All dates and decisions verified against at least 2 independent sources where possible
//
// Batch 1 (done): DE (Orserdu), JP (Keytruda) — original examples
// Batch 2 (done): GB, FR, IT, ES, CA, AU, BR, KR, NL, BE — Bavencio (avelumab) mUC
// Batch 3 (done): SE, CH, PL, AT, IE, DK, NO, FI, PT, HU — Bavencio (avelumab) mUC
// Batch 4 (done): CZ, RO, GR, IL, MX, TW, SG, TH, AR, CL — Keytruda (pembrolizumab)
// Batch 5 (done): HK, TR, SA, AE, EG, CO, CN, ID, PH, VN — Keytruda (pembrolizumab)
// Batch 6 (in progress): DZ (Truvada/TENOF EM), LB, PE, QA, OM, RU, HR, BG, SK, SI
// Batch 7:        EE, LV, LT, LU, MT, CY, IS, ME, PR, KR(update)
// (WIP countries deferred until primary data is complete)

// ── Country data (alphabetical) ───────────────────────────────────────
// ema: true  → country is an EU/EEA member; EMA link is auto-appended
//              to the Market Authorization section when rendering.

const COUNTRIES = [
    {
        code: "DZ",
        name: "Algeria",
        flag: "🇩🇿",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The ANPP (Agence Nationale des Produits Pharmaceutiques), established in 2018 under the MIPH (Ministry of Pharmaceutical Industry), handles marketing authorizations. Price agreement with the CEPS is required before MA is granted. The Nomenclature Nationale (updated December 2024, listing ~4,865 medicines) is the official register of all approved pharmaceutical products with registration numbers, dosages, prices, and reimbursement status. The DGPP (Direction Générale de la Pharmacie et des Produits) publishes the nomenclature as a downloadable Excel file.",
                links: [
                    { label: "ANPP (National Agency for Pharmaceutical Products)", url: "https://anpp.dz/en/" },
                    { label: "ANPP — Medical Information & Downloads", url: "https://anpp.dz/en/medical-information/" },
                    { label: "DGPP — Nomenclature Nationale (Dec 2024, Excel)", url: "https://dgpp.industrie.gov.dz/fr/wp-content/uploads/2025/02/DECEMBRE-2024.xlsx" },
                    { label: "MIPH — Nomenclature Nationale (all versions)", url: "https://www.miph.gov.dz/fr/nomenclature-nationale-des-produits-pharmaceutiques/" },
                    { label: "MIPH — List of Registered Medicines", url: "https://www.miph.gov.dz/fr/liste-des-medicaments-enregistres-en-algerie/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "The CEPS (Comité Économique Intersectoriel des Médicaments), housed within the ANPP, sets drug prices. In-patent medicines are priced using External Reference Pricing (ERP) based on the lowest ex-factory price from 8 reference countries (Belgium, France, Greece, Morocco, Spain, Tunisia, Turkey, UK) plus the country of origin. Generic prices use Internal Reference Pricing (IRP) and must be lower than the originator. Biosimilar prices must be 10–30% below the reference biologic depending on the price tier. Hospital-only products (e.g. antiretrovirals, oncology drugs) are procured centrally by the PCH (Pharmacie Centrale des Hôpitaux) and distributed free to patients through public hospitals.",
                links: [
                    { label: "DGPP (Direction Générale de la Pharmacie)", url: "https://dgpp.industrie.gov.dz/fr/" },
                    { label: "MIPH (Ministry of Pharmaceutical Industry)", url: "https://www.miph.gov.dz/fr/" },
                    { label: "MIPH — Regulatory Downloads", url: "https://www.miph.gov.dz/fr/telechargements/" },
                    { label: "PCH (Pharmacie Centrale des Hôpitaux)", url: "https://www.pch.dz/" },
                    { label: "JORADP (Official Gazette — pricing decisions)", url: "https://www.joradp.dz/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Algeria is a predominantly reimbursed market. CNAS (Caisse Nationale des Assurances Sociales des Travailleurs Salariés) covers employed workers, CASNOS covers self-employed persons, and CNR covers retirees — together covering ~85% of the population via the El Chifa electronic card. Reimbursement is 100% for chronic disease medicines (including HIV/AIDS) and 80% for others (20% co-payment). A Tarif de Référence (reference tariff) aligned with the cheapest generic determines the reimbursement basis. The Reimbursement Committee under the Ministry of Labour decides formulary listing, relying heavily on international HTA evidence, especially France's HAS (SMR/ASMR opinions).",
                links: [
                    { label: "CNAS (National Social Insurance Fund)", url: "https://cnas.dz/en/the-presentation-of-cnas/" },
                    { label: "MTESS (Ministry of Labour & Social Security)", url: "https://www.mtess.gov.dz/en/" },
                    { label: "WHO — Algeria Reimbursable Medicines List 2023", url: "https://www.who.int/publications/m/item/algeria--la-liste-des-m-dicaments-remboursables-par-la-s-curit--sociale-2023-(french)" },
                    { label: "WHO — Algeria Essential Medicines & Country Lists", url: "https://www.who.int/teams/health-product-policy-and-standards/medicines-selection-ip-and-affordability/country-lists/dza" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Ministry of Health", url: "https://www.sante.gov.dz/" },
                    { label: "PharmNet-DZ — Algerian Drug Encyclopedia (4,696+ medicines)", url: "https://pharmnet-dz.com/alphabet.aspx" },
                    { label: "PharmNet-DZ — Search by INN (DCI)", url: "https://pharmnet-dz.com/dci.aspx" },
                    { label: "MEDALgérie — Medicines & Medical Devices Platform", url: "https://www.medal-dz.com/" },
                    { label: "Yashfine — Medicine Finder (Algeria)", url: "https://yashfine.com/en/findamedicine2" },
                    { label: "CLEISS — Social Security System Overview", url: "https://www.cleiss.fr/docs/regimes/regime_algerie_salaries.html" },
                    { label: "Pricing & Reimbursement in Algeria, Morocco, Tunisia (PMC, 2023)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10443953/" },
                    { label: "Open Data — Nomenclature des Médicaments (GitHub, SQL/JSON/XML)", url: "https://github.com/mahmoudBens/Nomenclature-des-medicaments-en-algerie" },
                    { label: "Open Data — DZ-Pharma-Data (4,800+ drugs, JSON)", url: "https://github.com/fennecinspace/DZ-Pharma-Data" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization &amp; Drug Registry</h4>
<ol>
    <li>Download the <a href="https://dgpp.industrie.gov.dz/fr/wp-content/uploads/2025/02/DECEMBRE-2024.xlsx" target="_blank" rel="noopener">Nomenclature Nationale (December 2024)</a> directly as an Excel file from the DGPP &mdash; it contains every registered medicine (~4,865 products) with registration number, dosage, laboratory, price (PCSU in DA), and reimbursement status. Older versions are on the <a href="https://www.miph.gov.dz/fr/nomenclature-nationale-des-produits-pharmaceutiques/" target="_blank" rel="noopener">MIPH page</a></li>
    <li>The <a href="https://anpp.dz/en/" target="_blank" rel="noopener">ANPP</a> website provides information on registration procedures &mdash; note that price agreement with the CEPS is required <strong>before</strong> marketing authorization is granted</li>
    <li>For searchable online drug databases, try:
        <ul>
            <li><a href="https://pharmnet-dz.com/alphabet.aspx" target="_blank" rel="noopener">PharmNet-DZ</a> (4,696+ medicines across 171 pharmacological classes, 316 laboratories) &mdash; search by name or by <a href="https://pharmnet-dz.com/dci.aspx" target="_blank" rel="noopener">INN (DCI)</a></li>
            <li><a href="https://www.medal-dz.com/" target="_blank" rel="noopener">MEDALgérie</a> &mdash; medicines, medical devices, reagents, and health equipment</li>
            <li><a href="https://yashfine.com/en/findamedicine2" target="_blank" rel="noopener">Yashfine</a> &mdash; medicine finder with availability information</li>
        </ul>
    </li>
    <li>For developers/researchers: two open-data GitHub repositories provide the nomenclature data as SQL, JSON, and XML &mdash; <a href="https://github.com/mahmoudBens/Nomenclature-des-medicaments-en-algerie" target="_blank" rel="noopener">mahmoudBens/Nomenclature</a> and <a href="https://github.com/fennecinspace/DZ-Pharma-Data" target="_blank" rel="noopener">fennecinspace/DZ-Pharma-Data</a> (4,800+ drugs)</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> All regulatory documents are in French (with Arabic versions). Search in French for best results &mdash; key terms: &ldquo;nomenclature des médicaments,&rdquo; &ldquo;tarif de référence,&rdquo; &ldquo;liste des médicaments remboursables.&rdquo;</p>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>Algeria uses <strong>External Reference Pricing (ERP)</strong> for in-patent medicines &mdash; the ex-factory price is set at the <strong>lowest</strong> price among 8 reference countries: Belgium, France, Greece, Morocco, Spain, Tunisia, Turkey, and the UK, plus the country of origin</li>
    <li><strong>Generic prices</strong> use Internal Reference Pricing (IRP) and must be lower than the originator. <strong>Biosimilar prices</strong> must be 10&ndash;30% below the reference biologic (depending on the price tier)</li>
    <li>Hospital-only products (antiretrovirals, oncology drugs, etc.) are procured centrally by the <a href="https://www.pch.dz/" target="_blank" rel="noopener">PCH (Pharmacie Centrale des Hôpitaux)</a> via tendering and distributed <strong>free</strong> to patients through public hospitals &mdash; these products show &ldquo;00 DA&rdquo; in the nomenclature (no retail price)</li>
    <li>Pricing decisions are published in the <a href="https://www.joradp.dz/" target="_blank" rel="noopener">JORADP (Journal Officiel)</a> &mdash; use third-party search tools like <a href="https://joradp.org/" target="_blank" rel="noopener">joradp.org</a> to search by keyword</li>
    <li>The <a href="https://www.miph.gov.dz/fr/telechargements/" target="_blank" rel="noopener">MIPH downloads page</a> has key regulatory texts including the December 2020 ministerial order that established the current CEPS pricing procedure</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> For a peer-reviewed overview of Algeria&rsquo;s pricing methodology, see <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10443953/" target="_blank" rel="noopener">Pharmaceutical pricing and reimbursement policies in Algeria, Morocco, and Tunisia (PMC, 2023)</a>.</p>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li>The official reimbursable medicines list is published by the Ministry of Labour (MTESS) &mdash; the <a href="https://www.who.int/publications/m/item/algeria--la-liste-des-m-dicaments-remboursables-par-la-s-curit--sociale-2023-(french)" target="_blank" rel="noopener">WHO hosts the 2023 version</a>. See also <a href="https://www.who.int/teams/health-product-policy-and-standards/medicines-selection-ip-and-affordability/country-lists/dza" target="_blank" rel="noopener">WHO&rsquo;s Algeria country page</a> for national Essential Medicines List</li>
    <li>Social security coverage: <strong>CNAS</strong> (employed workers via El Chifa card, ~80% of medicine cost), <strong>CASNOS</strong> (self-employed), <strong>CNR</strong> (retirees), <strong>CNAC</strong> (unemployed)</li>
    <li>Reimbursement rates: <strong>100%</strong> for chronic/NCD medicines (including HIV/AIDS, cancer), <strong>80%</strong> for all others (20% co-payment)</li>
    <li>The <strong>Tarif de Référence</strong> aligns brand-name drug reimbursement with the cheapest generic on the market &mdash; published in the JORADP 3 months before implementation</li>
    <li>The Reimbursement Committee relies heavily on international HTA evidence, especially <strong>France&rsquo;s HAS</strong> (SMR/ASMR opinions), as Algeria has no formal HTA body</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Algeria has no formal HTA agency. A sub-directorate of economic evaluation exists within the MIPH, and the 2020 ministerial order introduced a role for pharmacoeconomic studies in pricing, but systematic HTA is still in early development. For innovative medicines, access is mainly influenced by reimbursement listing and, for hospital products, by PCH procurement.</p>
        `,
        drugExample: {
            drug: "Truvada / TENOF EM",
            inn: "emtricitabine / tenofovir disoproxil fumarate",
            indication: "HIV-1 infection (treatment and pre-exposure prophylaxis); Algeria provides free antiretroviral treatment to all eligible patients since 1998",
            steps: [
                {
                    title: "ANPP Registration",
                    date: "2017",
                    detail: 'TENOF EM (emtricitabine 200 mg / tenofovir disoproxil fumarate 300 mg, film-coated tablets, flask of 30) was registered in Algeria under registration number 524/13P481/17 by Hetero Labs Limited (India). Algeria does not require EMA or FDA approval as a prerequisite — it has its own national registration pathway through the ANPP. Generic versions of antiretrovirals are preferred to ensure affordability. A separate tenofovir-only product (TENOF 300 mg, registration 524/13P483/17) was also registered by the same manufacturer.',
                    links: [
                        { label: "ANPP — Official Website", url: "https://anpp.dz/en/" },
                        { label: "PharmNet-DZ — TENOF EM listing", url: "https://pharmnet-dz.com/m-6090-tenof-em-200-mg-300mg--equivalent-%C3%A0-245-mg-de-tenofovir-disoproxil-cp-pell-fl-de-30" },
                    ],
                },
                {
                    title: "Pricing — Hospital Channel (PCH)",
                    date: "2017–present",
                    detail: 'TENOF EM is classified as a hospital-only product and does not carry a public retail price (listed as "00 DA" in the Nomenclature Nationale). Instead, it is procured centrally by the <strong>PCH (Pharmacie Centrale des Hôpitaux)</strong> through competitive tendering from generic manufacturers, primarily Indian suppliers. The PCH distributes antiretrovirals to public hospitals and treatment centres at no cost to patients. Algeria\'s antiretroviral procurement benefits from access to the <strong>Medicines Patent Pool (MPP)</strong> — in 2022, Algeria was added to the ViiV Healthcare/MPP licence for dolutegravir (DTG), enabling procurement of the fixed-dose combination TLD (tenofovir + lamivudine + dolutegravir) at reduced prices, expected to lower the national ART bill by ~20%.',
                    links: [
                        { label: "PCH (Pharmacie Centrale des Hôpitaux)", url: "https://www.pch.dz/" },
                        { label: "Medicines Patent Pool — Algeria DTG Licence", url: "https://medicinespatentpool.org/news-publications-post/algeria-gains-access-to-mpp-dtg-adult-licence" },
                    ],
                },
                {
                    title: "Reimbursement & Patient Access",
                    date: "Ongoing",
                    detail: 'TENOF EM is listed as <strong>reimbursable</strong> in the Nomenclature Nationale. In practice, HIV treatment in Algeria is provided <strong>free of charge</strong> through the public health system — the government has offered free antiretroviral therapy since 1998, with ~97% of funding from domestic sources. Patients access treatment at designated public hospital centres. CNAS social security also covers outpatient medicines at 100% for chronic conditions including HIV/AIDS. Algeria is transitioning from older TDF/FTC-based regimens (like TENOF EM) to <strong>DTG-based regimens</strong> (TLD — tenofovir + lamivudine + dolutegravir) which offer improved efficacy and lower cost. Soon, up to 80% of people living with HIV in Algeria will be on DTG-based first-line treatment.',
                    links: [
                        { label: "CNAS (National Social Insurance Fund)", url: "https://cnas.dz/en/the-presentation-of-cnas/" },
                        { label: "WHO — Algeria Reimbursable Medicines List", url: "https://www.who.int/publications/m/item/algeria--la-liste-des-m-dicaments-remboursables-par-la-s-curit--sociale-2023-(french)" },
                    ],
                },
            ],
            takeaway: 'Algeria illustrates a distinctive market access model for essential medicines: antiretrovirals like TENOF EM (generic Truvada) bypass standard retail pricing entirely and are procured centrally by the PCH through competitive tendering from generic manufacturers (primarily Indian). The resulting per-patient cost is a fraction of Western prices. Access to the Medicines Patent Pool licence for dolutegravir further reduces costs and is driving a transition to DTG-based regimens. While Algeria has no formal HTA agency, the ANPP registration + PCH procurement pathway enables rapid, affordable access to essential treatments — with free provision to patients funded almost entirely from domestic resources.',
        },
    },
    {
        code: "AR",
        name: "Argentina",
        flag: "🇦🇷",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "ANMAT (Administraci\u00f3n Nacional de Medicamentos, Alimentos y Tecnolog\u00eda M\u00e9dica) handles drug registration. The Vademecum Nacional de Medicamentos (VNM) is the searchable database of registered pharmaceutical products.",
                links: [
                    { label: "ANMAT \u2014 Official Website", url: "https://www.argentina.gob.ar/anmat" },
                    { label: "ANMAT \u2014 Vademecum Nacional (drug registry)", url: "https://www.argentina.gob.ar/anmat/regulados/medicamentos/vademecum" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Argentina does not have formal government price controls for most medicines. The Manual Farmac\u00e9utico (Kairos/Alfa Beta) publishes reference prices. In practice, drug prices are influenced by inflation adjustments, voluntary price agreements between the government and the pharmaceutical industry, and Obras Sociales negotiated discounts.",
                links: [
                    { label: "Kairos \u2014 Manual Farmac\u00e9utico (reference prices)", url: "https://www.kairosweb.com/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Argentina\u2019s health system is fragmented: Obras Sociales (union-based social health insurance), PAMI (retiree/pensioner insurance), and Prepagas (private insurers). The PMO (Programa M\u00e9dico Obligatorio) defines the mandatory benefits package. The SUR system manages high-cost drug reimbursement through the Superintendencia de Servicios de Salud.",
                links: [
                    { label: "Superintendencia de Servicios de Salud \u2014 SUR System", url: "https://www.argentina.gob.ar/sssalud" },
                    { label: "PAMI (retiree health insurance)", url: "https://www.pami.org.ar/" },
                    { label: "Bolet\u00edn Oficial \u2014 PMO Regulatory Updates", url: "https://www.boletinoficial.gob.ar/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Ministry of Health", url: "https://www.argentina.gob.ar/salud" },
                ],
            },
        ],
        notes: "Argentina has multiple funding institutions (Obras Sociales, PAMI, Prepagas, provincial systems). The landscape is fragmented \u2014 please contact the LATAM team for institution-specific guidance.",
        tipsHtml: `
<h4 class="tips-heading">Market Authorization</h4>
<ol>
    <li>Search the <a href="https://www.argentina.gob.ar/anmat/regulados/medicamentos/vademecum" target="_blank" rel="noopener">ANMAT Vademecum Nacional</a> by product name, active ingredient, or laboratory to confirm registration status</li>
    <li>Argentina accepts abbreviated dossiers for WHO-prequalified products and products approved by stringent regulatory authorities</li>
</ol>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>Argentina has <strong>no formal statutory price controls</strong> for most medicines &mdash; prices are influenced by voluntary industry agreements, inflation adjustments, and negotiation</li>
    <li>Reference prices are published by private sources such as <a href="https://www.kairosweb.com/" target="_blank" rel="noopener">Kairos</a> and Alfa Beta &mdash; these are widely used but are not government-regulated prices</li>
    <li>High inflation makes pricing dynamic &mdash; prices are frequently adjusted</li>
</ol>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li>The <strong>PMO</strong> (Programa M&eacute;dico Obligatorio) defines the mandatory benefits package that all Obras Sociales and Prepagas must cover</li>
    <li>High-cost medicines are reimbursed through the <strong>SUR system</strong> managed by the Superintendencia de Servicios de Salud</li>
    <li><strong>PAMI</strong> (the largest single payer, covering ~5 million retirees) has its own formulary and negotiates prices directly with manufacturers</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> All regulatory documents are in Spanish. Key terms: "vademecum," "registro sanitario," "programa m&eacute;dico obligatorio," "obras sociales."</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced or metastatic melanoma (initial indication) and multiple subsequent oncology indications",
            steps: [
                {
                    title: "ANMAT Registration",
                    date: "2016",
                    detail: 'ANMAT (Administraci\u00f3n Nacional de Medicamentos, Alimentos y Tecnolog\u00eda M\u00e9dica) approved pembrolizumab for advanced melanoma, approximately 2 years after US FDA approval. Argentina accepts dossiers referencing stringent regulatory authority approvals, which can accelerate review timelines. Subsequent indication expansions covered NSCLC, head & neck SCC, classical Hodgkin lymphoma, and urothelial carcinoma.',
                    links: [
                        { label: "ANMAT \u2014 Vademecum Nacional", url: "https://www.argentina.gob.ar/anmat/regulados/medicamentos/vademecum" },
                    ],
                },
                {
                    title: "PMO Coverage & SUR System",
                    date: "From 2016",
                    detail: 'Under Argentina\u2019s PMO (Programa M\u00e9dico Obligatorio), high-cost oncology medicines like pembrolizumab are typically channelled through the <strong>SUR system</strong> (Sistema \u00danico de Reintegraciones) managed by the Superintendencia de Servicios de Salud. Obras Sociales and Prepagas that provide pembrolizumab can seek partial reimbursement via the SUR. PAMI (covering ~5 million retirees) has its own formulary and negotiates prices directly with MSD.',
                    links: [
                        { label: "Superintendencia de Servicios de Salud", url: "https://www.argentina.gob.ar/sssalud" },
                    ],
                },
                {
                    title: "Pricing & Market Dynamics",
                    date: "Ongoing",
                    detail: 'Argentina has <strong>no formal statutory price controls</strong> for most medicines. Pembrolizumab pricing is influenced by voluntary government-industry agreements, periodic inflation adjustments, and individual payer negotiations. Reference prices are published by Kairos/Alfa Beta (private sources). High inflation makes pricing dynamic \u2014 prices are frequently adjusted. The fragmented payer landscape (Obras Sociales, PAMI, Prepagas, provincial systems) means each institution negotiates separately.',
                    links: [
                        { label: "Kairos \u2014 Manual Farmac\u00e9utico", url: "https://www.kairosweb.com/" },
                    ],
                },
            ],
            takeaway: 'Argentina illustrates a fragmented multi-payer system where access depends on which institution covers the patient: Obras Sociales (via SUR reimbursement), PAMI (direct formulary), or Prepagas (private insurance). There is no single national reimbursement decision \u2014 each payer evaluates and negotiates independently. The SUR system provides a partial safety net for high-cost drugs, but coverage and co-payment levels vary significantly across the ~300 Obras Sociales.',
        },
    },
    {
        code: "AU",
        name: "Australia",
        flag: "🇦🇺",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "ARTG (Therapeutic Goods Administration)", url: "https://www.tga.gov.au/resources/artg" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "PBAC — HTA Public Summary Documents", url: "https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings/psd/public-summary-documents-by-product" },
                    { label: "PBS Schedule (online formulary)", url: "https://www.pbs.gov.au/browse/medicine-listing" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [
                    { label: "PBS — Ex-Manufacturer Price Lists", url: "https://www.pbs.gov.au/pbs/industry/pricing/ex-manufacturer-price" },
                    { label: "PBS — Dispensed Price for Maximum Quantity", url: "https://www.pbs.gov.au/browse/medicine-listing" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "PBAC Meeting Outcomes", url: "https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings" },
                    { label: "Trikipedia — Australia", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/Australia.aspx" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Regulatory Approval (TGA)</h4>
<ol>
    <li>Search the <a href="https://www.tga.gov.au/resources/artg" target="_blank" rel="noopener">ARTG (Australian Register of Therapeutic Goods)</a> by product name or active ingredient to confirm TGA registration</li>
    <li>The ARTG entry shows: sponsor, registration date, approved indications, and product category</li>
    <li>TGA also publishes Australian Public Assessment Reports (AusPAR) for new chemical entities — search the <a href="https://www.tga.gov.au/resources/auspar" target="_blank" rel="noopener">AusPAR database</a> for the full regulatory review</li>
</ol>

<h4 class="tips-heading">PBAC Assessment &amp; PBS Listing</h4>
<p>The Pharmaceutical Benefits Advisory Committee (PBAC) evaluates medicines for listing on the PBS. PBAC meets three times per year (March, July, November).</p>
<ol>
    <li>Search <a href="https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings/psd/public-summary-documents-by-product" target="_blank" rel="noopener">Public Summary Documents (PSDs)</a> by product name — these provide detailed summaries of the clinical evidence, economic evaluation, and PBAC recommendation</li>
    <li>PBAC outcomes: <strong>Recommended</strong>, <strong>Recommended (deferred)</strong>, <strong>Not recommended</strong>, or <strong>Rejected</strong></li>
    <li>A positive PBAC recommendation does not guarantee PBS listing — price negotiations with PBPA (Pharmaceutical Benefits Pricing Authority) follow</li>
    <li>Check <a href="https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings" target="_blank" rel="noopener">PBAC meeting outcomes</a> for the most recent decisions before PSDs are published (PSDs may take several months to appear)</li>
</ol>
<p class="tips-note"><strong>Key concept:</strong> Australia uses an explicit cost-effectiveness threshold informally anchored around AUD 50,000–75,000/QALY for standard submissions. The "Rule of Rescue" and "Burden of Disease" criteria may allow higher ICERs for rare/severe conditions.</p>

<h4 class="tips-heading">PBS Formulary &amp; Pricing</h4>
<ol>
    <li>The <a href="https://www.pbs.gov.au/browse/medicine-listing" target="_blank" rel="noopener">PBS Schedule</a> is the online formulary — search by product name to find: PBS item codes, restriction levels (Unrestricted, Restricted, Authority Required), and the Dispensed Price for Maximum Quantity (DPMQ)</li>
    <li>Restrictions: "Authority Required" means the prescriber must obtain prior approval from Services Australia; "Restricted" means it is limited to specific indications listed on PBS</li>
    <li>Ex-manufacturer prices are published in downloadable spreadsheets on the <a href="https://www.pbs.gov.au/pbs/industry/pricing/ex-manufacturer-price" target="_blank" rel="noopener">PBS pricing page</a> — updated monthly</li>
    <li>For hospital-only medicines, check the Efficient Funding of Chemotherapy (EFC) and Section 100 programs</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> PBS prices are public but may include confidential rebates (Deeds of Agreement) between the manufacturer and government. The published DPMQ is the maximum price — actual acquisition costs may be lower.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "First-line maintenance treatment of locally advanced or metastatic urothelial carcinoma that has not progressed after platinum-based chemotherapy",
            steps: [
                {
                    title: "TGA Registration (ARTG)",
                    date: "2020–2021",
                    detail: 'Avelumab was registered on the ARTG (Australian Register of Therapeutic Goods) by the TGA for the UC maintenance indication. Australia participated in <strong>Project Orbis</strong> alongside the FDA, Health Canada, and Swissmedic for coordinated oncology review. The TGA approval leveraged the same JAVELIN Bladder 100 data package.',
                    links: [
                        { label: "TGA — ARTG Search", url: "https://www.tga.gov.au/resources/artg" },
                    ],
                },
                {
                    title: "PBAC Recommendation",
                    date: "March 2022",
                    detail: 'PBAC met in March 2022 and <strong>recommended</strong> avelumab for PBS listing for locally advanced (Stage III) or metastatic (Stage IV) urothelial carcinoma maintenance. The recommendation was based on the JAVELIN Bladder 100 OS benefit. A Public Summary Document (PSD) was published detailing the clinical evidence, economic evaluation (cost per QALY), and budget impact. A confidential Deed of Agreement with price concessions was part of the listing terms.',
                    links: [
                        { label: "PBS — Avelumab Public Summary Document", url: "https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings/psd/public-summary-documents-by-product" },
                    ],
                },
                {
                    title: "PBS Listing",
                    date: "1 October 2022",
                    detail: 'Avelumab was listed on the PBS effective 1 October 2022 as an <strong>Authority Required (STREAMLINED)</strong> benefit — prescribers must confirm the patient meets clinical criteria but do not need to call Services Australia. The PBS listing covers patients with locally advanced (Stage III) or metastatic (Stage IV) urothelial carcinoma whose disease has not progressed on first-line platinum-based chemotherapy. The PBS item codes include multiple vial sizes.',
                    links: [
                        { label: "PBS — Avelumab listing", url: "https://www.pbs.gov.au/medicine/item/11671g-11679q-11685b-11695m" },
                        { label: "PBS Medicine Status — Avelumab", url: "https://www.pbs.gov.au/medicinestatus/document/825.html" },
                    ],
                },
                {
                    title: "Restriction Update",
                    date: "1 April 2024",
                    detail: 'PBS updated the avelumab listing: the "grandfather" restriction was removed, and the listing was streamlined. Prescriptions continue to require Authority (STREAMLINED) approval. The published DPMQ is the maximum price — confidential rebates under the Deed of Agreement reduce the actual acquisition cost to government.',
                    links: [],
                },
            ],
            takeaway: 'Bavencio in Australia shows the PBAC → PBS pathway in action. The ~8-month gap between PBAC recommendation (March 2022) and PBS listing (October 2022) reflects the pricing negotiation with PBPA. Australia\'s participation in Project Orbis accelerated TGA registration, but PBAC assessment and price negotiation remained sequential. The Authority Required (STREAMLINED) restriction balances access with appropriate use.',
        },
    },
    {
        code: "AT",
        name: "Austria",
        flag: "🇦🇹",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "BASG \u2014 ASPREGISTER (national drug register)", url: "https://aspregister.basg.gv.at/aspregister/faces/aspregister.jspx" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "The EKO (Erstattungskodex) is Austria\u2019s positive reimbursement list managed by SV-Dachverband. Drugs are classified by box colour: green (no restriction), yellow (physician notifies fund within 8 days), red (prior authorisation required). HTA advice is provided by G\u00d6G (Gesundheit \u00d6sterreich GmbH).",
                links: [{ label: "Sozialversicherung \u2014 EKO (Erstattungskodex)", url: "https://www.sozialversicherung.at/oeko/views/index.xhtml" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "Sozialversicherung \u2014 Drug Prices", url: "https://www.sozialversicherung.at/cdscontent/load?contentid=10008.784743&version=1703680781" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">EKO Reimbursement System (Green / Yellow / Red Box)</h4>
<ol>
    <li>Search the EKO at <a href="https://www.sozialversicherung.at/oeko/views/index.xhtml" target="_blank" rel="noopener">sozialversicherung.at</a> by product name, ATC code, or active ingredient &mdash; results show the box colour, Kassenpreis (reimbursement price), and any prescribing restrictions</li>
    <li><strong>Green box (gr&uuml;ne Kiste)</strong>: reimbursed directly at the pharmacy &mdash; no prior steps needed</li>
    <li><strong>Yellow box (gelbe Kiste)</strong>: reimbursed, but the prescribing physician must notify the patient&rsquo;s health insurance fund (Krankenkasse) within 8 days &mdash; no pre-approval required</li>
    <li><strong>Red box (rote Kiste)</strong>: prior authorisation from the regional Krankenkasse is required before the prescription can be dispensed</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Austria does not publish a formal ICER threshold. HTA is conducted by G&Ouml;G (formerly LBI-HTA) and informs EKO listing decisions, but assessments are advisory.</p>

<h4 class="tips-heading">Finding Products &amp; Pricing</h4>
<ol>
    <li>For nationally authorised products, search <a href="https://aspregister.basg.gv.at/aspregister/faces/aspregister.jspx" target="_blank" rel="noopener">ASPREGISTER (BASG)</a> &mdash; shows MA status, Fachinformation (SmPC), and package leaflet</li>
    <li>For EMA centrally authorised products, the EU Commission decision covers Austria automatically &mdash; search the <a href="https://www.ema.europa.eu/en/medicines/human/EPAR" target="_blank" rel="noopener">EPAR database</a> for the full assessment</li>
    <li>Drug prices are published by SV-Dachverband; the EKO search also shows the current Kassenpreis alongside reimbursement conditions</li>
</ol>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Erstlinien-Erhaltungstherapie des lokal fortgeschrittenen oder metastasierten Urothelkarzinoms ohne Progression nach platinbasierter Chemotherapie",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation extending Bavencio\'s indication to first-line maintenance treatment of urothelial carcinoma. As an EU member, Austria is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "Hospital Funding (Spitalsfinanzierung / LKF)",
                    date: "2021",
                    detail: 'In Austria, IV-administered oncology drugs like avelumab are typically funded through <strong>hospital budgets</strong> (Spitalsfinanzierung) under the LKF (Leistungsorientierte Krankenanstaltenfinanzierung — performance-based hospital financing) system, rather than through the outpatient EKO (Erstattungskodex). This means avelumab is available through hospital outpatient oncology clinics without requiring a specific EKO listing. Austrian medical publications confirm avelumab as standard of care for first-line maintenance UC, consistent with ESMO and EAU guidelines.',
                    links: [
                        { label: "Sozialversicherung — EKO Search", url: "https://www.sozialversicherung.at/oeko/views/index.xhtml" },
                    ],
                },
                {
                    title: "Clinical Adoption & Guidelines",
                    date: "From April 2021",
                    detail: 'Austrian oncologists adopted avelumab for UC maintenance following a medical webinar in April 2021 coinciding with the EU approval, organised with international and national experts. Austria\'s hospital-based funding model means access was relatively quick after EC approval — individual hospitals could incorporate avelumab into their oncology formularies without a separate national reimbursement listing. Austria also participates in the <strong>BeNeLuxA</strong> initiative for joint price negotiations on expensive medicines.',
                    links: [
                        { label: "BASG — ASPREGISTER", url: "https://aspregister.basg.gv.at/aspregister/faces/aspregister.jspx" },
                    ],
                },
            ],
            takeaway: 'Austria illustrates a hospital-funding pathway where IV oncology drugs bypass the standard outpatient EKO reimbursement list. This model can provide faster access than countries requiring explicit positive-list inclusion, but makes it harder to verify reimbursement status from public databases — you won\'t find avelumab in the EKO. Instead, check with the treating hospital or look for clinical adoption evidence in Austrian medical publications.',
        },
    },
    {
        code: "BE",
        name: "Belgium",
        flag: "🇧🇪",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "FAMHP (Federal Agency for Medicines)", url: "https://www.famhp.be/en" },
                    { label: "Medicines Database", url: "https://medicinesdatabase.be" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "KCE (Belgian Health Care Knowledge Centre) develops HTA methodology and strategic assessments. CRM/CTG (Drug Reimbursement Committee) within NIHDI evaluates individual drug reimbursement dossiers within a 180-day procedure. Belgium participates in the BeNeLuxA initiative for joint HTA and price negotiations.",
                links: [
                    { label: "KCE (Health Care Knowledge Centre)", url: "https://kce.fgov.be/en" },
                    { label: "RIZIV/INAMI \u2014 CTG Assessment Reports & Decisions", url: "https://www.riziv.fgov.be/nl/webtoepassingen/geneesmiddelen-terugbetaling-ministeriele-beslissingen-en-ctg-beoordelingsrapporten" },
                    { label: "BeNeLuxA Initiative", url: "https://beneluxa.org/collaboration" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "The FPS Economy determines maximum ex-factory prices. The public price adds wholesaler margin, pharmacist margin, dispensing fee, and 6% VAT. Generic entry triggers a ~45% 'patent cliff' reduction on the originator's reimbursement basis.",
                links: [
                    { label: "FPS Economy \u2014 Medicines Pricing", url: "https://economie.fgov.be/fr/themes/ventes/politique-des-prix/prix-reglementes/medicaments-usage-humain" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "RIZIV/INAMI manages the positive reimbursement list. Categories: A (100%, life-saving), B (75\u201385%), C (50%), Cs (limited), Cx (contraceptives ~20%), Fa/Fb (flat-fee). Chapter IV medicines require prior authorization. Managed Entry Agreements (Article 81) cover ~30% of the medicines budget.",
                links: [
                    { label: "RIZIV/INAMI \u2014 Reimbursable Drug Search", url: "https://webappsa.riziv-inami.fgov.be/SSPWebApplicationPublic/fr/Public/ProductSearch" },
                    { label: "RIZIV/INAMI \u2014 Chapter IV/VIII Request Forms", url: "https://webappsa.riziv-inami.fgov.be/ssp/RequestForms" },
                    { label: "INAMI \u2014 Reimbursement Categories Explained", url: "https://www.riziv.fgov.be/fr/themes/soins-de-sante-cout-et-remboursement/les-prestations-de-sante-que-vous-rembourse-votre-mutualite/medicaments/remboursement-d-un-medicament/specialites-pharmaceutiques-remboursables/liste-des-specialites-pharmaceutiques-remboursables-les-categories-de-remboursement" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "CBIP/BCFI \u2014 R\u00e9pertoire Comment\u00e9 des M\u00e9dicaments", url: "https://www.cbip.be/fr/chapters" },
                    { label: "pharma.be (Innovative Pharma Industry)", url: "https://pharma.be" },
                    { label: "Medaxes (Generic & Biosimilar Association)", url: "https://www.medaxes.be/en" },
                    { label: "APB (Pharmacists' Association)", url: "https://www.apb.be" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Key Bodies &mdash; Language Note</h4>
<ol>
    <li>Belgium is bilingual (Dutch/French). All institutions have parallel names: <strong>RIZIV</strong> (NL) = <strong>INAMI</strong> (FR); <strong>FAGG</strong> (NL) = <strong>AFMPS</strong> (FR); <strong>BCFI</strong> (NL) = <strong>CBIP</strong> (FR); <strong>CTG</strong> (NL) = <strong>CRM</strong> (FR)</li>
    <li>The RIZIV/INAMI reimbursement database has <strong>no English interface</strong>. Use French (<code>/fr/</code>) or Dutch (<code>/nl/</code>) &mdash; drug names (brand + INN) are language-neutral and searchable in either version</li>
    <li><a href="https://www.famhp.be/en" target="_blank" rel="noopener">FAMHP</a> has an English site. <a href="https://kce.fgov.be/en" target="_blank" rel="noopener">KCE</a> publishes English report summaries. CRM/CTG assessment reports are published in the language of the company's submission (not translated)</li>
</ol>

<h4 class="tips-heading">HTA &mdash; KCE vs. CRM/CTG</h4>
<ol>
    <li><strong>KCE</strong>: Independent research institute. Produces strategic HTA reports and develops the <a href="https://kce.fgov.be/sites/default/files/2025-05/KCE400_Method_guidelines_economic_evaluations.pdf" target="_blank" rel="noopener">methodology guidelines</a> (KCE Report 400, 2025) that CRM/CTG experts follow. Does NOT evaluate individual drug dossiers</li>
    <li><strong>CRM/CTG</strong>: Advisory committee within NIHDI (30 members). Evaluates individual drug reimbursement applications within a <strong>180-day</strong> procedure. Classifies therapeutic value (class 1, 2, or 3) and proposes reimbursement terms to the Minister</li>
    <li>In short: KCE develops the playbook; CRM/CTG runs the individual plays</li>
</ol>

<h4 class="tips-heading">Reimbursement Categories</h4>
<ol>
    <li><strong>Category A</strong> (100%): Life-saving medicines (insulin, cancer drugs, immunosuppressants) &mdash; no patient co-payment</li>
    <li><strong>Category B</strong> (75&ndash;85%): Therapeutically essential medicines (antihypertensives, antibiotics). 85% for preferential insured (pensioners, disabled, low-income)</li>
    <li><strong>Category C</strong> (50%): Symptomatic treatments. <strong>Cs</strong>: C with specific conditions. <strong>Cx</strong>: Contraceptives (~20%)</li>
    <li><strong>Fa</strong> (100%): Flat-fee, primarily hospital-dispensed. <strong>Fb</strong>: Flat-fee at B-level reimbursement</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Categories B accounts for ~80&ndash;85% of public pharmaceutical expenditure. "Preferential insured" persons receive higher reimbursement rates and lower co-payment caps across all categories.</p>

<h4 class="tips-heading">Chapter IV Procedure (Prior Authorization)</h4>
<ol>
    <li>Chapter IV medicines require <strong>prior authorization</strong> before reimbursement &mdash; this is how Belgium manages access to expensive/specialized drugs</li>
    <li>Process: prescribing physician prepares the request &rarr; submitted to patient's health insurance fund (now often electronic) &rarr; reviewed by the fund's advising physician &rarr; approved or refused</li>
    <li>Approvals are <strong>time-limited</strong> and must be renewed with updated clinical documentation</li>
    <li>Search request forms at the <a href="https://webappsa.riziv-inami.fgov.be/ssp/RequestForms" target="_blank" rel="noopener">Chapter IV/VIII forms tool</a></li>
</ol>

<h4 class="tips-heading">Managed Entry Agreements &amp; Access</h4>
<ol>
    <li><strong>Article 81 Conventions (MEAs)</strong>: For expensive/innovative drugs with uncertain value. Temporary (3-year) reimbursement with confidential discounts, price-volume agreements, or outcome-based clawbacks. ~30% of the medicines budget is under MEAs</li>
    <li>Since October 2024, non-confidential sections of MEAs are <a href="https://webappsa.riziv-inami.fgov.be/SSPWebApplicationPublic/fr/Public/ProductSearch" target="_blank" rel="noopener">publicly accessible</a></li>
    <li><strong>Early &amp; Fast Access</strong> (effective 1 Jan 2026): Two-track reform for early temporary reimbursement of medicines in compassionate use or with EMA PRIME/accelerated status</li>
    <li><strong>BeNeLuxA</strong>: Belgium participates with Netherlands, Luxembourg, Austria, and Ireland in joint HTA assessments and price negotiations for expensive medicines (e.g., Spinraza, Zolgensma)</li>
</ol>
<p class="tips-note"><strong>Clinical reference:</strong> The <a href="https://www.cbip.be/fr/chapters" target="_blank" rel="noopener">CBIP/BCFI R&eacute;pertoire</a> is the standard annotated drug directory used by Belgian prescribers &mdash; organized into 20 therapeutic chapters with commentary on positioning, pricing, and reimbursement.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Traitement d'entretien en première ligne du carcinome urothélial localement avancé ou métastatique sans progression après chimiothérapie à base de platine",
            steps: [
                {
                    title: "Marketing Authorization (EMA/EC)",
                    date: "25 January 2021",
                    detail: 'EC approved Bavencio for first-line maintenance UC. As an EU member, Belgium automatically recognises the EMA centralised authorisation. The product was registered in the Medicines Database (medicinesdatabase.be) and assigned an FPS Economy maximum ex-factory price.',
                    links: [
                        { label: "Medicines Database — Belgium", url: "https://medicinesdatabase.be" },
                    ],
                },
                {
                    title: "CRM/CTG Reimbursement Evaluation",
                    date: "2021–2022",
                    detail: 'The manufacturer submitted a reimbursement dossier to NIHDI (RIZIV/INAMI). The CRM/CTG (Drug Reimbursement Committee) evaluated the clinical evidence within the standard <strong>180-day procedure</strong>. Given the high cost and the oncology indication, an <strong>Article 81 Managed Entry Agreement (MEA)</strong> was anticipated. The CRM/CTG classified the therapeutic added value and proposed reimbursement terms including Chapter IV prior authorisation requirements.',
                    links: [
                        { label: "RIZIV/INAMI — CTG Assessment Reports", url: "https://www.riziv.fgov.be/nl/webtoepassingen/geneesmiddelen-terugbetaling-ministeriele-beslissingen-en-ctg-beoordelingsrapporten" },
                    ],
                },
                {
                    title: "Chapter IV Reimbursement & Article 81 Convention",
                    date: "2022",
                    detail: 'Bavencio for UC maintenance was reimbursed under <strong>Chapter IV</strong> — requiring prior authorisation from the patient\'s health insurance fund (mutualité/ziekenfonds). The prescribing oncologist prepares a request confirming the patient meets criteria (locally advanced/metastatic UC, no progression after platinum-based chemo, adequate performance status). An <strong>Article 81 convention</strong> (managed entry agreement) was agreed between NIHDI and the manufacturer — this is a temporary 3-year reimbursement agreement with confidential financial terms (likely a price-volume or outcome-based arrangement). Approximately 30% of Belgium\'s medicines budget operates under Article 81 conventions.',
                    links: [
                        { label: "RIZIV/INAMI — Chapter IV/VIII Forms", url: "https://webappsa.riziv-inami.fgov.be/ssp/RequestForms" },
                        { label: "RIZIV/INAMI — Reimbursable Drug Search", url: "https://webappsa.riziv-inami.fgov.be/SSPWebApplicationPublic/fr/Public/ProductSearch" },
                    ],
                },
            ],
            takeaway: 'Bavencio in Belgium demonstrates the Chapter IV + Article 81 pathway typical for expensive oncology drugs. The prior authorisation requirement under Chapter IV ensures appropriate use, while the Article 81 managed entry agreement manages budget uncertainty. Belgium\'s 180-day CRM/CTG procedure is among the faster HTA timelines in Europe, but the Article 81 negotiation adds additional time. BeNeLuxA joint procurement was not applied to this specific product, though Belgium increasingly uses this mechanism for high-cost medicines.',
        },
    },
    {
        code: "BR",
        name: "Brazil",
        flag: "🇧🇷",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "ANVISA — Drug Search (Consultas)", url: "https://consultas.anvisa.gov.br/" },
                    { label: "ANVISA — New Drug Registrations", url: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "RENAME — Relação Nacional de Medicamentos Essenciais", url: "https://www.gov.br/saude/pt-br/composicao/sectics/rename" },
                    { label: "CONITEC — Recomendações", url: "https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/recomendacoes-da-conitec" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [
                    { label: "CMED — Regulated Drug Prices (Preços Máximos)", url: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Regulatory Approval (ANVISA)</h4>
<ol>
    <li>Search <a href="https://consultas.anvisa.gov.br/" target="_blank" rel="noopener">ANVISA Consultas</a> by product name or active substance to confirm Brazilian registration status</li>
    <li>ANVISA operates independently — no mutual recognition with EMA or FDA. Local clinical data may be required</li>
    <li>Brazil participates in Project Orbis for coordinated oncology reviews with FDA and other agencies</li>
</ol>

<h4 class="tips-heading">HTA (CONITEC)</h4>
<p>CONITEC (Comissão Nacional de Incorporação de Tecnologias no SUS) evaluates new technologies for incorporation into the public health system (SUS).</p>
<ol>
    <li>Search <a href="https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/recomendacoes-da-conitec" target="_blank" rel="noopener">CONITEC recommendations</a> by product name — reports are published in Portuguese (PDF)</li>
    <li>CONITEC outcomes: <strong>Incorporar</strong> (incorporate into SUS), <strong>Não incorporar</strong> (do not incorporate), or <strong>Incorporar com restrição</strong> (incorporate with restrictions)</li>
    <li>A positive CONITEC recommendation leads to inclusion in the <strong>RENAME</strong> (National List of Essential Medicines) or <strong>PCDT</strong> (Clinical Protocols and Therapeutic Guidelines)</li>
    <li>Important: SUS covers approximately 75% of the population. Private insurance and out-of-pocket payments cover the remainder</li>
</ol>

<h4 class="tips-heading">Pricing (CMED)</h4>
<ol>
    <li>Drug prices in Brazil are regulated by CMED (Câmara de Regulação do Mercado de Medicamentos) — a body under ANVISA</li>
    <li>CMED sets the maximum manufacturer price (PMC — Preço Máximo ao Consumidor) using a formula based on international reference prices and local factors</li>
    <li>Downloadable price lists are available on the <a href="https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos" target="_blank" rel="noopener">CMED pricing page</a> — published as Excel files, updated periodically</li>
    <li>Prices vary by state due to different ICMS (tax) rates — the price list includes columns for each state's maximum price</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> The CONITEC website is in Portuguese only. Use Google Translate for navigation. For the most comprehensive search, use <code>site:gov.br/conitec [product name]</code> on Google.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumabe",
            indication: "Tratamento de manutenção de primeira linha do carcinoma urotelial localmente avançado ou metastático sem progressão após quimioterapia à base de platina",
            steps: [
                {
                    title: "ANVISA Registration",
                    date: "28 December 2020",
                    detail: 'ANVISA approved the new indication for avelumab (Bavencio) in maintenance treatment of locally advanced or metastatic urothelial carcinoma. Published in the Diário Oficial da União. Brazil participates in <strong>Project Orbis</strong> — the FDA-led international oncology regulatory collaboration — which helped accelerate the review timeline. The approval referenced JAVELIN Bladder 100 data: median OS 21.4 vs 14.3 months.',
                    links: [
                        { label: "ANVISA — Bavencio new indication", url: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/novos-medicamentos-e-indicacoes/bavencio-avelumabe-nova-indicacao" },
                    ],
                },
                {
                    title: "CMED Maximum Price Setting",
                    date: "2021",
                    detail: 'CMED (Câmara de Regulação do Mercado de Medicamentos) established the maximum consumer price (PMC — Preço Máximo ao Consumidor) for Bavencio using Brazil\'s regulated pricing formula, which incorporates international reference pricing and local market factors. CMED prices vary by state due to different ICMS (state sales tax) rates — the official price list includes separate columns for each state.',
                    links: [
                        { label: "CMED — Drug Prices", url: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos" },
                    ],
                },
                {
                    title: "SUS Access — CONITEC Evaluation Pending",
                    date: "As of 2025",
                    detail: 'Avelumab for UC maintenance has <strong>not yet been incorporated into SUS</strong> (Sistema Único de Saúde) — Brazil\'s public health system covering ~75% of the population. CONITEC (Comissão Nacional de Incorporação de Tecnologias no SUS) has not published a formal recommendation for this indication. Without CONITEC incorporation, the drug is available only in the private sector or through individual judicial actions (judicialização). Brazil has a significant problem with judicialização — patients suing the government to obtain access to drugs not covered by SUS, which accounts for a substantial share of public pharmaceutical spending.',
                    links: [
                        { label: "CONITEC — Recommendations", url: "https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/recomendacoes-da-conitec" },
                    ],
                },
            ],
            takeaway: 'Bavencio in Brazil highlights the gap between regulatory approval and public access. ANVISA approved the drug in December 2020 (via Project Orbis), but as of 2025, CONITEC has not incorporated it into SUS. This means the majority of Brazilian patients cannot access maintenance avelumab through the public system. Private insurance or judicial orders remain the only routes — illustrating Brazil\'s dual-track access reality and the critical role of CONITEC incorporation in determining population-level access.',
        },
    },
    {
        code: "BG",
        name: "Bulgaria",
        flag: "🇧🇬",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "BDA \u2014 Drug Register", url: "https://www.bda.bg/bg/%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B8/%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B8-%D0%BD%D0%B0-%D0%BB%D0%B5%D0%BA%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%B8-%D0%BF%D1%80%D0%BE%D0%B4%D1%83%D0%BA%D1%82%D0%B8" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "NHIF (National Health Insurance Fund / НЗОК) maintains the positive drug list, updated quarterly. Reimbursement is grouped by therapeutic indication with three levels based on medical condition severity. Reference pricing against EU member states determines maximum reimbursable prices.",
                links: [{ label: "NHIF \u2014 National Health Insurance Medicine List", url: "https://www.nhif.bg/bg/medicine_food/medical-list/2024" }],
            },
        ],
        notes: "EMA centralised procedure is an alternative route to obtain marketing authorisation.",
        tipsHtml: `
<h4 class="tips-heading">BDA Drug Register &amp; Marketing Authorization</h4>
<ol>
    <li>The BDA (Bulgarian Drug Agency / ИАЛ) drug register is <strong>in Bulgarian (Cyrillic)</strong> &mdash; use Google Translate to navigate. INN names appear in Latin characters and can be searched directly</li>
    <li>For EMA centrally authorised products, the EU Commission decision automatically covers Bulgaria &mdash; use the <a href="https://www.ema.europa.eu/en/medicines/human/EPAR" target="_blank" rel="noopener">EPAR database</a> for those products</li>
</ol>

<h4 class="tips-heading">NHIF Positive Drug List</h4>
<ol>
    <li>The <a href="https://www.nhif.bg/bg/medicine_food/medical-list/2024" target="_blank" rel="noopener">NHIF positive list</a> is updated <strong>quarterly</strong> and published on the NHIF website. It is organised by INN with reimbursement conditions and the maximum reimbursable price</li>
    <li>Three reimbursement levels apply depending on the therapeutic group and medical severity &mdash; higher reimbursement (up to 100%) applies for cancer, HIV, and other severe conditions; lower levels (50&ndash;75%) apply for other chronic conditions</li>
    <li>Reference pricing against EU member states establishes maximum manufacturer prices; companies must apply to have products added to the positive list through NHIF</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> Both the BDA and NHIF interfaces are in Bulgarian (Cyrillic). Google Translate handles Bulgarian reasonably well. INN (active ingredient) names are in Latin characters and are the most reliable search terms.</p>
        `,
    },
    {
        code: "CA",
        name: "Canada",
        flag: "🇨🇦",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "Health Canada — Drug Product Database", url: "https://health-products.canada.ca/dpd-bdpp/" },
                    { label: "Health Canada — Summary Basis of Decision", url: "https://health-products.canada.ca/dpd-bdpp/switchlocale.do?lang=en&url=t.sbd.srmd" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "CADTH — Reimbursement Reviews", url: "https://www.cadth.ca/reimbursement-reviews" },
                    { label: "INESSS (Québec HTA body)", url: "https://www.inesss.qc.ca/en/themes/medicaments.html" },
                    { label: "pCPA — Pan-Canadian Price Negotiations", url: "https://www.pcpa.ca/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [
                    { label: "PMPRB — Patented Medicine Prices Review Board", url: "https://www.canada.ca/en/patented-medicine-prices-review.html" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "CADTH — Health Technology Assessments", url: "https://www.cadth.ca/health-technology-assessment" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Regulatory Approval (Health Canada)</h4>
<ol>
    <li>Search the <a href="https://health-products.canada.ca/dpd-bdpp/" target="_blank" rel="noopener">Drug Product Database (DPD)</a> by brand name or INN for Canadian marketing authorisation status, approved indications, and DIN (Drug Identification Number)</li>
    <li>The <strong>Summary Basis of Decision (SBD)</strong> is Health Canada's equivalent of the EPAR — provides the regulatory review rationale. Search the DPD or Google <code>site:health-products.canada.ca [product name] "summary basis of decision"</code></li>
    <li>Health Canada operates an independent pathway — no mutual recognition with EMA or FDA, though Project Orbis (for oncology) enables coordinated reviews</li>
</ol>

<h4 class="tips-heading">CADTH &amp; INESSS (HTA)</h4>
<p>Canada has a two-track HTA system: CADTH (federal — covers all provinces except Québec) and INESSS (Québec only).</p>
<ol>
    <li>Search <a href="https://www.cadth.ca/reimbursement-reviews" target="_blank" rel="noopener">CADTH Reimbursement Reviews</a> for drug appraisal reports — outcomes are: <strong>Reimburse</strong>, <strong>Reimburse with conditions</strong>, <strong>Do not reimburse</strong></li>
    <li>Key CADTH documents: the <strong>CADTH Recommendation</strong> (decision + rationale) and the <strong>Clinical Review Report</strong> (detailed evidence assessment)</li>
    <li>For Québec, check <a href="https://www.inesss.qc.ca/en/themes/medicaments.html" target="_blank" rel="noopener">INESSS</a> — Québec does not follow CADTH recommendations and conducts its own HTA</li>
    <li>A positive CADTH recommendation triggers price negotiations at the pan-Canadian level via <a href="https://www.pcpa.ca/" target="_blank" rel="noopener">pCPA (pan-Canadian Pharmaceutical Alliance)</a></li>
</ol>
<p class="tips-note"><strong>Important:</strong> A positive CADTH recommendation does NOT mean a drug is reimbursed. Each province/territory must then separately list the drug on its own formulary — this creates variable access timelines across Canada. Check individual provincial formularies for actual listing status.</p>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>The <a href="https://www.canada.ca/en/patented-medicine-prices-review.html" target="_blank" rel="noopener">PMPRB (Patented Medicine Prices Review Board)</a> sets maximum introductory prices for patented medicines using international reference pricing from a basket of comparator countries</li>
    <li>Actual reimbursed prices are negotiated confidentially through pCPA — published list prices (from the PMPRB) may not reflect actual acquisition costs</li>
    <li>Provincial formulary prices can vary — check the relevant provincial drug plan for listing-specific pricing details</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Canada's access pathway from approval to reimbursement typically takes 12–18 months (Health Canada → CADTH → pCPA → provincial listing). Track the stage of each product to understand the access timeline.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "First-line maintenance treatment of locally advanced or metastatic urothelial carcinoma that has not progressed after platinum-based chemotherapy",
            steps: [
                {
                    title: "Health Canada Approval",
                    date: "11 December 2020",
                    detail: 'Health Canada approved avelumab for first-line maintenance treatment of UC. Canada participated in <strong>Project Orbis</strong> — the FDA-led international oncology regulatory collaboration — enabling coordinated review with FDA, TGA (Australia), and Swissmedic. Health Canada approval came ~5 months after the FDA (June 2020). The Summary Basis of Decision reviewed the JAVELIN Bladder 100 trial data.',
                    links: [
                        { label: "Health Canada — DPD Bavencio", url: "https://health-products.canada.ca/dpd-bdpp/" },
                    ],
                },
                {
                    title: "CADTH/pCODR Reimbursement Review",
                    date: "29 April 2021",
                    detail: 'The pCODR Expert Review Committee (pERC) issued a positive recommendation: <strong>"Reimburse with clinical criteria and/or conditions"</strong>. Key conditions included alignment with the JAVELIN Bladder 100 eligibility criteria (ECOG 0–1, no progression after 4–6 cycles of platinum-based chemo). INESSS (Québec) also issued a positive recommendation concurrently. The CADTH Clinical Review Report provided a detailed critique of the OS, PFS, and quality-of-life evidence.',
                    links: [
                        { label: "CADTH — Avelumab for UC (review details)", url: "https://www.cadth.ca/avelumab-bavencio-urothelial-carcinoma-details" },
                    ],
                },
                {
                    title: "pCPA Price Negotiation",
                    date: "2021–2022",
                    detail: 'Following the positive CADTH recommendation, the pan-Canadian Pharmaceutical Alliance (pCPA) entered price negotiations with the manufacturer (EMD Serono / Pfizer). pCPA negotiations are confidential — the negotiated price is not publicly disclosed. Upon conclusion, each province/territory independently decides whether to list the drug on its public formulary.',
                    links: [
                        { label: "pCPA — Negotiations", url: "https://www.pcpa.ca/" },
                    ],
                },
                {
                    title: "Provincial Formulary Listings",
                    date: "2022 onwards (variable)",
                    detail: 'Provincial drug plans listed avelumab progressively. In Canada, a positive CADTH recommendation and completed pCPA negotiation do <strong>not</strong> guarantee listing — each province makes independent formulary decisions. Larger provinces (Ontario, BC, Alberta, Québec) typically list first; smaller provinces may follow months later. Access remains variable across the country.',
                    links: [],
                },
            ],
            takeaway: 'Bavencio in Canada illustrates the multi-step access pathway: Health Canada approval (Dec 2020) → CADTH/pCODR recommendation (Apr 2021) → pCPA negotiation → provincial listing (2022+). The ~18-month journey from regulatory approval to widespread provincial access highlights the structural delay inherent in Canada\'s decentralised payer system. Project Orbis accelerated the regulatory step but had no impact on HTA or pricing timelines.',
        },
    },
    {
        code: "CL",
        name: "Chile",
        flag: "🇨🇱",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "ISP (Instituto de Salud P\u00fablica) is Chile\u2019s national regulatory authority. Within ISP, ANAMED (Agencia Nacional de Medicamentos) evaluates and grants marketing authorisations (registro sanitario). Since February 2025, a reliance pathway allows abbreviated review for biologics already approved by FDA or EMA.",
                links: [
                    { label: "ISP \u2014 Registro Sanitario (drug registry)", url: "https://registrosanitario.ispch.gob.cl/" },
                    { label: "ISP/ANAMED \u2014 Medicines Agency", url: "https://www.ispch.gob.cl/anamed/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Chile has free drug pricing in the private retail market. For the public sector, CENABAST conducts centralised procurement through competitive tenders. Since Ley CENABAST (2020), CENABAST also acts as intermediary for ~400 private pharmacies, selling ~250 medicines at government-negotiated prices (up to 70% lower acquisition cost).",
                links: [
                    { label: "CENABAST (public-sector procurement)", url: "https://www.cenabast.cl/" },
                    { label: "CENABAST \u2014 Ley CENABAST Drug List", url: "https://www.cenabast.cl/lista-de-medicamentos-ley-cenabast/" },
                    { label: "Remedios M\u00e1s Baratos (pharmacy locator)", url: "https://www.remediosmasbaratos.cl/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Chile has a dual system: FONASA (public insurer, ~80% of population) and ISAPREs (private health insurers). The GES/AUGE programme guarantees coverage for 90 priority health conditions (updated December 2025) with defined treatments and maximum co-payments. The Ley Ricarte Soto (Law 20.850, 2015) provides 100% coverage for 27 high-cost rare/catastrophic diseases.",
                links: [
                    { label: "FONASA (public health insurer)", url: "https://www.fonasa.cl/" },
                    { label: "GES/AUGE \u2014 Health Conditions List", url: "https://auge.minsal.cl/problemasdesalud/index" },
                    { label: "Ley Ricarte Soto \u2014 High-Cost Medicines", url: "https://www.superdesalud.gob.cl/tax-temas-de-orientacion/ley-ricarte-soto-6088/" },
                    { label: "Superintendencia de Salud (regulator)", url: "https://www.supersalud.gob.cl/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "MINSAL (Ministry of Health)", url: "https://www.minsal.cl/" },
                    { label: "ETESA \u2014 HTA Unit (within MINSAL)", url: "https://etesa.minsal.cl/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization</h4>
<ol>
    <li>Search the <a href="https://registrosanitario.ispch.gob.cl/" target="_blank" rel="noopener">ISP Registro Sanitario</a> by product name or active ingredient to confirm registration status, dosage forms, and marketing authorisation holder</li>
    <li>Since February 2025, <a href="https://www.ispch.gob.cl/anamed/" target="_blank" rel="noopener">ANAMED</a> has a <strong>reliance pathway</strong> for biologics &mdash; products approved by FDA or EMA can undergo abbreviated review (CTD Module 2 only)</li>
</ol>

<h4 class="tips-heading">Pricing &amp; Procurement</h4>
<ol>
    <li><strong>No retail price control</strong> &mdash; private-market prices are freely set by manufacturers and pharmacies (a broader reform bill &ldquo;F&aacute;rmacos 2&rdquo; proposing international reference pricing is pending)</li>
    <li>For public procurement prices, check <a href="https://www.cenabast.cl/" target="_blank" rel="noopener">CENABAST</a> &mdash; centralised purchasing achieves significant discounts through competitive tenders</li>
    <li>Since <strong>Ley CENABAST (2020)</strong>, ~400 private pharmacies can also purchase through CENABAST at negotiated prices &mdash; use <a href="https://www.remediosmasbaratos.cl/" target="_blank" rel="noopener">Remedios M&aacute;s Baratos</a> to find participating pharmacies near you</li>
</ol>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li><strong>GES/AUGE</strong> guarantees coverage for <strong>90 priority conditions</strong> (updated December 2025) including cancers, diabetes, HIV, cardiovascular diseases, mental health &mdash; search the <a href="https://auge.minsal.cl/problemasdesalud/index" target="_blank" rel="noopener">full list on MINSAL</a></li>
    <li>The <strong>Ley Ricarte Soto</strong> (Law 20.850) provides <strong>100% coverage</strong> (no copayment) for 27 high-cost rare/catastrophic diseases &mdash; <a href="https://www.superdesalud.gob.cl/tax-temas-de-orientacion/ley-ricarte-soto-6088/" target="_blank" rel="noopener">full list on Superintendencia de Salud</a></li>
    <li>Since September 2022, <strong>Copago Cero</strong> eliminated copayments for all FONASA beneficiaries in public facilities</li>
    <li>ETESA (Evaluaci&oacute;n de Tecnolog&iacute;as Sanitarias) within MINSAL conducts HTA evaluations for inclusion in GES and Ricarte Soto programmes</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> All regulatory documents are in Spanish. Key search terms: "registro sanitario," "garant&iacute;as expl&iacute;citas en salud," "ley Ricarte Soto."</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial indication); NSCLC and other oncology indications subsequently added",
            steps: [
                {
                    title: "ISP Registration",
                    date: "2016",
                    detail: 'ISP (Instituto de Salud P\u00fablica) registered pembrolizumab for advanced melanoma, followed by subsequent indication expansions including NSCLC, head & neck SCC, and classical Hodgkin lymphoma. Chile accepts dossiers referencing ICH-aligned regulatory authorities, and ISP has been progressively streamlining review times for priority oncology drugs.',
                    links: [
                        { label: "ISP \u2014 Drug Registry (Registro de Productos Farmac\u00e9uticos)", url: "https://registrosanitario.ispch.gob.cl/" },
                    ],
                },
                {
                    title: "Ley Ricarte Soto Coverage",
                    date: "From 2019",
                    detail: 'Chile\u2019s <strong>Ley Ricarte Soto</strong> (Law 20.850, 2015) provides public funding for high-cost diagnoses and treatments. Pembrolizumab was included under the Ley Ricarte Soto programme for specific indications including advanced melanoma. Coverage is diagnosis-specific and requires patients to meet defined clinical criteria. The programme is funded by a dedicated public fund and covers treatments regardless of the patient\u2019s insurance affiliation (FONASA or Isapre).',
                    links: [
                        { label: "MINSAL \u2014 Ley Ricarte Soto", url: "https://www.minsal.cl/leyricartesoto/" },
                    ],
                },
                {
                    title: "FONASA & CENABAST Procurement",
                    date: "Ongoing",
                    detail: 'For indications covered under Ley Ricarte Soto, <strong>CENABAST</strong> (Central de Abastecimiento del SNS) handles centralised procurement and price negotiation. For indications not covered by Ricarte Soto, access depends on institutional procurement by FONASA hospitals or private Isapre coverage. GES/AUGE guarantees cover specific cancers (e.g., breast, colorectal) but immunotherapy coverage varies by indication and protocol updates. Chile\u2019s ETESA (Evaluaci\u00f3n de Tecnolog\u00edas Sanitarias) conducts HTA evaluations that inform coverage decisions.',
                    links: [
                        { label: "CENABAST \u2014 Procurement Portal", url: "https://www.cenabast.cl/" },
                        { label: "FONASA", url: "https://www.fonasa.cl/" },
                    ],
                },
            ],
            takeaway: 'Chile\u2019s Ley Ricarte Soto represents a landmark high-cost drugs law that provides universal access to specified expensive treatments regardless of insurance type. For Keytruda, coverage under Ricarte Soto is indication-specific \u2014 not all approved indications are covered. For non-covered indications, access depends on institutional procurement or private insurance. CENABAST\u2019s centralised procurement achieves significant price reductions through consolidated purchasing power.',
        },
    },
    {
        code: "CN",
        name: "China",
        flag: "🇨🇳",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "NMPA (National Medical Products Administration) is China\u2019s drug regulatory authority. The CDE (Center for Drug Evaluation) handles scientific review of drug applications. China joined ICH in 2017 and has been aligning with international standards. The NMPA drug database allows searching approved domestic and imported drugs.",
                links: [
                    { label: "NMPA \u2014 Drug Database (Search Approved Drugs)", url: "https://www.nmpa.gov.cn/datasearch/search-info.html" },
                    { label: "NMPA \u2014 Official Website", url: "https://www.nmpa.gov.cn/" },
                    { label: "CDE (Center for Drug Evaluation)", url: "https://www.cde.org.cn/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "NHSA (National Healthcare Security Administration) manages drug pricing through two mechanisms: annual NRDL price negotiations for innovative/patented drugs (typically 50\u201360% reductions), and Volume-Based Procurement (VBP) competitive tenders for off-patent generics and biosimilars (9 national rounds covering 370+ molecules). Prior to NHSA\u2019s creation in 2018, pricing was fragmented across multiple agencies.",
                links: [
                    { label: "NHSA (National Healthcare Security Administration)", url: "https://www.nhsa.gov.cn/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "The NRDL (National Reimbursement Drug List) determines which drugs are reimbursable under Basic Medical Insurance (covering >95% of the 1.4 billion population). Category A drugs are fully reimbursed; Category B requires co-payment. The NRDL is updated annually through a structured negotiation cycle (applications in spring, negotiations in autumn, implementation January 1).",
                links: [
                    { label: "NHSA \u2014 Medical Insurance Drug Catalog Query", url: "https://code.nhsa.gov.cn/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "China Clinical Trial Registry", url: "http://www.chinadrugtrials.org.cn/" },
                    { label: "NMPA English Page", url: "https://english.nmpa.gov.cn/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization (NMPA)</h4>
<ol>
    <li>Search the <a href="https://www.nmpa.gov.cn/datasearch/search-info.html" target="_blank" rel="noopener">NMPA Drug Database</a> by drug name (Chinese or English), approval number, or manufacturer &mdash; covers domestic drugs, imported drugs, and supplements</li>
    <li>The <a href="https://www.cde.org.cn/" target="_blank" rel="noopener">CDE website</a> publishes accepted and approved drug applications, technical guidelines, and review timelines</li>
    <li>China offers <strong>priority review pathways</strong>: breakthrough therapy designation, conditional approval, priority review, and special approval for urgently needed drugs</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> The NMPA database and most regulatory documents are in Chinese. Use Chinese drug names for best results. The <a href="https://english.nmpa.gov.cn/" target="_blank" rel="noopener">NMPA English page</a> has limited content.</p>

<h4 class="tips-heading">NRDL &amp; Pricing</h4>
<ol>
    <li>The <a href="https://code.nhsa.gov.cn/" target="_blank" rel="noopener">NHSA coding platform</a> provides a searchable database of NRDL-listed drugs with medical insurance codes</li>
    <li>The annual <strong>NRDL negotiation cycle</strong>: applications (Apr&ndash;May) &rarr; expert review (Jul&ndash;Aug) &rarr; price negotiations (Sep&ndash;Oct) &rarr; publication (Nov&ndash;Dec) &rarr; effective January 1</li>
    <li><strong>Volume-Based Procurement (VBP)</strong> targets off-patent generics and biosimilars through competitive tenders with guaranteed volume contracts &mdash; average price reductions of 50&ndash;60% per round</li>
</ol>
<p class="tips-note"><strong>Key distinction:</strong> NRDL negotiations are for <strong>innovative/patented drugs</strong> (price negotiation for reimbursement access), while VBP is for <strong>off-patent generics and biosimilars</strong> (competitive tendering for procurement contracts).</p>

<h4 class="tips-heading">Insurance Coverage</h4>
<ol>
    <li><strong>UEBMI</strong> (Urban Employee Basic Medical Insurance) covers urban formal-sector employees and retirees &mdash; generally more generous</li>
    <li><strong>URRBMI</strong> (Urban-Rural Resident Basic Medical Insurance) covers rural residents and urban non-employed &mdash; funded by premiums plus government subsidies</li>
    <li>Reimbursement rates vary by scheme, hospital tier, and province (typically 50&ndash;90%). NRDL Category A drugs are reimbursed at the standard rate; Category B requires co-payment</li>
</ol>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            localName: "\u53ef\u745e\u8fbe",
            indication: "Unresectable or metastatic melanoma after failure of one prior systemic therapy (initial Chinese indication)",
            steps: [
                {
                    title: "NMPA Priority Review Approval",
                    date: "July 2018",
                    detail: 'NMPA (formerly CNDA) granted approval for pembrolizumab for second-line advanced melanoma following priority review \u2014 an industry-leading turnaround for imported cancer medicine in China. The approval was based on the Phase 1b KEYNOTE-151 study in 103 Chinese patients. Keytruda was the first anti-PD-1 therapy approved for advanced melanoma in China. Subsequent approvals expanded to NSCLC, esophageal cancer, and 10+ other tumour types.',
                    links: [
                        { label: "NMPA \u2014 Drug Database", url: "https://www.nmpa.gov.cn/datasearch/search-info.html" },
                    ],
                },
                {
                    title: "Launch Pricing & Patient Assistance",
                    date: "September 2018",
                    detail: 'MSD launched Keytruda at <strong>CNY 17,918 per 100 mg vial</strong> (~USD 2,613), approximately 50% of the US list price. A <strong>Patient Assistance Programme (PAP)</strong> offered "buy 3, get 3 free" \u2014 effectively halving the annual cost further. By 2021, the PAP updated to "buy 2, get 2 free" with annual cost ~CNY 70,000 (~USD 9,600). Municipal schemes like Shenzhen offered 70% reimbursement up to CNY 150,000/year.',
                    links: [
                        { label: "Caixin \u2014 MSD Keytruda China Pricing", url: "https://www.caixinglobal.com/2018-09-19/merck-slashes-key-cancer-drug-price-for-china-101327751.html" },
                    ],
                },
                {
                    title: "NRDL Negotiations \u2014 Consistently Excluded",
                    date: "2019\u20132025 (6 consecutive rounds)",
                    detail: 'Keytruda has been <strong>excluded from the NRDL for 6 consecutive years</strong> (2019\u20132025). NHSA demands 60\u201380%+ price cuts for listing; MSD declined due to international reference pricing (IRP) concerns \u2014 deep China discounts would trigger price reductions in 12+ reference countries globally. Meanwhile, 4+ domestic PD-1 inhibitors (sintilimab, tislelizumab, camrelizumab, toripalimab) achieved NRDL listing at annual costs of CNY 40,000\u201370,000 \u2014 a fraction of Keytruda\u2019s price. Despite NRDL exclusion, Keytruda achieved ~CNY 3 billion annual sales in China through private pay, commercial insurance, and PAPs.',
                    links: [
                        { label: "NHSA \u2014 Drug Catalog Query", url: "https://code.nhsa.gov.cn/" },
                    ],
                },
            ],
            takeaway: 'China\u2019s Keytruda story is a landmark case study in the tension between global pricing and local reimbursement. MSD chose commercial viability (private pay + PAP) over NRDL listing that would require 60\u201380% price cuts with global IRP ripple effects. The strategy initially succeeded (~CNY 3B/year sales without public reimbursement), but domestic PD-1 competition at 1/4 the price is eroding market share. China demonstrates that commercial success without national reimbursement is possible but unsustainable against local competition.',
        },
    },
    {
        code: "CO",
        name: "Colombia",
        flag: "🇨🇴",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "INVIMA (Instituto Nacional de Vigilancia de Medicamentos y Alimentos) is the national regulatory authority for drug registration. The Consulta Registro portal allows searching all authorised products.",
                links: [
                    { label: "INVIMA \u2014 Consulta Registro (drug registry)", url: "https://consultaregistro.invima.gov.co/Consultas/consultas/consreg_encabcum.jsp" },
                    { label: "INVIMA \u2014 Official Website", url: "https://www.invima.gov.co/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "The CNPMDM regulates drug prices under three regimes: Libertad Vigilada (monitored freedom, default for all medicines), Control Directo (maximum sale price set by CNPMDM using ERP against 19 countries), and Libertad Regulada (not actively applied). SISMED collects transaction prices from manufacturers and distributors. The Term\u00f3metro de Precios tool shows whether observed prices are normal, low, or high.",
                links: [
                    { label: "CNPMDM \u2014 Price Regulation", url: "https://minsalud.gov.co/salud/MT/paginas/medicamentos-regulacion-precios.aspx" },
                    { label: "SISMED \u2014 Public Price Data", url: "https://www.datos.gov.co/Salud-y-Protecci-n-Social/Consulta-p-blica-de-Precios-de-Medicamentos/3he6-m866" },
                    { label: "Term\u00f3metro de Precios (price comparison tool)", url: "https://www.minsalud.gov.co/salud/MT/Paginas/termometro-de-precios.aspx" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "The PBS (Plan de Beneficios en Salud) defines the benefits package for both contributory and subsidised regimes (unified since 2012). Non-PBS medicines are prescribed via MIPRES (digital platform \u2014 physicians prescribe directly, EPS must deliver within 5 days). ADRES manages financing through Presupuestos M\u00e1ximos (annual budgets to EPS). IETS is Colombia\u2019s HTA body (INAHTA member).",
                links: [
                    { label: "IETS (HTA Institute)", url: "https://www.iets.org.co/" },
                    { label: "ADRES \u2014 Health System Resources", url: "https://www.adres.gov.co/" },
                    { label: "MINSALUD \u2014 PBS Medicines List", url: "https://www.minsalud.gov.co/salud/POS/Paginas/plan-obligatorio-de-salud-pos.aspx" },
                    { label: "PBS Medicines (Open Data)", url: "https://www.datos.gov.co/Salud-y-Protecci-n-Social/MEDICAMENTOS-POS/a7iv-sme8" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "MINSALUD (Ministry of Health)", url: "https://www.minsalud.gov.co/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization</h4>
<ol>
    <li>Search the <a href="https://consultaregistro.invima.gov.co/Consultas/consultas/consreg_encabcum.jsp" target="_blank" rel="noopener">INVIMA Consulta Registro</a> by product name, active ingredient, or registration number. For a lighter interface try the <a href="https://consultaregistro.invima.gov.co/registrosconsultaligera/registrosanitario/consultar" target="_blank" rel="noopener">Consulta Ligera</a> (no CAPTCHA)</li>
    <li>The main portal may require a Colombian IP address or VPN &mdash; try Opera browser&rsquo;s built-in VPN (Americas location) if access is blocked</li>
    <li>A <a href="https://www.datos.gov.co/en/Salud-y-Protecci-n-Social/C-DIGO-NICO-DE-MEDICAMENTOS-VIGENTES/i7cb-raxc/data" target="_blank" rel="noopener">machine-readable dataset</a> of all valid registrations is available on Open Data Colombia (SODA API)</li>
</ol>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>By default, all medicines are under <strong>Libertad Vigilada</strong> (monitored freedom) &mdash; prices are freely set but must be reported to SISMED. The CNPMDM can place specific molecules under <strong>Control Directo</strong> with a maximum sale price (PMV)</li>
    <li>The current methodology (Circular 18 de 2024) uses <strong>ERP against 19 countries</strong> &mdash; the PMV is the lower of the 20th percentile of international reference prices or the national average price</li>
    <li>The <a href="https://www.minsalud.gov.co/salud/MT/Paginas/termometro-de-precios.aspx" target="_blank" rel="noopener">Term&oacute;metro de Precios</a> is a visual tool showing whether current prices for a medicine are low (green), normal (yellow), or high (red)</li>
</ol>

<h4 class="tips-heading">Reimbursement &amp; HTA</h4>
<ol>
    <li>The <strong>PBS</strong> covers the mandatory benefits package &mdash; medicines not in PBS are prescribed via <strong>MIPRES</strong> (digital platform where physicians prescribe directly; EPS must deliver within 5 days). This replaced the old CTC committee system</li>
    <li>Non-PBS costs are covered through <strong>Presupuestos M&aacute;ximos</strong> (annual budgets from ADRES to EPS), not individual reimbursement claims</li>
    <li><a href="https://www.iets.org.co/" target="_blank" rel="noopener">IETS</a> is Colombia&rsquo;s formal HTA body (INAHTA member) &mdash; 900+ assessments produced, informing PBS update decisions</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> All regulatory documents are in Spanish. Key terms: "registro sanitario," "plan de beneficios en salud," "precio m&aacute;ximo de venta," "presupuestos m&aacute;ximos."</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Melanoma avanzado (initial INVIMA registration); subsequently expanded to 10+ oncology indications",
            steps: [
                {
                    title: "INVIMA Registration",
                    date: "2017",
                    detail: 'INVIMA granted registration for pembrolizumab (INVIMA 2017MBT-0017599) for advanced melanoma. Notably, INVIMA initially <strong>rejected</strong> MSD\u2019s original application because the submitted data was based on the US FDA accelerated approval (Phase II) data package \u2014 Colombia does not have an equivalent abbreviated approval route. After MSD filed an appeal with supplementary data, approval was granted. Four additional oncology indications were added during 2020\u20132022.',
                    links: [
                        { label: "INVIMA \u2014 Drug Registry", url: "https://www.invima.gov.co/consultas-registros-sanitarios" },
                    ],
                },
                {
                    title: "PBS Status & No-PBS Access via MIPRES / Tutela",
                    date: "Ongoing",
                    detail: 'Pembrolizumab is <strong>NOT included</strong> in the PBS (Plan de Beneficios en Salud). Access is through the <strong>No-PBS pathway</strong>: physicians prescribe via MIPRES (digital platform), and the EPS (health insurer) must deliver within 5 days. If the EPS fails, patients can invoke the constitutional <strong>tutela</strong> mechanism \u2014 a court order compelling treatment access. This rights-based pathway is uniquely Colombian. Since 2020, costs are managed through <strong>Presupuestos M\u00e1ximos</strong> (annual ceiling budgets from ADRES to EPS) rather than individual reimbursement claims.',
                    links: [
                        { label: "MIPRES (prescription platform)", url: "https://mipres.sispro.gov.co/" },
                        { label: "ADRES", url: "https://www.adres.gov.co/" },
                    ],
                },
                {
                    title: "Pricing \u2014 SISMED & Price Controls",
                    date: "Ongoing",
                    detail: 'Pembrolizumab pricing is regulated through SISMED (Sistema de Informaci\u00f3n de Precios de Medicamentos). Colombia uses external reference pricing (ERP against 19 countries, Circular 18 de 2024) to set maximum sale prices (PMV). The CNPMDM can place specific molecules under <strong>Control Directo</strong> with a regulated ceiling price. Reference price: ~COP 10,850,000 per 100 mg vial. Cost-effectiveness analyses at the Colombian WTP threshold (COP ~69M/QALY) have shown pembrolizumab to be cost-effective for some indications (e.g., first-line HNSCC).',
                    links: [
                        { label: "SISMED \u2014 Drug Price Database", url: "https://www.sispro.gov.co/central-medicamentos/Pages/Consulta-precio-SISMED.aspx" },
                    ],
                },
            ],
            takeaway: 'Colombia demonstrates a uniquely rights-based access system: the constitutional tutela mechanism ensures patients can compel coverage for non-PBS drugs, making it more patient-protective than most emerging markets. The 2020 shift from individual recobros to ceiling budgets (presupuestos m\u00e1ximos) transferred financial risk to EPS entities. INVIMA\u2019s initial rejection based on the US accelerated approval data package highlights how regulatory pathways can diverge between reference markets and local requirements.',
        },
    },
    {
        code: "HR",
        name: "Croatia",
        flag: "🇭🇷",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "HALMED \u2014 Drug Database", url: "https://www.halmed.hr/en/Lijekovi/Baza-lijekova/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "HZZO (Croatian Health Insurance Fund) maintains two reimbursement lists: the primary list (osnovna lista \u2014 100% reimbursed) and the supplementary list (dopunska lista \u2014 reimbursed with co-payment). Expensive or restricted medicines require prior authorisation (\u201esuglasnost\u201c) from HZZO before reimbursement.",
                links: [{ label: "HZZO \u2014 Published Lists of Reimbursed Medicines", url: "https://hzzo.hr/zdravstvena-zastita/lijekovi/objavljene-liste-lijekova" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "HZZO \u2014 Right to Use Medicines", url: "https://hzzo.hr/zdravstvena-zastita/lijekovi/pravo-na-koristenje-lijekova" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">HZZO Reimbursement Lists</h4>
<ol>
    <li>Croatia has two public lists: the <strong>primary list</strong> (osnovna lista) where drugs are fully reimbursed, and the <strong>supplementary list</strong> (dopunska lista) where a co-payment applies</li>
    <li>The lists are published on <a href="https://hzzo.hr/zdravstvena-zastita/lijekovi/objavljene-liste-lijekova" target="_blank" rel="noopener">hzzo.hr</a> as downloadable documents (updated periodically). They are organised by ATC group with INN, dosage, and reimbursement conditions</li>
    <li>Medicines requiring prior authorisation are marked in the list &mdash; the physician must obtain a <strong>suglasnost</strong> (HZZO approval) before the patient can receive reimbursement. This applies to biologics, oncologics, and other restricted drugs</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> HALMED&rsquo;s drug database has an English interface. The HZZO reimbursement lists are in Croatian only &mdash; drug names (INN) are in Latin characters and searchable directly. Use Google Translate to navigate the list conditions.</p>
        `,
    },
    {
        code: "CY",
        name: "Cyprus",
        flag: "🇨🇾",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "PHS Cyprus \u2014 Product Search", url: "https://www.phs.moh.gov.cy/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Since 2019, most residents are covered by Ge\u03a3\u03a5 (General Healthcare System / GeSY) managed by HIO (Health Insurance Organisation of Cyprus). GeSY maintains a positive list of reimbursable medicines; patients pay a fixed co-payment per prescription (waived for certain chronic conditions and vulnerable groups).",
                links: [{ label: "MoH \u2014 Co-payment Scheme", url: "https://www.moh.gov.cy/moh/phs/phs.nsf/supplplan_en/supplplan_en?opendocument" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "MoH \u2014 Price of Medicinal Products", url: "https://www.moh.gov.cy/moh/phs/phs.nsf/pricelist_en/pricelist_en?opendocument" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">GeSY (General Healthcare System)</h4>
<ol>
    <li>GeSY (Ge\u03a3\u03a5) launched in June 2019, replacing the previous fragmented public system. It covers all legal residents and is funded via payroll contributions and government transfers</li>
    <li>HIO (Health Insurance Organisation of Cyprus / \u039f\u0391\u03a5) administers GeSY and publishes the positive medicines list. Medicines on the list are reimbursed with a fixed patient co-payment per prescription &mdash; currently waived for vulnerable groups and specific chronic conditions</li>
    <li>EMA centrally authorised medicines are valid in Cyprus automatically &mdash; national authorisation is not required for these products</li>
</ol>
<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>PHS (Pharmaceutical Services) under the Ministry of Health sets maximum prices &mdash; download the current price list from the <a href="https://www.moh.gov.cy/moh/phs/phs.nsf/pricelist_en/pricelist_en?opendocument" target="_blank" rel="noopener">MoH pricing page</a></li>
    <li>Cyprus uses external reference pricing against other EU member states to set maximum wholesale and retail prices</li>
</ol>
        `,
    },
    {
        code: "CZ",
        name: "Czech Republic",
        flag: "🇨🇿",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "S\u00daKL \u2014 Drug Register", url: "https://www.sukl.cz/modules/medication/search.php" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                body: "S\u00daKL (State Institute for Drug Control) manages a single database covering marketing authorisation, reimbursement status, and regulated prices. Reimbursement decisions include indication-based conditions (IND codes) that restrict which patients are eligible. HTA is conducted by S\u00daKL\u2019s own assessment department.",
                links: [{ label: "S\u00daKL \u2014 Reimbursed Drugs and Prices", url: "https://www.sukl.cz/modules/medication/search.php" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Using the S&Uacute;KL Database</h4>
<ol>
    <li>The <a href="https://www.sukl.cz/modules/medication/search.php" target="_blank" rel="noopener">S&Uacute;KL search</a> is a unified tool &mdash; it shows marketing authorisation status, the current regulated price, and whether a drug is reimbursed, all in one place. Search by product name or active substance (INN)</li>
    <li>Reimbursement entries include <strong>IND codes</strong> (indika&ccaron;n&iacute; omezen&iacute;) &mdash; these define the specific indications and patient conditions under which reimbursement applies. Always read the IND codes: a product may be reimbursed for one indication but not another</li>
    <li>Regulated prices are set in CZK. The S&Uacute;KL database shows both the maximum ex-factory price and the pharmacy retail price</li>
    <li>HTA is conducted internally by S&Uacute;KL (not a separate HTA body). The assessment informs the reimbursement decision made by S&Uacute;KL, with final approval from the Ministry of Health</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> The S&Uacute;KL interface is primarily in Czech. The product search accepts INN (Latin characters) and brand names. Use Google Translate for the result fields &mdash; key terms: "hrazen" (reimbursed), "cena" (price), "indika&ccaron;n&iacute; omezen&iacute;" (indication restriction).</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (first indication); subsequently expanded to NSCLC, urothelial carcinoma, and other oncology indications",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "17 July 2015",
                    detail: 'EC granted marketing authorization for Keytruda for advanced (unresectable or metastatic) melanoma in adults. As an EU member, Czech Republic is covered by the centralised procedure. Subsequent Type II variations extended indications to NSCLC (2016), urothelial carcinoma (2017), and many other tumour types.',
                    links: [
                        { label: "EMA EPAR \u2014 Keytruda", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/keytruda" },
                    ],
                },
                {
                    title: "S\u00daKL HTA Assessment & Reimbursement",
                    date: "2017\u20132018",
                    detail: 'S\u00daKL conducted an internal HTA assessment and issued a reimbursement decision. Pembrolizumab was listed with <strong>IND codes</strong> (indika\u010dn\u00ed omezen\u00ed) restricting reimbursement to specific indications and clinical criteria: advanced melanoma (monotherapy, after prior ipilimumab or BRAF inhibitor), and subsequently NSCLC with PD-L1 TPS \u226550%. Each new indication required a separate S\u00daKL reimbursement procedure with corresponding IND code.',
                    links: [
                        { label: "S\u00daKL \u2014 Drug Register & Reimbursement Search", url: "https://www.sukl.cz/modules/medication/search.php" },
                    ],
                },
                {
                    title: "Price Regulation & Updates",
                    date: "Ongoing",
                    detail: 'S\u00daKL sets both the maximum ex-factory price (using external reference pricing against a basket of EU countries) and the reimbursement amount. The database shows both the regulated price and the reimbursement conditions in one place. As new indications are added, each goes through a separate administrative procedure. Czech Republic typically achieves reimbursement within 12\u201318 months of EC approval for priority oncology drugs, faster than some CEE peers.',
                    links: [
                        { label: "S\u00daKL \u2014 Reimbursed Drugs and Prices", url: "https://www.sukl.cz/modules/medication/search.php" },
                    ],
                },
            ],
            takeaway: 'Czech Republic demonstrates a unified regulatory-reimbursement system where S\u00daKL handles both drug registration and reimbursement in one institution. The IND code system (indika\u010dn\u00ed omezen\u00ed) ensures reimbursement is tightly linked to specific indications and patient criteria \u2014 a product may be reimbursed for one indication but not another. This contrasts with countries where a single reimbursement decision covers all approved indications.',
        },
    },
    {
        code: "DK",
        name: "Denmark",
        flag: "🇩🇰",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "DKMA (Danish Medicines Agency)", url: "https://laegemiddelstyrelsen.dk/en/" },
                    { label: "DKMA — Find Medicines (product database)", url: "https://laegemiddelstyrelsen.dk/en/sideeffects/find-medicines/" },
                    { label: "DKMA — Downloadable Medicine Lists (Excel)", url: "https://laegemiddelstyrelsen.dk/en/sideeffects/find-medicines/lists-with-information-about-medicines/" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "Medicinr\u00e5det (Danish Medicines Council) provides independent recommendations on new hospital medicines, evaluating clinical added value against cost. Amgros conducts parallel price negotiations. No formal cost-per-QALY threshold is published.",
                links: [
                    { label: "Medicinr\u00e5det (Danish Medicines Council)", url: "https://medicinraadet.dk/" },
                    { label: "Medicinr\u00e5det — English Overview", url: "https://medicinraadet.dk/om-os/in-english" },
                    { label: "Medicinr\u00e5det — Recommendations & Guidelines", url: "https://medicinraadet.dk/anbefalinger-og-vejledninger" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Denmark uses free pricing with internal reference pricing and mandatory generic substitution. Prices are updated every 14 days via blind reporting. The reimbursement price equals the cheapest product in each substitution group. Amgros handles hospital procurement and price negotiations.",
                links: [
                    { label: "MedicinPriser.dk (official price database, English)", url: "https://www.medicinpriser.dk/?lng=2" },
                    { label: "DKMA — Prices of Medicines", url: "https://laegemiddelstyrelsen.dk/en/reimbursement/prices/" },
                    { label: "DKMA — AIP to Consumer Price Conversion", url: "https://laegemiddelstyrelsen.dk/en/reimbursement/prices/conversion-to-consumer-price/" },
                    { label: "Amgros — Hospital Price Negotiations & Tendering", url: "https://amgros.dk/en/pharmaceuticals/price-negotiations-and-tendering/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Denmark operates a needs-based subsidy system where reimbursement percentage increases with annual spending: 0% up to DKK 1,110, then 50%, 75%, 85%, and 100% above the annual cap (~DKK 4,735). The CTR (Central Reimbursement Register) tracks each individual's spending.",
                links: [
                    { label: "DKMA — Reimbursement Overview", url: "https://laegemiddelstyrelsen.dk/en/reimbursement/" },
                    { label: "DKMA — Reimbursement Thresholds", url: "https://laegemiddelstyrelsen.dk/en/reimbursement/reimbursement-thresholds/" },
                    { label: "DKMA — General Reimbursement", url: "https://laegemiddelstyrelsen.dk/en/reimbursement/general-reimbursement" },
                    { label: "DKMA — Individual Reimbursement", url: "https://laegemiddelstyrelsen.dk/en/reimbursement/individual-reimbursement" },
                ],
            },
            {
                id: "early_access",
                title: "Early Access Programs",
                body: "Denmark has multiple pathways for early access to medicines. The primary system is compassionate use permits (udleveringstilladelser), governed by Section 29 of the Danish Medicines Act (L\u00e6gemiddelloven). The DKMA processes ~9,000 applications per year. Two permit types exist: individual (enkelt udleveringstilladelse) for a single patient, and general (generel udleveringstilladelse) for a patient group. Since January 2024, Section 29(2) also allows DKMA to proactively authorize non-marketed medicines during supply shortages without a doctor\u2019s application. Additionally, the Expert Advisory Panel (Sundhedsstyrelsen, Health Act Section 89) advises on experimental treatment for patients with life-threatening diseases, and Individuel ibrugtagning allows hospital physicians to request access to EMA-approved medicines not yet recommended by Medicinr\u00e5det.",
                links: [
                    { label: "DKMA \u2014 Compassionate Use Permits (English)", url: "https://laegemiddelstyrelsen.dk/en/licensing/compassionate-use-permits/" },
                    { label: "DKMA \u2014 Udleveringstilladelser (Danish, with application forms)", url: "https://laegemiddelstyrelsen.dk/da/godkendelse/udleveringstilladelser/mennesker/" },
                    { label: "DKMA \u2014 Application Guide (vejledning til ans\u00f8gningsskema)", url: "https://laegemiddelstyrelsen.dk/da/godkendelse/udleveringstilladelser/mennesker/vejledning-til-ansoegningsskema-om-human-enkelt-og-human-generel-udleveringstilladelse" },
                    { label: "DKMA \u2014 Foreign Medicines under Section 29(2) (supply shortages)", url: "https://laegemiddelstyrelsen.dk/da/godkendelse/kontrol-og-inspektion/mangel-paa-medicin/udenlandske-laegemidler-som-kan-udleveres-efter-laegemiddellovens-29,-stk-2/" },
                    { label: "Sundhedsstyrelsen \u2014 Expert Panel for Experimental Treatment", url: "https://www.sst.dk/udgivelser/2025/raadgivning-om-eksperimentel-behandling-af-mennesker-med-livstruende-sygdom-i-2024" },
                    { label: "EMA \u2014 EU Compassionate Use Framework", url: "https://www.ema.europa.eu/en/human-regulatory-overview/research-development/compassionate-use" },
                    { label: "Virk.dk \u2014 Online Application for Individual Permit", url: "https://virk.dk/myndigheder/stat/DKMA/selvbetjening/Ansoegning_om_human_enkelt_udleveringstilladelse/" },
                    { label: "L\u00e6gemiddelloven Section 29 (legal text)", url: "https://www.elov.dk/laegemiddelloven/paragraf/29/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Pro.medicin.dk (professional drug monographs)", url: "https://pro.medicin.dk" },
                    { label: "Amgros (hospital procurement agency)", url: "https://amgros.dk/en/" },
                    { label: "Medstat.dk (medicine sales statistics)", url: "https://medstat.dk/en" },
                    { label: "Danish Pharmacists Association", url: "https://www.apotekerforeningen.dk/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">HTA &mdash; Medicinr&aring;det (Danish Medicines Council)</h4>
<ol>
    <li><a href="https://medicinraadet.dk/anbefalinger-og-vejledninger" target="_blank" rel="noopener">Recommendations &amp; guidelines</a> lists all published decisions, organized by therapeutic area. Each includes the Council's decision, clinical assessment, and rationale</li>
    <li>Outcome categories: <strong>Recommended as possible standard treatment</strong>, <strong>Not recommended</strong>, <strong>Recommended for a restricted subpopulation</strong>, or <strong>Deferred</strong> (pending price negotiations)</li>
    <li>The Council uses QALYs (since 2021) and the GRADE system for evidence quality, but unlike NICE, there is <strong>no published cost-per-QALY threshold</strong> &mdash; the assessment is whether the clinical benefit is "proportionate to the cost"</li>
    <li>Amgros negotiates hospital drug prices in parallel with the clinical assessment. Negotiated prices are <strong>confidential</strong></li>
</ol>
<p class="tips-note"><strong>Historical note:</strong> Medicinr&aring;det replaced RADS (2009&ndash;2016) and KRIS on January 1, 2017. Legacy RADS guidelines at <a href="https://rads.dk/" target="_blank" rel="noopener">rads.dk</a> should be considered outdated.</p>

<h4 class="tips-heading">Reimbursement &mdash; The Subsidy Ladder (Tilskudstrappen)</h4>
<ol>
    <li>The system is <strong>individual-based</strong>, not product-based. Each person's accumulated annual spending determines their reimbursement rate, tracked in the CTR (Central Reimbursement Register)</li>
    <li><strong>2025 thresholds (adults 18+):</strong> 0% up to DKK 1,110 &rarr; 50% &rarr; 75% &rarr; 85% &rarr; <strong>100% above ~DKK 4,735</strong> (annual cap). Children under 18 get minimum 60% from first purchase</li>
    <li><strong>General reimbursement</strong> (generelt tilskud): applied automatically at the pharmacy. <strong>Conditional</strong> (klausuleret): only for specific diseases, doctor must confirm eligibility. <strong>Individual</strong> (individuelt): doctor applies to DKMA for specific patients</li>
    <li>Individual subtypes: <strong>Enkelttilskud</strong> (for drugs without general reimbursement, processed within 14 days), <strong>Forh&oslash;jet tilskud</strong> (increased reimbursement when patient needs a costlier product), <strong>Terminaltilskud</strong> (100% for terminally ill)</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Use <a href="https://laegemiddelstyrelsen.dk/en/reimbursement/prices/search-for-prices/calculate-your-co-payment/" target="_blank" rel="noopener">DKMA's co-payment calculator</a> to compute exact patient costs based on CTR balance.</p>

<h4 class="tips-heading">Pricing &amp; Substitution</h4>
<ol>
    <li><a href="https://www.medicinpriser.dk/?lng=2" target="_blank" rel="noopener">MedicinPriser.dk</a> is the central price/reimbursement database. Search by product name, substance, product number, or ATC code. Shows price history since 1998. Updated every 14 days</li>
    <li><strong>Mandatory generic substitution:</strong> pharmacists must offer the cheapest product in the substitution group. Patients can decline but pay the difference. Doctors can prohibit substitution but the patient bears the cost</li>
    <li><strong>Internal reference pricing:</strong> reimbursement is based on the cheapest available product in each substitution group, not the actual purchase price</li>
    <li><strong>14-day blind price cycles:</strong> companies report AIP changes without seeing competitors' prices. This aggressive biweekly competition drives Denmark to have some of Europe's lowest generic prices</li>
</ol>

<h4 class="tips-heading">Hospital Procurement via Amgros</h4>
<ol>
    <li><a href="https://amgros.dk/en/" target="_blank" rel="noopener">Amgros</a> is the sole procurement agency for Danish public hospitals (owned by the five regions)</li>
    <li>New medicines: Medicinr&aring;det assesses clinical value while Amgros negotiates price in parallel &rarr; Council decides based on both</li>
    <li>Generics/biosimilars: Amgros runs EU tenders (typically 1-year cycles, April&ndash;March). In 2024, hospital purchases totaled DKK 10.2 billion with 49% savings vs. list prices</li>
    <li>Quarterly <a href="https://www.amgros.dk/viden-og-analyser/rapporteringer/markedsovervaagning/" target="_blank" rel="noopener">Market Surveillance reports</a> track spending, volumes, and compliance with Medicinr&aring;det recommendations</li>
</ol>
<h4 class="tips-heading">Early Access &mdash; Compassionate Use Permits (Udleveringstilladelser)</h4>
<p>Denmark provides access to non-marketed medicines through <strong>compassionate use permits</strong> (udleveringstilladelser), regulated under <a href="https://www.elov.dk/laegemiddelloven/paragraf/29/" target="_blank" rel="noopener">Section 29 of the Danish Medicines Act</a> (L&aelig;gemiddelloven). The DKMA processes approximately <strong>9,000 applications per year</strong>.</p>
<ol>
    <li><strong>Two permit types:</strong>
        <ul>
            <li><strong>Enkelt udleveringstilladelse</strong> (individual permit) &mdash; for a single named patient. The treating physician applies to DKMA specifying the indication and why marketed alternatives are inadequate</li>
            <li><strong>Generel udleveringstilladelse</strong> (general permit) &mdash; for a group of patients at a hospital department or practice. Covers a specific product for a defined patient population</li>
        </ul>
    </li>
    <li><strong>Key requirements:</strong> the medicine must be manufactured by a pharmaceutical company (magistral/pharmacy-compounded products have a separate route); there must be no adequate marketed alternative in Denmark; the product is typically authorized abroad; and sufficient therapeutic justification must be documented</li>
    <li><strong>Application process:</strong> physicians, dentists, or veterinarians submit applications to DKMA (email: <code>udleveringstilladelser@dkma.dk</code>). Individual permits can also be submitted digitally via <a href="https://virk.dk/myndigheder/stat/DKMA/selvbetjening/Ansoegning_om_human_enkelt_udleveringstilladelse/" target="_blank" rel="noopener">Virk.dk</a> using NemLog-In. The application must state the indication, justify why no marketed alternative suffices, and describe previous treatment</li>
    <li><strong>Urgent cases (HASTER):</strong> mark the application <strong>&ldquo;HASTER&rdquo;</strong> after the applicant&rsquo;s name &mdash; DKMA commits to a <strong>response within 24 hours</strong> (weekdays) for urgent individual permits</li>
    <li><strong>Validity:</strong> permits are valid for up to <strong>5 years</strong>. A new application is required for renewal (submit one month before expiry). The permit <strong>lapses</strong> if the medicine or a similar one becomes marketed in Denmark. Once approved, the physician notifies the pharmacy with a copy of the permit plus the prescription</li>
    <li><strong>Section 29(2) &mdash; supply shortages (new since Jan 2024):</strong> DKMA can now proactively authorize non-marketed foreign medicines <strong>without a doctor&rsquo;s application</strong> during supply disruptions. The <a href="https://laegemiddelstyrelsen.dk/da/godkendelse/kontrol-og-inspektion/mangel-paa-medicin/udenlandske-laegemidler-som-kan-udleveres-efter-laegemiddellovens-29,-stk-2/" target="_blank" rel="noopener">list of authorized foreign medicines</a> is regularly updated</li>
    <li><strong>National permits:</strong> DKMA also issues <strong>nationale udleveringstilladelser</strong> (national supply authorizations) for medicines needed due to supply shortages &mdash; published on <a href="https://www.sundhed.dk/sundhedsfaglig/information-til-praksis/syddanmark/almen-praksis/patientbehandling/laegemidler/udleveringstilladelser-og-restordre/nationale-udleveringstilladelser/" target="_blank" rel="noopener">Sundhed.dk</a></li>
    <li><strong>Physician obligations:</strong> prescribers have an <strong>enhanced information duty</strong> (sk&aelig;rpet informationspligt) and must report <strong>all</strong> suspected adverse reactions to the Danish Health Authority &mdash; stricter than normal post-marketing requirements</li>
</ol>

<h4 class="tips-heading">Early Access &mdash; Expert Advisory Panel (Eksperimentel Behandling)</h4>
<p>A separate early access pathway exists under <a href="https://danskelove.dk/sundhedsloven/89" target="_blank" rel="noopener">Section 89 of the Danish Health Act</a> (Sundhedsloven), administered by Sundhedsstyrelsen (Danish Health Authority):</p>
<ol>
    <li><strong>Target patients:</strong> those with <strong>life-threatening diseases</strong> (primarily cancer) who have exhausted standard-of-care options. Treating physicians refer patients to the Panel</li>
    <li><strong>Panel function:</strong> the Expert Advisory Panel (Ekspertpanelet) reviews each case and advises on experimental treatment options, clinical trial participation, or referral for treatment abroad</li>
    <li><strong>Infrastructure:</strong> supported by <strong>6 Experimental Cancer Treatment Units</strong> at major Danish hospitals (Rigshospitalet, Herlev, Odense, Vejle, Aarhus, Aalborg)</li>
    <li>The Panel evaluated <strong>11,034 cases from 9,603 cancer patients</strong> between 2003&ndash;2023. Volume has declined as previously experimental treatments became standard of care</li>
</ol>

<h4 class="tips-heading">Early Access &mdash; Individuel Ibrugtagning (Hospital Medicines)</h4>
<p>A hospital-level pathway managed by Danske Regioner (Danish Regions) for EMA-approved medicines not yet assessed or not recommended by Medicinr&aring;det:</p>
<ol>
    <li>Hospital physicians apply to their <strong>regional medicine committee</strong> for access to specific products for individual patients</li>
    <li>In 2023, Danish regions received ~<strong>400 applications</strong> for individuel ibrugtagning; 62% were approved or partially approved</li>
    <li>Since April 2024, <a href="https://www.regioner.dk/media/01opkwev/faelles-principper-for-individuel-vurdering-af-laegemidler-som-ikke-har-vaeret-behandlet-i-medicinraadet.pdf" target="_blank" rel="noopener">new Danske Regioner principles</a> urge regions to await Medicinr&aring;det&rsquo;s assessment before approving individuel ibrugtagning</li>
    <li>Physicians retain the legal right to deviate from Medicinr&aring;det recommendations when medically necessary for individual patients</li>
</ol>

<p class="tips-note"><strong>EU framework:</strong> Denmark&rsquo;s system operates within the broader EU compassionate use framework (Article 83, Regulation (EC) No 726/2004). The EMA&rsquo;s CHMP can issue recommendations for compassionate use of centrally authorized products, but implementation is national. Denmark is among the <strong>18 of 28 EU member states</strong> with fully nationalized compassionate use regulations. Notably, in Denmark managed access must be stated in the <strong>MIA for Human Medicinal Products</strong> (not the IMP MIA as in most other EU countries).</p>
<p class="tips-note"><strong>2024&ndash;2026 updates:</strong> Section 29(2) supply shortage pathway added (Jan 2024). Danske Regioner issued new individuel ibrugtagning principles (Apr 2024). DKMA updated documentation requirements for wholesale distributors (Nov 2024). From 1 January 2026, private individuals may legally import medicines for personal use from any country (excluding antibiotics, doping substances, and euphoriant substances).</p>

<p class="tips-note"><strong>Statistics:</strong> <a href="https://medstat.dk/en" target="_blank" rel="noopener">Medstat.dk</a> provides free, public aggregate data on all medicine sales in Denmark since 1996 (primary care) and 1997 (hospitals), searchable by ATC code, region, age, and sex.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Førstelinjevedligeholdelsesbehandling af lokalt fremskreden eller metastatisk urotelialt karcinom uden progression efter platinabaseret kemoterapi",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. As an EU member, Denmark is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "Medicinrådet Recommendation",
                    date: "23 June 2021",
                    detail: 'Medicinrådet (Danish Medicines Council) <strong>recommended avelumab as possible standard treatment</strong> (anbefalet som mulig standardbehandling) for maintenance therapy in patients with advanced urothelial carcinoma. The assessment took 113 days (16 weeks). The Council concluded that avelumab extends survival with tolerable side effects that do not impair quality of life, and that the relationship between clinical benefit and healthcare costs was <strong>reasonable</strong> at the Amgros-negotiated (confidential) price. The recommendation covers patients in good general condition (ECOG PS 0–1) whose disease has not progressed after platinum-based chemotherapy. Medicinrådet explicitly <strong>did not recommend</strong> avelumab for patients who cannot tolerate cisplatin and receive first-line immunotherapy instead.',
                    links: [
                        { label: "Medicinrådet — Avelumab for urotelialt carcinom", url: "https://medicinraadet.dk/anbefalinger-og-vejledninger/laegemidler-og-indikationsudvidelser/a/avelumab-bavencio-urotelialt-carcinom" },
                    ],
                },
                {
                    title: "Hospital Procurement via Amgros",
                    date: "From July 2021",
                    detail: 'Following the positive Medicinrådet recommendation, avelumab became available through Danish public hospitals procured by Amgros. As a hospital-administered IV drug, avelumab bypasses the community pharmacy reimbursement system (MedicinPriser/DKMA). The Amgros-negotiated price is <strong>confidential</strong> — public list prices do not reflect the actual acquisition cost. Compliance with Medicinrådet recommendations across Danish regions is typically very high.',
                    links: [
                        { label: "Amgros — Hospital Procurement", url: "https://amgros.dk/en/" },
                    ],
                },
            ],
            takeaway: 'Denmark\'s Medicinrådet pathway for hospital drugs is one of the fastest in Europe: just 5 months from EC approval (January 2021) to recommendation (June 2021), with a 113-day assessment timeline. The parallel process — Amgros negotiating price while Medicinrådet assesses clinical value — accelerates access. Unlike NICE, Medicinrådet does not publish a cost-per-QALY threshold; instead, it assesses whether clinical benefit is "proportionate to cost" at the negotiated price.',
        },
    },
    {
        code: "EG",
        name: "Egypt",
        flag: "🇪🇬",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "EDA (Egyptian Drug Authority), established in 2020, replaced the former CAPA and handles all drug registration, quality control, and pharmacovigilance. The EDA Drug Registry Search allows querying all registered pharmaceutical products in Egypt.",
                links: [
                    { label: "EDA \u2014 Drug Registry Search", url: "http://eservices.edaegypt.gov.eg/EDASearch/SearchRegDrugs.aspx" },
                    { label: "EDA \u2014 Official Website", url: "https://edaegypt.gov.eg/en/" },
                    { label: "EDA \u2014 Egyptian Drug Registry (publications)", url: "https://edaegypt.gov.eg/en/eda-publications/the-egyptian-drug-registry/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Egypt uses government-controlled drug pricing administered by CAPA (within the EDA). Under Decree 499/2012, innovator prices are set at 10% below the lowest retail price across 36 reference countries. Generic prices are set at a 35% markdown (first 5 generics) or 40% (subsequent). Public sector procurement is centralised through UPA (Unified Procurement Authority).",
                links: [
                    { label: "EDA \u2014 Pricing Circulars & Updates", url: "https://edaegypt.gov.eg/en/eda-publications/" },
                    { label: "UPA (Unified Procurement Authority)", url: "https://upa.gov.eg/introduction/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Egypt\u2019s Universal Health Insurance Law (2018) is being phased in through UHIA (Universal Health Insurance Authority), aiming for nationwide coverage by 2032. Currently, HIO (Health Insurance Organisation) covers formal-sector employees and their dependants (~60% of the population). The UHIA is piloting in Port Said, Luxor, Ismailia, South Sinai, Aswan, and Suez governorates. The Ministry of Health also maintains an Essential Drug List (EDL) for public hospital procurement.",
                links: [
                    { label: "UHIA (Universal Health Insurance Authority)", url: "https://uhia.gov.eg/" },
                    { label: "HIO (Health Insurance Organisation)", url: "http://www.hio.gov.eg/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Ministry of Health & Population", url: "https://www.mohp.gov.eg/" },
                    { label: "WHO \u2014 Egypt Essential Drug List 2018", url: "https://www.who.int/publications/m/item/egypt--essential-drug-list-2018-(english)" },
                    { label: "GAHAR (Healthcare Accreditation & Regulation)", url: "https://www.gahar.gov.eg/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization</h4>
<ol>
    <li>Search the <a href="http://eservices.edaegypt.gov.eg/EDASearch/SearchRegDrugs.aspx" target="_blank" rel="noopener">EDA Drug Registry Search</a> by product name, active ingredient, or company name to find all registered drugs</li>
    <li>The <a href="https://edaegypt.gov.eg/en/eda-publications/the-egyptian-drug-registry/" target="_blank" rel="noopener">Egyptian Drug Registry</a> is published periodically as a downloadable document listing all registered products</li>
    <li>EDA (Law 151/2019) replaced CAPA in 2020 and consolidated three former bodies: CAPA (registration), NODCAR (quality control), and NORCB (biologicals). EDA reports directly to the Prime Minister, not the Ministry of Health</li>
</ol>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>Drug prices are <strong>government-controlled</strong> under Decree 499/2012 &mdash; manufacturers cannot freely set prices</li>
    <li><strong>Innovator products</strong>: price set at 10% below the lowest retail price across a basket of <strong>36 reference countries</strong></li>
    <li><strong>Generics</strong>: first 5 generics at 35% markdown from innovator price; subsequent generics at 40% markdown</li>
    <li>Price reviews are permitted for new indications and when exchange rate fluctuations exceed 15% in a year</li>
    <li><a href="https://upa.gov.eg/introduction/" target="_blank" rel="noopener">UPA</a> (Unified Procurement Authority) handles all public-sector pharmaceutical procurement and is developing <strong>cost-effectiveness assessment</strong> capacity for innovative medicines</li>
</ol>

<h4 class="tips-heading">Reimbursement &amp; HTA</h4>
<ol>
    <li>The <strong>Universal Health Insurance Law (2018)</strong> is being phased in through <a href="https://uhia.gov.eg/" target="_blank" rel="noopener">UHIA</a> &mdash; Phase 1 (Port Said, Ismailia, Suez, South Sinai, Luxor, Aswan) is largely complete; Phase 2 (Damietta, Marsa Matrouh, Kafr El-Sheikh, North Sinai, Minya) is in progress</li>
    <li>Until full rollout, <strong>HIO</strong> covers formal-sector employees (~60% of population on paper), and public hospitals provide medicines from the government Essential Drug List</li>
    <li><strong>HTA is emerging</strong>: UPA handles cost-effectiveness assessment and UHIA handles budget impact analysis in a joint process. Innovative medicines require HTA dossier for UHIA formulary listing. Egypt has been collaborating with <strong>NICE (UK)</strong> on developing its national HTA framework</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> EDA website is available in English and Arabic. The drug registry search interface supports English queries. Pricing circulars are primarily in Arabic.</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial EDA registration); subsequently expanded to NSCLC and other oncology indications",
            steps: [
                {
                    title: "EDA Registration",
                    date: "2017\u20132018",
                    detail: 'The EDA (Egyptian Drug Authority, formerly NODCAR) registered pembrolizumab for advanced melanoma and NSCLC. Egypt has its own national regulatory pathway, though it has streamlined procedures for products approved by reference agencies (FDA, EMA, MHRA). Registration timelines for innovative oncology drugs typically run 12\u201324 months. EDA registration is a prerequisite for both public and private market availability.',
                    links: [
                        { label: "EDA \u2014 Drug Registry Search", url: "https://www.edaegypt.gov.eg/en/services/drug-registration/drug-search/" },
                    ],
                },
                {
                    title: "Pricing \u2014 Supreme Pricing Committee",
                    date: "2018",
                    detail: 'The <strong>Supreme Pricing Committee</strong> sets drug prices in Egypt based on external reference pricing and cost-plus calculations. Egypt uses one of the lowest pricing benchmarks globally \u2014 innovative drug prices are typically 50\u201370% below US/EU levels. The price is set in EGP (Egyptian Pound), and currency devaluations (three major devaluations 2022\u20132024, from ~EGP 16/USD to ~EGP 48/USD) have made Egypt\u2019s prices among the lowest globally in USD terms, creating supply-chain challenges as manufacturers face below-cost pricing.',
                    links: [
                        { label: "EDA \u2014 Official Website", url: "https://www.edaegypt.gov.eg/en/" },
                    ],
                },
                {
                    title: "Public Hospital Procurement & UHIA",
                    date: "Ongoing",
                    detail: 'Access to pembrolizumab in Egypt\u2019s public sector is primarily through <strong>MOH hospital procurement</strong> and the <strong>National Cancer Institute (NCI Cairo)</strong>. The <strong>UHIA</strong> (Universal Health Insurance Authority), established under the 2018 law, is gradually expanding coverage (Phase 1 covering 6 governorates as of 2024), with innovative medicines requiring an HTA dossier for UHIA formulary listing. Egypt is collaborating with <strong>NICE (UK)</strong> on developing its national HTA framework. Until UHIA rollout is complete, most patients access pembrolizumab through public hospital allocation (limited), private-sector purchase (expensive), or charity/NGO support.',
                    links: [
                        { label: "UHIA (Universal Health Insurance Authority)", url: "https://uhia.gov.eg/" },
                    ],
                },
            ],
            takeaway: 'Egypt illustrates the challenge of pharmaceutical access during major economic transitions: multiple EGP devaluations have made drug pricing untenable for many manufacturers, creating supply concerns. The UHIA rollout promises systematic HTA-based formulary management, but full national coverage is years away. Access to pembrolizumab remains fragmented between public hospital allocation (limited by budget), private sector (expensive for most Egyptians), and emerging UHIA coverage (geographically limited).',
        },
    },
    {
        code: "EE",
        name: "Estonia",
        flag: "🇪🇪",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "Ravimiregister", url: "https://www.ravimiregister.ee/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                body: "Haigekassa (Estonian Health Insurance Fund, EHIF) manages three reimbursement tiers: 100% (severe chronic or rare conditions on the special conditions list), 75% (standard compensated medicines), and 50% (selected medicines). Individual compensation is possible for off-list drugs via application.",
                links: [{ label: "Raviminfo \u2014 Reimbursed Drugs and Prices", url: "https://raviminfo.ee/apthkiri.php" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Haigekassa \u2014 How Reimbursement Works", url: "https://www.haigekassa.ee/inimesele/ravimid" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Ravimiregister &mdash; Drug Register</h4>
<ol>
    <li><a href="https://www.ravimiregister.ee/" target="_blank" rel="noopener">Ravimiregister</a> is Estonia&rsquo;s comprehensive drug register &mdash; search by product name or INN for MA status, approved indications, SmPC, and pricing. It is one of the most complete national drug databases in the EU</li>
    <li>The register has English and Estonian interfaces &mdash; the English version covers most key fields including MA status and product leaflets</li>
</ol>

<h4 class="tips-heading">Haigekassa Reimbursement Tiers</h4>
<ol>
    <li><strong>100% reimbursement</strong>: medicines on the special conditions list for severe chronic or rare diseases &mdash; patient pays nothing. A physician must certify the condition</li>
    <li><strong>75% reimbursement</strong>: standard compensated medicines &mdash; patient pays 25% co-payment</li>
    <li><strong>50% reimbursement</strong>: selected medicines with a lower reimbursement percentage</li>
    <li>Medicines <strong>not on the positive list</strong> can be applied for individually through Haigekassa under specific circumstances (e.g., no therapeutic alternative on the list)</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Search <a href="https://raviminfo.ee/apthkiri.php" target="_blank" rel="noopener">Raviminfo</a> for current reimbursement status and price &mdash; the database shows the reimbursement percentage and the patient&rsquo;s share of the cost. Language: Estonian, but INN terms are searchable in Latin characters.</p>
        `,
    },
    {
        code: "FI",
        name: "Finland",
        flag: "🇫🇮",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "FIMEA (Finnish Medicines Agency)", url: "https://fimea.fi/web/en" },
                    { label: "FIMEA \u2014 National Medicines Database", url: "https://messi.fimea.fi/" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "FIMEA (Finnish Medicines Agency) conducts HTA assessments of medicines (rapid reviews and full assessments). Hila (Pharmaceutical Pricing Board) makes reimbursement and pricing decisions based on FIMEA assessments and company applications.",
                links: [
                    { label: "FIMEA \u2014 HTA Assessments", url: "https://fimea.fi/laakehoidon-arviointi/arviointijulkaisut" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Two reimbursement tiers: Basic reimbursement (40%) and Special reimbursement (65% or 100% for severe chronic conditions). Hila maintains the reimbursable medicines list. Kela (Social Insurance Institution) reimburses patients at the pharmacy.",
                links: [
                    { label: "Hila \u2014 Reimbursable Medicines List", url: "https://www.hila.fi/luettelot/korvattavat-myyntiluvalliset-laakevalmisteet/" },
                    { label: "Kela \u2014 Drug Reimbursement Search", url: "https://asiointi.kela.fi/laakekys_app/LaakekysApplication/Valmisteet" },
                ],
            },
        ],
        notes: "Kela reimbursement covers community pharmacy drugs only \u2014 hospital and oncology drugs are funded separately by hospital districts and are not in the Kela/Hila system.",
        tipsHtml: `
<h4 class="tips-heading">Reimbursement Tiers (Kela / Hila)</h4>
<ol>
    <li><strong>Basic reimbursement (peruskorvaus, 40%)</strong>: most common outpatient prescription medicines. Patient pays 60% of the price up to the reference price; above the reference price the patient pays 100%</li>
    <li><strong>Lower special reimbursement (alempi erityiskorvaus, 65%)</strong>: for specific severe chronic diseases (e.g., asthma, diabetes type 2, rheumatoid arthritis). Requires a written medical certificate from a specialist</li>
    <li><strong>Higher special reimbursement (ylempi erityiskorvaus, 100%)</strong>: for the most severe chronic diseases (e.g., severe diabetes type 1, severe epilepsy, severe hypertension, cancer). Patient pays a fixed annual co-payment ceiling of ~EUR 50 per medicine</li>
    <li>Annual out-of-pocket cap: once a patient&rsquo;s total Kela-reimbursed medicine costs reach ~EUR 592/year (2025), all further prescriptions on the list are reimbursed at 100% for the rest of the year</li>
</ol>
<p class="tips-note"><strong>Hospital drugs:</strong> Drugs dispensed in hospitals or hospital outpatient clinics are funded directly by hospital districts and do NOT appear in the Kela/Hila system. This includes oncology drugs and most biologics &mdash; search FIMEA&rsquo;s <a href="https://fimea.fi/laakehoidon-arviointi/arviointijulkaisut" target="_blank" rel="noopener">HTA assessment publications</a> for evidence of hospital-sector use.</p>

<h4 class="tips-heading">FIMEA HTA &amp; Hila Decisions</h4>
<ol>
    <li>FIMEA (Finnish Medicines Agency) conducts rapid HTA reviews for medicines applying for reimbursement. Reports are published at <a href="https://fimea.fi/laakehoidon-arviointi/arviointijulkaisut" target="_blank" rel="noopener">fimea.fi</a> (primarily in Finnish; some English summaries)</li>
    <li>Hila (Pharmaceutical Pricing Board) makes binding reimbursement and wholesale price decisions. The process typically runs ~180 days from company application</li>
    <li>To check if a specific drug has Hila approval, search the <a href="https://www.hila.fi/luettelot/korvattavat-myyntiluvalliset-laakevalmisteet/" target="_blank" rel="noopener">Hila list of reimbursable medicines</a> or use the <a href="https://asiointi.kela.fi/laakekys_app/LaakekysApplication/Valmisteet" target="_blank" rel="noopener">Kela drug search</a></li>
</ol>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Paikallisesti edenneen tai etäpesäkkeisen uroteelikarsinooman ensilinjan ylläpitohoito potilailla, joiden tauti ei ole edennyt platinapohjaisen kemoterapian jälkeen",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. As an EU member, Finland is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "PALKO (COHERE Finland) Recommendation",
                    date: "1 September 2021",
                    detail: 'Palveluvalikoima­neuvosto PALKO (COHERE Finland — Council for Choices in Health Care) issued its final recommendation on 1 September 2021, following a draft recommendation approved on 17 June 2021 and public consultation until 4 August 2021. PALKO concluded that avelumab <strong>belongs in the publicly funded service basket</strong> for first-line maintenance UC, conditional on a <strong>sufficient price reduction</strong> between the marketing authorization holder and purchaser. The ICER was approximately <strong>€96,000/QALY</strong> at list price, with additional costs of ~€60,000/patient vs. BSC. The average OS benefit was ~7 months for this poor-prognosis group.',
                    links: [
                        { label: "PALKO — Avelumab recommendation announcement", url: "https://palveluvalikoima.fi/-/avelumabi-uroteelikarsinooman-ensilinjan-hoidosssa-suositusluonnos-kommentoitavana" },
                        { label: "Suomen Syöpäpotilaat — PALKO recommendation", url: "https://www.syopapotilaat.fi/ajankohtaista/verkkouutiset/palveluvalikoimaneuvosto-hyvaksyi-suosituksen-avelumabi-uroteelikarsinooman-ensilinjan-hoidossa/" },
                    ],
                },
                {
                    title: "Hospital Sector Funding",
                    date: "From late 2021",
                    detail: 'As a hospital-administered IV infusion, avelumab is funded through <strong>hospital district budgets</strong> — it does NOT appear in the Kela/Hila outpatient reimbursement system. Finnish hospital districts (now wellbeing services counties since 2023) procure oncology drugs directly, negotiating prices with manufacturers. Access and pricing may vary between regions depending on local procurement decisions and budget constraints.',
                    links: [
                        { label: "FIMEA — HTA Assessments", url: "https://fimea.fi/laakehoidon-arviointi/arviointijulkaisut" },
                    ],
                },
            ],
            takeaway: 'Finland\'s dual-track system is clearly visible here: PALKO (not Hila/Kela) assessed avelumab because it\'s a hospital drug. PALKO\'s conditional recommendation (requiring a price reduction from list price) reflects Finland\'s approach to balancing access with cost-effectiveness. The €96,000/QALY ICER at list price exceeded acceptable thresholds, making confidential price negotiations essential. Users researching hospital oncology drugs in Finland should look at PALKO recommendations, not the Kela/Hila system.',
        },
    },
    {
        code: "FR",
        name: "France",
        flag: "🇫🇷",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "France participates in the EMA centralised procedure for most new medicines. National authorisations and mutual recognition procedures are managed by ANSM (Agence nationale de sécurité du médicament et des produits de santé).",
                links: [
                    { label: "ANSM (National Medicines Agency)", url: "https://ansm.sante.fr/en" },
                    { label: "EMA — Centralised procedure", url: "https://www.ema.europa.eu/en/human-regulatory-overview/marketing-authorisation/centralised-procedure" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "HTA in France is conducted by HAS (Haute Autorité de Santé) through the Commission de la Transparence (CT). The CT evaluates SMR (Service Médical Rendu — clinical benefit) and ASMR (Amélioration du SMR — improvement over comparator, rated I–V). SMR drives listing decisions; ASMR determines price premiums.",
                links: [
                    { label: "HAS (Haute Autorité de Santé)", url: "https://www.has-sante.fr/jcms/c_5443/en/has-haute-autorite-de-sante" },
                    { label: "Commission de la Transparence opinions", url: "https://www.has-sante.fr/jcms/c_452455/en/transparency-committee" },
                    { label: "BDPM (Public Medicines Database)", url: "https://base-donnees-publique.medicaments.gouv.fr" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "Reimbursement listing and price are negotiated with CEPS (Comité Économique des Produits de Santé) based on the ASMR rating. Early access (Accès Précoce) is available for innovative products pending full HTA.",
                links: [
                    { label: "CEPS (Economic Committee for Health Products)", url: "https://sante.gouv.fr/ministere/acteurs/instances-rattachees/comite-economique-des-produits-de-sante-ceps/" },
                    { label: "HAS — Early Access (Accès Précoce)", url: "https://www.has-sante.fr/jcms/p_3269698/en/acces-precoce" },
                    { label: "ANSM — Medicines in Early/Compassionate Access", url: "https://ansm.sante.fr/documents/reference/medicaments-en-acces-derogatoires/les-acces-precoces-aap" },
                    { label: "Liste en sus (hospital drugs)", url: "https://sante.gouv.fr/soins-et-maladies/medicaments/professionnels-de-sante/autorisation-de-mise-sur-le-marche/la-liste-en-sus/" },
                    { label: "Journal Officiel — Reimbursement Decisions (Légifrance)", url: "https://www.legifrance.gouv.fr/jorf/jo" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization</h4>
<p>Most new innovative medicines are authorised via the EMA centralised procedure. National authorisations (AMM nationale) and mutual recognition / decentralised procedures are managed by ANSM.</p>
<ol>
    <li>Search the <a href="https://base-donnees-publique.medicaments.gouv.fr" target="_blank" rel="noopener">BDPM (Base de Données Publique des Médicaments)</a> by product name, INN, or CIS code — this is the most comprehensive French drug database</li>
    <li>For EMA-authorised products, check the <a href="https://www.ema.europa.eu/en/medicines/human/EPAR" target="_blank" rel="noopener">EPAR database</a> for the full European Public Assessment Report</li>
</ol>

<h4 class="tips-heading">HTA Assessment (HAS / Commission de la Transparence)</h4>
<p>The Commission de la Transparence (CT) evaluates all medicines seeking reimbursement. Two key ratings are issued:</p>
<ol>
    <li>Go to the <a href="https://www.has-sante.fr/jcms/c_452455/en/transparency-committee" target="_blank" rel="noopener">HAS Transparency Committee page</a> and search by product name or INN</li>
    <li>Each CT opinion (Avis de la CT) provides:
        <ul>
            <li><strong>SMR (Service Médical Rendu)</strong> — clinical benefit rating: Important, Modéré, Faible, or Insuffisant. An "Insuffisant" SMR means the product will not be reimbursed</li>
            <li><strong>ASMR (Amélioration du SMR)</strong> — improvement over existing therapies: I (major) → II (important) → III (moderate) → IV (minor) → V (no improvement)</li>
        </ul>
    </li>
    <li>The ASMR rating directly influences price negotiations with CEPS — ASMR I–III can command a price premium vs. comparators; ASMR IV–V are typically priced at or below comparator level</li>
    <li>Look for the <strong>Population cible</strong> (target population) estimate in the CT opinion — this is the estimated number of eligible patients and is critical for budget impact analysis</li>
</ol>
<p class="tips-note"><strong>SMR scale:</strong> Important (green) → Modéré (amber) → Faible (low) → Insuffisant (red = not reimbursed). Most innovative medicines receive SMR "Important".</p>

<h4 class="tips-heading">Reimbursement &amp; Pricing</h4>
<ol>
    <li>After a positive CT opinion (SMR ≥ Faible), the product enters price negotiation with <a href="https://sante.gouv.fr/ministere/acteurs/instances-rattachees/comite-economique-des-produits-de-sante-ceps/" target="_blank" rel="noopener">CEPS</a></li>
    <li>Official reimbursement listing is published in the <strong>Journal Officiel</strong> (JO) — search on <a href="https://www.legifrance.gouv.fr" target="_blank" rel="noopener">Légifrance</a> for the product name to find the JO publication with the reimbursement rate (typically 65% or 100% for serious/chronic conditions)</li>
    <li>The <a href="https://base-donnees-publique.medicaments.gouv.fr" target="_blank" rel="noopener">BDPM</a> shows the current public price (Prix public TTC), reimbursement rate (taux de remboursement), and whether the product is on the T2A hospital list (GHS)</li>
    <li>For hospital-only products, check the <strong>Liste en sus</strong> — products on this list are reimbursed on top of the DRG tariff</li>
</ol>

<h4 class="tips-heading">Early Access (Accès Précoce / Accès Compassionnel)</h4>
<ol>
    <li><strong>Accès Précoce</strong> (formerly ATU nominative/cohort): HAS grants early access for innovative products with presumed strong ASMR (I–III) pending full CT evaluation. Check the <a href="https://www.has-sante.fr/jcms/p_3269698/en/acces-precoce" target="_blank" rel="noopener">HAS Early Access page</a></li>
    <li><strong>Accès Compassionnel</strong>: for products without a marketing authorisation, used case-by-case. Managed by ANSM</li>
    <li>Early access products are funded by the <strong>Liste en sus</strong> mechanism and the manufacturer must apply for full HTA within a set timeframe</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> The BDPM database is searchable in French only. Use Google Translate or search by INN (international nonproprietary name) which is typically in English/Latin.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Traitement d'entretien en première ligne du carcinome urothélial localement avancé ou métastatique sans progression après chimiothérapie à base de platine",
            steps: [
                {
                    title: "Marketing Authorization (EMA/EC)",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. Based on JAVELIN Bladder 100 (Phase III, N=700): median OS 21.4 vs 14.3 months (HR 0.69). Avelumab was already authorised in the EU for Merkel cell carcinoma since 2017.',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "HAS — Commission de la Transparence Opinion",
                    date: "March 2021",
                    detail: 'The CT evaluated Bavencio for the UC maintenance indication. Key outcomes:<br><br><strong>SMR: Important</strong> — clinical benefit recognised as sufficient for reimbursement.<br><strong>ASMR: III (moderate improvement)</strong> — HAS considered the OS benefit of ~7 months over BSC a moderate therapeutic advance. The cost-effectiveness ratio was estimated at <strong>€188,451/QALY</strong> vs. best supportive care over a 10-year horizon — well above typical French thresholds, with an estimated +167% increase in health insurance spending for this indication. The population cible (target population) was estimated at approximately 2,500 patients/year.',
                    links: [
                        { label: "HAS Avis CT — Bavencio (carcinome urothélial)", url: "https://www.has-sante.fr/jcms/p_3243896/fr/bavencio-carcinome-urothelial-avelumab" },
                    ],
                },
                {
                    title: "CEPS Price Negotiation & Reimbursement",
                    date: "2021–2022",
                    detail: 'Following the SMR Important / ASMR III rating, CEPS negotiated the reimbursement price. Bavencio was classified as a hospital-only product on the <strong>Liste en sus</strong> — reimbursed on top of the DRG tariff for hospital oncology. The reimbursement rate is <strong>100%</strong> (Affection de Longue Durée — ALD for cancer). The product was available via Accès Précoce (early access) prior to formal reimbursement.',
                    links: [
                        { label: "BDPM — Bavencio", url: "https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid=68504882" },
                    ],
                },
            ],
            takeaway: 'Bavencio in France illustrates the ASMR-driven pricing mechanism: an ASMR III (moderate improvement) rating secured a price premium over BSC, despite a high ICER. France does not apply a rigid cost-per-QALY threshold like NICE — instead, ASMR and population cible drive the negotiation. The Liste en sus pathway ensures hospital funding without budget impact on individual establishments.',
        },
    },
    {
        code: "DE",
        name: "Germany",
        flag: "🇩🇪",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "Most new medicines in Germany are authorised via the EMA centralised procedure. National authorisations are handled by BfArM (small molecules) or PEI (biologics, vaccines).",
                links: [
                    { label: "BfArM (Federal Institute for Drugs and Medical Devices)", url: "https://www.bfarm.de/EN" },
                    { label: "PEI (Paul Ehrlich Institute)", url: "https://www.pei.de/EN" },
                    { label: "EMA — Centralised procedure", url: "https://www.ema.europa.eu/en/human-regulatory-overview/marketing-authorisation/centralised-procedure" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "Germany operates the AMNOG framework since 2011. Manufacturers submit a benefit dossier to G-BA; IQWiG evaluates it and G-BA issues an added benefit (Zusatznutzen) decision. This determines the basis for price negotiations with GKV-Spitzenverband.",
                links: [
                    { label: "G-BA (Federal Joint Committee)", url: "https://www.g-ba.de/english" },
                    { label: "IQWiG (Institute for Quality and Efficiency in Health Care)", url: "https://www.iqwig.de/en" },
                    { label: "G-BA — AMNOG benefit assessments", url: "https://www.g-ba.de/themen/arzneimittel/arzneimittel-richtlinie-anlagen/nutzenbewertung-35a" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "Products are available at the manufacturer's list price immediately after launch (free pricing for 12 months). After G-BA assessment and price negotiation, a reimbursement amount (Erstattungsbetrag) is set retrospectively.",
                links: [
                    { label: "GKV-Spitzenverband", url: "https://www.gkv-spitzenverband.de/english/english.jsp" },
                    { label: "LAUER-TAXE (drug pricing database)", url: "https://www.lauer-fischer.de" },
                ],
            },
        ],
        drugExample: {
            drug: "Orserdu",
            inn: "elacestrant",
            indication: "ER+/HER2−, ESR1-mutated locally advanced or metastatic breast cancer, after ≥1 prior endocrine therapy line including a CDK 4/6 inhibitor",
            steps: [
                {
                    title: "Marketing Authorization (EMA/EC)",
                    date: "15 September 2023",
                    detail: "EC approval granted for postmenopausal women and men with ER+/HER2−, ESR1-mutated locally advanced or metastatic breast cancer progressing after ≥1 prior endocrine therapy line including a CDK 4/6 inhibitor. Elacestrant is an oral SERD (selective estrogen receptor degrader) — the first approved oral SERD in this setting.",
                    links: [
                        { label: "EMA EPAR — Orserdu", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/orserdu" },
                    ],
                },
                {
                    title: "Dossier Submission & IQWiG Assessment",
                    date: "Oct 2023 – Feb 2024",
                    detail: 'Stemline Therapeutics submitted the benefit dossier on 31 October 2023 (AMNOG Day 0). IQWiG published its assessment on 1 February 2024 (procedure D-986 / IQWiG A23-104). The pivotal EMERALD trial (Phase III, N=478 in ESR1-mutated population) showed a clear PFS benefit — but G-BA does not accept PFS alone as a patient-relevant endpoint. IQWiG concluded <em>no suitable data</em> for either postmenopausal subgroup, primarily because the company submitted a post-hoc restricted population that excluded ~13% of ESR1-mutated patients, creating high risk of bias in the OS data.',
                    links: [
                        { label: "IQWiG assessment (A23-104)", url: "https://www.iqwig.de/en/projects/a23-104.html" },
                        { label: "G-BA procedure page (D-986)", url: "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/1007/" },
                    ],
                },
                {
                    title: "G-BA Beschluss — Split Verdict by Prior Treatment Line",
                    date: "2 May 2024",
                    detail: 'G-BA overruled IQWiG for one subgroup — a relatively rare outcome. Against a physician\'s-choice zVT (tamoxifen, anastrozole, letrozole, exemestane, fulvestrant, or everolimus+exemestane):<br><br><strong>Postmenopausal — 1 prior ET line (a1):</strong> <em>Kein Zusatznutzen.</em> The post-hoc exclusion affected a substantial share of patients in this subgroup → high risk of bias in OS → not accepted.<br><br><strong>Postmenopausal — 2 prior ET lines (a2):</strong> <em>Anhaltspunkt für beträchtlichen Zusatznutzen</em> (hint of considerable benefit). Only 1 patient excluded in this subgroup → negligible risk of bias → G-BA accepted the OS signal (~26 vs. ~16 months median OS).<br><br><strong>Men (b):</strong> <em>Kein Zusatznutzen</em> — too few men enrolled in EMERALD for a meaningful analysis.',
                    links: [
                        { label: "G-BA Beschluss D-986 (English PDF)", url: "https://www.g-ba.de/downloads/39-1464-6585/2024-05-02_AM-RL-XII_Elacestrant_D-986_EN.pdf" },
                    ],
                },
            ],
            takeaway: 'Orserdu\'s G-BA assessment illustrates two defining features of AMNOG: (1) <em>patient-relevant endpoints matter</em> — a clear PFS benefit was not enough without OS; and (2) <em>subgroup granularity</em> — the same drug received "no added benefit" and "hint of considerable benefit" within the same indication, split purely by number of prior therapy lines and evidence quality. The decisive factor was not the magnitude of the OS effect but whether the risk of bias in the data was acceptable.',
        },
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization</h4>
<p>Most products are centrally authorised via the EMA. National authorisations (via BfArM or PEI) are uncommon for new innovative medicines.</p>
<ol>
    <li>Search the EMA's <a href="https://www.ema.europa.eu/en/medicines/human/EPAR" target="_blank" rel="noopener">EPAR database</a> by product name or INN to find the full European Public Assessment Report — includes approved indications, the SmPC, and the full assessment history</li>
    <li>For nationally authorised products, search <a href="https://www.bfarm.de/EN" target="_blank" rel="noopener">BfArM</a> (small molecules) or <a href="https://www.pei.de/EN" target="_blank" rel="noopener">PEI</a> (biologics and vaccines)</li>
</ol>

<h4 class="tips-heading">G-BA Benefit Assessment (AMNOG)</h4>
<p>All new reimbursed medicines undergo early benefit assessment (Nutzenbewertung) under AMNOG. Results are published within ~6 months of launch.</p>
<ol>
    <li>Go to the <a href="https://www.g-ba.de/themen/arzneimittel/arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/" target="_blank" rel="noopener">G-BA dossier assessment list</a> and search by active substance or brand name</li>
    <li>Each entry links to: the G-BA resolution (Beschluss) with Zusatznutzen per patient subgroup, the comparator therapy (zVT), and the evidence certainty level (Beleg / Hinweis / Anhaltspunkt)</li>
    <li>The independent IQWiG dossier evaluation can be found at <a href="https://www.iqwig.de/en/projects-results/products.html" target="_blank" rel="noopener">IQWiG — Products</a></li>
    <li>For machine-readable data covering all AMNOG decisions, download the <a href="https://www.g-ba.de/downloads/17-98-5022/G-BA_Beschluss_Info.xml" target="_blank" rel="noopener">G-BA AIS XML</a> (updated on the 1st and 15th of each month)</li>
    <li>If a product was withdrawn from the market after AMNOG assessment, this is often indicated in the G-BA list; note that <em>Marktaustritt</em> (market exit) typically follows a "no added benefit" decision for a new product with no reference price group</li>
</ol>
<p class="tips-note"><strong>Zusatznutzen scale:</strong> erheblich (major) &gt; beträchtlich (considerable) &gt; gering (minor) &gt; nicht quantifizierbar (non-quantifiable) &gt; kein Zusatznutzen (none) &gt; geringerer Nutzen (lesser benefit than comparator)</p>

<h4 class="tips-heading">Pricing &amp; Reimbursement</h4>
<ol>
    <li>During the first 12 months after launch, the manufacturer sets the price freely — no negotiation is required and the product is immediately reimbursed by GKV payers</li>
    <li>After the G-BA resolution, GKV-Spitzenverband negotiates the Erstattungsbetrag (reimbursement amount) — concluded agreements are published on the <a href="https://www.gkv-spitzenverband.de/english/english.jsp" target="_blank" rel="noopener">GKV-Spitzenverband website</a></li>
    <li>Current market prices (including post-negotiation) are available via <a href="https://www.lauer-fischer.de" target="_blank" rel="noopener">LAUER-TAXE</a> — the standard trade reference in Germany (subscription required)</li>
    <li>If price negotiations fail, an independent arbitration board (Schiedsverfahren) sets the reimbursement amount</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Products assessed as having "no added benefit" (kein Zusatznutzen) relative to the zVT are reimbursed at the comparator's price level (Festbetrag / ATC reference price group). If no suitable reference group exists, this often triggers market withdrawal by the manufacturer.</p>
        `,
    },
    {
        code: "GR",
        name: "Greece",
        flag: "🇬🇷",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "EOF — Drug Search (includes pricing)", url: "https://services.eof.gr/human-search/home.xhtml" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "EOPYY — Medicine List", url: "https://eopyy.gov.gr/medicine/list" }],
            },
        ],
        notes: "The EOPYY list shows medicines submitted for reimbursement consideration — listing does not confirm reimbursement status. EOF discloses pricing information.",
        tipsHtml: `
<h4 class="tips-heading">EOF &mdash; Pricing and Market Authorization</h4>
<ol>
    <li><a href="https://services.eof.gr/human-search/home.xhtml" target="_blank" rel="noopener">EOF&rsquo;s drug search</a> covers both MA status and price &mdash; search by INN or product name (Greek or Latin characters). Results show the hospital price and the retail price</li>
    <li>EOF uses external reference pricing against EU member states to set maximum prices. Greece has historically had some of the lowest ex-factory prices in Europe following austerity-era price cuts (2010&ndash;2014 saw mandatory reductions of 15&ndash;25%)</li>
    <li>For EMA centrally authorised products, the EU Commission decision applies automatically; EOF grants the Greek marketing authorisation</li>
</ol>

<h4 class="tips-heading">EOPYY Reimbursement &amp; Clawback</h4>
<ol>
    <li>EOPYY (Εθνικός Οργανισμός Παροχής Υπηρεσιών Υγείας) manages outpatient reimbursement. Reimbursement categories: <strong>Category A</strong> (90% &mdash; serious conditions), <strong>Category B</strong> (75% &mdash; chronic conditions), <strong>Category C</strong> (prescription only, low reimbursement)</li>
    <li>Greece uses a mandatory <strong>clawback (rebate)</strong> mechanism &mdash; if total pharmaceutical expenditure exceeds the annual budget, manufacturers must pay back the excess proportionally, regardless of price negotiations. This creates significant uncertainty for pricing</li>
    <li>Prior authorisation (<strong>&epsilon;&gamma;&kappa;&rho;&iacute;&sigma;&epsilon;&iota;&sigmaf;</strong>) is required for many specialist and high-cost medicines &mdash; prescribing physicians must submit an online request through the e-DAP prescription system</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> EOF and EOPYY interfaces are primarily in Greek (using the Greek alphabet). Drug names (INN) can be searched in Latin characters. Use Google Translate to navigate &mdash; it handles Greek pharmaceutical terminology well.</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial EMA indication); subsequently NSCLC, Hodgkin lymphoma, urothelial carcinoma, and other oncology indications",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "17 July 2015",
                    detail: 'EC granted centralised marketing authorization for Keytruda for advanced melanoma. Greece, as an EU member, is covered automatically. Subsequent variations extended to NSCLC (2016), classical Hodgkin lymphoma, urothelial carcinoma, and other indications.',
                    links: [
                        { label: "EMA EPAR \u2014 Keytruda", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/keytruda" },
                    ],
                },
                {
                    title: "EOPYY Positive List & Prior Authorization",
                    date: "2016\u20132017",
                    detail: 'Pembrolizumab was included on the EOPYY positive reimbursement list for advanced melanoma, followed by subsequent indications. Oncology drugs in Greece typically require <strong>prior authorization (\u03b5\u03b3\u03ba\u03c1\u03af\u03c3\u03b5\u03b9\u03c2)</strong> through the e-DAP electronic prescription system. The prescribing oncologist must submit a request documenting that the patient meets the approved clinical criteria. Greece\u2019s HTA committee (established 2018) evaluates new indications, though many oncology drugs were listed prior to formal HTA implementation.',
                    links: [
                        { label: "EOPYY \u2014 Drug Reimbursement", url: "https://www.eopyy.gov.gr/" },
                    ],
                },
                {
                    title: "Rebate & Clawback System",
                    date: "Ongoing",
                    detail: 'Greece operates a comprehensive <strong>rebate and clawback system</strong> on pharmaceutical expenditure. Manufacturers face mandatory rebates on EOPYY-reimbursed sales, plus clawback payments when total pharmaceutical spending exceeds budgeted ceilings. For high-cost oncology drugs like pembrolizumab, MSD would typically pay: (1) a mandatory rebate based on price band, (2) a volume-based clawback if the EOPYY drug budget is exceeded, and (3) potentially additional rebates under risk-sharing or managed entry agreements. These mechanisms can recover 20\u201340% of gross sales revenue.',
                    links: [
                        { label: "EOF \u2014 National Organisation for Medicines", url: "https://www.eof.gr/web/guest/home" },
                    ],
                },
            ],
            takeaway: 'Greece illustrates a system where reimbursement access is relatively fast (positive list inclusion within 1\u20132 years of EC approval for oncology), but commercial viability is challenged by the extensive rebate and clawback system. The prior authorization requirement through e-DAP ensures that prescribing is restricted to approved indications and patient populations. Greece\u2019s pharmaceutical market is shaped by austerity-era cost containment measures that remain in effect.',
        },
    },
    {
        code: "HK",
        name: "Hong Kong",
        flag: "🇭🇰",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The Drug Office (Department of Health) regulates pharmaceuticals in Hong Kong under the Pharmacy and Poisons Ordinance. Since November 2023, a \u20181+\u2019 mechanism allows registration based on one reference agency approval (instead of two), cutting approval time from ~24 to ~7 months.",
                links: [{ label: "Drug Office \u2014 Drug Registration Search", url: "https://www.drugoffice.gov.hk/eps/do/en/pharmaceutical_trade/search_drug_database.html" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement (HA Drug Formulary)",
                body: "The Hospital Authority (HA) Drug Advisory Committee (DAC) classifies drugs into four tiers: General Drugs (covered under standard charges), Special Drugs (criteria-based), Self-Financed Items with Safety Net (patient pays, but financial assistance available), and Self-Financed Items without Safety Net (full out-of-pocket). DAC meets quarterly and publishes outcomes including rejection reasons.",
                links: [{ label: "HA Drug Formulary \u2014 Formulary Search", url: "https://www.ha.org.hk/hadf/en-us/Updated-HA-Drug-Formulary/Drug-Formulary.html" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">HA Drug Formulary Tiers</h4>
<ol>
    <li><strong>General Drugs</strong>: well-established, cost-effective &mdash; available to all patients with relevant indications at the standard HA fee (~HKD 100 per outpatient attendance covering all dispensed drugs)</li>
    <li><strong>Special Drugs</strong>: require specialist authorisation and defined clinical criteria; patients not meeting criteria must self-pay</li>
    <li><strong>Self-Financed Items (SFI) with Safety Net</strong>: clinically significant but expensive; patients pay out-of-pocket but can apply for financial assistance via the Samaritan Fund or Community Care Fund based on need</li>
    <li><strong>Self-Financed Items (SFI) without Safety Net</strong>: HA does not procure these; patients must purchase from community pharmacies at full market price</li>
    <li>Search the <a href="https://www.ha.org.hk/hadf/en-us/Updated-HA-Drug-Formulary/Drug-Formulary.html" target="_blank" rel="noopener">HA Drug Formulary (HADF)</a> by drug name, ATC code, or tier. DAC outcomes (including rejection reasons) are published quarterly on the same site</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Hong Kong has no standalone HTA body &mdash; the DAC conducts evidence review internally and does <em>not</em> publish detailed assessment rationales. This contrasts with Singapore (ACE) and EU countries. From 2026, new outpatient drug charges apply: HKD 5/item (Family Medicine) and HKD 20/item (Specialist Outpatient).</p>

<h4 class="tips-heading">Drug Registration &amp; the &lsquo;1+&rsquo; Mechanism</h4>
<ol>
    <li>Search the <a href="https://www.drugoffice.gov.hk/eps/do/en/pharmaceutical_trade/search_drug_database.html" target="_blank" rel="noopener">Drug Office registration database</a> by brand name, active ingredient, or HK registration number. A bulk downloadable dataset is available at data.gov.hk for batch lookups</li>
    <li>Since November 2023, the <strong>&lsquo;1+&rsquo; mechanism</strong> allows registration with approval from one reference agency (EMA, FDA, TGA, MHRA, or Health Canada) instead of two, cutting approval from ~24 to ~7 months. A planned Centre for Medical Products Regulation (CMPR, launching ~2026) will eventually move to independent primary evaluation</li>
    <li>Products approved by EMA or FDA are <strong>not</strong> automatically valid in Hong Kong &mdash; a separate HK application is required</li>
</ol>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial registration); subsequently expanded to NSCLC and other oncology indications",
            steps: [
                {
                    title: "Drug Office Registration",
                    date: "2016\u20132017",
                    detail: 'The Department of Health Drug Office registered pembrolizumab for advanced melanoma and NSCLC. Hong Kong requires a separate registration application even for products approved by EMA or FDA. The "1+" mechanism (from November 2023) now allows faster registration referencing one international agency, but Keytruda\u2019s initial registration predated this reform.',
                    links: [
                        { label: "Drug Office \u2014 Registration Database", url: "https://www.drugoffice.gov.hk/eps/do/en/pharmaceutical_trade/search_drug_database.html" },
                    ],
                },
                {
                    title: "Hospital Authority Drug Formulary",
                    date: "2017\u20132018",
                    detail: 'The <strong>Hospital Authority (HA)</strong> Drug Advisory Committee evaluated pembrolizumab for inclusion in the HA Drug Formulary. The HA formulary classifies drugs into: <strong>General</strong> (standard drugs), <strong>Special</strong> (restricted to specific clinical conditions), and <strong>Self-financed Items (SFI)</strong> (patient pays full cost). Pembrolizumab was initially classified as a <strong>Self-financed Item</strong> for most indications, meaning patients bore the full cost. Some indications were later reclassified to <strong>Special Drug</strong> status with HA subsidy.',
                    links: [
                        { label: "HA Drug Formulary", url: "https://www.ha.org.hk/hadf/en-us/Updated-HA-Drug-Formulary.html" },
                    ],
                },
                {
                    title: "Samaritan Fund & Community Care Fund",
                    date: "From 2018",
                    detail: 'For patients who cannot afford self-financed drugs, Hong Kong operates two safety nets: the <strong>Samaritan Fund</strong> (for drugs on the HA formulary\u2019s safety net programme) and the <strong>Community Care Fund</strong> (CCF, for drugs not yet on the Samaritan Fund programme). Pembrolizumab was covered under the CCF for specific indications, providing means-tested subsidies for eligible patients. The financial assessment considers household income and assets, with patients below certain thresholds receiving full or partial subsidies.',
                    links: [
                        { label: "HA \u2014 Samaritan Fund", url: "https://www.ha.org.hk/visitor/ha_visitor_text_index.asp?Content_ID=10116" },
                    ],
                },
            ],
            takeaway: 'Hong Kong\u2019s HA Drug Formulary system creates a tiered access model: "General" drugs are fully subsidised, "Special" drugs require clinical justification, and "Self-financed Items" require patient payment. For expensive oncology drugs like pembrolizumab, the Samaritan Fund and Community Care Fund provide means-tested safety nets. The pathway from registration to subsidised access can be lengthy, with drugs often starting as self-financed before moving to subsidised categories as evidence and budget allow.',
        },
    },
    {
        code: "HU",
        name: "Hungary",
        flag: "🇭🇺",
        ema: true,
        sections: [
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "NEAK — IRP Reimbursed Drugs", url: "https://www.neak.gov.hu/felso_menu/szakmai_oldalak/gyogyszer_segedeszkoz_gyogyfurdo_tamogatas/egeszsegugyi_vallalkozasoknak/gyartok_forgalomba_hozok/dipc" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "OGYEI — Drug Database (HTA Reports)", url: "https://ogyei.gov.hu/drug_database" }],
            },
        ],
        notes: "If a drug appears in the NEAK IRP list, it is reimbursed.",
        tipsHtml: `
<h4 class="tips-heading">NEAK Drug Search</h4>
<ol>
    <li>Use the <a href="https://neak.gov.hu/felso_menu/lakossagnak/gyogszerkereso" target="_blank" rel="noopener">NEAK drug search portal</a> to check reimbursement status &mdash; <strong>make sure to select the prescribing physician type</strong> (h&aacute;ziorvos for GP, szakorvos for specialist) before searching, otherwise results may not appear</li>
    <li>The NEAK IRP (International Reference Pricing) list at <a href="https://www.neak.gov.hu/felso_menu/szakmai_oldalak/gyogyszer_segedeszkoz_gyogyfurdo_tamogatas/egeszsegugyi_vallalkozasoknak/gyartok_forgalomba_hozok/dipc" target="_blank" rel="noopener">neak.gov.hu</a> shows reimbursed drugs with their reference prices &mdash; if a drug is on this list it is reimbursed</li>
    <li>For HTA reports and drug database information, search <a href="https://ogyei.gov.hu/drug_database" target="_blank" rel="noopener">OGYEI (National Institute of Pharmacy and Nutrition)</a> &mdash; the drug database covers nationally authorised products</li>
</ol>

<h4 class="tips-heading">Reimbursement Categories</h4>
<ol>
    <li>Hungary uses <strong>normatív</strong> (normative) reimbursement for most medicines &mdash; fixed reimbursement amounts based on therapeutic groups with patient co-payments</li>
    <li><strong>Emelt normatív</strong> (elevated normative): higher reimbursement for severe chronic conditions &mdash; patient contribution is lower</li>
    <li><strong>Kiemelt</strong> (priority) reimbursement: for the most serious conditions (e.g., life-threatening diseases) &mdash; 100% reimbursed</li>
    <li>For innovative medicines not yet on the standard list, <strong>egyedi m&eacute;lt&aacute;nyoss&aacute;g</strong> (individual compassionate use) provides a case-by-case reimbursement pathway through NEAK</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> NEAK and OGYEI interfaces are in Hungarian. Key terms: "t&aacute;mogat&aacute;s" (support/reimbursement), "hum&aacute;n gy&oacute;gyszer" (human medicine), "fizet&eacute;si ar&aacute;ny" (payment ratio). INN names are searchable in Latin characters.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Első vonalbeli fenntartó kezelés helyileg előrehaladott vagy metasztatikus urothelialis carcinomában, platinaalapú kemoterápia után progressziómentes betegeknél",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. As an EU member, Hungary is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "Named-Patient Based Reimbursement (NPBR / Egyedi Méltányosság)",
                    date: "Late 2022",
                    detail: 'Avelumab was accepted into Hungary\'s <strong>Named-Patient Based Reimbursement (NPBR)</strong> program (egyedi méltányosság) for first-line maintenance UC in late 2022. This is the primary pathway for innovative oncology drugs in Hungary — NEAK approves individual patient applications on a case-by-case basis, providing 100% reimbursement for eligible patients. The NPBR pathway is used when drugs are not yet included on the standard normative reimbursement list. OGYEI (National Institute of Pharmacy and Nutrition) handles the regulatory and HTA evaluation, while NEAK manages reimbursement decisions.',
                    links: [
                        { label: "OGYEI — Drug Database", url: "https://ogyei.gov.hu/drug_database" },
                        { label: "NEAK — Individual Reimbursement", url: "https://www.neak.gov.hu/felso_menu/lakossagnak/ellatas_magyarorszagon/gyogyszer_segedeszkoz_gyogyfuro_tamogatas/egyedi_tamogatas" },
                    ],
                },
                {
                    title: "Clinical Adoption",
                    date: "From 2023",
                    detail: 'Following NPBR acceptance, Hungarian oncologists adopted avelumab as the standard maintenance therapy for first-line UC, consistent with ESMO and EAU guidelines. A nationwide real-world study identified 2,523 patients with metastatic UC in Hungary, with 86% receiving first-line platinum-based chemotherapy — the eligible population for avelumab maintenance. Access requires an individual NEAK application by the treating physician at an authorised hospital department.',
                    links: [
                        { label: "PMC — Real-world mUC treatment patterns in Hungary", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10611888/" },
                    ],
                },
            ],
            takeaway: 'Hungary illustrates the NPBR (egyedi méltányosság) pathway — a case-by-case individual reimbursement mechanism used for innovative drugs not yet on the standard normative list. The ~22-month gap from EC approval (January 2021) to NPBR acceptance (late 2022) is typical for Central-Eastern European markets. Unlike the standard normative or kiemelt reimbursement routes, NPBR requires individual physician applications to NEAK, which can create administrative barriers but ensures 100% coverage for approved patients.',
        },
    },
    {
        code: "IS",
        name: "Iceland",
        flag: "🇮🇸",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "Icelandic Medicines Agency (IMA)", url: "https://www.ima.is/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                body: "Iceland is an EEA member \u2014 EMA centrally authorised medicines are valid in Iceland. IMA sets maximum prices using external reference pricing against Nordic countries. Two reimbursement categories apply: Category A (fully reimbursed for specific conditions) and Category B (partial reimbursement). IMA conducts HTA assessments for new medicines.",
                links: [{ label: "IMA \u2014 Pricing and Reimbursement", url: "https://www.ima.is/home/pricing-and-reimbursement/" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Small Market &amp; EEA Status</h4>
<ol>
    <li>Iceland (~380,000 population) is an EEA member &mdash; EMA centrally authorised products are automatically valid and do not require a separate Icelandic MA application</li>
    <li>IMA (Icelandic Medicines Agency) is a small agency that conducts HTA assessments and sets maximum prices. It collaborates with the other Nordic agencies on methodology and occasionally on joint assessments</li>
    <li>Iceland references other Nordic countries (Denmark, Sweden, Norway, Finland) for external reference pricing &mdash; prices in Iceland are among the lowest in the Nordics as a result</li>
</ol>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li><strong>Category A</strong>: fully reimbursed for patients with specific conditions listed in the IMA schedule &mdash; patient pays a small fixed co-payment per prescription</li>
    <li><strong>Category B</strong>: partial reimbursement (approximately 65&ndash;75%) for a broader range of conditions</li>
    <li>For detailed reimbursement status and pricing, use the <a href="https://www.ima.is/home/pricing-and-reimbursement/" target="_blank" rel="noopener">IMA Pricing and Reimbursement page</a></li>
</ol>
        `,
    },
    {
        code: "ID",
        name: "Indonesia",
        flag: "🇮🇩",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "BPOM — Drug Registry", url: "https://cekbpom.pom.go.id/search_home_produk" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "FORNAS — National Drug Formulary", url: "https://e-fornas.kemkes.go.id/daftar_obat.php" }],
            },
        ],
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Multiple oncology indications (melanoma, NSCLC, Hodgkin lymphoma, urothelial carcinoma, renal cell carcinoma)",
            steps: [
                {
                    title: "BPOM Registration",
                    date: "August 2024",
                    detail: 'BPOM (Badan Pengawas Obat dan Makanan) registered pembrolizumab in August 2024 \u2014 approximately <strong>10 years after the initial US FDA approval</strong>, making Indonesia one of the latest major markets globally. Multiple indications were registered simultaneously including melanoma, NSCLC, classical Hodgkin lymphoma, MSI-H/dMMR colorectal cancer, and renal cell carcinoma (with axitinib). The late registration reflects Indonesia\u2019s complex regulatory environment and BPOM\u2019s stringent requirements.',
                    links: [
                        { label: "BPOM \u2014 Drug Registry", url: "https://cekbpom.pom.go.id/search_home_produk" },
                    ],
                },
                {
                    title: "Fornas & JKN/BPJS Coverage",
                    date: "Not listed (as of February 2025)",
                    detail: 'Pembrolizumab is <strong>NOT included</strong> in Indonesia\u2019s National Formulary (Fornas, KMK No. HK.01.07/MENKES/1818/2024, containing 677 active substances). Without Fornas listing, the drug is not covered under JKN (Jaminan Kesehatan Nasional) national health insurance managed by BPJS Kesehatan, which covers >220 million Indonesians. The InaHTAC (Indonesia HTA Committee) evaluates drugs for Fornas inclusion using cost-effectiveness and affordability criteria. At global prices, pembrolizumab far exceeds Indonesia\u2019s affordability benchmarks.',
                    links: [
                        { label: "E-Fornas Portal", url: "https://e-fornas.kemkes.go.id/daftar_obat.php" },
                    ],
                },
                {
                    title: "Access & Domestic Competition",
                    date: "2024 onwards",
                    detail: 'Patient access to pembrolizumab in Indonesia is currently limited to <strong>out-of-pocket payment</strong> or hospital-level formulary inclusion at private hospitals. In December 2023, BPOM approved serplulimab (a domestically distributed PD-1 inhibitor by Kalbe/KGbio), launched in March 2024 as a potentially lower-cost alternative. Indonesia\u2019s e-Katalog (government procurement system managed by LKPP) has not yet listed pembrolizumab pricing.',
                    links: [
                        { label: "E-Katalog \u2014 Government Procurement", url: "https://e-katalog.lkpp.go.id/" },
                    ],
                },
            ],
            takeaway: 'Indonesia represents the most extreme regulatory lag among major markets: 10 years from US FDA approval to BPOM registration. Even after registration, Fornas/JKN coverage is absent, limiting access to private-pay patients. The arrival of lower-cost domestic PD-1 competitors (serplulimab) may accelerate formulary discussions. Indonesia\u2019s case illustrates how regulatory delays compound with affordability barriers to create a decade-long access gap for innovative oncology drugs.',
        },
    },
    {
        code: "IE",
        name: "Ireland",
        flag: "🇮🇪",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "HPRA (Health Products Regulatory Authority)", url: "https://www.hpra.ie/homepage/medicines" }],
            },
            {
                id: "hta",
                title: "HTA",
                body: "NCPE (National Centre for Pharmacoeconomics) conducts health technology assessments for medicines applying for public reimbursement. NCPE outcomes (positive / negative recommendation) go to the HSE for final reimbursement decision. Ireland collaborates with Northern Ireland under the Shared Island initiative for some assessments.",
                links: [{ label: "NCPE \u2014 Drug Evaluations (HTA)", url: "https://www.ncpe.ie/drugs/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "HSE (Primary Care Reimbursement Service, PCRS) maintains the reimbursable items list. Under the Drugs Payment Scheme (DPS), patients pay a maximum of \u20ac80/month for approved medicines. High-tech drugs (biologics, oncologics) are dispensed through hospital pharmacies under separate High-Tech Arrangements.",
                links: [{ label: "HSE \u2014 List of Reimbursable Items", url: "https://www.hse.ie/eng/staff/pcrs/items/" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">NCPE Assessment Process</h4>
<ol>
    <li>Search <a href="https://www.ncpe.ie/drugs/" target="_blank" rel="noopener">NCPE Drug Evaluations</a> by product name or INN &mdash; results show the current evaluation status: under review, completed with recommendation, or declined</li>
    <li>NCPE conducts <strong>rapid reviews</strong> (for products with strong evidence, ~3 months) or <strong>full HTAs</strong> (for complex cases, ~6 months). Full HTA reports are publicly available on the NCPE website</li>
    <li>A <strong>positive NCPE recommendation</strong> triggers commercial negotiations with the HSE, after which the product is added to the reimbursable items list &mdash; this step can add several more months to the access timeline</li>
    <li>Ireland participates in the EU HTA joint assessments for oncology medicines (EU HTA Regulation); NCPE uses these joint clinical assessments to inform Irish reimbursement decisions from 2025</li>
</ol>

<h4 class="tips-heading">Reimbursement Schemes</h4>
<ol>
    <li><strong>General Medical Services (GMS)</strong>: free medicines for medical card holders (~35% of population). GMS items are a superset of the DPS list</li>
    <li><strong>Drugs Payment Scheme (DPS)</strong>: all residents pay a maximum of <strong>&euro;80/month</strong> for approved prescription medicines regardless of quantity &mdash; the state covers the rest</li>
    <li><strong>High-Tech Arrangements (HTA)</strong>: biologics, oncologics, and other complex medicines are dispensed by hospital pharmacies and funded separately. These do NOT appear on the standard PCRS reimbursable items list &mdash; search the <a href="https://www.ncpe.ie/drugs/" target="_blank" rel="noopener">NCPE database</a> for high-tech drug status</li>
    <li><strong>Long-Term Illness (LTI) Scheme</strong>: free medicines for 16 specific chronic conditions (e.g., epilepsy, diabetes, multiple sclerosis)</li>
</ol>
<p class="tips-note"><strong>Access timeline:</strong> From EMA approval to Irish reimbursement typically takes 12&ndash;18 months (EMA &rarr; NCPE &rarr; HSE commercial negotiation &rarr; listing). Track status on <a href="https://www.ncpe.ie/drugs/" target="_blank" rel="noopener">ncpe.ie</a>.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "First-line maintenance treatment of locally advanced or metastatic urothelial carcinoma that has not progressed after platinum-based chemotherapy",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. As an EU member, Ireland is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "NCPE Health Technology Assessment (HTA ID: 21001)",
                    date: "December 2021",
                    detail: 'The NCPE completed its full HTA for avelumab (HTA ID: 21001) with final data submitted by the applicant in November 2021. The NCPE recommended that the HSE should consider <strong>not funding</strong> avelumab at the submitted price, concluding that cost-effectiveness could not be demonstrated. The submitted price was €896.63 per 200 mg vial (cost per cycle: €4,214 including VAT; annual cost: ~€106,246/patient). There were no other licensed first-line maintenance treatments for this population in Ireland — BSC was the standard of care.',
                    links: [
                        { label: "NCPE — Avelumab HTA ID: 21001", url: "https://www.ncpe.ie/avelumab-bavencio-1l-maintenance-urothelial-carcinoma-hta-id-21001/" },
                    ],
                },
                {
                    title: "HSE Reimbursement Decision",
                    date: "September 2022",
                    detail: 'Despite the NCPE\'s negative cost-effectiveness recommendation, the HSE <strong>approved reimbursement</strong> of avelumab following confidential price negotiations in September 2022. Avelumab is funded under the <strong>High-Tech Arrangements</strong> — the pathway for biologics and oncology drugs dispensed through hospital pharmacies. The confidential discount was essential to achieving an acceptable cost-effectiveness profile.',
                    links: [
                        { label: "NCPE — Drug Evaluations", url: "https://www.ncpe.ie/drugs/" },
                    ],
                },
            ],
            takeaway: 'Bavencio in Ireland shows how a negative NCPE recommendation does not necessarily mean no access. The HSE can approve reimbursement after confidential price negotiations, even when the NCPE finds the submitted price is not cost-effective. The 20-month gap from EC approval (January 2021) to HSE reimbursement (September 2022) reflects the sequential nature of NCPE assessment → HSE negotiation → final decision. The High-Tech Arrangements pathway is the standard route for hospital-dispensed oncology drugs in Ireland.',
        },
    },
    {
        code: "IL",
        name: "Israel",
        flag: "🇮🇱",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "Israeli Drug Registry", url: "https://israeldrugs.health.gov.il/" },
                    { label: "Israeli Drug Index (English)", url: "https://www.gov.il/en/service/israeli-drug-index" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "Health Basket Committee (ועדת סל)", url: "https://www.gov.il/he/departments/units/vsal-committee-unit" },
                    { label: "Health Basket 2026 Committee", url: "https://www.gov.il/he/pages/hbs2026" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [
                    { label: "MOH — Drug Price Supervision", url: "https://www.gov.il/he/pages/budge-unit-drugs-price" },
                    { label: "Prescription Drug Price List (Open Data)", url: "https://data.gov.il/he/dataset/prescription-drugs-price-list" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "National Health Insurance — gov.il", url: "https://www.gov.il/en/pages/national-health-insurance" }],
            },
        ],
        tips: `The Health Basket (סל הבריאות) is updated annually by the Health Basket Committee, which reviews new technologies and drugs for inclusion. The committee's decisions are published each year — search for the latest year's page on gov.il.\n\nDrug prices are regulated by the MOH. The Open Data portal provides downloadable Excel files of all prescription drug prices.\n\nThe Israeli Drug Registry is available in Hebrew only — use Google Translate or search by INN in English characters.`,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial basket inclusion); subsequently expanded to multiple oncology indications",
            steps: [
                {
                    title: "MOH Drug Registration",
                    date: "2015",
                    detail: 'Israel\u2019s Ministry of Health registered pembrolizumab following EMA and FDA approvals. Israel has its own national regulatory pathway \u2014 products approved by EMA or FDA are not automatically valid but benefit from expedited review. MSD Israel submitted the registration dossier referencing the EMA centralised procedure data.',
                    links: [
                        { label: "MOH \u2014 Drug Registry", url: "https://data.gov.il/dataset/drug" },
                    ],
                },
                {
                    title: "Health Basket Committee \u2014 Melanoma Inclusion",
                    date: "January 2016 (2016 Basket Update)",
                    detail: 'The <strong>Health Basket Committee</strong> (\u05d5\u05e2\u05d3\u05ea \u05e1\u05dc \u05d4\u05d1\u05e8\u05d9\u05d0\u05d5\u05ea) included pembrolizumab for advanced melanoma in the 2016 annual basket update. The committee operates on an annual cycle: pharmaceutical companies submit applications in the spring, an expert advisory committee evaluates clinical evidence and cost-effectiveness over the summer, and the committee announces its final decisions in January of the following year. The committee works within a fixed annual budget (typically NIS 300\u2013500 million for all new technologies). Pembrolizumab\u2019s melanoma inclusion was considered a priority given the significant unmet need.',
                    links: [
                        { label: "MOH \u2014 Health Basket Updates", url: "https://www.gov.il/he/departments/topics/sal-habriut" },
                    ],
                },
                {
                    title: "Kupot Cholim Implementation & Subsequent Indications",
                    date: "2016 onwards",
                    detail: 'Once included in the Health Basket, all four <strong>kupot cholim</strong> (health funds: Clalit, Maccabi, Meuhedet, Leumit) are legally required to provide pembrolizumab to eligible patients. Subsequent basket updates added NSCLC (2017), Hodgkin lymphoma, urothelial carcinoma, and head & neck SCC in later years. Each new indication competes for the limited annual basket budget. Israel\u2019s pharmaceutical expenditure is among the lowest in OECD countries, which constrains the pace of new indication additions.',
                    links: [
                        { label: "Clalit Health Services", url: "https://www.clalit.co.il/" },
                    ],
                },
            ],
            takeaway: 'Israel\u2019s annual Health Basket update cycle is a distinctive feature: unlike continuous HTA processes in most European countries, Israel makes a single batch of inclusion decisions each January, working within a fixed budget envelope. This creates an annual competition among technologies for limited funds. Once a drug is in the basket, access is universal across all four health funds. The fixed-budget constraint means that even cost-effective drugs may be deferred if the annual allocation is exhausted by higher-priority technologies.',
        },
    },
    {
        code: "IT",
        name: "Italy",
        flag: "🇮🇹",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "Italy participates in the EMA centralised procedure. National authorisations and mutual recognition/decentralised procedures are managed by AIFA (Agenzia Italiana del Farmaco).",
                links: [
                    { label: "AIFA (Italian Medicines Agency)", url: "https://www.aifa.gov.it/en/home" },
                    { label: "AIFA — Trova Farmaco (drug search)", url: "https://www.aifa.gov.it/en/trova-farmaco" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "AIFA manages drug reimbursement through classification: Classe A (reimbursed by SSN), Classe H (hospital-only, reimbursed), Classe C (not reimbursed — patient pays). The CTS (Commissione Tecnico Scientifica) evaluates clinical evidence, and the CPR (Comitato Prezzi e Rimborso) negotiates pricing.",
                links: [
                    { label: "TrovaNormeFarmaco — Latest AIFA Determinations", url: "https://trovanorme.aifa.gov.it/#/" },
                    { label: "AIFA — Class A & H Medicine Lists", url: "https://www.aifa.gov.it/en/liste-farmaci-a-h" },
                    { label: "AIFA — AIFA Notes (prescribing conditions)", url: "https://www.aifa.gov.it/en/note-aifa" },
                    { label: "AIFA — Registri di Monitoraggio", url: "https://www.aifa.gov.it/en/registri-farmaci-sottoposti-a-monitoraggio" },
                    { label: "AIFA — HTA & Drug Access Area", url: "https://www.aifa.gov.it/en/area-accesso-al-farmaco-e-hta" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "Prices are negotiated between AIFA (CPR committee) and the manufacturer. Italy uses external reference pricing with a basket of EU countries. Managed entry agreements (MEAs) including payment-by-result and risk-sharing are common.",
                links: [
                    { label: "TrovaNormeFarmaco — Pricing & Classification Decisions", url: "https://trovanorme.aifa.gov.it/#/" },
                    { label: "AIFA — Liste di Trasparenza (off-patent reference prices)", url: "https://www.aifa.gov.it/en/liste-di-trasparenza" },
                    { label: "AIFA — Negotiation & Reimbursement", url: "https://www.aifa.gov.it/en/negoziazione-e-rimborsabilit%C3%A0" },
                    { label: "AIFA — Open Data", url: "https://www.aifa.gov.it/en/open-data" },
                    { label: "Gazzetta Ufficiale (historical decisions)", url: "https://www.gazzettaufficiale.it/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization</h4>
<ol>
    <li>Search <a href="https://www.aifa.gov.it/en/trova-farmaco" target="_blank" rel="noopener">AIFA Trova Farmaco</a> by product name (Farmaco), active ingredient (Principio Attivo), or pharmaceutical company (Azienda) — this is the primary Italian drug search interface covering 66,000+ authorised packages</li>
    <li>The database shows: authorisation status, approved indications (Riassunto delle Caratteristiche del Prodotto = SmPC), reimbursement class, supply regime, and price</li>
    <li>For EMA centralised products, the database links to the EPAR and includes the Italian-language RCP</li>
</ol>

<h4 class="tips-heading">Reimbursement Classification</h4>
<p>Italy classifies medicines into categories that determine reimbursement status:</p>
<ol>
    <li><strong>Classe A</strong>: fully reimbursed by SSN (Servizio Sanitario Nazionale) — includes essential medicines and those for chronic/serious conditions. All are prescription-only</li>
    <li><strong>Classe H</strong>: hospital-only medicines, reimbursed by SSN but dispensed only in hospital settings</li>
    <li><strong>Classe C</strong>: not reimbursed — patients pay the full cost. Includes OTC (C-bis), SOP, and prescription medicines</li>
    <li><strong>Classe C(nn)</strong>: "Classe C non negoziata" — automatically assigned to EMA centrally-authorised drugs within 60 days of EU Commission decision, pending price negotiation. Marketed at the manufacturer's price until AIFA negotiation concludes</li>
    <li>Download the <a href="https://www.aifa.gov.it/en/liste-farmaci-a-h" target="_blank" rel="noopener">Class A & H medicine lists</a> for all reimbursed drugs (published periodically, sorted by active substance and trade name)</li>
    <li><strong>AIFA Notes</strong> define specific conditions under which certain medicines are eligible for SSN reimbursement — check the <a href="https://www.aifa.gov.it/en/note-aifa" target="_blank" rel="noopener">AIFA Notes page</a> for prescribing restrictions</li>
</ol>
<p class="tips-note"><strong>Note:</strong> A product classified as Classe C(nn) is likely a recently approved innovative medicine still awaiting AIFA pricing discussions. Check the <a href="https://www.aifa.gov.it/en/negoziazione-e-rimborsabilit%C3%A0" target="_blank" rel="noopener">Negotiation & Reimbursement page</a> for the current status.</p>

<h4 class="tips-heading">Managed Entry Agreements (MEA)</h4>
<p>Italy is a pioneer in outcome-based managed entry agreements. AIFA's <a href="https://www.aifa.gov.it/en/registri-farmaci-sottoposti-a-monitoraggio" target="_blank" rel="noopener">Registri di Monitoraggio</a> (operational since 2005) track patient eligibility and treatment outcomes for high-cost/innovative medicines.</p>
<ol>
    <li>Check the <a href="https://www.aifa.gov.it/en/registri-e-piani-terapeutici1" target="_blank" rel="noopener">registry list page</a> for downloadable lists of active and closed registries (CSV/ODS)</li>
    <li>Common MEA types in Italy:
        <ul>
            <li><strong>Payment by results</strong>: refund if patient does not respond</li>
            <li><strong>Risk sharing</strong>: discount applied if outcomes fall below agreed thresholds</li>
            <li><strong>Cost sharing</strong>: manufacturer provides initial treatment cycles free/discounted</li>
            <li><strong>Capping</strong>: maximum expenditure per patient</li>
            <li><strong>Success fee</strong>: payment only upon demonstrated clinical benefit</li>
        </ul>
    </li>
    <li>Prescribers must register patients on the AIFA web platform before dispensing registry medicines — the registry enforces eligibility criteria and enables outcome tracking</li>
</ol>

<h4 class="tips-heading">Pricing &amp; Latest Decisions</h4>
<ol>
    <li><strong>Start here:</strong> <a href="https://trovanorme.aifa.gov.it/#/" target="_blank" rel="noopener">TrovaNormeFarmaco</a> is AIFA's official portal for all regulatory determinations — reimbursement, pricing, classification, and marketing authorisation decisions. Since April 2025, this replaced the Gazzetta Ufficiale as the primary publication channel, cutting publication timelines by ~32%. Search by product name, INN, or determination number</li>
    <li>The <a href="https://www.aifa.gov.it/en/liste-di-trasparenza" target="_blank" rel="noopener">Liste di Trasparenza</a> are published monthly (1st and 15th) with reference prices for off-patent medicines — available in PDF, XLS, and CSV formats</li>
    <li>The <a href="https://www.gazzettaufficiale.it/" target="_blank" rel="noopener">Gazzetta Ufficiale</a> contains historical pricing decisions (pre-April 2025) — still useful for older products</li>
    <li>The <a href="https://www.aifa.gov.it/en/open-data" target="_blank" rel="noopener">AIFA Open Data portal</a> provides downloadable datasets including pricing and consumption data</li>
    <li>Italy mandates payback mechanisms: manufacturers must reimburse the SSN if total pharmaceutical spending exceeds annual budget ceilings (tetti di spesa)</li>
    <li>Regional variation: while AIFA sets national prices, individual regions may negotiate additional discounts or manage hospital budgets differently</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> For the latest reimbursement and pricing decisions, always check <a href="https://trovanorme.aifa.gov.it/#/" target="_blank" rel="noopener">TrovaNormeFarmaco</a> first — it is the most current source. For product-level pricing data (ex-factory and public prices), use <a href="https://www.aifa.gov.it/en/trova-farmaco" target="_blank" rel="noopener">Trova Farmaco</a>. AIFA has an English-language version of its main website (use the /en/ prefix), but TrovaNormeFarmaco is in Italian only — use Google Translate.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Trattamento di mantenimento in prima linea del carcinoma uroteliale localmente avanzato o metastatico senza progressione dopo chemioterapia a base di platino",
            steps: [
                {
                    title: "Marketing Authorization (EMA/EC)",
                    date: "25 January 2021",
                    detail: 'EC approved Bavencio for first-line maintenance UC based on JAVELIN Bladder 100. Median OS: 21.4 vs 14.3 months (HR 0.69). As an EMA centralised authorisation, the Italian MA was automatic.',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "Classe C(nn) — Automatic Temporary Classification",
                    date: "~March 2021",
                    detail: 'Within 60 days of the EC decision, AIFA automatically classified Bavencio (new indication) as <strong>Classe C(nn)</strong> — "Classe C non negoziata". This means the product was available in Italy at the manufacturer\'s price, with no SSN reimbursement, while AIFA pricing negotiations were underway. For oncology drugs with strong clinical evidence, the Fondo AIFA for innovative oncology medicines can provide interim funding.',
                    links: [
                        { label: "AIFA — Classe C(nn) Explained", url: "https://www.aifa.gov.it/en/negoziazione-e-rimborsabilit%C3%A0" },
                    ],
                },
                {
                    title: "AIFA Reimbursement — Gazzetta Ufficiale Publication",
                    date: "18 March 2022",
                    detail: 'AIFA completed CTS evaluation and CPR price negotiation. Bavencio for UC maintenance was published in the <strong>Gazzetta Ufficiale n.65</strong> (effective 19 March 2022), classified as fully reimbursed by SSN. The drug was funded through the <strong>National Fund for Innovative Oncology Drugs</strong> (Fondo farmaci oncologici innovativi, Law 232/2016) — this fund provides dedicated budget outside normal hospital pharmaceutical ceilings. AIFA\'s Registro di Monitoraggio was activated to track patient eligibility and outcomes.',
                    links: [
                        { label: "AIFA — Registro Bavencio", url: "https://www.aifa.gov.it/en/-/attivazione-web-e-pubblicazione-schede-di-monitoraggio-registro-bavencio" },
                    ],
                },
            ],
            takeaway: 'Bavencio in Italy demonstrates the C(nn) → full reimbursement pathway typical for EMA-authorised oncology drugs. The 14-month gap from EC decision to GU publication illustrates Italy\'s negotiation timeline. Classification under the Fondo farmaci oncologici innovativi bypasses hospital budget constraints — a key mechanism for ensuring access to innovative cancer drugs. The mandatory Registro di Monitoraggio enables outcome tracking and managed entry agreement enforcement.',
        },
    },
    {
        code: "JP",
        name: "Japan",
        flag: "🇯🇵",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "PMDA (Pharmaceuticals and Medical Devices Agency)", url: "https://www.pmda.go.jp/" },
                    { label: "PMDA — New Drug Approvals (English)", url: "https://www.pmda.go.jp/english/review-services/reviews/approved-information/drugs/0002.html" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [
                    { label: "MHLW — Shingi (includes drug pricing decisions)", url: "https://www.mhlw.go.jp/stf/shingi/indexshingi.html" },
                    { label: "NHI Drug Price List (薬価基準収載品目リスト)", url: "https://www.mhlw.go.jp/topics/2024/04/tp20240401-01.html" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "CORE2 HTA (Cost-effectiveness evaluations)", url: "https://c2h.niph.go.jp/en/" },
                    { label: "Trikipedia — Japan", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/Japan.aspx" },
                ],
            },
        ],
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            localName: "キイトルーダ",
            indication: "Curatively unresectable melanoma (根治切除不能な悪性黒色腫)",
            steps: [
                {
                    title: "Marketing Authorization (PMDA)",
                    date: "28 September 2016",
                    detail: 'First approved by MHLW for unresectable melanoma. Orphan drug designation granted September 2014. PMDA review based on KEYNOTE-001, -002 and -006 studies.',
                    links: [
                        { label: "PMDA review report (審議結果報告書)", url: "https://www.pmda.go.jp/drugs/2016/P20161025002/170050000_22800AMX00696000_A100_2.pdf" },
                    ],
                },
                {
                    title: "NHI Drug Price Listing (薬価収載)",
                    date: "15 February 2017",
                    detail: 'Priced using Similar Efficacy Comparison Method I (類似薬効比較方式I) with Opdivo (nivolumab) as comparator. Initial NHI price: <strong>¥410,541</strong> per 100 mg vial. Utility premium (有用性加算) was requested but denied.',
                    links: [
                        { label: "MHLW Chuikyo pricing decisions (中医協総会)", url: "https://www.mhlw.go.jp/stf/shingi/shingi-chuo_128154.html" },
                    ],
                },
                {
                    title: "Current NHI Price",
                    date: "Latest revision",
                    detail: 'Current price: approximately <strong>¥199,462</strong> per 100 mg vial — less than half the launch price. Multiple rounds of market expansion repricing (市場拡大再算定) triggered by annual sales exceeding ¥150 billion as indications expanded across cancer types.',
                    links: [
                        { label: "KEGG Drug — Pembrolizumab", url: "https://www.kegg.jp/entry/D10574" },
                        { label: "KEGG MEDICUS — Keytruda 100 mg (Japanese label + current price)", url: "https://www.kegg.jp/medicus-bin/japic_med?japic_code=00068708" },
                        { label: "Shirobon.net — Keytruda drug price", url: "https://shirobon.net/drugprice/4291435A2025/" },
                    ],
                },
                {
                    title: "Reimbursement",
                    date: "Automatic on NHI listing",
                    detail: 'In Japan, all drugs with an NHI price listing are reimbursed. When a new indication is approved, the existing NHI price automatically covers the new use — <strong>no separate reimbursement application is needed</strong>. Keytruda is now approved across 13+ cancer types in Japan, all reimbursed under the same NHI listing. Average lag from approval to NHI listing is ~60 days.',
                    links: [],
                },
            ],
            takeaway: 'In Japan, pricing <em>is</em> the access gate. Once a drug receives an NHI price, it is reimbursed for all approved indications. However, market expansion repricing means that commercial success across multiple indications leads to mandatory price cuts — Keytruda\'s price has fallen over 50% since launch.',
        },
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization (PMDA)</h4>
<p>Japan has its own national regulatory pathway via PMDA. There is no mutual recognition with EMA or FDA — a separate Japanese clinical data package (often including Japanese bridging studies) is typically required.</p>
<ol>
    <li>Google <code>[brand name] + 医薬品</code> to find the Japanese product name and PMDA page</li>
    <li>The <a href="https://www.pmda.go.jp/english/review-services/reviews/approved-information/drugs/0002.html" target="_blank" rel="noopener">PMDA English approvals page</a> lists new drugs approved in each fiscal year — useful for checking approval dates</li>
    <li>For the full Japanese review report, search on the <a href="https://www.pmda.go.jp/" target="_blank" rel="noopener">PMDA site</a>: <code>[Japanese brand name] + 承認情報</code> — the first result typically gives the marketing authorisation details and review report (審査報告書)</li>
    <li>The Japanese package insert (添付文書) is available on <a href="https://www.pmda.go.jp/PmdaSearch/iyakuSearch/" target="_blank" rel="noopener">PMDA Drug Search</a> — this is the equivalent of the SmPC/PI</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> PMDA provides English summaries for some major approvals, but most detailed documents are in Japanese only. Google Translate handles Japanese pharmaceutical text reasonably well, but verify molecule names carefully as translations can vary.</p>

<h4 class="tips-heading">NHI Pricing &amp; Reimbursement</h4>
<p>All approved prescription drugs are listed on the NHI (National Health Insurance) Drug Price List. Pricing is determined by MHLW using a rules-based system with comparator-based or cost-calculation methods.</p>
<ol>
    <li>Go to the MHLW Shingi site and search <code>[Japanese brand name] + 医薬品の薬価</code></li>
    <li>Locate the document titled <strong>新医薬品一覧表</strong> — this PDF details the pricing mechanism (類似薬効比較方式 = comparator method, or 原価計算方式 = cost calculation method) and the NHI price</li>
    <li>For current NHI prices, <a href="https://www.kegg.jp/" target="_blank" rel="noopener">KEGG MEDICUS</a> is a convenient source — each Japanese drug page (e.g. <a href="https://www.kegg.jp/medicus-bin/japic_med?japic_code=00068708" target="_blank" rel="noopener">Keytruda 100 mg</a>) shows the current NHI price alongside the full Japanese label (添付文書). Search by brand name or INN on KEGG Drug (<a href="https://www.genome.jp/kegg/drug/" target="_blank" rel="noopener">genome.jp/kegg/drug</a>) to find the JAPIC code</li>
    <li>The NHI Drug Price List is revised every April — the latest list is published on the <a href="https://www.mhlw.go.jp/topics/2024/04/tp20240401-01.html" target="_blank" rel="noopener">MHLW website</a></li>
    <li>Premium pricing mechanisms:
        <ul>
            <li><strong>画期性加算 (Innovation premium)</strong>: up to +100% for truly innovative products</li>
            <li><strong>有用性加算 (Usefulness premium)</strong>: +5% to +60% based on clinical advantages</li>
            <li><strong>市場性加算 (Marketability premium)</strong>: +10% to +20% for orphan drugs</li>
        </ul>
    </li>
</ol>

<h4 class="tips-heading">Cost-Effectiveness Evaluation</h4>
<ol>
    <li>Since April 2019, Japan requires formal cost-effectiveness evaluation (費用対効果評価) for high-cost/high-impact drugs</li>
    <li>Conducted by the <a href="https://c2h.niph.go.jp/en/" target="_blank" rel="noopener">CORE2 HTA centre</a> at the National Institute of Public Health</li>
    <li>Results can lead to NHI price adjustment — unlike most countries, the evaluation occurs <em>after</em> initial NHI listing and pricing</li>
    <li>Japan uses a modified ICER threshold: ¥5 million/QALY (~$35,000) as the base, with adjustments for disease severity and other factors</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Japan's fiscal year runs April–March. NHI drug price revisions, new listings, and regulatory approvals often cluster around April. When searching for the latest pricing, always check the most recent April revision.</p>
        `,
    },
    {
        code: "LV",
        name: "Latvia",
        flag: "🇱🇻",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "ZVA \u2014 DATI Drug Register", url: "https://dati.zva.gov.lv/zalu-registrs/lv" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "NHS Latvia (National Health Service / VMNVD) manages the compensated medicines list. Three reimbursement tiers apply: 100% (severe chronic conditions), 75%, and 50%. Individual patient compensation is available for off-list drugs via application to NHS Latvia.",
                links: [{ label: "VMNVD \u2014 National Health Service Compensated Medicines", url: "https://www.vmnvd.gov.lv/lv/kompensejamie-medikamenti" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Drug Register (ZVA)</h4>
<ol>
    <li>Search <a href="https://dati.zva.gov.lv/zalu-registrs/lv" target="_blank" rel="noopener">ZVA DATI</a> by product name or INN for marketing authorisation status. The database has a Latvian interface &mdash; INN names are in Latin characters and searchable directly</li>
    <li>For EMA centrally authorised products, the EU Commission decision covers Latvia automatically</li>
</ol>

<h4 class="tips-heading">Compensated Medicines (VMNVD)</h4>
<ol>
    <li>The <a href="https://www.vmnvd.gov.lv/lv/kompensejamie-medikamenti" target="_blank" rel="noopener">NHS Latvia compensated medicines list</a> is published on the VMNVD website and shows reimbursement tier and conditions for each drug</li>
    <li>Three tiers: <strong>100%</strong> reimbursed (severe chronic conditions and rare diseases), <strong>75%</strong>, and <strong>50%</strong></li>
    <li>For drugs not on the compensated list, individual compensation can be requested &mdash; the physician submits an application to NHS Latvia with clinical justification</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> ZVA and VMNVD are in Latvian. Google Translate handles Latvian adequately. Key terms: "kompens\u0113jamie" (compensated/reimbursed), "re\u0123istr\u0113ts" (registered), "aktiv\u0101 viela" (active substance).</p>
        `,
    },
    {
        code: "LB",
        name: "Lebanon",
        flag: "🇱🇧",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "MoPH — Lebanon National Drugs Database", url: "https://www.moph.gov.lb/en/Drugs/index/3/4848/lebanon-national-drugs-database" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "MoPH — Lebanon National Drug Index (LNDI)", url: "https://www.moph.gov.lb/en/Drugs/index/3/4848/lebanon-national-drug-index-lndi-" }],
            },
        ],
    },
    {
        code: "LT",
        name: "Lithuania",
        flag: "🇱🇹",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "VVKT — Medicines (English)", url: "https://vapris.vvkt.lt/vvkt-web/public/medications?lang=en" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "VLK — Compensated Medicines (Ligoniukasa)", url: "https://ligoniukasa.lrv.lt/" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "VVKT — HTA Reports", url: "https://www.vvkt.lt/index.php?2630360208" },
                    { label: "VVKT — Full Product List", url: "https://www.vvkt.lt/index.php?3032309441" },
                ],
            },
        ],
        tips: "If a medicine is not found via the VVKT Medicines search, use the full product list link in Additional Resources above.",
    },
    {
        code: "LU",
        name: "Luxembourg",
        flag: "🇱🇺",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "CNS — List of Marketed Medicines", url: "https://cns.public.lu/en/legislations/textes-coordonnes/liste-med-comm.html" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "CNS — Positive List (reimbursed drugs)", url: "https://cns.public.lu/en/professionnels-sante/medicaments/liste-positive.html" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "CNS — Medicaments overview (French)", url: "https://cns.public.lu/fr/professionnels-sante/medicaments.html" }],
            },
        ],
        notes: "In the 'Liste des Médicaments Commercialisés' (CNS), if Prix d'achat pharm., Prix public, and Taux are all listed as 0, the medicine is likely not currently available or reimbursed in Luxembourg.",
        tipsHtml: `
<h4 class="tips-heading">CNS Positive List &amp; Reading Zero-Price Entries</h4>
<ol>
    <li>CNS (Caisse Nationale de Sant&eacute;) is the single national health insurance fund. Luxembourg uses a single positive reimbursement list &mdash; products not on the list require exceptional authorisation</li>
    <li>Search the <a href="https://cns.public.lu/en/professionnels-sante/medicaments/liste-positive.html" target="_blank" rel="noopener">CNS positive list</a> by INN or product name. The list shows the reimbursement rate (taux) and the reimbursable price</li>
    <li><strong>If Prix d&rsquo;achat pharm., Prix public, and Taux are all 0</strong>, the product is registered in the system but is <strong>not currently marketed or reimbursed</strong> in Luxembourg &mdash; this is a common finding for products marketed in larger EU markets but not in Luxembourg&rsquo;s small market (~670,000 population)</li>
</ol>

<h4 class="tips-heading">Pricing &amp; Market Context</h4>
<ol>
    <li>Luxembourg closely follows <strong>Belgian pricing</strong> as a reference &mdash; prices for reimbursed medicines are generally aligned with Belgian levels. Luxembourg also participates in BeNeLuxA joint negotiations for expensive medicines</li>
    <li>The CNS website has French, German, and English sections &mdash; the most complete drug list information is in French or German. INN names are in Latin characters</li>
    <li>For EMA centrally authorised products not marketed in Luxembourg, the product may still be available for individual patients via exceptional import authorisation</li>
</ol>
        `,
    },
    {
        code: "MT",
        name: "Malta",
        flag: "🇲🇹",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The Medicines Authority (MA) is the national regulatory body. As an EU member state, EMA centrally authorised products are valid in Malta. National authorisations follow the mutual recognition (MRP) or decentralised (DCP) procedures. The MA also manages medical devices regulation and pharmacovigilance.",
                links: [
                    { label: "Medicines Authority \u2014 Advanced Search", url: "https://medicinesauthority.gov.mt/advanced-search" },
                    { label: "Medicines Authority \u2014 Official Website", url: "https://medicinesauthority.gov.mt/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "The Directorate for Pharmaceutical Affairs (DPA) within the Superintendence of Public Health houses a Pharmaceutical Pricing Unit. Malta uses external reference pricing (ERP) benchmarked against EU countries with GDP per capita within \u00b120% of Malta\u2019s. The DPA sets maximum wholesale and retail mark-ups. There is no formal manufacturer price negotiation for non-formulary medicines \u2014 pricing is market-driven within the ERP ceiling.",
                links: [
                    { label: "DPA \u2014 Directorate for Pharmaceutical Affairs", url: "https://deputyprimeminister.gov.mt/dpa/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "The Government Formulary List (GFL) determines which medicines are available free of charge through the public health system. The Pharmacy of Your Choice (POYC) scheme serves 170,000+ outpatients (~33% of the population), allowing chronic patients to collect GFL medicines from community pharmacies. Entitlement is via Schedule V (Yellow Card \u2014 83 chronic conditions, free medicines regardless of income) or Schedule II (Pink Card \u2014 means-tested, covers all GFL medicines for low-income residents). GFL downloadable PDFs are available from the DPA website.",
                links: [
                    { label: "POYC (Pharmacy of Your Choice) Scheme", url: "https://poyc.gov.mt/" },
                    { label: "DPA \u2014 Government Formulary List (GFL)", url: "https://deputyprimeminister.gov.mt/dpa/government-formulary-list/" },
                ],
            },
            {
                id: "hta",
                title: "Health Technology Assessment",
                body: "The DPA houses an HTA Unit that performs Relative Effectiveness Assessments (REAs) and budget impact analyses to inform GFL inclusion decisions. Malta participates in EUnetHTA joint assessments and is preparing for the EU HTA Regulation (HTAR) which takes effect January 2025 for oncology and ATMPs.",
                links: [
                    { label: "DPA \u2014 HTA Unit", url: "https://deputyprimeminister.gov.mt/dpa/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Ministry for Active Ageing", url: "https://activeageing.gov.mt/" },
                    { label: "Mater Dei Hospital \u2014 Main Public Hospital", url: "https://www.gov.mt/en/Government/Government%20of%20Malta/Ministries%20and%20Entities/Pages/Ministries%20and%20Entities.aspx" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Small Market &amp; EMA Status</h4>
<ol>
    <li>Malta (~520,000 population) is a small EU market. EMA centrally authorised products are automatically valid in Malta without a separate national application</li>
    <li>Search the <a href="https://medicinesauthority.gov.mt/advanced-search" target="_blank" rel="noopener">Medicines Authority advanced search</a> for nationally authorised products &mdash; the database has an English interface</li>
    <li>Many products authorised in larger EU markets may not have been commercially launched in Malta due to the small market size. Products may be imported or ordered through compassionate use / special authorisation routes</li>
</ol>

<h4 class="tips-heading">Pricing &amp; Reimbursement</h4>
<ol>
    <li>The <strong>Directorate for Pharmaceutical Affairs (DPA)</strong> sets prices using external reference pricing (ERP) against EU countries with similar GDP per capita (\u00b120%)</li>
    <li>The <strong>Government Formulary List (GFL)</strong> determines free medicines &mdash; downloadable as PDFs from the <a href="https://deputyprimeminister.gov.mt/dpa/government-formulary-list/" target="_blank" rel="noopener">DPA website</a></li>
    <li>The <a href="https://poyc.gov.mt/" target="_blank" rel="noopener">POYC (Pharmacy of Your Choice)</a> scheme serves 170,000+ outpatients (~33% of population) &mdash; chronic patients collect GFL medicines from community pharmacies</li>
    <li>Patient entitlement: <strong>Schedule V (Yellow Card)</strong> covers 83 chronic conditions (free regardless of income); <strong>Schedule II (Pink Card)</strong> is means-tested for low-income residents</li>
    <li>Medicines not on the GFL may be accessed through the <strong>Exceptional Medicinal Treatment (EMT)</strong> pathway via individual patient applications</li>
</ol>

<h4 class="tips-heading">HTA</h4>
<ol>
    <li>The DPA\u2019s <strong>HTA Unit</strong> performs Relative Effectiveness Assessments (REAs) and budget impact analyses for GFL inclusion decisions</li>
    <li>Malta participates in <strong>EUnetHTA</strong> joint assessments and is preparing for the EU HTA Regulation (HTAR) which applies from January 2025 for oncology and ATMPs</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Due to Malta\u2019s small size, commercial launch may lag behind larger EU markets. For access to non-launched products, enquire about compassionate use or named-patient import through the Medicines Authority.</p>
        `,
    },
    {
        code: "MX",
        name: "Mexico",
        flag: "🇲🇽",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "COFEPRIS (Comisión Federal para la Protección contra Riesgos Sanitarios) handles drug registration via the Registro Sanitario. Dossiers follow ICH CTD format and are submitted through the DIGIPRiS digital platform. An Abbreviated Pathway (active from September 2025) allows expedited review (45 days) for products already approved by reference regulators including FDA, EMA, Health Canada, TGA, ANVISA, and MFDS.",
                links: [
                    { label: "COFEPRIS — Registro Sanitario Search", url: "https://tramiteselectronicos02.cofepris.gob.mx/BuscadorPublicoRegistrosSanitarios/BusquedaRegistroSanitario.aspx" },
                    { label: "COFEPRIS — DIGIPRiS (Digital Submissions Portal)", url: "https://digiprisregulacionenlinea.cofepris.gob.mx/" },
                    { label: "COFEPRIS — Official Website", url: "https://www.gob.mx/cofepris" },
                ],
            },
            {
                id: "hta",
                title: "HTA &amp; Formulary (Cuadro Básico)",
                body: "CENETEC (Centro Nacional de Excelencia Tecnológica en Salud) is the official HTA body under the Secretaría de Salud. It produces health technology assessments and clinical practice guidelines that inform the Cuadro Básico de Medicamentos (CBM). The Consejo de Salubridad General manages CBM inclusions via its Interinstitutional Commission — listing in the CBM is required for procurement by all public health institutions (IMSS, ISSSTE, IMSS-Bienestar, MoH). Inclusion requests go through a three-stage evaluation: admissibility → scientific review → final ruling, considering clinical efficacy, safety, cost-effectiveness, and pharmacoeconomic data.",
                links: [
                    { label: "CENETEC — Centro Nacional de Excelencia Tecnológica en Salud", url: "http://www.cenetec.salud.gob.mx/" },
                    { label: "Compendio Nacional de Insumos para la Salud (Consejo de Salubridad General)", url: "http://www.gob.mx/csg/articulos/medicamentos-compendio-nacional-de-insumos-para-la-salud-2025" },
                    { label: "IMSS — Cuadro Básico de Medicamentos", url: "https://www.imss.gob.mx/profesionales-salud/cuadros-basicos/medicamentos" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement — Payer Landscape",
                body: "Mexico has multiple parallel public payers: IMSS (formal-sector workers and families, ~37% of population) provides medicines free at point of use; ISSSTE (public-sector employees, ~6%) operates similarly; IMSS-Bienestar (since 2023, replacing INSABI which replaced Seguro Popular in 2020) covers informal/uninsured population in 19 states. All institutions procure from the CBM. Private-sector patients pay largely out-of-pocket (~50% of total health spend); voluntary maximum retail price (MRP) caps apply to patented drugs but are not strictly enforced.",
                links: [
                    { label: "IMSS (Instituto Mexicano del Seguro Social)", url: "https://www.imss.gob.mx/" },
                    { label: "ISSSTE (Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado)", url: "https://www.issste.gob.mx/" },
                    { label: "IMSS-Bienestar", url: "https://www.imss.gob.mx/imss-bienestar" },
                    { label: "Secretaría de Salud — Official Site", url: "https://www.gob.mx/salud" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing — Public Tenders",
                body: "Unlike most markets, Mexico has no published ex-factory price list for public-sector drugs. Prices are determined exclusively through competitive procurement tenders. BIRMEX (Laboratorios de Biológicos y Reactivos de México), a state-owned entity, leads the biannual Compra Consolidada (consolidated purchase) on behalf of all federal health institutions. All federal tenders are published on CompraNet. Historical awarded prices, bid specifications, and contract documents are accessible through CompraNet and the Secretaría de Salud procurement portal. The CCPNM (Coordinating Commission for Negotiating Medicine Prices), which negotiated patented drug prices 2008–2020, was disbanded under INSABI reforms; price negotiation is now embedded in the BIRMEX tender process. UNOPS managed procurement on behalf of INSABI from 2020 to December 2022 before domestic institutions resumed control.",
                links: [
                    { label: "CompraNet — Federal e-Procurement Platform (tender search &amp; awards)", url: "https://compranet.funcionpublica.gob.mx/" },
                    { label: "Compra Consolidada — Ministry of Health Procurement Portal", url: "https://compraconsolidada.salud.gob.mx/" },
                    { label: "BIRMEX — Laboratorios de Biológicos y Reactivos de México", url: "https://www.birmex.gob.mx/" },
                    { label: "IMSS Compras — IMSS Procurement Archive", url: "https://compras.imss.gob.mx/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">How Public-Sector Drug Prices Work in Mexico</h4>
<ol>
    <li>There is <strong>no published reference price list</strong> for public-sector pharmaceuticals in Mexico. The effective public price is whatever winning tender price is awarded in the most recent <strong>Compra Consolidada</strong></li>
    <li><strong>BIRMEX</strong> runs the consolidated tender process on behalf of IMSS, ISSSTE, IMSS-Bienestar, MoH, PEMEX, and other federal entities — pooling demand to maximise negotiating leverage. Products must be in the <strong>Cuadro Básico de Medicamentos (CBM)</strong> to be eligible for public procurement</li>
    <li>Tenders are published on <strong>CompraNet</strong> (<a href="https://compranet.funcionpublica.gob.mx/" target="_blank" rel="noopener">compranet.funcionpublica.gob.mx</a>). Award documents include lot-level prices and supplier names — this is the primary source for benchmarking public-sector prices. The Ministry of Health procurement portal (<a href="https://compraconsolidada.salud.gob.mx/" target="_blank" rel="noopener">compraconsolidada.salud.gob.mx</a>) contains Compra Consolidada-specific records</li>
    <li>The <strong>2025–2026 consolidated tender</strong> was declared null by the Anti-Corruption Ministry due to procedural violations — over 70% of lots were left unawarded. Expect ongoing supply disruptions and re-tendering activity; verify current status before any market access planning</li>
</ol>
<h4 class="tips-heading">CBM Inclusion — Key Access Gate</h4>
<ol>
    <li>CBM inclusion by the Consejo de Salubridad General is a prerequisite for public-sector sales. The three-stage process (admissibility → scientific review → ruling) is CENETEC-informed but ultimately decided by the Interinstitutional Commission</li>
    <li>CENETEC HTA recommendations are <strong>advisory, not binding</strong> — but a favourable assessment significantly strengthens the CBM inclusion dossier</li>
</ol>
<h4 class="tips-heading">Payer Complexity</h4>
<ol>
    <li>Each institution (IMSS, ISSSTE, IMSS-Bienestar) nominally maintains its own drug list, though all align with the CBM. IMSS is by far the largest buyer and the most important for commercial success in the public segment</li>
    <li>The private market (~50% of spend) operates without reference pricing. Voluntary MRP caps for patented products are self-reported and lightly enforced — private-sector prices can differ substantially from public tender prices</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> All regulatory and procurement materials are in Spanish. CompraNet and COFEPRIS portals are Spanish-only. Google Translate handles Mexican regulatory Spanish adequately for navigation.</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Melanoma avanzado (initial indication); subsequently expanded to NSCLC and other oncology indications",
            steps: [
                {
                    title: "COFEPRIS Registration",
                    date: "2015\u20132016",
                    detail: 'COFEPRIS (Comisi\u00f3n Federal para la Protecci\u00f3n contra Riesgos Sanitarios) granted marketing authorization for pembrolizumab for advanced melanoma. Mexico has implemented expedited review pathways for priority oncology drugs, and COFEPRIS references FDA and EMA approvals to accelerate its evaluation. Subsequent indication expansions covered NSCLC, head & neck SCC, Hodgkin lymphoma, and other tumour types.',
                    links: [
                        { label: "COFEPRIS \u2014 Drug Registry", url: "https://www.gob.mx/cofepris" },
                    ],
                },
                {
                    title: "Cuadro B\u00e1sico y Cat\u00e1logo de Medicamentos (CBM) Listing",
                    date: "2017\u20132018",
                    detail: 'The <strong>CSG</strong> (Consejo de Salubridad General) evaluated pembrolizumab for inclusion in the Cuadro B\u00e1sico y Cat\u00e1logo de Medicamentos (CBM) \u2014 the master formulary that all public institutions (IMSS, ISSSTE, IMSS-Bienestar) must reference. Inclusion in the CBM is a prerequisite for public-sector procurement. The CSG evaluation considers clinical evidence, cost-effectiveness, and budget impact. Pembrolizumab was listed for specific oncology indications with defined clinical criteria.',
                    links: [
                        { label: "CSG \u2014 Cuadro B\u00e1sico de Medicamentos", url: "http://www.csg.gob.mx/contenidos/priorizacion/cuadro-basico/med/catalogos.html" },
                    ],
                },
                {
                    title: "IMSS / ISSSTE Procurement",
                    date: "From 2018",
                    detail: 'Once listed on the CBM, public institutions procure pembrolizumab through consolidated tenders. <strong>IMSS</strong> (covering ~60% of the insured population) is the largest single buyer. Procurement is via CompraNet/UNOPS (international procurement was used 2020\u20132023, now transitioning to the IMSS-Bienestar model). Public tender prices are typically 30\u201350% below list prices due to volume-based negotiation. The private market (~50% of pharmaceutical spend) operates at different prices without reference pricing constraints.',
                    links: [
                        { label: "CompraNet \u2014 Government Procurement", url: "https://compranet.hacienda.gob.mx/web/login.html" },
                        { label: "IMSS", url: "https://www.imss.gob.mx/" },
                    ],
                },
            ],
            takeaway: 'Mexico\u2019s pathway demonstrates the CSG-CBM gatekeeping function: without CBM listing, a drug cannot be procured by any public institution. IMSS\u2019s purchasing power as the largest single buyer drives significant price reductions. The ~50% private market segment operates independently with different pricing. Mexico\u2019s ongoing healthcare restructuring (from Seguro Popular to INSABI to IMSS-Bienestar) has created procurement disruptions that can affect drug availability even after CBM listing.',
        },
    },
    {
        code: "ME",
        name: "Montenegro",
        flag: "🇲🇪",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "CJNMED \u2014 Humani lijekovi register", url: "https://secure.cinmed.me/Portal/faces/registarHumani" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "Fond za zdravstveno osiguranje \u2014 Lista ljekova", url: "https://fzocg.me/lista-ljekova/" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "CJNMED \u2014 Maximum Price of Medicines", url: "https://secure.cinmed.me/Portal/faces/dinamickeStrane?paramPut=+%3E+Humani+ljekovi+%3E+Maksimalne+cijene+ljekova&paramRender=1&paramS=151" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Small Market &amp; Regional Context</h4>
<ol>
    <li>Montenegro (~620,000 population) is an EU candidate country. It operates its own independent regulatory pathway (CJNMED) &mdash; EMA authorisations are not automatically valid, but Montenegro frequently references EMA assessments in its own process</li>
    <li>Maximum prices are set by CJNMED using reference pricing against neighbouring countries (Serbia, Croatia, Slovenia) &mdash; prices are generally among the lowest in the Western Balkans region</li>
    <li>The Health Insurance Fund (Fond za zdravstveno osiguranje) maintains the reimbursement drug list. Products must be on the list to be reimbursed; hospital drugs are funded separately</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> CJNMED and the Health Insurance Fund websites are in Montenegrin/Serbian (Latin script). INN names are in Latin characters. Google Translate handles Serbian/Montenegrin (Latin) adequately.</p>
        `,
    },
    {
        code: "NL",
        name: "Netherlands",
        flag: "🇳🇱",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "CBG-MEB (Medicines Evaluation Board)", url: "https://www.cbg-meb.nl/" },
                    { label: "Geneesmiddeleninformatiebank (GIB)", url: "https://www.geneesmiddeleninformatiebank.nl/" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "Zorginstituut Nederland (ZIN) is the Dutch HTA body. It assesses medicines against 4 package criteria: effectiveness, cost-effectiveness, necessity, and feasibility. Expensive hospital drugs enter the sluis (lock) procedure — temporarily excluded from the basic package until assessment and price negotiation are complete.",
                links: [
                    { label: "Zorginstituut Nederland", url: "https://www.zorginstituutnederland.nl/" },
                    { label: "Zorginstituut — GVS Assessments (Outpatient)", url: "https://www.zorginstituutnederland.nl/werkagenda/overzicht-gvs-adviezen" },
                    { label: "Zorginstituut — Package Advice (Hospital/Sluis)", url: "https://www.zorginstituutnederland.nl/werkagenda/overzicht-pakketadviezen" },
                    { label: "Medicines Currently in the Sluis", url: "https://www.zorginstituutnederland.nl/over-ons/programmas-en-samenwerkingsverbanden/horizonscan-geneesmiddelen/sluis-voor-dure-geneesmiddelen/overzicht-geneesmiddelen-in-de-sluis" },
                    { label: "Horizonscan Geneesmiddelen (pipeline)", url: "https://www.horizonscangeneesmiddelen.nl/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "The WGP (Wet geneesmiddelenprijzen) sets maximum prices as the average of prices in Belgium, France, Norway, and UK (recalculated biannually on 1 April and 1 October). Farmatec administers the maximum price list. NZa sets pharmacy dispensing fees and hospital add-on tariffs.",
                links: [
                    { label: "Medicijnkosten.nl (prices & reimbursement status)", url: "https://www.medicijnkosten.nl/" },
                    { label: "Farmatec — WGP Maximum Prices", url: "https://www.farmatec.nl/prijsvorming/wet-geneesmiddelenprijzen" },
                    { label: "Farmatec — Maximum Price List (download)", url: "https://www.farmatec.nl/prijsvorming/wet-geneesmiddelenprijzen/berekening-maximumprijzen" },
                    { label: "NZa (Dutch Healthcare Authority)", url: "https://www.nza.nl/english" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "The GVS (Geneesmiddelenvergoedingssysteem) determines outpatient drug reimbursement. Drugs are placed on Bijlage 1A (reference pricing clusters with reimbursement limits) or 1B (unique drugs, fully reimbursed). Bijlage 2 adds conditions. Expensive specialist drugs go through the sluis procedure with price negotiation.",
                links: [
                    { label: "Zorginstituut — GVS System Explained", url: "https://english.zorginstituutnederland.nl/about-us/working-methods-and-procedures/assessment-of-outpatient-medicines-for-the-benefit-of-the-medicine-reimbursement-system-gvs" },
                    { label: "Farmatec — GVS Overview", url: "https://www.farmatec.nl/prijsvorming/geneesmiddelenvergoedingssysteem" },
                    { label: "Farmatec — Reimbursement Processing Dashboard", url: "https://www.farmatec.nl/prijsvorming/dashboard-doorlooptijden-geneesmiddelen" },
                    { label: "GIPdatabank (drug utilization & expenditure data)", url: "https://www.gipdatabank.nl/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Farmacotherapeutisch Kompas (prescribing reference)", url: "https://www.farmacotherapeutischkompas.nl/" },
                    { label: "KNMP (Royal Dutch Pharmacists Association)", url: "https://www.knmp.nl/" },
                    { label: "Lareb (Pharmacovigilance Centre)", url: "https://www.lareb.nl/en" },
                    { label: "KNMP Farmanco (drug shortages)", url: "https://farmanco.knmp.nl/" },
                    { label: "Guideline for Economic Evaluations (2024, PDF)", url: "https://english.zorginstituutnederland.nl/documents/2024/01/16/guideline-for-economic-evaluations-in-healthcare" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">GVS Reimbursement System</h4>
<ol>
    <li><strong>Bijlage 1A</strong> (Annex 1A): Clusters of interchangeable medicines (~500 clusters) with a <strong>vergoedingslimiet</strong> (reimbursement limit). If the pharmacy purchase price (AIP) exceeds the limit, the patient pays the difference (co-payment capped at EUR 250/year since 2019)</li>
    <li><strong>Bijlage 1B</strong> (Annex 1B): Unique medicines with no equivalent — fully reimbursed, no vergoedingslimiet. New unique outpatient drugs require a full pharmacoeconomic assessment by Zorginstituut for 1B placement</li>
    <li><strong>Bijlage 2</strong> (Annex 2): Additional reimbursement conditions (specific indications, specialist initiation, etc.) — applies to medicines on 1A or 1B</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Use <a href="https://www.medicijnkosten.nl/" target="_blank" rel="noopener">Medicijnkosten.nl</a> to look up any outpatient medicine's GVS status, vergoedingslimiet, and co-payment. Updated monthly. The <a href="https://www.medicijnkosten.nl/toelichting" target="_blank" rel="noopener">Toelichting page</a> explains all fields.</p>

<h4 class="tips-heading">Sluis (Lock) Procedure — Expensive Hospital Drugs</h4>
<ol>
    <li>Applies to new hospital medicines costing <strong>EUR 20M+/year</strong> (threshold tightened from EUR 40M in July 2023), or EUR 10M+/year AND >EUR 50,000/patient/year</li>
    <li>Three phases: <strong>Submission</strong> (manufacturer files dossier) &rarr; <strong>Assessment</strong> (Zorginstituut evaluates, target 120 days) &rarr; <strong>Negotiation</strong> (Minister negotiates price)</li>
    <li>During the sluis period, the medicine is <strong>excluded</strong> from the basic insurance package — it cannot be reimbursed until released</li>
    <li>Track current sluis medicines at <a href="https://www.zorginstituutnederland.nl/over-ons/programmas-en-samenwerkingsverbanden/horizonscan-geneesmiddelen/sluis-voor-dure-geneesmiddelen/overzicht-geneesmiddelen-in-de-sluis" target="_blank" rel="noopener">Zorginstituut's sluis overview</a>. The <a href="https://www.farmatec.nl/prijsvorming/dashboard-doorlooptijden-geneesmiddelen" target="_blank" rel="noopener">Farmatec dashboard</a> shows processing times for each phase</li>
</ol>

<h4 class="tips-heading">WGP Maximum Pricing</h4>
<ol>
    <li>The <strong>WGP (Wet geneesmiddelenprijzen)</strong> sets maximum prices as the average of list prices in <strong>Belgium, France, Norway, and UK</strong> (Norway replaced Germany in April 2020)</li>
    <li>Recalculated <strong>twice yearly</strong> (1 April and 1 October). Downloadable Excel list at <a href="https://www.farmatec.nl/prijsvorming/wet-geneesmiddelenprijzen/berekening-maximumprijzen" target="_blank" rel="noopener">Farmatec</a></li>
    <li>Pharmacists may not pay more than the maximum price; manufacturers may not charge more</li>
</ol>

<h4 class="tips-heading">HTA Assessments</h4>
<ol>
    <li>Zorginstituut evaluates against <strong>4 package criteria</strong>: effectiveness, cost-effectiveness, necessity (proportional shortfall), and feasibility</li>
    <li><strong>WTP thresholds</strong> (per QALY): EUR 20,000 (low severity, shortfall 0.10–0.40), EUR 50,000 (medium, 0.41–0.70), EUR 80,000 (high, 0.71–1.00)</li>
    <li>Find assessments: <a href="https://www.zorginstituutnederland.nl/werkagenda/overzicht-gvs-adviezen" target="_blank" rel="noopener">GVS assessments</a> (outpatient) or <a href="https://www.zorginstituutnederland.nl/werkagenda/overzicht-pakketadviezen" target="_blank" rel="noopener">Package advice</a> (hospital/sluis)</li>
    <li>The <a href="https://www.horizonscangeneesmiddelen.nl/" target="_blank" rel="noopener">Horizonscan</a> identifies pipeline medicines expected to enter the Dutch market within ~2 years</li>
</ol>
<p class="tips-note"><strong>Clinical reference:</strong> The <a href="https://www.farmacotherapeutischkompas.nl/" target="_blank" rel="noopener">Farmacotherapeutisch Kompas</a> is the standard prescribing reference used by Dutch physicians — essential for understanding local treatment guidelines and formulary positioning.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Eerstelijns onderhoudsbehandeling van lokaal gevorderd of gemetastaseerd urotheelcarcinoom zonder progressie na platinabevattende chemotherapie",
            steps: [
                {
                    title: "Marketing Authorization (EMA/EC)",
                    date: "25 January 2021",
                    detail: 'EC approved Bavencio for first-line maintenance UC. As an EMA centralised authorisation, the Dutch MA via CBG-MEB was automatic. The product was immediately visible in the Geneesmiddeleninformatiebank (GIB).',
                    links: [
                        { label: "GIB — Bavencio", url: "https://www.geneesmiddeleninformatiebank.nl/" },
                    ],
                },
                {
                    title: "Sluis (Lock) Procedure — Entry",
                    date: "Early 2021",
                    detail: 'Bavencio for UC maintenance entered the <strong>sluis (lock) procedure</strong> — the Dutch mechanism for expensive hospital medicines. During the sluis period, the medicine is <strong>excluded from the basic insurance package</strong> and cannot be reimbursed. The manufacturer submitted a dossier to Zorginstituut Nederland for assessment. The sluis was triggered because the expected annual budget impact exceeded the EUR 20M threshold.',
                    links: [
                        { label: "Zorginstituut — Sluis overview", url: "https://www.zorginstituutnederland.nl/over-ons/programmas-en-samenwerkingsverbanden/horizonscan-geneesmiddelen/sluis-voor-dure-geneesmiddelen/overzicht-geneesmiddelen-in-de-sluis" },
                    ],
                },
                {
                    title: "Zorginstituut Package Advice",
                    date: "21 July 2021",
                    detail: 'Zorginstituut Nederland published its package advice (<em>pakketadvies</em>): <strong>conditional positive recommendation</strong>. The assessment concluded avelumab provides significant clinical benefit — an average life extension of approximately 7 months compared to best supportive care. However, the assessment recommended inclusion in the basic healthcare package conditional on a <strong>minimum 30% price reduction</strong> negotiated with the manufacturer. The cost-effectiveness was assessed against the Dutch WTP threshold (up to EUR 80,000/QALY for high-severity conditions).',
                    links: [
                        { label: "Zorginstituut — Pakketadvies Bavencio (English)", url: "https://english.zorginstituutnederland.nl/publications/reports/2021/07/21/package-advice-on-avelumab-bavencio" },
                        { label: "Zorginstituut — Pakketadvies Bavencio (Dutch)", url: "https://www.zorginstituutnederland.nl/publicaties/adviezen/2021/07/21/pakketadvies-avelumab-bavencio-bij-de-behandeling-van-blaaskanker" },
                    ],
                },
                {
                    title: "Price Negotiation & Reimbursement",
                    date: "2021–2022",
                    detail: 'The Minister of Health negotiated the price with the manufacturer. Upon reaching agreement (with the required minimum 30% discount), avelumab was released from the sluis and included in the basic healthcare package (<em>basispakket</em>). The negotiated price is confidential. Dutch patients with UC maintenance can now access avelumab through hospital pharmacies with no additional out-of-pocket cost beyond the standard deductible (eigen risico, EUR 385/year in 2024).',
                    links: [
                        { label: "Farmatec — Sluis processing dashboard", url: "https://www.farmatec.nl/prijsvorming/dashboard-doorlooptijden-geneesmiddelen" },
                    ],
                },
            ],
            takeaway: 'Bavencio in the Netherlands illustrates the sluis (lock) procedure — the Dutch gatekeeper for expensive hospital medicines. During the sluis, patients have <em>no reimbursed access</em>, creating a significant access delay. The Zorginstituut assessment openly published the required minimum price discount (30%), a transparency measure unusual in Europe. The sluis process took approximately 12 months from EMA approval to reimbursed access — faster than some comparable systems.',
        },
    },
    {
        code: "NO",
        name: "Norway",
        flag: "🇳🇴",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "Legemiddelverket (Norwegian Medicines Agency)", url: "https://legemiddelverket.no/english/" },
                    { label: "Legemiddels\u00f8k \u2014 Drug Search", url: "https://www.legemiddelsok.no/" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "Norway has two HTA tracks: Legemiddelverket conducts Single Technology Assessments (STAs) for outpatient (blue prescription) medicines; Nye Metoder (New Methods) assesses hospital medicines for the specialist health services on behalf of the four regional health authorities.",
                links: [
                    { label: "Legemiddelverket \u2014 Single Technology Assessments", url: "https://legemiddelverket.no/english/public-funding-and-pricing/single-technology-assessments-status-and-reports" },
                    { label: "Nye Metoder (New Methods \u2014 hospital medicines)", url: "https://nyemetoder.no/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Maximum prices are set by Legemiddelverket using external reference pricing from 9 EU/EEA countries. Step prices automatically reduce the maximum price when generics enter the market (typically \u221235% at 12 months, then \u221272% for high-volume products at 24 months).",
                links: [
                    { label: "Legemiddelverket \u2014 Maximum Price List", url: "https://legemiddelverket.no/english/public-funding-and-pricing/maximum-price" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Prescription medicines are reimbursed under the \u2018blue prescription\u2019 (bl\u00e5 resept) system. General reimbursement (\u00a72) is automatic for listed chronic conditions. Individual reimbursement (\u00a73a) requires a physician application for conditions not on the general list.",
                links: [
                    { label: "Legemiddelverket \u2014 Reimbursement (Blue Prescription)", url: "https://legemiddelverket.no/english/public-funding-and-pricing/reimbursement" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Two HTA Tracks</h4>
<ol>
    <li><strong>Outpatient (community pharmacy) medicines</strong>: Assessed by <a href="https://legemiddelverket.no/english/public-funding-and-pricing/single-technology-assessments-status-and-reports" target="_blank" rel="noopener">Legemiddelverket STAs</a>. The STA evaluates clinical benefit, cost-effectiveness, and budget impact. A positive STA leads to inclusion on the blue prescription list (&sect;2 or &sect;3a)</li>
    <li><strong>Hospital medicines</strong>: Assessed by <a href="https://nyemetoder.no/" target="_blank" rel="noopener">Nye Metoder (New Methods)</a>, run jointly by the four regional health authorities (RHF). Results are binding for all Norwegian public hospitals. Both recommendations and full assessment reports are published online</li>
    <li>Norway has no published explicit ICER threshold &mdash; decisions are based on cost-effectiveness and budget impact in context of disease severity</li>
</ol>

<h4 class="tips-heading">Blue Prescription Reimbursement (&sect;2 vs. &sect;3a)</h4>
<ol>
    <li><strong>&sect;2 (General reimbursement)</strong>: Automatic at the pharmacy for specific chronic conditions listed in the Blue Prescription Regulation (Bl&aring;reseptforskriften). Patient pays a co-payment capped at ~NOK&nbsp;3,415/year (2025) across all healthcare services</li>
    <li><strong>&sect;3a (Individual reimbursement)</strong>: For diseases not on the &sect;2 list. The physician applies to Legemiddelverket on behalf of the patient &mdash; approval is time-limited and condition-specific</li>
    <li>Once the annual co-payment ceiling is reached, further prescriptions are <strong>free for the rest of the calendar year</strong></li>
</ol>
<p class="tips-note"><strong>Tip:</strong> To check if a medicine is on the &sect;2 list, search <a href="https://www.legemiddelsok.no/" target="_blank" rel="noopener">Legemiddels&oslash;k</a> &mdash; the product page shows reimbursement status and the relevant &sect;2 condition code.</p>

<h4 class="tips-heading">Pricing &mdash; Step Prices</h4>
<ol>
    <li>Maximum prices are the average of the three lowest prices among 9 reference countries (AT, BE, DK, FI, DE, IE, NL, SE, UK), recalculated twice yearly</li>
    <li>When a generic enters the market, <strong>step prices</strong> apply: the originator's maximum price is automatically cut to a defined percentage below its pre-generic price. For high-volume products: &minus;35% at launch, &minus;72% at 18 months</li>
    <li>Generic substitution is mandatory at pharmacies unless the physician marks "do not substitute" (and the patient pays the difference)</li>
</ol>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Førstelinjevedlikeholdsbehandling av lokalavansert eller metastatisk urotelialt karsinom uten progresjon etter platinabasert kjemoterapi",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. As an EEA member, Norway is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "Legemiddelverket — Single Technology Assessment (STA)",
                    date: "August 2021",
                    detail: 'Statens legemiddelverk (Norwegian Medicines Agency) conducted a hurtig metodevurdering (rapid health technology assessment) with a cost-utility analysis for avelumab as monotherapy for first-line maintenance UC. The assessment was commissioned by Bestillerforum RHF on 26 October 2020. The STA report was cleared by Bestillerforum on <strong>10 August 2021</strong> and sent to the four regional health authorities for preparation of the Beslutningsforum case.',
                    links: [
                        { label: "Nye Metoder — Avelumab (Bavencio)", url: "https://www.nyemetoder.no/metoder/avelumab-bavencio-indikasjon-iii" },
                    ],
                },
                {
                    title: "Beslutningsforum Decision — Approved",
                    date: "30 August 2021",
                    detail: 'Beslutningsforum for nye metoder (Decision Forum for New Methods) met on 30 August 2021 and decided: <strong>avelumab (Bavencio) is introduced</strong> as monotherapy for first-line maintenance treatment of adults with locally advanced or metastatic urothelial carcinoma who have not progressed after platinum-based chemotherapy. The decision was conditional on the price being equal to or lower than the price forming the basis for the decision. Treatment could commence from <strong>15 September 2021</strong> when the negotiated price took effect. Avelumab is funded through hospital specialist health service budgets — not the blue prescription (blå resept) system.',
                    links: [
                        { label: "Nye Metoder — Beslutningsforum 30.08.2021 documents", url: "https://www.nyemetoder.no/4a4ac2/siteassets/documents/beslutninger/beslutningsforum-30.08.2021---offentlige-sakspapirer.pdf" },
                    ],
                },
            ],
            takeaway: 'Norway\'s Nye Metoder system achieved approval in just 7 months from EC authorisation. The pathway — Bestillerforum commission → Legemiddelverket STA → Beslutningsforum decision — is sequential but efficient. As a hospital-administered drug, avelumab is funded by the specialist health services, not the community pharmacy blue prescription system. The Beslutningsforum decision is binding for all Norwegian public hospitals through the four regional health authorities.',
        },
    },
    {
        code: "OM",
        name: "Oman",
        flag: "🇴🇲",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The Drug Safety Center (formerly DGPADC) under the Ministry of Health handles drug registration under Royal Decree 35/2015. Oman is a member of the GCC-DR centralised registration system, which allows a single application to cover all 6 GCC states. Oman is one of four GCC countries with an accredited quality-testing laboratory for GCC-DR submissions.",
                links: [
                    { label: "MOH \u2014 Drug Safety Center", url: "https://www.moh.gov.om/en/hospitals-directorates/directorates-and-centers-at-hq/drug-safety-center/" },
                    { label: "MOH \u2014 Drug Registration & Prices", url: "https://moh.gov.om/en_us/web/dgpadc/-2" },
                    { label: "MOH \u2014 Official Website", url: "https://www.moh.gov.om/en" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Drug prices are regulated by the MOH at registration. Retail price = CIF price \u00d7 1.55 (55% fixed markup for imports; 34% for locally produced generics). Oman uses External Reference Pricing against 18\u201319 countries plus the country of origin (reduced from 31 in 2024). Medicines are tax-free. Prices are uniform across all regions.",
                links: [
                    { label: "MOH \u2014 Drug Registration & Prices", url: "https://moh.gov.om/en_us/web/dgpadc/-2" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Omani nationals receive free healthcare including medicines at government hospitals and health centres (government covers ~94% of health expenditure). The Oman National Formulary (ONF) guides prescribing in MOH facilities. Public procurement is centralised through DGMS (Directorate General of Medical Supplies) via the Esnad electronic tendering platform.",
                links: [
                    { label: "MOH \u2014 DGMS (Medical Supplies)", url: "https://www.moh.gov.om/en/hospitals-directorates/directorates-and-centers-at-hq/directorate-general-of-medical-supplies/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "GHC \u2014 Central Registration (GCC-DR)", url: "https://www.ghc.sa/en/central-registration/" },
                    { label: "WHO EMRO \u2014 Oman Essential Medicines", url: "https://www.emro.who.int/omn/programmes/essential-medicines.html" },
                    { label: "MOH \u2014 HTA Methodological Guidelines (2024, PDF)", url: "https://moh.gov.om/media/txzllfqa/book.pdf" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization</h4>
<ol>
    <li>Oman uses two registration pathways: <strong>national registration</strong> through the Drug Safety Center, and <strong>GCC centralised registration</strong> through the <a href="https://www.ghc.sa/en/central-registration/" target="_blank" rel="noopener">GCC-DR</a> office in Riyadh</li>
    <li>Products registered centrally through GCC-DR are recognised in all 6 GCC states after national finalisation (pricing + local certificate)</li>
    <li>The <a href="https://moh.gov.om/en_us/web/dgpadc/-2" target="_blank" rel="noopener">MOH Drug Registration & Prices page</a> lists registered manufacturers and products, but there is no fully interactive searchable drug database</li>
</ol>

<h4 class="tips-heading">Pricing &amp; Procurement</h4>
<ol>
    <li>Retail price = <strong>CIF \u00d7 1.55</strong> (55% total markup for imports); locally produced generics have a lower 34% markup. Medicines are <strong>tax-free</strong></li>
    <li>Oman uses <strong>External Reference Pricing</strong> against 18&ndash;19 countries (reduced from 31 in 2024 reforms) plus the country of origin, aligned with GCC price harmonisation</li>
    <li>Government hospital procurement is through centralised tenders managed by <a href="https://www.moh.gov.om/en/hospitals-directorates/directorates-and-centers-at-hq/directorate-general-of-medical-supplies/" target="_blank" rel="noopener">DGMS</a> via the Esnad electronic tendering platform, often at significant discounts to MRP</li>
</ol>

<h4 class="tips-heading">Reimbursement &amp; HTA</h4>
<ol>
    <li><strong>Omani nationals</strong> receive free healthcare including medicines at all government facilities (government covers ~94% of health expenditure)</li>
    <li>Expatriates access healthcare through employer-provided private insurance or self-pay</li>
    <li>The <strong>Oman National Formulary (ONF)</strong> guides prescribing in MOH facilities &mdash; no publicly accessible online formulary search is available</li>
    <li>Oman published its first <a href="https://moh.gov.om/media/txzllfqa/book.pdf" target="_blank" rel="noopener">HTA Methodological Guidelines</a> in 2024, with plans to establish a central HTA body under the MOH within 3&ndash;5 years</li>
</ol>
        `,
    },
    {
        code: "PE",
        name: "Peru",
        flag: "🇵🇪",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "DIGEMID (Direcci\u00f3n General de Medicamentos, Insumos y Drogas) under the Ministry of Health handles drug registration. The Registro Sanitario allows searching authorised pharmaceutical products.",
                links: [
                    { label: "DIGEMID \u2014 Registro Sanitario (drug registry)", url: "https://www.digemid.minsa.gob.pe/rsProductosFarmaceuticos/" },
                    { label: "DIGEMID \u2014 Official Website", url: "https://www.digemid.minsa.gob.pe/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Peru has no government price controls for retail sales \u2014 instead it relies on transparency. DIGEMID\u2019s Observatorio de Precios covers 16,000+ products across 30,000+ pharmacies nationwide, displaying prices from lowest to highest. Public procurement uses electronic reverse auctions via CENARES and the SEACE platform.",
                links: [
                    { label: "Observatorio de Precios (16,000+ products)", url: "https://opm-digemid.minsa.gob.pe/" },
                    { label: "CENARES (public procurement)", url: "https://www.gob.pe/cenares" },
                    { label: "SEACE (electronic procurement platform)", url: "https://apps.osce.gob.pe/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Peru has a segmented health system: SIS (Seguro Integral de Salud) covers low-income/uninsured populations, and EsSalud (social security) covers formal-sector employees. Both use the PNUME (Petitorio Nacional \u00danico de Medicamentos Esenciales) as the national formulary. FISSAL (Fondo Intangible Solidario de Salud) funds high-cost treatments for cancer, rare diseases, and other catastrophic conditions.",
                links: [
                    { label: "PNUME 2023 (national formulary, PDF)", url: "https://ietsi.essalud.gob.pe/wp-content/uploads/2024/08/Petitorio-Nacional-Unico-de-Medicamentos-Esenciales-PNUME_compressed.pdf" },
                    { label: "EsSalud Petitorio Farmacol\u00f3gico", url: "https://ietsi.essalud.gob.pe/petitorio-farmacologico-essalud/" },
                    { label: "SIS (Seguro Integral de Salud)", url: "https://www.gob.pe/sis" },
                    { label: "FISSAL \u2014 Covered Diseases", url: "https://www.gob.pe/9491-que-enfermedades-tienen-cobertura-por-fissal" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "MINSA (Ministry of Health)", url: "https://www.gob.pe/minsa" },
                    { label: "IETSI \u2014 HTA Evaluations", url: "https://ietsi.essalud.gob.pe/evaluacion-tecnologicas-sanitarias/" },
                    { label: "PAHO/WHO \u2014 Peru Country Profile", url: "https://country-profile.bvsalud.org/profile/PER/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization</h4>
<ol>
    <li>Search the <a href="https://www.digemid.minsa.gob.pe/rsProductosFarmaceuticos/" target="_blank" rel="noopener">DIGEMID Registro Sanitario</a> by product name, active ingredient, or registration holder</li>
    <li>Peru accepts abbreviated dossiers for products already approved by reference regulators (FDA, EMA, Health Canada) under the Decreto Supremo 014-2011-SA</li>
</ol>

<h4 class="tips-heading">Pricing &amp; Procurement</h4>
<ol>
    <li><strong>No retail price controls</strong> &mdash; Peru relies on transparency instead. Pharmacies must display comparative prices ordered lowest to highest using INN names</li>
    <li>The <a href="https://opm-digemid.minsa.gob.pe/" target="_blank" rel="noopener">Observatorio de Precios</a> covers <strong>16,000+ products across 30,000+ pharmacies</strong> nationwide &mdash; search by medication name, filter by location, and compare prices. Peru is one of only 7 countries worldwide with such an observatory (WHO MeTA project)</li>
    <li>Public procurement uses <strong>electronic reverse auctions</strong> via <a href="https://apps.osce.gob.pe/" target="_blank" rel="noopener">SEACE</a>, generating savings exceeding S/ 385 million over five years</li>
</ol>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li>The <strong>PNUME</strong> (updated 2023) is mandatory for all public-sector establishments. EsSalud also maintains its own <a href="https://ietsi.essalud.gob.pe/petitorio-farmacologico-essalud/" target="_blank" rel="noopener">Petitorio Farmacol&oacute;gico</a> (based on PNUME but with additional medicines evaluated by IETSI)</li>
    <li><strong>FISSAL</strong> covers the 7 most frequent cancers, chronic renal insufficiency (dialysis/transplant), 546 rare/orphan diseases, and bone marrow/renal/liver transplants for SIS beneficiaries</li>
    <li>Peru has <strong>two INAHTA-member HTA bodies</strong>: <a href="https://ietsi.essalud.gob.pe/evaluacion-tecnologicas-sanitarias/" target="_blank" rel="noopener">IETSI</a> (for EsSalud, 407 HTAs since 2014) and DIGEMID&rsquo;s ETS-URM team (for MINSA/PNUME updates)</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> All regulatory documents are in Spanish. Key terms: "registro sanitario," "petitorio nacional," "observatorio de precios."</p>
        `,
    },
    {
        code: "PH",
        name: "Philippines",
        flag: "🇵🇭",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "FDA Philippines — Drug Products List", url: "https://verification.fda.gov.ph/drug_productslist.php" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "Philippine National Formulary / EML (PDF)", url: "https://www.philhealth.gov.ph/partners/providers/pdf/PNF-EML_11022022.pdf" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "PhilHealth", url: "https://www.philhealth.gov.ph/about_us/" }],
            },
        ],
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma and NSCLC (initial Philippine FDA registration)",
            steps: [
                {
                    title: "Philippine FDA Registration",
                    date: "February 2016",
                    detail: 'FDA Philippines registered pembrolizumab for advanced melanoma and advanced NSCLC \u2014 approximately 17 months after the initial US FDA approval, making the Philippines relatively early among emerging markets. Initial availability was at Philippine General Hospital, Asian Hospital, National Kidney and Transplant Institute, and two centres in Cebu.',
                    links: [
                        { label: "FDA Philippines \u2014 Drug Verification", url: "https://verification.fda.gov.ph/drug_productslist.php" },
                    ],
                },
                {
                    title: "PhilHealth Coverage Gap",
                    date: "Ongoing \u2014 NOT covered",
                    detail: 'PhilHealth (Philippine Health Insurance Corporation) provides <strong>Z Benefits packages</strong> for specific cancers (childhood ALL, breast, prostate, cervical, colon, rectal cancers), but these generally cover surgery, chemotherapy, and radiation \u2014 <strong>not immunotherapy</strong>. Pembrolizumab is NOT specifically covered under any PhilHealth Z Benefits package. At ~PHP 256,000 per 100 mg vial (~USD 4,400), treatment is prohibitively expensive for most Filipino patients. PhilHealth coverage had no significant impact on avoiding financial catastrophe for cancer patients (PESO study).',
                    links: [
                        { label: "PhilHealth \u2014 Z Benefits", url: "https://www.philhealth.gov.ph/partners/providers/institutional/zbenefits/" },
                    ],
                },
                {
                    title: "Alternative Access Routes",
                    date: "Ongoing",
                    detail: 'Access to pembrolizumab in the Philippines relies on fragmented assistance programmes: <strong>DOH Medical Assistance Programme (MAP)</strong>, <strong>Malasakit Centers</strong> (one-stop hospital financial assistance combining PhilHealth, PCSO, DSWD, and DOH), <strong>PCSO IMAP</strong> (Individual Medical Assistance Programme via charity sweepstakes), and legislative/congressional assistance. These are not systematic coverage mechanisms but rather case-by-case financial support. The UHC Act (2019) and NICCA (National Integrated Cancer Control Act) aim to improve cancer care but have not yet expanded immunotherapy coverage.',
                    links: [
                        { label: "PhilHealth", url: "https://www.philhealth.gov.ph/about_us/" },
                    ],
                },
            ],
            takeaway: 'The Philippines illustrates a 10-year gap between regulatory approval (2016) and meaningful public coverage (still absent in 2026). Despite being one of the earliest emerging markets to register Keytruda, PhilHealth\u2019s Z Benefits packages do not cover immunotherapy. Patient access relies on a patchwork of charity and government assistance programmes (DOH MAP, PCSO, Malasakit Centers) rather than systematic insurance coverage. This makes the Philippines a case study in how regulatory approval without reimbursement creates a hollow market.',
        },
    },
    {
        code: "PL",
        name: "Poland",
        flag: "🇵🇱",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "e-Zdrowie — Register of Medicinal Products", url: "https://rejestrymedyczne.ezdrowie.gov.pl/rpl/search/public" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "Ministerstwo Zdrowia — Reimbursement Announcements", url: "https://www.gov.pl/web/zdrowie/leki-refundowane" },
                    { label: "Lekinfo24 — Reimbursement Status (example)", url: "https://www.lekinfo24.pl" },
                ],
            },
        ],
        notes: "Reimbursement in Poland is established via ministerial announcements rather than a continuously updated database.",
        tipsHtml: `
<h4 class="tips-heading">How Reimbursement Works in Poland</h4>
<ol>
    <li>Unlike most EU countries, Poland does NOT maintain a continuously updated online reimbursement database. The Minister of Health publishes the reimbursement list as a <strong>quarterly ministerial announcement</strong> (Obwieszczenie) in the official gazette &mdash; find the latest at <a href="https://www.gov.pl/web/zdrowie/leki-refundowane" target="_blank" rel="noopener">gov.pl/web/zdrowie/leki-refundowane</a></li>
    <li>HTA for reimbursement is conducted by <strong>AOTMiT</strong> (Agencja Oceny Technologii Medycznych i Taryfikacji / Agency for Health Technology Assessment and Tariff System). AOTMiT issues recommendations that inform the Ministry of Health&rsquo;s listing decision</li>
    <li>Reimbursement is organised by <strong>indication groups</strong> (grupy limitowe) &mdash; each group has a limit price. Medicines priced above the limit price require patient co-payment for the excess. Medicines at or below the limit are reimbursed with a fixed co-payment</li>
</ol>

<h4 class="tips-heading">Drug Programs (Programy Lekowe)</h4>
<ol>
    <li>Expensive oncology drugs and rare disease medicines are typically reimbursed via <strong>programy lekowe</strong> (drug programs) rather than standard pharmacy reimbursement</li>
    <li>Drug programs specify: eligible indications, entry/exclusion criteria, required diagnostic tests, dosing regimens, and monitoring requirements &mdash; these are strictly enforced</li>
    <li>Prescribing in a drug program is limited to authorised hospital departments; patients receive the drug free of charge within the program. Programs are listed in the ministerial reimbursement announcement</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> For current reimbursement status, the third-party portal <a href="https://www.lekinfo24.pl" target="_blank" rel="noopener">Lekinfo24.pl</a> aggregates ministerial announcements into a searchable format &mdash; useful for quick look-ups between quarterly updates. Always verify against the official announcement for binding information.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Leczenie podtrzymujące pierwszej linii miejscowo zaawansowanego lub przerzutowego raka urotelialnego bez progresji po chemioterapii opartej na platynie",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. As an EU member, Poland is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "AOTMiT Assessment & Recommendation",
                    date: "2022",
                    detail: 'AOTMiT (Agency for Health Technology Assessment and Tariff System) issued <strong>Recommendation No. 12/2022</strong> for Bavencio (avelumabum). The AOTMiT President\'s recommendation was <strong>positive</strong>, supporting reimbursement of avelumab as first-line maintenance monotherapy for locally advanced or metastatic UC. The assessment was based on the JAVELIN Bladder 100 OS data and a cost-effectiveness analysis against best supportive care.',
                    links: [
                        { label: "AOTMiT — Bavencio Recommendation", url: "https://www.aotm.gov.pl/aktualnosci/najnowsze/rekomendacja-prezesa-bavencio-avelumabum/" },
                    ],
                },
                {
                    title: "NFZ Drug Program B.141 Listing",
                    date: "2022–present",
                    detail: 'Avelumab is reimbursed by the NFZ (National Health Fund) under <strong>drug program B.141</strong> ("Leczenie pacjentów z rakiem urotelialnym" — Treatment of patients with urothelial cancer). Drug programs in Poland are the primary pathway for expensive oncology medicines — they specify eligible indications, entry/exclusion criteria, required diagnostics, dosing, and monitoring. Prescribing is limited to authorised hospital departments. Patients receive the drug <strong>free of charge</strong> within the program. The target population is estimated at 3,000–4,000 eligible patients annually.',
                    links: [
                        { label: "Ministry of Health — Reimbursed Medicines List", url: "https://www.gov.pl/web/zdrowie/leki-refundowane" },
                    ],
                },
            ],
            takeaway: 'Bavencio in Poland illustrates the programy lekowe (drug program) pathway — the standard route for expensive oncology drugs. Unlike pharmacy-dispensed medicines, drug programs provide 100% coverage but with strict clinical criteria and hospital-only prescribing. The AOTMiT positive recommendation (No. 12/2022) was followed by inclusion in drug program B.141, giving eligible UC patients free access through authorised centres.',
        },
    },
    {
        code: "PT",
        name: "Portugal",
        flag: "🇵🇹",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "INFARMED (National Medicines Authority)", url: "https://www.infarmed.pt/web/infarmed-en" },
                    { label: "INFOMED — Drug Database", url: "https://extranet.infarmed.pt/INFOMED-fo/" },
                    { label: "INFARMED — Medicine Search", url: "https://www.infarmed.pt/web/infarmed/servicos-on-line/pesquisa-do-medicamento" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "INFARMED uniquely combines regulatory, HTA, and pricing functions under one agency. HTA is performed by DATS (staff experts) and CATS (advisory committee) under the SiNATS framework (Decree-Law 97/2015). Hospital drugs undergo a separate prior evaluation (avalia\u00e7\u00e3o pr\u00e9via hospitalar).",
                links: [
                    { label: "INFARMED — Health Technology Assessment", url: "https://www.infarmed.pt/web/infarmed/entidades/medicamentos-uso-humano/avaliacao-tecnologias-de-saude" },
                    { label: "INFARMED — HTA Methodology v3.0 (English, PDF)", url: "https://www.infarmed.pt/documents/15786/1963929/METOD_AFT_v3.0_ENvf_fev2023/b0cb1c54-adca-721a-6466-75ba04cdd542" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Outpatient drug prices are set via External Reference Pricing against Spain, France, Italy, and Belgium (2025\u20132026). Annual price revision (RAP) takes effect January 1. Hospital drug prices are negotiated through the prior evaluation process, not ERP.",
                links: [
                    { label: "INFARMED — Price Revision (RAP)", url: "https://www.infarmed.pt/web/infarmed/revisao-anual-de-precos-rap-" },
                    { label: "INFARMED — Generics Guide & Reference Prices", url: "https://www.infarmed.pt/web/infarmed/entidades/medicamentos-uso-humano/genericos/guia_dos_genericos" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Four-tier co-payment system: A (90%), B (69%), C (37%), D (15%). Low-income patients receive an additional 15 percentage points. Hospital drugs are 100% SNS-funded. Generic reference pricing is based on the average of the 5 cheapest products in each homogeneous group, updated quarterly.",
                links: [
                    { label: "INFARMED — Advanced Drug Search (with reimbursement)", url: "https://www.infarmed.pt/web/infarmed/pesquisa-avancada" },
                    { label: "Prontu\u00e1rio Terap\u00eautico Online (national formulary)", url: "https://app10.infarmed.pt/prontuario/index.php" },
                    { label: "SNS Portal (National Health Service)", url: "https://www.sns.gov.pt/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Ordem dos Farmac\u00eauticos (Pharmacists' Association)", url: "https://www.ordemfarmaceuticos.pt/pt/" },
                    { label: "APIFARMA (Pharmaceutical Industry Association)", url: "https://apifarma.pt/" },
                    { label: "ANF (National Association of Pharmacies)", url: "https://www.anf.pt/en/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">INFARMED &mdash; Triple Role (Regulator + HTA + Pricing)</h4>
<ol>
    <li>INFARMED uniquely combines <strong>marketing authorization</strong>, <strong>health technology assessment</strong>, and <strong>price setting</strong> under one agency &mdash; unusual in Europe</li>
    <li>HTA is performed by <strong>DATS</strong> (staff experts) and <strong>CATS</strong> (advisory committee) under the <strong>SiNATS</strong> framework (Decreto-Lei 97/2015)</li>
    <li>The <a href="https://www.infarmed.pt/documents/15786/1963929/METOD_AFT_v3.0_ENvf_fev2023/b0cb1c54-adca-721a-6466-75ba04cdd542" target="_blank" rel="noopener">HTA Methodology Document v3.0 (English)</a> is one of the few official documents available in English</li>
    <li>INFARMED chairs the EU Heads of HTA Agencies (HAG) group and co-chairs the EU HTA Coordination Group</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> Most INFARMED content is in Portuguese only. The English section at <a href="https://www.infarmed.pt/web/infarmed-en" target="_blank" rel="noopener">/web/infarmed-en</a> has limited content.</p>

<h4 class="tips-heading">Reimbursement Tiers</h4>
<ol>
    <li><strong>Tier A (90%)</strong>: Essential drugs for life-threatening or severe chronic diseases (diabetes, cancer, HIV)</li>
    <li><strong>Tier B (69%)</strong>: Essential drugs for chronic diseases requiring prolonged therapy</li>
    <li><strong>Tier C (37%)</strong>: Drugs with confirmed therapeutic value not fitting A or B</li>
    <li><strong>Tier D (15%)</strong>: New medicines or those with limited evidence, pending reassessment</li>
    <li><strong>Low-income patients</strong> get an additional <strong>+15 percentage points</strong> (e.g., Tier A &rarr; 95%, Tier B &rarr; 84%)</li>
</ol>
<p class="tips-note"><strong>Hospital drugs:</strong> Not subject to these tiers. They undergo a separate <strong>avalia&ccedil;&atilde;o pr&eacute;via hospitalar</strong> (prior evaluation) that sets a maximum acquisition price and requires a contract (often with risk-sharing clauses). Generics are exempt from this requirement.</p>

<h4 class="tips-heading">Pricing &mdash; External Reference Pricing</h4>
<ol>
    <li><strong>Reference countries (2025&ndash;2026):</strong> Spain, France, Italy, Belgium (changed from Spain/France/Italy/Slovenia in 2024)</li>
    <li>Maximum ex-factory price cannot exceed the <strong>average wholesale price</strong> in reference countries</li>
    <li>Annual price revision (RAP) takes effect January 1. For 2026, price <strong>increases have been eliminated</strong> (only decreases or maintenance)</li>
    <li>Medicines under &euro;30 retail price are <strong>exempt</strong> from revision. Essential medicines (per Portaria 235/2023) are also exempt</li>
</ol>

<h4 class="tips-heading">Generic Substitution &amp; Reference Pricing</h4>
<ol>
    <li><strong>INN prescribing is mandatory</strong> since 2002 &mdash; physicians must prescribe by active substance when generics exist</li>
    <li>Pharmacists <strong>must dispense the cheapest generic</strong> for INN-only prescriptions. Physicians can restrict substitution only in exceptional cases</li>
    <li>The <strong>reference price</strong> for each homogeneous group = average of the 5 lowest-priced products. Updated <strong>quarterly</strong> by INFARMED</li>
    <li>First generic: max price <strong>50% below</strong> the reference medicine (20% below if reference &lt; &euro;10). <strong>Biosimilar substitution is NOT allowed</strong> at community pharmacies</li>
</ol>

<h4 class="tips-heading">How to Search for Drug Information</h4>
<ol>
    <li><a href="https://extranet.infarmed.pt/INFOMED-fo/" target="_blank" rel="noopener">INFOMED</a>: Search by medicine name or substance. Shows authorization status, SmPCs, leaflets, and marketing status</li>
    <li><a href="https://www.infarmed.pt/web/infarmed/pesquisa-avancada" target="_blank" rel="noopener">Advanced Search</a>: Filter by route of administration, status, with reimbursement details</li>
    <li><a href="https://www.infarmed.pt/web/infarmed/entidades/medicamentos-uso-humano/genericos/guia_dos_genericos" target="_blank" rel="noopener">Guia dos Gen&eacute;ricos</a>: Quarterly-updated guide with homogeneous groups, reference prices, and patient costs</li>
    <li><a href="https://app10.infarmed.pt/prontuario/index.php" target="_blank" rel="noopener">Prontu&aacute;rio Terap&ecirc;utico</a>: National therapeutic formulary &mdash; the standard prescribing reference</li>
</ol>
<p class="tips-note"><strong>Key legislation:</strong> Decreto-Lei 97/2015 (SiNATS master law), Portaria 195-D/2015 (reimbursement tiers), Portaria 394/2025/1 (2026 reference countries and price revision rules). All available at <a href="https://dre.pt/" target="_blank" rel="noopener">Di&aacute;rio da Rep&uacute;blica</a>.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Tratamento de manutenção em primeira linha do carcinoma urotelial localmente avançado ou metastático sem progressão após quimioterapia à base de platina",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'EC approved the Type II variation for Bavencio in first-line maintenance urothelial carcinoma. As an EU member, Portugal is covered by the centralised procedure. Based on JAVELIN Bladder 100: median OS 21.4 vs 14.3 months (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "INFARMED — Pharmacotherapeutic & Economic Assessment",
                    date: "March 2021",
                    detail: 'INFARMED\'s DATS (staff experts) and CATS (advisory committee) assessed avelumab under the SiNATS framework (Decreto-Lei 97/2015). The pharmacotherapeutic assessment report was dated <strong>21 March 2021</strong>. DATS concluded that avelumab demonstrated <strong>moderate added therapeutic value</strong> (valor terapêutico acrescentado moderado) versus best supportive care. However, the economic assessment by CE-CATS concluded that avelumab was <strong>not cost-effective</strong> at list price in the Portuguese context, with strong uncertainty regarding economic value. CE-CATS recommended that public funding should be conditional on a <strong>substantial price reduction</strong>.',
                    links: [
                        { label: "INFARMED — Bavencio Assessment Report (C. Urotelial)", url: "https://www.infarmed.pt/documents/15786/3368817/Relat%C3%B3rio+de+avalia%C3%A7%C3%A3o+de+financiamento+p%C3%BAblico+de+Bavencio+(Avelumab)+-+C.+Urotelial,+manuten%C3%A7%C3%A3o3/1b3554bf-dd71-53bc-310b-b8d07aa02a4c" },
                    ],
                },
                {
                    title: "Hospital Contract (Avaliação Prévia Hospitalar)",
                    date: "2021–2022",
                    detail: 'Following the HTA assessment, INFARMED entered into a hospital contract with the marketing authorization holder under Article 6 of Decreto-Lei 97/2015. This <strong>avaliação prévia hospitalar</strong> (prior hospital evaluation) pathway sets a maximum acquisition price and typically includes risk-sharing clauses. Avelumab is available through SNS (Serviço Nacional de Saúde) hospitals — as a hospital drug, it is 100% publicly funded and does not use the standard outpatient reimbursement tiers (A/B/C/D). Pricing terms are confidential.',
                    links: [
                        { label: "INFARMED — HTA Reports", url: "https://www.infarmed.pt/web/infarmed/relatorios-de-avaliacao-de-financiamento-publico" },
                    ],
                },
            ],
            takeaway: 'Portugal illustrates INFARMED\'s unique triple role — regulator, HTA body, and price setter — in action. The split between the pharmacotherapeutic finding ("moderate added value") and the economic finding ("not cost-effective at list price") is typical for expensive oncology drugs. The avaliação prévia hospitalar pathway, with confidential pricing and risk-sharing, is the standard route for hospital-administered drugs. Note that hospital drugs bypass Portugal\'s tiered outpatient reimbursement system entirely.',
        },
    },
    {
        code: "PR",
        name: "Puerto Rico",
        flag: "🇵🇷",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "As a U.S. territory, Puerto Rico follows FDA approval. However, every pharmaceutical product must also be separately registered with the PR Department of Health before distribution — a requirement unique among U.S. jurisdictions. Registration includes packaging samples, labeling, proof of FDA approval, and local representative information.",
                links: [
                    { label: "FDA — Drug Approval and Databases", url: "https://www.fda.gov/drugs/development-approval-process-drugs" },
                    { label: "PR Department of Health", url: "https://www.salud.pr.gov/" },
                    { label: "PR Board of Pharmacy", url: "https://www.salud.pr.gov/CMS/116" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Drug pricing largely follows the U.S. market. DACO (Department of Consumer Affairs) has authority to freeze or control drug prices, including 90-day freezes on leading prescription drugs. The 340B program and Medicaid Drug Rebate Program (since January 2023) apply. Puerto Rico is a major pharmaceutical manufacturing hub under Act 60-2019 (4% corporate tax rate).",
                links: [
                    { label: "DACO (Department of Consumer Affairs)", url: "https://www.daco.pr.gov/" },
                    { label: "HRSA — 340B Drug Pricing Program", url: "https://www.hrsa.gov/opa" },
                    { label: "340B OPAIS Database (search PR entities)", url: "https://340bopais.hrsa.gov/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Plan Vital (Medicaid) covers ~1.5 million residents through four MCOs managed by ASES. Since joining the Medicaid Drug Rebate Program in January 2023, Plan Vital operates an open formulary covering nearly all FDA-approved drugs. Medicare Part D is available but Puerto Rico is excluded from the Part D Low-Income Subsidy. Medicaid receives capped block grant funding (not open-ended matching like states).",
                links: [
                    { label: "Plan Vital — Official Website", url: "https://sssvital.com/en/" },
                    { label: "Plan Vital — Drug Lists by Category", url: "https://sssvital.com/en/drug-lists/" },
                    { label: "ASES (Health Insurance Administration)", url: "https://www.ases.pr.gov/" },
                    { label: "PR Medicaid — Official Website", url: "https://www.medicaid.pr.gov/" },
                    { label: "CMS — Puerto Rico Medicaid Overview", url: "https://www.medicaid.gov/state-overviews/puerto-rico.html" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "MACPAC — Medicaid & CHIP in Puerto Rico", url: "https://www.macpac.gov/wp-content/uploads/2020/08/Medicaid-and-CHIP-in-Puerto-Rico.pdf" },
                    { label: "Colegio de Farmacéuticos de Puerto Rico", url: "https://www.cfpr.org/" },
                    { label: "PIA-PR (Pharmaceutical Industry Association)", url: "https://piapr.org/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization &amp; Drug Registration</h4>
<ol>
    <li>All drugs require <strong>FDA approval</strong> (same as the 50 states), but Puerto Rico also requires <strong>separate local product registration</strong> with the PR Department of Health before distribution — every NDC shipped to the island must be registered</li>
    <li>Registration must occur at least 5 days prior to distribution and is a one-time filing (valid until the product is removed from market)</li>
    <li>The PR pharmacy regulatory framework is governed by <strong>Act 247-2004</strong> (Ley de Farmacia de Puerto Rico). Regulation 156/156B covers pharmaceutical establishment requirements</li>
</ol>
<p class="tips-note"><strong>Note:</strong> In June 2025, SARSP (formerly SARAFS) repealed the Special Authorization requirement for nonresident manufacturers and distributors, simplifying market entry. However, drug product registration itself remains mandatory.</p>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li><strong>DACO</strong> (Department of Consumer Affairs) has broad authority to freeze or control drug prices — it has historically issued 90-day price freezes on leading prescription drugs at distribution, wholesale, and retail levels</li>
    <li>The <a href="https://www.hrsa.gov/opa" target="_blank" rel="noopener">340B Drug Pricing Program</a> applies to PR hospitals, FQHCs, and safety-net providers — search the <a href="https://340bopais.hrsa.gov/" target="_blank" rel="noopener">340B OPAIS database</a> for enrolled PR entities</li>
    <li>Puerto Rico joined the <strong>Medicaid Drug Rebate Program (MDRP)</strong> in January 2023 — a landmark change estimated to save $154.8 million over four years. A <strong>Supplemental Drug Rebate Program</strong> was added effective January 2025</li>
    <li>The Inflation Reduction Act provisions (Medicare drug price negotiation, $2,000 out-of-pocket cap, $35 insulin cap) apply to PR Medicare beneficiaries</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Puerto Rico is a major pharmaceutical manufacturing hub — 12 of the world's top 20 pharma companies have operations here. Act 60-2019 offers a 4% corporate tax rate for eligible manufacturers. Products manufactured in PR qualify as "Made in USA."</p>

<h4 class="tips-heading">Reimbursement — Plan Vital (Medicaid)</h4>
<ol>
    <li><a href="https://sssvital.com/en/" target="_blank" rel="noopener">Plan Vital</a> is delivered through four MCOs: <strong>First Medical</strong>, <strong>Triple-S Salud</strong>, <strong>MMM Multi Health</strong>, and <strong>Plan de Salud Menonita</strong>. <strong>Abarca Health</strong> serves as the single PBM for all four</li>
    <li>Since joining the MDRP in 2023, Plan Vital operates an <strong>open formulary</strong> covering nearly all FDA-approved drugs — prior authorization and step therapy still apply as utilization management tools</li>
    <li>Drug lists by therapeutic category are available at <a href="https://sssvital.com/en/drug-lists/" target="_blank" rel="noopener">sssvital.com/en/drug-lists/</a></li>
    <li>Prescription drugs are <strong>free</strong> for children under 20 and pregnant women who are Medicaid/CHIP beneficiaries</li>
</ol>
<p class="tips-note"><strong>Important — Medicaid funding gap:</strong> Unlike U.S. states, Puerto Rico receives <strong>capped block grant funding</strong> (not open-ended matching). The statutory FMAP is 55% (temporarily 76% through FY2027; would be 83% if PR were a state). Per-enrollee spending is ~20% of the national average. A post-FY2027 "fiscal cliff" looms without Congressional action.</p>

<h4 class="tips-heading">Medicare &amp; Private Insurance</h4>
<ol>
    <li>Medicare Part D plans are available in Puerto Rico (CMS PDP Region 38) — but PR residents are <strong>excluded from the Part D Low-Income Subsidy (LIS)</strong> and are <strong>not automatically enrolled in Part B</strong></li>
    <li><strong>Medicare Platino</strong> serves dual-eligible (Medicare + Medicaid) beneficiaries through special needs MA plans from Humana, Triple-S, MCS, and MMM</li>
    <li>Major private insurers: <strong>Triple-S Salud</strong> (Blue Cross Blue Shield licensee, largest insurer), <strong>MMM</strong>, <strong>MCS Healthcare</strong>, <strong>Humana</strong>. Triple-S publishes annual drug formularies (Supreme and Select tiers)</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> Official PR government documents are primarily in Spanish; federal documents (CMS, HRSA, FDA) are in English. The Plan Vital website has an English version. Key Spanish terms: "medicamentos" (drugs), "formulario" (formulary), "receta" (prescription), "aseguradora" (insurer).</p>
        `,
    },
    {
        code: "QA",
        name: "Qatar",
        flag: "🇶🇦",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The Pharmacy and Drug Control Department (PDCD) under the Ministry of Public Health (MOPH) handles drug registration. Applications are submitted electronically through the PDCD E-System. The Qatar National Formulary (QNF) lists 4,800+ registered medicines with real-time updates. Qatar also participates in the GCC-DR centralised registration system, which provides fast-track assessment for centrally approved products.",
                links: [
                    { label: "Qatar National Formulary (QNF)", url: "https://qnf.moph.gov.qa/" },
                    { label: "PDCD E-System \u2014 Drug Registration Portal", url: "https://eservices.moph.gov.qa/dps/" },
                    { label: "MOPH \u2014 Pharmacy & Drug Control Department", url: "https://www.moph.gov.qa/english/departments/policyaffairs/pdc/Pages/default.aspx" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Drug prices are set by the PDCD at registration using external reference pricing (ERP) benchmarked against GCC and international markets. A cumulative 40% mark-up applies across the private supply chain; the public sector mark-up is much lower (2\u201310%). Generic prices are set at a mandated discount from the originator. Prices are reviewed every 5 years. The MOPH has recently reduced prices on 1,019+ products (15\u201375% reductions) across cardiovascular, diabetes, oncology, and antibiotic categories. Essential medicines are tax-exempt.",
                links: [
                    { label: "MOPH \u2014 Pharmacy & Drug Control", url: "https://www.moph.gov.qa/english/departments/policyaffairs/pdc/Pages/default.aspx" },
                    { label: "GHC \u2014 Gulf Joint Procurement Programme", url: "https://www.ghc.sa/en/procurement/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Qatari nationals receive fully free medicines at HMC hospitals and PHCC\u2019s 31 health centres (~3 million pharmacy visits annually, 1.8 million registered patients). Expatriates pay 20% copayment (10% for cancer medicines). Law No. 22 of 2021 introduced mandatory private health insurance for all non-Qatari residents, with employers required to provide coverage for employees and dependents. Public sector procurement includes GCC Joint Procurement (bulk purchasing across 6 states), HMC closed tenders, and direct purchasing agreements.",
                links: [
                    { label: "HMC (Hamad Medical Corporation)", url: "https://www.hamad.qa/" },
                    { label: "PHCC (Primary Health Care Corporation)", url: "https://www.phcc.gov.qa/" },
                    { label: "HMC \u2014 Vendors Portal", url: "https://hamad.qa/EN/Quick%20Links/HMC%20Vendors/Pages/default.aspx" },
                ],
            },
            {
                id: "hta",
                title: "Health Technology Assessment",
                body: "Qatar established a dedicated National HTA Unit in 2025 under the National Health Strategy 2024\u20132030. The unit performs evidence-based assessments to inform formulary and reimbursement decisions. In June 2025, MOPH organised an HTA capacity-building workshop in collaboration with the London School of Economics (LSE). The Qatar Oncology Health Economics Expert Panel (Q-OHEP) develops value-based strategies for cancer drug access. HTA is not yet legislatively mandated for pricing/reimbursement decisions.",
                links: [
                    { label: "MOPH \u2014 HTA Workshop Announcement (2025)", url: "https://qna.org.qa/en/News-Area/News/2025-6/18/moph-strengthens-health-technology-assessment-in-qatar" },
                    { label: "Q-OHEP Value-Based Strategies (BMC)", url: "https://bmchealthservres.biomedcentral.com/articles/10.1186/s12913-022-08981-5" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "GHC \u2014 Central Drug Registration", url: "https://www.ghc.sa/en/central-registration/" },
                    { label: "WHO \u2014 HTA Country Profile: Qatar", url: "https://www.who.int/publications/m/item/health-technology-assessment-country-profile-qatar" },
                    { label: "Monaqasat (State Procurement Portal)", url: "https://monaqasat.mof.gov.qa/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization</h4>
<ol>
    <li>The <a href="https://qnf.moph.gov.qa/" target="_blank" rel="noopener">Qatar National Formulary (QNF)</a> lists 4,800+ registered medicines with prescribing and patient information &mdash; also available as a mobile app</li>
    <li>Drug registration applications are submitted via the <a href="https://eservices.moph.gov.qa/dps/" target="_blank" rel="noopener">PDCD E-System</a> &mdash; new drug applications take 6&ndash;12 months; GCC-registered products receive fast-track assessment</li>
    <li>Qatar accepts <strong>GCC-DR centralised registration</strong> &mdash; a single application covers all 6 GCC states (Bahrain, Kuwait, Oman, Qatar, Saudi Arabia, UAE) plus Yemen</li>
    <li>A local Qatari agent (authorised representative) is required for all drug registration applications</li>
</ol>

<h4 class="tips-heading">Pricing &amp; Procurement</h4>
<ol>
    <li>Prices set at registration using <strong>ERP</strong> against GCC and international markets; cumulative <strong>40% mark-up</strong> for private supply chain (public sector only 2&ndash;10%)</li>
    <li>Generic prices are set at a mandated discount from the originator; prices reviewed every <strong>5 years</strong></li>
    <li>Public sector procurement: <a href="https://www.ghc.sa/en/procurement/" target="_blank" rel="noopener">GCC Joint Procurement</a> (bulk purchasing across 6 states), HMC closed tenders, and direct purchasing agreements</li>
    <li>Essential medicines are <strong>tax-exempt</strong>; 97% of medicines are imported</li>
</ol>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li><strong>Qatari nationals</strong> receive fully free medicines at all public facilities (HMC hospitals + PHCC\u2019s 31 health centres)</li>
    <li><strong>Expatriates</strong> pay 20% copayment (only 10% for cancer medicines); mandatory private health insurance under Law No. 22/2021</li>
    <li>PHCC serves <strong>1.8 million registered patients</strong> with ~3 million pharmacy visits annually</li>
    <li>Drug selection for HMC/PHCC is managed through formulary committees aligned with the QNF</li>
</ol>

<h4 class="tips-heading">HTA</h4>
<ol>
    <li>Qatar established a <strong>National HTA Unit in 2025</strong> under the National Health Strategy 2024&ndash;2030 &mdash; capacity building is underway with LSE collaboration</li>
    <li>HTA is <strong>not yet legislatively mandated</strong> for pricing/reimbursement but is increasingly influential</li>
    <li>The <strong>Q-OHEP</strong> (Qatar Oncology Health Economics Expert Panel) develops value-based strategies for cancer drug access</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Qatar\u2019s pharma market is small (QAR 2.4 billion / ~US$657 million in 2019) but growing. The GCC-DR pathway can streamline market access across the Gulf region.</p>
        `,
    },
    {
        code: "RO",
        name: "Romania",
        flag: "🇷🇴",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "ANM — Autorizare Medicamente", url: "https://www.anm.ro/medicamente-de-uz-uman/autorizare-medicamente/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "CNAS — Liste de Medicamente", url: "https://cnas.ro/lista-medicamente/" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "ANM — HTA Reports", url: "https://www.anm.ro/medicamente-de-uz-uman/evaluare-tehnologii-medicale/rapoarte-de-evaluare-a-tehnologiilor-medicale/" }],
            },
        ],
        notes: "ANM authorisation data may not be fully up to date — many products are authorised via the EMA centralised procedure.",
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization (ANM)</h4>
<ol>
    <li>ANM (Agen\u021bia Na\u021bional\u0103 a Medicamentului \u0219i a Dispozitivelor Medicale) handles national MAs but many innovative products use the EMA centralised procedure or mutual recognition route. Search the <a href="https://www.anm.ro/medicamente-de-uz-uman/autorizare-medicamente/" target="_blank" rel="noopener">ANM database</a> by product name or INN</li>
    <li>For EMA centrally authorised products, the EU Commission decision covers Romania automatically &mdash; the ANM database may lag; use the <a href="https://www.ema.europa.eu/en/medicines/human/EPAR" target="_blank" rel="noopener">EPAR database</a> as primary source for those products</li>
</ol>

<h4 class="tips-heading">CNAS Reimbursement &amp; National Drug Programs</h4>
<ol>
    <li>CNAS (Casa Na\u021bional\u0103 de Asigur\u0103ri de S\u0103n\u0103tate / National Health Insurance House) manages the reimbursement list. Search at <a href="https://cnas.ro/lista-medicamente/" target="_blank" rel="noopener">cnas.ro/lista-medicamente</a></li>
    <li>Most innovative and expensive medicines are funded through <strong>national health programs (PNS \u2014 Programe Na\u021bionale de S\u0103n\u0103tate)</strong> rather than ordinary outpatient reimbursement. PNS programs cover oncology, rare diseases, HIV, hepatitis C, diabetes, and other conditions</li>
    <li>HTA is conducted by ANM through its HTA department. Reports are published at <a href="https://www.anm.ro/medicamente-de-uz-uman/evaluare-tehnologii-medicale/rapoarte-de-evaluare-a-tehnologiilor-medicale/" target="_blank" rel="noopener">anm.ro/evaluare-tehnologii-medicale</a></li>
    <li>Reimbursement prices use reference pricing against other EU member states. Prices are in RON (Romanian Leu)</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> ANM and CNAS interfaces are in Romanian. Google Translate handles Romanian well. Key terms: "autorizat" (authorised), "rambursat" (reimbursed), "pre\u021b" (price), "substan\u021b\u0103 activ\u0103" (active substance).</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Melanom avansat (initial indication); subsequently NSCLC, Hodgkin lymphoma, and other oncology indications",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "17 July 2015",
                    detail: 'EC granted centralised marketing authorization for Keytruda for advanced melanoma. Romania, as an EU member, is covered by the centralised procedure. Subsequent variations extended indications to NSCLC, classical Hodgkin lymphoma, urothelial carcinoma, and other tumour types.',
                    links: [
                        { label: "EMA EPAR \u2014 Keytruda", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/keytruda" },
                    ],
                },
                {
                    title: "CNAS Compensated Drug List & Cost-Volume-Outcome Contract",
                    date: "2017\u20132018",
                    detail: 'Pembrolizumab was included on the <strong>CNAS compensated drug list</strong> (Lista medicamentelor compensate) through a <strong>cost-volume-outcome (CVO) contract</strong> between MSD Romania and CNAS (Casa Na\u021bional\u0103 de Asigur\u0103ri de S\u0103n\u0103tate). CVO contracts are Romania\u2019s managed entry agreement mechanism for expensive innovative drugs: the manufacturer agrees to volume caps, outcome-based clawbacks, and confidential discounts in exchange for reimbursement. The initial listing covered advanced melanoma with subsequent expansions for NSCLC and other indications.',
                    links: [
                        { label: "CNAS \u2014 Compensated Drug List", url: "https://www.cnas.ro/page/lista-medicamentelor.html" },
                    ],
                },
                {
                    title: "Reimbursement & Access Challenges",
                    date: "Ongoing",
                    detail: 'Romania faces structural challenges in oncology access: the national oncology drug budget is limited, and CVO contracts are periodically renegotiated. Delays in CVO renewals can create temporary access gaps. Romania\u2019s pharmaceutical prices use external reference pricing against other EU member states. The ANM (Agen\u021bia Na\u021bional\u0103 a Medicamentului) manages the Canamed drug register for regulatory status. Despite reimbursement listing, actual patient access can vary by region due to hospital budget constraints and procurement delays.',
                    links: [
                        { label: "ANM \u2014 Canamed Drug Register", url: "https://www.anm.ro/medicamente-de-uz-uman/evaluare-medicamente/" },
                    ],
                },
            ],
            takeaway: 'Romania illustrates the Central-Eastern European market access challenge: EC approval is automatic via the centralised procedure, but national reimbursement requires a separate CVO (cost-volume-outcome) contract negotiation that can take 2\u20133 years. Even after CVO agreement, budget constraints and procurement delays can limit actual patient access. The CVO mechanism provides a managed entry framework, but periodic renegotiations create uncertainty for both manufacturers and patients.',
        },
    },
    {
        code: "RU",
        name: "Russia",
        flag: "🇷🇺",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "GRLS — Rosminzdrav Drug Register", url: "https://grls.rosminzdrav.ru/GRLS.aspx" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "LS Geotar (drug reference)", url: "https://www.lsgeotar.ru" },
                    { label: "Trikipedia — Russia", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/Russia.aspx" },
                ],
            },
        ],
    },
    {
        code: "SA",
        name: "Saudi Arabia",
        flag: "🇸🇦",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization & Pricing",
                links: [{ label: "SFDA — Drug Query (RSD portal)", url: "https://rsd.sfda.gov.sa/drug-query-en.html" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "CCHI — Insurance Drug Formulary (IDF)", url: "https://eportal.cchi.gov.sa/EBP/idf-policy-en.html" },
                ],
            },
        ],
        notes: "Three reimbursement sources exist: CCHI, MoH formulary (last updated 2014), and NGHA. NGHA does not have a public source currently available. Please contact the relevant team for the MoH formulary document.",
        tipsHtml: `
<h4 class="tips-heading">Market Authorization &amp; Pricing (SFDA)</h4>
<ol>
    <li>Search registered drugs via the <a href="https://rsd.sfda.gov.sa/drug-query-en.html" target="_blank" rel="noopener">SFDA RSD Drug Query portal</a> (English interface). This is more reliable than the older SFDA drugs-list page. Search by INN, brand name, or registration number</li>
    <li>Pricing is regulated by SFDA. Saudi Arabia uses <strong>International Reference Pricing (IRP)</strong> based on a basket of approximately 20 countries &mdash; the ex-factory price must not exceed the lowest price in that basket</li>
    <li>Generics are priced at 70% (first generic), 65%, or 60% of the originator price. Biosimilars follow a similar stepped sequence: 75% / 65% / 55%. The <a href="https://www.sfda.gov.sa/sites/default/files/2022-10/PharmaceuticalPricingRulesE.pdf" target="_blank" rel="noopener">SFDA Pharmaceutical Pricing Rules (PDF)</a> is the authoritative methodology document</li>
    <li>Since <strong>July 2025</strong>, SFDA requires Economic Evaluation Studies (EES &mdash; formal HTA dossiers) as part of new drug pricing applications. This is a significant structural shift; there is no standalone Saudi HTA body yet but SFDA applies cost-effectiveness and budget impact criteria. See the <a href="https://www.sfda.gov.sa/en/regulations/990220" target="_blank" rel="noopener">SFDA EES Guidelines</a></li>
</ol>

<h4 class="tips-heading">Reimbursement: CCHI, MoH &amp; NGHA</h4>
<ol>
    <li><strong>CCHI (Council of Cooperative Health Insurance)</strong> oversees mandatory private health insurance. The <a href="https://eportal.cchi.gov.sa/EBP/idf-policy-en.html" target="_blank" rel="noopener">CCHI Insurance Drug Formulary (IDF)</a> lists drugs reimbursable under private insurance plans in English</li>
    <li><strong>MoH formulary</strong>: The Ministry of Health manages public sector hospitals. The formulary was last publicly updated in 2014 &mdash; contact MoH directly for the current version</li>
    <li><strong>NGHA (National Guard Health Affairs)</strong>: Separate health system for military/National Guard. No public formulary; contact NGHA directly</li>
    <li><strong>NUPCO (National Unified Procurement Company)</strong> is the public-sector procurement entity &mdash; tendering and pricing for MoH and NGHA hospitals. NUPCO pricing may differ significantly from SFDA-approved retail prices</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Saudi Arabia&rsquo;s pharmaceutical market is predominantly private insurance and out-of-pocket; public reimbursement databases are limited. The CCHI IDF is the most accessible public formulary reference.</p>
`,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial SFDA registration); subsequently expanded to NSCLC and other oncology indications",
            steps: [
                {
                    title: "SFDA Registration",
                    date: "2016\u20132017",
                    detail: 'The SFDA (Saudi Food and Drug Authority) registered pembrolizumab for advanced melanoma and NSCLC. Saudi Arabia participates in the <strong>GCC-DR (Gulf Cooperation Council Drug Registration)</strong> centralised procedure, which can provide recognition across GCC member states. SFDA has implemented expedited review pathways for products approved by reference authorities (FDA, EMA). Keytruda is available in the Saudi market for 10+ oncology indications.',
                    links: [
                        { label: "SFDA \u2014 Drug Listing", url: "https://www.sfda.gov.sa/en/drugs-list" },
                    ],
                },
                {
                    title: "MOH & NGHA Hospital Formularies",
                    date: "From 2017",
                    detail: 'Saudi Arabia\u2019s public healthcare is delivered through multiple government systems: <strong>MOH hospitals</strong> (largest network), <strong>NGHA</strong> (National Guard Health Affairs), <strong>KFSH&RC</strong> (King Faisal Specialist Hospital & Research Centre), and <strong>MOD</strong> (military hospitals). Each maintains its own formulary and procurement process. Pembrolizumab was adopted into the formularies of major oncology centres including KFSH&RC and NGHA hospitals. <strong>NUPCO</strong> (National Unified Procurement Company) handles centralised procurement for public-sector hospitals.',
                    links: [
                        { label: "NUPCO \u2014 Procurement Portal", url: "https://www.nupco.com/" },
                    ],
                },
                {
                    title: "CCHI Insurance Coverage",
                    date: "Ongoing",
                    detail: 'The <strong>CCHI</strong> (Council for Cooperative Health Insurance) oversees private health insurance, which covers expatriates and many Saudi nationals in the private sector. The CCHI Insurance Drug Formulary (IDF) defines minimum drug coverage. For high-cost oncology drugs, coverage depends on the specific insurance policy and employer plan. There is <strong>no formal national HTA body</strong> in Saudi Arabia, though SFDA is developing health economics capabilities. Saudi citizens can access treatment through public hospitals (MOH, NGHA) at no direct cost.',
                    links: [
                        { label: "CCHI \u2014 Insurance Drug Formulary", url: "https://www.cchi.gov.sa/" },
                    ],
                },
            ],
            takeaway: 'Saudi Arabia demonstrates a dual public-private market: Saudi citizens access pembrolizumab through government hospital formularies (MOH, NGHA, KFSH&RC) at no direct cost, while expatriates depend on private insurance coverage via the CCHI framework. NUPCO\u2019s centralised procurement provides volume-based pricing for the public sector. The absence of a formal HTA body means formulary decisions are clinically driven rather than cost-effectiveness driven. The GCC-DR pathway can facilitate multi-country access across the Gulf region.',
        },
    },
    {
        code: "SG",
        name: "Singapore",
        flag: "🇸🇬",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "HSA — Drug Registration Search", url: "https://eservice.hsa.gov.sg/prism/common/enquirepublic/SearchDRBProduct.do?action=load" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "MOH — List of Subsidised Drugs", url: "https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/list-of-subsidised-drugs" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "ACE (Agency for Care Effectiveness — HTA body)", url: "https://www.ace-hta.gov.sg/" }],
            },
        ],
        notes: "ACE is the HTA body of Singapore and provides guidelines useful for understanding reimbursement context.",
        tipsHtml: `
<h4 class="tips-heading">ACE HTA &amp; Subsidised Drug Lists (SDL / MAF)</h4>
<ol>
    <li><a href="https://www.ace-hta.gov.sg/" target="_blank" rel="noopener">ACE (Agency for Care Effectiveness)</a> is Singapore&rsquo;s HTA body. Navigate to &ldquo;Our Guidance&rdquo; for published drug/vaccine HTA reports and ACE Clinical Guidances (ACGs). ACE evaluations directly inform the Drug Advisory Committee (DAC), which recommends to MOH whether to subsidise via SDL or MAF</li>
    <li>Check <strong>both</strong> the SDL and MAF at <a href="https://www.moh.gov.sg/healthcare-schemes-subsidies/subsidised-drug-list" target="_blank" rel="noopener">moh.gov.sg subsidised drug list</a> &mdash; they are distinct lists:
        <ul>
            <li><strong>SDL (Standard Drug List)</strong>: ~560+ cost-effective medicines for common conditions. Singapore Citizens: 50&ndash;75% subsidy (means-tested); Permanent Residents: 25%</li>
            <li><strong>MAF (Medication Assistance Fund)</strong>: High-cost specialty drugs with proven clinical benefit. Citizens: up to 75%; PRs: up to 20%</li>
        </ul>
    </li>
    <li>CHAS (Community Health Assist Scheme) provides additional subsidies for lower-to-middle income Citizens (Blue/Orange/Green card tiers) at participating GP clinics &mdash; PRs are ineligible</li>
    <li>MediShield Life (mandatory insurance) covers large hospitalisation and outpatient cancer drug bills &mdash; annual claim limit raised to SGD 200,000 from April 2025</li>
</ol>
<p class="tips-note"><strong>Timeline:</strong> From HSA approval to SDL/MAF listing typically takes 6&ndash;12+ months (HSA &rarr; ACE evaluation &rarr; DAC recommendation &rarr; MOH listing). Drug prices are <strong>not</strong> set by statute &mdash; public hospitals use centralised group purchasing tenders (GPOs) for cost containment. The <a href="https://www.ace-hta.gov.sg/docs/default-source/educational-resources/general-factsheets/types-of-funding-for-drugs-and-vaccines-in-singapore.pdf" target="_blank" rel="noopener">ACE funding types factsheet</a> is a useful one-page orientation.</p>

<h4 class="tips-heading">Drug Registration (HSA PRISM)</h4>
<ol>
    <li>Search the <a href="https://eservice.hsa.gov.sg/prism/common/enquirepublic/SearchDRBProduct.do?action=load" target="_blank" rel="noopener">HSA PRISM public portal</a> by product name, active ingredient, or registration number. HSA registration confers market authorisation but does <strong>not</strong> guarantee public subsidy or formulary listing</li>
    <li>For broader searches, use <a href="https://www.hsa.gov.sg/e-services/infosearch" target="_blank" rel="noopener">HSA InfoSearch</a> across all health product categories</li>
</ol>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial registration); multiple oncology indications subsequently added",
            steps: [
                {
                    title: "HSA Registration",
                    date: "2016",
                    detail: 'HSA (Health Sciences Authority) registered pembrolizumab for advanced melanoma and NSCLC. Singapore uses a rigorous regulatory pathway that references but does not automatically accept EMA or FDA decisions. HSA registration confers market authorization but does <strong>not</strong> guarantee public subsidy or hospital formulary listing.',
                    links: [
                        { label: "HSA PRISM \u2014 Drug Registration Search", url: "https://eservice.hsa.gov.sg/prism/common/enquirepublic/SearchDRBProduct.do?action=load" },
                    ],
                },
                {
                    title: "ACE HTA Assessment",
                    date: "2018\u20132019",
                    detail: 'The <strong>ACE</strong> (Agency for Care Effectiveness) published technology guidance on pembrolizumab for NSCLC and melanoma. ACE assessments evaluate clinical effectiveness and cost-effectiveness to inform public institution formulary decisions. ACE uses a structured framework but does not publish a formal cost-per-QALY threshold. ACE guidance is advisory \u2014 public hospitals and polyclinics use it to inform their own formulary decisions.',
                    links: [
                        { label: "ACE \u2014 Technology Guidance", url: "https://www.ace-hta.gov.sg/our-guidance" },
                    ],
                },
                {
                    title: "MOH Standard Drug List & Subsidy",
                    date: "From 2019",
                    detail: 'Pembrolizumab was included on the <strong>MOH Standard Drug List (SDL)</strong> for specific indications with subsidy coverage through the Medication Assistance Fund (MAF). Singapore\u2019s drug subsidy framework has three tiers: SDL (standard subsidy), Non-Standard Drug List (NSDL, lower subsidy), and MAF (additional means-tested support for expensive drugs). For oncology drugs, the combination of SDL listing and MAF support can significantly reduce out-of-pocket costs for lower-income patients. Medishield Life (national health insurance) and Medisave can also be used for eligible treatments.',
                    links: [
                        { label: "MOH \u2014 Drug Subsidy Schemes", url: "https://www.moh.gov.sg/healthcare-schemes-subsidies/drug-subsidies" },
                    ],
                },
            ],
            takeaway: 'Singapore\u2019s pathway shows how ACE technology guidance informs but does not dictate formulary decisions. The multi-layered subsidy system (SDL + MAF + MediShield Life + MediSave) provides a progressive safety net where lower-income patients receive more support. HSA registration does not equal access \u2014 ACE assessment and SDL listing are separate processes that determine the actual subsidy level.',
        },
    },
    {
        code: "SK",
        name: "Slovakia",
        flag: "🇸🇰",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "ŠÚKL — Slovak State Institute for Drug Control", url: "https://www.sukl.sk/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [
                    { label: "Ministry of Health — Kategorisation (List B = reimbursed)", url: "https://www.health.gov.sk/?kategorizacia-a-uuc" },
                    { label: "VŠZP — DRG Accruals", url: "https://www.vszp.sk/poskytovatelia/drg/" },
                ],
            },
        ],
        notes: "In the list of categorised medicines, 'List B' (lieky, ktor\u00e9 s\u00fa zaradi\u0107 v zozname kategorizovan\u00fdch liekov) contains reimbursed medicines.",
        tipsHtml: `
<h4 class="tips-heading">Categorization List (Zoznam kategorizovan\u00fdch liekov)</h4>
<ol>
    <li>Slovakia&rsquo;s reimbursement system is based on the <strong>categorization list</strong> managed by the Ministry of Health. The list is divided into several sublists &mdash; <strong>&ldquo;List B&rdquo;</strong> (kategorizovan&eacute; lieky) is the core reimbursed medicines list</li>
    <li>Search the list at <a href="https://www.health.gov.sk/?kategorizacia-a-uuc" target="_blank" rel="noopener">health.gov.sk</a> by product name or active substance. The list shows the reimbursement level and any indication-based restrictions</li>
    <li>Three reimbursement levels apply based on the therapeutic group: drugs in the group can receive 100%, 75%, or 50% reimbursement depending on their positioning relative to the reference drug in the group</li>
    <li>The Ministry of Health makes final categorization decisions following an HTA evaluation. &Scaron;&Uacute;KL (Slovak State Institute for Drug Control) manages the drug register; the Ministry manages the categorization list</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> The &Scaron;&Uacute;KL and Ministry of Health websites are in Slovak. Google Translate handles Slovak adequately. Key terms: "kategorizovan&eacute; lieky" (categorized/reimbursed medicines), "cena" (price), "&uacute;&ccaron;inn&aacute; l&aacute;tka" (active substance), "indika&ccaron;n&eacute; obmedzenie" (indication restriction).</p>
        `,
    },
    {
        code: "SI",
        name: "Slovenia",
        flag: "🇸🇮",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "JAZMP \u2014 Medicinal Products Database", url: "https://www.jazmp.si/en/human-medicines/data-on-medicinal-products/medicinal-products-database/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                body: "ZZZS (Health Insurance Institute of Slovenia / Zavod za zdravstveno zavarovanje Slovenije) manages two reimbursement lists: List A (highest priority, 100% reimbursed) and List B (broader, partially reimbursed). JAZMP sets regulated maximum prices. Prior authorisation (predhodna odobritev) is required for restricted medicines.",
                links: [{ label: "JAZMP \u2014 List of Regulated Prices", url: "https://www.jazmp.si/en/human-medicines/pricing-of-medicinal-products/list-of-regulated-prices/" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">JAZMP &mdash; Drug Database &amp; Pricing</h4>
<ol>
    <li>The <a href="https://www.jazmp.si/en/human-medicines/data-on-medicinal-products/medicinal-products-database/" target="_blank" rel="noopener">JAZMP medicinal products database</a> has an English interface &mdash; search by product name or INN for MA status, SmPC, and pricing information</li>
    <li>JAZMP sets <strong>regulated maximum prices</strong> using external reference pricing against EU member states. The price list is published on the JAZMP website</li>
</ol>

<h4 class="tips-heading">ZZZS Reimbursement Lists (A &amp; B)</h4>
<ol>
    <li><strong>List A</strong>: highest priority medicines fully reimbursed (100%) &mdash; essential chronic disease treatments and life-saving drugs</li>
    <li><strong>List B</strong>: broader list with partial reimbursement (co-payment applies). The patient&rsquo;s share depends on the product&rsquo;s position within the therapeutic group</li>
    <li>Some restricted medicines require <strong>prior authorisation (predhodna odobritev)</strong> from ZZZS before reimbursement. Physicians apply through the ZZZS online system</li>
    <li>For current reimbursement status, check the <a href="https://www.zzzs.si/" target="_blank" rel="noopener">ZZZS website</a> (in Slovenian) &mdash; INN names are in Latin characters</li>
</ol>
        `,
    },
    {
        code: "KR",
        name: "South Korea",
        flag: "🇰🇷",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "MFDS — National Drug Information System", url: "https://nedrug.mfds.go.kr/index" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "HIRA — Insurance Coverage Criteria", url: "https://www.hira.or.kr/rc/insu/insuadtcrtr/InsuAdtCrtrList.do?pgmid=HIRAA030069000400" },
                    { label: "HIRA — Reimbursed Drug Price List (Excel)", url: "https://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA030014050000" },
                    { label: "NECA — HTA Reports", url: "https://www.neca.re.kr/eng/index.do" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Trikipedia — South Korea", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/South%20Korea.aspx" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization (MFDS)</h4>
<ol>
    <li>Go to <a href="https://nedrug.mfds.go.kr/index" target="_blank" rel="noopener">nedrug.mfds.go.kr</a> and search under the tab <strong>의약품(제품명)검색</strong> — this portal has some English search capability</li>
    <li>The approval document (허가사항) includes approved indications, dosage, and approval date</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> The MFDS interface is primarily in Korean. Google Translate works for navigation, but drug names may not translate accurately. Try searching by INN in English or Korean (약물명).</p>

<h4 class="tips-heading">HIRA Assessment &amp; Reimbursement</h4>
<p>South Korea uses a positive list system — only drugs listed by HIRA (Health Insurance Review and Assessment Service) are reimbursed under the National Health Insurance (NHI).</p>
<ol>
    <li>On the <a href="https://www.hira.or.kr/rc/insu/insuadtcrtr/InsuAdtCrtrList.do?pgmid=HIRAA030069000400" target="_blank" rel="noopener">HIRA Insurance Coverage Criteria page</a>, select <strong>제품명</strong> from the search dropdown and type the INN in English</li>
    <li>If the product has been reviewed, you will see an Assessment Outcome (평가 결과) — click the PDF icon to download the assessment report (enable pop-ups in your browser)</li>
    <li>The assessment report includes: clinical evidence summary, cost-effectiveness analysis, budget impact, and the HIRA Drug Reimbursement Evaluation Committee (DREC) recommendation</li>
    <li>Download the full Excel database of all reimbursed drug prices from <a href="https://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA030014050000" target="_blank" rel="noopener">HIRA's price list page</a> — the top row is the latest version. Drug names are searchable in Korean by INN or brand name</li>
</ol>

<h4 class="tips-heading">HTA &amp; NECA</h4>
<ol>
    <li><a href="https://www.neca.re.kr/eng/index.do" target="_blank" rel="noopener">NECA (National Evidence-based Healthcare Collaborating Agency)</a> conducts technology assessments that inform HIRA decisions</li>
    <li>NECA reports are typically in Korean, but English summaries are available for some assessments</li>
    <li>South Korea uses a formal cost-effectiveness threshold — generally around KRW 20–30 million/QALY (~USD 15,000–23,000), though flexibility exists for severe/rare diseases</li>
</ol>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>NHI reimbursement prices are set through a negotiation between HIRA and the manufacturer after a positive DREC recommendation</li>
    <li>Prices are listed in Korean Won (KRW) in the HIRA Excel price list</li>
    <li>Drug price cuts occur through biennial price reviews (약가 재평가) — existing products may face price reductions if new comparators or generics enter the market</li>
    <li>Risk-sharing agreements (위험분담제) are increasingly used for high-cost specialty drugs — details are generally not public</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> The Korean reimbursement process (from MFDS approval to HIRA listing) typically takes 12–18 months. The pathway is: MFDS approval → HIRA economic evaluation → DREC recommendation → price negotiation → NHI listing.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            localName: "바벤시오",
            indication: "First-line maintenance treatment of locally advanced or metastatic urothelial carcinoma that has not progressed after platinum-based chemotherapy",
            steps: [
                {
                    title: "MFDS Marketing Authorization",
                    date: "August 2021",
                    detail: 'MFDS (Ministry of Food and Drug Safety / 식품의약품안전처) approved avelumab for the UC maintenance indication in South Korea. MFDS operates an independent regulatory pathway — no mutual recognition with EMA or FDA. The Korean review examined the JAVELIN Bladder 100 data with attention to the Korean patient subgroup.',
                    links: [
                        { label: "MFDS — nedrug.mfds.go.kr", url: "https://nedrug.mfds.go.kr/index" },
                    ],
                },
                {
                    title: "HIRA Economic Evaluation & DREC Review",
                    date: "2021–2023",
                    detail: 'After MFDS approval, the manufacturer (Merck Healthcare / 한국 머크) submitted the reimbursement dossier to HIRA. The Drug Reimbursement Evaluation Committee (DREC / 약제급여평가위원회) assessed the clinical evidence, cost-effectiveness, and budget impact. The evaluation process took approximately 2 years — reflecting the complexity of oncology immunotherapy assessments and price negotiations in Korea.',
                    links: [
                        { label: "HIRA — Insurance Coverage Criteria", url: "https://www.hira.or.kr/rc/insu/insuadtcrtr/InsuAdtCrtrList.do?pgmid=HIRAA030069000400" },
                    ],
                },
                {
                    title: "NHI Reimbursement Listing",
                    date: "August 2023",
                    detail: 'Avelumab received National Health Insurance (NHI / 건강보험) coverage for first-line maintenance UC. This made Bavencio the <strong>first and only reimbursed maintenance immunotherapy</strong> for first-line urothelial carcinoma in South Korea. Within one year of listing, avelumab became the standard of care for this indication in Korean clinical practice. An Expanded Access Program (EAP) ran from September 2021 to June 2023, providing early access to approximately 100 patients with median PFS of 7.9 months in real-world use.',
                    links: [
                        { label: "KoreaBioMed — Bavencio NHI Coverage", url: "https://www.koreabiomed.com/news/articleView.html?idxno=21678" },
                    ],
                },
            ],
            takeaway: 'Bavencio in South Korea illustrates the typical 24-month timeline from MFDS approval to NHI listing (August 2021 → August 2023). The Expanded Access Program bridged the gap, providing real-world evidence that ultimately supported the reimbursement case. Korea\'s single-payer NHI system means that once listed, access is nationwide — unlike decentralised systems (Canada, Spain) where regional variation persists.',
        },
    },
    {
        code: "ES",
        name: "Spain",
        flag: "🇪🇸",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "Spain participates in the EMA centralised procedure. National and mutual recognition/decentralised procedures are managed by AEMPS (Agencia Española de Medicamentos y Productos Sanitarios).",
                links: [
                    { label: "AEMPS — Spanish Medicines Agency", url: "https://www.aemps.gob.es/en" },
                    { label: "CIMA — Authorisation Register", url: "https://cima.aemps.es/cima/publico/home.html" },
                    { label: "Ministerio de Sanidad", url: "https://www.sanidad.gob.es/profesionales/medicamentos.do" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "Spain uses the IPT (Informe de Posicionamiento Terapéutico) system — positioning reports produced jointly by AEMPS and regional agencies under the CIPM. IPTs classify positioning as Favorable, Conditional, or Unfavorable.",
                links: [
                    { label: "AEMPS — IPT Reports", url: "https://www.aemps.gob.es/medicamentosUsoHumano/informesPublicos/home.htm" },
                    { label: "Ministerio de Sanidad — Reimbursement", url: "https://www.sanidad.gob.es/profesionales/medicamentos.do" },
                    { label: "RedETS — Spanish HTA Network", url: "https://redetsa.es" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "Reimbursement and pricing decisions are centralised via CIPM. Autonomous communities may apply additional regional restrictions. Early access is available via Uso Compasivo / Acceso Anticipado.",
                links: [
                    { label: "AEMPS — Compassionate Use (Uso Compasivo)", url: "https://www.aemps.gob.es/medicamentosUsoHumano/usoCompasivo/home.htm" },
                    { label: "BOT Plus — Pharmacological Database (CGCOF)", url: "https://botplusweb.portalfarma.com/" },
                    { label: "Trikipedia — Spain", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/Spain.aspx" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization</h4>
<ol>
    <li>Search <a href="https://cima.aemps.es/cima/publico/home.html" target="_blank" rel="noopener">CIMA (Centro de Información de Medicamentos Autorizados)</a> by product name, INN, or ATC code — this is the most comprehensive Spanish drug register</li>
    <li>CIMA shows: authorisation status, approved indications (Ficha Técnica = SmPC), reimbursement status, and price</li>
    <li>For EMA centralised products, CIMA includes the Spanish-language Ficha Técnica alongside the EMA authorisation reference</li>
</ol>

<h4 class="tips-heading">IPT (Informe de Posicionamiento Terapéutico)</h4>
<p>The IPT is Spain's HTA positioning report, produced jointly by AEMPS and regional agencies. It determines a product's therapeutic positioning relative to available alternatives.</p>
<ol>
    <li>Search IPT reports on the <a href="https://www.aemps.gob.es/medicamentosUsoHumano/informesPublicos/home.htm" target="_blank" rel="noopener">AEMPS IPT page</a> — reports are published in Spanish (PDF)</li>
    <li>IPT outcomes: <strong>Favorable</strong> (positive positioning), <strong>Condicionado / Con restricciones</strong> (conditional — limited to specific subgroups), or <strong>No favorable</strong> (unfavorable positioning)</li>
    <li>The IPT is a prerequisite for CIPM pricing and reimbursement decisions — without a positive IPT, a product cannot negotiate reimbursement</li>
    <li>IPT reports include a comparative analysis against the therapeutic alternatives and position the product within the treatment algorithm</li>
</ol>
<p class="tips-note"><strong>Important:</strong> Spain operates a decentralised healthcare system with 17 Autonomous Communities (CCAAs). Even after a national CIPM reimbursement decision, each CCAA may apply additional regional restrictions (e.g., via Pharmacy & Therapeutics committees). National reimbursement ≠ universal regional access.</p>

<h4 class="tips-heading">Pricing &amp; Reimbursement</h4>
<ol>
    <li>Pricing is negotiated centrally by CIPM (Comisión Interministerial de Precios de los Medicamentos) — CIPM decisions are not publicly published with detailed rationale</li>
    <li>Reimbursed medicines are classified under "Inclusión en la prestación farmacéutica del SNS" — check CIMA for the reimbursement status field</li>
    <li>Prices are listed in the <strong>BOT Plus</strong> database (General Pharmaceutical Council of Spain) — accessible at <a href="https://botplusweb.portalfarma.com/" target="_blank" rel="noopener">botplusweb.portalfarma.com</a></li>
    <li>Spain uses international reference pricing (IRP) with a basket of EU countries for price setting</li>
</ol>

<h4 class="tips-heading">Early Access</h4>
<ol>
    <li><strong>Uso Compasivo</strong>: compassionate use for individual patients — authorised by AEMPS on a case-by-case basis</li>
    <li><strong>Acceso Anticipado / Situaciones Especiales</strong>: early access for groups of patients — similar to France's Accès Précoce, available for products with anticipated high therapeutic value before formal pricing</li>
    <li>Check the <a href="https://www.aemps.gob.es/medicamentosUsoHumano/usoCompasivo/home.htm" target="_blank" rel="noopener">AEMPS Uso Compasivo page</a> for current early access authorisations</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> For a quick reimbursement status check, search the product in CIMA — the "Condiciones de prescripción y dispensación" section shows whether it is SNS-reimbursed and the dispensing conditions (hospital, prescription required, etc.).</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "Tratamiento de mantenimiento en primera línea del carcinoma urotelial localmente avanzado o metastásico sin progresión tras quimioterapia basada en platino",
            steps: [
                {
                    title: "Marketing Authorization (EMA/EC)",
                    date: "25 January 2021",
                    detail: 'EC approved Bavencio for first-line maintenance UC. As an EMA centralised authorisation, the Spanish MA via AEMPS was automatic. The product was searchable in CIMA from this date.',
                    links: [
                        { label: "CIMA — Bavencio", url: "https://cima.aemps.es/cima/publico/home.html" },
                    ],
                },
                {
                    title: "IPT — Informe de Posicionamiento Terapéutico",
                    date: "2022 (IPT 44/2022)",
                    detail: 'AEMPS published <strong>IPT 44/2022</strong> evaluating avelumab for first-line maintenance UC. The report reviewed JAVELIN Bladder 100 data: PFS benefit of 1.7 months in the overall population (3.7 vs 2.0 months, HR 0.62) and 3.6 months in PD-L1+ tumours (5.7 vs 2.1 months, HR 0.56). The ORR was 9.7% vs 1.4% with BSC alone. The IPT concluded with a <strong>favourable positioning</strong> — prerequisite for CIPM pricing and reimbursement negotiation.',
                    links: [
                        { label: "IPT 44/2022 — Bavencio UC maintenance (PDF)", url: "https://www.aemps.gob.es/medicamentosUsoHumano/informesPublicos/docs/2022/IPT_44-2022-Bavencio.pdf" },
                        { label: "AEMPS — IPT Bavencio (web page)", url: "https://www.aemps.gob.es/informa/informes-de-posicionamiento-terapeutico/informe-de-posicionamiento-terapeutico-de-avelumab-bavencio-en-el-tratamiento-de-mantenimiento-en-primera-linea-de-carcinoma-urotelial-localmente-avanzado-o-metastasico/?lang=en" },
                    ],
                },
                {
                    title: "CIPM Pricing & National SNS Reimbursement",
                    date: "2022",
                    detail: 'Following the favourable IPT, CIPM (Comisión Interministerial de Precios de los Medicamentos) negotiated the price. Bavencio was included in SNS reimbursement as a hospital-dispensed medicine (Uso Hospitalario). CIPM pricing decisions and rationale are not publicly disclosed in Spain — only the reimbursement status is visible in CIMA.',
                    links: [
                        { label: "CIMA — Reimbursement status lookup", url: "https://cima.aemps.es/cima/publico/home.html" },
                    ],
                },
                {
                    title: "Regional Access Variation",
                    date: "Ongoing",
                    detail: 'Despite national CIPM reimbursement, access varies across Spain\'s 17 Autonomous Communities (CCAAs). Each CCAA\'s Pharmacy & Therapeutics committee may impose additional restrictions or delays. In practice, hospital oncology commissions in larger CCAAs (Madrid, Catalonia, Andalusia) adopted avelumab relatively quickly, while smaller regions showed longer lag times. Real-world evidence from the SOGUG-AVELUMAB RWD study (22 Spanish centres) confirmed the effectiveness of maintenance avelumab in routine practice.',
                    links: [],
                },
            ],
            takeaway: 'Bavencio in Spain illustrates the three-step pathway: AEMPS/IPT positioning → CIPM pricing (opaque) → regional CCAA adoption (variable). The IPT is the key access gate — without a favourable positioning, CIPM will not negotiate. Spain\'s decentralised healthcare system means national reimbursement does not equal uniform access across regions, making CCAA-level analysis essential for market access planning.',
        },
    },
    {
        code: "SE",
        name: "Sweden",
        flag: "🇸🇪",
        ema: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "L\u00e4kemedelsverket (Swedish Medical Products Agency)", url: "https://www.lakemedelsverket.se/en/" },
                    { label: "L\u00e4kemedelsverket \u2014 Product Database", url: "https://www.lakemedelsverket.se/sv/sok-lakemedelsfakta?activeTab=1" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "TLV (Tan\u00f6 och l\u00e4kemedelsf\u00f6rm\u00e5nsverket / Dental and Pharmaceutical Benefits Agency) evaluates medicines for the high-cost drug benefit system using three criteria: need/solidarity, cost-effectiveness, and human value. A positive TLV decision means the medicine is subsidised under the high-cost protection scheme.",
                links: [
                    { label: "TLV \u2014 Decisions on Medicines", url: "https://www.tlv.se/in-english/medicines/decisions-on-medicines.html" },
                    { label: "TLV (Dental and Pharmaceutical Benefits Agency)", url: "https://www.tlv.se/in-english/medicines.html" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "FASS \u2014 Swedish Drug Directory (English)", url: "https://www.fass.se/LIF/startpage?lang=en" },
                    { label: "Janusinfo (commercially independent drug information)", url: "https://janusinfo.se/" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">TLV Subsidy Assessment</h4>
<ol>
    <li>TLV evaluates all medicines applying for inclusion in the high-cost drug benefit (f&ouml;rm&aring;nen). Search <a href="https://www.tlv.se/in-english/medicines/decisions-on-medicines.html" target="_blank" rel="noopener">TLV decisions</a> by product name — decisions are published in Swedish with English summaries for key assessments</li>
    <li>TLV outcomes: <strong>Included</strong> (in the benefit), <strong>Included with restriction</strong> (begr&auml;nsad subvention — limited to specific patient groups or indications), or <strong>Not included</strong></li>
    <li>TLV uses an informal cost-per-QALY threshold (approximately SEK 500,000 / ~EUR 45,000 for standard conditions; flexibility for severe or rare diseases)</li>
    <li>Hospital drugs are <strong>not</strong> evaluated by TLV &mdash; they are procured through regional tender processes coordinated by the NT (National Collaboration on New Therapies) Council</li>
</ol>
<p class="tips-note"><strong>High-cost protection:</strong> Sweden&rsquo;s high-cost protection (h&ouml;gkostnadsskyddet) caps patient annual out-of-pocket costs at ~SEK 1,300 (~EUR 115). Once the cap is reached, all further subsidised prescriptions are free for the rest of the 12-month period.</p>

<h4 class="tips-heading">Drug Information Sources</h4>
<ol>
    <li><a href="https://www.fass.se/LIF/startpage?lang=en" target="_blank" rel="noopener">FASS (English)</a> is the standard drug reference used by Swedish clinicians &mdash; managed by LIF (the pharmaceutical industry association). It contains approved indications, SmPCs, pricing, and reimbursement status for all registered products</li>
    <li><a href="https://janusinfo.se/" target="_blank" rel="noopener">Janusinfo</a> (Stockholm Region) is the commercially independent prescribing reference &mdash; preferred for unbiased treatment recommendations and drug interaction checks</li>
    <li>For the official list of all authorised medicines, search <a href="https://www.lakemedelsverket.se/sv/sok-lakemedelsfakta?activeTab=1" target="_blank" rel="noopener">L&auml;kemedelsverket&rsquo;s product database</a> (primarily in Swedish)</li>
</ol>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "First-line maintenance treatment of locally advanced or metastatic urothelial carcinoma that has not progressed after platinum-based chemotherapy",
            steps: [
                {
                    title: "EMA / EC Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'European Commission approved the Type II variation extending Bavencio\'s indication to first-line maintenance urothelial carcinoma in adults. Based on the JAVELIN Bladder 100 trial: median OS 21.4 vs 14.3 months (HR 0.69). As an EU member, Sweden is covered by the centralised procedure.',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "NT-rådet Recommendation",
                    date: "March 2021",
                    detail: 'The NT-rådet (New Therapies Council) assessed avelumab for first-line maintenance treatment of locally advanced or metastatic urothelial carcinoma. Because Bavencio is a hospital-administered IV infusion, it was assessed through the NT-rådet pathway rather than TLV. NT-rådet <strong>recommended Bavencio</strong> as cost-effective with high reliability, based on a cost-minimisation analysis using the negotiated (confidential) price. The evidence was rated <strong>ESMO Category 1A</strong> — the highest level of clinical evidence.',
                    links: [
                        { label: "NT-rådet — Bavencio recommendation", url: "https://janusinfo.se/nationelltordnatintroduktion/nyheter/nyheter/ntradetsrekommendationer.5.72866553160e98b552857b7.html" },
                    ],
                },
                {
                    title: "Regional Funding & Clinical Use",
                    date: "From April 2021",
                    detail: 'Following the NT-rådet recommendation, Sweden\'s 21 regions were expected to fund avelumab through their hospital budgets. NT-rådet recommendations are not legally binding but have very high compliance (~95%). Avelumab became the standard of care for first-line maintenance UC in Sweden — the fastest major EU country to grant reimbursed access (approximately 2 months after EC approval).',
                    links: [
                        { label: "FASS — Bavencio", url: "https://www.fass.se/LIF/product?nplId=20170614000016" },
                    ],
                },
            ],
            takeaway: 'Sweden demonstrates one of the fastest EU access timelines: just ~2 months from EC approval (January 2021) to NT-rådet recommendation (March 2021). The NT-rådet pathway for hospital drugs bypasses TLV, using cost-minimisation analysis with confidential prices. The high ESMO evidence rating and clear OS benefit made this a straightforward assessment, highlighting how strong clinical evidence accelerates the Nordic HTA process.',
        },
    },
    {
        code: "CH",
        name: "Switzerland",
        flag: "🇨🇭",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [
                    { label: "Swissmedic — Lists and Registers", url: "https://www.swissmedic.ch/swissmedic/en/home/services/listen_neu.html" },
                    { label: "Swissmedic — Authorised Medicines (AIPS)", url: "https://www.swissmedicinfo.ch/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [
                    { label: "Spezialitätenliste (SL) — Reimbursed Drugs", url: "https://www.spezialitätenliste.ch/ShowPreparations.aspx?searchType=SUBSTANCE" },
                    { label: "BAG — Federal Office of Public Health (SL management)", url: "https://www.bag.admin.ch/bag/en/home/versicherungen/krankenversicherung/krankenversicherung-leistungen-tarife/Arzneimittel.html" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization (Swissmedic)</h4>
<ol>
    <li>Search <a href="https://www.swissmedicinfo.ch/" target="_blank" rel="noopener">SwissmedicInfo (AIPS)</a> by product name for the Swiss approved product information (Fachinformation / SmPC equivalent)</li>
    <li>Swissmedic operates independently from EMA — Switzerland is not an EU/EEA member, so EMA centralised authorisation does not automatically apply</li>
    <li>However, Swissmedic increasingly recognises EMA/FDA assessments for expedited review pathways</li>
</ol>

<h4 class="tips-heading">Spezialitätenliste (SL) — Reimbursement</h4>
<p>The SL (Spezialitätenliste) is the positive list of reimbursed medicines managed by BAG (Federal Office of Public Health).</p>
<ol>
    <li>Search the <a href="https://www.spezialitätenliste.ch/ShowPreparations.aspx?searchType=SUBSTANCE" target="_blank" rel="noopener">SL database</a> by substance or product name to check reimbursement status and price</li>
    <li>The SL entry shows: reimbursement conditions (Limitatio), the public price (Publikumspreis), the ex-factory price (Fabrikabgabepreis), and any restrictions</li>
    <li><strong>Limitatio</strong>: if a product has a Limitatio, reimbursement is restricted to specific indications or patient groups. Read the Limitatio text carefully — it often narrows the approved indication</li>
    <li>Products NOT on the SL are not reimbursed by mandatory health insurance (OKP) — patients pay out-of-pocket or through supplementary insurance</li>
</ol>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>Swiss drug prices are set using a combination of <strong>therapeutic cross-comparison</strong> (TQV — comparing with therapeutically equivalent products in Switzerland) and <strong>international reference pricing</strong> (APV — comparing with prices in 9 reference countries: AT, BE, DK, FI, FR, DE, NL, SE, UK)</li>
    <li>Prices on the SL are in Swiss Francs (CHF) and include the Fabrikabgabepreis (ex-factory), Vertriebsanteil (distribution margin), and Publikumspreis (public price)</li>
    <li>Mandatory price reviews occur every 3 years — products may face price reductions if reference country prices have decreased</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Switzerland has among the highest drug prices in Europe. The SL database is available in German, French, and Italian. For English navigation, use the German version with Google Translate — it handles Swiss pharmaceutical terms well.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "First-line maintenance treatment of locally advanced or metastatic urothelial carcinoma that has not progressed after platinum-based chemotherapy",
            steps: [
                {
                    title: "Swissmedic Authorization",
                    date: "2021",
                    detail: 'Swissmedic approved the extension of indication for avelumab (Bavencio) to include first-line maintenance treatment of urothelial carcinoma. Swissmedic operates independently from EMA — Switzerland is not part of the EU — but leveraged the same JAVELIN Bladder 100 data package. Bavencio had been authorised in Switzerland since 5 September 2017 for Merkel cell carcinoma. Switzerland participated in <strong>Project Orbis</strong> alongside FDA, Health Canada, and TGA for coordinated oncology review.',
                    links: [
                        { label: "SwissmedicInfo — Bavencio", url: "https://www.swissmedicinfo.ch/" },
                    ],
                },
                {
                    title: "BAG — Spezialitätenliste (SL) Listing",
                    date: "2021",
                    detail: 'The BAG (Federal Office of Public Health) listed avelumab on the <strong>Spezialitätenliste (SL)</strong> for the UC maintenance indication, making it reimbursable under Swiss mandatory health insurance (OKP/LAMal). The SL listing includes a <strong>Limitatio</strong> restricting reimbursement to the approved indication. The price was set using the standard Swiss methodology: therapeutic cross-comparison (TQV) with comparable treatments in Switzerland, and international reference pricing (APV) against 9 countries (AT, BE, DK, FI, FR, DE, NL, SE, UK).',
                    links: [
                        { label: "Spezialitätenliste — Search", url: "https://www.spezialitätenliste.ch/ShowPreparations.aspx?searchType=SUBSTANCE" },
                    ],
                },
                {
                    title: "Pricing & Reimbursement Details",
                    date: "Current",
                    detail: 'Bavencio is listed at approximately CHF 797–917 per vial (200 mg/10 mL) on the SL. It is classified as <strong>Liste A</strong> with a normal 10% co-payment (Selbstbehalt). The BAG requires products on the SL to meet criteria of efficacy, appropriateness, and cost-effectiveness (wirksam, zweckmässig und wirtschaftlich — WZW). Mandatory 3-yearly price reviews may adjust the price based on updated reference country data.',
                    links: [
                        { label: "Compendium.ch — Bavencio", url: "https://compendium.ch/product/1362833-bavencio-inf-konz-200-mg-10ml" },
                    ],
                },
            ],
            takeaway: 'Switzerland\'s pathway illustrates how a non-EU country with its own regulatory agency (Swissmedic) can still achieve timely access. The SL listing with Limitatio ensures reimbursement is targeted to the approved indication. Switzerland\'s dual pricing methodology (TQV + APV) and participation in Project Orbis demonstrate how international collaboration accelerates oncology access even outside the EU framework.',
        },
    },
    {
        code: "TH",
        name: "Thailand",
        flag: "🇹🇭",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "Thai FDA — Drug Search", url: "https://pertento.fda.moph.go.th/FDA_SEARCH_DRUG/SEARCH_DRUG/FRM_SEARCH_DRUG.aspx" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "NDI — National List of Essential Medicines", url: "https://ndi.fda.moph.go.th/drug_national/search" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "NDI — Drug Prices", url: "https://ndi.fda.moph.go.th/drug_value/index/public/" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Three Reimbursement Schemes</h4>
<p>Thailand has three parallel public health insurance schemes &mdash; understanding which scheme covers a patient is essential:</p>
<ol>
    <li><strong>UCS (Universal Coverage Scheme)</strong>: Managed by NHSO (National Health Security Office), covers ~71% of the population. Only NLEM-listed drugs used in <a href="https://www.nhso.go.th/" target="_blank" rel="noopener">NHSO</a>-contracted hospitals are reimbursed; NLEM listing alone does <em>not</em> guarantee NHSO reimbursement</li>
    <li><strong>CSMBS (Civil Servant Medical Benefit Scheme)</strong>: Managed by the Comptroller General&rsquo;s Department (CGD), covers ~10% (civil servants and dependants). Uses fee-for-service reimbursement &mdash; the most generous scheme. Non-NLEM drugs can be accessed via prior authorization, including the <strong>OCPA (Oncology Clinical Practice Assessment)</strong> program for cancer medicines</li>
    <li><strong>SSS (Social Security Scheme)</strong>: Managed by Social Security Office, covers ~19% (private-sector employees). Uses a capitation model; drug coverage varies by contracted hospital</li>
</ol>

<h4 class="tips-heading">NLEM &amp; HTA (HITAP)</h4>
<ol>
    <li>The <strong>NLEM (National List of Essential Medicines)</strong> is structured in categories A through E2. <strong>Category E2</strong> (innovative high-cost medicines) requires mandatory HTA by <a href="https://www.hitap.net/en/" target="_blank" rel="noopener">HITAP (Health Intervention and Technology Assessment Program)</a> before a drug can be considered for the NLEM</li>
    <li>Thailand&rsquo;s formal WTP threshold is <strong>THB 160,000 per QALY</strong> (~USD 4,500, approximately 1.3&times; GDP per capita) &mdash; one of the lowest globally and a significant access barrier, especially for oncology. Where a drug exceeds this threshold, <strong>Managed Entry Agreements (MEAs)</strong> &mdash; risk-sharing, outcomes-based, or price-volume agreements &mdash; may be negotiated with NHSO before final NLEM listing</li>
    <li>Search the <a href="https://ndi.fda.moph.go.th/drug_national/search" target="_blank" rel="noopener">NDI portal</a> for current NLEM status and search drug prices at the NDI pricing module. The <a href="https://en.fda.moph.go.th/" target="_blank" rel="noopener">Thai FDA English portal</a> provides registration information in English</li>
    <li>Thai FDA drug registration search: <a href="https://pertento.fda.moph.go.th/FDA_SEARCH_DRUG/SEARCH_DRUG/FRM_SEARCH_DRUG.aspx" target="_blank" rel="noopener">pertento.fda.moph.go.th</a> (Thai language; use Google Translate browser extension)</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> Most Thai government portals are in Thai only. The Thai FDA English portal and HITAP English site are the main exceptions. Google Translate handles Thai adequately for navigation. The NDI portal has partial English support.</p>
`,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma and NSCLC (initial indications); limited NLEM listing for specific tumour types",
            steps: [
                {
                    title: "Thai FDA Registration",
                    date: "2016\u20132017",
                    detail: 'Thai FDA registered pembrolizumab for advanced melanoma and NSCLC. Thailand has its own national regulatory pathway that does not automatically accept EMA or FDA decisions, though it can expedite review for products approved by reference authorities. Registration is a prerequisite for any public or private sale but does not confer reimbursement.',
                    links: [
                        { label: "Thai FDA \u2014 Drug Registration Search", url: "https://pertento.fda.moph.go.th/FDA_SEARCH_DRUG/SEARCH_DRUG/FRM_SEARCH_DRUG.aspx" },
                    ],
                },
                {
                    title: "HITAP Assessment & NLEM Consideration",
                    date: "2018\u20132020",
                    detail: '<strong>HITAP</strong> (Health Intervention and Technology Assessment Program) conducted cost-effectiveness analyses of pembrolizumab for various indications. Thailand applies a strict <strong>cost-per-QALY threshold of ~160,000 THB</strong> (approximately USD 4,500) \u2014 one of the most stringent globally. At list prices, pembrolizumab significantly exceeds this threshold for most indications. HITAP evaluations are used by the NLEM Subcommittee to inform listing decisions on the National List of Essential Medicines.',
                    links: [
                        { label: "HITAP \u2014 Assessments", url: "https://www.hitap.net/en/research" },
                    ],
                },
                {
                    title: "NLEM Listing & NHSO Coverage",
                    date: "Limited / Restricted",
                    detail: 'Pembrolizumab has <strong>limited NLEM listing</strong> for specific indications where cost-effectiveness could be demonstrated (e.g., MSI-H cancers) or where MSD negotiated significant price reductions. Thailand\u2019s <strong>NHSO</strong> (National Health Security Office) covers ~75% of the population under the Universal Coverage Scheme (UCS), with the remaining covered by the Social Security Scheme (~16%) and Civil Servant Medical Benefit Scheme (~8%). For most indications, pembrolizumab remains outside the UCS benefit package due to cost-effectiveness constraints. Patient access is primarily through the CSMBS (civil servants), private insurance, or out-of-pocket payment.',
                    links: [
                        { label: "NHSO \u2014 National Health Security Office", url: "https://eng.nhso.go.th/" },
                    ],
                },
            ],
            takeaway: 'Thailand demonstrates how a strict cost-per-QALY threshold (160,000 THB, ~USD 4,500) creates a significant barrier for high-cost oncology drugs. HITAP\u2019s rigorous pharmacoeconomic assessments mean that pembrolizumab at global prices far exceeds the threshold for most indications. Access is fragmented: civil servants (CSMBS) may receive coverage that UCS patients do not. This makes Thailand a case study in how cost-effectiveness thresholds drive differential access across insurance schemes.',
        },
    },
    {
        code: "TW",
        name: "Taiwan",
        flag: "🇹🇼",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "TFDA — Drug Search (MLMS)", url: "https://info.fda.gov.tw/MLMS/H0001.aspx" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "NHIA — HTA Reports Archive (2011–2019)", url: "https://www.nhi.gov.tw/Content_List.aspx?n=5A8CAC5DBF33DD3D&topn=5FE8C9FEAE863B46" },
                    { label: "CDE / NIHTA — HTA Reports", url: "https://nihta.cde.org.tw/" },
                    { label: "NHI Formulary — Reimbursement Policies", url: "https://www.nhi.gov.tw/Content_List.aspx?n=238040CA6B7FC2BB&topn=787128DAD5F71B1A" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "NHI Drug Price Database", url: "https://www.nhi.gov.tw/QueryN/Query1.aspx" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Regulatory Approval</h4>
<p>The TFDA website lists products approved in Taiwan and their approval dates.</p>
<ol>
    <li>Go to the <a href="https://info.fda.gov.tw/MLMS/H0001.aspx" target="_blank" rel="noopener">TFDA Drug Search (MLMS)</a>, or Google <code>site:fda.gov.tw [PRODUCT NAME]</code></li>
    <li>Use the Google Translate browser plugin for English — Google Translate handles Traditional Chinese accurately</li>
    <li>Search by INN, English branded name, or disease category</li>
    <li>Complete the CAPTCHA before searching — all results return 0 without it</li>
    <li>If available, the product appears as a result. Note: unlike EMA/FDA, individual indication approval dates are not shown — read all results as the same drug may have different dates for different dosages or manufacturing sites</li>
    <li>Click the result link to view approved indications and manufacturer details</li>
</ol>
<p class="tips-note"><strong>Calendar note:</strong> Taiwan uses the Minguo calendar (e.g., 2020 = Minguo year 109). <a href="https://www.calendar-converter.com/minguo/" target="_blank" rel="noopener">Convert Minguo to Gregorian here</a>.</p>

<h4 class="tips-heading">Reimbursement Outcomes</h4>
<p>HTA outcomes and reimbursement decisions assessed by the NHIA can be found using two methods.</p>

<p class="tips-subheading">Finding HTA Reports — Method 1</p>
<ol>
    <li>Browse the <a href="https://www.nhi.gov.tw/Content_List.aspx?n=5A8CAC5DBF33DD3D&topn=5FE8C9FEAE863B46" target="_blank" rel="noopener">NHIA HTA archive</a> by year to find the product</li>
    <li>Note: only covers reports issued 2011–2019; not all reimbursed products have reports available online</li>
    <li>Results vary from detailed clinical evidence summaries to simple reimbursement listings (unlike EU5 reports such as HAS or G-BA)</li>
</ol>

<p class="tips-subheading">Finding HTA Reports — Method 2</p>
<ol>
    <li>Google <code>site:www.nhi.gov.tw [PRODUCT NAME] 醫療科技評估</code> or <code>site:nihta.cde.org.tw [PRODUCT NAME]</code></li>
    <li>HTA reports appear as PDF results in Google if available online</li>
    <li>The correct document is issued by 財團法人醫藥品查驗中心 (Center for Drug Evaluation — CDE). Key fields:
        <ul>
            <li>Recommended reimbursement indications: <strong>建議健保給付之適應症內容</strong></li>
            <li>TFDA-approved indication: <strong>主管機關許可適應症</strong> or <strong>衛生署許可適應症</strong></li>
            <li>Recommended dosages: <strong>建議療程</strong></li>
        </ul>
    </li>
</ol>

<p class="tips-subheading">Finding Reimbursement Category (1 / 2A / 2B)</p>
<ol>
    <li>Google <code>[PRODUCT NAME] 第1/2A/2B類新藥</code> — NHIA does not publish drug categorization systematically on one page</li>
    <li>Categorization information appears in NHIA meeting minutes from Google search results</li>
    <li>Search <code>類新藥</code> within the document to locate the reference. Note: multiple products are discussed per meeting — confirm the mention refers to the product of interest</li>
</ol>

<p class="tips-subheading">Finding NHIA Reimbursement Status</p>
<ol>
    <li>Visit the <a href="https://www.nhi.gov.tw/Content_List.aspx?n=238040CA6B7FC2BB&topn=787128DAD5F71B1A" target="_blank" rel="noopener">NHI Formulary</a> for the most current reimbursement policies</li>
    <li>Select the PDF for the relevant pharmaceutical class (e.g., oncology = item #9 on the list)</li>
    <li>A date to the right of a reimbursement clause indicates when that clause was last revised</li>
</ol>
<p class="tips-note"><strong>Note:</strong> NHI reimbursement decisions are frequently updated as PDFs or meeting minutes. Review all available versions to find the most up-to-date status.</p>

<p class="tips-subheading">Finding Biomarker Testing Reimbursement</p>
<ol>
    <li>Visit the <a href="https://sph.nhri.org.tw/nhis/?p=9040" target="_blank" rel="noopener">Biomarker Testing Reimbursement portal</a></li>
    <li>Use Google Chrome's built-in translation for English</li>
    <li>Enter the biomarker or test name in the "English project name" field and click "start query"</li>
    <li>Click a result to view: pay points (NTD reimbursed per test), reference period (first funding approval date), reimbursement indications, and access restrictions</li>
</ol>

<h4 class="tips-heading">Pricing</h4>
<p>Drug prices in Taiwan are listed by SKU in the NHI drug price database.</p>
<ol>
    <li>Go to the <a href="https://www.nhi.gov.tw/QueryN/Query1.aspx" target="_blank" rel="noopener">NHI Drug Price Database</a></li>
    <li>Search by Chinese/English name, SKU, INN, or dosing strength</li>
    <li>Prices are in New Taiwan Dollars (NTD). The date of the most recent price adjustment is shown in Minguo calendar — <a href="https://www.calendar-converter.com/minguo/" target="_blank" rel="noopener">convert here</a></li>
    <li>For locally recommended dosages, Google <code>[PRODUCT NAME] 台灣建議劑量</code> — may return HTA/TFDA reports, pharma company sites, or local hospital pages</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Not all TFDA reports are available online.</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial TFDA approval); subsequently expanded to NSCLC, urothelial carcinoma, and other oncology indications",
            steps: [
                {
                    title: "TFDA Registration",
                    date: "2016",
                    detail: 'TFDA (Taiwan Food and Drug Administration) registered pembrolizumab for advanced melanoma. Taiwan has its own regulatory authority operating independently of WHO prequalification and EMA/FDA. However, TFDA references international regulatory decisions to expedite review for priority products. Subsequent approvals covered NSCLC, classical Hodgkin lymphoma, urothelial carcinoma, and head & neck SCC.',
                    links: [
                        { label: "TFDA \u2014 Drug Database", url: "https://www.fda.gov.tw/MLMS/H0001.aspx" },
                    ],
                },
                {
                    title: "CDE HTA Assessment & NHIA Review",
                    date: "2017\u20132019",
                    detail: 'The <strong>CDE</strong> (Center for Drug Evaluation) conducted HTA assessments of pembrolizumab for NHIA (National Health Insurance Administration) consideration. Taiwan\u2019s NHI covers >99% of the population through a single-payer system. CDE evaluates clinical effectiveness, cost-effectiveness, and budget impact. For high-cost oncology drugs, the assessment process typically takes 12\u201324 months. The NHI Drug Reimbursement Joint Committee (DRJC) makes final listing decisions based on CDE recommendations.',
                    links: [
                        { label: "CDE \u2014 Center for Drug Evaluation", url: "https://www.cde.org.tw/eng/" },
                        { label: "NHIA", url: "https://www.nhi.gov.tw/english/" },
                    ],
                },
                {
                    title: "NHI Reimbursement",
                    date: "From 2019 (indication-specific)",
                    detail: 'Pembrolizumab was listed on the NHI for specific indications with <strong>strict clinical criteria</strong> and prior authorization requirements. Taiwan\u2019s NHI reimbursement for high-cost oncology drugs is typically restricted to precisely defined patient populations: specific tumour types, lines of therapy, biomarker status (e.g., PD-L1 TPS \u226550% for NSCLC monotherapy), and maximum treatment duration. Annual NHI spending on pembrolizumab is subject to budget caps, and additional indications are added gradually based on clinical evidence and budget availability.',
                    links: [
                        { label: "NHIA \u2014 Drug Reimbursement", url: "https://www.nhi.gov.tw/english/" },
                    ],
                },
            ],
            takeaway: 'Taiwan\u2019s single-payer NHI system provides universal coverage but applies strict budget constraints to high-cost drugs. Pembrolizumab\u2019s NHI listing is indication-specific with tight clinical criteria, biomarker requirements, and treatment duration limits. The CDE assessment process ensures systematic evaluation, but budget caps mean that not all approved indications receive NHI coverage simultaneously. Taiwan demonstrates how a universal healthcare system balances access with fiscal sustainability.',
        },
    },
    {
        code: "TR",
        name: "Turkey",
        flag: "🇹🇷",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "TITCK \u2014 Licensed Product Lists", url: "https://www.titck.gov.tr/dinamikmodul/85" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Turkey sets maximum ex-factory prices in Euros using a reference basket. TITCK publishes the full price list as a downloadable Excel file (updated monthly). Prices are denominated in Euros to limit exchange-rate exposure.",
                links: [{ label: "TITCK \u2014 Drug Prices (download latest XLS, prices in Euros)", url: "https://www.titck.gov.tr/dinamikmodul/100" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "SGK (Sosyal G\u00fcvenlik Kurumu / Social Security Institution) manages reimbursement through the SUT (Sa\u011fl\u0131k Uygulama Tebli\u011fi), which specifies reimbursable conditions, dosing restrictions, and prescribing criteria for each medicine. Prescription-only medicines on the SGK positive list are reimbursed at 80\u201390% for insured patients.",
                links: [{ label: "SGK \u2014 Social Security Institution", url: "https://www.sgk.gov.tr/" }],
            },
        ],
        notes: "SGK and TITCK interfaces are in Turkish only. For the SUT reimbursement conditions, navigate to SGK \u2192 Sa\u011fl\u0131k Hizmetleri \u2192 SUT or search on the TITCK website for 'geri \u00f6deme' (reimbursement).",
        tipsHtml: `
<h4 class="tips-heading">TITCK &mdash; Marketing Authorization &amp; Pricing</h4>
<ol>
    <li>The <a href="https://www.titck.gov.tr/dinamikmodul/85" target="_blank" rel="noopener">TITCK licensed product list</a> is downloadable as Excel &mdash; search by brand name or INN (etken madde). Turkey operates its own independent registration pathway; EMA authorisations are not automatically valid</li>
    <li>Drug prices are published monthly as a downloadable Excel file from <a href="https://www.titck.gov.tr/dinamikmodul/100" target="_blank" rel="noopener">TITCK pricing page</a>. Prices are denominated in <strong>Euros</strong> to avoid lira depreciation effects. Turkey uses reference pricing against a basket of European countries to set maximum ex-factory prices</li>
</ol>

<h4 class="tips-heading">SGK &amp; SUT Reimbursement</h4>
<ol>
    <li>SGK (Sosyal G&uuml;venlik Kurumu) administers health insurance for ~85% of Turkey&rsquo;s population. The <strong>SUT (Sa&gbreve;l&imath;k Uygulama Tebli&gbreve;i)</strong> is the comprehensive reimbursement circular that specifies eligible conditions, dosing rules, prescribing restrictions (uzman hekim &mdash; specialist physician, rapor &mdash; committee report), and special conditions for each medicine</li>
    <li>To find SUT conditions for a specific drug: go to <a href="https://www.sgk.gov.tr/" target="_blank" rel="noopener">sgk.gov.tr</a>, navigate to Sa&gbreve;l&imath;k Hizmetleri &rarr; SUT and download the latest version (typically updated annually). The SUT is a large document &mdash; search by INN or ATC code within the PDF</li>
    <li>Prescription-only medicines on the SGK positive list are reimbursed at <strong>80&ndash;90%</strong> for insured patients (with co-payment). Some products require a specialist physician prescription or a committee report (heyet raporu) for reimbursement</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> SGK and TITCK are entirely in Turkish. Google Translate handles Turkish pharmaceutical text well. Key terms: "geri &ouml;deme" (reimbursement), "etken madde" (active substance), "uzman hekim" (specialist physician), "rapor" (physician committee report required).</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial TITCK registration); subsequently expanded to NSCLC, Hodgkin lymphoma, and other oncology indications",
            steps: [
                {
                    title: "T\u0130TCK Registration",
                    date: "2016\u20132017",
                    detail: 'T\u0130TCK (Turkish Medicines and Medical Devices Agency) registered pembrolizumab for advanced melanoma and subsequently expanded indications. Turkey has its own regulatory authority but references international decisions (EMA, FDA) to inform review. T\u0130TCK registration is a prerequisite for any market activity, including SGK reimbursement listing.',
                    links: [
                        { label: "T\u0130TCK \u2014 Drug Database", url: "https://www.titck.gov.tr/faaliyetalanlari/ilac/ilacArama" },
                    ],
                },
                {
                    title: "SGK Positive List & SUT Listing",
                    date: "2017\u20132018",
                    detail: 'Pembrolizumab was included on the <strong>SGK (Social Security Institution) positive reimbursement list</strong> under the SUT (Sa\u011fl\u0131k Uygulama Tebli\u011fi / Health Implementation Communiqu\u00e9). The SUT defines reimbursement conditions including indication restrictions, prescribing physician requirements (specialist oncologist), and requirements for a <strong>heyet raporu</strong> (physician committee report) for reimbursement. Patients pay a <strong>10\u201320% co-payment</strong> (depending on the specific scheme and product). Turkey\u2019s pricing uses international reference pricing based on the <strong>lowest price from 5 EU reference countries</strong>.',
                    links: [
                        { label: "SGK \u2014 Drug Search (Geri \u00d6deme)", url: "https://www.sgk.gov.tr/" },
                    ],
                },
                {
                    title: "Global Budget & Pricing Pressure",
                    date: "Ongoing",
                    detail: 'Turkey operates a <strong>global pharmaceutical budget</strong> with expenditure caps. When the budget is exceeded, manufacturers face mandatory discount adjustments. Turkey\u2019s reference pricing system (lowest of 5 EU countries, typically Greece, Portugal, Spain, Italy, France) creates one of the lowest price environments in Europe. The Turkish Lira\u2019s depreciation against the Euro has compounded pricing pressure, leading to periodic mandatory price adjustments. For oncology drugs like pembrolizumab, Turkey\u2019s prices are typically among the lowest in the reference basket.',
                    links: [
                        { label: "T\u0130TCK \u2014 Pricing Regulations", url: "https://www.titck.gov.tr/" },
                    ],
                },
            ],
            takeaway: 'Turkey demonstrates how aggressive reference pricing (lowest of 5 EU countries) combined with currency depreciation creates extreme pricing pressure. Pembrolizumab is reimbursed under the SGK positive list with indication-specific restrictions and co-payments, providing relatively broad access. However, the low reference prices and Lira depreciation make Turkey a challenging commercial market. The heyet raporu (committee report) requirement ensures prescribing is restricted to approved indications and specialist centres.',
        },
    },
    {
        code: "AE",
        name: "United Arab Emirates",
        flag: "🇦🇪",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization & Pricing",
                links: [
                    { label: "MOHAP — Registered Medications List", url: "https://mohap.gov.ae/en/w/registered-medications-list" },
                    { label: "DoH (Abu Dhabi) — Drug Search", url: "https://www.doh.gov.ae/en/resources/drug-search-page" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "DHA — Drug Control (Dubai Health Authority)", url: "https://www.dha.gov.ae/en/HealthRegulationSector/DrugControl" },
                    { label: "DoH (Abu Dhabi) — Shafafiya Drug Prices", url: "https://www.doh.gov.ae/en/Shafafiya/prices" },
                    { label: "DAMAN — Drug Formulary", url: "https://www.damanhealth.ae/healthcare/pharmaceutical-benefits/daman-drug-formulary/" },
                ],
            },
        ],
        notes: "UAE pharmaceutical regulation is split across three authorities: MOHAP/EDE (federal + Northern Emirates), DHA (Dubai), and DoH (Abu Dhabi). Mandatory health insurance applies in Abu Dhabi (since 2007) and Dubai (since 2014–2016).",
        tipsHtml: `
<h4 class="tips-heading">Three-Authority Structure</h4>
<p>The UAE has <strong>no single national pharmaceutical database</strong> &mdash; registration and reimbursement are split across three authorities:</p>
<ol>
    <li><strong>MOHAP / EDE (federal)</strong>: Covers Northern Emirates (Sharjah, Ajman, RAK, Fujairah, UAQ). MOHAP is transitioning pharmaceutical registration to the <strong>Emirates Drug Establishment (EDE)</strong> &mdash; check <a href="https://ede.gov.ae" target="_blank" rel="noopener">ede.gov.ae</a> for the latest portal. Search the <a href="https://mohap.gov.ae/en/w/registered-medications-list" target="_blank" rel="noopener">MOHAP registered medications list</a> for currently authorised products</li>
    <li><strong>DHA (Dubai Health Authority)</strong>: Regulates Dubai. The <a href="https://www.dha.gov.ae/en/HealthRegulationSector/DrugControl" target="_blank" rel="noopener">DHA Drug Control page</a> lists approved products and drug pricing in Dubai</li>
    <li><strong>DoH (Department of Health, Abu Dhabi)</strong>: Regulates Abu Dhabi. Use the <a href="https://www.doh.gov.ae/en/resources/drug-search-page" target="_blank" rel="noopener">DoH Drug Search</a> for Abu Dhabi-registered products and the <a href="https://www.doh.gov.ae/en/Shafafiya/prices" target="_blank" rel="noopener">Shafafiya price transparency portal</a> for drug prices</li>
</ol>

<h4 class="tips-heading">Reimbursement &amp; Pricing</h4>
<ol>
    <li><strong>Abu Dhabi</strong>: Mandatory insurance since 2007. <a href="https://www.damanhealth.ae/healthcare/pharmaceutical-benefits/daman-drug-formulary/" target="_blank" rel="noopener">Daman</a> is the dominant insurer. Plans are tiered: <em>Thiqa</em> (UAE nationals, comprehensive), <em>Basic</em> (lower-income expats, restricted formulary), and ABM intermediate levels. The DoH&rsquo;s <strong>Unified Prescription Pricing (UPP)</strong> system standardises drug prices and copays across all Abu Dhabi providers, linked to the Shafafiya claims platform</li>
    <li><strong>Dubai</strong>: Mandatory insurance since 2014&ndash;2016. DHA manages the <strong>SHIFA unified formulary</strong> (effective February 2021), which replaced hospital-by-hospital formularies. The <strong>Essential Benefits Plan (EBP)</strong> covers a minimum AED 150,000/year with drug coverage capped at AED 1,500/year under basic plans; insurers may offer enhanced formularies above the EBP minimum</li>
    <li>Drug prices are set by the relevant authority using international reference pricing. MOHAP, DHA, and DoH each set prices independently &mdash; prices may differ between Emirates. The DoH Shafafiya portal has the most reliably current price reference for Abu Dhabi</li>
    <li>There is <strong>no UAE-wide HTA body or ICER threshold</strong>. Market access is primarily driven by formulary negotiations with individual insurance providers and procurement by hospital groups</li>
    <li>Multi-Emirate launches require separate registration or mutual recognition filings with each authority &mdash; budget for parallel submissions</li>
</ol>
<p class="tips-note"><strong>EDE transition note:</strong> MOHAP is in the process of transferring pharmaceutical oversight to the Emirates Drug Establishment (EDE). During this transition, both the MOHAP portal and the new EDE portal (<a href="https://ede.gov.ae" target="_blank" rel="noopener">ede.gov.ae</a>) may be relevant. Check both if a product is not found in one database.</p>
`,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma (initial registration); subsequently expanded to multiple oncology indications across federal and emirate-level authorities",
            steps: [
                {
                    title: "MOHAP / Emirate-Level Registration",
                    date: "2016\u20132017",
                    detail: 'Pembrolizumab was registered through the UAE\u2019s multi-authority system: <strong>MOHAP</strong> (federal), <strong>DoH Abu Dhabi</strong>, and <strong>DHA Dubai</strong> each maintain separate drug registration processes. Products approved by the FDA, EMA, or other stringent regulatory authorities benefit from expedited review, but separate registration with each authority is still required. MSD registered Keytruda with all relevant UAE authorities for advanced melanoma, NSCLC, and subsequent indications.',
                    links: [
                        { label: "MOHAP \u2014 Drug Registration", url: "https://mohap.gov.ae/en/services/issue-marketing-authorisation-of-pharmaceutical-products" },
                    ],
                },
                {
                    title: "Hospital Formulary & Insurance Coverage",
                    date: "From 2017",
                    detail: 'UAE drug access is primarily formulary-driven at the institutional level. Major hospital groups (Cleveland Clinic Abu Dhabi, Mediclinic, etc.) and public hospitals maintain their own formularies. Insurance coverage depends on the patient\u2019s specific policy \u2014 DHA Basic and Enhanced plans define minimum coverage, but oncology drug coverage varies significantly by insurer and policy tier. The <strong>DoH Abu Dhabi Shafafiya portal</strong> provides the most transparent reference for drug availability and pricing in Abu Dhabi emirate. There is <strong>no UAE-wide HTA body</strong> or formal cost-per-QALY threshold.',
                    links: [
                        { label: "DoH Abu Dhabi \u2014 Shafafiya Drug Database", url: "https://shafafiya.doh.gov.ae/" },
                    ],
                },
                {
                    title: "Pricing & Market Access",
                    date: "Ongoing",
                    detail: 'Drug prices are set using international reference pricing, with each authority (MOHAP, DoH, DHA) potentially setting different prices. The UAE pharmaceutical market is predominantly driven by private insurance and out-of-pocket payment. The <strong>CCHI IDF</strong> (Insurance Drug Formulary) provides the most accessible public formulary reference. For high-cost oncology drugs, patient access often depends on the specific insurance plan coverage limits and hospital formulary inclusion rather than a national reimbursement decision.',
                    links: [
                        { label: "CCHI \u2014 Insurance Drug Formulary", url: "https://www.dha.gov.ae/en/HealthRegulation/Pages/InsuranceDrugFormulary.aspx" },
                    ],
                },
            ],
            takeaway: 'The UAE illustrates a multi-authority, insurance-driven market where there is no single national reimbursement decision. Drug access depends on the intersection of emirate-level registration, hospital formulary inclusion, and individual insurance policy coverage. The absence of a national HTA body means market access is driven by clinical adoption and insurance negotiations rather than formal cost-effectiveness assessment. The EDE transition is consolidating federal regulatory oversight but formulary decisions remain decentralised.',
        },
    },
    {
        code: "GB",
        name: "United Kingdom",
        flag: "🇬🇧",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "Since Brexit, the UK operates its own pathway via MHRA (Medicines and Healthcare products Regulatory Agency). Routes include the UK national procedure and international recognition procedures. Great Britain and Northern Ireland have separate regulatory considerations.",
                links: [
                    { label: "MHRA (Medicines and Healthcare products Regulatory Agency)", url: "https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency" },
                    { label: "MHRA — Apply for a licence", url: "https://www.gov.uk/guidance/apply-for-a-licence-to-market-a-medicine-in-the-uk" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "NICE conducts Technology Appraisals (TA) and Highly Specialised Technology (HST) reviews. Outcomes: Recommended, Optimised, Only in Research, Not Recommended, or Terminated. The Cancer Drugs Fund (CDF) provides managed access. In Scotland, SMC conducts separate assessments.",
                links: [
                    { label: "NICE — Technology Appraisals", url: "https://www.nice.org.uk/about/what-we-do/our-programmes/nice-guidance/nice-technology-appraisal-guidance" },
                    { label: "NICE — Cancer Drugs Fund", url: "https://www.nice.org.uk/about/what-we-do/our-programmes/nice-guidance/nice-technology-appraisal-guidance/cancer-drugs-fund" },
                    { label: "SMC (Scottish Medicines Consortium)", url: "https://www.scottishmedicines.org.uk" },
                    { label: "AWMSG (All Wales Medicines Strategy Group)", url: "https://awmsg.nhs.wales/medicines-appraisals-and-guidance/" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "NHS England negotiates commercial agreements following NICE guidance. The Voluntary Scheme for Branded Medicines Pricing and Access (VPAS) governs branded medicine pricing. ILAP provides early parallel scientific advice between MHRA and NICE.",
                links: [
                    { label: "NHS England — Commercial Medicines", url: "https://www.england.nhs.uk/medicines-2/commercial-medicines" },
                    { label: "VPAS (Voluntary Scheme)", url: "https://www.gov.uk/government/collections/voluntary-scheme-for-branded-medicines-pricing-and-access-vpas" },
                    { label: "ILAP (Innovative Licensing and Access Pathway)", url: "https://www.gov.uk/guidance/innovative-licensing-and-access-pathway" },
                    { label: "BNF (British National Formulary)", url: "https://bnf.nice.org.uk/" },
                    { label: "NHS Drug Tariff", url: "https://www.nhsbsa.nhs.uk/pharmacies-gp-practices-and-appliance-contractors/drug-tariff" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Marketing Authorization</h4>
<p>Since Brexit (Jan 2021), the UK operates its own regulatory pathway via MHRA. Products previously authorised via EMA were "grandfathered" into UK marketing authorisations.</p>
<ol>
    <li>Search the <a href="https://products.mhra.gov.uk/" target="_blank" rel="noopener">MHRA Products database</a> for UK marketing authorisation status — includes approved indications, SmPC, and PIL</li>
    <li>For products authorised before 2021, check whether the UK MA was converted from the EU centralised authorisation</li>
    <li>The <a href="https://www.gov.uk/guidance/innovative-licensing-and-access-pathway" target="_blank" rel="noopener">ILAP (Innovative Licensing and Access Pathway)</a> provides early parallel scientific advice between MHRA and NICE — check if the product has an ILAP designation</li>
</ol>

<h4 class="tips-heading">NICE Technology Appraisals</h4>
<p>NICE evaluates new medicines through Technology Appraisals (TA) and Highly Specialised Technology (HST) reviews. These are legally binding — NHS England must fund recommended treatments within 90 days.</p>
<ol>
    <li>Search the <a href="https://www.nice.org.uk/guidance/published?type=ta,hst" target="_blank" rel="noopener">NICE published guidance</a> by product name or therapeutic area</li>
    <li>Key documents in each appraisal:
        <ul>
            <li><strong>Final Appraisal Document (FAD)</strong>: the decision document with recommendation, rationale, and conditions</li>
            <li><strong>Committee Papers</strong>: include the ERG (Evidence Review Group) report, company submission, and clinical/patient evidence</li>
            <li><strong>Costing template</strong>: NHS England's budget impact estimate</li>
        </ul>
    </li>
    <li>Outcomes: <strong>Recommended</strong> (green) → <strong>Optimised / With restrictions</strong> (amber) → <strong>Only in Research</strong> → <strong>Not Recommended</strong> (red) → <strong>Terminated</strong></li>
    <li>For oncology, check if the product entered the <a href="https://www.nice.org.uk/about/what-we-do/our-programmes/nice-guidance/nice-technology-appraisal-guidance/cancer-drugs-fund" target="_blank" rel="noopener">Cancer Drugs Fund (CDF)</a> — CDF provides managed access while further data is collected</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> NICE appraisals include the <strong>ICER (incremental cost-effectiveness ratio)</strong> threshold. The standard threshold is £20,000–£30,000/QALY; end-of-life and HST appraisals may accept higher ICERs. Check the FAD for the accepted ICER range.</p>

<h4 class="tips-heading">SMC (Scotland) &amp; AWMSG (Wales)</h4>
<ol>
    <li>The <a href="https://www.scottishmedicines.org.uk/medicines-advice/" target="_blank" rel="noopener">Scottish Medicines Consortium</a> conducts separate assessments for NHS Scotland</li>
    <li>SMC outcomes are: Accepted, Accepted for restricted use, or Not recommended</li>
    <li>SMC decisions are not binding in the same way as NICE TAs — NHS Scotland boards may make local formulary decisions</li>
    <li>For rare diseases, the PACE (Patient and Clinician Engagement) process may apply — provides an additional route for medicines that would otherwise be "not recommended"</li>
    <li>The <a href="https://awmsg.nhs.wales/medicines-appraisals-and-guidance/" target="_blank" rel="noopener">AWMSG (All Wales Medicines Strategy Group)</a> appraises medicines not covered by NICE for NHS Wales — check AWMSG for complete UK coverage</li>
</ol>
<p class="tips-note"><strong>Important:</strong> NICE (England), SMC (Scotland), and AWMSG (Wales) are three separate HTA bodies. Outcomes can differ — an analyst should check all three for comprehensive UK coverage.</p>

<h4 class="tips-heading">Pricing &amp; Reimbursement</h4>
<ol>
    <li>The <a href="https://bnf.nice.org.uk/" target="_blank" rel="noopener">BNF (British National Formulary)</a> lists indicative NHS prices — note these are list prices and confidential discounts (PAS — Patient Access Schemes) are common</li>
    <li>The <a href="https://www.nhsbsa.nhs.uk/pharmacies-gp-practices-and-appliance-contractors/drug-tariff" target="_blank" rel="noopener">NHS Drug Tariff</a> lists reimbursement prices for community pharmacy dispensing</li>
    <li>Hospital medicines are procured via NHS Supply Chain or regional tenders — prices are generally not public</li>
    <li>VPAS (Voluntary Scheme for Branded Medicines Pricing and Access) caps total branded medicine spend growth — includes a payment mechanism if growth exceeds agreed levels</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Patient Access Schemes (PAS) are confidential commercial agreements between the manufacturer and NHS England. The "list price" in the BNF may not reflect the actual acquisition cost. NICE appraisals note when a PAS is in place but do not disclose the discount.</p>
        `,
        drugExample: {
            drug: "Bavencio",
            inn: "avelumab",
            indication: "First-line maintenance treatment of locally advanced or metastatic urothelial carcinoma (UC) that has not progressed after platinum-based chemotherapy",
            steps: [
                {
                    title: "EMA Marketing Authorization",
                    date: "25 January 2021",
                    detail: 'European Commission granted the Type II variation extending Bavencio\'s indication to first-line maintenance treatment of locally advanced or metastatic urothelial carcinoma in adults whose disease has not progressed with platinum-based chemotherapy. Based on the Phase III JAVELIN Bladder 100 trial (N=700): median OS 21.4 months vs 14.3 months with best supportive care (HR 0.69).',
                    links: [
                        { label: "EMA EPAR — Bavencio", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/bavencio" },
                    ],
                },
                {
                    title: "MHRA UK Approval",
                    date: "21 January 2021",
                    detail: 'MHRA approved the extension of indication for avelumab in first-line maintenance urothelial carcinoma, aligning with the EMA timeline (approved slightly ahead of the EC decision). The MHRA approval covered the same JAVELIN Bladder 100 data package.',
                    links: [
                        { label: "MHRA Products — Bavencio", url: "https://products.mhra.gov.uk/" },
                    ],
                },
                {
                    title: "NICE Technology Appraisal — Initial Rejection & Appeal",
                    date: "May 2021 – May 2022",
                    detail: 'NICE initially issued a negative recommendation in May 2021, concluding that the cost-effectiveness estimates were too uncertain. The manufacturer (Merck/Pfizer) <strong>appealed the decision</strong> — a relatively rare step. The appeal was upheld, and NICE reversed its decision. The final guidance <strong>TA788</strong> was published on <strong>11 May 2022</strong>, recommending avelumab with conditions: treatment must stop at 5 years of uninterrupted therapy or earlier if disease progresses. A confidential Patient Access Scheme (PAS) discount was agreed with NHS England.',
                    links: [
                        { label: "NICE TA788 — Avelumab for maintenance treatment of UC", url: "https://www.nice.org.uk/guidance/ta788" },
                    ],
                },
                {
                    title: "NHS England Funding & Access",
                    date: "From August 2022",
                    detail: 'Following TA788, NHS England was legally required to fund avelumab within 90 days. Avelumab became available through NHS hospitals as a maintenance immunotherapy — the first and only approved maintenance treatment in first-line urothelial carcinoma in the UK. The BNF list price is approximately £1,170 per 200 mg vial, but the actual acquisition cost is lower due to the confidential PAS.',
                    links: [
                        { label: "BNF — Avelumab", url: "https://bnf.nice.org.uk/drugs/avelumab/" },
                    ],
                },
            ],
            takeaway: 'Bavencio\'s UK journey illustrates how the NICE appeals process can reverse an initial negative recommendation — a rare but important mechanism. The 16-month delay from MHRA approval (Jan 2021) to NICE recommendation (May 2022) highlights the gap between regulatory approval and reimbursed access in the UK. The confidential PAS discount was critical to achieving an acceptable ICER within the £20,000–£30,000/QALY threshold.',
        },
    },
    {
        code: "VN",
        name: "Vietnam",
        flag: "🇻🇳",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The Drug Administration of Vietnam (DAV) under the Ministry of Health handles drug registration. Dossiers follow the ASEAN Common Technical Dossier (ACTD) format and must be in Vietnamese. Drugbank.vn is the national pharmaceutical data bank with 13,300+ registered drugs.",
                links: [
                    { label: "DAV (Drug Administration of Vietnam)", url: "https://dav.gov.vn/" },
                    { label: "DAV — Drug Registration Lookup", url: "https://dichvucong.dav.gov.vn/congbothuoc/index" },
                    { label: "Drugbank.vn — National Pharmaceutical Data Bank", url: "https://drugbank.vn/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "Drug prices are controlled through price declaration, competitive bidding/tendering for public facilities, and centralized procurement. Manufacturers must declare wholesale and retail prices; they cannot sell above declared prices. The NCDPC handles national-level centralized bidding. Vietnam references Thailand, Malaysia, Indonesia, Philippines, and Cambodia for international reference pricing.",
                links: [
                    { label: "DAV — Drug Price Declaration Portal", url: "https://dichvucong.dav.gov.vn/congbogiathuoc/index" },
                    { label: "NCDPC (National Centralized Drug Procurement Center)", url: "https://ncdp.vn/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Vietnam Social Security (VSS/BHXH) manages the social health insurance system covering ~93% of the population. The Reimbursement Drug List specifies covered medicines by active ingredient (not brand name). Co-payments are 0–20% depending on beneficiary category. Budget Impact Analysis is mandatory for new drugs seeking reimbursement since 2018.",
                links: [
                    { label: "VSS (Vietnam Social Security)", url: "https://vss.gov.vn/english/Pages/default.aspx" },
                    { label: "Circular 20/2022/TT-BYT — Health Insurance Drug List", url: "https://thuvienphapluat.vn/van-ban/EN/The-thao-Y-te/Circular-20-2022-TT-BYT-payment-conditions-of-chemical-medications-under-health-insurance/554928/tieng-anh.aspx" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "HTA is still developing in Vietnam. The Health Strategy and Policy Institute (HSPI) is the designated focal point for HTA activities under the MOH. There is no formal, standalone HTA agency that publishes individual drug appraisals.",
                links: [
                    { label: "HSPI (Health Strategy and Policy Institute)", url: "https://hspi.org.vn/en/home" },
                    { label: "iDSI — Vietnam HTA Progress", url: "https://idsihealth.org/our-impact/vietnam/" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Ministry of Health — Vietnam", url: "https://moh.gov.vn/en/web/ministry-of-health" },
                    { label: "LuatVietnam — English Legal Database", url: "https://english.luatvietnam.vn/" },
                    { label: "ClinRegs (NIH) — Vietnam", url: "https://clinregs.niaid.nih.gov/country/vietnam" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization &amp; Drug Registry</h4>
<ol>
    <li>Search the <a href="https://dichvucong.dav.gov.vn/congbothuoc/index" target="_blank" rel="noopener">DAV Drug Registration Lookup</a> to find registered medicines — search by product name, active ingredient, or registration number (VD- for domestic, VN- for imported)</li>
    <li><a href="https://drugbank.vn/" target="_blank" rel="noopener">Drugbank.vn</a> is the national pharmaceutical data bank launched by the DAV in 2019 with 13,300+ drugs, manufacturers, and distributors — also available as a mobile app</li>
    <li>Registration dossiers must follow the <strong>ASEAN Common Technical Dossier (ACTD)</strong> format. Evaluation typically takes 12–18 months</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> Most official resources are in Vietnamese only. Use Google Translate to navigate. Key Vietnamese terms: "tra cuu thuoc" (drug lookup), "giay dang ky luu hanh" (marketing authorization), "danh muc thuoc" (drug list).</p>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>Declared and winning bid prices are published on the <a href="https://dichvucong.dav.gov.vn/congbogiathuoc/index" target="_blank" rel="noopener">DAV Drug Price Declaration Portal</a> — search by drug name or active ingredient (Vietnamese only)</li>
    <li>Drugs for public facilities are procured through <strong>competitive bidding</strong> — generics are classified into 5 tiers (Gx1–Gx5) based on manufacturing standards, with price caps relative to brand-name drugs (Circular 15/2019/TT-BYT)</li>
    <li>The <a href="https://ncdp.vn/" target="_blank" rel="noopener">NCDPC</a> handles national centralized procurement — brand-name drugs are procured via price negotiation; generics via competitive bidding</li>
    <li>The <strong>Amended Pharmaceutical Law (effective July 2025)</strong> introduces stronger price transparency — manufacturers must announce estimated wholesale prices before market entry, and the MOH can recommend adjustments if prices exceed defined thresholds</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Vietnam references Thailand, Malaysia, Indonesia, Philippines, and Cambodia for international reference pricing. Bid price data is published online but is not available as downloadable datasets.</p>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li>The <strong>Reimbursement Drug List</strong> (Circular 20/2022/TT-BYT, replacing Circular 30/2018) covers 1,037 active ingredients across 27 therapeutic groups, plus 59 radiopharmaceuticals</li>
    <li>The list is organized by <strong>active ingredient</strong> (not brand name) without specifying dosage form or trade name — this differs from European systems</li>
    <li>Co-payment structure: <strong>0%</strong> for children under 6 and disabled persons; <strong>5%</strong> for poor people and veterans; <strong>20%</strong> for most others</li>
    <li><strong>Budget Impact Analysis (BIA)</strong> has been mandatory since 2018 for new drugs seeking insurance coverage; cost-effectiveness analysis remains optional</li>
    <li>For English translations of circulars, use <a href="https://english.luatvietnam.vn/" target="_blank" rel="noopener">LuatVietnam</a> or <a href="https://lawnet.vn/en/" target="_blank" rel="noopener">LawNet</a></li>
</ol>
<p class="tips-note"><strong>Important:</strong> Vietnam does not have individual drug appraisals like NICE TAs or G-BA Zusatznutzen assessments. Reimbursement decisions are made through periodic circular updates to the drug list, not per-product HTA reviews. The <a href="https://hspi.org.vn/en/home" target="_blank" rel="noopener">HSPI</a> is the designated HTA focal point but its outputs are not published as structured appraisal documents.</p>

<h4 class="tips-heading">Key Legislation</h4>
<ol>
    <li><strong>Law on Pharmacy No. 105/2016/QH13</strong> — primary pharmaceutical law, amended by Law 44/2024 (effective July 2025)</li>
    <li><strong>Circular 20/2022/TT-BYT</strong> — current health insurance drug reimbursement list</li>
    <li><strong>Circular 15/2019/TT-BYT</strong> — drug tendering/bidding rules for public facilities (generic tiers Gx1–Gx5)</li>
    <li><strong>Circular 19/2018/TT-BYT</strong> — Essential Medicines List</li>
    <li>For the latest versions, search <a href="https://thuvienphapluat.vn/en/" target="_blank" rel="noopener">Thu Vien Phap Luat</a> (Vietnamese Legal Library)</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Vietnam's pharmaceutical sector is undergoing major reform. The Amended Pharmaceutical Law (Law 44/2024, effective July 2025) and new Decree 163/2025 introduce significant changes to pricing, registration, and foreign investment rules. Always verify circulars are current.</p>
        `,
        drugExample: {
            drug: "Keytruda",
            inn: "pembrolizumab",
            indication: "Advanced melanoma and NSCLC (initial DAV registration); now approved for 14 oncology indications",
            steps: [
                {
                    title: "DAV Registration",
                    date: "2017",
                    detail: 'DAV (Drug Administration of Vietnam) registered pembrolizumab for melanoma and NSCLC \u2014 approximately 3 years after US FDA approval, which is relatively early for the ASEAN region. The registration followed the ACTD (ASEAN Common Technical Dossier) format. By 2025, 14 oncology indications are registered in Vietnam. MSD Vietnam operates a partial free drug support programme for eligible cancer patients under a Ministry of Health decision.',
                    links: [
                        { label: "DAV \u2014 Drug Registration Lookup", url: "https://dichvucong.dav.gov.vn/congbothuoc/index" },
                        { label: "Drugbank.vn", url: "https://drugbank.vn/" },
                    ],
                },
                {
                    title: "BHXH/BHYT Reimbursement List \u2014 NOT Included",
                    date: "As of Circular 20/2022/TT-BYT",
                    detail: 'Pembrolizumab is <strong>NOT included</strong> on Vietnam\u2019s health insurance reimbursement drug list (Circular 20/2022/TT-BYT, 1,035 chemical drugs and biologics). This means the drug is entirely out-of-pocket for patients, unless accessing MSD\u2019s partial support programme. At ~VND 62 million per vial (~USD 2,500), a full course of treatment costs VND 1.5\u20133.0 billion (~USD 60,000\u2013120,000) \u2014 far beyond the means of most Vietnamese patients. In November 2025, the Ministry of Health proposed adding 28 cancer drugs to the insurance list; pembrolizumab\u2019s status in that update is unclear.',
                    links: [
                        { label: "BHXH Drug List (Circular 20/2022)", url: "https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Thong-tu-20-2022-TT-BYT-danh-muc-thanh-toan-thuoc-hoa-duoc-duoc-huong-bao-hiem-y-te-548898.aspx" },
                    ],
                },
                {
                    title: "Biosimilar Competition \u2014 Pembroria",
                    date: "October 2025",
                    detail: 'On 31 October 2025, DAV approved <strong>Pembroria</strong> (pembrolizumab biosimilar by LLC "PK-137," Russia) for 3-year circulation at ~VND 18 million per vial \u2014 approximately <strong>one-third of Keytruda\u2019s price</strong>. K Hospital (Hanoi\u2019s leading national cancer centre) has announced plans to procure Pembroria. The arrival of a significantly cheaper biosimilar may accelerate discussions about health insurance list inclusion and reshape the Vietnamese immuno-oncology market.',
                    links: [
                        { label: "Pembroria Approval (Vietnam.vn)", url: "https://www.vietnam.vn/en/thong-tin-ve-thuoc-dieu-tri-ung-thu-pembroria-vua-duoc-cap-phep-tai-viet-nam" },
                    ],
                },
            ],
            takeaway: 'Vietnam illustrates the 8-year gap between registration (2017) and health insurance coverage (still absent in 2026). Despite early DAV approval, Circular 20/2022 does not include pembrolizumab on the reimbursement list, leaving patients entirely out-of-pocket. The 2025 approval of Pembroria (Russian biosimilar at 1/3 the price) is a potentially transformative development \u2014 if the lower-cost biosimilar drives insurance list inclusion, it could dramatically expand access. Vietnam\u2019s case demonstrates how biosimilar competition in emerging markets may succeed where originator pricing failed.',
        },
    },
    // ── New WIP countries (top-70 markets) ────────────────────────────
    {
        code: "GT",
        name: "Guatemala",
        flag: "🇬🇹",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "DRSA (Dirección de Regulación, Vigilancia y Control de la Salud) under MSPAS (Ministry of Health) handles the Registro Sanitario. Products approved by FDA, EMA, INVIMA (Colombia), or ANMAT (Argentina) may qualify for an abridged review.",
                links: [
                    { label: "DRSA — Registro Sanitario", url: "https://www.drsa.gob.gt/" },
                    { label: "MSPAS — Ministry of Health Guatemala", url: "https://www.mspas.gob.gt/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "IGSS (Instituto Guatemalteco de Seguridad Social) covers formal-sector workers (~18% of population). The MoH hospital network provides medicines from a limited national formulary to the broader uninsured population. Most pharmaceutical spending is out-of-pocket.",
                links: [
                    { label: "IGSS — Guatemalan Social Security Institute", url: "https://www.igssgt.org/" },
                ],
            },
        ],
        notes: "Guatemala is a lower-middle income country. DRSA registration is required before market entry. The private pharmacy channel dominates. Spanish is the regulatory language.",
    },
    {
        code: "IN",
        name: "India",
        flag: "🇮🇳",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "CDSCO (Central Drugs Standard Control Organisation) under the Ministry of Health & Family Welfare handles drug registration, headed by the Drug Controller General of India (DCGI). New chemical entities require CDSCO approval, which can be granted in parallel with EMA/FDA approval (Section 26B waiver pathway).",
                links: [
                    { label: "CDSCO — Central Drugs Standard Control Organisation", url: "https://cdsco.gov.in/opencms/opencms/en/Home/" },
                    { label: "SUGAM — Online Drug Registration Portal", url: "https://sugam.cdsco.gov.in/login" },
                    { label: "CDSCO — Approved Drugs Search", url: "https://cdsco.gov.in/opencms/opencms/en/Drugs/ApprovedDrugs/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "NPPA (National Pharmaceutical Pricing Authority) regulates prices under the Drug Price Control Order (DPCO 2013). Medicines on the National List of Essential Medicines (NLEM) have ceiling prices set by NPPA using a market-based average approach. Non-NLEM medicines can increase by max 10%/year.",
                links: [
                    { label: "NPPA — National Pharmaceutical Pricing Authority", url: "https://nppa.gov.in/" },
                    { label: "NPPA — Ceiling Prices & SRP List", url: "https://nppa.gov.in/ceiling_prices.html" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Multiple schemes co-exist: CGHS (central government employees), PMJAY/Ayushman Bharat (~500 million low-income beneficiaries, hospitalisation focus), ESI (formal private sector), and state-level schemes. HTAIn (under ICMR) conducts HTA for national priority medicines.",
                links: [
                    { label: "CGHS — Central Government Health Scheme", url: "https://cghs.gov.in/" },
                    { label: "PMJAY — Ayushman Bharat", url: "https://pmjay.gov.in/" },
                    { label: "HTAIn — HTA in India (ICMR)", url: "https://htain.icmr.org.in/" },
                ],
            },
        ],
        notes: "India is one of the world's largest pharmaceutical markets by volume, with major generic manufacturing. Out-of-pocket expenditure exceeds 50% of total health spending. Jan Aushadhi Kendras provide generic medicines at reduced prices. State-level procurement policies can differ significantly from central standards.",
    },
    {
        code: "JO",
        name: "Jordan",
        flag: "🇯🇴",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "JFDA (Jordan Food and Drug Administration) handles drug registration. Jordan accepts dossiers from reference agencies (FDA, EMA, TGA) to support an abridged pathway. Jordan is a key pharmaceutical hub and re-export market for the wider MENA region.",
                links: [
                    { label: "JFDA — Jordan Food and Drug Administration", url: "https://www.jfda.jo/" },
                    { label: "JFDA — Drug Registration", url: "https://www.jfda.jo/page/1/224" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Key payers: Civil Insurance Programme (CIP) for civil servants, Royal Medical Services (RMS) for military, and MoH facilities for the broader population. Jordan uses international reference pricing for price-setting. JFDA maintains a publicly available drug price list.",
                links: [
                    { label: "Ministry of Health — Jordan", url: "https://www.moh.gov.jo/" },
                    { label: "JFDA — Drug Price List", url: "https://www.jfda.jo/page/1/58" },
                ],
            },
        ],
        notes: "Jordan is an important regional hub — many MENA market launches use Jordan registration as a reference or stepping stone. The pharmaceutical sector is well-developed with local generic manufacturers. Arabic and English are both used in regulatory documents.",
    },
    {
        code: "KZ",
        name: "Kazakhstan",
        flag: "🇰🇿",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "Drug registration is handled by the National Centre for Expertise of Medicines, Medical Devices and Medical Equipment (NCE). Kazakhstan is a member of the Eurasian Economic Union (EAEU) — products can be registered under the EAEU unified procedure and recognised across member states (Russia, Belarus, Armenia, Kyrgyzstan).",
                links: [
                    { label: "NCE — National Centre for Expertise", url: "https://www.nce.kz/" },
                    { label: "EAEU — Eurasian Medicines Registry", url: "https://portal.eaeunion.org/sites/odata/_layouts/15/portal.front/registry/registryreader.aspx#!ru-RU/RegistryReader/view/MEDICINES" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Kazakhstan introduced mandatory social health insurance (MSHI) in 2020. The State Guaranteed Benefits Package (SGBP) covers essential medicines. Centralized procurement is managed through the Single Distributor (SK-Pharmacy). The National Formulary includes reimbursable medicines.",
                links: [
                    { label: "Ministry of Healthcare Kazakhstan", url: "https://www.gov.kz/memleket/entities/dsm" },
                    { label: "SK-Pharmacy — Single Distributor", url: "https://www.sk-ph.kz/en" },
                ],
            },
        ],
        notes: "Kazakhstan is the largest economy in Central Asia. Regulatory language is Kazakh and Russian. EAEU membership enables regional registration. The government prioritizes domestic pharmaceutical production, which can affect market access for imported products.",
    },
    {
        code: "KW",
        name: "Kuwait",
        flag: "🇰🇼",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "Drug registration is handled by the Ministry of Health (MoH) Kuwait, Pharmaceutical Affairs Department. Kuwait participates in the Gulf Health Council (GCC) Drug Registration System, enabling shared registration across GCC member states.",
                links: [
                    { label: "Kuwait Ministry of Health", url: "https://www.moh.gov.kw/" },
                    { label: "GCC Health Council — Drug Registration", url: "https://www.ghc.gulf-health-council.org/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Healthcare is provided free to Kuwaiti nationals through the MoH. Expatriates (majority of the ~4.7M population) use employer-provided or private insurance, or pay out-of-pocket. Medicines are procured centrally by the MoH through national tenders for public hospital formularies.",
                links: [
                    { label: "MoH Kuwait — Pharmaceutical Affairs", url: "https://www.moh.gov.kw/en/Pages/pharmaceuticals.aspx" },
                ],
            },
        ],
        notes: "Kuwait has a small but high-income population. The GCC unified registration pathway allows a single dossier to cover all six GCC states (Kuwait, Saudi Arabia, UAE, Qatar, Bahrain, Oman). Procurement is primarily through MoH tenders for the public sector.",
    },
    {
        code: "MY",
        name: "Malaysia",
        flag: "🇲🇾",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "NPRA (National Pharmaceutical Regulatory Agency, under Ministry of Health) handles drug registration via the QUEST3+ online portal. Products approved by reference agencies (EMA, FDA, TGA, HSA) may qualify for an abridged or verification pathway with reduced data requirements.",
                links: [
                    { label: "NPRA — National Pharmaceutical Regulatory Agency", url: "https://www.npra.gov.my/" },
                    { label: "QUEST3+ — Drug Registration Portal", url: "https://quest3.bpfk.gov.my/" },
                ],
            },
            {
                id: "hta",
                title: "HTA",
                body: "MaHTAS (Malaysian Health Technology Assessment Section) under the Ministry of Health conducts HTA evaluations and publishes Health Technology Assessment Reports and Decision Briefs. MaHTAS reports inform the MoH formulary and procurement decisions for the public health system.",
                links: [
                    { label: "MaHTAS — HTA Reports & Decision Briefs", url: "https://www.moh.gov.my/index.php/pages/view/173" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Malaysia has a dual public-private system. The MoH formulary (Senarai Ubat) covers medicines for public hospitals, procured through centralized tenders. Private sector drug prices are unregulated. National health financing reform (\"ReSPEKT\" scheme) has been proposed but not yet implemented.",
                links: [
                    { label: "MoH Malaysia — Drug Formulary (Senarai Ubat)", url: "https://www.moh.gov.my/index.php/pages/view/46" },
                ],
            },
        ],
        notes: "Malaysia is one of Southeast Asia's most developed pharmaceutical markets. Public sector access requires MoH formulary listing via MaHTAS review. Bahasa Malaysia and English are both used in regulatory documents.",
    },
    {
        code: "MA",
        name: "Morocco",
        flag: "🇲🇦",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "DIMED (Division du Médicament et de la Pharmacie, under the Ministry of Health and Social Protection) handles the visa pharmaceutique (marketing authorization). Morocco references EMA, FDA, or other authority approvals as part of the dossier evaluation.",
                links: [
                    { label: "Ministry of Health — Morocco", url: "https://www.sante.gov.ma/" },
                    { label: "DIMED — Pharmaceutical Division", url: "https://www.sante.gov.ma/Pages/Medicaments.aspx" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Morocco's AMO (Assurance Maladie Obligatoire) is the compulsory health insurance framework. CNOPS covers public-sector employees; CNSS covers private-sector workers. RAMED covered the indigent population (now being restructured into AMO-Tadamon). Drug reimbursement is based on a positive list established by the Ministry of Health.",
                links: [
                    { label: "CNOPS — Caisse Nationale des Organismes de Prévoyance Sociale", url: "https://www.cnops.org.ma/" },
                    { label: "CNSS — Caisse Nationale de Sécurité Sociale", url: "https://www.cnss.ma/" },
                ],
            },
        ],
        notes: "Morocco is the largest pharmaceutical market in francophone Africa. Drug pricing is regulated by the Ministry of Health via a decree-based ceiling price system using international reference pricing. French and Arabic are the regulatory languages.",
    },
    {
        code: "NZ",
        name: "New Zealand",
        flag: "🇳🇿",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "Medsafe (NZ Medicines and Medical Devices Safety Authority) handles medicine consent. Products approved by EMA, FDA, TGA, or Health Canada may use the consent-based pathway. New Zealand and Australia have a joint trans-Tasman regulatory framework (ANZTPA) for some products.",
                links: [
                    { label: "Medsafe — Medicine Search", url: "https://www.medsafe.govt.nz/regulatory/DbSearch.asp" },
                    { label: "Medsafe — New Zealand Medicines Regulatory Authority", url: "https://www.medsafe.govt.nz/" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement (PHARMAC)",
                body: "PHARMAC (Pharmaceutical Management Agency) is one of the world's most influential HTA and formulary management bodies. It manages the NZUL (NZ Pharmaceutical Schedule) with a strict cost-containment mandate. The PTAC (Pharmacology and Therapeutics Advisory Committee) provides clinical recommendations. The effective WTP threshold is informally estimated at NZD 20,000–60,000 per QALY — among the world's lowest.",
                links: [
                    { label: "PHARMAC — Pharmaceutical Schedule", url: "https://schedule.pharmac.govt.nz/" },
                    { label: "PHARMAC — Funding Decisions", url: "https://www.pharmac.govt.nz/medicine-funding-and-supply/medicine-funding/funding-decisions/" },
                    { label: "PHARMAC — PTAC Minutes & Reports", url: "https://www.pharmac.govt.nz/medicine-funding-and-supply/medicine-funding/evidence-assessment/minutes-and-reports/" },
                ],
            },
        ],
        notes: "New Zealand has one of the most restrictive drug reimbursement environments globally. A positive PHARMAC listing is required for meaningful patient access — out-of-pocket costs for non-listed medicines are prohibitive. The PHARMAC model is frequently cited as a reference for HTA-driven cost control.",
    },
    {
        code: "NG",
        name: "Nigeria",
        flag: "🇳🇬",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "NAFDAC (National Agency for Food and Drug Administration and Control) handles drug registration in Nigeria. Products must be registered before importation, manufacture, advertisement, or sale. NAFDAC accepts eCTD-compatible dossiers and expedites review of products approved by EMA, FDA, or WHO prequalified.",
                links: [
                    { label: "NAFDAC — National Agency for Food and Drug Administration", url: "https://www.nafdac.gov.ng/" },
                    { label: "NAFDAC — Product Registration Portal", url: "https://prodportal.nafdac.gov.ng/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "NHIA (National Health Insurance Authority, formerly NHIS) administers health insurance. The Basic Health Care Provision Fund (BHCPF) extends primary care coverage. Formal health insurance covers only ~5% of Nigeria's population of ~220 million, with the majority of pharmaceutical spending out-of-pocket.",
                links: [
                    { label: "NHIA — National Health Insurance Authority", url: "https://www.nhia.gov.ng/" },
                ],
            },
        ],
        notes: "Nigeria is Africa's largest economy. The pharmaceutical market is dominated by generics and is highly price-sensitive. Distribution is complex, with informal channels significant outside major cities. Cold-chain reliability and counterfeit medicines are key market challenges.",
    },
    {
        code: "PK",
        name: "Pakistan",
        flag: "🇵🇰",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "DRAP (Drug Regulatory Authority of Pakistan) handles drug registration via its ePortal. Pakistan references FDA, EMA, and WHO prequalification for expedited registration of essential and priority medicines. Clinical trial waiver provisions exist for products with recognized reference approvals.",
                links: [
                    { label: "DRAP — Drug Regulatory Authority of Pakistan", url: "https://www.dra.gov.pk/" },
                    { label: "DRAP — ePortal (Online Registration)", url: "https://eportal.dra.gov.pk/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "DRAP's Drug Pricing Committee sets the Maximum Retail Price (MRP) for registered drugs using a cost-plus methodology. Manufacturers must apply for price approval and cannot sell above the approved MRP. Price increases require DRAP approval.",
                links: [
                    { label: "DRAP — Drug Prices", url: "https://www.dra.gov.pk/drug-pricing/" },
                ],
            },
        ],
        notes: "Pakistan has a population of ~240 million and a large generic pharmaceutical market. Over 70% of health spending is out-of-pocket. The Sehat Sahulat Programme provides hospital-focused coverage for the poorest. Formal drug reimbursement infrastructure is limited. Urdu is the regulatory language.",
    },
    {
        code: "ZA",
        name: "South Africa",
        flag: "🇿🇦",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "SAHPRA (South African Health Products Regulatory Authority, successor to the MCC) handles medicine registration. Expedited pathways exist for products approved by reference agencies (FDA, EMA, TGA, Health Canada, WHO). SAHPRA has been working to reduce its historical application backlog.",
                links: [
                    { label: "SAHPRA — Product Search", url: "https://www.sahpra.org.za/find-a-product/" },
                    { label: "SAHPRA — South African Health Products Regulatory Authority", url: "https://www.sahpra.org.za/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "The SEP (Single Exit Price) system governs drug pricing. All medicines must be sold at the manufacturer's single published price — no tiered pricing is permitted. SEP adjustments are allowed annually based on a formula. Dispensing fees are set separately by regulation.",
                links: [
                    { label: "NDoH — SEP Database (Single Exit Price)", url: "https://www.health.gov.za/sep/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "South Africa has a dual public-private system. The public sector (80%+ of population) uses the Essential Drugs Programme (EDP) formulary. The private sector is covered by ~80 medical aid schemes regulated by the Council for Medical Schemes. The NHI Act (signed 2023) aims for universal coverage but full implementation will take many years.",
                links: [
                    { label: "NDoH — National Department of Health", url: "https://www.health.gov.za/" },
                    { label: "Council for Medical Schemes", url: "https://www.medicalschemes.co.za/" },
                    { label: "NHI — National Health Insurance NDoH", url: "https://www.health.gov.za/nhi/" },
                ],
            },
        ],
        notes: "South Africa is the largest pharmaceutical market in sub-Saharan Africa and a regional regulatory reference point. SAHPRA registration timelines have historically been long (2–5+ years), but reform is ongoing. The SEP database is the authoritative price reference.",
    },
    {
        code: "UA",
        name: "Ukraine",
        flag: "🇺🇦",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The State Expert Centre (DEC) of the Ministry of Health of Ukraine handles drug registration. Ukraine uses a reference-based registration procedure — products approved by EMA, FDA, or other recognised agencies can use an accelerated pathway. Ukraine is an EU candidate and harmonising its pharmaceutical regulatory framework.",
                links: [
                    { label: "State Expert Centre — DEC (MoH Ukraine)", url: "https://www.dec.gov.ua/en" },
                    { label: "DEC — State Drug Registry Search", url: "https://www.dec.gov.ua/reg_info/list-for-medicines/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "The Affordable Medicines Programme (AMP) provides reimbursement for selected therapeutic groups (cardiovascular, diabetes, asthma) at pharmacies via electronic prescription. The NHSU (National Health Service of Ukraine) manages healthcare financing. The Government-guaranteed benefits package covers primary care and hospital-based essential medicines.",
                links: [
                    { label: "Ministry of Health — Ukraine", url: "https://moz.gov.ua/en/" },
                    { label: "NHSU — National Health Service of Ukraine", url: "https://nszu.gov.ua/en" },
                    { label: "Affordable Medicines Programme", url: "https://moz.gov.ua/affordable-medicines" },
                ],
            },
        ],
        notes: "Ukraine is undergoing significant healthcare reform (since 2016). The ongoing conflict since 2022 has significantly disrupted the pharmaceutical market. As an EU candidate, Ukraine is aligning its pharmaceutical regulations with EU standards. Verify current market access conditions with local partners.",
    },
    {
        code: "BD",
        name: "Bangladesh",
        flag: "🇧🇩",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "DGDA (Directorate General of Drug Administration) under the Ministry of Health handles drug registration. Bangladesh has a National Drug Policy and a local manufacturing base that is one of the largest generics exporters globally. Registration requires a local manufacturing partner or authorized agent.",
                links: [
                    { label: "DGDA — Directorate General of Drug Administration", url: "https://www.dgda.gov.bd/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Bangladesh has limited formal drug reimbursement. Government hospitals provide medicines from the Essential Drugs List free of charge, but supply is inconsistent. Out-of-pocket expenditure accounts for ~70% of total health spending. The Directorate General of Health Services (DGHS) manages the public health system.",
                links: [
                    { label: "DGHS — Directorate General of Health Services", url: "https://www.dghs.gov.bd/index.php/en" },
                ],
            },
        ],
        notes: "Bangladesh is an IQVIA pharmerging market with ~170 million population. It has a large, internationally recognized generic pharmaceutical manufacturing sector that exports to over 150 countries. Drug prices are regulated by DGDA. The primary market access challenge is distribution infrastructure outside major urban areas.",
    },
    {
        code: "CR",
        name: "Costa Rica",
        flag: "🇨🇷",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The Ministry of Health (Ministerio de Salud) handles pharmaceutical registration via RTCA (Reglamento Técnico Centroamericano), the Central American regional technical standard. Products approved by FDA or EMA benefit from an expedited review pathway. The national medicines registry is managed by the Dirección de Regulación de Productos de Interés Sanitario (DRPIS).",
                links: [
                    { label: "Ministry of Health — Costa Rica", url: "https://www.ministeriodesalud.go.cr/" },
                    { label: "RTCA — Central American Technical Regulation Framework", url: "https://www.minsa.gob.pa/rtca/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement (CCSS)",
                body: "Costa Rica's CCSS (Caja Costarricense de Seguro Social) provides near-universal healthcare coverage (~96% of the population). The CCSS maintains a centralized formulary (Lista Oficial de Medicamentos, LOM) and procures drugs centrally through CENDEISSS. CCSS listing is essential for access to the majority of patients.",
                links: [
                    { label: "CCSS — Caja Costarricense de Seguro Social", url: "https://www.ccss.sa.cr/" },
                    { label: "CCSS — Medicines Formulary (LOM)", url: "https://www.ccss.sa.cr/farmacia" },
                ],
            },
        ],
        notes: "Costa Rica has one of Latin America's strongest universal health systems. CCSS formulary listing is the primary access gate for the majority of the population. Drug prices are regulated. The market is small (~5 million population) but high-income and with a well-developed healthcare system.",
    },
    {
        code: "EC",
        name: "Ecuador",
        flag: "🇪🇨",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "ARCSA (Agencia Nacional de Regulación, Control y Vigilancia Sanitaria) handles drug registration in Ecuador. Ecuador accepts references to FDA or EMA approvals as part of an expedited registration pathway. Ecuador uses the dollarized economy (USD), which simplifies pricing.",
                links: [
                    { label: "ARCSA — National Agency for Health Regulation", url: "https://www.controlsanitario.gob.ec/" },
                    { label: "MSP — Ministerio de Salud Pública", url: "https://www.salud.gob.ec/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "The MSP (Ministerio de Salud Pública) manages the public health system with a Cuadro Nacional de Medicamentos Básicos (CNMB — essential medicines list). IESS (Instituto Ecuatoriano de Seguridad Social) covers formal-sector workers and their families. Drug pricing in the public sector is regulated through maximum reference prices.",
                links: [
                    { label: "IESS — Instituto Ecuatoriano de Seguridad Social", url: "https://www.iess.gob.ec/" },
                    { label: "SERCOP — Public Procurement Portal", url: "https://www.sercop.gob.ec/" },
                ],
            },
        ],
        notes: "Ecuador has a dollarized economy (~17 million population). Public-sector procurement through IESS and MSP is centralized and uses maximum reference prices. The private market operates with limited price controls. Spanish is the regulatory language.",
    },
    {
        code: "KE",
        name: "Kenya",
        flag: "🇰🇪",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "The Pharmacy and Poisons Board (PPB) handles drug registration in Kenya. Kenya uses a dossier-based system and accepts references to WHO prequalification, EMA, FDA, or TGA approvals for an expedited pathway. Kenya is the East African regulatory reference market and a COMESA hub.",
                links: [
                    { label: "PPB — Pharmacy and Poisons Board", url: "https://ppb.go.ke/" },
                    { label: "PPB — Registered Products Search", url: "https://ppb.go.ke/index.php/registered-products" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "Kenya transitioned from NHIF (National Hospital Insurance Fund) to SHA (Social Health Authority) in 2024 under the Affordable Care Act. SHA manages three funds: Primary Healthcare Fund, Social Health Insurance Fund (SHIF), and Emergency, Chronic and Critical Illness Fund (ECCIF). KEMSA (Kenya Medical Supplies Agency) handles centralized procurement for public facilities.",
                links: [
                    { label: "SHA — Social Health Authority", url: "https://sha.go.ke/" },
                    { label: "KEMSA — Kenya Medical Supplies Agency", url: "https://kemsa.go.ke/" },
                    { label: "Ministry of Health — Kenya", url: "https://www.health.go.ke/" },
                ],
            },
        ],
        notes: "Kenya is East Africa's largest pharmaceutical market and a regulatory hub for the region. A positive PPB registration is often used as a reference for other East African countries. Out-of-pocket spending remains significant despite expanding insurance coverage. The SHA reform (2024) represents a major shift in healthcare financing.",
    },
    {
        code: "RS",
        name: "Serbia",
        flag: "🇷🇸",
        wip: true,
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                body: "ALIMS (Agencija za lekove i medicinska sredstva Srbije — Medicines and Medical Devices Agency of Serbia) handles drug registration. Serbia is an EU accession candidate and is progressively aligning with EU pharmaceutical regulations. EMA-approved products benefit from an accelerated review pathway.",
                links: [
                    { label: "ALIMS — Medicines and Medical Devices Agency of Serbia", url: "https://www.alims.gov.rs/eng/" },
                    { label: "ALIMS — Drug Search", url: "https://www.alims.gov.rs/eng/medicines/search-for-human-medicines/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "RFZO (Republički fond za zdravstveno osiguranje — Republic Fund for Health Insurance) manages compulsory health insurance covering ~95% of the population. The Positive Drug List (Lista lekova) determines reimbursable medicines. Drug prices are set via IRP using EU reference countries. Prior authorization (saglasnost) is required for high-cost medicines.",
                links: [
                    { label: "RFZO — Republic Fund for Health Insurance", url: "https://www.rfzo.rs/index.php/en/" },
                    { label: "RFZO — Positive Drug List", url: "https://www.rfzo.rs/index.php/en/svi-propisi-en/lista-lekova-en" },
                ],
            },
        ],
        notes: "Serbia is the largest Western Balkans pharmaceutical market (~6.8 million population). It uses IRP with reference to EU countries, which can make prices lower than EU averages. EU accession alignment is ongoing. Serbian (Cyrillic and Latin scripts) is the official language; English-language ALIMS portal is available.",
    },
];

// ── DOM Elements ──────────────────────────────────────────────────────

const countryGrid    = document.getElementById("country-grid");
const countryRegions = document.getElementById("country-regions");
const countryMap     = document.getElementById("country-map");
const countrySearch  = document.getElementById("country-search");
const noResults      = document.getElementById("country-no-results");
const countryCount   = document.getElementById("country-count");
const resourceDetail = document.getElementById("resource-detail");
const detailFlag     = document.getElementById("detail-flag");
const detailName     = document.getElementById("detail-country-name");
const detailSections = document.getElementById("detail-sections");
const detailClose    = document.getElementById("detail-close");

const displayAllBtn     = document.getElementById("display-all-btn");
const displayRegionsBtn = document.getElementById("display-regions-btn");
const displayMapBtn     = document.getElementById("display-map-btn");

let currentDisplayMode = "all"; // "all" | "regions" | "map"

// ── Helper: build a country card button ──────────────────────────────

function buildCountryCard(c) {
    const btn = document.createElement("button");
    btn.className = "country-flag-card";
    btn.dataset.code = c.code;
    btn.setAttribute("aria-label", c.name);
    btn.innerHTML =
        (c.wip ? `<span class="wip-badge" title="Work in progress — initial data only">WIP</span>` : "") +
        `<span class="fi fi-${c.code.toLowerCase()} flag-icon" aria-hidden="true"></span>` +
        `<span class="flag-label">${esc(c.name)}</span>`;
    btn.addEventListener("click", () => {
        const country = COUNTRIES.find(co => co.code === btn.dataset.code);
        if (country) openDetail(country, btn);
    });
    return btn;
}

// ── Initialise ────────────────────────────────────────────────────────

countryCount.textContent = COUNTRIES.length;

// Build the flat grid (Display All)
COUNTRIES.forEach(c => countryGrid.appendChild(buildCountryCard(c)));

// Build the regions view
function buildRegionsView() {
    countryRegions.innerHTML = "";
    REGION_ORDER.forEach(region => {
        const regionCountries = COUNTRIES.filter(c => REGION_MAP[c.code] === region);
        if (regionCountries.length === 0) return;

        const group = document.createElement("div");
        group.className = "region-group";
        group.dataset.region = region;

        const header = document.createElement("div");
        header.className = "region-header";
        header.innerHTML = `<h3 class="region-title">${esc(region)}</h3><span class="region-count">${regionCountries.length}</span>`;
        group.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "country-flag-grid";
        regionCountries.forEach(c => grid.appendChild(buildCountryCard(c)));
        group.appendChild(grid);

        countryRegions.appendChild(group);
    });

    // Catch any countries not in the map
    const unmapped = COUNTRIES.filter(c => !REGION_MAP[c.code]);
    if (unmapped.length > 0) {
        const group = document.createElement("div");
        group.className = "region-group";
        group.dataset.region = "Other";
        group.innerHTML = `<div class="region-header"><h3 class="region-title">Other</h3><span class="region-count">${unmapped.length}</span></div>`;
        const grid = document.createElement("div");
        grid.className = "country-flag-grid";
        unmapped.forEach(c => grid.appendChild(buildCountryCard(c)));
        group.appendChild(grid);
        countryRegions.appendChild(group);
    }
}
buildRegionsView();

// Build the interactive map view
let mapInitialised = false;

function buildMapView() {
    if (mapInitialised) return;
    mapInitialised = true;

    const mapContainer = document.createElement("div");
    mapContainer.className = "map-container";

    const tooltip = document.createElement("div");
    tooltip.className = "map-tooltip hidden";
    tooltip.id = "map-tooltip";

    // Build a legend
    const legend = document.createElement("div");
    legend.className = "map-legend";
    legend.innerHTML = `
        <span class="map-legend-item"><span class="map-legend-dot map-legend-available"></span> Available</span>
        <span class="map-legend-item"><span class="map-legend-dot map-legend-wip"></span> WIP</span>
        <span class="map-legend-item"><span class="map-legend-dot map-legend-unavailable"></span> Not covered</span>
    `;

    mapContainer.appendChild(legend);

    const mapSvgWrapper = document.createElement("div");
    mapSvgWrapper.className = "map-svg-wrapper";

    // ── Render SVG world map outline ────────────────────────────
    if (typeof WORLD_MAP_PATHS !== "undefined" && WORLD_MAP_PATHS.length > 0) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 1000 500");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.classList.add("map-landmass-svg");

        for (const region of WORLD_MAP_PATHS) {
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", region.d);
            path.classList.add("map-landmass-path");
            svg.appendChild(path);
        }

        mapSvgWrapper.appendChild(svg);
    }

    // Country approximate positions (lat/lng mapped to % of container)
    // Using Mercator-like projection: x = (lng + 180) / 360 * 100, y = (90 - lat) / 180 * 100
    const COUNTRY_POSITIONS = {
        DZ: { lat: 28.0, lng: 3.0 },
        AR: { lat: -34.0, lng: -64.0 },
        AU: { lat: -25.0, lng: 134.0 },
        AT: { lat: 47.5, lng: 14.5 },
        BE: { lat: 50.8, lng: 4.4 },
        BR: { lat: -14.0, lng: -51.0 },
        BG: { lat: 42.7, lng: 25.5 },
        CA: { lat: 56.0, lng: -106.0 },
        CL: { lat: -35.0, lng: -71.0 },
        CN: { lat: 35.0, lng: 105.0 },
        CO: { lat: 4.0, lng: -72.0 },
        HR: { lat: 45.1, lng: 15.2 },
        CY: { lat: 35.1, lng: 33.4 },
        CZ: { lat: 49.8, lng: 15.5 },
        DK: { lat: 56.0, lng: 9.5 },
        EG: { lat: 26.8, lng: 30.8 },
        EE: { lat: 58.6, lng: 25.0 },
        FI: { lat: 64.0, lng: 26.0 },
        FR: { lat: 46.2, lng: 2.2 },
        DE: { lat: 51.2, lng: 10.5 },
        GR: { lat: 39.1, lng: 21.8 },
        HK: { lat: 22.3, lng: 114.2 },
        HU: { lat: 47.2, lng: 19.5 },
        IS: { lat: 65.0, lng: -19.0 },
        ID: { lat: -5.0, lng: 120.0 },
        IE: { lat: 53.4, lng: -8.2 },
        IL: { lat: 31.0, lng: 34.8 },
        IT: { lat: 41.9, lng: 12.6 },
        JP: { lat: 36.2, lng: 138.3 },
        LV: { lat: 56.9, lng: 24.1 },
        LB: { lat: 33.9, lng: 35.9 },
        LT: { lat: 55.2, lng: 24.0 },
        LU: { lat: 49.8, lng: 6.1 },
        MT: { lat: 35.9, lng: 14.5 },
        MX: { lat: 23.6, lng: -102.5 },
        ME: { lat: 42.7, lng: 19.4 },
        NL: { lat: 52.1, lng: 5.3 },
        NO: { lat: 60.5, lng: 8.5 },
        OM: { lat: 21.5, lng: 56.0 },
        PE: { lat: -10.0, lng: -76.0 },
        PH: { lat: 12.9, lng: 121.8 },
        PL: { lat: 51.9, lng: 19.1 },
        PT: { lat: 39.4, lng: -8.2 },
        PR: { lat: 18.2, lng: -66.5 },
        QA: { lat: 25.3, lng: 51.2 },
        RO: { lat: 45.9, lng: 25.0 },
        RU: { lat: 61.5, lng: 105.0 },
        SA: { lat: 24.0, lng: 45.0 },
        SG: { lat: 1.4, lng: 103.8 },
        SK: { lat: 48.7, lng: 19.7 },
        SI: { lat: 46.2, lng: 14.8 },
        KR: { lat: 35.9, lng: 127.8 },
        ES: { lat: 40.5, lng: -3.7 },
        SE: { lat: 60.1, lng: 18.6 },
        CH: { lat: 46.8, lng: 8.2 },
        TH: { lat: 15.9, lng: 101.0 },
        TW: { lat: 23.5, lng: 121.0 },
        TR: { lat: 39.0, lng: 35.2 },
        AE: { lat: 24.0, lng: 54.0 },
        GB: { lat: 55.4, lng: -3.4 },
        VN: { lat: 14.1, lng: 108.3 },
        GT: { lat: 15.8, lng: -90.2 },
        IN: { lat: 20.6, lng: 78.9 },
        JO: { lat: 30.6, lng: 36.2 },
        KZ: { lat: 48.0, lng: 67.0 },
        KW: { lat: 29.3, lng: 47.5 },
        MY: { lat: 4.2, lng: 101.9 },
        MA: { lat: 32.0, lng: -5.0 },
        NZ: { lat: -41.0, lng: 174.9 },
        NG: { lat: 9.1, lng: 8.7 },
        PK: { lat: 30.4, lng: 69.3 },
        ZA: { lat: -29.0, lng: 24.0 },
        UA: { lat: 48.4, lng: 31.2 },
        BD: { lat: 23.7, lng: 90.4 },
        CR: { lat: 10.0, lng: -84.0 },
        EC: { lat: -1.8, lng: -78.2 },
        KE: { lat: -0.0, lng: 37.9 },
        RS: { lat: 44.0, lng: 21.0 },
    };

    // Convert lat/lng to x/y percentages (simple equirectangular)
    function toXY(lat, lng) {
        const x = ((lng + 180) / 360) * 100;
        const y = ((90 - lat) / 180) * 100;
        return { x, y };
    }

    // Build a set of available country codes for quick lookup
    const availableCodes = new Set(COUNTRIES.map(c => c.code));
    const wipCodes = new Set(COUNTRIES.filter(c => c.wip).map(c => c.code));

    // Create dots for each country
    COUNTRIES.forEach(c => {
        const pos = COUNTRY_POSITIONS[c.code];
        if (!pos) return;

        const { x, y } = toXY(pos.lat, pos.lng);
        const dot = document.createElement("button");
        dot.className = "map-dot" + (c.wip ? " map-dot-wip" : "");
        dot.style.left = x + "%";
        dot.style.top = y + "%";
        dot.dataset.code = c.code;
        dot.dataset.name = c.name;
        dot.setAttribute("aria-label", c.name);

        dot.addEventListener("mouseenter", (e) => {
            tooltip.textContent = c.name;
            tooltip.classList.remove("hidden");
            const rect = mapSvgWrapper.getBoundingClientRect();
            tooltip.style.left = (e.clientX - rect.left + 10) + "px";
            tooltip.style.top = (e.clientY - rect.top - 28) + "px";
        });
        dot.addEventListener("mouseleave", () => {
            tooltip.classList.add("hidden");
        });
        dot.addEventListener("click", () => {
            const country = COUNTRIES.find(co => co.code === c.code);
            if (country) openDetail(country, dot);
        });

        mapSvgWrapper.appendChild(dot);
    });

    mapSvgWrapper.appendChild(tooltip);
    mapContainer.appendChild(mapSvgWrapper);
    countryMap.appendChild(mapContainer);
}

// ── Display mode switching ────────────────────────────────────────────

function setDisplayMode(mode) {
    currentDisplayMode = mode;

    // Toggle button states
    [displayAllBtn, displayRegionsBtn, displayMapBtn].forEach(btn => {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
    });
    const activeBtn = mode === "all" ? displayAllBtn : mode === "regions" ? displayRegionsBtn : displayMapBtn;
    activeBtn.classList.add("active");
    activeBtn.setAttribute("aria-pressed", "true");

    // Toggle containers
    countryGrid.classList.toggle("hidden", mode !== "all");
    countryRegions.classList.toggle("hidden", mode !== "regions");
    countryMap.classList.toggle("hidden", mode !== "map");

    // Lazy-build the map
    if (mode === "map") buildMapView();

    // Re-apply search filter
    applyFilter();
}

displayAllBtn.addEventListener("click", () => setDisplayMode("all"));
displayRegionsBtn.addEventListener("click", () => setDisplayMode("regions"));
displayMapBtn.addEventListener("click", () => setDisplayMode("map"));

// ── Country filter ────────────────────────────────────────────────────

function applyFilter() {
    const q = countrySearch.value.trim().toLowerCase();
    let visible = 0;

    if (currentDisplayMode === "all") {
        countryGrid.querySelectorAll(".country-flag-card").forEach(btn => {
            const name = btn.querySelector(".flag-label").textContent.toLowerCase();
            const show = !q || name.includes(q);
            btn.classList.toggle("hidden", !show);
            if (show) visible++;
        });
    } else if (currentDisplayMode === "regions") {
        countryRegions.querySelectorAll(".region-group").forEach(group => {
            let groupVisible = 0;
            group.querySelectorAll(".country-flag-card").forEach(btn => {
                const name = btn.querySelector(".flag-label").textContent.toLowerCase();
                const show = !q || name.includes(q);
                btn.classList.toggle("hidden", !show);
                if (show) groupVisible++;
            });
            group.classList.toggle("hidden", groupVisible === 0);
            // Update count badge
            const countBadge = group.querySelector(".region-count");
            if (countBadge) {
                countBadge.textContent = q ? groupVisible : COUNTRIES.filter(c => REGION_MAP[c.code] === group.dataset.region).length;
            }
            visible += groupVisible;
        });
    } else if (currentDisplayMode === "map") {
        countryMap.querySelectorAll(".map-dot").forEach(dot => {
            const name = dot.dataset.name.toLowerCase();
            const show = !q || name.includes(q);
            dot.classList.toggle("hidden", !show);
            if (show) visible++;
        });
    }

    noResults.classList.toggle("hidden", visible > 0);
}

countrySearch.addEventListener("input", applyFilter);

// ── Detail panel ──────────────────────────────────────────────────────

function openDetail(country, activeBtn) {
    countryGrid.querySelectorAll(".country-flag-card").forEach(b => b.classList.remove("active"));
    activeBtn.classList.add("active");

    detailFlag.className = `fi fi-${country.code.toLowerCase()} resource-flag`;
    detailName.textContent = country.name;

    // For EU/EEA countries, inject EMA Centralised Procedure link into the
    // Market Authorization section (or prepend a new section if none exists).
    let sections = country.sections;
    if (country.ema) {
        const idx = sections.findIndex(s => s.id === "marketing");
        const alreadyHasEma = idx >= 0 && sections[idx].links.some(l => l.url.includes("ema.europa.eu"));
        if (!alreadyHasEma) {
            if (idx >= 0) {
                sections = sections.map((s, i) =>
                    i === idx ? { ...s, links: [...s.links, EMA_LINK] } : s
                );
            } else {
                sections = [{ id: "marketing", title: "Market Authorization", links: [EMA_LINK] }, ...sections];
            }
        }
    }

    let html = "";

    if (country.wip) {
        html += `
            <div class="resource-wip-notice">
                <span>⚠</span>
                <span><strong>Work in progress</strong> — This country page contains initial data only. Links and coverage will be expanded in future updates.</span>
            </div>
        `;
    }

    if (sections.length === 0 && !country.notes && !country.tips) {
        html += `<p class="resource-empty">No resources listed for this country yet.</p>`;
    }

    html += sections.map(s => {
        const hasContent = s.body || (s.links && s.links.length > 0);
        if (!hasContent) return "";
        return `
            <div class="resource-section">
                <h3 class="resource-section-title">${esc(s.title)}</h3>
                ${s.body ? `<p class="resource-section-body">${esc(s.body)}</p>` : ""}
                ${s.links && s.links.length > 0 ? `
                    <ul class="resource-links">
                        ${s.links.map(l => `
                            <li>
                                <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} &rarr;</a>
                            </li>
                        `).join("")}
                    </ul>
                ` : ""}
            </div>
        `;
    }).join("");

    if (country.notes) {
        html += `
            <div class="resource-callout resource-callout--note">
                <span class="resource-callout__label">Note</span>
                <p>${esc(country.notes)}</p>
            </div>
        `;
    }

    if (country.tipsHtml || country.tips) {
        // tipsHtml: pre-formatted HTML for rich structured content (our own data, safe to inject)
        // tips:     plain text split on \n into paragraphs
        const tipsContent = country.tipsHtml
            ? country.tipsHtml
            : country.tips
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => `<p>${esc(line)}</p>`)
                .join("");
        html += `
            <div class="resource-callout resource-callout--tip">
                <span class="resource-callout__label">Research Tips</span>
                ${tipsContent}
            </div>
        `;
    }

    if (country.drugExample) {
        const ex = country.drugExample;
        html += `
            <div class="resource-callout resource-callout--example">
                <span class="resource-callout__label">Worked Example</span>
                <div class="drug-example-header">
                    <span class="drug-example-drug">${esc(ex.drug)} <small>(${esc(ex.inn)}${ex.localName ? ` / ${esc(ex.localName)}` : ""})</small></span>
                </div>
                <p class="drug-example-indication">Indication: ${esc(ex.indication)}</p>
                <ol class="drug-example-timeline">
                    ${ex.steps.map((step, i) => `
                        <li class="drug-example-step">
                            <span class="drug-example-marker">${i + 1}</span>
                            <div class="drug-example-step-content">
                                <div class="drug-example-step-title">${esc(step.title)}</div>
                                <div class="drug-example-step-detail">${step.detail}${step.links && step.links.length > 0 ? "<br>" + step.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} &rarr;</a>`).join(" &middot; ") : ""}</div>
                                <div class="drug-example-step-meta">${esc(step.date)}</div>
                            </div>
                        </li>
                    `).join("")}
                </ol>
                ${ex.takeaway ? `<div class="drug-example-takeaway"><strong>Key takeaway:</strong> ${ex.takeaway}</div>` : ""}
            </div>
        `;
    }

    detailSections.innerHTML = html;
    resourceDetail.classList.remove("hidden");
    resourceDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

detailClose.addEventListener("click", () => {
    resourceDetail.classList.add("hidden");
    countryGrid.querySelectorAll(".country-flag-card").forEach(b => b.classList.remove("active"));
});
