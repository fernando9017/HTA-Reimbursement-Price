/**
 * US NSCLC Pathways — Asset Intelligence View
 * Enhanced module for asset-specific competitive analysis.
 * Depends on shared.js for: esc
 */

// ── Pathway Institutions (same as main NSCLC tracker) ───────────────
const PATHWAY_INSTITUTIONS = [
    { id: "nccn", name: "NCCN", fullName: "National Comprehensive Cancer Network", type: "guideline" },
    { id: "va", name: "VA", fullName: "VA Oncology Pathways", type: "public" },
    { id: "uhc", name: "UHC", fullName: "UnitedHealthcare", type: "payer" },
    { id: "anthem", name: "Anthem", fullName: "Anthem / Elevance CCQP", type: "payer" },
    { id: "evicore", name: "eviCore", fullName: "eviCore (Cigna/Evernorth)", type: "payer" },
    { id: "humana", name: "Humana", fullName: "Humana Oncology", type: "payer" },
    { id: "us-oncology", name: "US Onc", fullName: "Value Pathways (NCCN)", type: "provider" },
    { id: "moffitt", name: "Moffitt", fullName: "Moffitt Cancer Center", type: "provider" },
    { id: "oneoncology", name: "OneOnc", fullName: "OneOncology", type: "provider" },
    { id: "aetna", name: "Aetna", fullName: "Aetna / CVS Health", type: "payer" },
    { id: "mdanderson", name: "MDA", fullName: "MD Anderson", type: "academic" },
    { id: "msk", name: "MSK", fullName: "Memorial Sloan Kettering", type: "academic" },
    { id: "mayo", name: "Mayo", fullName: "Mayo Clinic", type: "academic" },
    { id: "clinicalpath", name: "ClinPath", fullName: "Elsevier ClinicalPath", type: "commercial" },
    { id: "eviti", name: "eviti", fullName: "eviti Connect", type: "commercial" },
    { id: "flatiron", name: "Flatiron", fullName: "Flatiron Health", type: "commercial" },
];

