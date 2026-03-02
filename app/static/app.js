/**
 * VAP Global Resources — Frontend Application
 *
 * Two modules:
 *   1. HTA & Reimbursement: Search medicine → View EMA indications → Select country → View assessments
 *   2. Analogue Selection:  Filter EMA medicines by therapeutic area, orphan status, approval date, etc.
 */

// ── State ────────────────────────────────────────────────────────────

let selectedMedicine = null;
let selectedIndication = null; // currently selected indication text (null = all)
let countries = [];
let analogueFiltersLoaded = false;

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
const filterMonitoring = document.getElementById("filter-monitoring");
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

        // Update tab active state
        moduleTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // Toggle module visibility
        moduleHTA.classList.toggle("hidden", target !== "hta");
        moduleAnalogues.classList.toggle("hidden", target !== "analogues");

        // Lazy-load analogue filters on first switch
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
            .map(c => {
                const label = c.is_loaded
                    ? `${c.name} (${c.agency})`
                    : `${c.name} (${c.agency}) — data unavailable`;
                return `<option value="${c.code}"${c.is_loaded ? "" : " disabled"}>${label}</option>`;
            })
            .join("");
        // If the currently selected option is disabled, select the first enabled one
        if (countrySelect.selectedOptions.length === 0 || countrySelect.selectedOptions[0].disabled) {
            const firstEnabled = countrySelect.querySelector("option:not([disabled])");
            if (firstEnabled) countrySelect.value = firstEnabled.value;
        }
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

    // Store medicines for click handling
    searchResults._medicines = medicines;

    searchResults.querySelectorAll(".result-item").forEach(item => {
        item.addEventListener("click", () => {
            const idx = parseInt(item.dataset.index);
            selectMedicine(searchResults._medicines[idx], item);
        });
    });
}

function selectMedicine(medicine, element) {
    // Highlight selected
    searchResults.querySelectorAll(".result-item").forEach(el => el.classList.remove("selected"));
    element.classList.add("selected");

    selectedMedicine = medicine;
    renderMedicineDetails(medicine);
}

// ── Medicine details ─────────────────────────────────────────────────

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
        // Single indication — show as plain text, no selection needed
        indicationsHTML = `<div class="indication-text">${esc(indicationText || "No indication text available.")}</div>`;
    } else {
        // Multiple indications — show as selectable cards
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

    // Bind indication selection if multiple
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

    // Scroll to medicine section
    medicineSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Split a therapeutic indication text block into individual indications.
 *
 * EMA indication text is typically a single paragraph with multiple indications
 * separated by the product name or newlines. For example:
 *   "Padcev as monotherapy is indicated for ... Padcev in combination with
 *    pembrolizumab is indicated for ..."
 */
function splitIndications(text, productName) {
    if (!text || !text.trim()) return [];

    text = text.trim();

    // 1. Try splitting on double newlines
    let parts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    // 2. Try splitting where the product name starts a new sentence after a period.
    //    Guard: only accept the split when EVERY resulting part contains
    //    "is indicated" — this prevents breaking on continuation sentences
    //    (e.g. "Itovebi has not been studied in…") that are NOT new
    //    indication clauses.
    if (productName) {
        const escaped = escRegex(productName);
        // Split on ". ProductName" or ".\nProductName"
        const re = new RegExp(`\\.\\s+(?=${escaped}\\b)`, "gi");
        parts = text.split(re).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1 && parts.every(p => /\bis indicated\b/i.test(p))) return parts;

        // 3. Try splitting on newline followed by product name
        const re2 = new RegExp(`\\n\\s*(?=${escaped}\\b)`, "gi");
        parts = text.split(re2).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1 && parts.every(p => /\bis indicated\b/i.test(p))) return parts;
    }

    // 4. Try splitting on newline + dash items (sometimes used for sub-indications)
    parts = text.split(/\n\s*[-–]\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;

    // 5. Multiple sentences each containing "is indicated" (mirrors backend strategy 4).
    //    Catches drugs like Padcev where the two indication clauses start differently
    //    (e.g. "Padcev as monotherapy is indicated for…" / "In combination with
    //    pembrolizumab, Padcev is indicated for…") and cannot be split by the
    //    product-name pattern above.
    const indSents = text
        .split(/\.[ \t\n]+/)
        .map(s => s.trim())
        .filter(s => s && /\bis indicated\b/i.test(s));
    if (indSents.length >= 2) return indSents;

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

    const isGermany = data.country_code === "DE";
    const isFrance = data.country_code === "FR";

    let cardsHtml;
    if (isGermany && data.assessments.some(a => a.dossier_code)) {
        // Group Germany assessments by decision_id for a structured view
        cardsHtml = renderGermanyGroupedAssessments(data.assessments);
    } else if (isFrance && data.assessments.some(a => a.dossier_code)) {
        // Group France assessments by dossier_code for a structured view
        // Pass the EMA therapeutic indication as English fallback
        const emaIndication = selectedMedicine ? selectedMedicine.therapeutic_indication : "";
        cardsHtml = renderFranceGroupedAssessments(data.assessments, data.active_substance, emaIndication);
    } else {
        cardsHtml = data.assessments.map(renderSingleAssessment).join("");
    }

    assessmentResults.innerHTML = `
        <p style="margin-bottom:8px;color:var(--text-light);font-size:0.9rem;">
            Found <strong>${data.assessments.length}</strong> assessment(s) from
            <strong>${esc(data.agency)}</strong> (${esc(data.country_name)})
        </p>
        ${cardsHtml}
    `;

    assessmentResults.scrollIntoView({ behavior: "smooth", block: "start" });

    // Toggle collapsible sections (G-BA and France cards share the same mechanism)
    assessmentResults.querySelectorAll(".gba-section-toggle").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const section = toggle.closest(".gba-section");
            section.classList.toggle("collapsed");
        });
    });
}

