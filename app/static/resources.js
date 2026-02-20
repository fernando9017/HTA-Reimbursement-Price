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
        sections: [],
        notes: "No resources currently listed.",
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
                links: [{ label: "NHIF — National Health Insurance Medicine List", url: "https://www.nhif.bg/bg/medicine_food/medical-list/2023" }],
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
                links: [{ label: "HALMED — Drug Database", url: "https://www.halmed.hr/Lijekovi/Baza-lijekova/" }],
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
                title: "Market Authorization, Reimbursement & Pricing",
                links: [{ label: "MedicinPriser", url: "https://www.medicinpriser.dk/Default.aspx" }],
            },
        ],
    },
    {
        code: "EG",
        name: "Egypt",
        flag: "🇪🇬",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "EDA — Drug Search", url: "http://196.46.22.218/edasearch/SearchRegDrugs.ASPX" }],
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
                links: [{ label: "Raviminfo — Reimbursed Drugs and Prices", url: "http://www.raviminfo.ee/apthkiri.php" }],
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
                    { label: "CEPS (Economic Committee for Health Products)", url: "https://solidarites-sante.gouv.fr/ministere/organisation/directions/article/ceps-comite-economique-des-produits-de-sante" },
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
    <li>After a positive CT opinion (SMR ≥ Faible), the product enters price negotiation with <a href="https://solidarites-sante.gouv.fr/ministere/organisation/directions/article/ceps-comite-economique-des-produits-de-sante" target="_blank" rel="noopener">CEPS</a></li>
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
                links: [{ label: "NEAK — IRP Reimbursed Drugs", url: "http://neak.gov.hu/felso_menu/szakmai_oldalak/gyogyszer_segedeszkoz_gyogyfurdo_tamogatas/egeszsegugyi_vallalkozasoknak/gyartok_forgalomba_hozok/dipc.html" }],
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
                links: [{ label: "Insurance Information", url: "https://call.gov.il/product-page/1004199" }],
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
                links: [{ label: "VLK — Price Search (Compensatory Medicines)", url: "http://kainynas.vlk.lt/idrug-public-app/search.0" }],
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
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [
                    { label: "Medicijnkosten.nl (drug costs/prices)", url: "https://www.medicijnkosten.nl/" },
                    { label: "GVS — Geneesmiddelenvergoedingssysteem (reimbursement list)", url: "https://www.zorginstituutnederland.nl/over-ons/werkwijzen-en-procedures/adviseren-over-en-verduidelijken-van-het-basispakket-aan-zorg/geneesmiddelen/geneesmiddelenvergoedingssysteem-gvs" },
                ],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [
                    { label: "Zorginstituut Nederland — Assessments & Advice", url: "https://www.zorginstituutnederland.nl/" },
                    { label: "Farmacotherapeutisch Kompas (clinical drug information)", url: "https://www.farmacotherapeutischkompas.nl/" },
                ],
            },
        ],
        tips: `The GVS (Geneesmiddelenvergoedingssysteem) is the Dutch reimbursement system. Drugs are placed in Annex 1A (reference pricing clusters) or Annex 1B (no cluster, individually assessed). Expensive inpatient drugs may be funded via the Sluisgeneesmiddelen (lock) procedure — check Zorginstituut for lock assessments.\n\nMedicijnkosten.nl shows current prices including the GVS reimbursement limit (vergoedingslimiet). If the drug price exceeds the limit, patients pay the difference.\n\nThe Farmacotherapeutisch Kompas is the standard clinical drug reference used by Dutch prescribers — useful for understanding local treatment guidelines.`,
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
                    { label: "CCHI — Insurance Drug Formulary", url: "https://chi.gov.sa/AboutCCHI/CCHIprograms/Pages/IDF.aspx" },
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
                links: [{ label: "CBZ — Central Drug Database", url: "http://www.cbz.si/cbz/bazazdr2.nsf/Search/$searchForm?SearchView" }],
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
                    { label: "MFDS — Drug Search (의약품 검색)", url: "http://drug.mfds.go.kr/html/index.jsp" },
                ],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "HIRA — Insurance Coverage Criteria", url: "https://www.hira.or.kr/rc/insu/insuadtcrtr/InsuAdtCrtrList.do?pgmid=HIRAA030069000400" },
                    { label: "HIRA — Reimbursed Drug Price List (Excel)", url: "http://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA030014050000" },
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
    <li>Go to the <a href="http://drug.mfds.go.kr/html/index.jsp" target="_blank" rel="noopener">MFDS Drug Search</a> and search under the tab <strong>의약품(제품명)검색</strong> — a Korean speaker may be needed for the interface</li>
    <li>Alternatively, search <a href="https://nedrug.mfds.go.kr/index" target="_blank" rel="noopener">nedrug.mfds.go.kr</a> — this portal has some English search capability</li>
    <li>The approval document (허가사항) includes approved indications, dosage, and approval date</li>
</ol>
<p class="tips-note"><strong>Language note:</strong> The MFDS interface is primarily in Korean. Google Translate works for navigation, but drug names may not translate accurately. Try searching by INN in English or Korean (약물명).</p>

<h4 class="tips-heading">HIRA Assessment &amp; Reimbursement</h4>
<p>South Korea uses a positive list system — only drugs listed by HIRA (Health Insurance Review and Assessment Service) are reimbursed under the National Health Insurance (NHI).</p>
<ol>
    <li>On the <a href="https://www.hira.or.kr/rc/insu/insuadtcrtr/InsuAdtCrtrList.do?pgmid=HIRAA030069000400" target="_blank" rel="noopener">HIRA Insurance Coverage Criteria page</a>, select <strong>제품명</strong> from the search dropdown and type the INN in English</li>
    <li>If the product has been reviewed, you will see an Assessment Outcome (평가 결과) — click the PDF icon to download the assessment report (enable pop-ups in your browser)</li>
    <li>The assessment report includes: clinical evidence summary, cost-effectiveness analysis, budget impact, and the HIRA Drug Reimbursement Evaluation Committee (DREC) recommendation</li>
    <li>Download the full Excel database of all reimbursed drug prices from <a href="http://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA030014050000" target="_blank" rel="noopener">HIRA's price list page</a> — the top row is the latest version. Drug names are searchable in Korean by INN or brand name</li>
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
<p class="tips-note"><strong>Calendar note:</strong> Taiwan uses the Minguo calendar (e.g., 2020 = Minguo year 109). <a href="https://www.minguo.info/" target="_blank" rel="noopener">Convert Minguo to Gregorian here</a>.</p>

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
    <li>Prices are in New Taiwan Dollars (NTD). The date of the most recent price adjustment is shown in Minguo calendar — <a href="https://www.minguo.info/" target="_blank" rel="noopener">convert here</a></li>
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
                    { label: "DAMAN — Drug Formulary (SEHA / DAMAN)", url: "https://www.damanhealth.ae/en/join-our-provider-network/pharmaceutical-benefits/ddf" },
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
