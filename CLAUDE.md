# CLAUDE.md - AI Assistant Guide for HTA-Reimbursement-Price

## Project Overview

**HTA Assessment Finder** — a web application with two modules:

1. **HTA & Reimbursement**: Search EMA-authorized medicines and retrieve HTA assessment outcomes by country. Supports **France (HAS)** with SMR/ASMR ratings, **Germany (G-BA)** with Zusatznutzen (added benefit) ratings, and **UK (NICE)** with Technology Appraisal / HST recommendation outcomes.
2. **Analogue Selection**: Filter EMA medicines by therapeutic area, orphan status, years since approval, first approval status, and more to identify comparable therapies.

**Tech stack**: Python 3.11+, FastAPI, httpx, vanilla HTML/CSS/JS frontend.

## Repository Structure

```
HTA-Reimbursement-Price/
├── CLAUDE.md                          # This file
├── README.md                          # Project documentation
├── requirements.txt                   # Python dependencies
├── run.py                             # Entry point (uvicorn)
├── app/
│   ├── main.py                        # FastAPI app, routes, startup lifecycle
│   ├── config.py                      # Data source URLs, settings
│   ├── models.py                      # Pydantic response models
│   ├── services/
│   │   ├── ema_service.py             # EMA medicine data (fetch, cache, search)
│   │   ├── analogue_service.py        # Analogue selection (filter EMA data)
│   │   └── hta_agencies/
│   │       ├── base.py                # Abstract HTAAgency base class
│   │       ├── france_has.py          # France HAS adapter (BDPM data)
│   │       ├── germany_gba.py         # Germany G-BA adapter (AIS XML data)
│   │       └── uk_nice.py             # UK NICE adapter (published guidance HTML)
│   └── static/
│       ├── index.html                 # Single-page frontend
│       ├── style.css                  # Styles
│       └── app.js                     # Frontend logic
└── tests/
    ├── test_ema_service.py            # EMA search logic tests
    ├── test_analogue_service.py       # Analogue selection tests
    ├── test_france_has.py             # HAS adapter tests
    ├── test_germany_gba.py            # G-BA adapter tests
    └── test_uk_nice.py                # NICE adapter tests
```

## Getting Started

```bash
pip install -r requirements.txt
python run.py
# App runs at http://localhost:8000
```

On startup, the app downloads data from EMA and BDPM (~30s). If fetch fails, the app still starts — use `POST /api/reload` to retry.

## Development Workflow

### Running Tests

```bash
pip install pytest pytest-asyncio
python -m pytest tests/ -v
```

Tests use sample data fixtures (no network calls). Always run tests before and after changes.

### Branch Strategy

- **Main branch**: `main` — stable code
- **Feature branches**: `feature/<description>` or `claude/<description>`
- Write descriptive commit messages focusing on "why"

### Code Style

- Python: PEP 8, type hints on function signatures, docstrings on modules/classes
- Frontend: vanilla JS (no framework), CSS custom properties for theming
- No linter/formatter configured yet — follow existing patterns

## Architecture

### Data Flow

1. **Startup**: App fetches EMA JSON + BDPM TSV files → caches in memory. Analogue service indexes EMA data for filtering.
2. **HTA Module — Search**: User query → `EMAService.search()` → fuzzy match on name/substance
3. **HTA Module — Assessments**: Active substance → `HTAAgency.search_assessments()` → matched by substance in BDPM compositions → returns SMR/ASMR with links
4. **Analogue Module**: User sets filters → `AnalogueService.search()` → filters EMA data by therapeutic area, orphan status, approval date, etc. → returns matching medicines

### Key Design: Country Adapter Pattern

Each country's HTA agency is a subclass of `HTAAgency` (in `app/services/hta_agencies/base.py`):

```python
class HTAAgency(ABC):
    country_code: str       # "FR", "DE", "GB"
    agency_abbreviation: str  # "HAS", "G-BA", "NICE"
    async def load_data(self) -> None: ...
    async def search_assessments(self, active_substance, product_name=None) -> list[AssessmentResult]: ...
```

**To add a new country**: create a new adapter file, implement the base class, register in `hta_agencies` dict in `app/main.py`.

### External Data Sources