/**
 * Group Germany (G-BA) assessments by dossier_code (decision_id) and render
 * them in the enhanced structured format with Decision Summary, Recommendation,
 * and P&MA Terms.
 */
function renderGermanyGroupedAssessments(assessments) {
    // Group by dossier_code
    const groups = {};
    const order = [];
    for (const a of assessments) {
        const key = a.dossier_code || a.opinion_date + "_" + a.product_name;
        if (!groups[key]) {
            groups[key] = [];
            order.push(key);
        }
        groups[key].push(a);
    }

    let html = "";
    for (const key of order) {
        const group = groups[key];
        html += renderGermanyDecisionCard(group);
    }
    return html;
}

/**
 * Render one grouped Germany G-BA decision card.
 */
function renderGermanyDecisionCard(assessments) {
    const first = assessments[0];
    const tradeName = first.product_name;
    const date = first.opinion_date;
    const indication = first.evaluation_reason;
    const url = first.assessment_url;

    // Classify subpopulations into drivers and barriers
    const drivers = [];
    const barriers = [];
    const ratingSet = new Set();

    for (const a of assessments) {
        const rating = a.benefit_rating || "";
        const ratingDesc = a.benefit_rating_description || "";
        const pop = a.patient_group || "";
        const comparator = a.comparator || "";
        const cleanDesc = ratingDesc.split("(")[0].trim();

        if (ratingSet.size === 0 || !ratingSet.has(rating)) ratingSet.add(rating);

        if (isGBAPositive(rating)) {
            let text = cleanDesc;
            if (pop) text += " for " + pop;
            if (comparator) text += " vs. " + comparator;
            drivers.push({ text, rating, pop, comparator });
        } else if (isGBANegative(rating)) {
            let text = cleanDesc;
            if (pop) text += " for " + pop;
            barriers.push({ text, rating, pop });
        }
    }

    let html = '<div class="gba-enhanced-card">';

    // Header
    html += '<div class="gba-enhanced-header">';
    html += `<div class="gba-enhanced-title">${esc(tradeName)} EVALUATION IN DEU (G-BA)</div>`;
    html += `<div class="gba-enhanced-date">Published ${esc(date)}</div>`;
    html += '</div>';

    // Decision Summary
    if (drivers.length > 0 || barriers.length > 0) {
        html += '<div class="gba-section">';
        html += '<div class="gba-section-header gba-section-toggle">';
        html += '<span class="gba-section-title">Decision Summary</span>';
        html += '<span class="gba-section-chevron"></span>';
        html += '</div>';
        html += '<div class="gba-section-body">';

        if (drivers.length > 0) {
            html += '<div class="gba-summary-block gba-summary-drivers">';
            html += '<div class="gba-summary-label">Drivers</div>';
            html += '<ul class="gba-summary-list">';
            for (const d of drivers) {
                html += `<li><span class="gba-indicator gba-indicator-positive"></span>${esc(d.text)}</li>`;
            }
            html += '</ul></div>';
        }

        if (barriers.length > 0) {
            html += '<div class="gba-summary-block gba-summary-barriers">';
            html += '<div class="gba-summary-label">Barriers</div>';
            html += '<ul class="gba-summary-list">';
            for (const b of barriers) {
                html += `<li><span class="gba-indicator gba-indicator-negative"></span>${esc(b.text)}</li>`;
            }
            html += '</ul></div>';
        }

        html += '</div></div>';
    }

    // G-BA Recommendation
    html += '<div class="gba-section">';
    html += '<div class="gba-section-header gba-section-toggle">';
    html += '<span class="gba-section-title">G-BA Recommendation</span>';
    html += '<span class="gba-section-chevron"></span>';
    html += '</div>';
    html += '<div class="gba-section-body">';

    if (indication) {
        html += `<div class="gba-rec-indication" style="margin-bottom:12px"><strong>Indication:</strong> ${esc(indication)}</div>`;
    }

    html += '<div class="gba-rec-subpops">';
    for (const a of assessments) {
        const isPos = isGBAPositive(a.benefit_rating);
        const isNeg = isGBANegative(a.benefit_rating);
        const indicatorCls = isPos ? "gba-indicator-positive" : isNeg ? "gba-indicator-negative" : "gba-indicator-neutral";

        html += '<div class="gba-rec-subpop-item">';
        html += '<div class="gba-rec-rating-row">';
        html += `<span class="gba-indicator ${indicatorCls}"></span>`;
        html += `<span class="badge badge-benefit ${benefitClass(a.benefit_rating)}">`;
        html += `<span class="label">Zusatznutzen:</span> ${esc(a.benefit_rating)}</span>`;
        html += '</div>';

        if (a.patient_group) {
            html += `<div class="gba-rec-pop">${esc(a.patient_group)}</div>`;
        }

        html += '<div class="gba-rec-details">';
        if (a.evidence_level) {
            html += `<span class="gba-rec-detail"><strong>Evidence:</strong> ${esc(a.evidence_level)}</span>`;
        }
        if (a.comparator) {
            html += `<span class="gba-rec-detail"><strong>vs.</strong> ${esc(a.comparator)}</span>`;
        }
        html += '</div>';

        if (a.benefit_rating_description && a.benefit_rating_description !== a.benefit_rating) {
            html += `<div style="font-size:0.82rem;color:var(--text-light);margin-top:4px">${esc(a.benefit_rating_description)}</div>`;
        }

        html += '</div>';
    }
    html += '</div>';

    html += '</div></div>';

    // P&MA Terms
    const uniqueRatings = [...ratingSet];
    if (uniqueRatings.length > 0) {
        html += '<div class="gba-section collapsed">';
        html += '<div class="gba-section-header gba-section-toggle">';
        html += '<span class="gba-section-title">Key P&amp;MA Terms (Germany)</span>';
        html += '<span class="gba-section-chevron"></span>';
        html += '</div>';
        html += '<div class="gba-section-body">';
        html += '<table class="gba-pma-table"><thead><tr>';
        html += '<th>Rating</th><th>Explanation</th><th>Price Implication</th>';
        html += '</tr></thead><tbody>';
        for (const rating of uniqueRatings) {
            const info = GBA_PMA_TERMS[rating];
            if (info) {
                html += '<tr>';
                html += `<td class="gba-pma-rating"><span class="badge badge-benefit ${benefitClass(rating)}">${esc(info.label)}</span></td>`;
                html += `<td>${esc(info.explanation)}</td>`;
                html += `<td>${esc(info.price_implication)}</td>`;
                html += '</tr>';
            }
        }
        html += '</tbody></table></div></div>';
    }

    // Action bar
    html += '<div class="gba-action-bar">';
    if (url) {
        html += `<a class="gba-source-btn" href="${esc(url)}" target="_blank" rel="noopener">View on G-BA &rarr;</a>`;
    }
    html += '</div>';

    html += '</div>';
    return html;
}

