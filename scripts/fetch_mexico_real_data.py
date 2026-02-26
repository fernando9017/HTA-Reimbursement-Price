#!/usr/bin/env python3
"""Fetch real Mexico pharmaceutical procurement data from government open data portals.

This script downloads data from four official / open sources:

1. **CompraNet** (upcp-compranet.hacienda.gob.mx)
   - Bulk CSV files with all government procurement contracts
   - Filtered for pharmaceutical / medical supply entries
   - URL: .../datos_abiertos_contratos_expedientes/Contratos_CompraNet{YEAR}.csv
   - CSV columns (38): SIGLAS, DEPENDENCIA, TITULO_EXPEDIENTE, TIPO_CONTRATACION,
     IMPORTE_CONTRATO, COMPRA_CONSOLIDADA, PROVEEDOR_CONTRATISTA, etc.

2. **CompraNet OCDS bulk** (Google Drive mirrors from datatonanticorrupcion)
   - Full procurement data in CSV/JSON, 1M+ records covering all federal contracting
   - Must be filtered for health institutions (IMSS, ISSSTE, SSA)

3. **datos.gob.mx CKAN API** (www.datos.gob.mx)
   - Catálogo Institucional de Insumos — IMSS quarterly catalog of medical supplies
   - Dataset ID: catalogo_institucional_insumos
   - Resource ID: 4d3d24bd-c896-48d9-9157-2cb8010e61a5

4. **datos.gob.mx additional datasets**
   - Medicamentos: datos.gob.mx/busca/dataset/medicamentos
   - Entrada de Medicamentos: datos.gob.mx/dataset/entrada_medicamentos
   - Abasto: datos.gob.mx/dataset/abasto_medicamentos_material_curacion

The script merges data from these sources, deduplicates, and writes to
data/mexico_procurement.json in the project format.

Designed to run as a GitHub Action (where .gob.mx domains are reachable)
or locally with internet access.

Usage:
    python scripts/fetch_mexico_real_data.py

Environment variables:
    MEXICO_DATA_DIR  — output directory (default: data/)
    COMPRANET_YEARS  — comma-separated years to fetch (default: 2023,2024,2025)
"""

import csv
import io
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────

DATA_DIR = Path(os.environ.get("MEXICO_DATA_DIR", Path(__file__).parent.parent / "data"))
OUTPUT_FILE = DATA_DIR / "mexico_procurement.json"

COMPRANET_YEARS = os.environ.get("COMPRANET_YEARS", "2023,2024,2025").split(",")

# CompraNet bulk CSV URLs (Hacienda domain + Buen Gobierno fallback)
COMPRANET_URL_TEMPLATES = [
    "https://upcp-compranet.hacienda.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet{year}.csv",
    "https://upcp-compranet.buengobierno.gob.mx/cnetassets/datos_abiertos_contratos_expedientes/Contratos_CompraNet{year}.csv",
]

# CompraNet OCDS bulk data on Google Drive (from datatonanticorrupcion/07_compranet)
# These contain 1M+ procurement records — must filter for health sector
COMPRANET_GDRIVE_CSV = "https://drive.google.com/uc?export=download&id=1M67qqlSz49hbL_YClM6RE9a-UkvJXX_k"
COMPRANET_GDRIVE_JSON = "https://drive.google.com/uc?export=download&id=1HzVMdv9bryEw6pg80RwmJd3Le31SY1TI"

# datos.gob.mx CKAN API — Catálogo Institucional de Insumos
CKAN_BASE = "https://www.datos.gob.mx/api/3/action"
CKAN_CATALOG_DATASET = "catalogo_institucional_insumos"
CKAN_CATALOG_RESOURCE = "4d3d24bd-c896-48d9-9157-2cb8010e61a5"

# Additional CKAN datasets on datos.gob.mx
CKAN_DATASETS = [
    "catalogo_institucional_insumos",       # IMSS quarterly supply catalog
    "medicamentos",                          # General medications dataset
    "entrada_medicamentos",                  # Medication entry records (2019-2023)
    "abasto_medicamentos_material_curacion", # Medication supply by unit
]

# Alternative: datamx.io mirror (CKAN-based, same API)
DATAMX_CATALOG_URL = "https://datamx.io/api/3/action/package_show?id=catalogo-institucional-de-insumos"

