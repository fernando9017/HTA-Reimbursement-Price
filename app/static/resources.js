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
                links: [{ label: "PBAC — HTA Public Summary Documents", url: "https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings/psd/public-summary-documents-by-product" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "PBS — Ex-Manufacturer Price Lists", url: "https://www.pbs.gov.au/pbs/industry/pricing/ex-manufacturer-price" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Trikipedia — Australia", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/Australia.aspx" }],
            },
        ],
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
                links: [{ label: "ANVISA", url: "https://consultas.anvisa.gov.br/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [
                    { label: "RENAME — Relação Nacional de Medicamentos Essenciais", url: "https://www.gov.br/saude/pt-br/composicao/sectics/rename" },
                    { label: "CONITEC — Recomendações", url: "https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/recomendacoes-da-conitec" },
                ],
            },
        ],
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
                links: [{ label: "Health Canada — Drug Product Database", url: "https://health-products.canada.ca/dpd-bdpp/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "CADTH (Canadian Drug Review)", url: "https://www.cadth.ca/" }],
            },
        ],
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
                ],
            },
        ],
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
                links: [{ label: "Israeli Drug Registry", url: "https://israeldrugs.health.gov.il/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "Basket of Health Services (2022)", url: "https://www.gov.il/he/departments/policies/dec1053_2022" }],
            },
            {
                id: "pricing",
                title: "Pricing",
                links: [{ label: "MOH — Drug Price Lists", url: "https://www.gov.il/he/departments/dynamiccollectors/drug-prices?skip=0&drug_price_sub=1" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Insurance Information", url: "https://call.gov.il/product-page/1004199" }],
            },
        ],
    },
    {
        code: "JP",
        name: "Japan",
        flag: "🇯🇵",
        sections: [
            {
                id: "marketing",
                title: "Market Authorization",
                links: [{ label: "PMDA (Pharmaceuticals and Medical Devices Agency)", url: "https://www.pmda.go.jp/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "MHLW — Shingi (includes drug pricing decisions)", url: "https://www.mhlw.go.jp/stf/shingi/indexshingi.html" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Trikipedia — Japan", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/Japan.aspx" }],
            },
        ],
        tips: `Step 1: Google "[brand name] + 医薬品" to find the Japanese product name.\n\nStep 2: On the PMDA site, search "[Japanese brand name] + 承認情報" — the first result gives marketing authorisation details.\n\nStep 3: For reimbursement, go to the MHLW Shingi site and search "[Japanese brand name] + 医薬品の薬価". Locate the document titled 新医薬品一覧表 — this PDF details the pricing mechanism and NHI reimbursement status. Use Google Translate for the PDF; note that molecule name translations can vary.`,
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
                links: [{ label: "CBG-MEB (Medicines Evaluation Board)", url: "https://www.cbg-meb.nl/" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "Medicijnkosten.nl (Healthcare Institute)", url: "https://www.medicijnkosten.nl/" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Zorginstituut Nederland — HTA Reports", url: "https://www.zorginstituutnederland.nl/" }],
            },
        ],
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
                links: [{ label: "MFDS — National Drug Information System", url: "https://nedrug.mfds.go.kr/index" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement",
                links: [{ label: "HIRA — Insurance Coverage Criteria", url: "https://www.hira.or.kr/rc/insu/insuadtcrtr/InsuAdtCrtrList.do?pgmid=HIRAA030069000400" }],
            },
            {
                id: "additional",
                title: "Additional Resources",
                links: [{ label: "Trikipedia — South Korea", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/South%20Korea.aspx" }],
            },
        ],
        tips: `Marketing approval: Go to the MFDS drug search (http://drug.mfds.go.kr/html/index.jsp) and search under the tab "의약품(제품명)검색". A Korean speaker may be needed.\n\nReimbursement: On the HIRA site, select "제품명" from the search dropdown and type the INN in English. If reviewed, you will see an Assessment Outcome (평가 결과) — click the PDF to download the assessment report (enable pop-ups).\n\nAlternatively, download the full Excel database of all reimbursed drugs from HIRA (http://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA030014050000) — the top row is the latest. Drug names are searchable in Korean by INN or brand name.`,
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
                    { label: "Trikipedia — Spain", url: "https://tpius.sharepoint.com/sites/Trikipedia/Country/Spain.aspx" },
                ],
            },
        ],
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
                links: [{ label: "Swissmedic — Lists and Registers", url: "https://www.swissmedic.ch/swissmedic/en/home/services/listen_neu.html" }],
            },
            {
                id: "reimbursement",
                title: "Reimbursement & Pricing",
                links: [{ label: "Spezialitätenliste — Reimbursed Drugs (search by substance)", url: "https://www.spezialitätenliste.ch/ShowPreparations.aspx?searchType=SUBSTANCE" }],
            },
        ],
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
                ],
            },
        ],
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
        <span class="flag-icon">${c.flag}</span>
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

    detailFlag.textContent = country.flag;
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

    if (country.tips) {
        // tips may have \n for paragraphs
        const tipsHtml = country.tips
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => `<p>${esc(line)}</p>`)
            .join("");
        html += `
            <div class="resource-callout resource-callout--tip">
                <span class="resource-callout__label">Research Tips</span>
                ${tipsHtml}
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
