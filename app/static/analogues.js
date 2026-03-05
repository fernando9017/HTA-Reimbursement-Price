/**
 * Analogue Selection module — Frontend logic.
 *
 * Two modes:
 *   1. Manual Filters: Filter EMA medicines by therapeutic category, orphan status, etc.
 *   2. AI Chatbot: Describe your product in natural language and let AI find analogues.
 *
 * Depends on shared.js for: esc, showStatus, hideStatus
 */

// ── Mode Switcher ─────────────────────────────────────────────────────

const modeFiltersTab = document.getElementById("mode-filters-tab");
const modeChatbotTab = document.getElementById("mode-chatbot-tab");
const filtersSection = document.getElementById("filters-section");
const chatbotSection = document.getElementById("chatbot-section");
const analogueResultsSection = document.getElementById("analogue-results-section");

modeFiltersTab.addEventListener("click", () => switchMode("filters"));
modeChatbotTab.addEventListener("click", () => switchMode("chatbot"));

function switchMode(mode) {
    modeFiltersTab.classList.toggle("active", mode === "filters");
    modeChatbotTab.classList.toggle("active", mode === "chatbot");
    modeFiltersTab.setAttribute("aria-selected", mode === "filters");
    modeChatbotTab.setAttribute("aria-selected", mode === "chatbot");
    filtersSection.classList.toggle("hidden", mode !== "filters");
    chatbotSection.classList.toggle("hidden", mode !== "chatbot");
    // Show manual results section only in filters mode
    analogueResultsSection.classList.toggle("hidden", mode !== "filters");
}

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
        if (resp.status === 503) {
            showStatus(
                analogueStatus,
                "EMA data is still loading. The EMA database may be temporarily unreachable. " +
                "Use the Reload button below to retry, or wait and refresh the page.",
                "error"
            );
            analogueResultsDiv.innerHTML =
                '<button class="btn-secondary" onclick="reloadData()" style="margin-top:8px">' +
                'Reload EMA Data</button>';
            return;
        }
        if (!resp.ok) {
            showStatus(analogueStatus, "Failed to load filter options. Data may still be loading.", "error");
            return;
        }
        const data = await resp.json();

        // Check if we actually got therapeutic areas (EMA data loaded)
        if (!data.therapeutic_taxonomy || data.therapeutic_taxonomy.length === 0) {
            showStatus(
                analogueStatus,
                "EMA medicine data could not be loaded. Therapeutic area filters are unavailable. " +
                "Use the Reload button below to retry fetching from EMA.",
                "error"
            );
            analogueResultsDiv.innerHTML =
                '<button class="btn-secondary" onclick="reloadData()" style="margin-top:8px">' +
                'Reload EMA Data</button>';
        }

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

async function reloadData() {
    showStatus(analogueStatus, "Reloading EMA data from source...", "loading");
    analogueResultsDiv.innerHTML = "";
    try {
        const resp = await fetch("/api/reload", { method: "POST" });
        const result = await resp.json();
        if (result.success) {
            showStatus(analogueStatus, `Data reloaded successfully (${result.ema_count} medicines). Refreshing filters...`, "info");
            setTimeout(() => loadAnalogueFilters(), 500);
        } else {
            const errMsg = result.errors && result.errors.length > 0
                ? result.errors.join("; ")
                : "Unknown error";
            showStatus(
                analogueStatus,
                `Reload partially failed: ${errMsg}. ${result.ema_count > 0 ? "EMA data is available." : "EMA data is still unavailable."}`,
                "error"
            );
            if (result.ema_count > 0) {
                setTimeout(() => loadAnalogueFilters(), 500);
            }
        }
    } catch (err) {
        showStatus(analogueStatus, `Reload failed: ${err.message}`, "error");
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


// ══════════════════════════════════════════════════════════════════════
// ── AI Chatbot ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

const chatMessages = document.getElementById("chatbot-messages");
const chatInput = document.getElementById("chatbot-input");
const chatSendBtn = document.getElementById("chatbot-send-btn");
const chatResultsSection = document.getElementById("chatbot-results-section");
const chatFiltersDisplay = document.getElementById("chatbot-filters-display");
const chatStatus = document.getElementById("chatbot-status");
const chatResultsDiv = document.getElementById("chatbot-results");

let chatHistory = []; // [{role, content}]
let chatSearchResults = []; // For export

// ── Event listeners ──────────────────────────────────────────────────

chatSendBtn.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});

// Auto-resize textarea
chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
});

// Clickable example queries
chatMessages.addEventListener("click", (e) => {
    const li = e.target.closest(".chat-examples-list li");
    if (li) {
        chatInput.value = li.textContent;
        sendChatMessage();
    }
});

// ── Send message ─────────────────────────────────────────────────────

let chatSending = false;