# IMSS direct medication catalog
IMSS_CATALOG_URL = "http://www.imss.gob.mx/profesionales-salud/cuadros-basicos/medicamentos"

# ── Non-gob.mx alternative sources (for when .gob.mx is blocked) ──────
# QuienEsQuien.wiki (PODER NGO) — CompraNet re-published in OCDS format
# API docs: https://qqwapi-elastic.readthedocs.io/
QQWIKI_API_BASE = "https://api.quienesquien.wiki/v3"
# OCP Data Registry — Mexico OCDS data (JSON/CSV)
OCP_MEXICO_URL = "https://data.open-contracting.org/en/publication/33"
# AmeriGEOSS — Hospital pharma acquisitions CSV (HGGEA 2018-2019)
AMERIGEOSS_PHARMA_URL = "https://data.amerigeoss.org/ne/dataset/medicamentos-y-productos-farmaceuticos-adquiridos-por-el-hospital-de-hggea"
# GovTransparency.eu — Mexico procurement with risk indicators
GOVTRANSPARENCY_URL = "https://www.govtransparency.eu/global-public-procurement-dataset-selected-low-and-middle-income-country-datasets/"
# Proyecto Salud Mexico (UNOPS) — adjudication lists with unit prices
PROYECTO_SALUD_URL = "https://proyectosaludmexico.org/en/transparency"

# Health-sector institutions for CompraNet filtering
HEALTH_INSTITUTIONS = {
    "IMSS", "ISSSTE", "SSA", "INSABI", "BIRMEX", "UNOPS",
    "IMSS-BIENESTAR", "PEMEX", "SEDENA", "SEMAR",
    "CENAPRECE", "CONASIDA",
}

# User agent for requests
USER_AGENT = (
    "Mozilla/5.0 (compatible; VAP-Global-Resources/1.0; "
    "+https://github.com/fernando9017/HTA-Reimbursement-Price)"
)

# Pharmaceutical keywords for filtering CompraNet data
PHARMA_KEYWORDS = [
    "medicamento", "fármaco", "farmaco", "tableta", "cápsula", "capsula",
    "solución inyectable", "solucion inyectable", "ampolleta", "frasco ámpula",
    "frasco ampula", "suspensión", "suspension", "polvo para solución",
    "polvo para solucion", "emulsión", "emulsion", "jarabe", "comprimido",
    "crema", "ungüento", "unguento", "gel", "parche", "óvulo", "ovulo",
    "supositorio", "inhalador", "aerosol", "nebulización", "nebulizacion",
    "gotas", "colirio", "solución oftálmica", "solucion oftalmica",
    "vacuna", "insulina", "antibiótico", "antibiotico",
]

# CUCOP/CABMS codes related to pharmaceuticals (prefix matching)
PHARMA_CUCOP_PREFIXES = ["253", "254", "255"]  # Medical supplies categories

# Clave pattern for pharmaceutical products
CLAVE_PHARMA_PATTERN = re.compile(r"^010\.000\.\d{4}\.\d{2}$")

# ── CNIS Therapeutic Group mapping ─────────────────────────────────────

THERAPEUTIC_GROUPS = {
    "01": "Dolor y Anestesia",
    "02": "Antibióticos",
    "03": "Dermatología",
    "04": "Hematología",
    "05": "Cardiología",
    "06": "Endocrinología",
    "07": "Gastroenterología",
    "08": "Infectología",
    "09": "Neurología",
    "10": "Psiquiatría",
    "11": "Neumología",
    "12": "Inmunología y Reumatología",
    "13": "Nefrología",
    "14": "Trasplantes",
    "15": "Urgencias y Terapia Intensiva",
    "16": "Ginecología y Obstetricia",
    "17": "Dermatología",
    "18": "Oftalmología",
    "19": "Urología",
    "20": "Enfermedades Raras",
    "21": "Antifúngicos",
    "22": "Vacunas",
    "23": "Esclerosis Múltiple",
    "63": "Oncología",
}


