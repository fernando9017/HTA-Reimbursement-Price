/**
 * Analogue Selection module — Frontend logic.
 *
 * Filters EMA medicines by therapeutic category, orphan status, approval date, etc.
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
const analogueSearchBtn = document.getElementById("analogue-search-btn");
const analogueResetBtn = document.getElementById("analogue-reset-btn");
const analogueStatus = document.getElementById("analogue-status");
const analogueResultsDiv = document.getElementById("analogue-results");

// ── State ─────────────────────────────────────────────────────────────

let therapeuticTaxonomy = []; // [{category, subcategories: [...]}]
let lastSearchResults = [];

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
    // Regulatory Pathway
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (filterYears.value !== "0") params.set("years", filterYears.value);
    if (filterFirst.value) params.set("first_approval", filterFirst.value);
    if (filterConditional.value) params.set("conditional_approval", filterConditional.value);
    if (filterExceptional.value) params.set("exceptional_circumstances", filterExceptional.value);
    if (filterAccelerated.value) params.set("accelerated_assessment", filterAccelerated.value);
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

    const header = `
        <div class="results-header">
            <p class="results-summary">
                Found <strong>${data.total}</strong> medicine(s) matching your criteria
            </p>
            <button class="btn-export" id="export-excel-btn" title="Export results to Excel">Export to Excel</button>
        </div>
    `;

    const table = `
        <div class="analogue-table-wrapper">
        <table class="analogue-table">
            <thead>
                <tr>
                    <th>Medicine</th>
                    <th>Active Substance</th>
                    <th>MAH</th>
                    <th>Category</th>
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

    document.getElementById("export-excel-btn").addEventListener("click", exportToExcel);
}

function renderAnalogueRow(med) {
    const tags = [];
    if (med.orphan_medicine) tags.push('<span class="tag tag-orphan">Orphan</span>');
    if (med.first_approval) tags.push('<span class="tag tag-first">1st Approval</span>');
    if (med.new_active_substance) tags.push('<span class="tag tag-new-substance">New Substance</span>');
    if (med.conditional_approval) tags.push('<span class="tag tag-conditional">Conditional</span>');
    if (med.accelerated_assessment) tags.push('<span class="tag tag-accelerated">Accelerated</span>');
    if (med.exceptional_circumstances) tags.push('<span class="tag tag-exceptional">Exceptional</span>');
    if (med.generic) tags.push('<span class="tag tag-generic">Generic</span>');
    if (med.biosimilar) tags.push('<span class="tag tag-biosimilar">Biosimilar</span>');

    const nameCell = med.url
        ? `<a href="${esc(med.url)}" target="_blank" rel="noopener">${esc(med.name)}</a>`
        : esc(med.name);

    const prevalenceTag = med.prevalence_category
        ? `<span class="tag tag-prevalence-${med.prevalence_category}">${esc(med.prevalence_category)}</span>`
        : "";

    // Show category + subcategory
    const categoryLabel = med.therapeutic_subcategory
        ? `${esc(med.therapeutic_category)} — ${esc(med.therapeutic_subcategory)}`
        : esc(med.therapeutic_category);

    return `
        <tr>
            <td class="col-name">${nameCell}</td>
            <td>${esc(med.active_substance)}</td>
            <td class="col-mah">${esc(med.marketing_authorisation_holder)}</td>
            <td class="col-area">${categoryLabel}</td>
            <td class="col-date">${esc(med.authorisation_date)}</td>
            <td>${prevalenceTag}</td>
            <td class="col-tags">${tags.join(" ")}</td>
        </tr>
    `;
}

// ── Excel Export ──────────────────────────────────────────────────────

function exportToExcel() {
    if (lastSearchResults.length === 0) return;

    const headers = [
        "Medicine", "Active Substance", "MAH",
        "Therapeutic Category", "Therapeutic Sub-category", "Therapeutic Area (EMA)",
        "Auth. Date", "Prevalence", "Orphan", "1st Approval",
        "New Active Substance", "Conditional Approval",
        "Accelerated Assessment", "Exceptional Circumstances",
        "Generic", "Biosimilar",
        "ATC Code", "Authorisation Status", "Therapeutic Indication",
    ];

    const rows = lastSearchResults.map(med => [
        med.name,
        med.active_substance,
        med.marketing_authorisation_holder,
        med.therapeutic_category,
        med.therapeutic_subcategory,
        med.therapeutic_area,
        med.authorisation_date,
        med.prevalence_category,
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
        med.therapeutic_indication,
    ]);

    // Build Excel XML (SpreadsheetML) for native .xls opening
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<?mso-application progid="Excel.Sheet"?>\n' +
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
        '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
        '<Styles>\n' +
        '  <Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#EAF2F8" ss:Pattern="Solid"/></Style>\n' +
        '</Styles>\n' +
        '<Worksheet ss:Name="Analogue Selection">\n<Table>\n';

    const escXml = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const headerRow = "<Row>" + headers.map(h =>
        `<Cell ss:StyleID="hdr"><Data ss:Type="String">${escXml(h)}</Data></Cell>`
    ).join("") + "</Row>\n";

    const dataRows = rows.map(row =>
        "<Row>" + row.map(cell =>
            `<Cell><Data ss:Type="String">${escXml(cell)}</Data></Cell>`
        ).join("") + "</Row>\n"
    ).join("");

    const xmlFooter = "</Table>\n</Worksheet>\n</Workbook>";
    const xml = xmlHeader + headerRow + dataRows + xmlFooter;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analogue_selection_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
