/**
 * HTA Assessment Finder — Frontend Application
 *
 * Module 1 — HTA & Reimbursement:
 *   Search medicine → Select indication → Choose country → View assessments
 *   Clicking an indication auto-fetches assessments for that specific indication.
 *   France (HAS) and Germany (G-BA) show an English-language translated summary.
 *
 * Module 2 — Analogue Selection:
 *   Filter EMA medicines by therapeutic area, orphan status, approval date, etc.
 */

// ── State ────────────────────────────────────────────────────────────

let selectedMedicine = null;
let selectedIndication = null;  // null = all indications
let countries = [];
let analogueFiltersLoaded = false;
let therapeuticTaxonomy = [];
let lastAnalogueResults = null;

// ── DOM Elements — Module navigation ─────────────────────────────────

const moduleTabs = document.querySelectorAll(".module-tab");
const moduleHTA = document.getElementById("module-hta");
const moduleAnalogues = document.getElementById("module-analogues");

// ── DOM Elements — HTA Module ────────────────────────────────────────

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchStatus = document.getElementById("search-status");
const searchResults = document.getElementById("search-results");

const medicineSection = document.getElementById("medicine-section");
const medicineDetails = document.getElementById("medicine-details");

const assessmentSection = document.getElementById("assessment-section");
const countrySelect = document.getElementById("country-select");
const findAssessmentsBtn = document.getElementById("find-assessments-btn");
const assessmentStatus = document.getElementById("assessment-status");
const assessmentResults = document.getElementById("assessment-results");

// ── DOM Elements — Analogue Module ───────────────────────────────────

const filterBroadArea = document.getElementById("filter-broad-area");
const filterSubcategory = document.getElementById("filter-subcategory");
const filterArea = document.getElementById("filter-area");
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

// ═══════════════════════════════════════════════════════════════════════
//  MODULE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════

moduleTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.module;
        moduleTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        moduleHTA.classList.toggle("hidden", target !== "hta");
        moduleAnalogues.classList.toggle("hidden", target !== "analogues");
        if (target === "analogues" && !analogueFiltersLoaded) {
            loadAnalogueFilters();
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════
//  MODULE 1: HTA & REIMBURSEMENT
// ═══════════════════════════════════════════════════════════════════════

// ── Init ─────────────────────────────────────────────────────────────

async function init() {
    try {
        const resp = await fetch("/api/countries");
        countries = await resp.json();
        countrySelect.innerHTML = countries
            .map(c => `<option value="${c.code}">${c.name} (${c.agency})</option>`)
            .join("");
    } catch {
        countrySelect.innerHTML = '<option value="FR">France (HAS)</option>';
    }
}

init();

// ── Search ───────────────────────────────────────────────────────────

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") doSearch();
});

