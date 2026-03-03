/**
 * UK NICE HTA Deep-Dive module.
 *
 * Features:
 *   1. Guidance Browser — search/filter all NICE-assessed drugs
 *   2. Guidance Detail — full TA/HST profile per drug
 *   3. AI-powered analysis per guidance item
 */

// ── State ────────────────────────────────────────────────────────────

let niceFilters = null;
let aiAnalysisAvailable = false;

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    setupNICETabs();
    await Promise.all([loadNICEFilters(), checkAIAvailability()]);
    setupNICESearch();
    setupNICEDetail();
    searchNICEDrugs();
});

async function checkAIAvailability() {
    try {
        const res = await fetch("/api/status");
        if (res.ok) {
            const data = await res.json();
            aiAnalysisAvailable = !!data.ai_analysis_available;
        }
    } catch (e) { /* AI stays disabled */ }
}

// ── Tabs ─────────────────────────────────────────────────────────────

function setupNICETabs() {
    const tabs = document.querySelectorAll(".mexico-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
            const target = document.getElementById("tab-" + tab.dataset.tab);
            if (target) target.classList.remove("hidden");
        });
    });
}

// ── Filters ──────────────────────────────────────────────────────────

async function loadNICEFilters() {
    try {
        const res = await fetch("/api/uk-nice/filters");
        if (!res.ok) return;
        niceFilters = await res.json();

        const typeSel = document.getElementById("nice-type-filter");
        if (typeSel && niceFilters.guidance_types) {
            niceFilters.guidance_types.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = t;
                typeSel.appendChild(opt);
            });
        }

        const recSel = document.getElementById("nice-rec-filter");
        if (recSel && niceFilters.recommendations) {
            niceFilters.recommendations.forEach(r => {
                const opt = document.createElement("option");
                opt.value = r;
                opt.textContent = r;
                recSel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load NICE filters:", e);
    }
}

// ── Label helpers ────────────────────────────────────────────────────

function recBadgeClass(rec) {
    const r = (rec || "").toLowerCase();
    if (r.includes("not recommended")) return "nice-rec-not";
    if (r.includes("restrictions") || r.includes("optimised")) return "nice-rec-restricted";
    if (r.includes("recommended")) return "nice-rec-yes";
    if (r.includes("research")) return "nice-rec-research";
    if (r.includes("terminated")) return "nice-rec-terminated";
    return "";
}

// ── Drug Browser ─────────────────────────────────────────────────────

function setupNICESearch() {
    const input = document.getElementById("nice-query");
    const btn = document.getElementById("btn-search-nice");
    const typeSel = document.getElementById("nice-type-filter");
    const recSel = document.getElementById("nice-rec-filter");

    btn.addEventListener("click", searchNICEDrugs);
    input.addEventListener("keydown", e => { if (e.key === "Enter") searchNICEDrugs(); });
    typeSel.addEventListener("change", searchNICEDrugs);
    recSel.addEventListener("change", searchNICEDrugs);
}

async function searchNICEDrugs() {
    const q = document.getElementById("nice-query").value.trim();
    const gtype = document.getElementById("nice-type-filter").value;
    const rec = document.getElementById("nice-rec-filter").value;
    const statusEl = document.getElementById("nice-browse-status");
    const resultsEl = document.getElementById("nice-browse-results");

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (gtype) params.set("guidance_type", gtype);
    if (rec) params.set("recommendation", rec);
    params.set("limit", "200");

    showStatus(statusEl, "Searching NICE guidance...", "loading");
    resultsEl.innerHTML = "";

    try {
        const res = await fetch("/api/uk-nice/drugs?" + params);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No guidance found matching your criteria.</p>';
            return;
        }

        renderNICEDrugList(data.results, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderNICEDrugList(drugs, container) {
    let html = `<p class="results-summary">${drugs.length} drug(s) with NICE guidance</p>`;
    html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
    html += '<th>Active Substance</th><th>Trade Name(s)</th>';
    html += '<th>Indication(s)</th><th>Guidance</th>';
    html += '<th>Best Recommendation</th><th>Latest Date</th>';
    html += '</tr></thead><tbody>';

    for (const d of drugs) {
        const recClass = recBadgeClass(d.best_recommendation);
        html += `<tr class="nice-drug-row" data-substance="${esc(d.active_substance)}" style="cursor:pointer">`;
        html += `<td class="col-name"><strong>${esc(d.active_substance)}</strong></td>`;
        html += `<td>${(d.trade_names || []).map(n => esc(n)).join(", ") || "—"}</td>`;
        html += `<td class="col-indication">${(d.indications || []).map(i => esc(i)).join("; ") || "—"}</td>`;
        html += `<td style="text-align:center">${d.guidance_count}</td>`;
        html += `<td><span class="tag ${recClass}">${esc(d.best_recommendation || "—")}</span></td>`;
        html += `<td style="white-space:nowrap">${esc(d.latest_date)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll(".nice-drug-row").forEach(row => {
        row.addEventListener("click", () => loadNICEDrugDetail(row.dataset.substance));
    });
}

// ── Guidance Detail ──────────────────────────────────────────────────

function setupNICEDetail() {
    document.getElementById("btn-back-browse").addEventListener("click", () => {
        document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
        document.querySelector('[data-tab="browse"]').classList.add("active");
        document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
        document.getElementById("tab-browse").classList.remove("hidden");
    });
}

async function loadNICEDrugDetail(substance) {
    document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
    document.querySelector('[data-tab="detail"]').classList.add("active");
    document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
    document.getElementById("tab-detail").classList.remove("hidden");

    const title = document.getElementById("nice-detail-title");
    const headerEl = document.getElementById("nice-detail-header");
    const itemsEl = document.getElementById("nice-detail-items");

    title.textContent = "Guidance Detail — " + substance;
    headerEl.innerHTML = '';
    itemsEl.innerHTML = '<p class="status-msg loading">Loading NICE guidance profile...</p>';

    document.getElementById("tab-detail").scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch("/api/uk-nice/drugs/" + encodeURIComponent(substance));
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        headerEl.innerHTML = renderNICEDrugHeader(data);
        renderNICEGuidanceItems(data, itemsEl);
    } catch (e) {
        itemsEl.innerHTML = '<p class="status-msg error">Could not load guidance detail.</p>';
    }
}

function renderNICEDrugHeader(profile) {
    let html = '<div class="gba-profile-header">';
    html += `<div class="gba-profile-substance">${esc(profile.active_substance)}</div>`;
    if (profile.trade_names && profile.trade_names.length > 0) {
        html += `<div class="gba-profile-trade">${profile.trade_names.map(n => esc(n)).join(", ")}</div>`;
    }
    html += `<div class="gba-profile-meta">${profile.total_guidance} guidance item(s)</div>`;
    html += '</div>';
    return html;
}

function renderNICEGuidanceItems(profile, container) {
    const items = profile.guidance_items || [];
    if (items.length === 0) {
        container.innerHTML = '<p class="no-results">No guidance items found.</p>';
        return;
    }

    let html = '';
    for (const g of items) {
        const recClass = recBadgeClass(g.recommendation);

        html += '<div class="has-assessment-card">';

        // Header: reference + type + date
        html += '<div class="has-assessment-header">';
        html += `<div class="has-assessment-motif">${esc(g.guidance_reference)} — ${esc(g.guidance_type || "Technology Appraisal")}</div>`;
        html += `<div class="has-assessment-date">${esc(g.published_date)}</div>`;
        html += '</div>';

        // Title
        html += `<div class="gba-enhanced-title">${esc(g.title)}</div>`;

        // Indication (extracted from title)
        if (g.indication) {
            html += `<div class="has-product-names">Indication: ${esc(g.indication)}</div>`;
        }

        // Recommendation badge
        html += '<div class="has-rating-grid">';
        html += '<div class="has-rating-item">';
        html += '<div class="has-rating-label">Recommendation</div>';
        html += `<div class="has-rating-value ${recClass}">${esc(g.recommendation || "Pending")}</div>`;
        html += '</div>';
        html += '</div>';

        // Action bar
        html += '<div class="gba-action-bar">';
        if (g.assessment_url) {
            html += `<a href="${esc(g.assessment_url)}" target="_blank" rel="noopener" class="gba-source-btn">NICE Guidance &rarr;</a>`;
        }
        if (g.guidance_reference && aiAnalysisAvailable) {
            html += `<button class="gba-ai-btn nice-ai-btn" data-ref="${esc(g.guidance_reference)}">Analyze with AI</button>`;
        }
        html += '</div>';

        // AI analysis container
        if (g.guidance_reference && aiAnalysisAvailable) {
            html += `<div class="gba-ai-analysis hidden" id="ai-nice-${esc(g.guidance_reference)}"></div>`;
        }

        html += '</div>'; // assessment-card
    }

    container.innerHTML = html;

    container.querySelectorAll(".nice-ai-btn").forEach(btn => {
        btn.addEventListener("click", () => loadNICEAIAnalysis(btn.dataset.ref));
    });
}

// ── AI Analysis ─────────────────────────────────────────────────────

async function loadNICEAIAnalysis(guidanceRef) {
    const containerId = "ai-nice-" + guidanceRef;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!container.classList.contains("hidden") && !container.querySelector(".loading")) {
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = '<p class="status-msg loading">Generating AI analysis...</p>';

    const btn = document.querySelector(`[data-ref="${guidanceRef}"]`);
    if (btn) btn.textContent = "Analyzing...";

    try {
        const res = await fetch("/api/uk-nice/analyze/" + encodeURIComponent(guidanceRef));
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Analysis failed");
        }
        const data = await res.json();
        renderNICEAIAnalysis(data, container);
        if (btn) btn.textContent = data.cached ? "AI Analysis (cached)" : "AI Analysis";
    } catch (e) {
        container.innerHTML = `<p class="status-msg error">${esc(e.message)}</p>`;
        if (btn) btn.textContent = "Analyze with AI";
    }
}

function renderNICEAIAnalysis(analysis, container) {
    let html = '<div class="gba-ai-card">';
    html += '<div class="gba-ai-header">';
    html += '<span class="gba-ai-title">AI-Powered Guidance Analysis</span>';
    html += `<span class="gba-ai-model">Model: ${esc(analysis.ai_model)}${analysis.cached ? " (cached)" : ""}</span>`;
    html += '</div>';

    const sections = [
        { key: "overall_summary", label: "SUMMARY" },
        { key: "clinical_context", label: "CLINICAL CONTEXT" },
        { key: "recommendation_rationale", label: "RECOMMENDATION RATIONALE" },
        { key: "cost_effectiveness", label: "COST-EFFECTIVENESS" },
        { key: "managed_access", label: "MANAGED ACCESS" },
        { key: "clinical_evidence_text", label: "CLINICAL EVIDENCE" },
        { key: "market_implications", label: "MARKET & NHS ACCESS IMPLICATIONS", extra: "gba-ai-market" },
    ];

    for (const s of sections) {
        if (analysis[s.key]) {
            html += `<div class="gba-ai-section ${s.extra || ''}">`;
            html += `<div class="gba-ai-section-label">${s.label}</div>`;
            html += `<div class="gba-ai-section-text">${esc(analysis[s.key])}</div>`;
            html += '</div>';
        }
    }

    if (analysis.evidence_limitations && analysis.evidence_limitations.length > 0) {
        html += '<div class="gba-ce-limitations">';
        html += '<span class="gba-ce-limitations-label">Note:</span> ';
        html += esc(analysis.evidence_limitations.join(". "));
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}
