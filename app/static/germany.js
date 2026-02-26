/**
 * Germany G-BA HTA Deep-Dive module.
 *
 * Features:
 *   1. Drug Browser — search/filter all G-BA assessed drugs
 *   2. Assessment Detail — full per-subpopulation outcome view
 */

// ── State ────────────────────────────────────────────────────────────

let gbaFilters = null;

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    setupGBATabs();
    await loadGBAFilters();
    setupGBASearch();
    setupGBADetail();
    // Auto-load all drugs on page load
    searchGBADrugs();
});

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
        html += `<td class="col-indication">${d.indications.map(i => esc(i)).join("; ") || "—"}</td>`;
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
        html += `<div class="gba-assessment-indication">${esc(a.indication)}</div>`;
        html += `<div class="gba-assessment-date">${esc(a.decision_date)}</div>`;
        html += '</div>';

        // Subpopulation outcomes
        if (a.subpopulations && a.subpopulations.length > 0) {
            for (const sub of a.subpopulations) {
                html += '<div class="gba-subpop">';

                // Patient group
                if (sub.patient_group) {
                    html += `<div class="gba-subpop-group"><strong>Population:</strong> ${esc(sub.patient_group)}</div>`;
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
                    html += `<div class="gba-outcome-value">${esc(sub.comparator)}</div>`;
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

        // Source link
        if (a.assessment_url) {
            html += '<div class="gba-source-link">';
            html += `<a href="${esc(a.assessment_url)}" target="_blank" rel="noopener">G-BA Assessment &rarr;</a>`;
            html += '</div>';
        }

        html += '</div>'; // assessment-card
    }

    container.innerHTML = html;
}
