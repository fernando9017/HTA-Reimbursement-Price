/**
 * Mexico Pharma Procurement module — Compra Consolidada intelligence.
 *
 * Features:
 *   1. Clave Search & Intelligence — search by substance, ATC, therapeutic group
 *   2. Award Tracker (Adjudicaciones) — filter by cycle, status, institution
 *   3. Institution Breakdown — aggregated stats per institution
 *   4. Market Opportunities — desiertas / unmet demand
 *   5. Clave Detail — molecule info, all awards, negotiation context, competitors
 */

// ── State ────────────────────────────────────────────────────────────

let filters = null;

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    setupTabs();
    await loadFilters();
    setupClaveSearch();
    setupAdjSearch();
    setupInstitutions();
    setupClaveDetail();
    loadOpportunities();
});

// ── Tabs ─────────────────────────────────────────────────────────────

function setupTabs() {
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

// ── Load filter options ──────────────────────────────────────────────

async function loadFilters() {
    try {
        const res = await fetch("/api/mexico/filters");
        if (!res.ok) return;
        filters = await res.json();
        populateSelect("filter-therapeutic-group", filters.therapeutic_groups);
        populateSelect("filter-source-type", filters.source_types, sourceTypeLabel);
        populateSelect("adj-cycle", filters.cycles);
        populateSelect("adj-status", filters.statuses, statusLabel);
        populateSelect("adj-institution", filters.institutions);
        populateSelect("adj-therapeutic", filters.therapeutic_groups);
        populateSelect("adj-source", filters.source_types, sourceTypeLabel);
        populateSelect("inst-cycle", filters.cycles);
    } catch (e) {
        console.error("Failed to load Mexico filters:", e);
    }
}

function populateSelect(id, items, labelFn) {
    const el = document.getElementById(id);
    if (!el) return;
    items.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = labelFn ? labelFn(item) : item;
        el.appendChild(opt);
    });
}

// ── Label helpers ────────────────────────────────────────────────────

function sourceTypeLabel(val) {
    const map = {
        patente: "Patente (Patent)",
        fuente_unica: "Fuente Unica (Sole Source)",
        generico: "Generico (Generic)",
        biotecnologico: "Biotecnologico (Biologic)",
    };
    return map[val] || val;
}

function statusLabel(val) {
    const map = {
        adjudicada: "Adjudicada (Awarded)",
        desierta: "Desierta (Unadjudicated)",
        en_proceso: "En Proceso (In Process)",
        cancelada: "Cancelada (Cancelled)",
    };
    return map[val] || val;
}

function negotiationTypeLabel(val) {
    const map = {
        mesa_patente: "Mesa de Patente y Fuente Unica",
        licitacion_publica: "Licitacion Publica (Open Tender)",
        adjudicacion_directa: "Adjudicacion Directa (Direct Award)",
    };
    return map[val] || val;
}

function statusBadgeClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "adjudicada") return "mx-status-awarded";
    if (s === "desierta") return "mx-status-desierta";
    if (s === "en_proceso") return "mx-status-process";
    if (s === "cancelada") return "mx-status-cancelled";
    return "";
}

function sourceTypeBadgeClass(type) {
    const t = (type || "").toLowerCase();
    if (t === "patente") return "mx-source-patent";
    if (t === "fuente_unica") return "mx-source-sole";
    if (t === "generico") return "mx-source-generic";
    if (t === "biotecnologico") return "mx-source-bio";
    return "";
}

function bidOutcomeClass(outcome) {
    const o = (outcome || "").toLowerCase();
    if (o === "awarded") return "mx-status-awarded";
    if (o === "rejected") return "mx-status-desierta";
    if (o === "second_place") return "mx-status-process";
    if (o === "withdrawn") return "mx-status-cancelled";
    return "";
}