async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message || chatSending) return;

    // Lock UI while sending
    chatSending = true;
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    // Add user message to UI
    appendChatMessage("user", message);
    chatInput.value = "";
    chatInput.style.height = "auto";

    // Show typing indicator
    const typingId = appendTypingIndicator();

    // Hide previous results
    chatResultsSection.classList.add("hidden");

    try {
        const resp = await fetch("/api/analogues/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                history: chatHistory.slice(-10),
            }),
        });

        removeTypingIndicator(typingId);

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            const errMsg = err.detail || `Server error (${resp.status})`;
            appendChatMessage("assistant", `Sorry, I encountered an error: ${errMsg}`);
            return;
        }

        const data = await resp.json();

        // Add AI response to chat
        chatHistory.push({ role: "user", content: message });
        chatHistory.push({ role: "assistant", content: data.ai_message });

        // Build the assistant message with model badge
        let aiContent = data.ai_message;
        if (data.ai_model) {
            aiContent += `\n\n<span class="chat-model-badge">Powered by ${esc(data.ai_model)}</span>`;
        }
        appendChatMessage("assistant", aiContent, true);

        // Show filters applied
        if (data.filters_applied) {
            renderChatFilters(data.filters_applied);
        }

        // Show results
        if (data.total > 0) {
            chatSearchResults = data.results;
            renderChatResults(data);
        } else if (data.filters_applied) {
            chatResultsSection.classList.remove("hidden");
            showStatus(chatStatus, "No medicines found matching the AI-selected criteria. Try rephrasing your description.", "info");
            chatResultsDiv.innerHTML = "";
        }
    } catch (err) {
        removeTypingIndicator(typingId);
        appendChatMessage("assistant", `Sorry, I couldn't connect to the AI service: ${err.message}`);
    } finally {
        // Unlock UI
        chatSending = false;
        chatSendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// ── Chat UI helpers ──────────────────────────────────────────────────

function appendChatMessage(role, content, isHtml = false) {
    const wrapper = document.createElement("div");
    wrapper.className = `chat-message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "chat-avatar";
    avatar.textContent = role === "user" ? "You" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    if (isHtml) {
        bubble.innerHTML = formatChatContent(content);
    } else {
        bubble.innerHTML = formatChatContent(esc(content));
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatChatContent(text) {
    // Convert markdown-like formatting to HTML
    return "<p>" + text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>")
    + "</p>";
}

function appendTypingIndicator() {
    const id = "typing-" + Date.now();
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message assistant";
    wrapper.id = id;

    const avatar = document.createElement("div");
    avatar.className = "chat-avatar";
    avatar.textContent = "AI";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble typing-indicator";
    bubble.innerHTML = '<span></span><span></span><span></span>';

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ── Render AI-selected filters ───────────────────────────────────────

function renderChatFilters(filters) {
    const tags = [];
    if (filters.therapeutic_category) tags.push(`<span class="chat-filter-tag">Category: ${esc(filters.therapeutic_category)}</span>`);
    if (filters.therapeutic_subcategory) tags.push(`<span class="chat-filter-tag">Sub: ${esc(filters.therapeutic_subcategory)}</span>`);
    if (filters.indication_keyword) tags.push(`<span class="chat-filter-tag">Indication: ${esc(filters.indication_keyword)}</span>`);
    if (filters.orphan) tags.push(`<span class="chat-filter-tag">Orphan: ${esc(filters.orphan)}</span>`);
    if (filters.prevalence_category) tags.push(`<span class="chat-filter-tag">Prevalence: ${esc(filters.prevalence_category)}</span>`);
    if (filters.years) tags.push(`<span class="chat-filter-tag">Last ${filters.years} years</span>`);
    if (filters.line_of_therapy) tags.push(`<span class="chat-filter-tag">LoT: ${esc(filters.line_of_therapy)}</span>`);
    if (filters.treatment_setting) tags.push(`<span class="chat-filter-tag">Setting: ${esc(filters.treatment_setting)}</span>`);
    if (filters.evidence_tier) tags.push(`<span class="chat-filter-tag">Evidence: ${esc(filters.evidence_tier)}</span>`);
    if (filters.substance) tags.push(`<span class="chat-filter-tag">Substance: ${esc(filters.substance)}</span>`);
    if (filters.atc_code) tags.push(`<span class="chat-filter-tag">ATC: ${esc(filters.atc_code)}</span>`);
    if (filters.mah) tags.push(`<span class="chat-filter-tag">MAH: ${esc(filters.mah)}</span>`);
    if (filters.hta_country) tags.push(`<span class="chat-filter-tag">HTA: ${esc(filters.hta_country)}</span>`);
    if (filters.conditional_approval === "yes") tags.push('<span class="chat-filter-tag">Conditional MA</span>');
    if (filters.accelerated_assessment === "yes") tags.push('<span class="chat-filter-tag">Accelerated</span>');
    if (filters.new_active_substance === "yes") tags.push('<span class="chat-filter-tag">New Substance</span>');
    if (filters.exclude_generics) tags.push('<span class="chat-filter-tag">Excl. Generics</span>');
    if (filters.exclude_biosimilars) tags.push('<span class="chat-filter-tag">Excl. Biosimilars</span>');

    if (tags.length > 0) {
        chatFiltersDisplay.innerHTML = `
            <div class="chat-filters-applied">
                <span class="chat-filters-label">Filters applied by AI:</span>
                ${tags.join("")}
            </div>
        `;
    } else {
        chatFiltersDisplay.innerHTML = "";
    }
}

// ── Render chatbot results ───────────────────────────────────────────

function renderChatResults(data) {
    chatResultsSection.classList.remove("hidden");
    hideStatus(chatStatus);

    // Reuse the same table rendering from manual mode
    const hasHTA = data.results.some(m => m.hta_summaries && m.hta_summaries.length > 0);
    const hasIndicationSegments = data.results.some(m => m.indication_segment);

    const header = `
        <div class="results-header">
            <p class="results-summary">
                Found <strong>${data.total}</strong> analogue(s) matching your description
            </p>
            <button class="btn-export" id="export-chat-excel-btn" title="Export results to CSV">Export to CSV</button>
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

    chatResultsDiv.innerHTML = header + table;

    document.getElementById("export-chat-excel-btn").addEventListener("click", () => {
        // Temporarily swap results for export
        const saved = lastSearchResults;
        lastSearchResults = chatSearchResults;
        exportToExcel();
        lastSearchResults = saved;
    });
}
