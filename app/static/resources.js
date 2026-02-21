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
                links: [{ label: "EDA — Egyptian Drug Authority", url: "https://www.eda.gov.eg/" }],
            },
        ],
        notes: "EDA (Egyptian Drug Authority) replaced CAPA (Central Administration of Pharmaceutical Affairs) in 2020 and handles all drug registrations. Public health insurance reimbursement is managed by HIO (Health Insurance Organisation); coverage is limited and no standalone HTA body exists.",
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
                links: [{ label: "Medicines Authority \u2014 Advanced Search", url: "https://medicinesauthority.gov.mt/advanced-search" }],
            },
        ],
        tipsHtml: `
<h4 class="tips-heading">Small Market &amp; EMA Status</h4>
<ol>
    <li>Malta (~520,000 population) is a small EU market. EMA centrally authorised products are automatically valid in Malta without a separate national application</li>
    <li>Search the <a href="https://medicinesauthority.gov.mt/advanced-search" target="_blank" rel="noopener">Medicines Authority advanced search</a> for nationally authorised products &mdash; the database has an English interface</li>
    <li>Many products authorised in larger EU markets may not have been commercially launched in Malta due to the small market size. Absence from the Medicines Authority database does not necessarily indicate the product is unavailable &mdash; it may be imported or ordered through a compassionate use/special authorisation route</li>
</ol>
<p class="tips-note"><strong>Reimbursement:</strong> The government formulary for publicly funded medicines is administered by the Department of Health. Malta&rsquo;s formulary covers medicines dispensed through government health centres and hospitals. For reimbursement status, contact the Medicines Authority or the Department of Pharmacy at the Ministry for Health.</p>
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
        ${c.wip ? `<span class="wip-badge" title="Work in progress — initial data only">WIP</span>` : ""}
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