function isGBAPositive(rating) {
    const r = (rating || "").toLowerCase();
    return r === "erheblich" || r === "beträchtlich" || r === "gering"
        || r.startsWith("nicht quantifizierbar") || r === "gilt als belegt";
}

function isGBANegative(rating) {
    const r = (rating || "").toLowerCase();
    return r === "kein zusatznutzen" || r === "geringerer nutzen"
        || r === "ist nicht belegt" || r === "gilt als nicht belegt";
}

/** P&MA terms reference for Germany benefit ratings. */
const GBA_PMA_TERMS = {
    "erheblich": {
        label: "Major added benefit (erheblich)",
        explanation: "Highest benefit rating; major improvement in patient-relevant endpoints vs. ACT",
        price_implication: "Price negotiated at a significant premium to brand and/or generic ACT",
    },
    "beträchtlich": {
        label: "Considerable added benefit (beträchtlich)",
        explanation: "Second highest benefit rating; significant improvement in patient-relevant endpoints vs. ACT",
        price_implication: "Price negotiated: Premium to brand and/or generic ACT",
    },
    "gering": {
        label: "Minor added benefit (gering)",
        explanation: "Moderate improvement in patient-relevant endpoints vs. ACT",
        price_implication: "Price negotiated: Moderate premium possible depending on negotiation outcome",
    },
    "nicht quantifizierbar": {
        label: "Non-quantifiable added benefit (nicht quantifizierbar)",
        explanation: "Added benefit acknowledged but scientific evidence does not allow quantification",
        price_implication: "Price negotiated on case-by-case basis depending on evidence strength",
    },
    "kein Zusatznutzen": {
        label: "No added benefit (kein Zusatznutzen)",
        explanation: "Available evidence does not show the new drug to be better than ACT in patient-relevant outcomes",
        price_implication: "With a branded ACT: \u226510% discount; with a generic ACT: price would not exceed that of the comparator",
    },
    "geringerer Nutzen": {
        label: "Lesser benefit (geringerer Nutzen)",
        explanation: "Evidence shows the new drug to be worse than ACT in patient-relevant outcomes",
        price_implication: "Unfavorable pricing position; potential for significant discounting or market withdrawal",
    },
    "ist nicht belegt": {
        label: "Added benefit not proven (ist nicht belegt)",
        explanation: "Insufficient evidence submitted to demonstrate superiority over ACT",
        price_implication: "Treated as no added benefit; same pricing constraints as 'kein Zusatznutzen'",
    },
    "gilt als belegt": {
        label: "Benefit deemed proven \u2014 orphan drug (gilt als belegt)",
        explanation: "Orphan drug benefit deemed proven per \u00a735a(1) SGB V (revenue < \u20ac50M)",
        price_implication: "Price negotiated based on acknowledged benefit; exempt from standard AMNOG assessment",
    },
    "gilt als nicht belegt": {
        label: "Benefit not confirmed \u2014 orphan >\u20ac50M (gilt als nicht belegt)",
        explanation: "Orphan drug exceeding \u20ac50M revenue — benefit not proven after full assessment",
        price_implication: "Standard AMNOG pricing applies; follows evidence-based assessment outcome",
    },
};