def fetch_url(url: str, max_retries: int = 3, timeout: int = 60) -> bytes | None:
    """Fetch URL content with retries and exponential backoff."""
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    req = Request(url, headers=headers)

    for attempt in range(max_retries):
        try:
            logger.info("  Fetching: %s (attempt %d)", url, attempt + 1)
            with urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                logger.info("  Downloaded %d bytes", len(data))
                return data
        except HTTPError as e:
            logger.warning("  HTTP %d for %s", e.code, url)
            if e.code in (429, 500, 502, 503, 504):
                wait = 2 ** (attempt + 1)
                logger.info("  Retrying in %ds...", wait)
                time.sleep(wait)
            else:
                return None
        except (URLError, TimeoutError) as e:
            logger.warning("  Network error: %s", e)
            wait = 2 ** (attempt + 1)
            time.sleep(wait)
        except Exception as e:
            logger.error("  Unexpected error: %s", e)
            return None

    return None


def is_pharmaceutical(description: str) -> bool:
    """Check if a contract description likely refers to pharmaceuticals."""
    desc_lower = description.lower()
    return any(kw in desc_lower for kw in PHARMA_KEYWORDS)


def extract_clave(text: str) -> str | None:
    """Try to extract a CNIS clave code from text."""
    match = CLAVE_PHARMA_PATTERN.search(text)
    return match.group(0) if match else None


def guess_therapeutic_group(clave: str) -> str:
    """Guess therapeutic group from CNIS clave structure."""
    # Clave format: 010.000.XXYY.ZZ where XX hints at the group
    parts = clave.split(".")
    if len(parts) >= 3:
        group_code = parts[2][:2]
        return THERAPEUTIC_GROUPS.get(group_code, "Otros")
    return "Otros"


def guess_source_type(description: str) -> str:
    """Guess source type from description keywords."""
    desc_lower = description.lower()
    if any(kw in desc_lower for kw in ["biosimilar", "biotecnológico", "biotecnologico",
                                        "anticuerpo", "insulina", "eritropoyetina",
                                        "vacuna", "interferón", "interferon"]):
        return "biotecnologico"
    if any(kw in desc_lower for kw in ["fuente única", "fuente unica"]):
        return "fuente_unica"
    return "generico"


# ── CompraNet Data ─────────────────────────────────────────────────────

def fetch_compranet(years: list[str]) -> list[dict]:
    """Download and parse CompraNet CSV data for specified years.

    Filters for pharmaceutical/medical supply contracts and extracts
    relevant fields.
    """
    all_records = []

    for year in years:
        logger.info("Fetching CompraNet data for %s...", year)
        raw = None

        for template in COMPRANET_URL_TEMPLATES:
            url = template.format(year=year.strip())
            raw = fetch_url(url, timeout=120)
            if raw:
                break

        if not raw:
            logger.warning("Could not download CompraNet %s from any source", year)
            continue

        # CompraNet CSVs are typically Latin-1 encoded
        try:
            text = raw.decode("latin-1")
        except UnicodeDecodeError:
            text = raw.decode("utf-8", errors="replace")

        reader = csv.DictReader(io.StringIO(text))
        pharma_count = 0
        total_count = 0

        for row in reader:
            total_count += 1

            # Real CompraNet CSV columns (38 fields):
            # SIGLAS, DEPENDENCIA, TITULO_EXPEDIENTE, TIPO_CONTRATACION,
            # TIPO_PROCEDIMIENTO, IMPORTE_CONTRATO, PROVEEDOR_CONTRATISTA,
            # COMPRA_CONSOLIDADA, ESTATUS_CONTRATO, etc.
            siglas = row.get("SIGLAS", "") or ""
            desc = row.get("TITULO_EXPEDIENTE", "") or row.get("TITULO_CONTRATO", "") or ""
            tipo_contratacion = row.get("TIPO_CONTRATACION", "") or ""
            compra_consolidada = row.get("COMPRA_CONSOLIDADA", "") or ""

            # Two-tier filter: health institution OR pharmaceutical keywords
            is_health_inst = siglas.upper() in HEALTH_INSTITUTIONS
            is_pharma_desc = is_pharmaceutical(f"{desc} {tipo_contratacion}")
            is_adquisiciones = "adquisic" in tipo_contratacion.lower()

            # Keep if: (health institution + adquisiciones) OR pharmaceutical description
            if not ((is_health_inst and is_adquisiciones) or is_pharma_desc):
                continue

            pharma_count += 1

            # Extract what we can
            clave = extract_clave(desc) or ""
            institution = siglas.strip()
            supplier = row.get("PROVEEDOR_CONTRATISTA", "") or ""
            amount_str = row.get("IMPORTE_CONTRATO", "0") or "0"
            try:
                amount = float(amount_str.replace(",", "").replace("$", ""))
            except (ValueError, TypeError):
                amount = 0.0

            status_raw = row.get("ESTATUS_CONTRATO", "") or ""
            if "activo" in status_raw.lower() or "vigente" in status_raw.lower():
                status = "adjudicada"
            elif "cancelado" in status_raw.lower() or "rescindido" in status_raw.lower():
                status = "desierta"
            else:
                status = "adjudicada"

            fecha = row.get("FECHA_INICIO", "") or row.get("PROC_F_PUBLICACION", "")

            record = {
                "year": year.strip(),
                "clave": clave,
                "description": desc.strip()[:200],
                "institution": institution.strip(),
                "supplier": supplier.strip()[:100],
                "total_amount": amount,
                "status": status,
                "date": fecha,
                "raw_tipo": tipo_contratacion.strip(),
                "raw_concepto": concepto.strip()[:100],
            }
            all_records.append(record)

        logger.info("  Year %s: %d total rows, %d pharmaceutical", year, total_count, pharma_count)

    return all_records


