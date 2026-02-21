/**
 * Analogue Selection module — Frontend logic.
 *
 * Filters EMA medicines by therapeutic category, orphan status, approval date,
 * line of therapy, treatment setting, evidence tier, HTA outcomes, and more.
 * Depends on shared.js for: esc, showStatus, hideStatus
 */

// ── DOM Elements ──────────────────────────────────────────────────────

const filterCategory = document.getElementById("filter-category");
const filterSubcategory = document.getElementById("filter-subcategory");
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
const filterLoT = document.getElementById("filter-lot");
const filterSetting = document.getElementById("filter-setting");
const filterEvidence = document.getElementById("filter-evidence");
const filterHTA = document.getElementById("filter-hta");
const analogueSearchBtn = document.getElementById("analogue-search-btn");
const analogueResetBtn = document.getElementById("analogue-reset-btn");
const analogueStatus = document.getElementById("analogue-status");
const analogueResultsDiv = document.getElementById("analogue-results");

// ── State ─────────────────────────────────────────────────────────────

let therapeuticTaxonomy = []; // [{category, subcategories: [...]}]
let lastSearchResults = [];

// HTA country code → display label
const HTA_LABELS = {
    FR: "HAS (France)",
    DE: "G-BA (Germany)",
    GB: "NICE (UK)",
    ES: "AEMPS (Spain)",
    JP: "PMDA (Japan)",
};

// ── Init ──────────────────────────────────────────────────────────────

loadAnalogueFilters();

async function loadAnalogueFilters() {
    try {
        const resp = await fetch("/api/analogues/filters");
        if (!resp.ok) {
            showStatus(analogueStatus, "Failed to load filter options. Data may still be loading.", "error");
            return;
        }
        const data = await resp.json();

        // Therapeutic taxonomy (cascading dropdowns)
        therapeuticTaxonomy = data.therapeutic_taxonomy || [];
        filterCategory.innerHTML = '<option value="">All therapeutic areas</option>' +
            therapeuticTaxonomy.map(t => `<option value="${esc(t.category)}">${esc(t.category)}</option>`).join("");

        filterStatus.innerHTML = '<option value="">All statuses</option>' +
            data.statuses.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

        filterMAH.innerHTML = '<option value="">All companies</option>' +
            data.mahs.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("");

        filterATC.innerHTML = '<option value="">All ATC codes</option>' +
            data.atc_prefixes.map(a => `<option value="${esc(a.code)}">${esc(a.label)}</option>`).join("");

        // Line of therapy
        if (data.lines_of_therapy && data.lines_of_therapy.length > 0) {
            filterLoT.innerHTML = '<option value="">Any line of therapy</option>' +
                data.lines_of_therapy.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join("");
        }

        // Treatment setting
        if (data.treatment_settings && data.treatment_settings.length > 0) {
            filterSetting.innerHTML = '<option value="">Any setting</option>' +
                data.treatment_settings.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
        }

        // Evidence tier
        if (data.evidence_tiers && data.evidence_tiers.length > 0) {
            filterEvidence.innerHTML = '<option value="">Any evidence tier</option>' +
                data.evidence_tiers.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
        }

        // HTA country filter
        if (data.hta_countries && data.hta_countries.length > 0) {
            filterHTA.innerHTML = '<option value="">Any (no HTA filter)</option>' +
                data.hta_countries.map(c => {
                    const label = HTA_LABELS[c] || c;
                    return `<option value="${esc(c)}">Assessed by ${esc(label)}</option>`;
                }).join("");
        }
    } catch {
        showStatus(analogueStatus, "Failed to load filter options. Please try again.", "error");
    }
}

// ── Cascading therapeutic area dropdowns ──────────────────────────────

filterCategory.addEventListener("change", () => {
    const selected = filterCategory.value;
    if (!selected) {
        filterSubcategory.innerHTML = '<option value="">Select a therapeutic area first</option>';
        filterSubcategory.disabled = true;
        return;
    }

    const match = therapeuticTaxonomy.find(t => t.category === selected);
    const subs = match ? match.subcategories : [];

    if (subs.length === 0) {
        filterSubcategory.innerHTML = '<option value="">No sub-categories</option>';
        filterSubcategory.disabled = true;
    } else {
        filterSubcategory.innerHTML = '<option value="">All sub-categories</option>' +
            subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
        filterSubcategory.disabled = false;
    }
});

