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

# HTTP request settings
REQUEST_TIMEOUT = 60.0