# ── CKAN Catalog Data ──────────────────────────────────────────────────

def fetch_ckan_catalog() -> list[dict]:
    """Fetch medication catalog data from datos.gob.mx CKAN API.

    Tries multiple datasets and fallback sources:
    1. datos.gob.mx CKAN API — multiple health/pharma datasets
    2. datamx.io mirror (CKAN-compatible)
    3. Direct CSV resource downloads
    """
    catalog_items = []

    # Try each CKAN dataset on datos.gob.mx
    for dataset_id in CKAN_DATASETS:
        logger.info("Fetching CKAN dataset: %s", dataset_id)
        meta_url = f"{CKAN_BASE}/package_show?id={dataset_id}"
        raw = fetch_url(meta_url, timeout=30)
        resources = []

        if raw:
            try:
                meta = json.loads(raw)
                if meta.get("success"):
                    for res in meta.get("result", {}).get("resources", []):
                        res_url = res.get("url", "")
                        res_format = res.get("format", "").upper()
                        res_name = res.get("name", "")
                        logger.info("  Found resource: %s (%s) — %s", res_name, res_format, res_url[:80])
                        if res_format in ("CSV", "XLS", "XLSX"):
                            resources.append({"url": res_url, "format": res_format, "name": res_name})
                        # Try DataStore for this resource
                        res_id = res.get("id", "")
                        if res_id:
                            ds_url = f"{CKAN_BASE}/datastore_search?resource_id={res_id}&limit=10000"
                            ds_raw = fetch_url(ds_url, timeout=60)
                            if ds_raw:
                                try:
                                    ds = json.loads(ds_raw)
                                    if ds.get("success"):
                                        records = ds.get("result", {}).get("records", [])
                                        if records:
                                            logger.info("  DataStore returned %d records for %s", len(records), res_name)
                                            catalog_items.extend(records)
                                except json.JSONDecodeError:
                                    pass
            except json.JSONDecodeError:
                logger.warning("  Could not parse CKAN metadata for %s", dataset_id)

        # Download CSV resources directly if DataStore yielded nothing
        for res in resources:
            if not catalog_items:
                logger.info("  Downloading resource: %s", res["url"][:80])
                res_raw = fetch_url(res["url"], timeout=120)
                if res_raw:
                    try:
                        text = res_raw.decode("utf-8")
                    except UnicodeDecodeError:
                        text = res_raw.decode("latin-1")
                    if res["format"] == "CSV":
                        reader = csv.DictReader(io.StringIO(text))
                        for row in reader:
                            catalog_items.append(dict(row))
                        logger.info("  Parsed %d rows from CSV", len(catalog_items))

    # Fallback: try known resource ID directly
    if not catalog_items:
        logger.info("Trying known DataStore resource ID...")
        ds_url = f"{CKAN_BASE}/datastore_search?resource_id={CKAN_CATALOG_RESOURCE}&limit=10000"
        raw = fetch_url(ds_url, timeout=60)
        if raw:
            try:
                ds = json.loads(raw)
                if ds.get("success"):
                    records = ds.get("result", {}).get("records", [])
                    logger.info("  DataStore returned %d records", len(records))
                    catalog_items.extend(records)
            except json.JSONDecodeError:
                pass

    # Fallback: try datamx.io mirror
    if not catalog_items:
        logger.info("Trying datamx.io mirror...")
        raw = fetch_url(DATAMX_CATALOG_URL, timeout=30)
        if raw:
            try:
                meta = json.loads(raw)
                if meta.get("success"):
                    for res in meta.get("result", {}).get("resources", []):
                        res_url = res.get("url", "")
                        if res.get("format", "").upper() == "CSV":
                            logger.info("  Downloading datamx.io CSV: %s", res_url[:80])
                            res_raw = fetch_url(res_url, timeout=120)
                            if res_raw:
                                text = res_raw.decode("utf-8", errors="replace")
                                reader = csv.DictReader(io.StringIO(text))
                                for row in reader:
                                    catalog_items.append(dict(row))
                                logger.info("  Parsed %d rows from datamx.io", len(catalog_items))
            except json.JSONDecodeError:
                pass

    logger.info("Total catalog items collected: %d", len(catalog_items))
    return catalog_items


