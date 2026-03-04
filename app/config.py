"""Application configuration and data source URLs."""

import os

# ── Offline mode ──────────────────────────────────────────────────────
# When True, the app uses only the bundled JSON files in data/ and never
# attempts to fetch from remote sources.  Set the environment variable
# OFFLINE_MODE=1 (or "true") to enable, or leave unset for the default
# behaviour (try cache first, fetch remote as fallback).
OFFLINE_MODE = os.environ.get("OFFLINE_MODE", "").lower() in ("1", "true", "yes")

# EMA (European Medicines Agency) - JSON data updated twice daily
EMA_MEDICINES_URL = (
    "https://www.ema.europa.eu/en/documents/report/"
    "medicines-output-medicines_json-report_en.json"
)

# BDPM (Base de Données Publique des Médicaments) - France
BDPM_BASE_URL = "https://base-donnees-publique.medicaments.gouv.fr"
BDPM_FILES = {
    "medicines": "/download/file/CIS_bdpm.txt",
    "compositions": "/download/file/CIS_COMPO_bdpm.txt",
    "smr": "/download/file/CIS_HAS_SMR_bdpm.txt",
    "asmr": "/download/file/CIS_HAS_ASMR_bdpm.txt",
    "ct_links": "/download/file/HAS_LiensPageCT_bdpm.txt",
}

# BDPM files are Latin-1 (ISO-8859-1) encoded, tab-separated, no header row
BDPM_ENCODING = "latin-1"
BDPM_SEPARATOR = "\t"

# G-BA (Gemeinsamer Bundesausschuss) - Germany
# AIS XML file with all AMNOG benefit assessment decisions.
# Updated on the 1st and 15th of each month.
# A permanent download URL can be requested from ais@g-ba.de.
# The URL below points to the AIS download page; the adapter
# fetches the XML link from it automatically.
GBA_AIS_PAGE_URL = (
    "https://www.g-ba.de/themen/arzneimittel/"
    "arzneimittel-richtlinie-anlagen/nutzenbewertung-35a/ais/"
)
GBA_ASSESSMENT_BASE_URL = "https://www.g-ba.de/bewertungsverfahren/nutzenbewertung/"

# NICE (National Institute for Health and Care Excellence) - United Kingdom
# Published guidance listing pages, filtered by programme type.
# No API key required for the public website pages.
NICE_BASE_URL = "https://www.nice.org.uk"
NICE_PUBLISHED_URL = "https://www.nice.org.uk/guidance/published"
NICE_GUIDANCE_BASE_URL = "https://www.nice.org.uk/guidance/"
# NICE API endpoint — returns structured JSON guidance data.
# This is the primary data source; HTML scraping is used as fallback.
NICE_API_URL = "https://api.nice.org.uk/services/guidance/published"
# Programme type filters for the published guidance page
NICE_PROGRAMME_TYPES = [
    "Technology appraisal guidance",
    "Highly specialised technologies guidance",
]
# Max pages to fetch from the NICE listing (each page ~50 items).
# NICE has published ~750+ TAs and ~35+ HSTs; 50 pages covers all of them.
NICE_MAX_PAGES = 50
# Known upper bounds for TA/HST numbers — used for gap-filling after listing
# scrape to ensure 100% coverage of all published guidance.
NICE_TA_MAX_NUMBER = 1150   # TAs numbered ta1 through ~ta1140+ (as of 2026)
NICE_HST_MAX_NUMBER = 55    # HSTs numbered hst1 through ~hst50
# Max concurrent requests when gap-filling individual guidance pages
NICE_GAP_FILL_CONCURRENCY = 10