// ── France (HAS) Grouped Card Renderer ───────────────────────────────

/**
 * Group France (HAS) assessments by dossier_code and render them in
 * the enhanced structured format with Decision Summary, HAS Recommendation,
 * and P&MA Terms — mirroring the Germany (G-BA) card design.
 */
function renderFranceGroupedAssessments(assessments, activeSubstance, emaIndication) {
    // Group by dossier_code
    const groups = {};
    const order = [];
    for (const a of assessments) {
        const key = a.dossier_code || a.opinion_date + "_" + a.product_name;
        if (!groups[key]) {
            groups[key] = [];
            order.push(key);
        }
        groups[key].push(a);
    }

    let html = "";
    for (const key of order) {
        const group = groups[key];
        html += renderFranceDecisionCard(group, activeSubstance, emaIndication);
    }
    return html;
}

/**
 * Render one grouped France HAS decision card.
 */
function renderFranceDecisionCard(assessments, activeSubstance, emaIndication) {
    const first = assessments[0];
    const tradeName = _extractTradeName(first.product_name);
    const fullProductName = first.product_name;
    const date = first.opinion_date;
    const dossierCode = first.dossier_code;
    const motif = first.evaluation_reason;
    const url = first.assessment_url;
    const indicationFr = first.indication || "";
    const indicationEn = first.indication_en || "";
    const smrValue = first.smr_value || "";
    const asmrValue = first.asmr_value || "";
    const smrDesc = first.smr_description || "";
    const smrDescEn = first.smr_description_en || "";
    const asmrDesc = first.asmr_description || "";
    const asmrDescEn = first.asmr_description_en || "";

    // Determine SMR/ASMR sentiment
    const smrPositive = isSMRPositive(smrValue);
    const smrNegative = isSMRNegative(smrValue);
    const asmrPositive = isASMRPositive(asmrValue);
    const asmrNegative = isASMRNegative(asmrValue);

    // Build drivers/barriers
    const drivers = [];
    const barriers = [];

    if (smrPositive) {
        const smrEn = HAS_SMR_EN[smrValue] || smrValue;
        drivers.push(`SMR: ${smrEn} (${smrValue}) — eligible for reimbursement`);
    } else if (smrNegative) {
        const smrEn = HAS_SMR_EN[smrValue] || smrValue;
        barriers.push(`SMR: ${smrEn} (${smrValue}) — not eligible for reimbursement`);
    }

    if (asmrPositive) {
        const asmrEn = HAS_ASMR_EN[asmrValue] || `ASMR ${asmrValue}`;
        drivers.push(`ASMR ${asmrValue}: ${asmrEn} over existing treatments`);
    } else if (asmrNegative) {
        const asmrEn = HAS_ASMR_EN[asmrValue] || `ASMR ${asmrValue}`;
        barriers.push(`ASMR ${asmrValue}: ${asmrEn} — no improvement over existing treatments`);
    }

    let html = '<div class="gba-enhanced-card">';

    // ── Header ──
    html += '<div class="gba-enhanced-header">';
    html += `<div class="gba-enhanced-title">${esc(tradeName)} EVALUATION IN FRA (HAS)</div>`;
    html += `<div class="gba-enhanced-date">Published ${esc(date)}</div>`;
    html += '</div>';

    // ── Decision Summary ──
    if (drivers.length > 0 || barriers.length > 0) {
        html += '<div class="gba-section">';
        html += '<div class="gba-section-header gba-section-toggle">';
        html += '<span class="gba-section-title">Decision Summary</span>';
        html += '<span class="gba-section-chevron"></span>';
        html += '</div>';
        html += '<div class="gba-section-body">';

        if (drivers.length > 0) {
            html += '<div class="gba-summary-block gba-summary-drivers">';
            html += '<div class="gba-summary-label">Drivers</div>';
            html += '<ul class="gba-summary-list">';
            for (const d of drivers) {
                html += `<li><span class="gba-indicator gba-indicator-positive"></span>${esc(d)}</li>`;
            }
            html += '</ul></div>';
        }

        if (barriers.length > 0) {
            html += '<div class="gba-summary-block gba-summary-barriers">';
            html += '<div class="gba-summary-label">Barriers</div>';
            html += '<ul class="gba-summary-list">';
            for (const b of barriers) {
                html += `<li><span class="gba-indicator gba-indicator-negative"></span>${esc(b)}</li>`;
            }
            html += '</ul></div>';
        }

        html += '</div></div>';
    }

    // ── HAS Recommendation ──
    html += '<div class="gba-section">';
    html += '<div class="gba-section-header gba-section-toggle">';
    html += '<span class="gba-section-title">HAS Recommendation</span>';
    html += '<span class="gba-section-chevron"></span>';
    html += '</div>';
    html += '<div class="gba-section-body">';

    // Active substance and trade name
    if (activeSubstance) {
        html += `<div class="gba-rec-indication" style="margin-bottom:6px"><strong>Active Substance:</strong> ${esc(activeSubstance)}</div>`;
    }
    html += `<div class="gba-rec-indication" style="margin-bottom:6px"><strong>Trade Name:</strong> ${esc(fullProductName)}</div>`;

    // Indications — show English translation with French original, or EMA fallback
    if (indicationEn && indicationEn !== indicationFr) {
        // We have both French and a different English translation
        html += `<div class="gba-rec-indication" style="margin-bottom:4px"><strong>Indication:</strong> ${esc(indicationEn)}</div>`;
        html += `<div class="gba-rec-indication" style="margin-bottom:6px;font-size:0.82rem;color:var(--text-light)"><em>(FR)</em> ${esc(indicationFr)}</div>`;
    } else if (indicationFr) {
        // French only (no English translation available)
        html += `<div class="gba-rec-indication" style="margin-bottom:4px"><strong>Indication:</strong> ${esc(indicationFr)}</div>`;
        if (emaIndication) {
            html += `<div class="gba-rec-indication" style="margin-bottom:6px;font-size:0.82rem;color:var(--text-light)"><em>(EMA)</em> ${esc(emaIndication)}</div>`;
        }
    } else if (emaIndication) {
        // No BDPM indication extracted — use EMA therapeutic indication as fallback
        html += `<div class="gba-rec-indication" style="margin-bottom:6px"><strong>Indication:</strong> ${esc(emaIndication)}</div>`;
    }

    // Evaluation reason (motif)
    if (motif) {
        const motifEn = HAS_MOTIF_EN[motif] || motif;
        html += `<div class="gba-rec-indication" style="margin-bottom:12px"><strong>Evaluation Purpose:</strong> ${esc(motifEn)} <span style="font-size:0.8rem;color:var(--text-light)">(${esc(motif)})</span></div>`;
    }

    // Dossier code
    if (dossierCode) {
        html += `<div class="gba-rec-indication" style="margin-bottom:12px"><strong>Dossier:</strong> ${esc(dossierCode)}</div>`;
    }

    // SMR rating
    html += '<div class="gba-rec-subpops">';
    if (smrValue) {
        const smrIndicator = smrPositive ? "gba-indicator-positive" : smrNegative ? "gba-indicator-negative" : "gba-indicator-neutral";
        html += '<div class="gba-rec-subpop-item">';
        html += '<div class="gba-rec-rating-row">';
        html += `<span class="gba-indicator ${smrIndicator}"></span>`;
        html += `<span class="badge badge-smr ${smrClass(smrValue)}">`;
        html += `<span class="label">SMR:</span> ${esc(smrValue)}</span>`;
        const smrEn = HAS_SMR_EN[smrValue];
        if (smrEn) {
            html += `<span style="margin-left:8px;font-size:0.85rem;color:var(--text-light)">${esc(smrEn)}</span>`;
        }
        html += '</div>';
        if (smrDescEn && smrDescEn !== smrDesc) {
            html += `<div style="font-size:0.82rem;color:var(--text-light);margin-top:4px">${esc(smrDescEn)}</div>`;
            html += `<div style="font-size:0.78rem;color:var(--text-light);margin-top:2px;font-style:italic">(FR) ${esc(smrDesc)}</div>`;
        } else if (smrDesc) {
            html += `<div style="font-size:0.82rem;color:var(--text-light);margin-top:4px">${esc(smrDesc)}</div>`;
        }
        html += '</div>';
    }

    // ASMR rating
    if (asmrValue) {
        const asmrIndicator = asmrPositive ? "gba-indicator-positive" : asmrNegative ? "gba-indicator-negative" : "gba-indicator-neutral";
        html += '<div class="gba-rec-subpop-item">';
        html += '<div class="gba-rec-rating-row">';
        html += `<span class="gba-indicator ${asmrIndicator}"></span>`;
        html += `<span class="badge badge-asmr">`;
        html += `<span class="label">ASMR:</span> ${esc(asmrValue)}</span>`;
        const asmrEn = HAS_ASMR_EN[asmrValue];
        if (asmrEn) {
            html += `<span style="margin-left:8px;font-size:0.85rem;color:var(--text-light)">${esc(asmrEn)}</span>`;
        }
        html += '</div>';
        if (asmrDescEn && asmrDescEn !== asmrDesc) {
            html += `<div style="font-size:0.82rem;color:var(--text-light);margin-top:4px">${esc(asmrDescEn)}</div>`;
            html += `<div style="font-size:0.78rem;color:var(--text-light);margin-top:2px;font-style:italic">(FR) ${esc(asmrDesc)}</div>`;
        } else if (asmrDesc) {
            html += `<div style="font-size:0.82rem;color:var(--text-light);margin-top:4px">${esc(asmrDesc)}</div>`;
        }
        html += '</div>';
    }

    html += '</div>';
    html += '</div></div>';

    // ── P&MA Terms (France) ──
    const relevantTerms = [];
    if (smrValue && HAS_PMA_SMR_TERMS[smrValue]) relevantTerms.push({ type: "SMR", key: smrValue, ...HAS_PMA_SMR_TERMS[smrValue] });
    if (asmrValue && HAS_PMA_ASMR_TERMS[asmrValue]) relevantTerms.push({ type: "ASMR", key: asmrValue, ...HAS_PMA_ASMR_TERMS[asmrValue] });

    if (relevantTerms.length > 0) {
        html += '<div class="gba-section collapsed">';
        html += '<div class="gba-section-header gba-section-toggle">';
        html += '<span class="gba-section-title">Key P&amp;MA Terms (France)</span>';
        html += '<span class="gba-section-chevron"></span>';
        html += '</div>';
        html += '<div class="gba-section-body">';
        html += '<table class="gba-pma-table"><thead><tr>';
        html += '<th>Rating</th><th>Explanation</th><th>Price Implication</th>';
        html += '</tr></thead><tbody>';
        for (const t of relevantTerms) {
            html += '<tr>';
            if (t.type === "SMR") {
                html += `<td class="gba-pma-rating"><span class="badge badge-smr ${smrClass(t.key)}">${esc(t.label)}</span></td>`;
            } else {
                html += `<td class="gba-pma-rating"><span class="badge badge-asmr">${esc(t.label)}</span></td>`;
            }
            html += `<td>${esc(t.explanation)}</td>`;
            html += `<td>${esc(t.price_implication)}</td>`;
            html += '</tr>';
        }
        html += '</tbody></table></div></div>';
    }

    // ── Action bar ──
    html += '<div class="gba-action-bar">';
    if (url) {
        html += `<a class="gba-source-btn" href="${esc(url)}" target="_blank" rel="noopener">View on HAS &rarr;</a>`;
    }
    html += '</div>';

    html += '</div>';
    return html;
}

