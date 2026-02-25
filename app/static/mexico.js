/**
 * Mexico Pharma Procurement module — Compra Consolidada intelligence.
 *
 * Features:
 *   1. Clave Search & Intelligence — search by substance, ATC, therapeutic group
 *   2. Award Tracker (Adjudicaciones) — filter by cycle, status, institution
 *   3. Market Opportunities — desiertas / unmet demand
 *   4. Price History — cross-cycle price benchmarking per clave
 */

// ── State ────────────────────────────────────────────────────────────

let filters = null; // cached filter options

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    setupTabs();
    await loadFilters();
    setupClaveSearch();
    setupAdjSearch();
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

function statusBadgeClass(status) {
    const s = status.toLowerCase();
    if (s === "adjudicada") return "mx-status-awarded";
    if (s === "desierta") return "mx-status-desierta";
    if (s === "en_proceso") return "mx-status-process";
    if (s === "cancelada") return "mx-status-cancelled";
    return "";
}

function sourceTypeBadgeClass(type) {
    const t = type.toLowerCase();
    if (t === "patente") return "mx-source-patent";
    if (t === "fuente_unica") return "mx-source-sole";
    if (t === "generico") return "mx-source-generic";
    if (t === "biotecnologico") return "mx-source-bio";
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

    // Click row to show price history
    container.querySelectorAll(".mx-clave-row").forEach(row => {
        row.addEventListener("click", () => loadPriceHistory(row.dataset.clave));
    });
}

// ── Price History ────────────────────────────────────────────────────

async function loadPriceHistory(clave) {
    const section = document.getElementById("price-detail");
    const title = document.getElementById("price-detail-title");
    const content = document.getElementById("price-detail-content");

    section.classList.remove("hidden");
    title.textContent = "Price History — " + clave;
    content.innerHTML = '<p class="status-msg loading">Loading price history...</p>';

    // Scroll to price detail
    section.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch("/api/mexico/prices/" + encodeURIComponent(clave));
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        renderPriceHistory(data, content);
    } catch (e) {
        content.innerHTML = '<p class="status-msg error">Could not load price history.</p>';
    }
}

function renderPriceHistory(data, container) {
    let html = '';

    // Header info
    html += '<div class="mx-price-header">';
    html += `<div><strong>${esc(data.active_substance)}</strong> &mdash; ${esc(data.description)}</div>`;
    if (data.source_type) {
        html += `<span class="tag ${sourceTypeBadgeClass(data.source_type)}">${esc(sourceTypeLabel(data.source_type))}</span>`;
    }
    html += '</div>';

    // Price change summary
    if (data.entries.length >= 2 && data.price_change_pct !== 0) {
        const pctClass = data.price_change_pct < 0 ? "mx-price-down" : "mx-price-up";
        const arrow = data.price_change_pct < 0 ? "↓" : "↑";
        html += `<div class="mx-price-change ${pctClass}">${arrow} ${Math.abs(data.price_change_pct)}% price change across cycles</div>`;
    }

    // Price table
    html += '<div class="analogue-table-wrapper" style="margin-top:12px"><table class="analogue-table"><thead><tr>';
    html += '<th>Cycle</th><th>Status</th><th>Unit Price (MXN)</th><th>Units Awarded</th><th>Supplier</th>';
    html += '</tr></thead><tbody>';

    for (const e of data.entries) {
        const stClass = statusBadgeClass(e.status);
        html += '<tr>';
        html += `<td><strong>${esc(e.cycle)}</strong></td>`;
        html += `<td><span class="tag ${stClass}">${esc(statusLabel(e.status))}</span></td>`;
        html += `<td style="text-align:right;white-space:nowrap">${formatMXN(e.unit_price)}</td>`;
        html += `<td style="text-align:right">${formatUnits(e.units_awarded)}</td>`;
        html += `<td>${esc(e.supplier) || "—"}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table></div>';

    // Visual bar chart
    const awarded = data.entries.filter(e => e.unit_price > 0);
    if (awarded.length >= 2) {
        const maxPrice = Math.max(...awarded.map(e => e.unit_price));
        html += '<div class="mx-price-chart">';
        html += '<h3 class="mx-chart-title">Price Comparison</h3>';
        for (const e of awarded) {
            const pct = maxPrice > 0 ? (e.unit_price / maxPrice) * 100 : 0;
            html += '<div class="mx-bar-row">';
            html += `<span class="mx-bar-label">${esc(e.cycle)}</span>`;
            html += `<div class="mx-bar-track"><div class="mx-bar-fill" style="width:${pct}%"></div></div>`;
            html += `<span class="mx-bar-value">${formatMXN(e.unit_price)}</span>`;
            html += '</div>';
        }
        html += '</div>';
    }

    container.innerHTML = html;
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
        row.addEventListener("click", () => loadPriceHistory(row.dataset.clave));
    });
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
        row.addEventListener("click", () => loadPriceHistory(row.dataset.clave));
    });
}
