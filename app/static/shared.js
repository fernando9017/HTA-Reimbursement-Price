/**
 * Shared utilities for VAP Global Resources frontend.
 */

// ── HTML escaping ─────────────────────────────────────────────────────

function esc(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ── Status messages ───────────────────────────────────────────────────

function showStatus(el, message, type) {
    el.textContent = message;
    el.className = `status-msg ${type}`;
    el.classList.remove("hidden");
}

function hideStatus(el) {
    el.classList.add("hidden");
}

// ── Badge CSS class helpers ───────────────────────────────────────────

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
    if (v.includes("kein") || v.includes("nicht belegt")) return "none";
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

// ── CSV download utility ─────────────────────────────────────────────

/**
 * Download an array of rows as a CSV file.
 * Uses UTF-8 BOM so Excel auto-detects encoding.
 * @param {string[]} headers - Column headers
 * @param {any[][]} rows - Data rows (each an array of values)
 * @param {string} filename - Output file name
 */
function downloadCSV(headers, rows, filename) {
    const csvField = (v) => {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };
    const lines = [headers, ...rows].map(row => row.map(csvField).join(","));
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function iptClass(value) {
    const v = value.toLowerCase();
    if (v.includes("unfavorable") || v.includes("desfavorable") || v.includes("no favorable")) return "unfavorable";
    if (v.includes("conditions") || v.includes("condicionado")) return "conditional";
    if (v.includes("favorable")) return "favorable";
    if (v.includes("pending") || v.includes("pendiente")) return "pending";
    return "";
}
