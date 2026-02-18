"""Application configuration and data source URLs."""

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
# Programme type filters for the published guidance page
NICE_PROGRAMME_TYPES = [
    "Technology appraisal guidance",
    "Highly specialised technologies guidance",
]
# Max pages to fetch from the NICE listing (each page ~50 items)
NICE_MAX_PAGES = 30

# HTTP request settings
REQUEST_TIMEOUT = 60.0
