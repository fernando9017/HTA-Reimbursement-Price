/**
 * Germany G-BA HTA Deep-Dive module.
 *
 * Features:
 *   1. Drug Browser — search/filter all G-BA assessed drugs
 *   2. Assessment Detail — full per-subpopulation outcome view
 */

// ── State ────────────────────────────────────────────────────────────

let gbaFilters = null;
let aiAnalysisAvailable = false;

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    setupGBATabs();
    await Promise.all([loadGBAFilters(), checkAIAvailability()]);
    setupGBASearch();
    setupGBADetail();
    // Auto-load all drugs on page load
    searchGBADrugs();
});

async function checkAIAvailability() {
    try {
        const res = await fetch("/api/status");
        if (res.ok) {
            const data = await res.json();
            aiAnalysisAvailable = !!data.ai_analysis_available;
        }
    } catch (e) {
        // AI analysis stays disabled
    }
}

// ── Tabs ─────────────────────────────────────────────────────────────

function setupGBATabs() {
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

async function loadGBAFilters() {
    try {
        const res = await fetch("/api/germany/filters");
        if (!res.ok) return;
        gbaFilters = await res.json();
        const sel = document.getElementById("gba-benefit-filter");
        if (sel && gbaFilters.benefit_ratings) {
            gbaFilters.benefit_ratings.forEach(r => {
                const opt = document.createElement("option");
                opt.value = r;
                opt.textContent = benefitLabel(r);
                sel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load G-BA filters:", e);
    }
}

// ── Label helpers ────────────────────────────────────────────────────

function benefitLabel(raw) {
    const map = {
        "erheblich": "Major added benefit (erheblich)",
        "beträchtlich": "Considerable added benefit (beträchtlich)",
        "gering": "Minor added benefit (gering)",
        "nicht quantifizierbar": "Non-quantifiable (nicht quantifizierbar)",
        "kein Zusatznutzen": "No added benefit (kein Zusatznutzen)",
        "geringerer Nutzen": "Lesser benefit (geringerer Nutzen)",
    };
    return map[raw] || raw;
}

function evidenceLabel(raw) {
    const map = {
        "Beleg": "Proof (Beleg)",
        "Hinweis": "Indication (Hinweis)",
        "Anhaltspunkt": "Hint (Anhaltspunkt)",
    };
    return map[raw] || raw;
}

function benefitBadgeClass(rating) {
    const r = (rating || "").toLowerCase();
    if (r === "erheblich") return "gba-benefit-major";
    if (r === "beträchtlich") return "gba-benefit-considerable";
    if (r === "gering") return "gba-benefit-minor";
    if (r === "nicht quantifizierbar") return "gba-benefit-nq";
    if (r === "kein zusatznutzen") return "gba-benefit-none";
    if (r === "geringerer nutzen") return "gba-benefit-lesser";
    return "";
}

function evidenceBadgeClass(level) {
    const l = (level || "").toLowerCase();
    if (l.includes("beleg")) return "gba-evidence-proof";
    if (l.includes("hinweis")) return "gba-evidence-indication";
    if (l.includes("anhaltspunkt")) return "gba-evidence-hint";
    return "";
}

// ── Drug Browser ─────────────────────────────────────────────────────

function setupGBASearch() {
    const input = document.getElementById("gba-query");
    const btn = document.getElementById("btn-search-gba");
    const benefitSel = document.getElementById("gba-benefit-filter");

    btn.addEventListener("click", searchGBADrugs);
    input.addEventListener("keydown", e => { if (e.key === "Enter") searchGBADrugs(); });
    benefitSel.addEventListener("change", searchGBADrugs);
}

async function searchGBADrugs() {
    const q = document.getElementById("gba-query").value.trim();
    const benefit = document.getElementById("gba-benefit-filter").value;
    const statusEl = document.getElementById("gba-browse-status");
    const resultsEl = document.getElementById("gba-browse-results");

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (benefit) params.set("benefit_rating", benefit);
    params.set("limit", "200");

    showStatus(statusEl, "Searching G-BA assessed drugs...", "loading");
    resultsEl.innerHTML = "";

    try {
        const res = await fetch("/api/germany/drugs?" + params);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No assessed drugs found matching your criteria.</p>';
            return;
        }

        renderGBADrugList(data.results, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderGBADrugList(drugs, container) {
    let html = `<p class="results-summary">${drugs.length} assessed drug(s)</p>`;
    html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
    html += '<th>Active Substance</th><th>Trade Name(s)</th>';
    html += '<th>Indication(s)</th><th>Assessments</th>';
    html += '<th>Best Benefit</th><th>Latest Date</th>';
    html += '</tr></thead><tbody>';

    for (const d of drugs) {
        const benefitClass = benefitBadgeClass(d.best_benefit);
        html += `<tr class="gba-drug-row" data-substance="${esc(d.active_substance)}" style="cursor:pointer">`;
        html += `<td class="col-name"><strong>${esc(d.active_substance)}</strong></td>`;
        html += `<td>${d.trade_names.map(n => esc(n)).join(", ") || "—"}</td>`;
        html += `<td class="col-indication">${(d.indications_en || d.indications).map(i => esc(i)).join("; ") || "—"}</td>`;
        html += `<td style="text-align:center">${d.assessment_count}</td>`;
        html += `<td><span class="tag ${benefitClass}">${esc(d.best_benefit_en || d.best_benefit || "—")}</span></td>`;
        html += `<td style="white-space:nowrap">${esc(d.latest_date)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll(".gba-drug-row").forEach(row => {
        row.addEventListener("click", () => loadGBADrugDetail(row.dataset.substance));
    });
}

// ── Assessment Detail ────────────────────────────────────────────────

function setupGBADetail() {
    document.getElementById("btn-back-browse").addEventListener("click", () => {
        // Switch back to browse tab
        document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
        document.querySelector('[data-tab="browse"]').classList.add("active");
        document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
        document.getElementById("tab-browse").classList.remove("hidden");
    });
}

async function loadGBADrugDetail(substance) {
    // Switch to detail tab
    document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
    document.querySelector('[data-tab="detail"]').classList.add("active");
    document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
    document.getElementById("tab-detail").classList.remove("hidden");

    const title = document.getElementById("gba-detail-title");
    const content = document.getElementById("gba-detail-content");

    title.textContent = "Assessment Detail — " + substance;
    content.innerHTML = '<p class="status-msg loading">Loading G-BA assessment profile...</p>';
    document.getElementById("tab-detail").scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch("/api/germany/drugs/" + encodeURIComponent(substance));
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        renderGBADrugDetail(data, content);
    } catch (e) {
        content.innerHTML = '<p class="status-msg error">Could not load assessment detail.</p>';
    }
}

function renderGBADrugDetail(profile, container) {
    let html = '';

    // ── Drug header ──
    html += '<div class="gba-profile-header">';
    html += `<div class="gba-profile-substance">${esc(profile.active_substance)}</div>`;
    if (profile.trade_names.length > 0) {
        html += `<div class="gba-profile-trade">${profile.trade_names.map(n => esc(n)).join(", ")}</div>`;
    }
    html += `<div class="gba-profile-meta">${profile.total_assessments} current assessment(s)</div>`;
    html += '</div>';

    // ── Each assessment ──
    for (const a of profile.current_assessments) {
        html += '<div class="gba-assessment-card">';

        // Assessment header with indication
        html += '<div class="gba-assessment-header">';
        html += `<div class="gba-assessment-indication">${esc(a.indication_en || a.indication)}</div>`;
        html += `<div class="gba-assessment-date">${esc(a.decision_date)}</div>`;
        html += '</div>';

        // Subpopulation outcomes
        if (a.subpopulations && a.subpopulations.length > 0) {
            for (const sub of a.subpopulations) {
                html += '<div class="gba-subpop">';

                // Patient group
                if (sub.patient_group) {
                    html += `<div class="gba-subpop-group"><strong>Population:</strong> ${esc(sub.patient_group_en || sub.patient_group)}</div>`;
                }

                // Outcome row
                html += '<div class="gba-outcome-grid">';

                // Benefit rating
                const benefitClass = benefitBadgeClass(sub.benefit_rating);
                html += '<div class="gba-outcome-item">';
                html += '<div class="gba-outcome-label">OUTCOME</div>';
                html += `<div class="gba-outcome-value ${benefitClass}">${esc(sub.benefit_rating_en || sub.benefit_rating || "—")}</div>`;
                html += '</div>';

                // Evidence level
                if (sub.evidence_level || sub.evidence_level_en) {
                    const evidenceClass = evidenceBadgeClass(sub.evidence_level);
                    html += '<div class="gba-outcome-item">';
                    html += '<div class="gba-outcome-label">EVIDENCE</div>';
                    html += `<div class="gba-outcome-value ${evidenceClass}">${esc(sub.evidence_level_en || sub.evidence_level)}</div>`;
                    html += '</div>';
                }

                // Comparator
                if (sub.comparator) {
                    html += '<div class="gba-outcome-item">';
                    html += '<div class="gba-outcome-label">COMPARATOR</div>';
                    html += `<div class="gba-outcome-value">${esc(sub.comparator_en || sub.comparator)}</div>`;
                    html += '</div>';
                }

                html += '</div>'; // outcome-grid
                html += '</div>'; // subpop
            }
        } else {
            // Single outcome (no subpopulations)
            const benefitClass = benefitBadgeClass(a.overall_benefit);
            html += '<div class="gba-subpop">';
            html += '<div class="gba-outcome-grid">';
            html += '<div class="gba-outcome-item">';
            html += '<div class="gba-outcome-label">OUTCOME</div>';
            html += `<div class="gba-outcome-value ${benefitClass}">${esc(a.overall_benefit_en || a.overall_benefit || "—")}</div>`;
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }

        // Action bar: source link + AI analysis button
        html += '<div class="gba-action-bar">';
        if (a.assessment_url) {
            html += `<a href="${esc(a.assessment_url)}" target="_blank" rel="noopener" class="gba-source-btn">G-BA Assessment &rarr;</a>`;
        }
        if (a.decision_id && aiAnalysisAvailable) {
            html += `<button class="gba-ai-btn" data-decision-id="${esc(a.decision_id)}">Analyze with AI</button>`;
        }
        html += '</div>';

        // AI analysis container (initially hidden)
        if (a.decision_id && aiAnalysisAvailable) {
            html += `<div class="gba-ai-analysis hidden" id="ai-analysis-${esc(a.decision_id)}"></div>`;
        }

        html += '</div>'; // assessment-card
    }

    container.innerHTML = html;

    // Bind AI analysis buttons
    container.querySelectorAll(".gba-ai-btn").forEach(btn => {
        btn.addEventListener("click", () => loadAIAnalysis(btn.dataset.decisionId));
    });
}

// ── AI Analysis ─────────────────────────────────────────────────────

async function loadAIAnalysis(decisionId) {
    const container = document.getElementById("ai-analysis-" + decisionId);
    if (!container) return;

    // Toggle: if already visible and loaded, just hide
    if (!container.classList.contains("hidden") && !container.querySelector(".loading")) {
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = '<p class="status-msg loading">Generating AI analysis... This may take a few seconds.</p>';

    // Update button text
    const btn = document.querySelector(`[data-decision-id="${decisionId}"]`);
    if (btn) btn.textContent = "Analyzing...";

    try {
        const res = await fetch("/api/germany/analyze/" + encodeURIComponent(decisionId));
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Analysis failed");
        }
        const data = await res.json();
        renderAIAnalysis(data, container);
        if (btn) btn.textContent = data.cached ? "AI Analysis (cached)" : "AI Analysis";
    } catch (e) {
        container.innerHTML = `<p class="status-msg error">${esc(e.message)}</p>`;
        if (btn) btn.textContent = "Analyze with AI";
    }
}

function renderAIAnalysis(analysis, container) {
    let html = '<div class="gba-ai-card">';
    html += '<div class="gba-ai-header">';
    html += '<span class="gba-ai-title">AI-Powered Assessment Analysis</span>';
    html += `<span class="gba-ai-model">Model: ${esc(analysis.ai_model)}${analysis.cached ? " (cached)" : ""}</span>`;
    html += '</div>';

    // Overall summary
    if (analysis.overall_summary) {
        html += '<div class="gba-ai-section">';
        html += '<div class="gba-ai-section-label">SUMMARY</div>';
        html += `<div class="gba-ai-section-text">${esc(analysis.overall_summary)}</div>`;
        html += '</div>';
    }

    // Clinical context
    if (analysis.clinical_context) {
        html += '<div class="gba-ai-section">';
        html += '<div class="gba-ai-section-label">CLINICAL CONTEXT</div>';
        html += `<div class="gba-ai-section-text">${esc(analysis.clinical_context)}</div>`;
        html += '</div>';
    }

    // Subpopulation analyses
    if (analysis.subpopulation_analyses && analysis.subpopulation_analyses.length > 0) {
        for (const sub of analysis.subpopulation_analyses) {
            html += '<div class="gba-ai-subpop">';

            // Header row: patient group + line of therapy
            html += '<div class="gba-ai-subpop-header">';
            if (sub.patient_group) {
                html += `<div class="gba-ai-subpop-group">${esc(sub.patient_group)}</div>`;
            }
            if (sub.line_of_therapy) {
                html += `<span class="gba-ai-lot-badge">${esc(sub.line_of_therapy)}</span>`;
            }
            html += '</div>';

            // Outcome grid
            html += '<div class="gba-ai-outcome-row">';
            if (sub.outcome_en) {
                html += '<div class="gba-ai-field">';
                html += '<div class="gba-ai-field-label">OUTCOME</div>';
                html += `<div class="gba-ai-field-value">${esc(sub.outcome_en)}</div>`;
                html += '</div>';
            }
            if (sub.comparator) {
                html += '<div class="gba-ai-field">';
                html += '<div class="gba-ai-field-label">COMPARATOR</div>';
                html += `<div class="gba-ai-field-value">${esc(sub.comparator)}</div>`;
                html += '</div>';
            }
            if (sub.indication_detail) {
                html += '<div class="gba-ai-field">';
                html += '<div class="gba-ai-field-label">INDICATION</div>';
                html += `<div class="gba-ai-field-value">${esc(sub.indication_detail)}</div>`;
                html += '</div>';
            }
            html += '</div>';

            // Arguments
            html += '<div class="gba-ai-args-row">';

            if (sub.positive_arguments && sub.positive_arguments.length > 0) {
                html += '<div class="gba-ai-args gba-ai-args-pos">';
                html += '<div class="gba-ai-args-label">POSITIVE ARGUMENTS</div>';
                html += '<ul>';
                for (const arg of sub.positive_arguments) {
                    html += `<li>${esc(arg)}</li>`;
                }
                html += '</ul></div>';
            }

            if (sub.negative_arguments && sub.negative_arguments.length > 0) {
                html += '<div class="gba-ai-args gba-ai-args-neg">';
                html += '<div class="gba-ai-args-label">NEGATIVE ARGUMENTS</div>';
                html += '<ul>';
                for (const arg of sub.negative_arguments) {
                    html += `<li>${esc(arg)}</li>`;
                }
                html += '</ul></div>';
            }

            html += '</div>'; // args-row

            // Key trials
            if (sub.key_trials && sub.key_trials.length > 0) {
                html += '<div class="gba-ai-trials">';
                html += '<span class="gba-ai-field-label">KEY TRIALS: </span>';
                html += sub.key_trials.map(t => `<span class="gba-ai-trial-badge">${esc(t)}</span>`).join(" ");
                html += '</div>';
            }

            html += '</div>'; // ai-subpop
        }
    }

    // Market implications
    if (analysis.market_implications) {
        html += '<div class="gba-ai-section gba-ai-market">';
        html += '<div class="gba-ai-section-label">MARKET IMPLICATIONS</div>';
        html += `<div class="gba-ai-section-text">${esc(analysis.market_implications)}</div>`;
        html += '</div>';
    }

    html += '</div>'; // ai-card
    container.innerHTML = html;
}