async function doSearch() {
    const query = searchInput.value.trim();
    if (query.length < 2) {
        showStatus(searchStatus, "Please enter at least 2 characters.", "info");
        return;
    }

    showStatus(searchStatus, "Searching EMA database...", "loading");
    searchResults.classList.add("hidden");
    medicineSection.classList.add("hidden");
    assessmentSection.classList.add("hidden");
    selectedMedicine = null;
    selectedIndication = null;

    try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${resp.status})`);
        }
        const medicines = await resp.json();
        renderSearchResults(medicines);
    } catch (err) {
        showStatus(searchStatus, `Error: ${err.message}`, "error");
    }
}

function renderSearchResults(medicines) {
    if (medicines.length === 0) {
        showStatus(searchStatus, "No medicines found. Try a different name or substance.", "info");
        searchResults.classList.add("hidden");
        return;
    }

    hideStatus(searchStatus);
    searchResults.classList.remove("hidden");

    searchResults.innerHTML = medicines
        .map((med, i) => `
            <div class="result-item" data-index="${i}">
                <div class="med-name">${esc(med.name)}</div>
                <div class="med-substance">${esc(med.active_substance)}</div>
                ${med.authorisation_status
                    ? `<span class="med-status">${esc(med.authorisation_status)}</span>`
                    : ""}
            </div>
        `)
        .join("");

    searchResults._medicines = medicines;

    searchResults.querySelectorAll(".result-item").forEach(item => {
        item.addEventListener("click", () => {
            const idx = parseInt(item.dataset.index);
            selectMedicine(searchResults._medicines[idx], item);
        });
    });
}

function selectMedicine(medicine, element) {
    searchResults.querySelectorAll(".result-item").forEach(el => el.classList.remove("selected"));
    element.classList.add("selected");
    selectedMedicine = medicine;
    selectedIndication = null;
    renderMedicineDetails(medicine);
}

// ── Medicine details & indication selection ──────────────────────────

function renderMedicineDetails(med) {
    medicineSection.classList.remove("hidden");
    assessmentSection.classList.remove("hidden");
    assessmentResults.classList.add("hidden");
    hideStatus(assessmentStatus);

    const indicationText = med.therapeutic_indication || "";
    const indications = splitIndications(indicationText, med.name);

    let indicationsHTML;
    if (indications.length <= 1) {
        // Single indication — show as plain text
        indicationsHTML = `
            <div class="indication-text">${esc(indicationText || "No indication text available.")}</div>
            <p class="indication-hint">Use the country selector below to find assessments.</p>
        `;
    } else {
        // Multiple indications — selectable cards that auto-trigger assessment fetch
        indicationsHTML = `
            <p class="indication-prompt">
                Select an indication to filter HTA assessments — clicking will auto-load results for the chosen country:
            </p>
            <div class="indication-list">
                <div class="indication-item indication-all selected" data-index="-1">
                    <span class="indication-label">All indications</span>
                </div>
                ${indications.map((ind, i) => `
                    <div class="indication-item" data-index="${i}">
                        <span class="indication-number">${i + 1}</span>
                        <span class="indication-label">${esc(ind)}</span>
                    </div>
                `).join("")}
            </div>
        `;
    }

    medicineDetails.innerHTML = `
        <div class="medicine-header">
            <div>
                <div class="name">${esc(med.name)}</div>
                <div class="substance">${esc(med.active_substance)}</div>
            </div>
            ${med.ema_number ? `<span class="med-status">${esc(med.ema_number)}</span>` : ""}
        </div>
        ${indicationsHTML}
    `;

    if (indications.length > 1) {
        medicineDetails._indications = indications;
        medicineDetails.querySelectorAll(".indication-item").forEach(item => {
            item.addEventListener("click", () => {
                medicineDetails.querySelectorAll(".indication-item").forEach(el => el.classList.remove("selected"));
                item.classList.add("selected");
                const idx = parseInt(item.dataset.index);
                selectedIndication = idx === -1 ? null : indications[idx];
                // Auto-fetch assessments when an indication is selected
                findAssessments();
            });
        });
    }

    medicineSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Split a multi-indication EMA text into individual indication strings.
 *
 * EMA indication text uses the product name to start each new indication,
 * separated by a newline (and usually a period at the end of the previous one).
 *
 * For example, Padcev:
 *   "Padcev in combination with pembrolizumab is indicated for...\n
 *    Padcev as monotherapy is indicated for..."
 */
function splitIndications(text, productName) {
    if (!text || !text.trim()) return [];

    // Normalize line endings
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

    // 1. Try splitting on double newlines (clean paragraph separation)
    let parts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    // 2. Try splitting on a newline immediately followed by the product name
    //    e.g. "...urothelial cancer.\nPadcev as monotherapy..."
    if (productName) {
        const escaped = escRegex(productName);
        const reNewline = new RegExp(`\n(?=${escaped}\\b)`, "gi");
        parts = text.split(reNewline).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return parts;

        // 3. Try splitting on ". ProductName" (period + any whitespace + product name)
        const rePeriod = new RegExp(`\\.\\s+(?=${escaped}\\b)`, "gi");
        parts = text.split(rePeriod).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return parts;
    }

    // 4. Try splitting on dash-separated sub-indications
    parts = text.split(/\n\s*[-–]\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    // Single indication
    return [text];
}

/** Escape a string for use in a RegExp. */
function escRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Assessments ──────────────────────────────────────────────────────

findAssessmentsBtn.addEventListener("click", findAssessments);

async function findAssessments() {
    if (!selectedMedicine) {
        showStatus(assessmentStatus, "Please select a medicine first.", "info");
        return;
    }

    const countryCode = countrySelect.value;
    const substance = selectedMedicine.active_substance;
    const product = selectedMedicine.name;

    showStatus(assessmentStatus, `Searching ${countryName(countryCode)} assessments...`, "loading");
    assessmentResults.classList.add("hidden");

    try {
        const params = new URLSearchParams({ substance, product });
        if (selectedIndication) {
            params.set("indication", selectedIndication);
        }
        const resp = await fetch(`/api/assessments/${countryCode}?${params}`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${resp.status})`);
        }
        const data = await resp.json();
        renderAssessments(data);
    } catch (err) {
        showStatus(assessmentStatus, `Error: ${err.message}`, "error");
    }
}