/** Extract trade name from full BDPM denomination (e.g. "KEYTRUDA 25 mg/mL, solution..."). */
function _extractTradeName(denomination) {
    if (!denomination) return "";
    // BDPM names start with the trade name in CAPS, followed by dosage
    const match = denomination.match(/^([A-ZÀ-Ü][A-ZÀ-Ü\s/.-]+?)(?:\s+\d|\s*,|$)/);
    return match ? match[1].trim() : denomination.split(",")[0].trim();
}

/** SMR sentiment helpers. */
function isSMRPositive(v) {
    const s = (v || "").toLowerCase();
    return s === "important" || s === "modéré" || s === "modere";
}
function isSMRNegative(v) {
    const s = (v || "").toLowerCase();
    return s === "insuffisant";
}

/** ASMR sentiment helpers. */
function isASMRPositive(v) {
    return ["I", "II", "III", "IV"].includes(v);
}
function isASMRNegative(v) {
    return v === "V" || v === "Sans objet";
}

/** English translations for display in France cards. */
const HAS_SMR_EN = {
    "Important": "Major clinical benefit",
    "Modéré": "Moderate clinical benefit",
    "Faible": "Minor clinical benefit",
    "Insuffisant": "Insufficient clinical benefit",
};

const HAS_ASMR_EN = {
    "I": "Major therapeutic improvement",
    "II": "Important therapeutic improvement",
    "III": "Moderate therapeutic improvement",
    "IV": "Minor therapeutic improvement",
    "V": "No therapeutic improvement",
};

