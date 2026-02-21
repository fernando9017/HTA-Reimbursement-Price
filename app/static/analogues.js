/**
 * Analogue Selection module — Frontend logic.
 *
 * Filters EMA medicines by therapeutic area, orphan status, approval date, etc.
 * Depends on shared.js for: esc, showStatus, hideStatus
 */

// ── DOM Elements ──────────────────────────────────────────────────────

const filterAreaInput = document.getElementById("filter-area-input");
const filterAreaDropdown = document.getElementById("filter-area-dropdown");
const filterAreaTags = document.getElementById("filter-area-tags");
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
const filterMonitoring = document.getElementById("filter-monitoring");
const analogueSearchBtn = document.getElementById("analogue-search-btn");
const analogueResetBtn = document.getElementById("analogue-reset-btn");
const analogueStatus = document.getElementById("analogue-status");
const analogueResultsDiv = document.getElementById("analogue-results");

// ── State ─────────────────────────────────────────────────────────────

let allTherapeuticAreas = [];
let selectedAreas = [];
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

        allTherapeuticAreas = data.therapeutic_areas || [];

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

// ── Therapeutic Area multi-select ─────────────────────────────────────

function renderAreaDropdown(filter) {
    const lower = (filter || "").toLowerCase();
    const available = allTherapeuticAreas.filter(
        a => !selectedAreas.includes(a) && (!lower || a.toLowerCase().includes(lower))
    );
    if (available.length === 0 || !filterAreaInput.matches(":focus")) {
        filterAreaDropdown.classList.add("hidden");
        return;
    }
    filterAreaDropdown.innerHTML = available.map(a =>
        `<div class="area-option" data-value="${esc(a)}">${esc(a)}</div>`
    ).join("");
    filterAreaDropdown.classList.remove("hidden");
}

function renderAreaTags() {
    filterAreaTags.innerHTML = selectedAreas.map(a =>
        `<span class="area-tag">${esc(a)} <button type="button" class="area-tag-remove" data-value="${esc(a)}">&times;</button></span>`
    ).join("");
}

function addArea(area) {
    if (!selectedAreas.includes(area)) {
        selectedAreas.push(area);
        renderAreaTags();
    }
    filterAreaInput.value = "";
    filterAreaDropdown.classList.add("hidden");
}

function removeArea(area) {
    selectedAreas = selectedAreas.filter(a => a !== area);
    renderAreaTags();
}

filterAreaInput.addEventListener("input", () => renderAreaDropdown(filterAreaInput.value));
filterAreaInput.addEventListener("focus", () => renderAreaDropdown(filterAreaInput.value));

filterAreaDropdown.addEventListener("mousedown", (e) => {
    // Use mousedown to fire before blur hides the dropdown
    const opt = e.target.closest(".area-option");
    if (opt) {
        e.preventDefault();
        addArea(opt.dataset.value);
    }
});

filterAreaInput.addEventListener("blur", () => {
    // Delay to allow click on dropdown option
    setTimeout(() => filterAreaDropdown.classList.add("hidden"), 150);
});

filterAreaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        // If there's exactly one visible option, select it
        const visible = filterAreaDropdown.querySelectorAll(".area-option");
        if (visible.length === 1) {
            addArea(visible[0].dataset.value);
        } else if (visible.length === 0 && filterAreaInput.value.trim() === "") {
            searchAnalogues();
        }
    }
    if (e.key === "Backspace" && filterAreaInput.value === "" && selectedAreas.length > 0) {
        removeArea(selectedAreas[selectedAreas.length - 1]);
    }
});

filterAreaTags.addEventListener("click", (e) => {
    const btn = e.target.closest(".area-tag-remove");
    if (btn) removeArea(btn.dataset.value);
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

    // Disease & Epidemiology — multiple therapeutic areas
    if (selectedAreas.length > 0) {
        selectedAreas.forEach(a => params.append("therapeutic_area", a));
    }
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
    if (filterMonitoring.value) params.set("additional_monitoring", filterMonitoring.value);
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
    selectedAreas = [];
    renderAreaTags();
    filterAreaInput.value = "";
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
    filterMonitoring.value = "";
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
                    <th>Therapeutic Area</th>
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
    if (med.additional_monitoring) tags.push('<span class="tag tag-monitoring">Black Triangle</span>');
    if (med.generic) tags.push('<span class="tag tag-generic">Generic</span>');
    if (med.biosimilar) tags.push('<span class="tag tag-biosimilar">Biosimilar</span>');

    const nameCell = med.url
        ? `<a href="${esc(med.url)}" target="_blank" rel="noopener">${esc(med.name)}</a>`
        : esc(med.name);

    const prevalenceTag = med.prevalence_category
        ? `<span class="tag tag-prevalence-${med.prevalence_category}">${esc(med.prevalence_category)}</span>`
        : "";

    return `
        <tr>
            <td class="col-name">${nameCell}</td>
            <td>${esc(med.active_substance)}</td>
            <td class="col-mah">${esc(med.marketing_authorisation_holder)}</td>
            <td class="col-area">${esc(med.therapeutic_area)}</td>
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
        "Medicine", "Active Substance", "MAH", "Therapeutic Area",
        "Auth. Date", "Prevalence", "Orphan", "1st Approval",
        "New Active Substance", "Conditional Approval",
        "Accelerated Assessment", "Exceptional Circumstances",
        "Additional Monitoring", "Generic", "Biosimilar",
        "ATC Code", "Authorisation Status", "Therapeutic Indication",
    ];

    const rows = lastSearchResults.map(med => [
        med.name,
        med.active_substance,
        med.marketing_authorisation_holder,
        med.therapeutic_area,
        med.authorisation_date,
        med.prevalence_category,
        med.orphan_medicine ? "Yes" : "No",
        med.first_approval ? "Yes" : "No",
        med.new_active_substance ? "Yes" : "No",
        med.conditional_approval ? "Yes" : "No",
        med.accelerated_assessment ? "Yes" : "No",
        med.exceptional_circumstances ? "Yes" : "No",
        med.additional_monitoring ? "Yes" : "No",
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
