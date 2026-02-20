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
                body: "The ANPP (Agence Nationale des Produits Pharmaceutiques), established in 2018, handles marketing authorizations. Price agreement is required before MA is granted. The Nomenclature Nationale lists all registered medicines with prices and reimbursement status.",
                links: [
                    { label: "ANPP (National Agency for Pharmaceutical Products)", url: "https://anpp.dz/en/" },
                    { label: "MIPH — Nomenclature Nationale (registered drugs with prices)", url: "https://www.miph.gov.dz/fr/nomenclature-nationale-des-produits-pharmaceutiques/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing",
                body: "The CEPS (Comité Économique Intersectoriel des Médicaments) sets drug prices using External Reference Pricing based on the lowest ex-factory price from 8 reference countries (Belgium, France, Greece, Morocco, Spain, Tunisia, Turkey, UK) plus the country of origin.",
                links: [
                    { label: "MIPH (Ministry of Pharmaceutical Industry)", url: "https://www.miph.gov.dz/fr/" },
                    { label: "MIPH — Regulatory Downloads", url: "https://www.miph.gov.dz/fr/telechargements/" },
                    { label: "JORADP (Official Gazette — pricing decisions)", url: "https://www.joradp.dz/" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                body: "CNAS (Caisse Nationale des Assurances Sociales) covers ~85% of the population. Reimbursement is 100% for chronic disease medicines and 80% for others. A Tarif de Référence (reference tariff) aligned with the cheapest generic determines the reimbursement basis. The Chifa electronic card enables third-party payment at pharmacies.",
                links: [
                    { label: "CNAS (National Social Insurance Fund)", url: "https://cnas.dz/en/the-presentation-of-cnas/" },
                    { label: "MTESS (Ministry of Labour & Social Security)", url: "https://www.mtess.gov.dz/en/" },
                    { label: "WHO — Reimbursable Medicines List 2023", url: "https://www.who.int/publications/m/item/algeria--la-liste-des-m-dicaments-remboursables-par-la-s-curit--sociale-2023-(french)" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Ministry of Health", url: "http://www.sante.gov.dz/" },
                    { label: "PharmNet — Algerian Drug Encyclopedia", url: "https://pharmnet-dz.com/alphabet.aspx" },
                    { label: "CLEISS — Social Security System Overview", url: "https://www.cleiss.fr/docs/regimes/regime_algerie_salaries.html" },
                ],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Market Authorization &amp; Drug Registry</h4>
<ol>
    <li>Download the <a href="https://www.miph.gov.dz/fr/nomenclature-nationale-des-produits-pharmaceutiques/" target="_blank" rel="noopener">Nomenclature Nationale</a> (Excel file) from the Ministry of Pharmaceutical Industry — it contains every registered medicine with registration number, dosage, laboratory, price, and reimbursement status</li>
    <li>The <a href="https://anpp.dz/en/" target="_blank" rel="noopener">ANPP</a> website provides information on registration procedures — note that price agreement is required <strong>before</strong> marketing authorization is granted</li>
    <li>For an unofficial but searchable drug database, try <a href="https://pharmnet-dz.com/alphabet.aspx" target="_blank" rel="noopener">PharmNet</a> (4,600+ medicines across 171 pharmacological classes)</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> All regulatory documents are in French (with Arabic versions). Search in French for best results — key terms: "nomenclature des médicaments," "tarif de référence," "liste des médicaments remboursables."</p>

<h4 class="tips-heading">Pricing</h4>
<ol>
    <li>Algeria uses <strong>External Reference Pricing (ERP)</strong> — the ex-factory price is set at the <strong>lowest</strong> price among 8 reference countries: Belgium, France, Greece, Morocco, Spain, Tunisia, Turkey, and the UK, plus the country of origin</li>
    <li>Pricing decisions are published in the <a href="https://www.joradp.dz/" target="_blank" rel="noopener">JORADP (Journal Officiel)</a> — use third-party search tools like <a href="https://joradp.org/" target="_blank" rel="noopener">joradp.org</a> to search by keyword</li>
    <li>The <a href="https://www.miph.gov.dz/fr/telechargements/" target="_blank" rel="noopener">MIPH downloads page</a> has key regulatory texts including the December 2020 ministerial order that established the current CEPS pricing procedure</li>
</ol>
<p class="tips-note"><strong>Tip:</strong> Generic prices are set using Internal Reference Pricing. Biosimilar prices must be 10–30% lower than the reference biologic (depending on the price tier).</p>

<h4 class="tips-heading">Reimbursement</h4>
<ol>
    <li>The official reimbursable medicines list is published by the Ministry of Labour (MTESS) — the <a href="https://www.who.int/publications/m/item/algeria--la-liste-des-m-dicaments-remboursables-par-la-s-curit--sociale-2023-(french)" target="_blank" rel="noopener">WHO hosts the 2023 version</a></li>
    <li>Reimbursement rates: <strong>100%</strong> for chronic/NCD medicines, <strong>80%</strong> for all others (20% co-payment)</li>
    <li>The <strong>Tarif de Référence</strong> aligns brand-name drug reimbursement with the cheapest generic on the market — published in the JORADP 3 months before implementation</li>
    <li>The Reimbursement Committee relies heavily on international HTA evidence, especially <strong>France's HAS</strong> (SMR/ASMR opinions), as Algeria has no formal HTA body</li>
</ol>
<p class="tips-note"><strong>Note:</strong> Algeria has no formal HTA agency. A sub-directorate of economic evaluation exists within the MIPH, and the 2020 ministerial order introduced a role for pharmacoeconomic studies in pricing, but systematic HTA is still in early development.</p>
        `,
    },
    {
        code: "AR",
        name: "Argentina",
        flag: "🇦🇷",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "ANMAT", url: "https://www.argentina.gob.ar/anmat" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "Sur — Anexo 5 (Public)", url: "https://www.boletinoficial.gob.ar/detalleAviso/primera/241408/20210303" }],
            },
        ],
        notes: "There are additional funding institutions — please contact someone from the LATAM team.",
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
                links: [{ label: "BASG — Online Suche Arzneispezialitäten", url: "https://aspregister.basg.gv.at/aspregister/faces/aspregister.jspx" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "Sozialversicherung — List of Reimbursed Drugs", url: "https://www.sozialversicherung.at/oeko/views/index.xhtml" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "Sozialversicherung — Drug Prices", url: "https://www.sozialversicherung.at/cdscontent/load?contentid=10008.784743&version=1703680781" }],
            },
        ],
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
                links: [{ label: "AFMPS — Medicines Database", url: "https://basededonneesdesmedicaments.be/usage-humain" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "INAMI/RIZIV — Reimbursable Drugs", url: "https://webappsa.riziv-inami.fgov.be/SSPWebApplicationPublic/fr/Public/ProductSearch" }],
            },
        ],
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
                links: [{ label: "BDA — Drug Register", url: "https://www.bda.bg/bg/%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B8/%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B8-%D0%BD%D0%B0-%D0%BB%D0%B5%D0%BA%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%B8-%D0%BF%D1%80%D0%BE%D0%B4%D1%83%D0%BA%D1%82%D0%B8" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "NHIF — National Health Insurance Medicine List", url: "https://www.nhif.bg/bg/medicine_food/medical-list/2024" }],
            },
        ],
        notes: "EMA centralised procedure is an alternative route to obtain marketing authorisation.",
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
    },
    {
        code: "CL",
        name: "Chile",
        flag: "🇨🇱",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "ISP — Registro Sanitario", url: "https://registrosanitario.ispch.gob.cl/" }],
            },
        ],
    },
    {
        code: "CN",
        name: "China",
        flag: "🇨🇳",
        sections: [
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "EVERSANA — China NRDL Overview (PDF)", url: "https://www.eversana.com/wp-content/uploads/2021/12/WP_4Q21_Pricentric_ChinaNRDLOverview_EVERSANA-3-1.pdf" }],
            },
        ],
        notes: "The National Reimbursement Drug List (NRDL) is not publicly accessible online. The third-party link above provides a useful overview.",
    },
    {
        code: "CO",
        name: "Colombia",
        flag: "🇨🇴",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "INVIMA — Consulta Registro", url: "https://consultaregistro.invima.gov.co/Consultas/consultas/consreg_encabcum.jsp" }],
            },
        ],
        tips: "Use the free VPN from the OPERA browser (select Americas location) to access the INVIMA portal.",
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
                links: [{ label: "HALMED — Drug Database", url: "https://www.halmed.hr/en/Lijekovi/Baza-lijekova/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "HZZO — List of Reimbursed Medicines", url: "https://hzzo.hr/zdravstvena-zastita/lijekovi/objavljene-liste-lijekova" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "HZZO — Right to Use Medicines", url: "https://hzzo.hr/zdravstvena-zastita/lijekovi/pravo-na-koristenje-lijekova" }],
            },
        ],
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
                links: [{ label: "PHS Cyprus — Product Search", url: "https://www.phs.moh.gov.cy/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "MoH — Co-payment Scheme", url: "https://www.moh.gov.cy/moh/phs/phs.nsf/supplplan_en/supplplan_en?opendocument" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "MoH — Price of Medicinal Products", url: "https://www.moh.gov.cy/moh/phs/phs.nsf/pricelist_en/pricelist_en?opendocument" }],
            },
        ],
    },
    {
        code: "CZ",
        name: "Czech Republic",
        flag: "🇨🇿",
        ema: true,
        sections: [
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "SÚKL — Reimbursed Drugs and Prices", url: "https://www.sukl.cz/modules/medication/search.php" }],
            },
        ],
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
<p class="tips-note"><strong>Statistics:</strong> <a href="https://medstat.dk/en" target="_blank" rel="noopener">Medstat.dk</a> provides free, public aggregate data on all medicine sales in Denmark since 1996 (primary care) and 1997 (hospitals), searchable by ATC code, region, age, and sex.</p>
        `,
    },
    {
        code: "EG",
        name: "Egypt",
        flag: "🇪🇬",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "SAHPRA — Registered Health Products", url: "https://www.sahpra.org.za/" }],
            },
        ],
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
                links: [{ label: "Raviminfo — Reimbursed Drugs and Prices", url: "https://raviminfo.ee/apthkiri.php" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Haigekassa — How Reimbursement Works", url: "https://www.haigekassa.ee/inimesele/ravimid" }],
            },
        ],
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
                links: [{ label: "Kela — Drug Search", url: "https://asiointi.kela.fi/laakekys_app/LaakekysApplication/Valmisteet" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "Hila — Reimbursable Medicines List", url: "https://www.hila.fi/luettelot/korvattavat-myyntiluvalliset-laakevalmisteet/" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "Kela — Drug Search (includes pricing)", url: "https://asiointi.kela.fi/laakekys_app/LaakekysApplication/Valmisteet" }],
            },
        ],
        notes: "Kela is not appropriate for reimbursement of oncology drugs or other hospital drugs (retail only). FIMEA is the HTA institution for Finland.",
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
    },
    {
        code: "HK",
        name: "Hong Kong",
        flag: "🇭🇰",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "Drug Office — Department of Health", url: "https://www.drugoffice.gov.hk/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "HA Drug Formulary — Drug Advisory Committee", url: "https://www.ha.org.hk/hadf/en-us/" }],
            },
        ],
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
        tips: "Use the NEAK drug search portal (https://neak.gov.hu/felso_menu/lakossagnak/gyogszerkereso) and make sure to tick the prescribing doctor type — otherwise results may not appear.",
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
                links: [{ label: "IMA — Pricing and Reimbursement", url: "https://www.ima.is/home/pricing-and-reimbursement/" }],
            },
        ],
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
    },
    {
        code: "IE",
        name: "Ireland",
        flag: "🇮🇪",
        ema: true,
        sections: [
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "HSE — List of Reimbursable Items", url: "https://www.hse.ie/eng/staff/pcrs/items/" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "NCPE — Drug Evaluations (HTA)", url: "https://www.ncpe.ie/drugs/" }],
            },
        ],
        notes: "NCPE (National Centre for Pharmacoeconomics) provides the status of drug evaluations in Ireland.",
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
                links: [{ label: "ZVA — DATI Drug Register", url: "https://dati.zva.gov.lv/zalu-registrs/lv" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "VMNVD — National Health Service Compensated Medicines", url: "https://www.vmnvd.gov.lv/lv/kompensejamie-medikamenti" }],
            },
        ],
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
                links: [{ label: "Medicines Authority — Advanced Search", url: "https://medicinesauthority.gov.mt/advanced-search" }],
            },
        ],
    },
    {
        code: "MX",
        name: "Mexico",
        flag: "🇲🇽",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "COFEPRIS — Registro Sanitario", url: "https://tramiteselectronicos02.cofepris.gob.mx/BuscadorPublicoRegistrosSanitarios/BusquedaRegistroSanitario.aspx" }],
            },
        ],
        notes: "Multiple funding institutions cover reimbursement in Mexico — please contact the LATAM team.",
    },
    {
        code: "ME",
        name: "Montenegro",
        flag: "🇲🇪",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "CJNMED — Humani lijekovi register", url: "https://secure.cinmed.me/Portal/faces/registarHumani" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "Fond za zdravstveno osiguranje — Lista ljekova", url: "https://fzocg.me/lista-ljekova/" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "CJNMED — Maximum Price of Medicines", url: "https://secure.cinmed.me/Portal/faces/dinamickeStrane?paramPut=+%3E+Humani+ljekovi+%3E+Maksimalne+cijene+ljekova&paramRender=1&paramS=151" }],
            },
        ],
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
                links: [{ label: "NYE Metoder (New Methods)", url: "https://nyemetoder.no/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "Legemiddelverket — Maximum Price List", url: "https://legemiddelverket.no/english/public-funding-and-pricing/maximum-price" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Legemiddelverket — Single Technology Assessment Reports", url: "https://legemiddelverket.no/english/public-funding-and-pricing/single-technology-assessments-status-and-reports" }],
            },
        ],
    },
    {
        code: "OM",
        name: "Oman",
        flag: "🇴🇲",
        sections: [],
        notes: "No resources currently listed.",
    },
    {
        code: "PE",
        name: "Peru",
        flag: "🇵🇪",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "DIGEMID — Registro Sanitario", url: "https://www.digemid.minsa.gob.pe/rsProductosFarmaceuticos/" }],
            },
        ],
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
    },
    {
        code: "PT",
        name: "Portugal",
        flag: "🇵🇹",
        ema: true,
        sections: [
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "INFARMED — INFOMED", url: "https://extranet.infarmed.pt/INFOMED-fo/index.xhtml" }],
            },
        ],
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
                links: [{ label: "Qatar National Formulary", url: "https://qnf.moph.gov.qa/" }],
            },
        ],
        notes: "The Qatar National Formulary portal has been intermittently unavailable — verify accessibility before use.",
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
                links: [{ label: "SFDA — Saudi Food & Drug Authority Drugs List", url: "https://www.sfda.gov.sa/en/drugs-list" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "CCHI — Insurance Drug Formulary", url: "https://www.chi.gov.sa/en/aboutchi/cchiprograms/Pages/IDF.aspx" },
                ],
            },
        ],
        notes: "Three reimbursement sources exist: CCHI, MoH formulary (last updated 2014), and NGHA. NGHA does not have a public source currently available. Please contact the relevant team for the MoH formulary document.",
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
        notes: "In the list of categorised medicines, 'List B' (lieky, ktoré sú zaradené v zozname kategorizovaných liekov) contains reimbursed medicines.",
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
                links: [{ label: "JAZMP — Medicinal Products Database", url: "https://www.jazmp.si/en/human-medicines/data-on-medicinal-products/medicinal-products-database/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "JAZMP — List of Regulated Prices", url: "https://www.jazmp.si/en/human-medicines/pricing-of-medicinal-products/list-of-regulated-prices/" }],
            },
        ],
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
                links: [{ label: "Läkemedelsverket — Swedish Medical Products", url: "https://www.lakemedelsverket.se/sv/sok-lakemedelsfakta?activeTab=1" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "TLV (Dental and Pharmaceutical Benefits Agency)", url: "https://www.tlv.se/in-english/medicines.html" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Janusinfo (commercially independent drug information)", url: "https://janusinfo.se/" }],
            },
        ],
        notes: "Janusinfo is preferred as a commercially independent drug information source.",
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
    },
    {
        code: "TR",
        name: "Turkey",
        flag: "🇹🇷",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "TITCK — Licensed Product Lists", url: "https://www.titck.gov.tr/dinamikmodul/85" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "TITCK — Drug Prices (download latest XLS, prices in Euros)", url: "https://www.titck.gov.tr/dinamikmodul/100" }],
            },
        ],
    },
    {
        code: "AE",
        name: "United Arab Emirates",
        flag: "🇦🇪",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization & Pricing",
                links: [{ label: "MOHAP — Registered Medical Product Directory", url: "https://mohap.gov.ae/en/services/registered-medical-product-directory" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "DHA — Drug Control (Dubai Health Authority)", url: "https://www.dha.gov.ae/en/HealthRegulationSector/DrugControl" },
                    { label: "DAMAN — Drug Formulary (SEHA / DAMAN)", url: "https://www.damanhealth.ae/healthcare/pharmaceutical-benefits/daman-drug-formulary/" },
                ],
            },
        ],
        notes: "Two main funding sources: DHA (Dubai) and SEHA/DAMAN. Other Emirates may have different arrangements.",
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
    },
];

