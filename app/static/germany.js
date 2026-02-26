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

    // Sub-tabs: By Assessment / By Subpopulation
    document.querySelectorAll(".gba-detail-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".gba-detail-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const view = tab.dataset.view;
            document.querySelectorAll(".gba-detail-view").forEach(v => v.classList.add("hidden"));
            const target = document.getElementById("gba-view-" + view);
            if (target) target.classList.remove("hidden");
        });
    });
}

async function loadGBADrugDetail(substance) {
    // Switch to detail tab
    document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
    document.querySelector('[data-tab="detail"]').classList.add("active");
    document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
    document.getElementById("tab-detail").classList.remove("hidden");

    const title = document.getElementById("gba-detail-title");
    const headerEl = document.getElementById("gba-detail-header");
    const assessmentView = document.getElementById("gba-view-assessment");
    const subpopView = document.getElementById("gba-view-subpopulation");

    title.textContent = "Assessment Detail — " + substance;
    headerEl.innerHTML = '';
    assessmentView.innerHTML = '<p class="status-msg loading">Loading G-BA assessment profile...</p>';
    subpopView.innerHTML = '';

    // Reset sub-tabs to default (By Assessment)
    document.querySelectorAll(".gba-detail-tab").forEach(t => t.classList.remove("active"));
    document.querySelector('[data-view="assessment"]').classList.add("active");
    document.querySelectorAll(".gba-detail-view").forEach(v => v.classList.add("hidden"));
    assessmentView.classList.remove("hidden");

    document.getElementById("tab-detail").scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch("/api/germany/drugs/" + encodeURIComponent(substance));
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        // Render shared drug header
        headerEl.innerHTML = renderGBADrugHeader(data);

        // Render both views
        renderGBAGroupedView(data, assessmentView);
        renderGBASubpopView(data, subpopView);
    } catch (e) {
        assessmentView.innerHTML = '<p class="status-msg error">Could not load assessment detail.</p>';
    }
}

function renderGBADrugHeader(profile) {
    let html = '<div class="gba-profile-header">';
    html += `<div class="gba-profile-substance">${esc(profile.active_substance)}</div>`;
    if (profile.trade_names.length > 0) {
        html += `<div class="gba-profile-trade">${profile.trade_names.map(n => esc(n)).join(", ")}</div>`;
    }
    const groupedCount = (profile.grouped_assessments || []).length;
    const subpopCount = profile.total_assessments;
    html += `<div class="gba-profile-meta">${groupedCount} assessment(s), ${subpopCount} subpopulation(s)</div>`;
    html += '</div>';
    return html;
}

// ── By Assessment view (grouped by decision_id) ───────────────────

function renderGBAGroupedView(profile, container) {
    const grouped = profile.grouped_assessments || [];
    if (grouped.length === 0) {
        container.innerHTML = '<p class="no-results">No assessments found.</p>';
        return;
    }

    let html = '';
    for (const g of grouped) {
        const subCount = g.subpopulations ? g.subpopulations.length : 0;
        html += '<div class="gba-grouped-card">';

        // Grouped header
        html += '<div class="gba-grouped-header">';
        html += `<div class="gba-grouped-indication">${esc(g.indication_en || g.indication)}</div>`;
        html += '<div class="gba-grouped-meta">';
        if (subCount > 1) {
            html += `<span class="gba-grouped-badge">${subCount} subpopulations</span>`;
        }
        html += `<span class="gba-grouped-date">${esc(g.decision_date)}</span>`;
        html += '</div>';
        html += '</div>';

        // Subpopulations
        html += '<div class="gba-grouped-subpops">';
        if (g.subpopulations && subCount > 0) {
            for (let i = 0; i < g.subpopulations.length; i++) {
                const sub = g.subpopulations[i];
                html += '<div class="gba-grouped-subpop">';

                if (subCount > 1) {
                    html += `<div class="gba-grouped-subpop-num">Subpopulation ${i + 1} of ${subCount}</div>`;
                }

                if (sub.patient_group) {
                    html += `<div class="gba-subpop-group"><strong>Population:</strong> ${esc(sub.patient_group_en || sub.patient_group)}</div>`;
                }

                html += '<div class="gba-outcome-grid">';
                html += renderOutcomeItem("OUTCOME", sub.benefit_rating_en || sub.benefit_rating, benefitBadgeClass(sub.benefit_rating));
                if (sub.evidence_level || sub.evidence_level_en) {
                    html += renderOutcomeItem("EVIDENCE", sub.evidence_level_en || sub.evidence_level, evidenceBadgeClass(sub.evidence_level));
                }
                if (sub.comparator) {
                    html += renderOutcomeItem("COMPARATOR", sub.comparator_en || sub.comparator, "");
                }
                html += '</div>'; // outcome-grid
                html += '</div>'; // grouped-subpop
            }
        } else {
            // No subpopulation detail
            const benefitClass = benefitBadgeClass(g.overall_benefit);
            html += '<div class="gba-grouped-subpop">';
            html += '<div class="gba-outcome-grid">';
            html += renderOutcomeItem("OUTCOME", g.overall_benefit_en || g.overall_benefit || "—", benefitClass);
            html += '</div></div>';
        }
        html += '</div>'; // grouped-subpops

        // Action bar
        html += '<div class="gba-action-bar">';
        if (g.assessment_url) {
            html += `<a href="${esc(g.assessment_url)}" target="_blank" rel="noopener" class="gba-source-btn">G-BA Assessment &rarr;</a>`;
        }
        if (g.decision_id && aiAnalysisAvailable) {
            html += `<button class="gba-ai-btn" data-decision-id="${esc(g.decision_id)}">Analyze with AI</button>`;
        }
        html += '</div>';

        // AI analysis container
        if (g.decision_id && aiAnalysisAvailable) {
            html += `<div class="gba-ai-analysis hidden" id="ai-analysis-${esc(g.decision_id)}"></div>`;
        }

        html += '</div>'; // grouped-card
    }

    container.innerHTML = html;
    container.querySelectorAll(".gba-ai-btn").forEach(btn => {
        btn.addEventListener("click", () => loadAIAnalysis(btn.dataset.decisionId));
    });
}

