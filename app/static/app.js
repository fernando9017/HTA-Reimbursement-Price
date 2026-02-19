/**
 * HTA Assessment Finder — Frontend Application
 *
 * Two modules:
 *   1. HTA & Reimbursement: Search medicine → View EMA indications → Select country → View assessments
 *   2. Analogue Selection:  Filter EMA medicines by therapeutic area, orphan status, approval date, etc.
 */

// ── State ────────────────────────────────────────────────────────────

let analogueFiltersLoaded = false;

// ── DOM Elements — Analogue Module ───────────────────────────────────

const filterBroadArea = document.getElementById("filter-broad-area");
const filterSubcategory = document.getElementById("filter-subcategory");
const filterArea = document.getElementById("filter-area"); // hidden legacy
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
const filterMoleculeType = document.getElementById("filter-molecule-type");
const filterRoute = document.getElementById("filter-route");
const filterMoA = document.getElementById("filter-moa");
const analogueSearchBtn = document.getElementById("analogue-search-btn");
const analogueResetBtn = document.getElementById("analogue-reset-btn");
const analogueStatus = document.getElementById("analogue-status");
const analogueResultsDiv = document.getElementById("analogue-results");

// Taxonomy data (populated on load)
let therapeuticTaxonomy = [];
// Last analogue search results (for Excel export)
let lastAnalogueResults = null;

// ═══════════════════════════════════════════════════════════════════════
//  ANALOGUE SELECTION
// ═══════════════════════════════════════════════════════════════════════

// Load filters immediately on page load
loadAnalogueFilters();

async function loadAnalogueFilters() {
    try {
        const resp = await fetch("/api/analogues/filters");
        if (!resp.ok) {
            showStatus(analogueStatus, "Failed to load filter options. Data may still be loading.", "error");
            return;
        }
        const data = await resp.json();

        // Store taxonomy for cascading subcategory updates
        therapeuticTaxonomy = data.therapeutic_taxonomy || [];

        // Populate broad therapeutic area categories
        filterBroadArea.innerHTML = '<option value="">All therapeutic areas</option>' +
            therapeuticTaxonomy.map(cat => `<option value="${esc(cat.name)}">${esc(cat.name)}</option>`).join("");

        // Wire up cascading: when broad area changes, update subcategory options
        filterBroadArea.addEventListener("change", updateSubcategoryOptions);

        // Populate statuses
        filterStatus.innerHTML = '<option value="">All statuses</option>' +
            data.statuses.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

        // Populate MAHs (companies)
        filterMAH.innerHTML = '<option value="">All companies</option>' +
            data.mahs.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("");

        // Populate ATC prefixes
        filterATC.innerHTML = '<option value="">All ATC codes</option>' +
            data.atc_prefixes.map(a => `<option value="${esc(a.code)}">${esc(a.label)}</option>`).join("");

        // Populate molecule type autocomplete (text input with datalist)
        if (data.molecule_types && filterMoleculeType) {
            populateDatalist(filterMoleculeType, "molecule-type-datalist", data.molecule_types);
        }

        // Populate route autocomplete (text input with datalist)
        if (data.routes_of_administration && filterRoute) {
            populateDatalist(filterRoute, "route-datalist", data.routes_of_administration);
        }

        // Populate MoA autocomplete (text input with datalist)
        if (data.moa_classes && filterMoA) {
            populateDatalist(filterMoA, "moa-datalist", data.moa_classes);
        }

        analogueFiltersLoaded = true;
    } catch {
        showStatus(analogueStatus, "Failed to load filter options. Please try again.", "error");
    }
}

function updateSubcategoryOptions() {
    const selectedBroad = filterBroadArea.value;
    if (!selectedBroad) {
        filterSubcategory.innerHTML = '<option value="">Select a category first</option>';
        filterSubcategory.disabled = true;
        return;
    }

    const category = therapeuticTaxonomy.find(c => c.name === selectedBroad);
    const subs = category ? category.subcategories : [];

    if (subs.length === 0) {
        filterSubcategory.innerHTML = '<option value="">No subcategories available</option>';
        filterSubcategory.disabled = true;
    } else {
        filterSubcategory.innerHTML = '<option value="">All subcategories</option>' +
            subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
        filterSubcategory.disabled = false;
    }
}