// ── DOM Elements ──────────────────────────────────────────────────────

const countryGrid    = document.getElementById("country-grid");
const countrySearch  = document.getElementById("country-search");
const noResults      = document.getElementById("country-no-results");
const countryCount   = document.getElementById("country-count");
const resourceDetail = document.getElementById("resource-detail");
const detailFlag     = document.getElementById("detail-flag");
const detailName     = document.getElementById("detail-country-name");
const detailSections = document.getElementById("detail-sections");
const detailClose    = document.getElementById("detail-close");

// ── Initialise ────────────────────────────────────────────────────────

countryCount.textContent = COUNTRIES.length;

// Build all cards once; filter by toggling .hidden
countryGrid.innerHTML = COUNTRIES.map(c => `
    <button class="country-flag-card" data-code="${esc(c.code)}" aria-label="${esc(c.name)}">
        <span class="fi fi-${c.code.toLowerCase()} flag-icon" aria-hidden="true"></span>
        <span class="flag-label">${esc(c.name)}</span>
    </button>
`).join("");

countryGrid.querySelectorAll(".country-flag-card").forEach(btn => {
    btn.addEventListener("click", () => {
        const country = COUNTRIES.find(c => c.code === btn.dataset.code);
        if (country) openDetail(country, btn);
    });
});

// ── Country filter ────────────────────────────────────────────────────

countrySearch.addEventListener("input", () => {
    const q = countrySearch.value.trim().toLowerCase();
    let visible = 0;
    countryGrid.querySelectorAll(".country-flag-card").forEach(btn => {
        const name = btn.querySelector(".flag-label").textContent.toLowerCase();
        const show = !q || name.includes(q);
        btn.classList.toggle("hidden", !show);
        if (show) visible++;
    });
    noResults.classList.toggle("hidden", visible > 0);
});

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

    if (sections.length === 0 && !country.notes && !country.tips) {
        html = `<p class="resource-empty">No resources listed for this country yet.</p>`;
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

    detailSections.innerHTML = html;
    resourceDetail.classList.remove("hidden");
    resourceDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

detailClose.addEventListener("click", () => {
    resourceDetail.classList.add("hidden");
    countryGrid.querySelectorAll(".country-flag-card").forEach(b => b.classList.remove("active"));
});