function formatMXN(amount) {
    if (!amount || amount === 0) return "—";
    return "$" + amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUnits(n) {
    if (!n) return "—";
    return n.toLocaleString("es-MX");
}

// ── Clave Search ─────────────────────────────────────────────────────

function setupClaveSearch() {
    const input = document.getElementById("clave-query");
    const btn = document.getElementById("btn-search-claves");

    btn.addEventListener("click", searchClaves);
    input.addEventListener("keydown", e => { if (e.key === "Enter") searchClaves(); });
}

async function searchClaves() {
    const q = document.getElementById("clave-query").value.trim();
    const group = document.getElementById("filter-therapeutic-group").value;
    const source = document.getElementById("filter-source-type").value;
    const statusEl = document.getElementById("clave-status");
    const resultsEl = document.getElementById("clave-results");

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (group) params.set("therapeutic_group", group);
    if (source) params.set("source_type", source);
    params.set("limit", "100");

    showStatus(statusEl, "Searching claves...", "loading");
    resultsEl.innerHTML = "";

    try {
        const res = await fetch("/api/mexico/search?" + params);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No claves found matching your criteria.</p>';
            return;
        }

        renderClaveResults(data.results, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderClaveResults(claves, container) {
    let html = `<p class="results-summary">${claves.length} clave(s) found</p>`;
    html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
    html += '<th>Clave</th><th>Active Substance</th><th>Description</th>';
    html += '<th>Type</th><th>Therapeutic Group</th>';
    html += '<th>Latest Status</th><th>Latest Price (MXN)</th><th>Institutions</th>';
    html += '</tr></thead><tbody>';

    for (const c of claves) {
        const srcClass = sourceTypeBadgeClass(c.source_type);
        const stClass = statusBadgeClass(c.latest_status);
        html += `<tr class="mx-clave-row" data-clave="${esc(c.clave)}" style="cursor:pointer">`;
        html += `<td class="col-name"><strong>${esc(c.clave)}</strong></td>`;
        html += `<td>${esc(c.active_substance)}</td>`;
        html += `<td class="col-indication">${esc(c.description)}</td>`;
        html += `<td><span class="tag ${srcClass}">${esc(sourceTypeLabel(c.source_type))}</span></td>`;
        html += `<td>${esc(c.therapeutic_group)}</td>`;
        html += `<td><span class="tag ${stClass}">${esc(statusLabel(c.latest_status))}</span></td>`;
        html += `<td style="text-align:right;white-space:nowrap">${formatMXN(c.latest_unit_price)}</td>`;
        html += `<td class="col-area" style="font-size:0.82rem">${c.institutions.map(i => esc(i)).join(", ") || "—"}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll(".mx-clave-row").forEach(row => {
        row.addEventListener("click", () => loadClaveDetail(row.dataset.clave));
    });
}

// ── Clave Detail Panel ───────────────────────────────────────────────

function setupClaveDetail() {
    document.getElementById("btn-close-detail").addEventListener("click", () => {
        document.getElementById("clave-detail").classList.add("hidden");
    });
}

async function loadClaveDetail(clave) {
    const section = document.getElementById("clave-detail");
    const title = document.getElementById("clave-detail-title");
    const content = document.getElementById("clave-detail-content");

    section.classList.remove("hidden");
    title.textContent = "Clave Detail — " + clave;
    content.innerHTML = '<p class="status-msg loading">Loading clave intelligence...</p>';
    section.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch("/api/mexico/claves/" + encodeURIComponent(clave));
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        renderClaveDetail(data, content);
    } catch (e) {
        content.innerHTML = '<p class="status-msg error">Could not load clave detail.</p>';
    }
}

function renderClaveDetail(d, container) {
    let html = '';

    // ── Molecule Info ──
    html += '<div class="mx-detail-section">';
    html += '<h3 class="mx-detail-heading">Molecule Information</h3>';
    html += '<div class="mx-detail-grid">';
    html += detailField("Active Substance", d.active_substance);
    html += detailField("ATC Code", d.atc_code);
    html += detailField("Therapeutic Group", d.therapeutic_group);
    html += detailField("Source Type", sourceTypeLabel(d.source_type), sourceTypeBadgeClass(d.source_type));
    html += detailField("CNIS Listed", d.cnis_listed ? "Yes" : "No");
    html += detailField("COFEPRIS Registry", d.cofepris_registry);
    if (d.patent_holder) html += detailField("Patent Holder", d.patent_holder);
    if (d.patent_expiry) html += detailField("Patent Expiry", d.patent_expiry);
    html += '</div>';
    if (d.indication) {
        html += '<div class="mx-detail-block"><strong>Indication:</strong> ' + esc(d.indication) + '</div>';
    }
    if (d.mechanism_of_action) {
        html += '<div class="mx-detail-block"><strong>Mechanism of Action:</strong> ' + esc(d.mechanism_of_action) + '</div>';
    }
    html += '</div>';

    // ── Price History ──
    if (d.price_history && d.price_history.entries.length > 0) {
        html += '<div class="mx-detail-section">';
        html += '<h3 class="mx-detail-heading">Price History</h3>';
        if (d.price_history.entries.length >= 2 && d.price_history.price_change_pct !== 0) {
            const pctClass = d.price_history.price_change_pct < 0 ? "mx-price-down" : "mx-price-up";
            const arrow = d.price_history.price_change_pct < 0 ? "↓" : "↑";
            html += `<div class="mx-price-change ${pctClass}">${arrow} ${Math.abs(d.price_history.price_change_pct)}% price change across cycles</div>`;
        }

        html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
        html += '<th>Cycle</th><th>Institution</th><th>Status</th><th>Unit Price (MXN)</th><th>Units Awarded</th><th>Supplier</th>';
        html += '</tr></thead><tbody>';
        for (const e of d.price_history.entries) {
            const stClass = statusBadgeClass(e.status);
            html += '<tr>';
            html += `<td><strong>${esc(e.cycle)}</strong></td>`;
            html += `<td>${esc(e.institution)}</td>`;
            html += `<td><span class="tag ${stClass}">${esc(statusLabel(e.status))}</span></td>`;
            html += `<td style="text-align:right;white-space:nowrap">${formatMXN(e.unit_price)}</td>`;
            html += `<td style="text-align:right">${formatUnits(e.units_awarded)}</td>`;
            html += `<td>${esc(e.supplier) || "—"}</td>`;
            html += '</tr>';
        }
        html += '</tbody></table></div>';

        // Bar chart for awarded entries
        const awarded = d.price_history.entries.filter(e => e.unit_price > 0);
        if (awarded.length >= 2) {
            const maxPrice = Math.max(...awarded.map(e => e.unit_price));
            html += '<div class="mx-price-chart">';
            html += '<h3 class="mx-chart-title">Price Comparison</h3>';
            for (const e of awarded) {
                const pct = maxPrice > 0 ? (e.unit_price / maxPrice) * 100 : 0;
                const label = e.cycle + (e.institution ? " (" + e.institution + ")" : "");
                html += '<div class="mx-bar-row">';
                html += `<span class="mx-bar-label">${esc(label)}</span>`;
                html += `<div class="mx-bar-track"><div class="mx-bar-fill" style="width:${pct}%"></div></div>`;
                html += `<span class="mx-bar-value">${formatMXN(e.unit_price)}</span>`;
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
    }

    // ── Adjudicaciones with Negotiation Context ──
    if (d.adjudicaciones && d.adjudicaciones.length > 0) {
        html += '<div class="mx-detail-section">';
        html += '<h3 class="mx-detail-heading">Award History &amp; Negotiation Context</h3>';

        for (const a of d.adjudicaciones) {
            const stClass = statusBadgeClass(a.status);
            html += '<div class="mx-award-card">';
            html += '<div class="mx-award-header">';
            html += `<strong>${esc(a.cycle)}</strong> &mdash; ${esc(a.institution)}`;
            html += `<span class="tag ${stClass}">${esc(statusLabel(a.status))}</span>`;
            html += '</div>';

            html += '<div class="mx-award-body">';
            if (a.supplier) html += `<div><strong>Supplier:</strong> ${esc(a.supplier)}</div>`;
            html += `<div><strong>Units:</strong> ${formatUnits(a.units_requested)} requested, ${formatUnits(a.units_awarded)} awarded</div>`;
            if (a.unit_price > 0) html += `<div><strong>Unit Price:</strong> ${formatMXN(a.unit_price)} &mdash; <strong>Total:</strong> ${formatMXN(a.total_amount)}</div>`;

            if (a.negotiation_type) {
                html += `<div class="mx-negotiation"><strong>Negotiation Type:</strong> <span class="tag mx-source-patent">${esc(negotiationTypeLabel(a.negotiation_type))}</span></div>`;
            }
            if (a.negotiation_notes) {
                html += `<div class="mx-negotiation-notes">${esc(a.negotiation_notes)}</div>`;
            }

            // Competitor bids
            if (a.competitor_bids && a.competitor_bids.length > 0) {
                html += '<div class="mx-competitors">';
                html += '<strong>Competing Bids:</strong>';
                html += '<table class="analogue-table" style="margin-top:6px;font-size:0.82rem"><thead><tr>';
                html += '<th>Supplier</th><th>Price Offered (MXN)</th><th>Outcome</th><th>Notes</th>';
                html += '</tr></thead><tbody>';
                for (const b of a.competitor_bids) {
                    const bClass = bidOutcomeClass(b.outcome);
                    html += '<tr>';
                    html += `<td>${esc(b.supplier)}</td>`;
                    html += `<td style="text-align:right">${formatMXN(b.unit_price_offered)}</td>`;
                    html += `<td><span class="tag ${bClass}">${esc(b.outcome)}</span></td>`;
                    html += `<td class="col-indication">${esc(b.reason)}</td>`;
                    html += '</tr>';
                }
                html += '</tbody></table>';
                html += '</div>';
            }

            html += '</div></div>';
        }
        html += '</div>';
    }

    // ── Same-substance Claves (Competitor Landscape) ──
    if (d.same_substance_claves && d.same_substance_claves.length > 0) {
        html += '<div class="mx-detail-section">';
        html += '<h3 class="mx-detail-heading">Same Substance — Other Presentations</h3>';
        html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
        html += '<th>Clave</th><th>Description</th><th>Type</th><th>Latest Price</th><th>Status</th>';
        html += '</tr></thead><tbody>';
        for (const c of d.same_substance_claves) {
            const srcClass = sourceTypeBadgeClass(c.source_type);
            const stClass = statusBadgeClass(c.latest_status);
            html += `<tr class="mx-clave-row" data-clave="${esc(c.clave)}" style="cursor:pointer">`;
            html += `<td class="col-name"><strong>${esc(c.clave)}</strong></td>`;
            html += `<td class="col-indication">${esc(c.description)}</td>`;
            html += `<td><span class="tag ${srcClass}">${esc(sourceTypeLabel(c.source_type))}</span></td>`;
            html += `<td style="text-align:right">${formatMXN(c.latest_unit_price)}</td>`;
            html += `<td><span class="tag ${stClass}">${esc(statusLabel(c.latest_status))}</span></td>`;
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        html += '</div>';
    }

    container.innerHTML = html;

    // Re-bind clicks on same-substance rows
    container.querySelectorAll(".mx-clave-row").forEach(row => {
        row.addEventListener("click", () => loadClaveDetail(row.dataset.clave));
    });
}

function detailField(label, value, badgeClass) {
    if (!value) return '';
    const val = badgeClass
        ? `<span class="tag ${badgeClass}">${esc(value)}</span>`
        : esc(value);
    return `<div class="mx-detail-field"><span class="mx-detail-label">${esc(label)}</span><span class="mx-detail-value">${val}</span></div>`;
}

// ── Award Tracker (Adjudicaciones) ───────────────────────────────────

function setupAdjSearch() {
    document.getElementById("btn-search-adj").addEventListener("click", searchAdjudicaciones);
    document.getElementById("btn-reset-adj").addEventListener("click", () => {
        ["adj-cycle", "adj-status", "adj-institution", "adj-therapeutic", "adj-source"].forEach(id => {
            document.getElementById(id).value = "";
        });
        document.getElementById("adj-substance").value = "";
        document.getElementById("adj-results").innerHTML = "";
        document.getElementById("adj-summary").classList.add("hidden");
        hideStatus(document.getElementById("adj-status-msg"));
    });
}

async function searchAdjudicaciones() {
    const statusEl = document.getElementById("adj-status-msg");
    const resultsEl = document.getElementById("adj-results");
    const summaryEl = document.getElementById("adj-summary");

    const params = new URLSearchParams();
    const cycle = document.getElementById("adj-cycle").value;
    const status = document.getElementById("adj-status").value;
    const institution = document.getElementById("adj-institution").value;
    const therapeutic = document.getElementById("adj-therapeutic").value;
    const source = document.getElementById("adj-source").value;
    const substance = document.getElementById("adj-substance").value.trim();

    if (cycle) params.set("cycle", cycle);
    if (status) params.set("status", status);
    if (institution) params.set("institution", institution);
    if (therapeutic) params.set("therapeutic_group", therapeutic);
    if (source) params.set("source_type", source);
    if (substance) params.set("substance", substance);
    params.set("limit", "200");

    showStatus(statusEl, "Loading adjudicaciones...", "loading");
    resultsEl.innerHTML = "";
    summaryEl.classList.add("hidden");

    try {
        const res = await fetch("/api/mexico/adjudicaciones?" + params);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.results.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No adjudicaciones found matching your criteria.</p>';
            return;
        }

        renderAdjSummary(data.summary, data.cycle, summaryEl);
        renderAdjResults(data.results, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderAdjSummary(summary, cycle, container) {
    if (!summary || !summary.total_claves) return;

    const byStatus = summary.by_status || {};
    let html = '<div class="mx-summary-grid">';
    html += `<div class="mx-summary-card"><div class="mx-summary-value">${summary.total_claves}</div><div class="mx-summary-label">Unique Claves</div></div>`;

    if (byStatus.adjudicada) {
        html += `<div class="mx-summary-card mx-summary-awarded"><div class="mx-summary-value">${byStatus.adjudicada}</div><div class="mx-summary-label">Adjudicadas</div></div>`;
    }
    if (byStatus.desierta) {
        html += `<div class="mx-summary-card mx-summary-desierta"><div class="mx-summary-value">${byStatus.desierta}</div><div class="mx-summary-label">Desiertas</div></div>`;
    }

    html += `<div class="mx-summary-card"><div class="mx-summary-value">${formatMXN(summary.total_amount_mxn)}</div><div class="mx-summary-label">Total Amount</div></div>`;
    html += `<div class="mx-summary-card"><div class="mx-summary-value">${summary.fulfillment_rate_pct}%</div><div class="mx-summary-label">Fulfillment Rate</div></div>`;
    html += '</div>';

    container.innerHTML = html;
    container.classList.remove("hidden");
}

function renderAdjResults(results, container) {
    let html = `<p class="results-summary">${results.length} award record(s)</p>`;
    html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
    html += '<th>Clave</th><th>Substance</th><th>Cycle</th><th>Status</th>';
    html += '<th>Supplier</th><th>Units Req.</th><th>Units Awarded</th>';
    html += '<th>Unit Price</th><th>Total (MXN)</th><th>Institution</th>';
    html += '</tr></thead><tbody>';

    for (const a of results) {
        const stClass = statusBadgeClass(a.status);
        html += `<tr class="mx-clave-row" data-clave="${esc(a.clave)}" style="cursor:pointer">`;
        html += `<td class="col-name">${esc(a.clave)}</td>`;
        html += `<td>${esc(a.active_substance)}</td>`;
        html += `<td>${esc(a.cycle)}</td>`;
        html += `<td><span class="tag ${stClass}">${esc(statusLabel(a.status))}</span></td>`;
        html += `<td>${esc(a.supplier) || "—"}</td>`;
        html += `<td style="text-align:right">${formatUnits(a.units_requested)}</td>`;
        html += `<td style="text-align:right">${formatUnits(a.units_awarded)}</td>`;
        html += `<td style="text-align:right;white-space:nowrap">${formatMXN(a.unit_price)}</td>`;
        html += `<td style="text-align:right;white-space:nowrap">${formatMXN(a.total_amount)}</td>`;
        html += `<td>${esc(a.institution)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll(".mx-clave-row").forEach(row => {
        row.addEventListener("click", () => loadClaveDetail(row.dataset.clave));
    });
}

// ── Institution Breakdown ────────────────────────────────────────────

function setupInstitutions() {
    document.getElementById("btn-load-inst").addEventListener("click", loadInstitutions);
}

async function loadInstitutions() {
    const statusEl = document.getElementById("inst-status");
    const resultsEl = document.getElementById("inst-results");
    const cycle = document.getElementById("inst-cycle").value;

    const params = new URLSearchParams();
    if (cycle) params.set("cycle", cycle);

    showStatus(statusEl, "Loading institution breakdown...", "loading");
    resultsEl.innerHTML = "";

    try {
        const res = await fetch("/api/mexico/institutions?" + params);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No institution data found.</p>';
            return;
        }

        renderInstitutions(data, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderInstitutions(institutions, container) {
    let html = '';

    for (const inst of institutions) {
        html += '<div class="mx-inst-card">';
        html += `<div class="mx-inst-header"><h3>${esc(inst.institution)}</h3></div>`;

        // Summary stats
        html += '<div class="mx-summary-grid" style="margin:12px 0">';
        html += `<div class="mx-summary-card"><div class="mx-summary-value">${inst.total_claves}</div><div class="mx-summary-label">Claves</div></div>`;
        html += `<div class="mx-summary-card"><div class="mx-summary-value">${formatMXN(inst.total_spend_mxn)}</div><div class="mx-summary-label">Total Spend</div></div>`;
        html += `<div class="mx-summary-card mx-summary-awarded"><div class="mx-summary-value">${inst.adjudicadas}</div><div class="mx-summary-label">Adjudicadas</div></div>`;
        html += `<div class="mx-summary-card mx-summary-desierta"><div class="mx-summary-value">${inst.desiertas}</div><div class="mx-summary-label">Desiertas</div></div>`;
        html += `<div class="mx-summary-card"><div class="mx-summary-value">${inst.fulfillment_rate_pct}%</div><div class="mx-summary-label">Fulfillment</div></div>`;
        html += '</div>';

        // Two-column layout: top therapeutic groups + top suppliers
        html += '<div class="mx-inst-cols">';

        // Top therapeutic groups
        if (inst.top_therapeutic_groups && inst.top_therapeutic_groups.length > 0) {
            html += '<div class="mx-inst-col">';
            html += '<h4>Top Therapeutic Groups by Spend</h4>';
            html += '<table class="analogue-table" style="font-size:0.82rem"><thead><tr><th>Group</th><th>Spend (MXN)</th><th>Claves</th></tr></thead><tbody>';
            for (const g of inst.top_therapeutic_groups) {
                html += `<tr><td>${esc(g.group)}</td><td style="text-align:right">${formatMXN(g.spend)}</td><td style="text-align:center">${g.claves}</td></tr>`;
            }
            html += '</tbody></table></div>';
        }

        // Top suppliers
        if (inst.top_suppliers && inst.top_suppliers.length > 0) {
            html += '<div class="mx-inst-col">';
            html += '<h4>Top Suppliers by Spend</h4>';
            html += '<table class="analogue-table" style="font-size:0.82rem"><thead><tr><th>Supplier</th><th>Spend (MXN)</th><th>Claves</th></tr></thead><tbody>';
            for (const s of inst.top_suppliers) {
                html += `<tr><td>${esc(s.supplier)}</td><td style="text-align:right">${formatMXN(s.spend)}</td><td style="text-align:center">${s.claves}</td></tr>`;
            }
            html += '</tbody></table></div>';
        }

        html += '</div>'; // inst-cols
        html += '</div>'; // inst-card
    }

    container.innerHTML = html;
}

// ── Opportunities ────────────────────────────────────────────────────

async function loadOpportunities() {
    const statusEl = document.getElementById("opp-status");
    const resultsEl = document.getElementById("opp-results");

    showStatus(statusEl, "Loading market opportunities...", "loading");

    try {
        const res = await fetch("/api/mexico/opportunities?limit=50");
        if (!res.ok) throw new Error("Failed to load opportunities");
        const data = await res.json();
        hideStatus(statusEl);

        if (data.length === 0) {
            resultsEl.innerHTML = '<p class="no-results">No desierta claves found.</p>';
            return;
        }

        renderOpportunities(data, resultsEl);
    } catch (e) {
        showStatus(statusEl, "Error: " + e.message, "error");
    }
}

function renderOpportunities(items, container) {
    let html = `<p class="results-summary">${items.length} unadjudicated clave(s) — sorted by demand</p>`;
    html += '<div class="analogue-table-wrapper"><table class="analogue-table"><thead><tr>';
    html += '<th>Clave</th><th>Substance</th><th>Description</th><th>Cycle</th>';
    html += '<th>Therapeutic Group</th><th>Source Type</th><th>Units Requested</th>';
    html += '</tr></thead><tbody>';

    for (const o of items) {
        const srcClass = sourceTypeBadgeClass(o.source_type);
        html += `<tr class="mx-clave-row" data-clave="${esc(o.clave)}" style="cursor:pointer">`;
        html += `<td class="col-name"><strong>${esc(o.clave)}</strong></td>`;
        html += `<td>${esc(o.active_substance)}</td>`;
        html += `<td class="col-indication">${esc(o.description)}</td>`;
        html += `<td>${esc(o.cycle)}</td>`;
        html += `<td>${esc(o.therapeutic_group)}</td>`;
        html += `<td><span class="tag ${srcClass}">${esc(sourceTypeLabel(o.source_type))}</span></td>`;
        html += `<td style="text-align:right;font-weight:600;color:var(--smr-insufficient)">${formatUnits(o.units_requested)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll(".mx-clave-row").forEach(row => {
        row.addEventListener("click", () => loadClaveDetail(row.dataset.clave));
    });
}
