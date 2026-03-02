/**
 * France HAS HTA Deep-Dive module.
 *
 * Features:
 *   1. Drug Browser — search/filter all HAS-assessed drugs
 *   2. Assessment Detail — full SMR/ASMR profile per drug
 *   3. AI-powered analysis per CT opinion
 */

// ── State ────────────────────────────────────────────────────────────

let hasFilters = null;
let aiAnalysisAvailable = false;

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    setupHASTabs();
    await Promise.all([loadHASFilters(), checkAIAvailability()]);
    setupHASSearch();
    setupHASDetail();
    searchHASDrugs();
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

function setupHASTabs() {
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

async function loadHASFilters() {
    try {
        const res = await fetch("/api/france/filters");
        if (!res.ok) return;
        hasFilters = await res.json();

        const smrSel = document.getElementById("has-smr-filter");
        if (smrSel && hasFilters.smr_ratings) {
            hasFilters.smr_ratings.forEach(r => {
                const opt = document.createElement("option");
                opt.value = r;
                opt.textContent = smrLabel(r);
                smrSel.appendChild(opt);
            });
        }

        const asmrSel = document.getElementById("has-asmr-filter");
        if (asmrSel && hasFilters.asmr_ratings) {
            hasFilters.asmr_ratings.forEach(r => {
                const opt = document.createElement("option");
                opt.value = r;
                opt.textContent = asmrLabel(r);
                asmrSel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load HAS filters:", e);
    }
}

// ── Label helpers ────────────────────────────────────────────────────

function smrLabel(raw) {
    const map = {
        "Important": "Major clinical benefit (Important)",
        "Modéré": "Moderate clinical benefit (Modéré)",
        "Faible": "Minor clinical benefit (Faible)",
        "Insuffisant": "Insufficient (Insuffisant)",
    };
    return map[raw] || raw;
}

function asmrLabel(raw) {
    const map = {
        "I": "ASMR I — Major improvement",
        "II": "ASMR II — Important improvement",
        "III": "ASMR III — Moderate improvement",
        "IV": "ASMR IV — Minor improvement",
        "V": "ASMR V — No improvement",
    };
    return map[raw] || ("ASMR " + raw);
}

function motifLabel(raw) {
    const map = {
        "Inscription": "Initial registration",
        "Renouvellement": "Renewal",
        "Extension d'indication": "Indication extension",
        "Modification": "Modification",
        "Réévaluation": "Re-evaluation",
    };
    return map[raw] || raw;
}

function smrBadgeClass(rating) {
    const r = (rating || "").toLowerCase();
    if (r === "important") return "has-smr-important";
    if (r === "modéré" || r === "modere") return "has-smr-moderate";
    if (r === "faible") return "has-smr-minor";
    if (r === "insuffisant") return "has-smr-insufficient";
    return "";
}

function asmrBadgeClass(rating) {
    const r = (rating || "").toUpperCase();
    if (r === "I") return "has-asmr-i";
    if (r === "II") return "has-asmr-ii";
    if (r === "III") return "has-asmr-iii";
    if (r === "IV") return "has-asmr-iv";
    if (r === "V") return "has-asmr-v";
    return "";
}

// ── Drug Browser ─────────────────────────────────────────────────────

function setupHASSearch() {
    const input = document.getElementById("has-query");
    const btn = document.getElementById("btn-search-has");
    const smrSel = document.getElementById("has-smr-filter");
    const asmrSel = document.getElementById("has-asmr-filter");

    btn.addEventListener("click", searchHASDrugs);
    input.addEventListener("keydown", e => { if (e.key === "Enter") searchHASDrugs(); });
    smrSel.addEventListener("change", searchHASDrugs);
    asmrSel.addEventListener("change", searchHASDrugs);
}

async function searchHASDrugs() {
    const q = document.getElementById("has-query").value.trim();
    const smr = document.getElementById("has-smr-filter").value;
    const asmr = document.getElementById("has-asmr-filter").value;
    const statusEl = document.getElementById("has-browse-status");
    const resultsEl = document.getElementById("has-browse-results");

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (smr) params.set("smr_rating", smr);
    if (asmr) params.set("asmr_rating", asmr);
    params.set("limit", "200");

    showStatus(statusEl, "Searching HAS assessed drugs...", "loading");
    resultsEl.innerHTML = "";

    try {
        const res = await fetch("/api/france/drugs?" + params);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No assessed drugs found matching your criteria.</p>';
            return;
        }

        renderHASDrugList(data.results, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderHASDrugList(drugs, container) {
    let html = `<p class="results-summary">${drugs.length} assessed drug(s)</p>`;
    html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
    html += '<th>Active Substance</th><th>Trade Name(s)</th>';
    html += '<th>Indication(s)</th><th>Assessments</th>';
    html += '<th>Best SMR</th><th>Best ASMR</th>';
    html += '<th>Latest Date</th>';
    html += '</tr></thead><tbody>';

    for (const d of drugs) {
        const smrClass = smrBadgeClass(d.best_smr);
        const asmrClass = asmrBadgeClass(d.best_asmr);
        html += `<tr class="has-drug-row" data-substance="${esc(d.active_substance)}" style="cursor:pointer">`;
        html += `<td class="col-name"><strong>${esc(d.active_substance)}</strong></td>`;
        html += `<td>${d.trade_names.map(n => esc(n)).join(", ") || "—"}</td>`;
        html += `<td class="col-indication">${(d.indications_en || d.indications || []).map(i => esc(i)).join("; ") || "—"}</td>`;
        html += `<td style="text-align:center">${d.assessment_count}</td>`;
        html += `<td><span class="tag ${smrClass}">${esc(d.best_smr_en || d.best_smr || "—")}</span></td>`;
        html += `<td><span class="tag ${asmrClass}">${d.best_asmr ? "ASMR " + esc(d.best_asmr) : "—"}</span></td>`;
        html += `<td style="white-space:nowrap">${esc(d.latest_date)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll(".has-drug-row").forEach(row => {
        row.addEventListener("click", () => loadHASDrugDetail(row.dataset.substance));
    });
}

// ── Assessment Detail ────────────────────────────────────────────────

function setupHASDetail() {
    document.getElementById("btn-back-browse").addEventListener("click", () => {
        document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
        document.querySelector('[data-tab="browse"]').classList.add("active");
        document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
        document.getElementById("tab-browse").classList.remove("hidden");
    });
}

async function loadHASDrugDetail(substance) {
    // Switch to detail tab
    document.querySelectorAll(".mexico-tab").forEach(t => t.classList.remove("active"));
    document.querySelector('[data-tab="detail"]').classList.add("active");
    document.querySelectorAll(".mexico-tab-content").forEach(s => s.classList.add("hidden"));
    document.getElementById("tab-detail").classList.remove("hidden");

    const title = document.getElementById("has-detail-title");
    const headerEl = document.getElementById("has-detail-header");
    const assessmentsEl = document.getElementById("has-detail-assessments");

    title.textContent = "Assessment Detail — " + substance;
    headerEl.innerHTML = '';
    assessmentsEl.innerHTML = '<p class="status-msg loading">Loading HAS assessment profile...</p>';

    document.getElementById("tab-detail").scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch("/api/france/drugs/" + encodeURIComponent(substance));
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        headerEl.innerHTML = renderHASDrugHeader(data);
        renderHASAssessments(data, assessmentsEl);
    } catch (e) {
        assessmentsEl.innerHTML = '<p class="status-msg error">Could not load assessment detail.</p>';
    }
}

function renderHASDrugHeader(profile) {
    let html = '<div class="gba-profile-header">';
    html += `<div class="gba-profile-substance">${esc(profile.active_substance)}</div>`;
    if (profile.trade_names.length > 0) {
        html += `<div class="gba-profile-trade">${profile.trade_names.slice(0, 5).map(n => esc(n)).join(", ")}`;
        if (profile.trade_names.length > 5) html += ` <span class="text-muted">+${profile.trade_names.length - 5} more</span>`;
        html += '</div>';
    }
    html += `<div class="gba-profile-meta">${profile.total_assessments} CT opinion(s)</div>`;
    html += '</div>';
    return html;
}

// ── Assessment cards ────────────────────────────────────────────────

function renderHASAssessments(profile, container) {
    const assessments = profile.assessments || [];
    if (assessments.length === 0) {
        container.innerHTML = '<p class="no-results">No assessments found.</p>';
        return;
    }

    let html = '';
    for (const a of assessments) {
        html += '<div class="has-assessment-card">';

        // Header: motif + date
        html += '<div class="has-assessment-header">';
        html += `<div class="has-assessment-motif">${esc(a.evaluation_reason_en || motifLabel(a.evaluation_reason) || "Assessment")}</div>`;
        html += `<div class="has-assessment-date">${esc(a.opinion_date)}</div>`;
        html += '</div>';

        // Product names
        if (a.product_names && a.product_names.length > 0) {
            const displayNames = a.product_names.slice(0, 3).map(n => esc(n)).join(", ");
            const more = a.product_names.length > 3 ? ` +${a.product_names.length - 3} more` : "";
            html += `<div class="has-product-names">${displayNames}${more}</div>`;
        }

        // Indication
        if (a.indication_en || a.indication) {
            html += '<div style="margin:6px 0;font-size:0.88rem">';
            html += '<strong>Indication:</strong> ';
            if (a.indication_en && a.indication_en !== a.indication) {
                html += esc(a.indication_en);
                html += ` <span style="color:var(--text-light);font-style:italic;font-size:0.82rem">(FR: ${esc(a.indication)})</span>`;
            } else if (a.indication) {
                html += esc(a.indication);
            }
            html += '</div>';
        }

        // SMR / ASMR badges
        html += '<div class="has-rating-grid">';

        if (a.smr_value) {
            html += '<div class="has-rating-item">';
            html += '<div class="has-rating-label">SMR</div>';
            html += `<div class="has-rating-value ${smrBadgeClass(a.smr_value)}">${esc(a.smr_value_en || a.smr_value)}</div>`;
            html += '</div>';
        }

        if (a.asmr_value) {
            html += '<div class="has-rating-item">';
            html += '<div class="has-rating-label">ASMR</div>';
            html += `<div class="has-rating-value ${asmrBadgeClass(a.asmr_value)}">ASMR ${esc(a.asmr_value)}: ${esc(a.asmr_value_en || "")}</div>`;
            html += '</div>';
        }

        html += '</div>'; // rating-grid

        // Descriptions — show English translation first, French below
        if (a.smr_description || a.asmr_description) {
            html += '<div class="has-descriptions">';
            if (a.smr_description) {
                const smrDescEn = a.smr_description_en || "";
                if (smrDescEn && smrDescEn !== a.smr_description) {
                    html += `<div class="has-desc-item"><strong>SMR:</strong> ${esc(smrDescEn)}</div>`;
                    html += `<div class="has-desc-item" style="font-size:0.8rem;color:var(--text-light);font-style:italic;margin-top:2px">(FR) ${esc(a.smr_description)}</div>`;
                } else {
                    html += `<div class="has-desc-item"><strong>SMR:</strong> ${esc(a.smr_description)}</div>`;
                }
            }
            if (a.asmr_description) {
                const asmrDescEn = a.asmr_description_en || "";
                if (asmrDescEn && asmrDescEn !== a.asmr_description) {
                    html += `<div class="has-desc-item"><strong>ASMR:</strong> ${esc(asmrDescEn)}</div>`;
                    html += `<div class="has-desc-item" style="font-size:0.8rem;color:var(--text-light);font-style:italic;margin-top:2px">(FR) ${esc(a.asmr_description)}</div>`;
                } else {
                    html += `<div class="has-desc-item"><strong>ASMR:</strong> ${esc(a.asmr_description)}</div>`;
                }
            }
            html += '</div>';
        }

        // Action bar
        html += '<div class="gba-action-bar">';
        if (a.assessment_url) {
            html += `<a href="${esc(a.assessment_url)}" target="_blank" rel="noopener" class="gba-source-btn">HAS CT Opinion &rarr;</a>`;
        }
        if (a.dossier_code && aiAnalysisAvailable) {
            html += `<button class="gba-ai-btn has-ai-btn" data-dossier="${esc(a.dossier_code)}">Analyze with AI</button>`;
        }
        html += '</div>';

        // AI analysis container
        if (a.dossier_code && aiAnalysisAvailable) {
            html += `<div class="gba-ai-analysis hidden" id="ai-france-${esc(a.dossier_code)}"></div>`;
        }

        html += '</div>'; // assessment-card
    }

    container.innerHTML = html;

    // Bind AI buttons
    container.querySelectorAll(".has-ai-btn").forEach(btn => {
        btn.addEventListener("click", () => loadFranceAIAnalysis(btn.dataset.dossier));
    });
}

// ── AI Analysis ─────────────────────────────────────────────────────

async function loadFranceAIAnalysis(dossierCode) {
    const containerId = "ai-france-" + dossierCode;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Toggle visibility
    if (!container.classList.contains("hidden") && !container.querySelector(".loading")) {
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = '<p class="status-msg loading">Generating AI analysis... This may take a few seconds.</p>';

    const btn = document.querySelector(`[data-dossier="${dossierCode}"]`);
    if (btn) btn.textContent = "Analyzing...";

    try {
        const res = await fetch("/api/france/analyze/" + encodeURIComponent(dossierCode));
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Analysis failed");
        }
        const data = await res.json();
        renderFranceAIAnalysis(data, container);
        if (btn) btn.textContent = data.cached ? "AI Analysis (cached)" : "AI Analysis";
    } catch (e) {
        container.innerHTML = `<p class="status-msg error">${esc(e.message)}</p>`;
        if (btn) btn.textContent = "Analyze with AI";
    }
}

function renderFranceAIAnalysis(analysis, container) {
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

    // Clinical evidence (pivotal trials) — reuse Germany renderer
    if (analysis.clinical_evidence && typeof renderClinicalEvidence === "function") {
        html += renderClinicalEvidence(analysis.clinical_evidence);
    } else if (analysis.clinical_evidence) {
        html += renderFranceClinicalEvidence(analysis.clinical_evidence);
    }

    // SMR rationale
    if (analysis.smr_rationale) {
        html += '<div class="gba-ai-section">';
        html += `<div class="gba-ai-section-label">SMR RATIONALE (${esc(analysis.smr_value || "")})</div>`;
        html += `<div class="gba-ai-section-text">${esc(analysis.smr_rationale)}</div>`;
        html += '</div>';
    }

    // ASMR rationale
    if (analysis.asmr_rationale) {
        html += '<div class="gba-ai-section">';
        html += `<div class="gba-ai-section-label">ASMR RATIONALE (${esc(analysis.asmr_value || "")})</div>`;
        html += `<div class="gba-ai-section-text">${esc(analysis.asmr_rationale)}</div>`;
        html += '</div>';
    }

    // Target population
    if (analysis.target_population) {
        html += '<div class="gba-ai-section">';
        html += '<div class="gba-ai-section-label">TARGET POPULATION</div>';
        html += `<div class="gba-ai-section-text">${esc(analysis.target_population)}</div>`;
        html += '</div>';
    }

    // Market implications
    if (analysis.market_implications) {
        html += '<div class="gba-ai-section gba-ai-market">';
        html += '<div class="gba-ai-section-label">MARKET &amp; PRICING IMPLICATIONS</div>';
        html += `<div class="gba-ai-section-text">${esc(analysis.market_implications)}</div>`;
        html += '</div>';
    }

    html += '</div>'; // ai-card
    container.innerHTML = html;
}

// ── Clinical Evidence renderer (standalone for France page) ─────────

function renderFranceClinicalEvidence(ce) {
    const trials = ce.pivotal_trials || [];
    if (trials.length === 0 && !ce.indirect_comparisons && !ce.subpopulation_analyses_note) {
        return '';
    }

    let html = '<div class="gba-ai-section gba-ce-section">';
    html += '<div class="gba-ai-section-label">PIVOTAL CLINICAL EVIDENCE</div>';

    for (const trial of trials) {
        html += '<div class="gba-ce-trial">';
        html += '<div class="gba-ce-trial-header">';
        html += '<div class="gba-ce-trial-name-row">';
        if (trial.trial_name) {
            html += `<span class="gba-ce-trial-name">${esc(trial.trial_name)}</span>`;
        }
        if (trial.nct_number) {
            html += `<a href="https://clinicaltrials.gov/study/${encodeURIComponent(trial.nct_number)}" `
                + `target="_blank" rel="noopener" class="gba-ce-nct-link">${esc(trial.nct_number)}</a>`;
        }
        if (trial.confidence) {
            const confClass = trial.confidence === "high" ? "gba-ce-conf-high"
                : trial.confidence === "moderate" ? "gba-ce-conf-mod" : "gba-ce-conf-low";
            html += `<span class="gba-ce-confidence ${confClass}" title="AI confidence">${esc(trial.confidence)}</span>`;
        }
        html += '</div>';

        const designParts = [];
        if (trial.trial_design) designParts.push(trial.trial_design);
        if (trial.enrollment) designParts.push("N=" + trial.enrollment);
        if (designParts.length > 0) {
            html += `<div class="gba-ce-trial-design">${esc(designParts.join(" | "))}</div>`;
        }
        if (trial.trial_comparator) {
            html += `<div class="gba-ce-trial-comparator"><strong>vs.</strong> ${esc(trial.trial_comparator)}</div>`;
        }
        html += '</div>';

        const endpoints = trial.key_endpoints || [];
        if (endpoints.length > 0) {
            html += '<div class="gba-ce-endpoints">';
            html += '<table class="gba-ce-ep-table"><thead><tr>';
            html += '<th>Endpoint</th><th>Treatment vs. Comparator</th>';
            html += '<th>Effect Size</th><th>Sig.</th>';
            html += '</tr></thead><tbody>';
            for (const ep of endpoints) {
                html += '<tr>';
                html += `<td class="gba-ce-ep-name">${esc(ep.abbreviation || ep.name)}</td>`;
                let resultsText = "";
                if (ep.treatment_result && ep.comparator_result) {
                    resultsText = ep.treatment_result + " vs. " + ep.comparator_result;
                } else if (ep.treatment_result) {
                    resultsText = ep.treatment_result;
                }
                html += `<td>${esc(resultsText) || '<span class="gba-ce-na">—</span>'}</td>`;
                let effectText = "";
                if (ep.effect_measure && ep.effect_value) {
                    effectText = ep.effect_measure + " " + ep.effect_value;
                    if (ep.ci_95) effectText += " [" + ep.ci_95 + "]";
                }
                html += `<td class="gba-ce-ep-effect">${esc(effectText) || '<span class="gba-ce-na">—</span>'}</td>`;
                if (ep.statistically_significant === true) {
                    html += `<td><span class="gba-ce-sig gba-ce-sig-yes" title="p=${esc(ep.p_value || 'significant')}">Sig.</span></td>`;
                } else if (ep.statistically_significant === false) {
                    html += `<td><span class="gba-ce-sig gba-ce-sig-no" title="p=${esc(ep.p_value || 'not significant')}">NS</span></td>`;
                } else {
                    html += `<td><span class="gba-ce-na">—</span></td>`;
                }
                html += '</tr>';
            }
            html += '</tbody></table></div>';
        }
        html += '</div>';
    }

    if (ce.indirect_comparisons || ce.subpopulation_analyses_note) {
        html += '<div class="gba-ce-additional">';
        if (ce.indirect_comparisons) {
            html += '<div class="gba-ce-additional-item">';
            html += '<span class="gba-ce-additional-label">Indirect Comparisons:</span> ';
            html += `<span>${esc(ce.indirect_comparisons)}</span></div>`;
        }
        if (ce.subpopulation_analyses_note) {
            html += '<div class="gba-ce-additional-item">';
            html += '<span class="gba-ce-additional-label">Subgroup Analyses:</span> ';
            html += `<span>${esc(ce.subpopulation_analyses_note)}</span></div>`;
        }
        html += '</div>';
    }

    const limitations = ce.evidence_limitations || [];
    if (limitations.length > 0) {
        html += '<div class="gba-ce-limitations">';
        html += '<span class="gba-ce-limitations-label">Note:</span> ';
        html += esc(limitations.join(". "));
        html += '</div>';
    }

    html += '</div>';
    return html;
}