| Source | URL | Format | Encoding | Auth |
|--------|-----|--------|----------|------|
| EMA Medicines | `ema.europa.eu/.../medicines_json-report_en.json` | JSON | UTF-8 | None |
| BDPM Medicines | `base-donnees-publique.medicaments.gouv.fr/download/file/CIS_bdpm.txt` | TSV | Latin-1 | None |
| BDPM Compositions | `.../CIS_COMPO_bdpm.txt` | TSV | Latin-1 | None |
| BDPM SMR | `.../CIS_HAS_SMR_bdpm.txt` | TSV | Latin-1 | None |
| BDPM ASMR | `.../CIS_HAS_ASMR_bdpm.txt` | TSV | Latin-1 | None |
| BDPM CT Links | `.../HAS_LiensPageCT_bdpm.txt` | TSV | Latin-1 | None |
| G-BA AIS | `g-ba.de/.../G-BA_Beschluss_Info.xml` | XML | UTF-8 | None |
| NICE Published | `nice.org.uk/guidance/published` | HTML | UTF-8 | None |

BDPM files: tab-separated, no header row, Latin-1 encoded. G-BA AIS: single XML file with all decisions. NICE: public HTML listing pages parsed with regex. See `app/config.py` for full URLs.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search?q={query}` | Search EMA medicines by name/substance |
| `GET` | `/api/countries` | List available countries with agency info |
| `GET` | `/api/assessments/{country_code}?substance={inn}` | Get HTA assessments |
| `GET` | `/api/status` | Data loading health check |
| `POST` | `/api/reload` | Trigger data reload from sources |
| `GET` | `/api/analogues/filters` | Available filter options for analogue selection |
| `GET` | `/api/analogues/search?...` | Search analogues with multi-criteria filters |

## Key Conventions for AI Assistants

### Before Making Changes

- **Read before writing**: Always read existing files before modifying
- **Run tests**: `python -m pytest tests/ -v` before and after changes
- **Check models.py**: API response shapes are defined as Pydantic models — keep frontend and backend in sync

### When Writing Code

- Follow the existing adapter pattern for new country support
- All data fetching is async (httpx) — keep it that way
- Frontend uses `esc()` helper for HTML escaping — always escape user/API data
- Keep the frontend as vanilla JS — no framework dependencies
- Prefer simple solutions; avoid premature abstractions

### When Adding a New HTA Agency

1. Create `app/services/hta_agencies/<country>.py`
2. Subclass `HTAAgency` from `base.py`
3. Implement `load_data()` and `search_assessments()`
4. Register in `hta_agencies` dict in `app/main.py`
5. Add tests in `tests/test_<country>.py` with sample data fixtures
6. The frontend auto-discovers countries via `/api/countries` — no frontend changes needed

### When Committing

- Stage specific files (not `git add -A`)
- Never commit secrets or `.env` files
- Write concise messages explaining "why"

## Domain Context

**HTA** evaluates health technologies to inform reimbursement decisions.

### France (HAS) — Current

- **SMR (Service Médical Rendu)**: Clinical benefit — Important, Modéré, Faible, Insuffisant
- **ASMR (Amélioration du SMR)**: Improvement over existing treatments — I (major) to V (none)
- **CT (Commission de la Transparence)**: The committee that issues SMR/ASMR opinions
- **CIS code**: French unique medicine identifier in BDPM

### Germany (G-BA) — Current

- **AMNOG**: Early benefit assessment for new drugs
- **Zusatznutzen**: Added benefit — erheblich (major), beträchtlich (considerable), gering (minor), nicht quantifizierbar (non-quantifiable), kein Zusatznutzen (none), geringerer Nutzen (lesser)
- **Aussagesicherheit**: Evidence certainty — Beleg (proof), Hinweis (indication), Anhaltspunkt (hint)
- **zVT**: Zweckmäßige Vergleichstherapie (appropriate comparator therapy)
- Data source: G-BA AIS XML (Arztinformationssystem), updated 1st/15th of each month

### UK (NICE) — Current

- **TA (Technology Appraisal)**: Recommended / Optimised / Not recommended
- **HST (Highly Specialised Technology)**: For ultra-rare conditions
- **Recommendation outcomes**: Recommended, Recommended with restrictions (Optimised), Not recommended, Only in research, Terminated appraisal
- Data source: NICE published guidance listing pages (HTML), parsed to extract TA/HST guidance metadata and recommendation status

### General HTA Concepts

- **ICER** — Incremental Cost-Effectiveness Ratio
- **QALY** — Quality-Adjusted Life Year
- **CEA** — Cost-Effectiveness Analysis
- **BIA** — Budget Impact Analysis

## Updating This File

Update this CLAUDE.md when:
- Adding new country adapters
- Changing the API contract or data models
- Adding new dependencies or build tools
- Modifying the directory structure