# AEMPS (Agencia Española de Medicamentos y Productos Sanitarios) - Spain
# Informes de Posicionamiento Terapéutico (IPT) listing page.
# Public HTML page listing all published IPT reports with links to PDF documents.
AEMPS_BASE_URL = "https://www.aemps.gob.es"
AEMPS_IPT_LISTING_URL = (
    "https://www.aemps.gob.es/medicamentos-de-uso-humano/"
    "informes-de-posicionamiento-terapeutico/"
)
# Additional IPT listing URLs — tried as fallbacks when primary fails.
# Includes the Ministry of Health portal and alternative AEMPS URL paths.
AEMPS_IPT_LISTING_URLS = [
    # Primary AEMPS listing page
    "https://www.aemps.gob.es/medicamentos-de-uso-humano/"
    "informes-de-posicionamiento-terapeutico/",
    # WordPress category pages (current site structure since ~2024)
    "https://www.aemps.gob.es/category/informa/"
    "informes-de-posicionamiento-terapeutico/",
    "https://www.aemps.gob.es/category/informa/notasinformativas/"
    "medicamentosusohumano-3/comiteEvaluacion/ipt/",
    # IPTs organised by disease area
    "https://www.aemps.gob.es/medicamentos-de-uso-humano/"
    "informes-de-posicionamiento-terapeutico/"
    "informes-de-posicionamiento-terapeutico-enfermedad/",
    # Ministry of Health portal fallback
    "https://www.sanidad.gob.es/areas/farmacia/infoMedicamentos/IPT/home.htm",
    # Alternative AEMPS URL paths
    "https://www.aemps.gob.es/la-aemps/informes-de-posicionamiento-terapeutico/",
    "https://www.aemps.gob.es/medicamentos-de-uso-humano/ipt/",
]
# Max pages per listing URL — increased to ensure all ~200+ IPTs are captured
AEMPS_MAX_PAGES = 40
# CIMA REST API — AEMPS Centre for Medicine Information.
# Provides authorised medicine data to cross-reference with IPTs.
AEMPS_CIMA_API_URL = "https://cima.aemps.es/cima/rest/medicamentos"
AEMPS_CIMA_BASE_URL = "https://cima.aemps.es/cima"

# PMDA (Pharmaceuticals and Medical Devices Agency) - Japan
# New drug approval information and review reports.
# Public HTML listing of approved drugs with review report links.
PMDA_BASE_URL = "https://www.pmda.go.jp"
PMDA_DRUGS_URL = (
    "https://www.pmda.go.jp/english/review-services/reviews/"
    "approved-information/drugs/0002.html"
)

# KEGG REST API — used to look up JAPIC codes and disease text for Japan NHI pricing
# JAPIC (Japan Pharmaceutical Information Center) codes identify NHI-priced drugs.
# KEGG conv endpoint gives all JAPIC→KEGG drug ID mappings in one call.
KEGG_API_BASE = "https://rest.kegg.jp"
# Append JAPIC code to construct the pricing page URL
KEGG_JAPIC_BASE_URL = "https://www.kegg.jp/medicus-bin/japic_med?japic_code="

# MHLW (Ministry of Health, Labour and Welfare) — sets NHI drug prices
# Quarterly drug pricing decisions (新薬収載) are published on this index page.
MHLW_PRICING_URL = (
    "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/"
    "iryouhoken/newpage_00037.html"
)

# AIFA (Agenzia Italiana del Farmaco) - Italy
# Transparency Lists — Class A and H medicines reimbursed by the SSN.
# Published monthly as CSV files (semicolon-delimited).
# The listing page contains links to the latest downloadable files.
AIFA_BASE_URL = "https://www.aifa.gov.it"
AIFA_LISTS_PAGE_URL = "https://www.aifa.gov.it/en/liste-farmaci-a-h"
AIFA_TRANSPARENCY_PAGE_URL = "https://www.aifa.gov.it/en/liste-di-trasparenza"
# Direct download URL patterns for transparency list CSV files.
# The date portion changes with each update, so the adapter scrapes the page
# to find the current download links.
AIFA_CLASS_A_CSV_PATTERN = "Classe_A_per_Principio_Attivo"
AIFA_CLASS_H_CSV_PATTERN = "Classe_H_per_Principio_Attivo"

# HTTP request settings
REQUEST_TIMEOUT = 60.0

# SSL verification — set SSL_VERIFY=0 to disable certificate verification.
# Useful on macOS where some government sites (e.g. French BDPM) have
# broken certificate chains that cause SSL errors.
SSL_VERIFY = os.environ.get("SSL_VERIFY", "").lower() not in ("0", "false", "no")