const HAS_MOTIF_EN = {
    "Inscription": "Initial registration",
    "Inscription (première évaluation)": "Initial registration (first evaluation)",
    "Inscription (collectivités)": "Registration (hospital use)",
    "Renouvellement": "Renewal",
    "Renouvellement d'inscription": "Registration renewal",
    "Extension d'indication": "Indication extension",
    "Modification": "Modification",
    "Modification des conditions d'inscription": "Registration conditions modification",
    "Réévaluation": "Re-evaluation",
    "Réévaluation SMR et ASMR": "SMR and ASMR re-evaluation",
    "Radiation": "Delisting",
    "Rectificatif": "Correction",
};

/** P&MA terms reference tables for France HAS ratings. */
const HAS_PMA_SMR_TERMS = {
    "Important": {
        label: "SMR Important",
        explanation: "Highest clinical benefit level; the medicine treats a serious condition with demonstrated therapeutic benefit and limited alternatives",
        price_implication: "Eligible for reimbursement at 65% rate; price negotiated with CEPS",
    },
    "Modéré": {
        label: "SMR Modéré",
        explanation: "Moderate clinical benefit; the medicine addresses a less serious condition or has alternatives available",
        price_implication: "Eligible for reimbursement at 30% rate; price negotiated with CEPS at a lower level",
    },
    "Faible": {
        label: "SMR Faible",
        explanation: "Minor clinical benefit; limited added value in the therapeutic strategy",
        price_implication: "Eligible for reimbursement at 15% rate; likely subject to price reduction or generic tariff (TFR)",
    },
    "Insuffisant": {
        label: "SMR Insuffisant",
        explanation: "Insufficient clinical benefit to justify reimbursement by the French social security system",
        price_implication: "Not eligible for reimbursement; may be removed from reimbursement list if previously listed",
    },
};