function renderAssessments(data) {
    if (data.assessments.length === 0) {
        showStatus(
            assessmentStatus,
            `No assessments found for "${selectedMedicine.active_substance}" in ${data.country_name} (${data.agency}).`,
            "info"
        );
        assessmentResults.classList.add("hidden");
        return;
    }

    hideStatus(assessmentStatus);
    assessmentResults.classList.remove("hidden");

    const indicationNote = selectedIndication
        ? `<p class="indication-filter-note">Filtered to indication: <em>${esc(selectedIndication.substring(0, 120))}${selectedIndication.length > 120 ? "…" : ""}</em></p>`
        : "";

    assessmentResults.innerHTML = `
        <p style="margin-bottom:4px;color:var(--text-light);font-size:0.9rem;">
            Found <strong>${data.assessments.length}</strong> assessment(s) from
            <strong>${esc(data.agency)}</strong> (${esc(data.country_name)})
        </p>
        ${indicationNote}
        ${data.assessments.map(a => renderSingleAssessment(a, data.country_code)).join("")}
    `;

    assessmentResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSingleAssessment(a, countryCode) {
    // France (HAS) badges
    const smrBadge = a.smr_value
        ? `<span class="badge badge-smr ${smrClass(a.smr_value)}">
            <span class="label">SMR:</span> ${esc(a.smr_value)}
           </span>`
        : "";

    const asmrBadge = a.asmr_value
        ? `<span class="badge badge-asmr">
            <span class="label">ASMR:</span> ${esc(a.asmr_value)}
           </span>`
        : "";

    // Germany (G-BA) badges
    const benefitBadge = a.benefit_rating
        ? `<span class="badge badge-benefit ${benefitClass(a.benefit_rating)}">
            <span class="label">Zusatznutzen:</span> ${esc(a.benefit_rating)}
           </span>`
        : "";

    const evidenceBadge = a.evidence_level
        ? `<span class="badge badge-evidence">
            <span class="label">Evidence:</span> ${esc(a.evidence_level)}
           </span>`
        : "";

    const comparatorBadge = a.comparator
        ? `<span class="badge badge-comparator">
            <span class="label">vs.</span> ${esc(a.comparator)}
           </span>`
        : "";

    // UK (NICE) badges
    const niceRecBadge = a.nice_recommendation
        ? `<span class="badge badge-nice-rec ${niceRecClass(a.nice_recommendation)}">
            <span class="label">NICE:</span> ${esc(a.nice_recommendation)}
           </span>`
        : "";

    const guidanceRefBadge = a.guidance_reference
        ? `<span class="badge badge-guidance-ref">${esc(a.guidance_reference)}</span>`
        : "";

    // Spain (AEMPS) badges
    const iptBadge = a.therapeutic_positioning
        ? `<span class="badge badge-ipt ${iptClass(a.therapeutic_positioning)}">
            <span class="label">IPT:</span> ${esc(a.therapeutic_positioning)}
           </span>`
        : "";

    const iptRefBadge = a.ipt_reference
        ? `<span class="badge badge-ipt-ref">${esc(a.ipt_reference)}</span>`
        : "";

    // Japan (PMDA) badges
    const pmdaBadge = a.pmda_review_type
        ? `<span class="badge badge-pmda">
            <span class="label">PMDA:</span> ${esc(a.pmda_review_type)}
           </span>`
        : "";

    // Link label
    const isGermany = !!a.benefit_rating;
    const isNICE = !!a.nice_recommendation || !!a.guidance_reference;
    const isSpain = !!a.therapeutic_positioning || !!a.ipt_reference;
    const isJapan = !!a.pmda_review_type;
    const linkText = isNICE ? "View on NICE"
        : isGermany ? "View on G-BA"
        : isSpain ? "View IPT on AEMPS"
        : isJapan ? "View on PMDA"
        : "View full assessment on HAS";
    const link = a.assessment_url
        ? `<a class="assessment-link" href="${esc(a.assessment_url)}" target="_blank" rel="noopener">${linkText} &rarr;</a>`
        : "";

    // Descriptions (SMR/ASMR for France, benefit for Germany)
    const smrDesc = a.smr_description
        ? `<div class="assessment-desc"><strong>SMR detail:</strong> ${esc(a.smr_description)}</div>`
        : "";
    const asmrDesc = a.asmr_description
        ? `<div class="assessment-desc"><strong>ASMR detail:</strong> ${esc(a.asmr_description)}</div>`
        : "";
    const benefitDesc = a.benefit_rating_description && a.benefit_rating_description !== a.benefit_rating
        ? `<div class="assessment-desc">${esc(a.benefit_rating_description)}</div>`
        : "";
    const patientGroup = a.patient_group
        ? `<div class="assessment-patient-group"><strong>Patient group:</strong> ${esc(a.patient_group)}</div>`
        : "";

    // English translated summary (France and Germany)
    const summaryEn = a.summary_en
        ? `<div class="assessment-summary-en">
            <span class="summary-en-label">English summary:</span>
            ${esc(a.summary_en)}
           </div>`
        : "";

    return `
        <div class="assessment-card">
            <div class="assessment-header">
                <span class="product-name">${esc(a.product_name)}</span>
                <span class="opinion-date">${esc(a.opinion_date)}</span>
            </div>
            ${a.evaluation_reason ? `<div class="reason">${esc(a.evaluation_reason)}</div>` : ""}
            ${patientGroup}
            <div class="rating-badges">
                ${smrBadge}${asmrBadge}${benefitBadge}${evidenceBadge}
                ${comparatorBadge}${niceRecBadge}${guidanceRefBadge}
                ${iptBadge}${iptRefBadge}${pmdaBadge}
            </div>
            ${summaryEn}
            ${smrDesc}${asmrDesc}${benefitDesc}
            ${link}
        </div>
    `;
}

// ── Rating classification helpers ────────────────────────────────────

function smrClass(value) {
    const v = value.toLowerCase();
    if (v.includes("insuffisant")) return "insufficient";
    if (v.includes("faible")) return "low";
    if (v.includes("modéré") || v.includes("modere")) return "moderate";
    return "";  // default green = Important
}

function benefitClass(value) {
    const v = value.toLowerCase();
    if (v.includes("geringerer")) return "lesser";
    if (v.includes("kein") || v.includes("nicht belegt")) return "none";
    if (v.includes("nicht quantifizierbar")) return "non-quantifiable";
    if (v.includes("gering")) return "minor";
    if (v.includes("beträchtlich") || v.includes("betrachtlich")) return "considerable";
    return "";  // default green = erheblich (major)
}

function niceRecClass(value) {
    const v = value.toLowerCase();
    if (v.includes("not recommended")) return "not-recommended";
    if (v.includes("only in research")) return "research-only";
    if (v.includes("terminated")) return "terminated";
    if (v.includes("restrictions") || v.includes("optimised")) return "optimised";
    if (v.includes("recommended")) return "recommended";
    return "";
}

function iptClass(value) {
    const v = value.toLowerCase();
    if (v.includes("unfavorable") || v.includes("desfavorable") || v.includes("no favorable")) return "unfavorable";
    if (v.includes("conditions") || v.includes("condicionado")) return "conditional";
    if (v.includes("favorable")) return "favorable";
    if (v.includes("pending") || v.includes("pendiente")) return "pending";
    return "";
}

function countryName(code) {
    const c = countries.find(c => c.code === code);
    return c ? `${c.name} (${c.agency})` : code;
}

// ═══════════════════════════════════════════════════════════════════════
//  MODULE 2: ANALOGUE SELECTION
// ═══════════════════════════════════════════════════════════════════════

async function loadAnalogueFilters() {
    try {
        const resp = await fetch("/api/analogues/filters");
        if (!resp.ok) {
            showStatus(analogueStatus, "Failed to load filter options. Data may still be loading.", "error");
            return;
        }
        const data = await resp.json();

        therapeuticTaxonomy = data.therapeutic_taxonomy || [];

        filterBroadArea.innerHTML = '<option value="">All therapeutic areas</option>' +
            therapeuticTaxonomy.map(cat => `<option value="${esc(cat.name)}">${esc(cat.name)}</option>`).join("");
        filterBroadArea.addEventListener("change", updateSubcategoryOptions);

        filterStatus.innerHTML = '<option value="">All statuses</option>' +
            data.statuses.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

        filterMAH.innerHTML = '<option value="">All companies</option>' +
            data.mahs.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("");

        filterATC.innerHTML = '<option value="">All ATC codes</option>' +
            data.atc_prefixes.map(a => `<option value="${esc(a.code)}">${esc(a.label)}</option>`).join("");

        if (data.molecule_types && filterMoleculeType) {
            populateDatalist(filterMoleculeType, "molecule-type-datalist", data.molecule_types);
        }
        if (data.routes_of_administration && filterRoute) {
            populateDatalist(filterRoute, "route-datalist", data.routes_of_administration);
        }
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
filterSubstance.addEventListener("keydown", e => { if (e.key === "Enter") searchAnalogues(); });
filterIndication.addEventListener("keydown", e => { if (e.key === "Enter") searchAnalogues(); });
filterMoA.addEventListener("keydown", e => { if (e.key === "Enter") searchAnalogues(); });

async function searchAnalogues() {
    const params = new URLSearchParams();

    if (filterBroadArea.value) params.set("broad_therapeutic_area", filterBroadArea.value);
    if (filterSubcategory.value) params.set("therapeutic_subcategory", filterSubcategory.value);
    if (filterIndication.value.trim()) params.set("indication_keyword", filterIndication.value.trim());
    if (filterSubstance.value.trim()) params.set("substance", filterSubstance.value.trim());
    if (filterMoleculeType && filterMoleculeType.value.trim()) params.set("molecule_type", filterMoleculeType.value.trim());
    if (filterRoute && filterRoute.value.trim()) params.set("route_of_administration", filterRoute.value.trim());
    if (filterMoA && filterMoA.value.trim()) params.set("moa_class", filterMoA.value.trim());
    if (filterPrevalence.value) params.set("prevalence_category", filterPrevalence.value);
    if (filterOrphan.value) params.set("orphan", filterOrphan.value);
    if (filterYears.value !== "0") params.set("years", filterYears.value);
    if (filterFirst.value) params.set("first_approval", filterFirst.value);
    if (filterATC.value) params.set("atc_code", filterATC.value);
    if (filterMAH.value) params.set("mah", filterMAH.value);
    if (filterNewSubstance.value) params.set("new_active_substance", filterNewSubstance.value);
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (filterConditional.value) params.set("conditional_approval", filterConditional.value);
    if (filterExceptional.value) params.set("exceptional_circumstances", filterExceptional.value);
    if (filterAccelerated.value) params.set("accelerated_assessment", filterAccelerated.value);
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
    filterBroadArea.value = "";
    filterSubcategory.innerHTML = '<option value="">Select a category first</option>';
    filterSubcategory.disabled = true;
    filterIndication.value = "";
    filterSubstance.value = "";
    if (filterMoleculeType) filterMoleculeType.value = "";
    if (filterRoute) filterRoute.value = "";
    if (filterMoA) filterMoA.value = "";
    filterPrevalence.value = "";
    filterOrphan.value = "";
    filterYears.value = "0";
    filterFirst.value = "";
    filterArea.value = "";
    filterATC.value = "";
    filterMAH.value = "";
    filterNewSubstance.value = "";
    filterStatus.value = "";
    filterConditional.value = "";
    filterExceptional.value = "";
    filterAccelerated.value = "";
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
            <p class="results-summary">Found <strong>${data.total}</strong> medicine(s) matching your criteria</p>
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

    const exportBtn = document.getElementById("export-excel-btn");
    if (exportBtn) exportBtn.addEventListener("click", exportAnalogueExcel);
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

    let areaDisplay = esc(med.broad_therapeutic_area || med.therapeutic_area || "");
    if (med.therapeutic_subcategory) {
        areaDisplay += `<span class="subcategory-label"> &rsaquo; ${esc(med.therapeutic_subcategory)}</span>`;
    }

    let typeRouteDisplay = "";
    if (med.molecule_type) typeRouteDisplay += `<span class="tag tag-molecule-type">${esc(med.molecule_type)}</span>`;
    if (med.route_of_administration) typeRouteDisplay += `<span class="tag tag-route">${esc(med.route_of_administration)}</span>`;
    if (med.moa_class) typeRouteDisplay += `<span class="moa-label" title="${esc(med.moa_class)}">${esc(med.moa_class)}</span>`;

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
    const colWidths = Object.keys(rows[0]).map(key => {
        const maxLen = Math.max(key.length, ...rows.map(r => (r[key] || "").toString().length));
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
