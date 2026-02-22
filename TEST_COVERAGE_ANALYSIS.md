# Test Coverage Analysis

**Date**: 2026-02-22
**Suite**: 549 tests across 12 test files — all passing
**Overall coverage**: 80.7% statements, with branch coverage

## Current Coverage by Module

| Module | Stmts | Miss | Branch | Cover |
|--------|-------|------|--------|-------|
| `app/config.py` | 21 | 0 | 0 | **100%** |
| `app/models.py` | 106 | 0 | 0 | **100%** |
| `app/services/analogue_service.py` | 381 | 7 | 210 | **97%** |
| `app/services/ema_service.py` | 132 | 5 | 48 | **96%** |
| `app/services/hta_agencies/base.py` | 48 | 2 | 0 | **96%** |
| `app/services/hta_agencies/japan_pmda.py` | 147 | 9 | 54 | **90%** |
| `app/services/hta_agencies/spain_aemps.py` | 204 | 43 | 80 | **75%** |
| `app/services/hta_agencies/germany_gba.py` | 266 | 64 | 128 | **74%** |
| `app/services/hta_agencies/uk_nice.py` | 238 | 58 | 90 | **74%** |
| `app/services/hta_agencies/france_has.py` | 170 | 43 | 68 | **71%** |
| `app/main.py` | 221 | 95 | 64 | **52%** |

---

## Priority 1: `app/main.py` — 52% coverage

This is the most significant gap. Nearly half the application's central orchestration code is untested.

### 1a. `lifespan()` startup lifecycle (lines 192-266) — completely untested

The entire startup sequence — EMA data loading, HTA agency loading with retry/fallback, curated data loading, and HTA cross-reference building — has zero test coverage. This function contains:

- **Retry logic with fallback to cache** (lines 220-254): If remote fetch fails, it retries up to `MAX_AGENCY_RETRIES` times, then falls back to local cache. None of these paths are tested.
- **EMA load failure + cache fallback** (lines 203-210): The branch where EMA remote fetch fails and the app falls back to cached data.
- **HTA cross-reference build failure** (lines 260-263): The `try/except` around `_build_hta_cross_reference()`.

**Recommended tests:**
- Startup with all data sources succeeding
- Startup with EMA remote failure but cache available
- Startup with EMA remote failure and no cache (app still starts)
- Startup with one HTA agency failing all retries, falling back to cache
- Startup with one HTA agency failing all retries and no cache available
- Startup with HTA cross-reference build failing gracefully

### 1b. `_build_hta_cross_reference()` (lines 113-185) — untested

This function iterates all unique substances from the analogue service, queries each loaded HTA agency, and builds per-substance/per-country assessment summaries. It exercises all five country-specific rating extraction branches (FR/DE/GB/ES/other). No tests exist for this function.

**Recommended tests:**
- Cross-reference with multiple substances across multiple agencies
- Cross-reference skips unloaded agencies
- Cross-reference handles agency `search_assessments()` raising exceptions
- Cross-reference correctly extracts ratings for each country code (FR: SMR/ASMR, DE: Zusatznutzen, GB: NICE recommendation, ES: positioning)
- Cross-reference with empty substance list (early return)

### 1c. `POST /api/reload` endpoint (lines 370-411) — partially untested

The reload endpoint's success path (lines 393-405) — where agencies reload successfully and save to cache, curated data is reloaded, and HTA cross-reference is rebuilt — is not covered. The test only covers the error path.

**Recommended tests:**
- Full successful reload (all sources succeed)
- Partial reload (some agencies fail, errors collected)
- Reload rebuilds HTA cross-reference

### 1d. HTML page routes (lines 289-304) — untested

The `/hta`, `/analogues`, and `/resources` routes are never hit. While simple, they verify that the expected HTML files exist at the configured paths.

**Recommended tests:**
- Each page route returns 200 with HTML content-type
- Route returns 404/500 if HTML file is missing (edge case)

---

## Priority 2: HTA Agency `load_data()` methods — all ~70-75%

Every HTA agency adapter's `load_data()` method (the function that fetches data from external sources) is untested. These are the most I/O-heavy, error-prone functions in the codebase.

### 2a. France HAS `load_data()` (lines 104-110) and internal fetch methods (lines 233-291)

The `_fetch_file()`, `_load_medicines()`, `_load_compositions()`, `_load_smr()`, `_load_asmr()`, and `_load_ct_links()` methods are never called in tests. All tests pre-load data directly into internal dicts.

**Recommended tests (mock httpx):**
- Successful load from all five BDPM files
- One BDPM file returns HTTP 500 (partial load behavior)
- BDPM file with unexpected encoding
- Empty BDPM file response

### 2b. Germany G-BA `load_data()` (lines 75-114) and `_find_xml_urls()` (lines 218-294)

The XML URL discovery logic (scraping the AIS page to find the download link, with multiple fallback URL patterns) is completely untested. This is a fragile area — if G-BA changes their page layout, this code breaks.

**Recommended tests (mock httpx):**
- Successful XML download from first URL
- First URL fails, falls back to second candidate
- AIS page scraping extracts correct XML URL
- All URL candidates fail → RuntimeError raised
- XML response with unexpected encoding

### 2c. UK NICE `load_data()` (lines 74-102) and `_fetch_guidance_listing()` (lines 201-228)

The multi-page guidance listing fetch (iterating pages until no more items) and `_extract_from_guidance_page()` (fetching individual guidance pages to get recommendations) are untested.