const HAS_PMA_ASMR_TERMS = {
    "I": {
        label: "ASMR I — Major",
        explanation: "Major therapeutic improvement: breakthrough in pharmacotherapy (e.g. first effective treatment for a disease)",
        price_implication: "Maximum pricing freedom; price set freely by manufacturer; strong negotiating position with CEPS",
    },
    "II": {
        label: "ASMR II — Important",
        explanation: "Important therapeutic improvement: significant efficacy and/or safety improvement vs. existing treatments",
        price_implication: "High pricing power; price generally at or above European comparators",
    },
    "III": {
        label: "ASMR III — Moderate",
        explanation: "Moderate therapeutic improvement: meaningful but modest improvement in efficacy, safety, or convenience",
        price_implication: "Moderate pricing premium; price negotiated with reference to European price levels",
    },
    "IV": {
        label: "ASMR IV — Minor",
        explanation: "Minor therapeutic improvement: small improvement in convenience, tolerability, or a subpopulation",
        price_implication: "Limited pricing premium; price typically must not exceed lowest European price",
    },
    "V": {
        label: "ASMR V — None",
        explanation: "No therapeutic improvement over existing treatments; comparable to available alternatives",
        price_implication: "Price must be at or below existing comparators; potential generic tariff (TFR) application",
    },
};