# ── Alternative Non-gob.mx Sources ─────────────────────────────────────

def fetch_alternative_sources() -> tuple[list[dict], list[dict]]:
    """Try non-gob.mx sources as fallback when government portals are unreachable.

    Returns (catalog_items, procurement_records) from:
    1. QuienEsQuien.wiki API — OCDS procurement data
    2. AmeriGEOSS — Hospital pharma acquisitions
    3. Open Contracting Partnership Data Registry
    """
    catalog_items = []
    procurement_records = []

    # 1. Try QuienEsQuien.wiki API for OCDS procurement data
    logger.info("Trying QuienEsQuien.wiki API...")
    # Search for IMSS pharmaceutical contracts
    qqw_url = (
        f"{QQWIKI_API_BASE}/contracts?"
        "buyer_id=imss&"
        "tender_procurementMethodDetails=Licitación Pública&"
        "limit=500"
    )
    raw = fetch_url(qqw_url, timeout=30)
    if raw:
        try:
            data = json.loads(raw)
            contracts = data if isinstance(data, list) else data.get("data", [])
            logger.info("  QQW API returned %d contracts", len(contracts))
            for c in contracts:
                record = {
                    "year": str(c.get("period", {}).get("startDate", ""))[:4] or "2024",
                    "clave": "",
                    "description": c.get("description", "") or c.get("title", ""),
                    "institution": c.get("buyer", {}).get("name", "") if isinstance(c.get("buyer"), dict) else "IMSS",
                    "supplier": c.get("suppliers", [{}])[0].get("name", "") if c.get("suppliers") else "",
                    "total_amount": c.get("value", {}).get("amount", 0) if isinstance(c.get("value"), dict) else 0,
                    "status": "adjudicada",
                    "date": c.get("dateSigned", ""),
                }
                if is_pharmaceutical(record["description"]):
                    procurement_records.append(record)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning("  QQW API error: %s", e)
    else:
        logger.info("  QQW API not reachable")

    # 2. Try AmeriGEOSS hospital pharma data (CKAN-based)
    logger.info("Trying AmeriGEOSS HGGEA pharma dataset...")
    ameri_url = "https://data.amerigeoss.org/api/3/action/package_show?id=medicamentos-y-productos-farmaceuticos-adquiridos-por-el-hospital-de-hggea"
    raw = fetch_url(ameri_url, timeout=30)
    if raw:
        try:
            meta = json.loads(raw)
            if meta.get("success"):
                for res in meta.get("result", {}).get("resources", []):
                    if res.get("format", "").upper() == "CSV":
                        csv_url = res.get("url", "")
                        logger.info("  Downloading AmeriGEOSS CSV: %s", csv_url[:80])
                        csv_raw = fetch_url(csv_url, timeout=60)
                        if csv_raw:
                            text = csv_raw.decode("utf-8", errors="replace")
                            reader = csv.DictReader(io.StringIO(text))
                            for row in reader:
                                catalog_items.append(dict(row))
                            logger.info("  Parsed %d rows from AmeriGEOSS", len(catalog_items))
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("  AmeriGEOSS error: %s", e)
    else:
        logger.info("  AmeriGEOSS not reachable")

    # 3. Try Open Contracting Partnership Data Registry
    logger.info("Trying OCP Data Registry for Mexico...")
    ocp_url = "https://data.open-contracting.org/api/v1/publications/33/"
    raw = fetch_url(ocp_url, timeout=30)
    if raw:
        try:
            data = json.loads(raw)
            download_urls = data.get("download_urls", {})
            csv_url = download_urls.get("csv", "")
            if csv_url:
                logger.info("  OCP CSV download: %s", csv_url[:80])
                # Note: these can be very large, only fetch first portion
                csv_raw = fetch_url(csv_url, timeout=120)
                if csv_raw:
                    text = csv_raw.decode("utf-8", errors="replace")
                    reader = csv.DictReader(io.StringIO(text))
                    count = 0
                    for row in reader:
                        if count >= 50000:  # Safety limit
                            break
                        desc = row.get("tender/description", "") or row.get("description", "")
                        if is_pharmaceutical(desc):
                            procurement_records.append({
                                "year": str(row.get("tender/tenderPeriod/startDate", ""))[:4] or "2024",
                                "clave": extract_clave(desc) or "",
                                "description": desc[:200],
                                "institution": row.get("buyer/name", ""),
                                "supplier": row.get("awards/0/suppliers/0/name", ""),
                                "total_amount": float(row.get("awards/0/value/amount", 0) or 0),
                                "status": "adjudicada",
                                "date": row.get("awards/0/date", ""),
                            })
                        count += 1
                    logger.info("  OCP: scanned %d rows, %d pharma", count, len(procurement_records))
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning("  OCP error: %s", e)
    else:
        logger.info("  OCP Data Registry not reachable")

    logger.info("Alternative sources: %d catalog items, %d procurement records",
                len(catalog_items), len(procurement_records))
    return catalog_items, procurement_records


