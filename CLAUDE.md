# CLAUDE.md - AI Assistant Guide for HTA-Reimbursement-Price

## Project Overview

**HTA Assessment Finder** — a web application that searches EMA-authorized medicines and retrieves HTA assessment outcomes by country. Currently supports **France (HAS)** with SMR/ASMR ratings, designed to expand to **Germany (G-BA)** and **UK (NICE)**.

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
│   │   └── hta_agencies/
│   │       ├── base.py                # Abstract HTAAgency base class
│   │       └── france_has.py          # France HAS adapter (BDPM data)
│   └── static/
│       ├── index.html                 # Single-page frontend
│       ├── style.css                  # Styles
│       └── app.js                     # Frontend logic
└── tests/
    ├── test_ema_service.py            # EMA search logic tests
    └── test_france_has.py             # HAS adapter tests
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

1. **Startup**: App fetches EMA JSON + BDPM TSV files → caches in memory
2. **Search**: User query → `EMAService.search()` → fuzzy match on name/substance
3. **Assessments**: Active substance → `HTAAgency.search_assessments()` → matched by substance in BDPM compositions → returns SMR/ASMR with links

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

BDPM files: tab-separated, no header row, Latin-1 encoded. See `app/config.py` for full URLs.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search?q={query}` | Search EMA medicines by name/substance |
| `GET` | `/api/countries` | List available countries with agency info |
| `GET` | `/api/assessments/{country_code}?substance={inn}` | Get HTA assessments |
| `GET` | `/api/status` | Data loading health check |
| `POST` | `/api/reload` | Trigger data reload from sources |

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

### Germany (G-BA) — Planned

- **AMNOG**: Early benefit assessment for new drugs
- **Zusatznutzen**: Added benefit categories (erheblich, beträchtlich, gering, nicht quantifizierbar, kein Zusatznutzen)

### UK (NICE) — Planned

- **TA (Technology Appraisal)**: Recommended / Optimised / Not recommended
- **HST (Highly Specialised Technology)**: For ultra-rare conditions

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