// ── Therapy Comparison Data (mirrored from us_pathways.js) ──────────
const THERAPY_PREFERENCES = [
    {
        biomarker: "EGFR (exon 19 del / L858R)", line: "1L",
        therapies: [
            { agent: "Osimertinib", brand: "Tagrisso", manufacturer: "AstraZeneca", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1"}, va:{status:"preferred",note:"Preferred 1L"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Algorithm-preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Osimertinib + carboplatin/pemetrexed", brand: "Tagrisso + chemo", manufacturer: "AstraZeneca", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (FLAURA2)"}, va:{status:"preferred",note:"Category 1"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"FLAURA2"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Amivantamab + lazertinib", brand: "Rybrevant + Lazcluze", manufacturer: "Janssen (J&J)", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (MARIPOSA)"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"recommended",note:"Under review"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA pathway"}, humana:{status:"unknown",note:"Under review"}, "us-oncology":{status:"recommended",note:"Included"}, moffitt:{status:"recommended",note:"MARIPOSA"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"Listed"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Erlotinib", brand: "Tarceva", manufacturer: "Roche/Genentech", nccnCategory: "useful in certain circumstances",
              positions: { nccn:{status:"listed",note:"Other recommended"}, va:{status:"not listed",note:""}, uhc:{status:"not listed",note:""}, anthem:{status:"not listed",note:""}, evicore:{status:"restricted",note:"If osimertinib not tolerated"}, humana:{status:"not listed",note:""}, "us-oncology":{status:"not listed",note:""}, moffitt:{status:"not listed",note:""}, oneoncology:{status:"not listed",note:""}, clinicalpath:{status:"not listed",note:""}, eviti:{status:"restricted",note:"Only if TKI-intolerant"}, aetna:{status:"not listed",note:""}, mdanderson:{status:"listed",note:""}, msk:{status:"listed",note:""}, mayo:{status:"listed",note:""}, flatiron:{status:"listed",note:"Low adoption"} } },
        ],
    },
    {
        biomarker: "EGFR (exon 20 insertion)", line: "1L",
        therapies: [
            { agent: "Amivantamab + chemo + lazertinib", brand: "Rybrevant + chemo + Lazcluze", manufacturer: "Janssen (J&J)", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (PAPILLON)"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Listed"}, moffitt:{status:"preferred",note:"PAPILLON"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Platinum + pemetrexed + pembrolizumab", brand: "Chemo + Keytruda", manufacturer: "Merck", nccnCategory: "other recommended",
              positions: { nccn:{status:"recommended",note:"Other recommended"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Standard"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Listed"}, moffitt:{status:"recommended",note:"Standard"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"On-pathway"}, mdanderson:{status:"recommended",note:"Algorithm-listed"}, msk:{status:"recommended",note:"Listed"}, mayo:{status:"recommended",note:"Listed"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "ALK rearrangement", line: "1L",
        therapies: [
            { agent: "Lorlatinib", brand: "Lorbrena", manufacturer: "Pfizer", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (CROWN)"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Alectinib", brand: "Alecensa", manufacturer: "Roche/Genentech", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (ALEX)"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Brigatinib", brand: "Alunbrig", manufacturer: "Takeda", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (ALTA-1L)"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Level II"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "KRAS G12C", line: "2L+",
        therapies: [
            { agent: "Sotorasib", brand: "Lumakras", manufacturer: "Amgen", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (CodeBreaK 200)"}, va:{status:"preferred",note:"Preferred 2L"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"PA approved"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Adagrasib", brand: "Krazati", manufacturer: "Mirati (BMS)", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A (KRYSTAL-1)"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Listed"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "PD-L1 >= 50% (no actionable drivers)", line: "1L",
        therapies: [
            { agent: "Pembrolizumab monotherapy", brand: "Keytruda", manufacturer: "Merck", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (KEYNOTE-024)"}, va:{status:"preferred",note:"Preferred mono"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Pembrolizumab + platinum/pemetrexed", brand: "Keytruda + chemo", manufacturer: "Merck", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (KN-189)"}, va:{status:"preferred",note:"Preferred combo"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"PA approved"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Cemiplimab", brand: "Libtayo", manufacturer: "Regeneron/Sanofi", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (EMPOWER-01)"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"listed",note:"Listed"}, evicore:{status:"listed",note:"PA required"}, humana:{status:"listed",note:"Listed"}, "us-oncology":{status:"listed",note:"Listed"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"listed",note:"Listed"}, clinicalpath:{status:"listed",note:"Listed"}, eviti:{status:"listed",note:"PA required"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Nivolumab + ipilimumab", brand: "Opdivo + Yervoy", manufacturer: "Bristol-Myers Squibb", nccnCategory: "other recommended",
              positions: { nccn:{status:"recommended",note:"Category 1 (CheckMate 227)"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Level II"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"On-pathway"}, mdanderson:{status:"recommended",note:"Algorithm-listed"}, msk:{status:"recommended",note:"Listed"}, mayo:{status:"recommended",note:"Listed"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "PD-L1 1-49% (no actionable drivers)", line: "1L",
        therapies: [
            { agent: "Pembrolizumab + platinum/pemetrexed", brand: "Keytruda + chemo", manufacturer: "Merck", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Nivolumab + ipilimumab + chemo", brand: "Opdivo + Yervoy + chemo", manufacturer: "Bristol-Myers Squibb", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (CM9LA)"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Level II"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "PD-L1 < 1% (no actionable drivers)", line: "1L",
        therapies: [
            { agent: "Pembrolizumab + platinum/pemetrexed", brand: "Keytruda + chemo", manufacturer: "Merck", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional preferred"}, oneoncology:{status:"preferred",note:"Pathway preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional preferred"}, mayo:{status:"preferred",note:"Institutional preferred"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Nivolumab + ipilimumab + chemo", brand: "Opdivo + Yervoy + chemo", manufacturer: "Bristol-Myers Squibb", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (CM9LA)"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"On-pathway"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Level II"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Carboplatin + paclitaxel + bevacizumab + atezolizumab", brand: "Chemo + Avastin + Tecentriq", manufacturer: "Roche/Genentech", nccnCategory: "other recommended",
              positions: { nccn:{status:"recommended",note:"Category 2A (IMpower150)"}, va:{status:"listed",note:"Consider"}, uhc:{status:"listed",note:"Listed"}, anthem:{status:"listed",note:"Listed"}, evicore:{status:"listed",note:"PA required"}, humana:{status:"listed",note:"Listed"}, "us-oncology":{status:"listed",note:"Level III"}, moffitt:{status:"listed",note:"Consider"}, oneoncology:{status:"listed",note:"Listed"}, clinicalpath:{status:"listed",note:"Listed"}, eviti:{status:"listed",note:"PA required"}, aetna:{status:"recommended",note:"On-pathway"}, mdanderson:{status:"recommended",note:"Algorithm-listed"}, msk:{status:"recommended",note:"Listed"}, mayo:{status:"recommended",note:"Listed"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "BRAF V600E", line: "1L",
        therapies: [
            { agent: "Dabrafenib + trametinib", brand: "Tafinlar + Mekinist", manufacturer: "Novartis", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"PA approved"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional"}, oneoncology:{status:"preferred",note:"Preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Encorafenib + binimetinib", brand: "Braftovi + Mektovi", manufacturer: "Pfizer (Array)", nccnCategory: "other recommended",
              positions: { nccn:{status:"recommended",note:"Category 2A"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"listed",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"listed",note:"Level II"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"listed",note:"Listed"}, clinicalpath:{status:"listed",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"On-pathway"}, mdanderson:{status:"recommended",note:"Algorithm-listed"}, msk:{status:"recommended",note:"Listed"}, mayo:{status:"recommended",note:"Listed"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "ROS1 fusion", line: "1L",
        therapies: [
            { agent: "Entrectinib", brand: "Rozlytrek", manufacturer: "Roche/Genentech", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional"}, oneoncology:{status:"preferred",note:"Preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Crizotinib", brand: "Xalkori", manufacturer: "Pfizer", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"preferred",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Repotrectinib", brand: "Augtyro", manufacturer: "Bristol-Myers Squibb", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A (TRIDENT-1)"}, va:{status:"recommended",note:"Listed"}, uhc:{status:"recommended",note:"Under review"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"unknown",note:"Under review"}, "us-oncology":{status:"recommended",note:"Listed"}, moffitt:{status:"recommended",note:"TRIDENT-1"}, oneoncology:{status:"unknown",note:"Under review"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"Listed"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "MET exon 14 skipping", line: "1L",
        therapies: [
            { agent: "Capmatinib", brand: "Tabrecta", manufacturer: "Novartis", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"preferred",note:"PA approved"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional"}, oneoncology:{status:"preferred",note:"Preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Tepotinib", brand: "Tepmetko", manufacturer: "Merck KGaA (EMD Serono)", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Listed"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "RET fusion", line: "1L",
        therapies: [
            { agent: "Selpercatinib", brand: "Retevmo", manufacturer: "Eli Lilly", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 1 (LIBRETTO-431)"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"preferred",note:"On-pathway"}, evicore:{status:"preferred",note:"Immediate PA"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional"}, oneoncology:{status:"preferred",note:"Preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"preferred",note:"On-pathway"}, mdanderson:{status:"preferred",note:"Algorithm-preferred"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"preferred",note:"High adoption"} } },
            { agent: "Pralsetinib", brand: "Gavreto", manufacturer: "Roche/Genentech", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Listed"}, moffitt:{status:"recommended",note:"Alternative"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "EGFR (post-osimertinib progression)", line: "2L+",
        therapies: [
            { agent: "Datopotamab deruxtecan", brand: "Dato-DXd", manufacturer: "Daiichi Sankyo / AstraZeneca", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A (TROPION-Lung05)"}, va:{status:"preferred",note:"Preferred 2L"}, uhc:{status:"recommended",note:"Under review"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"recommended",note:"PA pathway"}, humana:{status:"unknown",note:"Under review"}, "us-oncology":{status:"recommended",note:"Included"}, moffitt:{status:"preferred",note:"TROPION"}, oneoncology:{status:"recommended",note:"Listed"}, clinicalpath:{status:"recommended",note:"Listed"}, eviti:{status:"recommended",note:"Listed"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Amivantamab + chemotherapy", brand: "Rybrevant + chemo", manufacturer: "Janssen (J&J)", nccnCategory: "other recommended",
              positions: { nccn:{status:"recommended",note:"Category 2A (MARIPOSA-2)"}, va:{status:"recommended",note:"Alternative"}, uhc:{status:"listed",note:"Listed"}, anthem:{status:"listed",note:"Listed"}, evicore:{status:"listed",note:"PA required"}, humana:{status:"listed",note:"Listed"}, "us-oncology":{status:"listed",note:"Listed"}, moffitt:{status:"recommended",note:"MARIPOSA-2"}, oneoncology:{status:"listed",note:"Listed"}, clinicalpath:{status:"listed",note:"Listed"}, eviti:{status:"listed",note:"PA required"}, aetna:{status:"recommended",note:"On-pathway"}, mdanderson:{status:"recommended",note:"Algorithm-listed"}, msk:{status:"recommended",note:"Listed"}, mayo:{status:"recommended",note:"Listed"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
            { agent: "Platinum-based chemotherapy", brand: "Chemo", manufacturer: "Generic", nccnCategory: "other recommended",
              positions: { nccn:{status:"recommended",note:"Standard"}, va:{status:"recommended",note:"Standard"}, uhc:{status:"recommended",note:"On-pathway"}, anthem:{status:"recommended",note:"Standard"}, evicore:{status:"recommended",note:"PA approved"}, humana:{status:"recommended",note:"On-pathway"}, "us-oncology":{status:"recommended",note:"Standard"}, moffitt:{status:"recommended",note:"Standard"}, oneoncology:{status:"recommended",note:"Standard"}, clinicalpath:{status:"recommended",note:"Standard"}, eviti:{status:"recommended",note:"On-pathway"}, aetna:{status:"recommended",note:"On-pathway"}, mdanderson:{status:"recommended",note:"Algorithm-listed"}, msk:{status:"recommended",note:"Listed"}, mayo:{status:"recommended",note:"Listed"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
    {
        biomarker: "HER2 (ERBB2) mutation", line: "2L+",
        therapies: [
            { agent: "Trastuzumab deruxtecan", brand: "Enhertu", manufacturer: "Daiichi Sankyo / AstraZeneca", nccnCategory: "preferred",
              positions: { nccn:{status:"preferred",note:"Category 2A (DESTINY-Lung02)"}, va:{status:"preferred",note:"Preferred"}, uhc:{status:"preferred",note:"On-pathway"}, anthem:{status:"recommended",note:"Listed"}, evicore:{status:"preferred",note:"PA approved"}, humana:{status:"preferred",note:"On-pathway"}, "us-oncology":{status:"preferred",note:"Level I"}, moffitt:{status:"preferred",note:"Institutional"}, oneoncology:{status:"preferred",note:"Preferred"}, clinicalpath:{status:"preferred",note:"Preferred"}, eviti:{status:"preferred",note:"On-pathway"}, aetna:{status:"recommended",note:"Listed"}, mdanderson:{status:"preferred",note:"Algorithm-listed"}, msk:{status:"preferred",note:"Institutional"}, mayo:{status:"preferred",note:"Institutional"}, flatiron:{status:"recommended",note:"Moderate adoption"} } },
        ],
    },
];


// ── Clinical Trial Data ─────────────────────────────────────────────
const CLINICAL_DATA = {
    "Osimertinib": { trials: [
        { name:"FLAURA", phase:"Phase 3", design:"Osi vs erlotinib/gefitinib, 1L EGFR+", n:556, mPFS:"18.9 vs 10.2 mo", mOS:"38.6 vs 31.8 mo", ORR:"80% vs 76%", takeaway:"Established osimertinib as standard 1L EGFR therapy with OS benefit" },
    ]},
    "Osimertinib + carboplatin/pemetrexed": { trials: [
        { name:"FLAURA2", phase:"Phase 3", design:"Osi+chemo vs osi mono, 1L EGFR+", n:557, mPFS:"25.5 vs 16.7 mo", mOS:"NR vs NR", ORR:"83% vs 76%", takeaway:"Combo extends PFS by ~9mo vs osi mono; new preferred option for fit patients" },
    ]},
    "Amivantamab + lazertinib": { trials: [
        { name:"MARIPOSA", phase:"Phase 3", design:"Ami+laz vs osi, 1L EGFR ex19/L858R", n:1074, mPFS:"23.7 vs 16.6 mo", mOS:"NR", ORR:"86% vs 85%", takeaway:"PFS improvement over osi; first bispecific+TKI combo in 1L EGFR; higher toxicity" },
    ]},
    "Amivantamab + chemo + lazertinib": { trials: [
        { name:"PAPILLON", phase:"Phase 3", design:"Ami+chemo vs chemo, 1L EGFR ex20ins", n:308, mPFS:"11.4 vs 6.7 mo", mOS:"NR", ORR:"73% vs 47%", takeaway:"First targeted combo for EGFR ex20ins with significant PFS benefit" },
    ]},
    "Lorlatinib": { trials: [
        { name:"CROWN", phase:"Phase 3", design:"Lorlatinib vs crizotinib, 1L ALK+", n:296, mPFS:"NR vs 9.3 mo (5yr: 60% vs 8%)", mOS:"NR", ORR:"76% vs 58%", takeaway:"Unprecedented 5-year 60% PFS; reshaping ALK 1L landscape" },
    ]},
    "Alectinib": { trials: [
        { name:"ALEX", phase:"Phase 3", design:"Alectinib vs crizotinib, 1L ALK+", n:303, mPFS:"34.8 vs 10.9 mo", mOS:"NR", ORR:"83% vs 76%", takeaway:"Established alectinib as ALK 1L standard with CNS activity" },
    ]},
    "Brigatinib": { trials: [
        { name:"ALTA-1L", phase:"Phase 3", design:"Brigatinib vs crizotinib, 1L ALK+", n:275, mPFS:"24.0 vs 11.0 mo", mOS:"NR", ORR:"74% vs 62%", takeaway:"Effective 1L ALK option but competing with lorlatinib and alectinib" },
    ]},
    "Sotorasib": { trials: [
        { name:"CodeBreaK 200", phase:"Phase 3", design:"Sotorasib vs docetaxel, 2L+ KRAS G12C", n:345, mPFS:"5.6 vs 4.5 mo", mOS:"10.6 vs 11.3 mo", ORR:"28.1% vs 13.2%", takeaway:"First KRAS G12C inhibitor; modest PFS gain, oral administration advantage" },
    ]},
    "Adagrasib": { trials: [
        { name:"KRYSTAL-1", phase:"Phase 1/2", design:"Adagrasib monotherapy, 2L+ KRAS G12C", n:116, mPFS:"6.5 mo", mOS:"12.6 mo", ORR:"42.9%", takeaway:"Higher ORR than sotorasib in single-arm data; CNS activity demonstrated" },
    ]},
    "Pembrolizumab monotherapy": { trials: [
        { name:"KEYNOTE-024", phase:"Phase 3", design:"Pembro vs chemo, 1L PD-L1≥50%", n:305, mPFS:"10.3 vs 6.0 mo", mOS:"26.3 vs 13.4 mo", ORR:"45% vs 28%", takeaway:"Established pembro mono as standard for PD-L1≥50%; OS doubled" },
    ]},
    "Pembrolizumab + platinum/pemetrexed": { trials: [
        { name:"KEYNOTE-189", phase:"Phase 3", design:"Pembro+chemo vs chemo, 1L non-sq", n:616, mPFS:"9.0 vs 4.9 mo", mOS:"22.0 vs 10.6 mo", ORR:"48% vs 19%", takeaway:"All-PD-L1 benefit; backbone of 1L IO+chemo treatment" },
    ]},
    "Cemiplimab": { trials: [
        { name:"EMPOWER-Lung 1", phase:"Phase 3", design:"Cemiplimab vs chemo, 1L PD-L1≥50%", n:710, mPFS:"8.2 vs 5.7 mo", mOS:"26.1 vs 13.7 mo", ORR:"39% vs 20%", takeaway:"OS benefit in PD-L1≥50%; similar to pembro but lower pathway adoption" },
    ]},
    "Nivolumab + ipilimumab": { trials: [
        { name:"CheckMate 227", phase:"Phase 3", design:"Nivo+ipi vs chemo, 1L PD-L1≥1%", n:1189, mPFS:"5.1 vs 5.6 mo", mOS:"17.1 vs 14.9 mo (4yr: 29% vs 18%)", ORR:"36% vs 30%", takeaway:"OS benefit without PFS gain; chemo-free option for PD-L1≥1%" },
    ]},
    "Nivolumab + ipilimumab + chemo": { trials: [
        { name:"CheckMate 9LA", phase:"Phase 3", design:"Nivo+ipi+chemo vs chemo, 1L all PD-L1", n:719, mPFS:"6.7 vs 5.0 mo", mOS:"15.8 vs 11.0 mo", ORR:"38% vs 25%", takeaway:"IO triplet with broad PD-L1 benefit; competes with KN-189 on cost" },
    ]},
    "Datopotamab deruxtecan": { trials: [
        { name:"TROPION-Lung05", phase:"Phase 2", design:"Dato-DXd after osi+chemo, EGFR+", n:137, mPFS:"5.5 mo", mOS:"NR", ORR:"35.8%", takeaway:"New preferred 2L option post-osi; ADC approach for EGFR resistance" },
    ]},
    "Amivantamab + chemotherapy": { trials: [
        { name:"MARIPOSA-2", phase:"Phase 3", design:"Ami+chemo vs chemo, post-osi EGFR+", n:657, mPFS:"6.3 vs 4.2 mo", mOS:"NR", ORR:"NR", takeaway:"Modest PFS gain post-osi; competes with Dato-DXd in this setting" },
    ]},
    "Dabrafenib + trametinib": { trials: [
        { name:"BRF113928", phase:"Phase 2", design:"Dab+tram, 1L and 2L+ BRAF V600E", n:36, mPFS:"10.9 mo (2L)", mOS:"NR", ORR:"64% (2L), 64% (1L)", takeaway:"Established BRAF combo as standard; small but robust dataset" },
    ]},
    "Encorafenib + binimetinib": { trials: [
        { name:"PHAROS", phase:"Phase 2", design:"Enc+bin, 1L BRAF V600E NSCLC", n:59, mPFS:"17.2 mo", mOS:"NR", ORR:"75%", takeaway:"Strong ORR/PFS in 1L; potentially superior to dab+tram but limited data" },
    ]},
    "Selpercatinib": { trials: [
        { name:"LIBRETTO-431", phase:"Phase 3", design:"Selper vs chemo±pembro, 1L RET+", n:261, mPFS:"24.8 vs 11.2 mo", mOS:"NR", ORR:"84% vs 65%", takeaway:"Clear 1L superiority for RET+; established as preferred targeted therapy" },
    ]},
    "Pralsetinib": { trials: [
        { name:"ARROW", phase:"Phase 1/2", design:"Pralsetinib monotherapy, RET+ NSCLC", n:233, mPFS:"13.0 mo (2L+)", mOS:"NR", ORR:"72% (1L), 62% (2L+)", takeaway:"Effective RET inhibitor but single-arm data; competing with selpercatinib Ph3" },
    ]},
    "Capmatinib": { trials: [
        { name:"GEOMETRY mono-1", phase:"Phase 2", design:"Capmatinib mono, MET ex14 skip", n:97, mPFS:"12.4 mo (1L)", mOS:"NR", ORR:"68% (1L), 41% (2L+)", takeaway:"First MET inhibitor approved for MET ex14 skipping" },
    ]},
    "Tepotinib": { trials: [
        { name:"VISION", phase:"Phase 2", design:"Tepotinib mono, MET ex14 skip", n:152, mPFS:"11.1 mo", mOS:"17.6 mo", ORR:"46%", takeaway:"Once-daily oral MET inhibitor; competing with capmatinib" },
    ]},
    "Entrectinib": { trials: [
        { name:"STARTRK-2/pooled", phase:"Phase 1/2", design:"Entrectinib, ROS1+ NSCLC", n:161, mPFS:"13.6 mo", mOS:"NR", ORR:"67%", takeaway:"CNS-active ROS1 inhibitor; preferred alongside crizotinib" },
    ]},
    "Crizotinib": { trials: [
        { name:"PROFILE 1001", phase:"Phase 1", design:"Crizotinib, ROS1+ NSCLC", n:53, mPFS:"19.3 mo", mOS:"51.4 mo", ORR:"72%", takeaway:"First ROS1 therapy; long OS but mature data" },
    ]},
    "Repotrectinib": { trials: [
        { name:"TRIDENT-1", phase:"Phase 1/2", design:"Repotrectinib, ROS1+ NSCLC", n:426, mPFS:"35.7 mo (TKI-naive)", mOS:"NR", ORR:"79% (TKI-naive)", takeaway:"Impressive PFS in TKI-naive ROS1+; next-gen option" },
    ]},
    "Trastuzumab deruxtecan": { trials: [
        { name:"DESTINY-Lung02", phase:"Phase 2", design:"T-DXd, HER2-mutant NSCLC 2L+", n:152, mPFS:"9.9 mo", mOS:"19.5 mo", ORR:"49.0%", takeaway:"Best-in-class for HER2-mutant NSCLC; ADC approach" },
    ]},
    "Erlotinib": { trials: [
        { name:"EURTAC", phase:"Phase 3", design:"Erlotinib vs chemo, 1L EGFR+", n:174, mPFS:"9.7 vs 5.2 mo", mOS:"22.9 vs 19.5 mo", ORR:"58% vs 15%", takeaway:"First-gen EGFR TKI; superseded by osimertinib" },
    ]},
    "Carboplatin + paclitaxel + bevacizumab + atezolizumab": { trials: [
        { name:"IMpower150", phase:"Phase 3", design:"ABCP vs BCP, 1L non-sq", n:1202, mPFS:"8.3 vs 6.8 mo", mOS:"19.2 vs 14.7 mo", ORR:"63% vs 48%", takeaway:"4-drug combo; niche use for PD-L1<1% or liver mets" },
    ]},
    "Platinum-based chemotherapy": { trials: [
        { name:"Historical", phase:"Multiple", design:"Platinum doublet, 1L NSCLC", n:0, mPFS:"~4-5 mo", mOS:"~10-12 mo", ORR:"~25-35%", takeaway:"Historical standard; still backbone of combination regimens" },
    ]},
};


// ── Helper Functions ────────────────────────────────────────────────

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

const STATUS_RANK = { preferred: 4, recommended: 3, listed: 2, restricted: 1, "not listed": 0, unknown: -1 };

function getUniqueAgents() {
    const agents = new Map();
    THERAPY_PREFERENCES.forEach(seg => {
        seg.therapies.forEach(t => {
            if (!agents.has(t.agent)) {
                agents.set(t.agent, { agent: t.agent, brand: t.brand, manufacturer: t.manufacturer, biomarker: seg.biomarker, line: seg.line });
            }
        });
    });
    return [...agents.values()];
}

function getAgentSegments(agentName) {
    return THERAPY_PREFERENCES.filter(seg => seg.therapies.some(t => t.agent === agentName));
}

function getAgentTherapy(agentName, segment) {
    return segment.therapies.find(t => t.agent === agentName);
}

function getCompetitors(agentName) {
    const competitors = new Map();
    getAgentSegments(agentName).forEach(seg => {
        seg.therapies.forEach(t => {
            if (t.agent !== agentName && !competitors.has(t.agent)) {
                competitors.set(t.agent, { agent: t.agent, brand: t.brand, manufacturer: t.manufacturer, biomarker: seg.biomarker, line: seg.line });
            }
        });
    });
    return [...competitors.values()];
}

function computeAssetStats(agentName) {
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    let totalOn = 0, preferred = 0, deviations = 0;
    const segments = getAgentSegments(agentName);
    segments.forEach(seg => {
        const therapy = getAgentTherapy(agentName, seg);
        if (!therapy) return;
        const nccnStatus = therapy.positions.nccn ? therapy.positions.nccn.status : "unknown";
        institutions.forEach(inst => {
            const pos = therapy.positions[inst.id];
            if (pos && pos.status !== "unknown" && pos.status !== "not listed") totalOn++;
            if (pos && pos.status === "preferred") preferred++;
            if (pos && deviatesFromNCCN(nccnStatus, pos.status)) deviations++;
        });
    });
    const competitorCount = getCompetitors(agentName).length;
    return { totalOn, preferred, deviations, competitorCount };
}


// ── Populate Selectors ──────────────────────────────────────────────

function populateSelectors() {
    const selector = document.getElementById("asset-selector");
    const bioCtx = document.getElementById("biomarker-context");
    if (!selector) return;

    const agents = getUniqueAgents();
    const byBiomarker = {};
    agents.forEach(a => {
        const key = a.biomarker + " — " + a.line;
        if (!byBiomarker[key]) byBiomarker[key] = [];
        byBiomarker[key].push(a);
    });

    Object.keys(byBiomarker).forEach(key => {
        const group = document.createElement("optgroup");
        group.label = key;
        byBiomarker[key].forEach(a => {
            const opt = document.createElement("option");
            opt.value = a.agent;
            opt.textContent = `${a.brand} (${a.agent}) — ${a.manufacturer}`;
            group.appendChild(opt);
        });
        selector.appendChild(group);
    });

    const biomarkers = [...new Set(THERAPY_PREFERENCES.map(s => s.biomarker))];
    biomarkers.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        bioCtx.appendChild(opt);
    });
}

// ── Tab Navigation ──────────────────────────────────────────────────

function initTabs() {
    document.querySelectorAll(".pw-tab-btn").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".pw-tab-btn").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".pw-tab-panel").forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add("active");
        });
    });
}

// ── Render: Asset Stats ─────────────────────────────────────────────

function renderAssetStats(agentName) {
    const stats = computeAssetStats(agentName);
    document.getElementById("stat-pathways-on").textContent = stats.totalOn;
    document.getElementById("stat-preferred-count").textContent = stats.preferred;
    document.getElementById("stat-deviation-count").textContent = stats.deviations;
    document.getElementById("stat-deviation-count").style.color = stats.deviations > 0 ? "var(--danger,#dc2626)" : "";
    document.getElementById("stat-competitor-count").textContent = stats.competitorCount;
    document.getElementById("asset-stats-grid").style.display = "";
}

// ── Render: Spotlight Overview ──────────────────────────────────────

function renderSpotlightOverview(agentName) {
    const container = document.getElementById("spotlight-overview-content");
    if (!container) return;
    const agents = getUniqueAgents();
    const info = agents.find(a => a.agent === agentName);
    if (!info) { container.innerHTML = ""; return; }
    const clinical = CLINICAL_DATA[agentName];
    const segments = getAgentSegments(agentName);
    const segLabels = segments.map(s => `${s.biomarker} (${s.line})`).join(", ");

    let html = `<table class="asset-product-table"><tbody>
        <tr><td>Brand</td><td><strong>${esc(info.brand)}</strong></td></tr>
        <tr><td>Generic / Agent</td><td>${esc(info.agent)}</td></tr>
        <tr><td>Manufacturer</td><td>${esc(info.manufacturer)}</td></tr>
        <tr><td>Biomarker Segments</td><td>${esc(segLabels)}</td></tr>`;

    if (clinical && clinical.trials.length > 0) {
        const t = clinical.trials[0];
        html += `<tr><td>Pivotal Trial</td><td><strong>${esc(t.name)}</strong> (${esc(t.phase)})</td></tr>
        <tr><td>Trial Design</td><td>${esc(t.design)}</td></tr>
        <tr><td>Key Efficacy</td><td>mPFS: ${esc(t.mPFS)} | mOS: ${esc(t.mOS)} | ORR: ${esc(t.ORR)}</td></tr>
        <tr><td>Key Takeaway</td><td>${esc(t.takeaway)}</td></tr>`;
    }

    // NCCN status
    segments.forEach(seg => {
        const therapy = getAgentTherapy(agentName, seg);
        if (therapy && therapy.positions.nccn) {
            html += `<tr><td>NCCN (${esc(seg.biomarker)})</td><td>${statusIcon(therapy.positions.nccn.status)} ${esc(therapy.positions.nccn.note)}</td></tr>`;
        }
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ── Render: Spotlight Heatmap ───────────────────────────────────────

function renderSpotlightHeatmap(agentName) {
    const container = document.getElementById("spotlight-heatmap-content");
    if (!container) return;
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const segments = getAgentSegments(agentName);
    if (segments.length === 0) { container.innerHTML = '<p class="no-results">No data available.</p>'; return; }

    let html = `<div class="cmp-legend" style="margin-bottom:1rem;">
        <span class="cmp-legend-item">${statusIcon("preferred")} Preferred</span>
        <span class="cmp-legend-item">${statusIcon("recommended")} Recommended</span>
        <span class="cmp-legend-item">${statusIcon("listed")} Listed</span>
        <span class="cmp-legend-item">${statusIcon("not listed")} Not Listed</span>
        <span class="cmp-legend-item">${statusIcon("restricted")} Restricted</span>
        <span class="cmp-legend-item"><span class="cmp-deviation-marker-inline">Orange</span> = Deviates from NCCN</span>
    </div>`;

    html += `<div class="cmp-table-wrapper"><table class="asset-heatmap-table"><thead><tr><th style="text-align:left;">Segment</th><th>NCCN</th>`;
    institutions.forEach(i => { html += `<th title="${esc(i.fullName)}">${esc(i.name)}</th>`; });
    html += `</tr></thead><tbody>`;

    segments.forEach(seg => {
        const therapy = getAgentTherapy(agentName, seg);
        if (!therapy) return;
        const nccnPos = therapy.positions.nccn || { status: "unknown", note: "" };
        html += `<tr><td class="heatmap-agent-cell">${esc(seg.biomarker)} <span class="cmp-line-badge">${esc(seg.line)}</span></td>`;
        html += `<td>${statusIcon(nccnPos.status)}</td>`;
        institutions.forEach(inst => {
            const pos = therapy.positions[inst.id] || { status: "unknown", note: "" };
            const devClass = deviatesFromNCCN(nccnPos.status, pos.status) ? " cmp-deviation" : "";
            html += `<td class="${devClass}" title="${esc(inst.fullName)}: ${esc(pos.note)}">${statusIcon(pos.status)}</td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ── Render: Competitors Summary ─────────────────────────────────────

function renderSpotlightCompetitors(agentName) {
    const container = document.getElementById("spotlight-competitors-content");
    if (!container) return;
    const competitors = getCompetitors(agentName);
    const allAgents = [{ agent: agentName, ...getUniqueAgents().find(a => a.agent === agentName) }, ...competitors];
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");

    // Count statuses across all segments for each agent
    function countStatuses(aName) {
        const counts = { preferred: 0, recommended: 0, listed: 0, restricted: 0, "not listed": 0, unknown: 0 };
        getAgentSegments(aName).forEach(seg => {
            const therapy = getAgentTherapy(aName, seg);
            if (!therapy) return;
            institutions.forEach(inst => {
                const pos = therapy.positions[inst.id];
                if (pos) counts[pos.status] = (counts[pos.status] || 0) + 1;
            });
        });
        return counts;
    }

    // Summary cards
    let html = `<div class="competitor-summary-grid">`;
    allAgents.forEach(a => {
        const counts = countStatuses(a.agent);
        const isSelected = a.agent === agentName;
        const borderStyle = isSelected ? "border:2px solid var(--primary);" : "";
        html += `<div class="competitor-summary-card" style="${borderStyle}">
            <h4>${esc(a.brand || a.agent)}</h4>
            <div class="competitor-stat" style="color:var(--success);">${counts.preferred}</div>
            <div class="competitor-sublabel">Preferred</div>
            <div style="margin-top:0.3rem;font-size:0.78rem;color:var(--text-secondary);">
                R:${counts.recommended} L:${counts.listed} X:${counts.restricted}
            </div>
        </div>`;
    });
    html += `</div>`;

    // Detailed table
    html += `<table class="clinical-compare-table"><thead><tr><th>Agent</th><th>Brand</th><th>Manufacturer</th><th>NCCN</th><th style="color:var(--success);">Preferred</th><th>Recommended</th><th>Listed</th><th style="color:var(--danger);">Restricted/Not Listed</th></tr></thead><tbody>`;
    allAgents.forEach(a => {
        const counts = countStatuses(a.agent);
        const isSelected = a.agent === agentName;
        const rowClass = isSelected ? ' class="clinical-highlight-row"' : '';
        const segments = getAgentSegments(a.agent);
        const nccnStatus = segments.length > 0 ? (getAgentTherapy(a.agent, segments[0])?.positions.nccn?.status || "unknown") : "unknown";
        html += `<tr${rowClass}><td><strong>${esc(a.agent)}</strong></td><td>${esc(a.brand || "")}</td><td>${esc(a.manufacturer || "")}</td><td>${statusIcon(nccnStatus)}</td>
            <td class="clinical-best">${counts.preferred}</td><td>${counts.recommended}</td><td>${counts.listed}</td>
            <td class="clinical-worst">${counts.restricted + counts["not listed"]}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ── Render: Preference Matrix ───────────────────────────────────────

function renderPreferenceMatrix(agentName) {
    const container = document.getElementById("preference-matrix-content");
    if (!container) return;
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const segments = getAgentSegments(agentName);
    const bioFilter = document.getElementById("biomarker-context");
    const selectedBio = bioFilter ? bioFilter.value : "";
    const deviationToggle = document.getElementById("matrix-deviation-toggle");
    const showDeviationsOnly = deviationToggle ? deviationToggle.checked : false;

    let html = `<div class="cmp-legend" style="margin-bottom:1rem;">
        <span class="cmp-legend-item">${statusIcon("preferred")} Preferred</span>
        <span class="cmp-legend-item">${statusIcon("recommended")} Recommended</span>
        <span class="cmp-legend-item">${statusIcon("listed")} Listed</span>
        <span class="cmp-legend-item">${statusIcon("restricted")} Restricted</span>
        <span class="cmp-legend-item"><span class="cmp-deviation-marker-inline">Orange</span> = Deviates from NCCN</span>
        <span class="cmp-legend-item" style="background:rgba(239,68,68,0.1);padding:0.2rem 0.4rem;border-radius:3px;">Red bg = Competitor has better status</span>
    </div>`;

    let filteredSegments = segments;
    if (selectedBio) filteredSegments = filteredSegments.filter(s => s.biomarker === selectedBio);

    filteredSegments.forEach(seg => {
        let therapies = [...seg.therapies];
        // Sort: selected agent first
        therapies.sort((a, b) => (a.agent === agentName ? -1 : b.agent === agentName ? 1 : 0));

        if (showDeviationsOnly) {
            therapies = therapies.filter(t => {
                const nSt = t.positions.nccn ? t.positions.nccn.status : "unknown";
                return institutions.some(inst => { const p = t.positions[inst.id]; return p && deviatesFromNCCN(nSt, p.status); });
            });
        }
        if (therapies.length === 0) return;

        const selectedTherapy = seg.therapies.find(t => t.agent === agentName);
        html += `<div class="cmp-segment"><div class="cmp-segment-header"><span class="cmp-biomarker">${esc(seg.biomarker)}</span><span class="cmp-line-badge">${esc(seg.line)}</span></div>`;
        html += `<div class="cmp-table-wrapper"><table class="asset-heatmap-table"><thead><tr><th style="text-align:left;">Agent</th><th>NCCN</th>`;
        institutions.forEach(i => { html += `<th title="${esc(i.fullName)}">${esc(i.name)}</th>`; });
        html += `</tr></thead><tbody>`;

        therapies.forEach(t => {
            const isSelected = t.agent === agentName;
            const rowClass = isSelected ? "heatmap-highlight-row" : "";
            const nccnPos = t.positions.nccn || { status:"unknown", note:"" };
            html += `<tr class="${rowClass}"><td class="heatmap-agent-cell">${isSelected ? "<strong>" : ""}${esc(t.brand)}${isSelected ? "</strong>" : ""}<br><span style="font-size:0.75rem;color:#64748b;">${esc(t.manufacturer)}</span></td>`;
            html += `<td>${statusIcon(nccnPos.status)}</td>`;
            institutions.forEach(inst => {
                const pos = t.positions[inst.id] || { status:"unknown", note:"" };
                let cellClass = "";
                if (deviatesFromNCCN(nccnPos.status, pos.status)) cellClass = "cmp-deviation";
                // Highlight where competitor beats the selected asset
                if (!isSelected && selectedTherapy) {
                    const selectedPos = selectedTherapy.positions[inst.id];
                    if (selectedPos && (STATUS_RANK[pos.status] || 0) > (STATUS_RANK[selectedPos.status] || 0)) {
                        cellClass += " heatmap-worse";
                    }
                }
                html += `<td class="${cellClass}" title="${esc(inst.fullName)}: ${esc(pos.note)}">${statusIcon(pos.status)}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div></div>`;
    });

    if (!html || html.indexOf("cmp-segment") === -1) html = '<p class="no-results">No data for selected filters.</p>';
    container.innerHTML = html;
}

// ── Render: Positioning Insights ────────────────────────────────────

function renderPositioningInsights(agentName) {
    const container = document.getElementById("positioning-insights-content");
    if (!container) return;
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const segments = getAgentSegments(agentName);
    const stats = computeAssetStats(agentName);

    let html = "";
    // Deviation analysis
    const deviatingInst = [];
    segments.forEach(seg => {
        const therapy = getAgentTherapy(agentName, seg);
        if (!therapy) return;
        const nccnStatus = therapy.positions.nccn ? therapy.positions.nccn.status : "unknown";
        institutions.forEach(inst => {
            const pos = therapy.positions[inst.id];
            if (pos && deviatesFromNCCN(nccnStatus, pos.status)) {
                deviatingInst.push({ inst: inst.fullName, instName: inst.name, segment: seg.biomarker, nccn: nccnStatus, actual: pos.status, note: pos.note });
            }
        });
    });

    if (deviatingInst.length > 0) {
        html += `<div class="insight-card insight-card-negative"><h4>${deviatingInst.length} NCCN Deviations Detected</h4><p>The following pathways position <strong>${esc(agentName)}</strong> below its NCCN recommendation:</p><ul>`;
        deviatingInst.forEach(d => {
            html += `<li><strong>${esc(d.instName)}</strong> (${esc(d.segment)}): NCCN = ${esc(d.nccn)}, Actual = ${esc(d.actual)}${d.note ? " — " + esc(d.note) : ""}</li>`;
        });
        html += `</ul><p>Potential drivers: <strong>cost considerations</strong>, slower pathway update cycles, institutional inertia, or preference for established alternatives with longer real-world track records.</p></div>`;
    } else {
        html += `<div class="insight-card insight-card-positive"><h4>Full NCCN Alignment</h4><p><strong>${esc(agentName)}</strong> is positioned at or above its NCCN recommendation across all tracked pathways. This indicates strong evidence acceptance and no cost-driven restrictions.</p></div>`;
    }

    // Competitive insight
    const competitors = getCompetitors(agentName);
    if (competitors.length > 0) {
        const betterPositioned = [];
        const worsePositioned = [];
        competitors.forEach(comp => {
            let compBetter = 0, selectedBetter = 0;
            segments.forEach(seg => {
                const selT = getAgentTherapy(agentName, seg);
                const compT = getAgentTherapy(comp.agent, seg);
                if (!selT || !compT) return;
                institutions.forEach(inst => {
                    const selPos = selT.positions[inst.id];
                    const compPos = compT.positions[inst.id];
                    if (selPos && compPos) {
                        if ((STATUS_RANK[compPos.status]||0) > (STATUS_RANK[selPos.status]||0)) compBetter++;
                        if ((STATUS_RANK[selPos.status]||0) > (STATUS_RANK[compPos.status]||0)) selectedBetter++;
                    }
                });
            });
            if (compBetter > selectedBetter) betterPositioned.push({ ...comp, delta: compBetter - selectedBetter });
            else if (selectedBetter > compBetter) worsePositioned.push({ ...comp, delta: selectedBetter - compBetter });
        });

        if (betterPositioned.length > 0) {
            html += `<div class="insight-card insight-card-negative"><h4>Competitors with Superior Pathway Positioning</h4><ul>`;
            betterPositioned.sort((a,b) => b.delta - a.delta).forEach(c => {
                html += `<li><strong>${esc(c.brand || c.agent)}</strong> (${esc(c.manufacturer)}) — has better status in ${c.delta} more pathway slots</li>`;
            });
            html += `</ul></div>`;
        }
        if (worsePositioned.length > 0) {
            html += `<div class="insight-card insight-card-positive"><h4>Competitive Advantages</h4><ul>`;
            worsePositioned.sort((a,b) => b.delta - a.delta).forEach(c => {
                html += `<li>${esc(agentName)} has better status than <strong>${esc(c.brand || c.agent)}</strong> in ${c.delta} more pathway slots</li>`;
            });
            html += `</ul></div>`;
        }
    }

    if (!html) html = '<p class="no-results">Select an asset to view positioning insights.</p>';
    container.innerHTML = html;
}

// ── Render: Clinical Data Comparison ────────────────────────────────

function renderClinicalComparison(agentName) {
    const container = document.getElementById("clinical-comparison-content");
    if (!container) return;
    const competitors = getCompetitors(agentName);
    const allAgents = [agentName, ...competitors.map(c => c.agent)];

    let html = `<table class="clinical-compare-table"><thead><tr>
        <th>Agent</th><th>Trial</th><th>Phase</th><th>Design</th><th>N</th><th>mPFS</th><th>mOS</th><th>ORR</th><th>Key Takeaway</th>
    </tr></thead><tbody>`;

    allAgents.forEach(aName => {
        const data = CLINICAL_DATA[aName];
        const isSelected = aName === agentName;
        const rowClass = isSelected ? ' class="clinical-highlight-row"' : '';
        if (data && data.trials.length > 0) {
            data.trials.forEach(t => {
                html += `<tr${rowClass}>
                    <td><strong>${esc(aName)}</strong></td>
                    <td>${esc(t.name)}</td><td>${esc(t.phase)}</td><td style="max-width:200px;">${esc(t.design)}</td>
                    <td>${t.n || "—"}</td><td>${esc(t.mPFS)}</td><td>${esc(t.mOS)}</td><td>${esc(t.ORR)}</td>
                    <td style="max-width:250px;font-size:0.8rem;">${esc(t.takeaway)}</td>
                </tr>`;
            });
        } else {
            html += `<tr${rowClass}><td><strong>${esc(aName)}</strong></td><td colspan="8" style="color:#94a3b8;">No clinical data available</td></tr>`;
        }
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ── Render: Clinical-Pathway Correlation ────────────────────────────

function renderClinicalPathwayCorrelation(agentName) {
    const container = document.getElementById("clinical-pathway-correlation-content");
    if (!container) return;
    const competitors = getCompetitors(agentName);
    const allAgents = [agentName, ...competitors.map(c => c.agent)];
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const maxPathways = institutions.length * getAgentSegments(agentName).length;

    function getPreferredCount(aName) {
        let count = 0;
        getAgentSegments(aName).forEach(seg => {
            const t = getAgentTherapy(aName, seg);
            if (!t) return;
            institutions.forEach(inst => { if (t.positions[inst.id]?.status === "preferred") count++; });
        });
        return count;
    }

    let html = `<p style="margin-bottom:1rem;color:var(--text-secondary);">Compares clinical evidence strength with pathway preferred status. Mismatches may indicate non-clinical factors (cost, administration convenience, adoption inertia) influencing pathway decisions.</p>`;
    html += `<table class="correlation-table"><thead><tr><th>Agent</th><th>Trial Evidence</th><th>mPFS</th><th>Preferred Count</th><th>Pathway Adoption Bar</th><th>Evidence-Position Gap</th></tr></thead><tbody>`;

    allAgents.forEach(aName => {
        const data = CLINICAL_DATA[aName];
        const prefCount = getPreferredCount(aName);
        const isSelected = aName === agentName;
        const rowClass = isSelected ? ' class="clinical-highlight-row"' : '';
        const trial = data && data.trials[0] ? data.trials[0] : null;
        const barWidth = maxPathways > 0 ? Math.round((prefCount / maxPathways) * 100) : 0;

        // Simple gap indicator
        const nccnCat = getAgentSegments(aName).map(seg => getAgentTherapy(aName, seg)?.positions?.nccn?.status).filter(Boolean)[0] || "unknown";
        let gap = "—";
        if (nccnCat === "preferred" && prefCount < maxPathways * 0.5) gap = '<span style="color:var(--danger);">Under-represented</span>';
        else if (nccnCat === "preferred" && prefCount >= maxPathways * 0.8) gap = '<span style="color:var(--success);">Well-adopted</span>';
        else if (nccnCat === "preferred") gap = '<span style="color:#f59e0b;">Moderate adoption</span>';
        else if (nccnCat === "recommended") gap = '<span style="color:#64748b;">As expected</span>';

        html += `<tr${rowClass}><td><strong>${esc(aName)}</strong></td>
            <td>${trial ? esc(trial.name) : "—"}</td>
            <td>${trial ? esc(trial.mPFS) : "—"}</td>
            <td style="text-align:center;font-weight:600;">${prefCount}</td>
            <td><div style="display:flex;align-items:center;gap:0.5rem;"><span class="correlation-bar correlation-bar-preferred" style="width:${barWidth}%;"></span><span style="font-size:0.78rem;">${barWidth}%</span></div></td>
            <td>${gap}</td></tr>`;
    });
    html += `</tbody></table>`;

    // Add an insight about correlation
    const selectedPref = getPreferredCount(agentName);
    const maxCompPref = Math.max(...competitors.map(c => getPreferredCount(c.agent)), 0);
    if (selectedPref < maxCompPref) {
        html += `<div class="insight-card insight-card-neutral" style="margin-top:1rem;"><h4>Correlation Insight</h4><p>A competitor has more preferred pathway designations than <strong>${esc(agentName)}</strong> despite both having NCCN preferred status. This suggests pathway committees may be weighing factors beyond clinical data — such as <strong>formulary cost</strong>, <strong>administration burden</strong>, <strong>real-world experience</strong>, or <strong>first-mover advantage</strong>.</p></div>`;
    }

    container.innerHTML = html;
}

// ── Render: AI Analysis ─────────────────────────────────────────────

async function runAIAnalysis(agentName) {
    const statusEl = document.getElementById("ai-analysis-status");
    const contentEl = document.getElementById("ai-analysis-content");
    const progressBar = document.getElementById("ai-progress-bar");
    const analysisType = document.getElementById("ai-analysis-type").value;

    if (!agentName) { contentEl.innerHTML = '<p class="no-results">Please select an asset first.</p>'; return; }

    statusEl.style.display = "";
    contentEl.innerHTML = "";
    let progress = 0;
    const progressInterval = setInterval(() => { progress = Math.min(progress + 3, 90); progressBar.style.width = progress + "%"; }, 300);

    // Build context
    const info = getUniqueAgents().find(a => a.agent === agentName);
    const stats = computeAssetStats(agentName);
    const competitors = getCompetitors(agentName);
    const clinical = CLINICAL_DATA[agentName];
    const segments = getAgentSegments(agentName);

    let ctx = `Asset: ${agentName} (${info?.brand}) by ${info?.manufacturer}\n`;
    ctx += `Segments: ${segments.map(s => s.biomarker + " " + s.line).join(", ")}\n`;
    ctx += `Stats: ${stats.totalOn} pathway listings, ${stats.preferred} preferred, ${stats.deviations} deviations from NCCN, ${stats.competitorCount} competitors\n`;
    if (clinical?.trials[0]) {
        const t = clinical.trials[0];
        ctx += `Pivotal: ${t.name} — mPFS: ${t.mPFS}, mOS: ${t.mOS}, ORR: ${t.ORR}\n`;
    }
    ctx += `\nCompetitors:\n`;
    competitors.forEach(c => {
        const cd = CLINICAL_DATA[c.agent];
        const cStats = computeAssetStats(c.agent);
        ctx += `- ${c.agent} (${c.brand}) by ${c.manufacturer}: ${cStats.preferred} preferred, ${cStats.deviations} deviations`;
        if (cd?.trials[0]) ctx += ` | ${cd.trials[0].name}: mPFS ${cd.trials[0].mPFS}`;
        ctx += `\n`;
    });

    ctx += `\nPathway positions for ${agentName}:\n`;
    segments.forEach(seg => {
        const therapy = getAgentTherapy(agentName, seg);
        if (!therapy) return;
        ctx += `${seg.biomarker} ${seg.line}: `;
        PATHWAY_INSTITUTIONS.forEach(inst => {
            const pos = therapy.positions[inst.id];
            if (pos) ctx += `${inst.name}=${pos.status} `;
        });
        ctx += `\n`;
    });

    try {
        const resp = await fetch("/api/nsclc-ai-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent: agentName, analysisType, contextData: ctx }),
        });
        const data = await resp.json();
        clearInterval(progressInterval);
        progressBar.style.width = "100%";
        setTimeout(() => { statusEl.style.display = "none"; }, 500);

        const modelBadge = data.model ? `<span class="ai-model-badge">${esc(data.model)}</span>` : "";
        // Simple markdown-to-HTML
        let text = data.analysis || "No analysis returned.";
        text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
        text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
        text = text.replace(/^# (.+)$/gm, "<h2>$1</h2>");
        text = text.replace(/^- (.+)$/gm, "<li>$1</li>");
        text = text.replace(/(<li>.*<\/li>)/gs, (match) => "<ul>" + match + "</ul>");
        text = text.replace(/<\/ul>\s*<ul>/g, "");
        text = text.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");
        text = text.replace(/\n\n/g, "</p><p>");
        text = "<p>" + text + "</p>";

        contentEl.innerHTML = `${modelBadge}<div class="ai-analysis-output">${text}</div>`;
    } catch (err) {
        clearInterval(progressInterval);
        statusEl.style.display = "none";
        contentEl.innerHTML = `<div class="insight-card insight-card-negative"><h4>Analysis Error</h4><p>${esc(err.message || "Could not reach the AI analysis endpoint. Ensure the server is running.")}</p></div>`;
    }
}

// ── CSV Export ───────────────────────────────────────────────────────

function exportMatrixCSV(agentName) {
    const institutions = PATHWAY_INSTITUTIONS.filter(i => i.id !== "nccn");
    const segments = getAgentSegments(agentName);
    const headers = ["Biomarker", "Line", "Agent", "Brand", "Manufacturer", "NCCN", ...institutions.map(i => i.name)];
    const rows = [headers.join(",")];
    segments.forEach(seg => {
        seg.therapies.forEach(t => {
            const nccn = t.positions.nccn?.status || "unknown";
            const cols = [`"${seg.biomarker}"`, seg.line, `"${t.agent}"`, `"${t.brand}"`, `"${t.manufacturer}"`, nccn];
            institutions.forEach(inst => { cols.push(t.positions[inst.id]?.status || "unknown"); });
            rows.push(cols.join(","));
        });
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `nsclc_asset_${agentName.replace(/[^a-z0-9]/gi,"_")}.csv`; a.click();
    URL.revokeObjectURL(url);
}

// ── Main Update Function ────────────────────────────────────────────

function updateAll(agentName) {
    if (!agentName) {
        document.getElementById("main-tabs").style.display = "none";
        document.querySelectorAll(".pw-tab-panel").forEach(p => p.style.display = "none");
        document.getElementById("asset-stats-grid").style.display = "none";
        return;
    }
    document.getElementById("main-tabs").style.display = "";
    document.querySelectorAll(".pw-tab-panel").forEach(p => p.style.display = "");
    // Ensure first tab is active
    document.querySelectorAll(".pw-tab-btn")[0]?.click();

    renderAssetStats(agentName);
    renderSpotlightOverview(agentName);
    renderSpotlightHeatmap(agentName);
    renderSpotlightCompetitors(agentName);
    renderPreferenceMatrix(agentName);
    renderPositioningInsights(agentName);
    renderClinicalComparison(agentName);
    renderClinicalPathwayCorrelation(agentName);
    // Reset AI tab
    document.getElementById("ai-analysis-content").innerHTML = '<p class="no-results">Click "Run Analysis" to generate AI-powered strategic insights for the selected asset.</p>';
}

// ── Event Listeners & Init ──────────────────────────────────────────

document.getElementById("asset-selector").addEventListener("change", (e) => { updateAll(e.target.value); });
document.getElementById("biomarker-context").addEventListener("change", () => {
    const agentName = document.getElementById("asset-selector").value;
    if (agentName) renderPreferenceMatrix(agentName);
});
document.getElementById("matrix-deviation-toggle").addEventListener("change", () => {
    const agentName = document.getElementById("asset-selector").value;
    if (agentName) renderPreferenceMatrix(agentName);
});
document.getElementById("matrix-export-csv").addEventListener("click", () => {
    const agentName = document.getElementById("asset-selector").value;
    if (agentName) exportMatrixCSV(agentName);
});
document.getElementById("ai-run-analysis").addEventListener("click", () => {
    const agentName = document.getElementById("asset-selector").value;
    runAIAnalysis(agentName);
});

populateSelectors();
initTabs();