// ── Event listeners ───────────────────────────────────────────────────

analogueSearchBtn.addEventListener("click", searchAnalogues);
analogueResetBtn.addEventListener("click", resetAnalogueFilters);
filterSubstance.addEventListener("keydown", e => {
    if (e.key === "Enter") searchAnalogues();
});
filterIndication.addEventListener("keydown", e => {
    if (e.key === "Enter") searchAnalogues();
});

// ── Search ────────────────────────────────────────────────────────────

async function searchAnalogues() {
    const params = new URLSearchParams();

    // Disease & Epidemiology — cascading therapeutic area
    if (filterCategory.value) params.set("therapeutic_category", filterCategory.value);
    if (filterSubcategory.value) params.set("therapeutic_subcategory", filterSubcategory.value);
    if (filterPrevalence.value) params.set("prevalence_category", filterPrevalence.value);
    if (filterOrphan.value) params.set("orphan", filterOrphan.value);
    if (filterIndication.value.trim()) params.set("indication_keyword", filterIndication.value.trim());
    // Product Classification
    if (filterATC.value) params.set("atc_code", filterATC.value);
    if (filterSubstance.value.trim()) params.set("substance", filterSubstance.value.trim());
    if (filterMAH.value) params.set("mah", filterMAH.value);
    if (filterNewSubstance.value) params.set("new_active_substance", filterNewSubstance.value);
    // Treatment Context
    if (filterLoT.value) params.set("line_of_therapy", filterLoT.value);
    if (filterSetting.value) params.set("treatment_setting", filterSetting.value);
    // Regulatory Pathway & Evidence
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (filterYears.value !== "0") params.set("years", filterYears.value);
    if (filterFirst.value) params.set("first_approval", filterFirst.value);
    if (filterConditional.value) params.set("conditional_approval", filterConditional.value);
    if (filterExceptional.value) params.set("exceptional_circumstances", filterExceptional.value);
    if (filterAccelerated.value) params.set("accelerated_assessment", filterAccelerated.value);
    if (filterEvidence.value) params.set("evidence_tier", filterEvidence.value);
    if (filterHTA.value) params.set("hta_country", filterHTA.value);
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
        lastSearchResults = data.results || [];
        renderAnalogueResults(data);
    } catch (err) {
        showStatus(analogueStatus, `Error: ${err.message}`, "error");
    }
}

function resetAnalogueFilters() {
    filterCategory.value = "";
    filterSubcategory.innerHTML = '<option value="">Select a therapeutic area first</option>';
    filterSubcategory.disabled = true;
    filterPrevalence.value = "";
    filterOrphan.value = "";
    filterIndication.value = "";
    filterATC.value = "";
    filterSubstance.value = "";
    filterMAH.value = "";
    filterNewSubstance.value = "";
    filterStatus.value = "";
    filterYears.value = "0";
    filterFirst.value = "";
    filterConditional.value = "";
    filterExceptional.value = "";
    filterAccelerated.value = "";
    filterLoT.value = "";
    filterSetting.value = "";
    filterEvidence.value = "";
    filterHTA.value = "";
    filterExclGenerics.checked = false;
    filterExclBiosimilars.checked = false;
    hideStatus(analogueStatus);
    analogueResultsDiv.innerHTML = "";
    lastSearchResults = [];
}

// ── Render ────────────────────────────────────────────────────────────

function renderAnalogueResults(data) {
    if (data.total === 0) {
        showStatus(analogueStatus, "No medicines found matching your criteria. Try adjusting the filters.", "info");
        analogueResultsDiv.innerHTML = "";
        return;
    }

    hideStatus(analogueStatus);

    // Check if any results have HTA data
    const hasHTA = data.results.some(m => m.hta_summaries && m.hta_summaries.length > 0);
    // Check if we're showing per-indication rows
    const hasIndicationSegments = data.results.some(m => m.indication_segment);

    const header = `
        <div class="results-header">
            <p class="results-summary">
                Found <strong>${data.total}</strong> result(s) matching your criteria
            </p>
            <button class="btn-export" id="export-excel-btn" title="Export results to CSV (opens in Excel)">Export to CSV</button>
        </div>
    `;

    const table = `
        <div class="analogue-table-wrapper">
        <table class="analogue-table">
            <thead>
                <tr>
                    <th>Medicine</th>
                    <th>Active Substance</th>
                    ${hasIndicationSegments ? '<th>Matching Indication</th>' : '<th>Indication</th>'}
                    <th>MAH</th>
                    <th>Auth. Date</th>
                    <th>LoT / Setting</th>
                    <th>Evidence</th>
                    ${hasHTA ? '<th>HTA Outcomes</th>' : ''}
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody>
                ${data.results.map(med => renderAnalogueRow(med, hasHTA, hasIndicationSegments)).join("")}
            </tbody>
        </table>
        </div>
    `;

    analogueResultsDiv.innerHTML = header + table;

    document.getElementById("export-excel-btn").addEventListener("click", exportToExcel);
}