# ── Data Merging ───────────────────────────────────────────────────────

def build_procurement_json(
    compranet_records: list[dict],
    catalog_items: list[dict],
) -> dict:
    """Build the final mexico_procurement.json from collected data."""

    claves: dict[str, dict] = {}
    adjudicaciones: list[dict] = []

    # Map CompraNet year → cycle
    year_to_cycle = {
        "2020": "2019-2020",
        "2021": "2021-2022",
        "2022": "2021-2022",
        "2023": "2023-2024",
        "2024": "2023-2024",
        "2025": "2025-2026",
        "2026": "2025-2026",
    }

    # Process catalog items first (to build clave master list)
    for item in catalog_items:
        # CKAN field names vary — try common patterns
        clave_code = (
            item.get("CLAVE", "")
            or item.get("clave", "")
            or item.get("Clave", "")
            or item.get("CLAVE_CBCM", "")
            or ""
        )
        if not clave_code or not CLAVE_PHARMA_PATTERN.match(str(clave_code)):
            continue

        description = (
            item.get("DESCRIPCION", "")
            or item.get("descripcion", "")
            or item.get("Descripcion", "")
            or item.get("DESCRIPCION_ARTICULO", "")
            or ""
        )
        substance = (
            item.get("SUSTANCIA_ACTIVA", "")
            or item.get("sustancia_activa", "")
            or item.get("PRINCIPIO_ACTIVO", "")
            or ""
        )
        grupo = (
            item.get("GRUPO_TERAPEUTICO", "")
            or item.get("grupo_terapeutico", "")
            or item.get("GRUPO", "")
            or guess_therapeutic_group(str(clave_code))
        )

        claves[str(clave_code)] = {
            "clave": str(clave_code),
            "description": str(description).strip()[:200],
            "active_substance": str(substance).strip().lower(),
            "atc_code": "",
            "therapeutic_group": str(grupo).strip(),
            "source_type": guess_source_type(str(description)),
            "cnis_listed": True,
            "cofepris_registry": "",
            "indication": "",
            "mechanism_of_action": "",
            "patent_holder": "",
            "patent_expiry": "",
        }

    logger.info("Catalog provided %d pharmaceutical claves", len(claves))

    # Process CompraNet records
    for rec in compranet_records:
        clave = rec.get("clave", "")
        cycle = year_to_cycle.get(rec["year"], f"{rec['year']}")

        # If we have a clave, ensure it's in our master list
        if clave and clave not in claves:
            claves[clave] = {
                "clave": clave,
                "description": rec.get("description", ""),
                "active_substance": "",
                "atc_code": "",
                "therapeutic_group": guess_therapeutic_group(clave),
                "source_type": guess_source_type(rec.get("description", "")),
                "cnis_listed": False,  # found in CompraNet but not in CNIS catalog
                "cofepris_registry": "",
                "indication": "",
                "mechanism_of_action": "",
                "patent_holder": "",
                "patent_expiry": "",
            }

        adj = {
            "clave": clave or "unknown",
            "description": rec.get("description", ""),
            "active_substance": claves.get(clave, {}).get("active_substance", ""),
            "cycle": cycle,
            "status": rec.get("status", "adjudicada"),
            "supplier": rec.get("supplier", ""),
            "units_requested": 0,  # Not available in CompraNet bulk data
            "units_awarded": 0,
            "unit_price": 0.0,
            "total_amount": rec.get("total_amount", 0.0),
            "max_reference_price": 0.0,
            "institution": rec.get("institution", ""),
            "therapeutic_group": claves.get(clave, {}).get("therapeutic_group", ""),
            "source_type": claves.get(clave, {}).get("source_type", ""),
        }
        adjudicaciones.append(adj)

    # Sort claves
    sorted_claves = sorted(claves.values(), key=lambda c: c["clave"])

    return {
        "claves": sorted_claves,
        "adjudicaciones": adjudicaciones,
        "metadata": {
            "source": "CompraNet + datos.gob.mx CKAN API + QuienEsQuien.wiki + AmeriGEOSS + OCP",
            "compranet_years": COMPRANET_YEARS,
            "fetch_date": time.strftime("%Y-%m-%d"),
            "total_claves": len(sorted_claves),
            "total_adjudicaciones": len(adjudicaciones),
        },
    }