function renderSingleAssessment(a) {
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

    // Show comparator as badge only if short; otherwise as a detail row below
    const comparatorShort = a.comparator && a.comparator.length <= 60;
    const comparatorBadge = a.comparator && comparatorShort
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
        ? `<span class="badge badge-guidance-ref">
            ${esc(a.guidance_reference)}
           </span>`
        : "";

    // Spain (AEMPS) badges
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

    // Spain Bifimed (SNS reimbursement) badge
    const bifimedBadge = a.bifimed_reimbursed
        ? `<span class="badge ${a.bifimed_reimbursed === "Yes" ? "badge-reimbursed" : "badge-not-reimbursed"}">
            <span class="label">SNS:</span> ${a.bifimed_reimbursed === "Yes" ? "Reimbursed" : "Not reimbursed"}
           </span>`
        : "";

    // Japan (MHLW) NHI reimbursement status badge
    const isReimbursed = a.pmda_review_type === "Reimbursed (NHI)";
    const pmdaBadge = a.pmda_review_type
        ? `<span class="badge ${isReimbursed ? "badge-reimbursed" : "badge-not-reimbursed"}">
            <span class="label">NHI:</span> ${esc(a.pmda_review_type)}
           </span>`
        : "";
    const pricingMethodBadge = a.pricing_method
        ? `<span class="badge badge-pricing-method">
            <span class="label">Pricing:</span> ${esc(a.pricing_method)}
           </span>`
        : "";
    const premiumBadge = a.premium_type
        ? `<span class="badge badge-premium">
            <span class="label">Premium:</span> ${esc(a.premium_type)}
           </span>`
        : "";

    // Determine link(s) based on country
    const isGermany = !!a.benefit_rating;
    const isNICE = !!a.nice_recommendation || !!a.guidance_reference;
    const isSpain = !!a.therapeutic_positioning || !!a.ipt_reference;
    const isJapan = !!a.pmda_review_type;
    let linkHtml = "";
    if (isJapan) {
        const pmdaLink = a.assessment_url
            ? `<a class="assessment-link" href="${esc(a.assessment_url)}" target="_blank" rel="noopener">PMDA review report &rarr;</a>`
            : "";
        const mhlwLink = a.japan_mhlw_url
            ? `<a class="assessment-link" href="${esc(a.japan_mhlw_url)}" target="_blank" rel="noopener">MHLW price-setting PDF &rarr;</a>`
            : "";
        linkHtml = [pmdaLink, mhlwLink].filter(Boolean).join(" ");
    } else if (isSpain) {
        const iptLink = a.assessment_url
            ? `<a class="assessment-link" href="${esc(a.assessment_url)}" target="_blank" rel="noopener">View IPT on AEMPS &rarr;</a>`
            : "";
        const bifimedLink = a.bifimed_url
            ? `<a class="assessment-link" href="${esc(a.bifimed_url)}" target="_blank" rel="noopener">Bifimed (SNS reimbursement) &rarr;</a>`
            : "";
        linkHtml = [iptLink, bifimedLink].filter(Boolean).join(" ");
    } else {
        const linkText = isNICE ? "View on NICE"
            : isGermany ? "View on G-BA"
            : "View full assessment on HAS";
        linkHtml = a.assessment_url
            ? `<a class="assessment-link" href="${esc(a.assessment_url)}" target="_blank" rel="noopener">${linkText} &rarr;</a>`
            : "";
    }

    // Descriptions — show English translation when available
    let smrDesc = "";
    if (a.smr_description_en && a.smr_description_en !== a.smr_description) {
        smrDesc = `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>SMR:</strong> ${esc(a.smr_description_en)}
           </div>
           <div style="font-size:0.8rem;color:var(--text-light);margin-top:2px;font-style:italic">
            (FR) ${esc(a.smr_description)}
           </div>`;
    } else if (a.smr_description) {
        smrDesc = `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>SMR:</strong> ${esc(a.smr_description)}
           </div>`;
    }

    let asmrDesc = "";
    if (a.asmr_description_en && a.asmr_description_en !== a.asmr_description) {
        asmrDesc = `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>ASMR:</strong> ${esc(a.asmr_description_en)}
           </div>
           <div style="font-size:0.8rem;color:var(--text-light);margin-top:2px;font-style:italic">
            (FR) ${esc(a.asmr_description)}
           </div>`;
    } else if (a.asmr_description) {
        asmrDesc = `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>ASMR:</strong> ${esc(a.asmr_description)}
           </div>`;
    }

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

    // Long comparator rendered as a detail row instead of a badge
    const comparatorDetail = a.comparator && !comparatorShort
        ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">
            <strong>Comparator (zVT):</strong> ${esc(a.comparator)}
           </div>`
        : "";

    // France (HAS) indication — show English translation when available
    let indicationRow = "";
    if (a.indication_en && a.indication_en !== a.indication) {
        indicationRow = `<div style="font-size:0.85rem;color:var(--text);margin-bottom:8px;">
            <strong>Indication:</strong> ${esc(a.indication_en)}
            <div style="font-size:0.82rem;color:var(--text-light)"><em>(FR)</em> ${esc(a.indication)}</div>
           </div>`;
    } else if (a.indication) {
        indicationRow = `<div style="font-size:0.85rem;color:var(--text);margin-bottom:8px;">
            <strong>Indication:</strong> ${esc(a.indication)}
           </div>`;
    }

    return `
        <div class="assessment-card">
            <div class="assessment-header">
                <span class="product-name">${esc(a.product_name)}</span>
                <span class="opinion-date">${esc(a.opinion_date)}</span>
            </div>
            ${a.evaluation_reason ? `<div class="reason">${esc(a.evaluation_reason)}</div>` : ""}
            ${indicationRow}
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
                ${bifimedBadge}
                ${pmdaBadge}
                ${pricingMethodBadge}
                ${premiumBadge}
            </div>
            ${smrDesc}
            ${asmrDesc}
            ${benefitDesc}
            ${comparatorDetail}
            ${linkHtml}
        </div>
    `;
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

        // Populate therapeutic areas
        filterArea.innerHTML = '<option value="">All therapeutic areas</option>' +
            data.therapeutic_areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");

        // Populate statuses
        filterStatus.innerHTML = '<option value="">All statuses</option>' +
            data.statuses.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

        // Populate MAHs (companies)
        filterMAH.innerHTML = '<option value="">All companies</option>' +
            data.mahs.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("");

        // Populate ATC prefixes
        filterATC.innerHTML = '<option value="">All ATC codes</option>' +
            data.atc_prefixes.map(a => `<option value="${esc(a.code)}">${esc(a.label)}</option>`).join("");

        analogueFiltersLoaded = true;
    } catch {
        showStatus(analogueStatus, "Failed to load filter options. Please try again.", "error");
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

async function searchAnalogues() {
    const params = new URLSearchParams();

    // Disease & Epidemiology
    if (filterArea.value) params.set("therapeutic_area", filterArea.value);
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
        renderAnalogueResults(data);
    } catch (err) {
        showStatus(analogueStatus, `Error: ${err.message}`, "error");
    }
}

function resetAnalogueFilters() {
    // Disease & Epidemiology
    filterArea.value = "";
    filterPrevalence.value = "";
    filterOrphan.value = "";
    filterIndication.value = "";
    // Product Classification
    filterATC.value = "";
    filterSubstance.value = "";
    filterMAH.value = "";
    filterNewSubstance.value = "";
    // Regulatory Pathway
    filterStatus.value = "";
    filterYears.value = "0";
    filterFirst.value = "";
    filterConditional.value = "";
    filterExceptional.value = "";
    filterAccelerated.value = "";
    filterMonitoring.value = "";
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
        return;
    }

    hideStatus(analogueStatus);

    const header = `
        <p class="results-summary">
            Found <strong>${data.total}</strong> medicine(s) matching your criteria
        </p>
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

    return `
        <tr>
            <td class="col-name">${nameCell}</td>
            <td>${esc(med.active_substance)}</td>
            <td class="col-mah">${esc(med.marketing_authorisation_holder)}</td>
            <td class="col-area">${esc(med.therapeutic_area)}</td>
            <td class="col-date">${esc(med.authorisation_date)}</td>
            <td class="col-tags">${tags.join(" ")}</td>
        </tr>
    `;
}

// ═══════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════

function smrClass(value) {
    const v = value.toLowerCase();
    if (v.includes("insuffisant")) return "insufficient";
    if (v.includes("faible")) return "low";
    if (v.includes("modéré") || v.includes("modere")) return "moderate";
    return ""; // defaults to green (important)
}

function benefitClass(value) {
    const v = value.toLowerCase();
    if (v.includes("geringerer")) return "lesser";
    if (v === "gilt als belegt") return "orphan-proven";
    if (v === "ist nicht belegt" || v === "gilt als nicht belegt") return "not-proven";
    if (v.includes("kein")) return "none";
    if (v.includes("nicht quantifizierbar")) return "non-quantifiable";
    if (v.includes("gering")) return "minor";
    if (v.includes("beträchtlich") || v.includes("betrachtlich")) return "considerable";
    if (v.includes("erheblich")) return ""; // defaults to green (major)
    return "";
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

function showStatus(el, message, type) {
    el.textContent = message;
    el.className = `status-msg ${type}`;
    el.classList.remove("hidden");
}

function hideStatus(el) {
    el.classList.add("hidden");
}

function esc(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