function renderAnalogueRow(med, hasHTA, hasIndicationSegments) {
    const tags = [];
    if (med.orphan_medicine) tags.push('<span class="tag tag-orphan">Orphan</span>');
    if (med.first_approval) tags.push('<span class="tag tag-first">1st Approval</span>');
    if (med.new_active_substance) tags.push('<span class="tag tag-new-substance">New Substance</span>');
    if (med.conditional_approval) tags.push('<span class="tag tag-conditional">Conditional</span>');
    if (med.accelerated_assessment) tags.push('<span class="tag tag-accelerated">Accelerated</span>');
    if (med.exceptional_circumstances) tags.push('<span class="tag tag-exceptional">Exceptional</span>');
    if (med.generic) tags.push('<span class="tag tag-generic">Generic</span>');
    if (med.biosimilar) tags.push('<span class="tag tag-biosimilar">Biosimilar</span>');

    // Product name — clickable to EMA page
    const nameCell = med.url
        ? `<a href="${esc(med.url)}" target="_blank" rel="noopener" title="View on EMA">${esc(med.name)}</a>`
        : esc(med.name);

    // Indication column
    let indicationCell;
    if (hasIndicationSegments && med.indication_segment) {
        indicationCell = `<td class="col-indication">${esc(med.indication_segment)}</td>`;
    } else {
        // Show truncated full indication with tooltip
        const full = med.therapeutic_indication || "";
        const truncated = full.length > 120 ? full.substring(0, 120) + "..." : full;
        indicationCell = `<td class="col-indication" title="${esc(full)}">${esc(truncated)}</td>`;
    }

    // Line of therapy & treatment setting
    const lotParts = [];
    if (med.line_of_therapy && med.line_of_therapy.length > 0) {
        med.line_of_therapy.forEach(l => lotParts.push(`<span class="tag tag-lot">${esc(l)}</span>`));
    }
    if (med.treatment_setting && med.treatment_setting.length > 0) {
        med.treatment_setting.forEach(s => lotParts.push(`<span class="tag tag-setting">${esc(s)}</span>`));
    }
    const lotCell = lotParts.length > 0 ? lotParts.join(" ") : '<span class="text-muted">-</span>';

    // Evidence tier
    const evidenceCell = med.evidence_tier
        ? `<span class="tag tag-evidence-${evidenceTierClass(med.evidence_tier)}">${esc(med.evidence_tier)}</span>`
        : '<span class="text-muted">-</span>';

    // HTA outcomes column
    let htaCell = "";
    if (hasHTA) {
        if (med.hta_summaries && med.hta_summaries.length > 0) {
            const htaTags = med.hta_summaries.map(h => {
                const label = h.agency || h.country_code;
                const rating = h.rating || "Assessed";
                const detail = h.rating_detail ? ` (${h.rating_detail})` : "";
                const cssClass = htaRatingClass(h.country_code, h.rating);
                return `<span class="tag tag-hta ${cssClass}" title="${esc(label)}: ${esc(rating)}${esc(detail)}">${esc(label)}: ${esc(rating)}</span>`;
            }).join(" ");
            htaCell = `<td class="col-hta">${htaTags}</td>`;
        } else {
            htaCell = '<td class="col-hta"><span class="text-muted">No HTA data</span></td>';
        }
    }

    return `
        <tr>
            <td class="col-name">${nameCell}</td>
            <td>${esc(med.active_substance)}</td>
            ${indicationCell}
            <td class="col-mah">${esc(med.marketing_authorisation_holder)}</td>
            <td class="col-date">${esc(med.authorisation_date)}</td>
            <td class="col-lot">${lotCell}</td>
            <td class="col-evidence">${evidenceCell}</td>
            ${htaCell}
            <td class="col-tags">${tags.join(" ")}</td>
        </tr>
    `;
}