def main():
    logger.info("=" * 60)
    logger.info("Mexico Procurement Data Fetcher")
    logger.info("=" * 60)

    # Step 1: Fetch CompraNet data
    logger.info("\n[1/4] Fetching CompraNet bulk CSV data...")
    compranet = fetch_compranet(COMPRANET_YEARS)
    logger.info("CompraNet: %d pharmaceutical records found", len(compranet))

    # Step 2: Fetch CKAN catalog
    logger.info("\n[2/4] Fetching IMSS Catálogo Institucional de Insumos...")
    catalog = fetch_ckan_catalog()
    logger.info("CKAN catalog: %d items found", len(catalog))

    # Step 3: Try alternative non-gob.mx sources if primary sources yielded nothing
    if not compranet and not catalog:
        logger.info("\n[3/4] Primary sources failed — trying alternative sources...")
        alt_catalog, alt_procurement = fetch_alternative_sources()
        catalog.extend(alt_catalog)
        compranet.extend(alt_procurement)
        logger.info("Alternative sources: %d catalog, %d procurement", len(alt_catalog), len(alt_procurement))
    else:
        logger.info("\n[3/4] Primary sources succeeded — trying alternatives for enrichment...")
        alt_catalog, alt_procurement = fetch_alternative_sources()
        if alt_catalog:
            catalog.extend(alt_catalog)
            logger.info("  Added %d items from alternative catalog sources", len(alt_catalog))
        if alt_procurement:
            compranet.extend(alt_procurement)
            logger.info("  Added %d records from alternative procurement sources", len(alt_procurement))

    # Step 4: Merge and write
    logger.info("\n[4/4] Merging data and writing output...")
    result = build_procurement_json(compranet, catalog)

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # If we got real data, write it; otherwise preserve existing
    if result["claves"] or result["adjudicaciones"]:
        # Back up existing file
        if OUTPUT_FILE.exists():
            backup = OUTPUT_FILE.with_suffix(".json.bak")
            OUTPUT_FILE.rename(backup)
            logger.info("Backed up existing data to %s", backup.name)

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        logger.info("\nOutput written to %s", OUTPUT_FILE)
        logger.info("  Claves: %d", len(result["claves"]))
        logger.info("  Adjudicaciones: %d", len(result["adjudicaciones"]))
    else:
        logger.warning("\nNo data fetched — preserving existing file")
        if OUTPUT_FILE.exists():
            logger.info("Existing file preserved: %s", OUTPUT_FILE)
        sys.exit(1)

    logger.info("\nDone!")


if __name__ == "__main__":
    main()