// ── By Subpopulation view (flat, one card per subpop) ─────────────

function renderGBASubpopView(profile, container) {
    let html = '';
    for (const a of profile.current_assessments) {
        html += '<div class="gba-assessment-card">';

        html += '<div class="gba-assessment-header">';
        html += `<div class="gba-assessment-indication">${esc(a.indication_en || a.indication)}</div>`;
        html += `<div class="gba-assessment-date">${esc(a.decision_date)}</div>`;
        html += '</div>';

        if (a.subpopulations && a.subpopulations.length > 0) {
            for (const sub of a.subpopulations) {
                html += '<div class="gba-subpop">';
                if (sub.patient_group) {
                    html += `<div class="gba-subpop-group"><strong>Population:</strong> ${esc(sub.patient_group_en || sub.patient_group)}</div>`;
                }
                html += '<div class="gba-outcome-grid">';
                html += renderOutcomeItem("OUTCOME", sub.benefit_rating_en || sub.benefit_rating || "—", benefitBadgeClass(sub.benefit_rating));
                if (sub.evidence_level || sub.evidence_level_en) {
                    html += renderOutcomeItem("EVIDENCE", sub.evidence_level_en || sub.evidence_level, evidenceBadgeClass(sub.evidence_level));
                }
                if (sub.comparator) {
                    html += renderOutcomeItem("COMPARATOR", sub.comparator_en || sub.comparator, "");
                }
                html += '</div>'; // outcome-grid
                html += '</div>'; // subpop
            }
        } else {
            const benefitClass = benefitBadgeClass(a.overall_benefit);
            html += '<div class="gba-subpop">';
            html += '<div class="gba-outcome-grid">';
            html += renderOutcomeItem("OUTCOME", a.overall_benefit_en || a.overall_benefit || "—", benefitClass);
            html += '</div></div>';
        }

        // Action bar
        html += '<div class="gba-action-bar">';
        if (a.assessment_url) {
            html += `<a href="${esc(a.assessment_url)}" target="_blank" rel="noopener" class="gba-source-btn">G-BA Assessment &rarr;</a>`;
        }
        if (a.decision_id && aiAnalysisAvailable) {
            html += `<button class="gba-ai-btn" data-decision-id="${esc(a.decision_id)}" data-view="subpop">Analyze with AI</button>`;
        }
        html += '</div>';

        if (a.decision_id && aiAnalysisAvailable) {
            html += `<div class="gba-ai-analysis hidden" id="ai-analysis-subpop-${esc(a.decision_id)}"></div>`;
        }

        html += '</div>'; // assessment-card
    }

    container.innerHTML = html;
    container.querySelectorAll(".gba-ai-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            loadAIAnalysis(btn.dataset.decisionId, btn.dataset.view === "subpop" ? "subpop" : "");
        });
    });
}

// ── Shared outcome item renderer ──────────────────────────────────

function renderOutcomeItem(label, value, cssClass) {
    let html = '<div class="gba-outcome-item">';
    html += `<div class="gba-outcome-label">${label}</div>`;
    html += `<div class="gba-outcome-value ${cssClass || ""}">${esc(value || "—")}</div>`;
    html += '</div>';
    return html;
}

// ── AI Analysis ─────────────────────────────────────────────────────

async function loadAIAnalysis(decisionId, viewPrefix) {
    const containerId = viewPrefix
        ? "ai-analysis-" + viewPrefix + "-" + decisionId
        : "ai-analysis-" + decisionId;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Toggle: if already visible and loaded, just hide
    if (!container.classList.contains("hidden") && !container.querySelector(".loading")) {
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = '<p class="status-msg loading">Generating AI analysis... This may take a few seconds.</p>';

    // Update button text for the clicked button
    const btn = container.previousElementSibling?.querySelector(`[data-decision-id="${decisionId}"]`)
        || document.querySelector(`[data-decision-id="${decisionId}"]`);
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