analogueSearchBtn.addEventListener("click", searchAnalogues);
analogueResetBtn.addEventListener("click", resetAnalogueFilters);
filterSubstance.addEventListener("keydown", e => {
    if (e.key === "Enter") searchAnalogues();
});
filterIndication.addEventListener("keydown", e => {
    if (e.key === "Enter") searchAnalogues();
});
filterMoA.addEventListener("keydown", e => {
    if (e.key === "Enter") searchAnalogues();
});

async function searchAnalogues() {
    const params = new URLSearchParams();

    // Therapeutic Area (hierarchical)
    if (filterBroadArea.value) params.set("broad_therapeutic_area", filterBroadArea.value);
    if (filterSubcategory.value) params.set("therapeutic_subcategory", filterSubcategory.value);
    if (filterIndication.value.trim()) params.set("indication_keyword", filterIndication.value.trim());
    if (filterSubstance.value.trim()) params.set("substance", filterSubstance.value.trim());
    // Molecule Type & Route
    if (filterMoleculeType && filterMoleculeType.value.trim()) params.set("molecule_type", filterMoleculeType.value.trim());
    if (filterRoute && filterRoute.value.trim()) params.set("route_of_administration", filterRoute.value.trim());
    if (filterMoA && filterMoA.value.trim()) params.set("moa_class", filterMoA.value.trim());
    // Approval & Classification
    if (filterPrevalence.value) params.set("prevalence_category", filterPrevalence.value);
    if (filterOrphan.value) params.set("orphan", filterOrphan.value);
    if (filterYears.value !== "0") params.set("years", filterYears.value);
    if (filterFirst.value) params.set("first_approval", filterFirst.value);
    // Advanced
    if (filterATC.value) params.set("atc_code", filterATC.value);
    if (filterMAH.value) params.set("mah", filterMAH.value);
    if (filterNewSubstance.value) params.set("new_active_substance", filterNewSubstance.value);
    if (filterStatus.value) params.set("status", filterStatus.value);
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
        renderAnalogueResults(data);
    } catch (err) {
        showStatus(analogueStatus, `Error: ${err.message}`, "error");
    }
}

function resetAnalogueFilters() {
    // Therapeutic Area
    filterBroadArea.value = "";
    filterSubcategory.innerHTML = '<option value="">Select a category first</option>';
    filterSubcategory.disabled = true;
    filterIndication.value = "";
    filterSubstance.value = "";
    // Molecule Type & Route
    if (filterMoleculeType) filterMoleculeType.value = "";
    if (filterRoute) filterRoute.value = "";
    if (filterMoA) filterMoA.value = "";
    // Approval & Classification
    filterPrevalence.value = "";
    filterOrphan.value = "";
    filterYears.value = "0";
    filterFirst.value = "";
    // Advanced
    filterArea.value = "";
    filterATC.value = "";
    filterMAH.value = "";
    filterNewSubstance.value = "";
    filterStatus.value = "";
    filterConditional.value = "";
    filterExceptional.value = "";
    filterAccelerated.value = "";
    // Exclusions
    filterExclGenerics.checked = false;
    filterExclBiosimilars.checked = false;
    hideStatus(analogueStatus);
    analogueResultsDiv.innerHTML = "";
}

