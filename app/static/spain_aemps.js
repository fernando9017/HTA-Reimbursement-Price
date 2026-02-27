/**
 * Spain AEMPS HTA Deep-Dive module.
 *
 * Features:
 *   1. IPT Browser — search/filter all AEMPS-assessed drugs
 *   2. IPT Detail — full positioning profile per drug
 *   3. AI-powered analysis per IPT report
 */

// ── State ────────────────────────────────────────────────────────────

let aempsFilters = null;
let aiAnalysisAvailable = false;

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    setupAEMPSTabs();
    await Promise.all([loadAEMPSFilters(), checkAIAvailability()]);
    setupAEMPSSearch();
    setupAEMPSDetail();
    searchAEMPSDrugs();
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

function setupAEMPSTabs() {
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

async function loadAEMPSFilters() {
    try {
        const res = await fetch("/api/spain-aemps/filters");
        if (!res.ok) return;
        aempsFilters = await res.json();

        const posSel = document.getElementById("aemps-pos-filter");
        if (posSel && aempsFilters.positioning_values) {
            aempsFilters.positioning_values.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p;
                opt.textContent = p;
                posSel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load AEMPS filters:", e);
    }
}

// ── Label helpers ────────────────────────────────────────────────────

function posBadgeClass(pos) {
    const p = (pos || "").toLowerCase();
    if (p.includes("desfavorable") || p.includes("no favorable") || p.includes("unfavorable")) return "aemps-pos-unfavorable";
    if (p.includes("condicion")) return "aemps-pos-conditional";
    if (p.includes("favorable")) return "aemps-pos-favorable";
    if (p.includes("pendiente") || p.includes("pending")) return "aemps-pos-pending";
    return "";
}

// ── Drug Browser ─────────────────────────────────────────────────────

function setupAEMPSSearch() {
    const input = document.getElementById("aemps-query");
    const btn = document.getElementById("btn-search-aemps");
    const posSel = document.getElementById("aemps-pos-filter");

    btn.addEventListener("click", searchAEMPSDrugs);
    input.addEventListener("keydown", e => { if (e.key === "Enter") searchAEMPSDrugs(); });
    posSel.addEventListener("change", searchAEMPSDrugs);
}

async function searchAEMPSDrugs() {
    const q = document.getElementById("aemps-query").value.trim();
    const pos = document.getElementById("aemps-pos-filter").value;
    const statusEl = document.getElementById("aemps-browse-status");
    const resultsEl = document.getElementById("aemps-browse-results");

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pos) params.set("positioning", pos);
    params.set("limit", "200");

    showStatus(statusEl, "Searching AEMPS IPT reports...", "loading");
    resultsEl.innerHTML = "";

    try {
        const res = await fetch("/api/spain-aemps/drugs?" + params);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No IPT reports found matching your criteria.</p>';
            return;
        }

        renderAEMPSDrugList(data.results, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderAEMPSDrugList(drugs, container) {
    let html = `<p class="results-summary">${drugs.length} drug(s) with IPT reports</p>`;
    html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
    html += '<th>Drug / Substance</th><th>IPTs</th>';
    html += '<th>Best Positioning</th>';
    html += '<th>Latest Date</th>';
    html += '</tr></thead><tbody>';

    for (const d of drugs) {
        const posClass = posBadgeClass(d.best_positioning);
        html += `<tr class="aemps-drug-row" data-substance="${esc(d.active_substance)}" style="cursor:pointer">`;
        html += `<td class="col-name"><strong>${esc(d.active_substance)}</strong></td>`;
        html += `<td style="text-align:center">${d.ipt_count}</td>`;
        html += `<td><span class="tag ${posClass}">${esc(d.best_positioning_en || d.best_positioning || "—")}</span></td>`;
        html += `<td style="white-space:nowrap">${esc(d.latest_date)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll(".aemps-drug-row").forEach(row => {
        row.addEventListener("click", () => loadAEMPSDrugDetail(row.dataset.substance));
    });
}

// ── IPT Detail ───────────────────────────────────────────────────────

function setupAEMPSDetail() {
    document.getElementById("btn-back-browse").addEventListener("click", () => {
        document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
        document.querySelector('[data-tab="browse"]').classList.add("active");
        document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
        document.getElementById("tab-browse").classList.remove("hidden");
    });
}

async function loadAEMPSDrugDetail(substance) {
    document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
    document.querySelector('[data-tab="detail"]').classList.add("active");
    document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
    document.getElementById("tab-detail").classList.remove("hidden");

    const title = document.getElementById("aemps-detail-title");
    const headerEl = document.getElementById("aemps-detail-header");
    const itemsEl = document.getElementById("aemps-detail-items");

    title.textContent = "IPT Detail — " + substance;
    headerEl.innerHTML = '';
    itemsEl.innerHTML = '<p class="status-msg loading">Loading AEMPS IPT profile...</p>';

    document.getElementById("tab-detail").scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch("/api/spain-aemps/drugs/" + encodeURIComponent(substance));
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        headerEl.innerHTML = renderAEMPSDrugHeader(data);
        renderAEMPSIPTItems(data, itemsEl);
    } catch (e) {
        itemsEl.innerHTML = '<p class="status-msg error">Could not load IPT detail.</p>';
    }
}

function renderAEMPSDrugHeader(profile) {
    let html = '<div class="gba-profile-header">';
    html += `<div class="gba-profile-substance">${esc(profile.active_substance)}</div>`;
    html += `<div class="gba-profile-meta">${profile.total_ipts} IPT report(s)</div>`;
    html += '</div>';
    return html;
}

function renderAEMPSIPTItems(profile, container) {
    const items = profile.ipt_items || [];
    if (items.length === 0) {
        container.innerHTML = '<p class="no-results">No IPT reports found.</p>';
        return;
    }

    let html = '';
    for (const ipt of items) {
        const posClass = posBadgeClass(ipt.positioning_en || ipt.positioning);

        html += '<div class="has-assessment-card">';

        // Header: reference + date
        html += '<div class="has-assessment-header">';
        html += `<div class="has-assessment-motif">${esc(ipt.ipt_reference || "IPT Report")}</div>`;
        html += `<div class="has-assessment-date">${esc(ipt.published_date)}</div>`;
        html += '</div>';

        // Title
        html += `<div class="has-product-names">${esc(ipt.title)}</div>`;

        // Positioning badge
        html += '<div class="has-rating-grid">';
        html += '<div class="has-rating-item">';
        html += '<div class="has-rating-label">Therapeutic Positioning</div>';
        html += `<div class="has-rating-value ${posClass}">${esc(ipt.positioning_en || ipt.positioning || "Pending")}</div>`;
        html += '</div>';
        html += '</div>';

        // Bifimed status
        if (ipt.bifimed_status) {
            html += '<div class="has-descriptions">';
            html += `<div class="has-desc-item"><strong>Bifimed:</strong> ${esc(ipt.bifimed_status)}`;
            if (ipt.bifimed_url) {
                html += ` <a href="${esc(ipt.bifimed_url)}" target="_blank" rel="noopener">[View]</a>`;
            }
            html += '</div></div>';
        }

        // Action bar
        html += '<div class="gba-action-bar">';
        if (ipt.assessment_url) {
            html += `<a href="${esc(ipt.assessment_url)}" target="_blank" rel="noopener" class="gba-source-btn">IPT Report &rarr;</a>`;
        }
        if (ipt.ipt_reference && aiAnalysisAvailable) {
            html += `<button class="gba-ai-btn aemps-ai-btn" data-ref="${esc(ipt.ipt_reference)}">Analyze with AI</button>`;
        }
        html += '</div>';

        // AI analysis container
        if (ipt.ipt_reference && aiAnalysisAvailable) {
            html += `<div class="gba-ai-analysis hidden" id="ai-aemps-${esc(ipt.ipt_reference)}"></div>`;
        }

        html += '</div>'; // assessment-card
    }

    container.innerHTML = html;

    container.querySelectorAll(".aemps-ai-btn").forEach(btn => {
        btn.addEventListener("click", () => loadAEMPSAIAnalysis(btn.dataset.ref));
    });
}

// ── AI Analysis ─────────────────────────────────────────────────────

async function loadAEMPSAIAnalysis(iptRef) {
    const containerId = "ai-aemps-" + iptRef;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!container.classList.contains("hidden") && !container.querySelector(".loading")) {
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = '<p class="status-msg loading">Generating AI analysis...</p>';

    const btn = document.querySelector(`[data-ref="${iptRef}"]`);
    if (btn) btn.textContent = "Analyzing...";

    try {
        const res = await fetch("/api/spain-aemps/analyze/" + encodeURIComponent(iptRef));
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Analysis failed");
        }
        const data = await res.json();
        renderAEMPSAIAnalysis(data, container);
        if (btn) btn.textContent = data.cached ? "AI Analysis (cached)" : "AI Analysis";
    } catch (e) {
        container.innerHTML = `<p class="status-msg error">${esc(e.message)}</p>`;
        if (btn) btn.textContent = "Analyze with AI";
    }
}

function renderAEMPSAIAnalysis(analysis, container) {
    let html = '<div class="gba-ai-card">';
    html += '<div class="gba-ai-header">';
    html += '<span class="gba-ai-title">AI-Powered IPT Analysis</span>';
    html += `<span class="gba-ai-model">Model: ${esc(analysis.ai_model)}${analysis.cached ? " (cached)" : ""}</span>`;
    html += '</div>';

    const sections = [
        { key: "overall_summary", label: "SUMMARY" },
        { key: "clinical_context", label: "CLINICAL CONTEXT" },
        { key: "positioning_rationale", label: "POSITIONING RATIONALE" },
        { key: "comparator_context", label: "COMPARATORS" },
        { key: "clinical_evidence_text", label: "CLINICAL EVIDENCE" },
        { key: "bifimed_implications", label: "BIFIMED & REIMBURSEMENT" },
        { key: "market_implications", label: "MARKET & ACCESS IMPLICATIONS", extra: "gba-ai-market" },
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
