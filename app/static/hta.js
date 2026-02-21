/**
 * HTA & Reimbursement module — Frontend logic.
 *
 * Flow: Search medicine → View EMA indications → Select country → View assessments
 * Depends on shared.js for: esc, showStatus, hideStatus, smrClass, benefitClass,
 *   niceRecClass, iptClass
 */

// ── State ─────────────────────────────────────────────────────────────

let selectedMedicine = null;
let selectedIndication = null;
let countries = [];

// ── DOM Elements ──────────────────────────────────────────────────────

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

// ── Init ──────────────────────────────────────────────────────────────

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

// ── Search ────────────────────────────────────────────────────────────

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
    renderMedicineDetails(medicine);
}

// ── Medicine details ──────────────────────────────────────────────────

function renderMedicineDetails(med) {
    medicineSection.classList.remove("hidden");
    assessmentSection.classList.remove("hidden");
    assessmentResults.classList.add("hidden");
    hideStatus(assessmentStatus);

    const indicationText = med.therapeutic_indication || "";
    const indications = splitIndications(indicationText, med.name);
    selectedIndication = null;

    let indicationsHTML;
    if (indications.length <= 1) {
        indicationsHTML = `<div class="indication-text">${esc(indicationText || "No indication text available.")}</div>`;
    } else {
        indicationsHTML = `
            <p class="indication-prompt">Select an indication to filter HTA assessments, or search all:</p>
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
            });
        });
    }

    medicineSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Split a therapeutic indication text block into individual indications.
 */
function splitIndications(text, productName) {
    if (!text || !text.trim()) return [];

    text = text.trim();

    let parts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    if (productName) {
        const escaped = escRegex(productName);
        const re = new RegExp(`\\.\\s+(?=${escaped}\\b)`, "gi");
        parts = text.split(re).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return parts;

        const re2 = new RegExp(`\\n\\s*(?=${escaped}\\b)`, "gi");
        parts = text.split(re2).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return parts;
    }

    parts = text.split(/\n\s*[-–]\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    return [text];
}

function escRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Assessments ───────────────────────────────────────────────────────

findAssessmentsBtn.addEventListener("click", findAssessments);

async function findAssessments() {
    if (!selectedMedicine) {
        showStatus(assessmentStatus, "Please select a medicine first.", "info");
        return;
    }

    const countryCode = countrySelect.value;
    const substance = selectedMedicine.active_substance;
    const product = selectedMedicine.name;

    showStatus(assessmentStatus, `Searching for assessments in ${countryName(countryCode)}...`, "loading");
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

    assessmentResults.innerHTML = `
        <p style="margin-bottom:8px;color:var(--text-light);font-size:0.9rem;">
            Found <strong>${data.assessments.length}</strong> assessment(s) from
            <strong>${esc(data.agency)}</strong> (${esc(data.country_name)})
        </p>
        ${data.assessments.map(renderSingleAssessment).join("")}
    `;

    assessmentResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSingleAssessment(a) {
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

    const niceRecBadge = a.nice_recommendation
        ? `<span class="badge badge-nice-rec ${niceRecClass(a.nice_recommendation)}">
            <span class="label">NICE:</span> ${esc(a.nice_recommendation)}
           </span>`
        : "";

    const guidanceRefBadge = a.guidance_reference
        ? `<span class="badge badge-guidance-ref">
            ${esc(a.guidance_reference)}
           </span>`
        : "";

    const iptBadge = a.therapeutic_positioning
        ? `<span class="badge badge-ipt ${iptClass(a.therapeutic_positioning)}">
            <span class="label">IPT:</span> ${esc(a.therapeutic_positioning)}
           </span>`
        : "";

    const iptRefBadge = a.ipt_reference
        ? `<span class="badge badge-ipt-ref">
            ${esc(a.ipt_reference)}
           </span>`
        : "";

    const pmdaBadge = a.pmda_review_type
        ? `<span class="badge badge-pmda">
            <span class="label">PMDA:</span> ${esc(a.pmda_review_type)}
           </span>`
        : "";

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
        ? `<a class="assessment-link" href="${esc(a.assessment_url)}" target="_blank" rel="noopener">
            ${linkText} &rarr;
           </a>`
        : "";

    const smrDesc = a.smr_description
        ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>SMR:</strong> ${esc(a.smr_description)}
           </div>`
        : "";

    const asmrDesc = a.asmr_description
        ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>ASMR:</strong> ${esc(a.asmr_description)}
           </div>`
        : "";

    const benefitDesc = a.benefit_rating_description && a.benefit_rating_description !== a.benefit_rating
        ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            ${esc(a.benefit_rating_description)}
           </div>`
        : "";

    const patientGroup = a.patient_group
        ? `<div style="font-size:0.85rem;color:var(--text);margin-bottom:8px;">
            <strong>Patient group:</strong> ${esc(a.patient_group)}
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
                ${smrBadge}
                ${asmrBadge}
                ${benefitBadge}
                ${evidenceBadge}
                ${comparatorBadge}
                ${niceRecBadge}
                ${guidanceRefBadge}
                ${iptBadge}
                ${iptRefBadge}
                ${pmdaBadge}
            </div>
            ${smrDesc}
            ${asmrDesc}
            ${benefitDesc}
            ${link}
        </div>
    `;
}

// ── Helpers ───────────────────────────────────────────────────────────

function countryName(code) {
    const c = countries.find(c => c.code === code);
    return c ? `${c.name} (${c.agency})` : code;
}
