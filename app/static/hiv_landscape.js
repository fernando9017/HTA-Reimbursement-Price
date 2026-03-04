/**
 * Global HIV Landscape module — Frontend logic.
 *
 * Renders a filterable grid of country cards focused on HIV medication
 * access, pricing and reimbursement — with emphasis on Truvada (TDF/FTC)
 * and the transition to DTG-based regimens.
 *
 * Depends on shared.js for: esc
 */

// ── Country HIV landscape data ──────────────────────────────────────

const HIV_COUNTRIES = [
    {
        code: "DZ",
        name: "Algeria",
        flag: "\u{1F1E9}\u{1F1FF}",
        snapshot: {
            prevalence: "<0.1%",
            plhiv: "~11,000",
            artCoverage: "~76%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "TENOF EM (emtricitabine 200 mg / tenofovir disoproxil fumarate 300 mg), the generic equivalent of Truvada, is registered in Algeria by Hetero Labs Limited (India) under registration number 524/13P481/17. A tenofovir-only product (TENOF 300 mg, reg. 524/13P483/17) is also available. Registration is handled by the ANPP (Agence Nationale des Produits Pharmaceutiques). Algeria does not require EMA or FDA prior approval — it has its own national registration pathway.",
                links: [
                    { label: "ANPP — Official Website", url: "https://anpp.dz/en/" },
                    { label: "PharmNet-DZ — TENOF EM listing", url: "https://pharmnet-dz.com/m-6090-tenof-em-200-mg-300mg--equivalent-%C3%A0-245-mg-de-tenofovir-disoproxil-cp-pell-fl-de-30" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: 'TENOF EM is classified as a hospital-only product and has no public retail price (listed as "00 DA" in the Nomenclature Nationale). It is procured centrally by the PCH (Pharmacie Centrale des Hôpitaux) through competitive tendering from generic manufacturers, primarily Indian suppliers. In 2022, Algeria was added to the ViiV Healthcare/MPP licence for dolutegravir (DTG), enabling procurement of the fixed-dose combination TLD (tenofovir + lamivudine + dolutegravir) at reduced prices, expected to lower the national ART bill by ~20%.',
                links: [
                    { label: "PCH (Pharmacie Centrale des Hôpitaux)", url: "https://www.pch.dz/" },
                    { label: "Medicines Patent Pool — Algeria DTG Licence", url: "https://medicinespatentpool.org/news-publications-post/algeria-gains-access-to-mpp-dtg-adult-licence" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Algeria has provided free antiretroviral therapy since 1998, with ~97% of funding from domestic sources. HIV treatment is provided through designated public hospital centres at no cost to patients. CNAS social security covers outpatient medicines at 100% for chronic conditions including HIV/AIDS. The country is transitioning from TDF/FTC-based regimens to DTG-based regimens (TLD); soon, up to 80% of PLHIV will be on DTG-based first-line treatment.",
                links: [
                    { label: "CNAS (National Social Insurance Fund)", url: "https://cnas.dz/en/the-presentation-of-cnas/" },
                    { label: "UNAIDS — Algeria", url: "https://www.unaids.org/en/regionscountries/countries/algeria" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP is not yet widely available in Algeria as a formalised national programme. Given the low HIV prevalence (<0.1%), PrEP rollout has not been prioritised. Some pilot projects and NGO-based distribution exist for key populations, but a structured government PrEP programme is not yet in place.",
                links: [],
            },
        ],
        prepStatus: "limited",
        arvAccess: "free",
        genericName: "TENOF EM",
        manufacturer: "Hetero Labs Limited (India)",
        procurementPrice: "Hospital tender (not published)",
        dtgTransition: "In progress — MPP licence since 2022",
        takeaway: "Algeria provides free ARVs through the public health system since 1998, with centralized procurement by PCH through competitive tendering from generic Indian manufacturers. Access to the MPP DTG licence is driving a transition to TLD-based regimens at lower cost.",
    },
    {
        code: "AR",
        name: "Argentina",
        flag: "\u{1F1E6}\u{1F1F7}",
        snapshot: {
            prevalence: "0.4%",
            plhiv: "~140,000",
            artCoverage: "~72%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada (emtricitabine/tenofovir disoproxil fumarate) is registered in Argentina by Gilead Sciences, regulated by ANMAT (Administración Nacional de Medicamentos, Alimentos y Tecnología Médica). Gilead's patent on TDF+FTC was withdrawn in 2016, enabling local generic production. Generic versions include Remivir (Laboratorio Elea), Trivenz (Richmond — triple combination with efavirenz), and PREVID (Richmond — TAF-based). Hetero Labs Limited also supplies TDF/FTC via the PAHO Strategic Fund.",
                links: [
                    { label: "ANMAT — Official Website", url: "https://www.argentina.gob.ar/anmat" },
                    { label: "ANMAT — Drug Registry Search", url: "https://www.argentina.gob.ar/anmat/medicamentos" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Argentina does not have formal government price controls for medicines, but public-sector procurement is centralized through the Dirección de Sida, ETS, Hepatitis y TBC (DSETHyT) under the Ministry of Health. ARV procurement uses PAHO Strategic Fund pooled procurement, achieving prices significantly below market rates. Truvada generic (TDF/FTC) is procured at approximately USD 3–5 per patient per month through PAHO pooled pricing. The private-sector retail price is substantially higher.",
                links: [
                    { label: "PAHO Strategic Fund — ARV Prices", url: "https://www.paho.org/en/paho-strategic-fund" },
                    { label: "DSETHyT — National HIV Programme", url: "https://www.argentina.gob.ar/salud/vih" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Argentina has provided free ARV treatment since 1998, strengthened by Ley 27,675 (2022) which declares universal, timely, and free access to HIV prevention, diagnosis, and treatment as being in the national public interest. The DSETHyT coordinates the national programme through three subsystems: public hospitals (for uninsured, ~35–40% of population), Obras Sociales (social insurance, ~60%), and Prepagas (private insurers) — all legally mandated to cover HIV treatment at no cost. Argentina adopted DTG-based first-line regimens in 2019, aligned with WHO guidelines.",
                links: [
                    { label: "Ministry of Health — HIV Programme", url: "https://www.argentina.gob.ar/salud/vih" },
                    { label: "UNAIDS — Argentina", url: "https://www.unaids.org/en/regionscountries/countries/argentina" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP with TDF/FTC is available free of charge in Argentina, guaranteed under Ley 27,675 (2022). All three health subsystems (public hospitals, Obras Sociales, and Prepagas) are legally obligated to provide PrEP. Available as daily regimen and on-demand regimen (2+1+1). Eligible populations include MSM, transgender women, serodiscordant couples, people with recent STI diagnosis, and others at substantial risk.",
                links: [
                    { label: "Argentina PrEP Programme — Ministry of Health", url: "https://www.argentina.gob.ar/salud/vih-sida/mas-opciones-para-prevenir-el-vih" },
                ],
            },
        ],
        prepStatus: "available",
        arvAccess: "free",
        genericName: "Remivir (Elea), Trivenz (Richmond), Hetero Labs",
        manufacturer: "Gilead Sciences / local generics",
        procurementPrice: "~USD 3–5/month (PAHO Strategic Fund)",
        dtgTransition: "Adopted since 2019 — DTG-based first-line",
        takeaway: "Argentina guarantees free ARV access by law since 1997, with procurement through the PAHO Strategic Fund at pooled prices. PrEP has been free since 2021. DTG-based regimens have been the first-line standard since 2019.",
    },
    {
        code: "BR",
        name: "Brazil",
        flag: "\u{1F1E7}\u{1F1F7}",
        snapshot: {
            prevalence: "0.6%",
            plhiv: "~1,000,000",
            artCoverage: "~78%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada is registered in Brazil by Gilead Sciences through ANVISA (Agência Nacional de Vigilância Sanitária). Brazil also has domestic generic production: Farmanguinhos (Fiocruz) produces TDF/3TC (tenofovir + lamivudine) under licence, and Blanver produces generic TDF. The combination TDF/3TC/DTG (TLD) is now the primary first-line regimen and is produced domestically. ANVISA maintains a searchable drug registry (Consulta de Produtos).",
                links: [
                    { label: "ANVISA — Official Website", url: "https://www.gov.br/anvisa/pt-br" },
                    { label: "ANVISA — Drug Registry Search (Consulta de Produtos)", url: "https://consultas.anvisa.gov.br/#/medicamentos/" },
                    { label: "Farmanguinhos/Fiocruz — ARV Production", url: "https://www.far.fiocruz.br/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Brazil is a global pioneer in ARV procurement negotiation. The Ministry of Health's DATHI (formerly DIAHV) centrally procures all ARVs. Brazil has used compulsory licensing (efavirenz, 2007) and voluntary licensing to drive down prices. TDF/FTC per-pill price through SUS decreased from R$2.63 to R$2.25 (~USD 0.44/pill, ~USD 13/month for 30 tablets). Farmanguinhos/Fiocruz began domestic TDF/FTC production in 2020, further reducing costs. The CMED regulates maximum retail prices, but public procurement prices are significantly lower. Generic drug prices must be at least 35% cheaper than the reference product by law.",
                links: [
                    { label: "DATHI — Department of HIV/AIDS, Tuberculosis and Hepatitis", url: "https://www.gov.br/saude/pt-br/composicao/svsa/departamento-de-hiv-aids-tuberculose-hepatites-virais-e-infeccoes-sexualmente-transmissiveis-dathi" },
                    { label: "CMED — Price Regulation", url: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed" },
                    { label: "BPS — Banco de Preços em Saúde (Public Procurement Prices)", url: "https://bps.saude.gov.br/" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Brazil has been a global leader in universal free ARV access since 1996 (Law 9,313). The SUS (Sistema Único de Saúde) provides free HIV testing, treatment, and monitoring to all residents regardless of insurance status. Brazil was the first middle-income country to guarantee universal ARV access by law. The PCDT (Protocolo Clínico e Diretrizes Terapêuticas) for HIV/AIDS, updated regularly by CONITEC, guides treatment decisions. As of 2024, TLD (TDF/3TC/DTG) is the standard first-line regimen. Brazil has approximately 1 million PLHIV, making it the largest HIV treatment programme in Latin America.",
                links: [
                    { label: "Ministry of Health — HIV/AIDS Programme", url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/h/hiv-aids" },
                    { label: "CONITEC — Health Technology Assessment", url: "https://www.gov.br/conitec/pt-br" },
                    { label: "UNAIDS — Brazil", url: "https://www.unaids.org/en/regionscountries/countries/brazil" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "Brazil was the first country in Latin America to offer free PrEP through the public health system, starting in December 2017 (Ordinance 2,467/2017). PrEP with TDF/FTC is available free of charge through SUS at designated health centres for key populations. In 2023, Brazil expanded PrEP eligibility and introduced injectable PrEP (cabotegravir) as an additional option. The PrEP programme has enrolled over 100,000 users as of 2024.",
                links: [
                    { label: "Ministry of Health — PrEP Information", url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/p/prep" },
                ],
            },
        ],
        prepStatus: "available",
        arvAccess: "free",
        genericName: "TDF/3TC (Farmanguinhos), TLD (domestic)",
        manufacturer: "Farmanguinhos/Fiocruz (domestic), Blanver, Gilead",
        procurementPrice: "~USD 13/month TDF/FTC (R$2.25/pill via SUS)",
        dtgTransition: "Complete — TLD is standard first-line since 2017",
        takeaway: "Brazil pioneered universal free ARV access in 1996 and was the first in Latin America to offer free PrEP (2017). Domestic production by Farmanguinhos/Fiocruz and aggressive price negotiations keep costs among the lowest in the region. TLD is the standard first-line regimen.",
    },
    {
        code: "CL",
        name: "Chile",
        flag: "\u{1F1E8}\u{1F1F1}",
        snapshot: {
            prevalence: "0.5%",
            plhiv: "~77,000",
            artCoverage: "~70%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada and generic emtricitabine/tenofovir are registered in Chile through ISP (Instituto de Salud Pública), the national drug regulatory agency. The ISP maintains a searchable drug registry (Registro Sanitario). Multiple generic versions are available from manufacturers including Teva, Cipla, and Stada. Chile also uses TDF/3TC combinations.",
                links: [
                    { label: "ISP — Official Website", url: "https://www.ispch.gob.cl/" },
                    { label: "ISP — Drug Registry Search (GICONA)", url: "https://registrosanitario.ispch.gob.cl/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "ARV procurement in Chile is centralized through CENABAST (Central Nacional de Abastecimiento), the national health supply centre, which achieves significant volume discounts. Chile also participates in PAHO Strategic Fund pooled procurement for ARVs. Generic TDF/FTC is procured at approximately USD 4–7 per patient per month through these mechanisms. Retail pharmacy prices for branded Truvada are significantly higher. Chile does not use formal external reference pricing for ARVs in the public sector.",
                links: [
                    { label: "CENABAST — National Health Supply Centre", url: "https://www.cenabast.cl/" },
                    { label: "PAHO Strategic Fund", url: "https://www.paho.org/en/paho-strategic-fund" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "HIV/AIDS treatment is covered under Chile's GES/AUGE system (Garantías Explícitas en Salud) since 2005, guaranteeing free ARV treatment for all PLHIV regardless of insurance status. Both FONASA (public insurer, ~80% of population) and ISAPREs (private insurers) must cover HIV treatment. The Ministry of Health's HIV/STI Programme coordinates treatment and distributes ARVs through public hospitals and health centres. Chile adopted DTG-based first-line regimens in 2019, following WHO recommendations.",
                links: [
                    { label: "Ministry of Health — HIV/STI Programme", url: "https://www.minsal.cl/vih-sida/" },
                    { label: "FONASA — Public Health Insurance", url: "https://www.fonasa.cl/" },
                    { label: "UNAIDS — Chile", url: "https://www.unaids.org/en/regionscountries/countries/chile" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "Chile approved PrEP with TDF/FTC in 2019 and began public sector distribution through the Ministry of Health in 2020. PrEP is available free of charge through designated health centres for key populations. However, availability can be uneven outside of Santiago and major cities. Private-sector PrEP is also available by prescription at pharmacies.",
                links: [
                    { label: "Ministry of Health — PrEP Guidelines", url: "https://www.minsal.cl/vih-sida/" },
                ],
            },
        ],
        prepStatus: "available",
        arvAccess: "free",
        genericName: "TDF/FTC generics (Teva, Cipla, Stada)",
        manufacturer: "Gilead (branded), multiple generics",
        procurementPrice: "~USD 4–7/month (CENABAST/PAHO)",
        dtgTransition: "Adopted since 2019 — DTG-based first-line",
        takeaway: "Chile guarantees free ARV access under the GES/AUGE system since 2005. Centralized procurement through CENABAST and PAHO pooled purchasing keep prices low. PrEP has been free since 2020 through the public system.",
    },
    {
        code: "CO",
        name: "Colombia",
        flag: "\u{1F1E8}\u{1F1F4}",
        snapshot: {
            prevalence: "0.4%",
            plhiv: "~170,000",
            artCoverage: "~65%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada and generic emtricitabine/tenofovir are registered in Colombia through INVIMA (Instituto Nacional de Vigilancia de Medicamentos y Alimentos). Multiple generic versions are available. INVIMA maintains a searchable drug registry. Colombia also has significant generic pharmaceutical manufacturing capacity.",
                links: [
                    { label: "INVIMA — Official Website", url: "https://www.invima.gov.co/" },
                    { label: "INVIMA — Drug Registry Search", url: "https://www.invima.gov.co/consultas-registros-sanitarios" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Colombia uses regulated maximum prices through SISMED. ARVs are included in the PBS medicines list. Generic TDF/FTC is available from multiple manufacturers (Aurobindo ~COP 142,000/month, Saluspharma ~COP 133,200/month, Emtrivir Teva ~COP 240,000/month — approximately USD 31–56). In a landmark move, Colombia issued its first-ever compulsory licence for dolutegravir (DTG) in April 2024, overriding ViiV Healthcare's patent and reducing DTG cost from USD 1,224 to USD 44 per patient per year — enabling treatment of 27 people for the previous cost of one.",
                links: [
                    { label: "SISMED — Drug Price Information System", url: "https://www.sispro.gov.co/central-prestadores-de-servicios/Pages/SISMED.aspx" },
                    { label: "Ministry of Health — PBS Medicines List", url: "https://www.minsalud.gov.co/" },
                    { label: "PAHO Strategic Fund", url: "https://www.paho.org/en/paho-strategic-fund" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Colombia's SGSSS (Sistema General de Seguridad Social en Salud) provides ARV coverage through the PBS (Plan de Beneficios en Salud), which is mandatory for both contributory (EPS) and subsidised regimes. ARVs are provided free of charge to all PLHIV through their EPS (Entidad Promotora de Salud). The national HIV/AIDS programme operates under the Ministry of Health, with the national clinical guideline (Guía de Práctica Clínica) recommending DTG-based first-line regimens since 2020. Colombia's Cuenta de Alto Costo (High-Cost Diseases Account) tracks HIV outcomes nationally.",
                links: [
                    { label: "Cuenta de Alto Costo — HIV/AIDS Data", url: "https://cuentadealtocosto.org/site/vih/" },
                    { label: "Ministry of Health — HIV/AIDS", url: "https://www.minsalud.gov.co/salud/publica/ssr/Paginas/programa-nacional-prevencion-y-control-vih-sida.aspx" },
                    { label: "UNAIDS — Colombia", url: "https://www.unaids.org/en/regionscountries/countries/colombia" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP was included in Colombia's PBS (Plan de Beneficios en Salud) in 2022, making it available free of charge through the health system for key populations. Prior to this, PrEP was available through pilot programmes, research studies, and private purchase. EPS entities are now required to provide PrEP to eligible individuals as part of the comprehensive HIV prevention strategy.",
                links: [
                    { label: "Ministry of Health — HIV Prevention", url: "https://www.minsalud.gov.co/salud/publica/ssr/Paginas/programa-nacional-prevencion-y-control-vih-sida.aspx" },
                ],
            },
        ],
        prepStatus: "available",
        arvAccess: "free",
        genericName: "TDF/FTC generics (multiple)",
        manufacturer: "Gilead (branded), multiple generics",
        procurementPrice: "~USD 31–56/month TDF/FTC; DTG USD 44/yr (post-CL)",
        dtgTransition: "Adopted — compulsory licence for DTG issued April 2024",
        takeaway: "Colombia provides free ARVs through the mandatory SGSSS/EPS system. In April 2024, Colombia issued its first-ever compulsory licence for dolutegravir, reducing the cost from USD 1,224 to USD 44/year — a landmark for HIV treatment affordability. PrEP was added to the PBS in 2022.",
    },
    {
        code: "GT",
        name: "Guatemala",
        flag: "\u{1F1EC}\u{1F1F9}",
        snapshot: {
            prevalence: "0.3%",
            plhiv: "~35,000",
            artCoverage: "~73%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada and generic ARVs are registered in Guatemala through the MSPAS (Ministerio de Salud Pública y Asistencia Social) via the Departamento de Regulación y Control de Productos Farmacéuticos y Afines (DRCPFA). Generic TDF/FTC is available from multiple manufacturers, primarily Indian generics. The national essential medicines list includes TDF-based regimens.",
                links: [
                    { label: "MSPAS — Ministry of Health", url: "https://www.mspas.gob.gt/" },
                    { label: "DRCPFA — Drug Regulation", url: "https://dfrg.mspas.gob.gt/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Guatemala uses joint procurement between MSPAS and IGSS via COMISCA (Council of Ministers of Health of Central America), facilitated by USAID GHSC-PSM. Dolutegravir cost was reduced from USD 240/year to USD 7/year through a voluntary licensing waiver. TLD (tenofovir/lamivudine/dolutegravir) is procured at less than USD 45/person/year through Global Fund pooled procurement. The Global Fund + PEPFAR secured USD 36 million (2024–2026) for the national HIV response.",
                links: [
                    { label: "PAHO Strategic Fund", url: "https://www.paho.org/en/paho-strategic-fund" },
                    { label: "GuateCompras — Public Procurement Portal", url: "https://www.guatecompras.gt/" },
                    { label: "Global Fund — Guatemala", url: "https://www.theglobalfund.org/en/portfolio/country/GTM/" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "ARV treatment is provided free of charge through 16 UAIs (Unidades de Atención Integral) under MSPAS and through IGSS. AHF Guatemala supports 11 of 17 HIV clinics, covering ~14,865 patients. ART coverage is approximately 73% of PLHIV. Treatment schemes were simplified from over 200 to fewer than 65 with TLD adoption. Guatemala achieved 95-95-93 targets in 2022, though 2023 saw regression to 87-83-81 due to PEPFAR funding disruptions. Treatment is concentrated in Guatemala City, with limited access in rural and indigenous areas.",
                links: [
                    { label: "IGSS — Social Security", url: "https://www.igss.gt/" },
                    { label: "UNAIDS — Guatemala", url: "https://www.unaids.org/en/regionscountries/countries/guatemala" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP availability in Guatemala is limited. It is not yet widely offered through the public health system as a national programme. Some NGO-led pilot programmes and PEPFAR-supported initiatives provide PrEP to key populations in urban areas, primarily in Guatemala City. The Ministry of Health has been working on incorporating PrEP into national guidelines.",
                links: [
                    { label: "PEPFAR — Guatemala", url: "https://www.state.gov/pepfar/" },
                ],
            },
        ],
        prepStatus: "limited",
        arvAccess: "free",
        genericName: "TDF/FTC generics (Indian manufacturers)",
        manufacturer: "Multiple generics (PAHO procurement)",
        procurementPrice: "DTG USD 7/yr (voluntary licence); TLD <USD 45/yr",
        dtgTransition: "Complete — TLD adopted, DTG from $240 to $7/year",
        takeaway: "Guatemala provides free ARVs through 16 UAIs with Global Fund + PEPFAR support (USD 36M for 2024–2026). TLD adoption simplified treatment from 200+ schemes to <65 and reduced DTG cost from USD 240 to USD 7/year. Achieved 95-95-93 targets in 2022, though 2025 PEPFAR funding disruptions caused regression.",
    },
    {
        code: "MX",
        name: "Mexico",
        flag: "\u{1F1F2}\u{1F1FD}",
        snapshot: {
            prevalence: "0.3%",
            plhiv: "~400,000",
            artCoverage: "~69%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada and generic emtricitabine/tenofovir are registered in Mexico through COFEPRIS (Comisión Federal para la Protección contra Riesgos Sanitarios). Multiple generic versions are available from manufacturers including Stendhal, Teva, and Cipla. COFEPRIS maintains a searchable drug registry. Mexico has a robust generic pharmaceutical industry.",
                links: [
                    { label: "COFEPRIS — Official Website", url: "https://www.gob.mx/cofepris" },
                    { label: "COFEPRIS — Drug Registry Search", url: "https://www.gob.mx/cofepris/acciones-y-programas/registros-sanitarios-702" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "ARV procurement is centralized through CENSIDA and IMSS. Government procurement price for emtricitabine/tenofovir (200/245 mg) is approximately 710 MXN/month (~USD 40). Retail (private pharmacy) price for branded Truvada is ~10,480 MXN/month (~USD 590). CENSIDA's total ARV budget was approximately 3.2 billion MXN (2019–2020). Mexico procures through PAHO Strategic Fund and previously used UNOPS (2020–2023), now transitioning procurement back to national institutions. Mexico also approved F/TAF (Descovy) for PrEP in 2024 and injectable cabotegravir in 2025.",
                links: [
                    { label: "CENSIDA — National HIV/AIDS Centre", url: "https://www.gob.mx/censida" },
                    { label: "CompraNet — Public Procurement Portal", url: "https://compranet.hacienda.gob.mx/" },
                    { label: "PAHO Strategic Fund", url: "https://www.paho.org/en/paho-strategic-fund" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Mexico provides free ARV treatment through multiple public health institutions: IMSS (social security for formal workers, ~50% of population), ISSSTE (government workers), and the public health system (formerly Seguro Popular/INSABI, now IMSS-Bienestar) for the uninsured. CENSIDA (Centro Nacional para la Prevención y el Control del VIH y el Sida) coordinates the national HIV response. ARVs are provided free to all PLHIV through these systems. Mexico adopted DTG-based first-line regimens in 2019, aligned with WHO recommendations. Procurement disruptions in 2019–2022 caused temporary ARV stock-outs in some states.",
                links: [
                    { label: "IMSS — Social Security", url: "https://www.imss.gob.mx/" },
                    { label: "CENSIDA — National HIV/AIDS Centre", url: "https://www.gob.mx/censida" },
                    { label: "UNAIDS — Mexico", url: "https://www.unaids.org/en/regionscountries/countries/mexico" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP was officially incorporated into Mexico's national HIV prevention guidelines in 2020. It is available free of charge through the public health system, primarily at CENSIDA-affiliated Clinics of Specialised Care (CAPASITS and SAI) and through IMSS. Rollout has been gradual, with availability concentrated in major cities (Mexico City, Guadalajara, Monterrey). Several states have expanded PrEP access through state-level programmes.",
                links: [
                    { label: "CENSIDA — PrEP Programme", url: "https://www.gob.mx/censida" },
                ],
            },
        ],
        prepStatus: "available",
        arvAccess: "free",
        genericName: "TDF/FTC generics (Stendhal, Teva, Cipla)",
        manufacturer: "Multiple generics + Gilead (branded)",
        procurementPrice: "~710 MXN/month (~USD 40, govt procurement)",
        dtgTransition: "Adopted since 2019 — DTG-based first-line",
        takeaway: "Mexico provides free ARVs through IMSS, ISSSTE, and the public health system (IMSS-Bienestar). CENSIDA coordinates the national response. Procurement transitions in 2019–2023 caused temporary disruptions, now resolved. PrEP has been available since 2020 through public clinics.",
    },
    {
        code: "PA",
        name: "Panama",
        flag: "\u{1F1F5}\u{1F1E6}",
        snapshot: {
            prevalence: "1.0%",
            plhiv: "~29,000",
            artCoverage: "~79%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "ARVs including TDF/FTC are registered in Panama through the Dirección Nacional de Farmacia y Drogas (DNFD) under MINSA (Ministerio de Salud). Generic versions from Indian and Latin American manufacturers are available. The national essential medicines list (Cuadro Básico) includes TDF-based regimens.",
                links: [
                    { label: "MINSA — Ministry of Health", url: "https://www.minsa.gob.pa/" },
                    { label: "DNFD — National Pharmacy Directorate", url: "https://www.minsa.gob.pa/direccion/direccion-nacional-de-farmacia-y-drogas" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Panama uses PAHO Strategic Fund for pooled ARV procurement, achieving competitive prices. Generic TDF/FTC is procured at approximately USD 4–6 per patient per month. The CSS (Caja de Seguro Social) also procures medicines separately for its beneficiaries. Panama Compra is the public procurement transparency portal.",
                links: [
                    { label: "PAHO Strategic Fund", url: "https://www.paho.org/en/paho-strategic-fund" },
                    { label: "PanamaCompra — Procurement Portal", url: "https://www.panamacompra.gob.pa/" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Since 2016, MINSA provides free HIV treatment for all. ARVs are distributed through a network of 17 antiretroviral therapy clinics and the CSS (Caja de Seguro Social, ~80% of population). ART coverage is approximately 79% of diagnosed PLHIV. 95-95-95 progress: 82-79-90 (2022). Major challenge: Ngäbe-Buglé indigenous communities face 4x the national HIV incidence rate with severe access barriers. Panama received first TLD supplies via PEPFAR in 2019. AID FOR AIDS facilitates alternative ARV access during shortages.",
                links: [
                    { label: "CSS — Social Security", url: "https://www.css.gob.pa/" },
                    { label: "UNAIDS — Panama", url: "https://www.unaids.org/en/regionscountries/countries/panama" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP was introduced in Panama in February 2022 through four clinics, with support from ICAP at Columbia University and CDC. PrEP remains in early scale-up, primarily through pilot projects and PEPFAR-supported initiatives rather than a formalised national programme. PEPFAR/USAID funding cuts in 2025 have created gaps in PrEP delivery.",
                links: [],
            },
        ],
        prepStatus: "limited",
        arvAccess: "free",
        genericName: "TDF/FTC generics",
        manufacturer: "Multiple generics (PAHO procurement)",
        procurementPrice: "~USD 4–6/month (PAHO Strategic Fund)",
        dtgTransition: "In progress — DTG adoption ongoing",
        takeaway: "Panama has provided free ARVs since 2016 through MINSA and CSS, with PEPFAR/CDC support (~USD 10M/year). ART coverage has improved to ~79%, but Ngäbe-Buglé indigenous communities face disproportionate HIV burden (4x national rate). PrEP was introduced in 2022 via ICAP/CDC pilot clinics.",
    },
    {
        code: "PE",
        name: "Peru",
        flag: "\u{1F1F5}\u{1F1EA}",
        snapshot: {
            prevalence: "0.3%",
            plhiv: "~110,000",
            artCoverage: "~72%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada and generic TDF/FTC are registered in Peru through DIGEMID (Dirección General de Medicamentos, Insumos y Drogas) under MINSA. DIGEMID maintains a searchable drug registry (Perudis/SINAMEC). Generic versions from Indian manufacturers and regional producers are available. Peru relies heavily on generic ARVs procured through international mechanisms.",
                links: [
                    { label: "DIGEMID — Drug Regulatory Authority", url: "http://www.digemid.minsa.gob.pe/" },
                    { label: "MINSA — Ministry of Health", url: "https://www.gob.pe/minsa" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Peru uses a combination of PAHO Strategic Fund pooled procurement and national competitive bidding through CENARES (Centro Nacional de Abastecimiento de Recursos Estratégicos en Salud) for ARV procurement. Generic TDF/FTC is procured at approximately USD 3–6 per patient per month. The Observatorio Peruano de Productos Farmacéuticos tracks medicine prices. Peru has also used TRIPS flexibilities for compulsory licensing discussions.",
                links: [
                    { label: "CENARES — National Strategic Health Supply Centre", url: "https://www.cenares.minsa.gob.pe/" },
                    { label: "PAHO Strategic Fund", url: "https://www.paho.org/en/paho-strategic-fund" },
                    { label: "OPMF — Drug Price Observatory", url: "http://observatorio.digemid.minsa.gob.pe/" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Peru provides free ARV treatment through the public health system under Law 26,626 (CONTRASIDA Law). The national HIV programme (ESNITSS — Estrategia Sanitaria Nacional de Prevención y Control de ITS, VIH y Sida) coordinates treatment delivery through MINSA hospitals and health centres. SIS (Seguro Integral de Salud) covers the uninsured, while EsSalud covers formal workers. Both provide ARVs free of charge. Peru adopted DTG-based first-line regimens in 2020.",
                links: [
                    { label: "SIS — Integral Health Insurance", url: "https://www.gob.pe/sis" },
                    { label: "EsSalud — Social Security", url: "http://www.essalud.gob.pe/" },
                    { label: "UNAIDS — Peru", url: "https://www.unaids.org/en/regionscountries/countries/peru" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP was formally integrated into Peru's national health system in August 2023 (NTS No. 204-MINSA/DGIESP-2023), available free at ~30 health centres in Lima, Callao, Ica, and Piura. Uptake remains low: ~646 users by end 2022, fewer than 3,000 by July 2024, against a target population of 90,000+. Prior to formal integration, PrEP was available through the ImPrEP clinical trial (2018–2021). Injectable cabotegravir for PrEP is approved in Peru.",
                links: [
                    { label: "MINSA — HIV/AIDS Programme", url: "https://www.gob.pe/minsa" },
                ],
            },
        ],
        prepStatus: "available",
        arvAccess: "free",
        genericName: "TDF/FTC generics (Indian manufacturers)",
        manufacturer: "Multiple generics (PAHO/CENARES procurement)",
        procurementPrice: "~USD 3–6/month (CENARES/PAHO)",
        dtgTransition: "Adopted since 2020 — DTG-based first-line",
        takeaway: "Peru provides free ARVs under the CONTRASIDA Law through both SIS (uninsured) and EsSalud (social security). CENARES and PAHO pooled procurement keep prices low. PrEP has been free since 2022. DTG-based first-line regimens adopted in 2020.",
    },
    {
        code: "RS",
        name: "Serbia",
        flag: "\u{1F1F7}\u{1F1F8}",
        snapshot: {
            prevalence: "<0.1%",
            plhiv: "~3,400",
            artCoverage: "~73%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada and generic TDF/FTC are registered in Serbia through ALIMS (Agencija za Lekove i Medicinska Sredstva Srbije — Medicines and Medical Devices Agency of Serbia). ALIMS maintains a searchable drug registry. Generic versions from European and Indian manufacturers are available. Serbia follows a largely EMA-aligned regulatory pathway for drug approval.",
                links: [
                    { label: "ALIMS — Medicines Agency of Serbia", url: "https://www.alims.gov.rs/" },
                    { label: "ALIMS — Drug Registry Search", url: "https://www.alims.gov.rs/eng/medicinal-products/search-for-human-medicines/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Serbia uses external reference pricing with a basket of reference countries for setting medicine prices. ARVs are procured centrally by the RFZO (Republički Fond za Zdravstveno Osiguranje — Republic Fund for Health Insurance). Generic TDF/FTC is available at regulated prices. Serbia participates in regional procurement initiatives. The RFZO publishes a medicines price list (Lista Lekova) that includes reimbursement prices.",
                links: [
                    { label: "RFZO — Health Insurance Fund", url: "https://www.rfzo.rs/" },
                    { label: "RFZO — List of Medicines", url: "https://www.rfzo.rs/index.php/osiguranim-licima/lekovi-info" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Serbia has provided free ARV treatment since 1997 (HAART introduction), funded by the RFZO (mandatory health insurance, ~95% of population). Treatment is available at four clinical centres: Belgrade, Novi Sad, Niš, and Kragujevac. 4,903 cumulative HIV cases registered (1985–2024), with ~3,427 diagnosed PLHIV as of end 2023. Prescriptions valid up to 6 months with monthly dispensing at pharmacies. Serbia follows EACS guidelines for treatment decisions. Continuous insurance enrollment of 3+ months is required for non-emergency access.",
                links: [
                    { label: "Batut Institute — Public Health", url: "https://www.batut.org.rs/index.php?lang=en" },
                    { label: "UNAIDS — Serbia", url: "https://www.unaids.org/en/regionscountries/countries/serbia" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "PrEP is available in Serbia only at full patient cost — it is not reimbursed by RFZO and no national PrEP guidelines have been formally adopted. A 2024 study in Vojvodina found 71% awareness but only 17% usage among at-risk men. Association Red Line is working with the University of Novi Sad, funded by Gilead's Zeroing In programme, to develop national PrEP guidelines.",
                links: [],
            },
        ],
        prepStatus: "limited",
        arvAccess: "free",
        genericName: "TDF/FTC generics",
        manufacturer: "European and Indian generics",
        procurementPrice: "RFZO regulated price",
        dtgTransition: "Adopted — DTG-based first-line",
        takeaway: "Serbia has provided free ARVs since 1997 through the RFZO health insurance system, with treatment at four clinical centres. With a small epidemic (~3,400 PLHIV), procurement is manageable. PrEP remains the key gap — available only at patient cost with no formal national programme, though NGO-academic partnerships are developing guidelines.",
    },
    {
        code: "TH",
        name: "Thailand",
        flag: "\u{1F1F9}\u{1F1ED}",
        snapshot: {
            prevalence: "1.1%",
            plhiv: "~560,000",
            artCoverage: "~82%",
            year: 2023,
        },
        sections: [
            {
                id: "registration",
                title: "Drug Registration & Availability",
                body: "Truvada and generic TDF/FTC are registered in Thailand through the Thai FDA (Food and Drug Administration). Thailand is a global leader in domestic generic ARV production through the GPO (Government Pharmaceutical Organization). GPO produces GPO-vir (a fixed-dose combination of stavudine + lamivudine + nevirapine), and has expanded to produce TDF-based combinations. The NHSO (National Health Security Office) manages the national essential drug list (NLEM).",
                links: [
                    { label: "Thai FDA — Drug Registry Search", url: "https://www.fda.moph.go.th/" },
                    { label: "GPO — Government Pharmaceutical Organization", url: "https://www.gpo.or.th/" },
                    { label: "NHSO — National Health Security Office", url: "https://eng.nhso.go.th/" },
                ],
            },
            {
                id: "pricing",
                title: "Pricing & Procurement",
                body: "Thailand is a pioneer in using TRIPS flexibilities for ARV access. In 2006–2007, the government issued compulsory licences for efavirenz (Merck) and lopinavir/ritonavir (Abbott), saving an estimated USD 370 million over 5 years. GPO's Teno-EM (TDF/FTC) is priced at 16 THB/tablet (480 THB/month, ~USD 13), compared to branded Truvada at 80 THB/tablet (2,400 THB/month, ~USD 67). Generic TLD (TELDY) costs 25 THB/tablet. GPO-vir (the original ARV combination) reduced first-line ART cost from USD 490/month to USD 31/month, enabling an 8-fold treatment expansion with only 40% budget increase.",
                links: [
                    { label: "GPO — Generic ARV Production", url: "https://www.gpo.or.th/" },
                    { label: "Thai Red Cross — ARV Price List", url: "https://th.aidsid.or.th/" },
                ],
            },
            {
                id: "access",
                title: "Public Health Programme & Reimbursement",
                body: "Thailand provides universal free ARV treatment through the UCS (Universal Coverage Scheme), managed by NHSO, which covers ~75% of the population. CSMBS (Civil Servant Medical Benefit Scheme) and SSS (Social Security Scheme) cover the remaining formal-sector population. Thailand achieved near-universal ART access since 2003 and was the first country in Asia to offer PMTCT (prevention of mother-to-child transmission) nationally. Thailand has achieved 82% ART coverage with strong viral suppression rates. The country adopted DTG-based first-line regimens in 2019 and TLD is now standard first-line.",
                links: [
                    { label: "NHSO — Universal Coverage Scheme", url: "https://eng.nhso.go.th/" },
                    { label: "Division of AIDS and STIs — Department of Disease Control", url: "https://ddc.moph.go.th/das/" },
                    { label: "UNAIDS — Thailand", url: "https://www.unaids.org/en/regionscountries/countries/thailand" },
                ],
            },
            {
                id: "prep",
                title: "PrEP Availability",
                body: "Thailand was one of the first countries in Asia to offer free PrEP through the public health system, starting with pilot programmes in 2014 and national rollout through the NHSO in 2020. PrEP with TDF/FTC is available free of charge through key population-led health services and government health centres. Thailand has also introduced injectable PrEP (cabotegravir) as an additional option. The PrEP programme is supported by the Princess PEP programme and PEPFAR-funded initiatives.",
                links: [
                    { label: "NHSO — PrEP Programme", url: "https://eng.nhso.go.th/" },
                    { label: "PrEPWatch — Thailand", url: "https://www.prepwatch.org/countries/thailand/" },
                ],
            },
        ],
        prepStatus: "available",
        arvAccess: "free",
        genericName: "GPO-produced TDF/FTC, TLD",
        manufacturer: "GPO (Government Pharmaceutical Organization, domestic)",
        procurementPrice: "480 THB/month (~USD 13) GPO Teno-EM",
        dtgTransition: "Complete — TLD standard first-line since 2019",
        takeaway: "Thailand is a global leader in affordable ARV access: domestic GPO production and compulsory licensing (2006–2007) keep prices among the lowest globally (~USD 2–4/month). Universal free coverage through NHSO since 2003. Free PrEP since 2020. TLD is standard first-line.",
    },
];

// ── DOM references ──────────────────────────────────────────────────

const countryGrid = document.getElementById("country-grid");
const countrySearch = document.getElementById("country-search");
const noResults = document.getElementById("country-no-results");
const hivDetail = document.getElementById("hiv-detail");
const detailFlag = document.getElementById("detail-flag");
const detailName = document.getElementById("detail-country-name");
const detailSections = document.getElementById("detail-sections");
const detailClose = document.getElementById("detail-close");
const countryCount = document.getElementById("hiv-country-count");
const keyFacts = document.getElementById("hiv-key-facts");
const comparisonTable = document.getElementById("comparison-table");

// ── Render overview key facts ───────────────────────────────────────

function renderKeyFacts() {
    const totalPLHIV = HIV_COUNTRIES.reduce((sum, c) => {
        const num = c.snapshot.plhiv.replace(/[^0-9]/g, "");
        return sum + (parseInt(num, 10) || 0);
    }, 0);

    const freeCount = HIV_COUNTRIES.filter(c => c.arvAccess === "free").length;
    const prepCount = HIV_COUNTRIES.filter(c => c.prepStatus === "available").length;
    const dtgCount = HIV_COUNTRIES.filter(c =>
        c.dtgTransition.toLowerCase().includes("complete") ||
        c.dtgTransition.toLowerCase().includes("adopted") ||
        c.dtgTransition.toLowerCase().includes("standard")
    ).length;

    keyFacts.innerHTML = `
        <div class="hiv-fact-card">
            <div class="fact-label">Countries Covered</div>
            <div class="fact-value">${HIV_COUNTRIES.length}</div>
            <div class="fact-detail">Latin America, Africa, Asia, Europe</div>
        </div>
        <div class="hiv-fact-card">
            <div class="fact-label">Est. PLHIV (covered markets)</div>
            <div class="fact-value">~${(totalPLHIV / 1000000).toFixed(1)}M</div>
            <div class="fact-detail">UNAIDS estimates, 2023</div>
        </div>
        <div class="hiv-fact-card">
            <div class="fact-label">Free ARV Access</div>
            <div class="fact-value">${freeCount} / ${HIV_COUNTRIES.length}</div>
            <div class="fact-detail">Countries with universal free ARVs</div>
        </div>
        <div class="hiv-fact-card">
            <div class="fact-label">PrEP Available</div>
            <div class="fact-value">${prepCount} / ${HIV_COUNTRIES.length}</div>
            <div class="fact-detail">Countries with formal PrEP programmes</div>
        </div>
        <div class="hiv-fact-card">
            <div class="fact-label">DTG Transition</div>
            <div class="fact-value">${dtgCount} / ${HIV_COUNTRIES.length}</div>
            <div class="fact-detail">Countries with DTG-based first-line</div>
        </div>
    `;
}

// ── Render country grid ─────────────────────────────────────────────

function renderGrid() {
    countryCount.textContent = HIV_COUNTRIES.length;

    countryGrid.innerHTML = HIV_COUNTRIES.map(c => `
        <button class="country-flag-card" data-code="${esc(c.code)}" title="${esc(c.name)}">
            <span class="fi fi-${c.code.toLowerCase()} country-flag-icon"></span>
            <span class="flag-label">${esc(c.name)}</span>
        </button>
    `).join("");

    countryGrid.querySelectorAll(".country-flag-card").forEach(btn => {
        btn.addEventListener("click", () => {
            const country = HIV_COUNTRIES.find(c => c.code === btn.dataset.code);
            if (country) openDetail(country, btn);
        });
    });
}

// ── Filter ──────────────────────────────────────────────────────────

function applyFilter() {
    const q = countrySearch.value.trim().toLowerCase();
    let visible = 0;

    countryGrid.querySelectorAll(".country-flag-card").forEach(btn => {
        const name = btn.querySelector(".flag-label").textContent.toLowerCase();
        const show = !q || name.includes(q);
        btn.classList.toggle("hidden", !show);
        if (show) visible++;
    });

    noResults.classList.toggle("hidden", visible > 0);
}

countrySearch.addEventListener("input", applyFilter);

// ── Detail panel ────────────────────────────────────────────────────

function badgeHtml(label, status) {
    const cls = status === "free" || status === "available" ? "free"
        : status === "limited" ? "limited"
        : "unavailable";
    return `<span class="hiv-badge hiv-badge--${cls}">${esc(label)}</span>`;
}

function openDetail(country, activeBtn) {
    countryGrid.querySelectorAll(".country-flag-card").forEach(b => b.classList.remove("active"));
    activeBtn.classList.add("active");

    detailFlag.className = `fi fi-${country.code.toLowerCase()} resource-flag`;
    detailName.textContent = country.name;

    let html = "";

    // Snapshot bar
    const s = country.snapshot;
    html += `
        <div class="hiv-snapshot">
            <div class="hiv-snapshot-item">
                <div class="snap-label">HIV Prevalence</div>
                <div class="snap-value">${esc(s.prevalence)}</div>
            </div>
            <div class="hiv-snapshot-item">
                <div class="snap-label">Est. PLHIV</div>
                <div class="snap-value">${esc(s.plhiv)}</div>
            </div>
            <div class="hiv-snapshot-item">
                <div class="snap-label">ART Coverage</div>
                <div class="snap-value">${esc(s.artCoverage)}</div>
            </div>
            <div class="hiv-snapshot-item">
                <div class="snap-label">ARV Access</div>
                <div class="snap-value">${badgeHtml(country.arvAccess === "free" ? "Free" : "Partial", country.arvAccess)}</div>
            </div>
            <div class="hiv-snapshot-item">
                <div class="snap-label">PrEP</div>
                <div class="snap-value">${badgeHtml(
                    country.prepStatus === "available" ? "Available" : country.prepStatus === "limited" ? "Limited" : "Not available",
                    country.prepStatus
                )}</div>
            </div>
        </div>
    `;

    // Sections
    html += country.sections.map(sec => {
        const hasContent = sec.body || (sec.links && sec.links.length > 0);
        if (!hasContent) return "";
        return `
            <div class="resource-section">
                <h3 class="resource-section-title">${esc(sec.title)}</h3>
                ${sec.body ? `<p class="resource-section-body">${esc(sec.body)}</p>` : ""}
                ${sec.links && sec.links.length > 0 ? `
                    <ul class="resource-links">
                        ${sec.links.map(l => `
                            <li>
                                <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} &rarr;</a>
                            </li>
                        `).join("")}
                    </ul>
                ` : ""}
            </div>
        `;
    }).join("");

    // Summary details
    html += `
        <hr class="hiv-section-divider">
        <div class="resource-section">
            <h3 class="resource-section-title">Summary</h3>
            <table class="hiv-comparison-table" style="min-width: auto;">
                <tbody>
                    <tr><td style="font-weight:600; width:200px;">Generic Product</td><td>${esc(country.genericName)}</td></tr>
                    <tr><td style="font-weight:600;">Manufacturer</td><td>${esc(country.manufacturer)}</td></tr>
                    <tr><td style="font-weight:600;">Procurement Price</td><td>${esc(country.procurementPrice)}</td></tr>
                    <tr><td style="font-weight:600;">DTG Transition</td><td>${esc(country.dtgTransition)}</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // Takeaway
    if (country.takeaway) {
        html += `
            <div class="resource-callout resource-callout--tip">
                <span class="resource-callout__label">Key Takeaway</span>
                <p>${esc(country.takeaway)}</p>
            </div>
        `;
    }

    detailSections.innerHTML = html;
    hivDetail.classList.remove("hidden");
    hivDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

detailClose.addEventListener("click", () => {
    hivDetail.classList.add("hidden");
    countryGrid.querySelectorAll(".country-flag-card").forEach(b => b.classList.remove("active"));
});

// ── Comparison table ────────────────────────────────────────────────

function renderComparison() {
    const prepLabel = (status) =>
        status === "available" ? "Available" : status === "limited" ? "Limited" : "No";
    const prepBadge = (status) => badgeHtml(prepLabel(status), status);
    const accessBadge = (access) => badgeHtml(access === "free" ? "Free" : "Partial", access);

    comparisonTable.innerHTML = `
        <thead>
            <tr>
                <th>Country</th>
                <th>Prevalence</th>
                <th>PLHIV</th>
                <th>ART Coverage</th>
                <th>ARV Access</th>
                <th>PrEP</th>
                <th>Generic Product</th>
                <th>Est. Price/Month</th>
                <th>DTG Transition</th>
            </tr>
        </thead>
        <tbody>
            ${HIV_COUNTRIES.map(c => `
                <tr>
                    <td class="country-cell"><span class="fi fi-${c.code.toLowerCase()}" style="margin-right:6px;"></span>${esc(c.name)}</td>
                    <td>${esc(c.snapshot.prevalence)}</td>
                    <td>${esc(c.snapshot.plhiv)}</td>
                    <td>${esc(c.snapshot.artCoverage)}</td>
                    <td>${accessBadge(c.arvAccess)}</td>
                    <td>${prepBadge(c.prepStatus)}</td>
                    <td>${esc(c.genericName)}</td>
                    <td>${esc(c.procurementPrice)}</td>
                    <td>${esc(c.dtgTransition)}</td>
                </tr>
            `).join("")}
        </tbody>
    `;
}

// ── Init ─────────────────────────────────────────────────────────────

renderKeyFacts();
renderGrid();
renderComparison();