function renderAnalogueResults(data) {
    if (data.total === 0) {
        showStatus(analogueStatus, "No medicines found matching your criteria. Try adjusting the filters.", "info");
        analogueResultsDiv.innerHTML = "";
        lastAnalogueResults = null;
        return;
    }

    hideStatus(analogueStatus);
    lastAnalogueResults = data.results;

    const header = `
        <div class="results-header">
            <p class="results-summary">
                Found <strong>${data.total}</strong> medicine(s) matching your criteria
            </p>
            <button class="btn-export" id="export-excel-btn" title="Download as Excel">Download Excel</button>
        </div>
    `;

    const table = `
        <div class="analogue-table-wrapper">
        <table class="analogue-table">
            <thead>
                <tr>
                    <th>Medicine</th>
                    <th>Active Substance</th>
                    <th>Indication</th>
                    <th>Therapeutic Area</th>
                    <th>Type / Route</th>
                    <th>Auth. Date</th>
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

    // Bind export button
    const exportBtn = document.getElementById("export-excel-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportAnalogueExcel);
    }
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

    // Show hierarchical area: "Oncology > Lung Cancer" or just "Oncology"
    let areaDisplay = esc(med.broad_therapeutic_area || med.therapeutic_area || "");
    if (med.therapeutic_subcategory) {
        areaDisplay += `<span class="subcategory-label"> &rsaquo; ${esc(med.therapeutic_subcategory)}</span>`;
    }

    // Molecule type + route display
    let typeRouteDisplay = "";
    if (med.molecule_type) {
        typeRouteDisplay += `<span class="tag tag-molecule-type">${esc(med.molecule_type)}</span>`;
    }
    if (med.route_of_administration) {
        typeRouteDisplay += `<span class="tag tag-route">${esc(med.route_of_administration)}</span>`;
    }
    if (med.moa_class) {
        typeRouteDisplay += `<span class="moa-label" title="${esc(med.moa_class)}">${esc(med.moa_class)}</span>`;
    }

    // Indication: truncate long text, show full on hover
    const indicationFull = med.therapeutic_indication || "";
    const indicationShort = indicationFull.length > 150
        ? indicationFull.substring(0, 150) + "..."
        : indicationFull;

    return `
        <tr>
            <td class="col-name">${nameCell}</td>
            <td>${esc(med.active_substance)}</td>
            <td class="col-indication" title="${esc(indicationFull)}">${esc(indicationShort)}</td>
            <td class="col-area">${areaDisplay}</td>
            <td class="col-type-route">${typeRouteDisplay}</td>
            <td class="col-date">${esc(med.authorisation_date)}</td>
            <td class="col-tags">${tags.join(" ")}</td>
        </tr>
    `;
}

// ── Excel Export ─────────────────────────────────────────────────────

function exportAnalogueExcel() {
    if (!lastAnalogueResults || lastAnalogueResults.length === 0) return;
    if (typeof XLSX === "undefined") {
        alert("Excel library failed to load. Please check your internet connection and refresh.");
        return;
    }

    const rows = lastAnalogueResults.map(med => ({
        "Medicine Name": med.name,
        "Active Substance": med.active_substance,
        "Therapeutic Indication": med.therapeutic_indication || "",
        "Broad Therapeutic Area": med.broad_therapeutic_area || "",
        "Therapeutic Subcategory": med.therapeutic_subcategory || "",
        "Therapeutic Area (EMA)": med.therapeutic_area || "",
        "Molecule Type": med.molecule_type || "",
        "Route of Administration": med.route_of_administration || "",
        "Mechanism of Action": med.moa_class || "",
        "Authorisation Date": med.authorisation_date || "",
        "Authorisation Status": med.authorisation_status || "",
        "EMA Number": med.ema_number || "",
        "ATC Code": med.atc_code || "",
        "Marketing Authorisation Holder": med.marketing_authorisation_holder || "",
        "Orphan Medicine": med.orphan_medicine ? "Yes" : "No",
        "Prevalence Category": med.prevalence_category || "",
        "First Approval": med.first_approval ? "Yes" : "No",
        "New Active Substance": med.new_active_substance ? "Yes" : "No",
        "Generic": med.generic ? "Yes" : "No",
        "Biosimilar": med.biosimilar ? "Yes" : "No",
        "Conditional Approval": med.conditional_approval ? "Yes" : "No",
        "Exceptional Circumstances": med.exceptional_circumstances ? "Yes" : "No",
        "Accelerated Assessment": med.accelerated_assessment ? "Yes" : "No",
        "Medicine Type": med.medicine_type || "",
        "EMA URL": med.url || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns based on header + content width
    const colWidths = Object.keys(rows[0]).map(key => {
        const maxLen = Math.max(
            key.length,
            ...rows.map(r => (r[key] || "").toString().length)
        );
        return { wch: Math.min(maxLen + 2, 60) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analogues");
    XLSX.writeFile(wb, "analogue_selection.xlsx");
}

// ═══════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════

function showStatus(el, message, type) {
    el.textContent = message;
    el.className = `status-msg ${type}`;
    el.classList.remove("hidden");
}

function hideStatus(el) {
    el.classList.add("hidden");
}

/** Attach a <datalist> to a text input for autocomplete suggestions. */
function populateDatalist(input, datalistId, values) {
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
        datalist = document.createElement("datalist");
        datalist.id = datalistId;
        input.setAttribute("list", datalistId);
        input.parentNode.appendChild(datalist);
    }
    datalist.innerHTML = values.map(v => `<option value="${esc(v)}">`).join("");
}

function esc(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
