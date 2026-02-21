# HTA Assessment Finder

A web application with three integrated modules to support market access and health technology assessment (HTA) research for EMA-authorized medicines.

## Modules

### 1. HTA & Reimbursement Finder

Search EMA-authorized medicines by name or active substance, then retrieve country-specific HTA assessment outcomes.

**Supported countries:**

| Country | Agency | Rating System |
|---------|--------|---------------|
| France | HAS (Commission de la Transparence) | SMR (clinical benefit) + ASMR (added benefit vs. comparator) |
| Germany | G-BA | Zusatznutzen (added benefit: erheblich → kein Zusatznutzen) |
| UK | NICE | Technology Appraisal / HST (Recommended, Optimised, Not recommended, etc.) |

**Workflow:**
1. Enter a medicine name or INN (e.g., "Keytruda", "pembrolizumab")
2. Select the medicine from EMA search results to see its authorized indications
3. Choose a country to retrieve HTA assessment outcomes with direct links to official decisions

---

### 2. Global Secondary Resources

A curated, country-level directory of official links covering marketing authorisation, HTA assessment, reimbursement decisions, and patient access — across multiple countries worldwide.

- Browse by country using a flag grid, or filter by name
- Each country panel lists categorized links (regulatory body, HTA agency, reimbursement authority, pricing databases, etc.)
- Useful as a quick-reference for global market access teams

---

### 3. Analogue Selection

Filter the full EMA medicines database to identify comparable therapies (analogues) for a target product.

**Available filters:**
- Therapeutic area (ATC / EMA category)
- Orphan medicine status
- Years since first EU approval
- First-in-class / first approval for indication
- Active substance name search

Results can be reviewed to support HTA submissions, dossier benchmarking, and analogue justification.

---

## Data Sources

| Source | Provider | Used By |
|--------|----------|---------|
| [EMA Medicines JSON](https://www.ema.europa.eu/en/about-us/about-website/download-website-data-json-data-format) | European Medicines Agency | All modules |
| [BDPM](https://base-donnees-publique.medicaments.gouv.fr/telechargement) | ANSM / HAS (France) | HTA Finder — France |
| [G-BA AIS XML](https://www.g-ba.de) | Gemeinsamer Bundesausschuss (Germany) | HTA Finder — Germany |
| [NICE Published Guidance](https://www.nice.org.uk/guidance/published) | NICE (UK) | HTA Finder — UK |

---

## Quick Start

### Prerequisites

- Python 3.11+

### Install and Run

```bash
pip install -r requirements.txt
python run.py
```

The application starts at **http://localhost:8000**. On first launch, it downloads and caches data from EMA, BDPM, G-BA, and NICE (~30 seconds). If any fetch fails, the app still starts — use `POST /api/reload` to retry.

### Run Tests

```bash
pip install pytest pytest-asyncio
python -m pytest tests/ -v
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Frontend home |
| `GET` | `/api/search?q=keytruda` | Search EMA medicines by name/substance |
| `GET` | `/api/countries` | List available HTA countries |
| `GET` | `/api/assessments/FR?substance=pembrolizumab` | HAS assessments (France) |
| `GET` | `/api/assessments/DE?substance=pembrolizumab` | G-BA assessments (Germany) |
| `GET` | `/api/assessments/GB?substance=pembrolizumab` | NICE assessments (UK) |
| `GET` | `/api/analogues/filters` | Available analogue filter options |
| `GET` | `/api/analogues/search?...` | Search analogues with multi-criteria filters |
| `GET` | `/api/status` | Data loading health check |
| `POST` | `/api/reload` | Trigger data reload from sources |

---

## Architecture

```
app/
├── main.py                        # FastAPI app, routes, startup lifecycle
├── config.py                      # Data source URLs and settings
├── models.py                      # Pydantic response models
├── services/
│   ├── ema_service.py             # EMA medicine fetch, cache, and search
│   ├── analogue_service.py        # Analogue selection filtering
│   └── hta_agencies/
│       ├── base.py                # Abstract HTAAgency base class
│       ├── france_has.py          # HAS adapter (BDPM data)
│       ├── germany_gba.py         # G-BA adapter (AIS XML)
│       └── uk_nice.py             # NICE adapter (published guidance HTML)
└── static/
    ├── index.html                 # Home / navigation
    ├── hta.html                   # HTA & Reimbursement Finder
    ├── analogues.html             # Analogue Selection
    ├── resources.html             # Global Secondary Resources
    ├── style.css                  # Styles
    ├── app.js                     # HTA module frontend logic
    ├── analogues.js               # Analogue module frontend logic
    ├── resources.js               # Resources module frontend logic
    └── shared.js                  # Shared utilities
```

### Adding a New HTA Country

1. Create `app/services/hta_agencies/<country>.py`
2. Subclass `HTAAgency` from `base.py` and implement `load_data()` and `search_assessments()`
3. Register it in the `hta_agencies` dict in `app/main.py`
4. Add tests in `tests/test_<country>.py`

The adapter pattern ensures each country's data source is handled independently while the API and frontend work uniformly across countries.

---

## HTA Rating Glossary

### France (HAS)
- **SMR** — Service Médical Rendu: Important, Modéré, Faible, Insuffisant
- **ASMR** — Amélioration du SMR: I (major improvement) to V (no improvement)

### Germany (G-BA / AMNOG)
- **Zusatznutzen** — Added benefit: erheblich (major), beträchtlich (considerable), gering (minor), nicht quantifizierbar (non-quantifiable), kein Zusatznutzen (none), geringerer Nutzen (lesser)

### UK (NICE)
- **TA** — Technology Appraisal
- **HST** — Highly Specialised Technology (ultra-rare conditions)
- **Outcomes**: Recommended, Recommended with restrictions (Optimised), Not recommended, Only in research, Terminated

---

© 2026 Fernando Rosas. All rights reserved.