// ── HTA rating CSS class helpers ──────────────────────────────────────

function htaRatingClass(countryCode, rating) {
    if (!rating) return "hta-unknown";
    const r = rating.toLowerCase();
    if (countryCode === "FR") {
        if (r.includes("insuffisant")) return "hta-negative";
        if (r.includes("faible")) return "hta-low";
        if (r.includes("modéré") || r.includes("modere")) return "hta-moderate";
        return "hta-positive";
    }
    if (countryCode === "DE") {
        if (r.includes("kein") || r.includes("geringerer")) return "hta-negative";
        if (r.includes("gering") && !r.includes("geringerer")) return "hta-low";
        if (r.includes("nicht quantifizierbar")) return "hta-moderate";
        return "hta-positive";
    }
    if (countryCode === "GB") {
        if (r.includes("not recommended")) return "hta-negative";
        if (r.includes("terminated")) return "hta-negative";
        if (r.includes("restrictions") || r.includes("optimised")) return "hta-moderate";
        if (r.includes("recommended")) return "hta-positive";
        return "hta-unknown";
    }
    return "hta-unknown";
}

function evidenceTierClass(tier) {
    const t = tier.toLowerCase();
    if (t.includes("conditional")) return "conditional";
    if (t.includes("exceptional")) return "exceptional";
    if (t.includes("accelerated")) return "accelerated";
    if (t.includes("orphan")) return "orphan";
    return "standard";
}

// ── Excel Export ──────────────────────────────────────────────────────

function exportToExcel() {
    if (lastSearchResults.length === 0) return;

    const headers = [
        "Medicine", "Active Substance", "Indication", "Indication (matched segment)", "MAH",
        "Therapeutic Category", "Therapeutic Sub-category", "Therapeutic Area (EMA)",
        "Auth. Date", "Prevalence",
        "Line of Therapy", "Treatment Setting", "Evidence Tier",
        "Orphan", "1st Approval",
        "New Active Substance", "Conditional Approval",
        "Accelerated Assessment", "Exceptional Circumstances",
        "Generic", "Biosimilar",
        "ATC Code", "Authorisation Status",
        "HTA FR (HAS)", "HTA DE (G-BA)", "HTA GB (NICE)",
        "EMA URL",
    ];

    const rows = lastSearchResults.map(med => {
        // Extract HTA summaries by country
        const htaFR = (med.hta_summaries || []).find(h => h.country_code === "FR");
        const htaDE = (med.hta_summaries || []).find(h => h.country_code === "DE");
        const htaGB = (med.hta_summaries || []).find(h => h.country_code === "GB");
        const htaStr = (h) => h ? `${h.rating}${h.rating_detail ? ' (' + h.rating_detail + ')' : ''}` : "";

        return [
            med.name,
            med.active_substance,
            med.therapeutic_indication,
            med.indication_segment || "",
            med.marketing_authorisation_holder,
            med.therapeutic_category,
            med.therapeutic_subcategory,
            med.therapeutic_area,
            med.authorisation_date,
            med.prevalence_category,
            (med.line_of_therapy || []).join("; "),
            (med.treatment_setting || []).join("; "),
            med.evidence_tier || "",
            med.orphan_medicine ? "Yes" : "No",
            med.first_approval ? "Yes" : "No",
            med.new_active_substance ? "Yes" : "No",
            med.conditional_approval ? "Yes" : "No",
            med.accelerated_assessment ? "Yes" : "No",
            med.exceptional_circumstances ? "Yes" : "No",
            med.generic ? "Yes" : "No",
            med.biosimilar ? "Yes" : "No",
            med.atc_code,
            med.authorisation_status,
            htaStr(htaFR),
            htaStr(htaDE),
            htaStr(htaGB),
            med.url || "",
        ];
    });

    // RFC 4180 CSV with UTF-8 BOM so Excel opens with correct encoding
    const csvField = (v) => {
        const s = String(v ?? "");
        // Quote any field that contains a comma, double-quote, or newline
        if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };

    const lines = [headers, ...rows].map(row => row.map(csvField).join(","));
    const csv = "\uFEFF" + lines.join("\r\n"); // UTF-8 BOM so Excel auto-detects encoding

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analogue_selection_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
