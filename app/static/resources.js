/**
 * Global Secondary Resources module — Frontend logic.
 *
 * Renders a grid of country cards; clicking one expands a detail panel
 * with links and descriptions for marketing approval, HTA/reimbursement,
 * and patient access resources.
 *
 * Depends on shared.js for: esc
 */

// ── Country data ──────────────────────────────────────────────────────

const COUNTRIES = [
    {
        code: "DE",
        name: "Germany",
        flag: "\uD83C\uDDE9\uD83C\uDDEA",  // 🇩🇪
        sections: [
            {
                id: "marketing",
                title: "Marketing Authorisation",
                body: "Most new medicines in Germany are authorised via the EMA centralised procedure. National authorisations are handled by BfArM (small molecules) or PEI (biologics, vaccines). The European Commission grants the final marketing authorisation for centrally authorised products.",
                links: [
                    { label: "BfArM (Federal Institute for Drugs and Medical Devices)", url: "https://www.bfarm.de/EN" },
                    { label: "PEI (Paul Ehrlich Institute)", url: "https://www.pei.de/EN" },
                    { label: "EMA — Centralised procedure", url: "https://www.ema.europa.eu/en/human-regulatory-overview/marketing-authorisation/centralised-procedure" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "Germany operates the AMNOG (Arzneimittelmarktneuordnungsgesetz) framework since 2011. Upon launch, manufacturers submit a benefit dossier to G-BA. IQWiG evaluates the dossier and G-BA issues an added benefit (Zusatznutzen) decision. This determines the basis for price negotiations with GKV-Spitzenverband.",
                links: [
                    { label: "G-BA (Federal Joint Committee)", url: "https://www.g-ba.de/english" },
                    { label: "IQWiG (Institute for Quality and Efficiency in Health Care)", url: "https://www.iqwig.de/en" },
                    { label: "AMNOG information portal", url: "https://www.g-ba.de/themen/arzneimittel/arzneimittel-richtlinie-anlagen/nutzenbewertung-35a" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "Products are available to patients at the manufacturer's list price immediately after launch (free pricing for 12 months). After G-BA assessment and price negotiation, a reimbursement amount (Erstattungsbetrag) is set retrospectively. Products with 'no added benefit' are reimbursed at the level of the appropriate comparator therapy (ATC reference price).",
                links: [
                    { label: "GKV-Spitzenverband", url: "https://www.gkv-spitzenverband.de/english/english.jsp" },
                    { label: "LAUER-TAXE (drug pricing database)", url: "https://www.lauer-fischer.de" },
                ],
            },
        ],
    },
    {
        code: "FR",
        name: "France",
        flag: "\uD83C\uDDEB\uD83C\uDDF7",  // 🇫🇷
        sections: [
            {
                id: "marketing",
                title: "Marketing Authorisation",
                body: "France participates in the EMA centralised procedure for most new medicines. National authorisations and mutual recognition procedures are managed by ANSM (Agence nationale de sécurité du médicament et des produits de santé).",
                links: [
                    { label: "ANSM (National Medicines Agency)", url: "https://ansm.sante.fr/en" },
                    { label: "EMA — Centralised procedure", url: "https://www.ema.europa.eu/en/human-regulatory-overview/marketing-authorisation/centralised-procedure" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "HTA in France is conducted by HAS (Haute Autorité de Santé) through the Commission de la Transparence (CT). The CT evaluates two criteria: SMR (Service Médical Rendu — clinical benefit) and ASMR (Amélioration du SMR — improvement over comparator, rated I to V). SMR drives listing decisions; ASMR determines price premiums.",
                links: [
                    { label: "HAS (Haute Autorité de Santé)", url: "https://www.has-sante.fr/jcms/c_5443/en/has-haute-autorite-de-sante" },
                    { label: "Commission de la Transparence opinions", url: "https://www.has-sante.fr/jcms/c_452455/en/transparency-committee" },
                    { label: "BDPM (Public Medicines Database)", url: "https://base-donnees-publique.medicaments.gouv.fr" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "Reimbursement listing and price are negotiated with the CEPS (Comité Économique des Produits de Santé) based on the ASMR rating. Early access (Accès Précoce) is available for innovative products pending full HTA, managed by HAS. The CEPS publishes the Journal Officiel prices.",
                links: [
                    { label: "CEPS (Economic Committee for Health Products)", url: "https://solidarites-sante.gouv.fr/ministere/organisation/directions/article/ceps-comite-economique-des-produits-de-sante" },
                    { label: "HAS — Early Access (Accès Précoce)", url: "https://www.has-sante.fr/jcms/p_3269698/en/acces-precoce" },
                ],
            },
        ],
    },
    {
        code: "GB",
        name: "United Kingdom",
        flag: "\uD83C\uDDEC\uD83C\uDDE7",  // 🇬🇧
        sections: [
            {
                id: "marketing",
                title: "Marketing Authorisation",
                body: "Since Brexit, the UK operates its own regulatory pathway via the MHRA (Medicines and Healthcare products Regulatory Agency). MHRA offers several routes: the UK national procedure, reliance on EMA decisions (Unfettered Access for Northern Ireland), and international recognition procedures. Great Britain and Northern Ireland have separate regulatory considerations.",
                links: [
                    { label: "MHRA (Medicines and Healthcare products Regulatory Agency)", url: "https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency" },
                    { label: "MHRA — Apply for a licence", url: "https://www.gov.uk/guidance/apply-for-a-licence-to-market-a-medicine-in-the-uk" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "NICE (National Institute for Health and Care Excellence) conducts Technology Appraisals (TA) and Highly Specialised Technology (HST) reviews. Outcomes are: Recommended, Optimised (with restrictions), Only in Research, Not Recommended, or Terminated. NICE also runs the Cancer Drugs Fund (CDF) for managed access. In Scotland, SMC (Scottish Medicines Consortium) conducts separate assessments.",
                links: [
                    { label: "NICE — Technology Appraisals", url: "https://www.nice.org.uk/about/what-we-do/our-programmes/nice-guidance/nice-technology-appraisal-guidance" },
                    { label: "NICE — Cancer Drugs Fund", url: "https://www.nice.org.uk/about/what-we-do/our-programmes/nice-guidance/nice-technology-appraisal-guidance/cancer-drugs-fund" },
                    { label: "SMC (Scottish Medicines Consortium)", url: "https://www.scottishmedicines.org.uk" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "NHS England negotiates commercial agreements following NICE guidance. The Voluntary Scheme for Branded Medicines Pricing and Access (VPAS) governs branded medicine pricing. Innovative Licensing and Access Pathway (ILAP) provides early parallel scientific advice between MHRA and NICE.",
                links: [
                    { label: "NHS England — Commercial Framework", url: "https://www.england.nhs.uk/medicines-2/commercial-medicines" },
                    { label: "VPAS (Voluntary Scheme)", url: "https://www.gov.uk/government/collections/voluntary-scheme-for-branded-medicines-pricing-and-access-vpas" },
                    { label: "ILAP (Innovative Licensing and Access Pathway)", url: "https://www.gov.uk/guidance/innovative-licensing-and-access-pathway" },
                ],
            },
        ],
    },
    {
        code: "ES",
        name: "Spain",
        flag: "\uD83C\uDDEA\uD83C\uDDF8",  // 🇪🇸
        sections: [
            {
                id: "marketing",
                title: "Marketing Authorisation",
                body: "Spain participates in the EMA centralised procedure. National and mutual recognition/decentralised procedures are managed by AEMPS (Agencia Española de Medicamentos y Productos Sanitarios), which operates under the Ministry of Health.",
                links: [
                    { label: "AEMPS (Spanish Agency for Medicines and Medical Devices)", url: "https://www.aemps.gob.es/en" },
                    { label: "AEMPS — Authorisation register (CIMA)", url: "https://cima.aemps.es/cima/publico/home.html" },
                ],
            },
            {
                id: "hta",
                title: "HTA & Reimbursement",
                body: "Spain uses a positioning report system called IPT (Informe de Posicionamiento Terapéutico), jointly produced by AEMPS and regional health agencies under the CIPM (Interministerial Commission on Drug Prices). IPTs classify therapeutic positioning as Favorable, Conditional, or Unfavorable. AETSA and regional HTAs may also produce assessments.",
                links: [
                    { label: "AEMPS — IPT reports", url: "https://www.aemps.gob.es/medicamentosUsoHumano/informesPublicos/home.htm" },
                    { label: "RedETS (Spanish HTA Network)", url: "https://redetsa.es" },
                    { label: "CIPM — Drug pricing commission", url: "https://www.mscbs.gob.es/profesionales/farmacia/cipm.htm" },
                ],
            },
            {
                id: "access",
                title: "Access & Pricing",
                body: "Reimbursement and pricing decisions in Spain are centralised at the national level via CIPM, with regional co-payment systems. Autonomous communities may apply additional regional restrictions. Spain offers an Early Access programme (Uso Compasivo / Acceso Anticipado) for patients with unmet needs prior to marketing authorisation.",
                links: [
                    { label: "Ministry of Health — Reimbursement", url: "https://www.sanidad.gob.es/profesionales/farmacia/home.htm" },
                    { label: "AEMPS — Compassionate use (Uso Compasivo)", url: "https://www.aemps.gob.es/medicamentosUsoHumano/usoCompasivo/home.htm" },
                ],
            },
        ],
    },
];

// ── DOM Elements ──────────────────────────────────────────────────────

const countryGrid = document.getElementById("country-grid");
const resourceDetail = document.getElementById("resource-detail");
const detailFlag = document.getElementById("detail-flag");
const detailCountryName = document.getElementById("detail-country-name");
const detailSections = document.getElementById("detail-sections");
const detailClose = document.getElementById("detail-close");

// ── Render country grid ───────────────────────────────────────────────

countryGrid.innerHTML = COUNTRIES.map(c => `
    <button class="country-flag-card" data-code="${esc(c.code)}" aria-label="${esc(c.name)}">
        <span class="flag-icon">${c.flag}</span>
        <span class="flag-label">${esc(c.name)}</span>
    </button>
`).join("");

countryGrid.querySelectorAll(".country-flag-card").forEach(btn => {
    btn.addEventListener("click", () => {
        const code = btn.dataset.code;
        const country = COUNTRIES.find(c => c.code === code);
        if (country) openDetail(country, btn);
    });
});

// ── Detail panel ──────────────────────────────────────────────────────

function openDetail(country, activeBtn) {
    // Update active state on grid
    countryGrid.querySelectorAll(".country-flag-card").forEach(b => b.classList.remove("active"));
    activeBtn.classList.add("active");

    detailFlag.textContent = country.flag;
    detailCountryName.textContent = country.name;

    detailSections.innerHTML = country.sections.map(s => `
        <div class="resource-section">
            <h3 class="resource-section-title">${esc(s.title)}</h3>
            <p class="resource-section-body">${esc(s.body)}</p>
            ${s.links.length > 0 ? `
                <ul class="resource-links">
                    ${s.links.map(l => `
                        <li>
                            <a href="${esc(l.url)}" target="_blank" rel="noopener">
                                ${esc(l.label)} &rarr;
                            </a>
                        </li>
                    `).join("")}
                </ul>
            ` : ""}
        </div>
    `).join("");

    resourceDetail.classList.remove("hidden");
    resourceDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

detailClose.addEventListener("click", () => {
    resourceDetail.classList.add("hidden");
    countryGrid.querySelectorAll(".country-flag-card").forEach(b => b.classList.remove("active"));
});