**Recommended tests (mock httpx):**
- Successful multi-page listing fetch (stop when page returns no items)
- Individual guidance page fetch for missing recommendations
- Page fetch capped at 5 extra requests
- Network timeout during page fetch

### 2d. Spain AEMPS `load_data()` (lines 65-119)

The multi-page IPT listing fetch with alternative URL fallback is untested.

**Recommended tests (mock httpx):**
- Successful listing from primary URL
- Primary URL fails, falls back to Ministry of Health portal
- Multi-page pagination (stop on empty page)
- No IPT entries found → RuntimeError

### 2e. Japan PMDA `load_data()` (lines 60-113) and `_get_indication()` (lines 216-243)

The KEGG API calls (drug list + JAPIC mapping) with HTTPS→HTTP protocol fallback are untested. The `_get_indication()` method's live API call path is also untested.

**Recommended tests (mock httpx):**
- Successful load from KEGG API
- HTTPS fails, falls back to HTTP
- KEGG API returns empty drug list → RuntimeError
- `_get_indication()` API failure returns empty string gracefully

---

## Priority 3: Missing test categories

### 3a. Concurrency / async safety

No tests verify that concurrent requests to the same service work correctly. Since the app uses in-memory state (dicts, lists) and async handlers, concurrent reads during a reload could cause issues.

**Recommended tests:**
- Multiple concurrent `/api/search` requests
- `/api/reload` during an active `/api/assessments` request
- Concurrent assessment lookups for different countries

### 3b. API input validation and error responses

While `test_main.py` covers basic query parameters, edge cases in input validation are sparse:

**Recommended tests:**
- `/api/search` with `q` shorter than 2 chars → 422 validation error
- `/api/search` with `limit=0` or `limit=101` → 422 validation error
- `/api/assessments/{country_code}` with empty substance → error response
- `/api/assessments/{country_code}` with unknown country code → 404
- `/api/analogues/search` with contradictory filters (e.g., `orphan=yes` + `prevalence_category=non-rare`)

### 3c. `_filter_by_indication()` in `main.py` (lines 80-93)

The indication filtering helper — which scores assessments by keyword overlap with an indication string and applies a 20% threshold — is not tested directly.

**Recommended tests:**
- Filter with high-overlap indication text (keeps relevant assessments)
- Filter with no matching keywords (falls back to returning all assessments)
- Filter with single-word indication
- Filter with empty indication string

### 3d. `_unique_key()` deduplication (line 108-110)

While the curated data deduplication is tested in `test_main.py`, the specific key generation logic for different country-specific reference fields (guidance_reference, dossier_code, ipt_reference, cis_code) should have dedicated unit tests.

### 3e. `load_curated_assessments()` edge cases

**Recommended tests:**
- Curated JSON file with malformed entries (missing required fields)
- Curated JSON with duplicate substance+country entries
- Curated file path doesn't exist (graceful no-op)
- Curated data with assessments spanning all five countries

### 3f. EMA service retry logic (lines 96, 132-134 in `ema_service.py`)

The `load_data()` method has retry logic with exponential backoff (3 retries, 2s base delay). This is untested — all tests pre-load data directly.

**Recommended tests (mock httpx):**
- First attempt fails, second succeeds
- All retries exhausted → raises last error
- Timeout on one attempt, success on next

### 3g. Base class `HTAAgency` file I/O helpers (lines 70, 84 in `base.py`)

The `_read_json_file()` and `_write_json_file()` protected methods have minor untested branches.

---

## Priority 4: Structural improvements

### 4a. No property-based / fuzz testing

All tests use hand-crafted fixtures. Property-based testing (e.g., with Hypothesis) would help find edge cases in:
- `_split_indications()` — complex text splitting with many regex patterns
- `_extract_line_of_therapy()` / `_extract_treatment_setting()` — regex-based extraction
- Date normalization functions across all adapters
- `_classify_therapeutic_area()` — classification with many keyword patterns

### 4b. No performance / regression benchmarks

The analogue service processes the entire EMA dataset (~2,000 medicines). There are no tests that verify:
- Search performance with realistic dataset sizes
- Memory usage during `load_from_ema()` with full EMA data
- Startup time regression detection

### 4c. No contract tests for external data sources

The app depends on specific formats from EMA, BDPM, G-BA, NICE, AEMPS, and KEGG. There are no tests that verify the current live format still matches expectations. Even a simple "can we parse the first 10 records from the real endpoint" test (skipped in CI, run manually) would catch format changes early.

### 4d. No snapshot / golden-file tests for complex outputs

Functions like `_build_result_row()`, `_build_hta_cross_reference()`, and assessment result construction produce complex nested structures. Snapshot tests would catch unintended output shape changes during refactoring.

---

## Summary of recommended actions

| Action | Impact | Effort |
|--------|--------|--------|
| Test `lifespan()` startup with mocked services | High — covers 50+ missed lines in main.py | Medium |
| Test `_build_hta_cross_reference()` | High — covers 70 missed lines, validates cross-module integration | Medium |
| Test all `load_data()` methods with mocked HTTP | High — covers ~200 missed lines across 5 adapters | High |
| Test `POST /api/reload` success path | Medium — covers 20 missed lines | Low |
| Test `_filter_by_indication()` | Medium — validates assessment relevance filtering | Low |
| Add API input validation edge case tests | Medium — catches validation regressions | Low |
| Add concurrency tests | Medium — validates async safety | Medium |
| Add EMA retry logic tests | Low — covers 5 missed lines | Low |
| Add property-based testing for text parsers | Low — finds unknown edge cases | Medium |
| Add contract tests for external data formats | Low — early warning for format changes | Medium |
