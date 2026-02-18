# HTA Assessment Finder

A web application to search for EMA-authorized medicines and retrieve HTA (Health Technology Assessment) outcomes by country. Currently supports **France (HAS)** with an architecture designed to expand to **Germany (G-BA)** and **UK (NICE)**.

## How It Works

1. **Search** — Enter a medicine name or active substance (e.g., "Keytruda", "pembrolizumab")
2. **Review** — See the EMA-authorized therapeutic indications for the selected medicine
3. **Find assessments** — Select a country and retrieve HTA assessment outcomes (SMR/ASMR ratings for France) with links to the full assessment

## Data Sources

| Source | Provider | Content | Auth Required |
|--------|----------|---------|---------------|
| [EMA Medicines JSON](https://www.ema.europa.eu/en/about-us/about-website/download-website-data-json-data-format) | European Medicines Agency | All centrally authorized medicines with therapeutic indications | No |
| [BDPM](https://base-donnees-publique.medicaments.gouv.fr/telechargement) | French Government (ANSM/HAS) | SMR ratings, ASMR ratings, and links to CT opinion pages | No |

## Quick Start

### Prerequisites

- Python 3.11+

### Install and Run

```bash
pip install -r requirements.txt
python run.py
```

The application starts at **http://localhost:8000**. On first launch, it downloads and caches data from EMA and BDPM (takes ~30 seconds).

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Frontend UI |
| `GET` | `/api/search?q=keytruda` | Search EMA medicines |
| `GET` | `/api/countries` | List available countries |
| `GET` | `/api/assessments/FR?substance=pembrolizumab` | Get HAS assessments |
| `GET` | `/api/status` | Data loading status |
| `POST` | `/api/reload` | Trigger data reload |

### Run Tests

```bash
pip install pytest pytest-asyncio
python -m pytest tests/ -v
```

## Architecture

```
app/
├── main.py                        # FastAPI app, routes, startup
├── config.py                      # URLs and settings
├── models.py                      # Pydantic data models
├── services/
│   ├── ema_service.py             # EMA medicine search
│   └── hta_agencies/
│       ├── base.py                # Abstract HTAAgency base class
│       └── france_has.py          # France HAS (SMR/ASMR) adapter
└── static/
    ├── index.html                 # Frontend
    ├── style.css                  # Styles
    └── app.js                     # Frontend logic
```

### Adding a New Country

1. Create a new adapter in `app/services/hta_agencies/` (e.g., `germany_gba.py`)
2. Implement the `HTAAgency` abstract base class
3. Register it in the `hta_agencies` dict in `app/main.py`

The adapter pattern ensures each country's data source and assessment format is handled independently while the API and frontend work uniformly across countries.

## France (HAS) — Assessment Details

The HAS adapter retrieves data from the BDPM (Base de Données Publique des Médicaments):

- **SMR (Service Médical Rendu)** — Clinical benefit rating: Important, Modéré, Faible, Insuffisant
- **ASMR (Amélioration du SMR)** — Improvement over existing treatments: I (major) through V (no improvement)
- **Assessment link** — Direct URL to the Commission de la Transparence opinion on has-sante.fr

## Future Roadmap

- **Germany (G-BA)** — AMNOG early benefit assessments
- **UK (NICE)** — Technology appraisals
