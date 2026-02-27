"""Spain AEMPS (Agencia Española de Medicamentos y Productos Sanitarios) adapter.

Data sources (tried in order):
1. AEMPS IPT listing pages — Informes de Posicionamiento Terapéutico (IPT)
   scraped from the AEMPS website and Ministry of Health portal.
2. CIMA REST API — authorised medicine data from the AEMPS Centre for Medicine
   Information, cross-referenced with IPTs for enriched medicine metadata.

Multiple listing URLs are tried as fallbacks to maximise IPT coverage.
No authentication required.
"""

import json
import logging
import re
from pathlib import Path

import httpx

from app.config import (
    AEMPS_BASE_URL,
    AEMPS_CIMA_API_URL,
    AEMPS_CIMA_BASE_URL,
    AEMPS_IPT_LISTING_URL,
    AEMPS_IPT_LISTING_URLS,
    AEMPS_MAX_PAGES,
    REQUEST_TIMEOUT,
    SSL_VERIFY,
)
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Therapeutic positioning outcomes -> English display values
POSITIONING_DISPLAY = {
    "favorable": "Favorable",
    "desfavorable": "Unfavorable (Desfavorable)",
    "favorable condicionado": "Favorable with conditions (Condicionado)",
    "favorable con condiciones": "Favorable with conditions (Condicionado)",
    "no favorable": "Unfavorable (No favorable)",
    "pendiente": "Pending (Pendiente)",
}


class SpainAEMPS(HTAAgency):
    """AEMPS (Agencia Española de Medicamentos y Productos Sanitarios) — Spain's HTA agency."""

    def __init__(self) -> None:
        self._ipt_list: list[dict] = []
        self._cima_medicines: dict[str, dict] = {}  # INN lower -> CIMA data
        self._loaded = False

    @property
    def country_code(self) -> str:
        return "ES"

    @property
    def country_name(self) -> str:
        return "Spain"

    @property
    def agency_abbreviation(self) -> str:
        return "AEMPS"

    @property
    def agency_full_name(self) -> str:
        return "Agencia Española de Medicamentos y Productos Sanitarios"

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    async def load_data(self) -> None:
        """Fetch and parse IPT data from multiple listing URLs, plus CIMA data.

        Strategy:
        1. Try all IPT listing URLs, collecting entries from each.
        2. Optionally fetch CIMA authorised medicine data for cross-referencing.
        3. Deduplicate and merge results from all sources.
        """
        all_items: list[dict] = []
        seen_refs: set[str] = set()
        seen_urls: set[str] = set()

        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            verify=SSL_VERIFY,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        ) as client:
            # Try ALL listing URLs (not just first success) to maximise coverage
            for listing_url in AEMPS_IPT_LISTING_URLS:
                url_items = await self._fetch_ipt_listing(client, listing_url, seen_refs, seen_urls)
                if url_items:
                    all_items.extend(url_items)
                    logger.info(
                        "AEMPS listing %s returned %d new items",
                        listing_url[:60], len(url_items),
                    )

            # Try CIMA API to enrich IPT data with authorised medicine metadata
            try:
                await self._fetch_cima_data(client)
            except Exception:
                logger.debug(
                    "CIMA API not available — IPT data will not be enriched "
                    "with authorised medicine metadata",
                    exc_info=True,
                )

        if not all_items:
            raise RuntimeError(
                "AEMPS data fetch returned 0 IPT entries — "
                "the website structure may have changed or the pages "
                "could not be fetched. Check "
                "https://www.aemps.gob.es/medicamentos-de-uso-humano/"
                "informes-de-posicionamiento-terapeutico/"
            )

        # Enrich IPT entries with CIMA data if available
        if self._cima_medicines:
            self._enrich_ipts_with_cima(all_items)

        self._ipt_list = all_items
        self._loaded = True
        logger.info("Spain AEMPS data loaded: %d IPT entries", len(self._ipt_list))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find AEMPS IPTs matching the given substance or product.

        Searches across the IPT title **and** the URL slug, because some IPT
        URLs embed the drug name even when the display title does not
        (e.g. ``ipt-44-2022-bavencio.pdf``).
        """
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results = []
        for ipt in self._ipt_list:
            title_lower = ipt.get("title", "").lower()
            url_lower = ipt.get("url", "").lower()

            # Search in both the title and the URL slug
            substance_match = (
                substance_lower in title_lower or substance_lower in url_lower
            )
            product_match = product_lower and (
                product_lower in title_lower or product_lower in url_lower
            )

            if not substance_match and not product_match:
                continue

            positioning = ipt.get("positioning", "")
            pos_display = _normalize_positioning(positioning)

            # Build concise English summary
            summary_parts: list[str] = []
            if pos_display:
                summary_parts.append(f"Positioning: {pos_display}")
            ref = ipt.get("reference", "")
            if ref:
                summary_parts.append(ref)

            results.append(
                AssessmentResult(
                    product_name=product_name or active_substance,
                    evaluation_reason=ipt.get("title", ""),
                    opinion_date=ipt.get("published_date", ""),
                    assessment_url=_normalize_aemps_url(ipt.get("url", ""), ref),
                    ipt_reference=ref,
                    therapeutic_positioning=pos_display,
                    summary_en=" | ".join(summary_parts),
                )
            )

        # Sort most recent first
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── IPT listing fetching ──────────────────────────────────────────

    async def _fetch_ipt_listing(
        self,
        client: httpx.AsyncClient,
        listing_url: str,
        seen_refs: set[str],
        seen_urls: set[str],
    ) -> list[dict]:
        """Fetch all pages of an IPT listing URL, deduplicating against seen refs/urls."""
        all_items: list[dict] = []

        for page in range(1, AEMPS_MAX_PAGES + 1):
            try:
                params = {"pg": str(page)} if page > 1 else {}
                resp = await client.get(listing_url, params=params)
                resp.raise_for_status()
                html = resp.text
            except Exception:
                logger.warning(
                    "Failed to fetch AEMPS IPT listing page %d from %s",
                    page, listing_url,
                )
                break

            items = self._parse_listing_page(html)
            if not items:
                break

            # Deduplicate against already-collected entries
            new_items = []
            for item in items:
                ref = item.get("reference", "")
                url = item.get("url", "")

                if ref and ref in seen_refs:
                    continue
                if url and url in seen_urls:
                    continue

                if ref:
                    seen_refs.add(ref)
                if url:
                    seen_urls.add(url)
                new_items.append(item)

            all_items.extend(new_items)
            logger.debug("AEMPS IPT %s page %d: %d items (%d new)", listing_url[:40], page, len(items), len(new_items))

        return all_items

    # ── CIMA REST API ────────────────────────────────────────────────

    async def _fetch_cima_data(self, client: httpx.AsyncClient) -> None:
        """Fetch authorised medicine data from the CIMA REST API.

        The CIMA API provides structured medicine data including INN, brand name,
        ATC code, authorisation status, and laboratory (MAH).  We use it to
        cross-reference with IPTs and enrich the data.
        """
        # Fetch a broad set of medicines from CIMA (paginated)
        page = 1
        max_pages = 50  # CIMA returns ~25 items per page
        total_loaded = 0

        while page <= max_pages:
            try:
                resp = await client.get(
                    AEMPS_CIMA_API_URL,
                    params={"pagina": str(page)},
                    headers={"Accept": "application/json"},
                )
                if resp.status_code != 200:
                    break
                data = resp.json()
            except Exception:
                break

            # CIMA response structure: {"resultados": [...], "totalFilas": N, ...}
            results = data.get("resultados", [])
            if not results:
                break

            for med in results:
                inn = (med.get("vtm", {}).get("nombre", "") or "").lower().strip()
                if not inn:
                    # Try alternative field names
                    inn = (med.get("principiosActivos", "") or "").lower().strip()
                if inn:
                    self._cima_medicines[inn] = {
                        "nregistro": med.get("nregistro", ""),
                        "nombre": med.get("nombre", ""),
                        "inn": inn,
                        "laboratorio": med.get("labtitular", ""),
                        "estado": med.get("estado", {}).get("nombre", ""),
                        "atc": med.get("atc", {}).get("codigo", ""),
                    }

            total_loaded += len(results)
            total_rows = data.get("totalFilas", 0)

            if total_loaded >= total_rows:
                break
            page += 1

        if self._cima_medicines:
            logger.info(
                "CIMA API loaded %d authorised medicines for cross-reference",
                len(self._cima_medicines),
            )

    def _enrich_ipts_with_cima(self, items: list[dict]) -> None:
        """Enrich IPT entries with CIMA medicine data where available."""
        enriched = 0
        for ipt in items:
            title_lower = ipt.get("title", "").lower()
            # Try to match IPT drug name against CIMA INN
            for inn, cima_data in self._cima_medicines.items():
                if inn in title_lower:
                    ipt["cima_nregistro"] = cima_data.get("nregistro", "")
                    ipt["cima_nombre"] = cima_data.get("nombre", "")
                    ipt["cima_laboratorio"] = cima_data.get("laboratorio", "")
                    ipt["cima_atc"] = cima_data.get("atc", "")
                    enriched += 1
                    break

        if enriched:
            logger.info("Enriched %d IPT entries with CIMA medicine data", enriched)

    # ── Data loading helpers ──────────────────────────────────────────

    def _parse_listing_page(self, html: str) -> list[dict]:
        """Parse an AEMPS IPT listing page HTML.

        IPTs appear as links to PDF documents or individual detail pages,
        typically structured as:
          <a href="...ipt-XX-YYYY...pdf">Drug name - indication</a>
        or WordPress-style detail pages:
          <a href="...informes-de-posicionamiento-terapeutico/informe-de-...">
        or in list/table structures with IPT references and dates.
        """
        items: list[dict] = []
        seen_refs: set[str] = set()
        seen_urls: set[str] = set()

        # Pattern 1: Links to IPT PDFs or detail pages
        # Match href containing "ipt" or "posicionamiento" with title text
        ipt_links = re.findall(
            r'href="([^"]*(?:ipt|IPT|posicionamiento|informe)[^"]*)"[^>]*>\s*'
            r'(.*?)\s*</a>',
            html, re.IGNORECASE | re.DOTALL,
        )

        for url, title_raw in ipt_links:
            title = _clean_html_text(title_raw)
            if not title or len(title) < 5:
                continue

            # Skip navigation / generic links that don't contain drug-related content
            title_lower = title.lower()
            if title_lower in ("informes de posicionamiento terapéutico", "ipt", "inicio"):
                continue

            # Extract IPT reference from URL or title
            ref = _extract_ipt_reference(url) or _extract_ipt_reference(title)
            if ref and ref in seen_refs:
                continue
            if ref:
                seen_refs.add(ref)

            # Build full URL if relative
            if url and not url.startswith("http"):
                url = AEMPS_BASE_URL + (url if url.startswith("/") else "/" + url)

            # De-duplicate by URL (some pages list same IPT via both PDF and HTML links)
            if url in seen_urls:
                continue
            seen_urls.add(url)

            # Try to extract date from nearby context
            date = self._extract_date_near(html, title_raw)

            # Try to extract positioning from nearby context
            positioning = self._extract_positioning_near(html, title_raw)

            items.append({
                "reference": ref or "",
                "title": title,
                "url": url,
                "published_date": date,
                "positioning": positioning,
            })

        # Pattern 2: Table rows with IPT data
        # <td>IPT-XX/2024</td><td>Drug name</td><td>Date</td>
        if not items:
            row_pattern = re.compile(
                r'<tr[^>]*>.*?<td[^>]*>(IPT[- ]?\d+/\d{4}[^<]*)</td>'
                r'.*?<td[^>]*>(.*?)</td>'
                r'.*?<td[^>]*>(.*?)</td>'
                r'.*?</tr>',
                re.IGNORECASE | re.DOTALL,
            )
            for match in row_pattern.finditer(html):
                ref = match.group(1).strip()
                if ref in seen_refs:
                    continue
                seen_refs.add(ref)

                title = _clean_html_text(match.group(2))
                date_text = _clean_html_text(match.group(3))

                # Try to find a link in the row
                link_match = re.search(r'href="([^"]+)"', match.group(0))
                url = ""
                if link_match:
                    url = link_match.group(1)
                    if not url.startswith("http"):
                        url = AEMPS_BASE_URL + (url if url.startswith("/") else "/" + url)

                items.append({
                    "reference": ref,
                    "title": title,
                    "url": url,
                    "published_date": _parse_spanish_date(date_text),
                    "positioning": "",
                })

        # Pattern 3: WordPress block/card layouts (newer AEMPS site)
        # <div class="wp-block-..."><a href="...">Drug (IPT-XX/YYYY)</a><time>date</time></div>
        if not items:
            wp_pattern = re.compile(
                r'<a\s+href="([^"]*)"[^>]*>\s*(.*?)</a>.*?'
                r'(?:<time[^>]*>([^<]*)</time>)?',
                re.IGNORECASE | re.DOTALL,
            )
            for match in wp_pattern.finditer(html):
                url = match.group(1)
                title_raw = match.group(2)
                date_text = match.group(3) or ""

                title = _clean_html_text(title_raw)
                if not title or len(title) < 5:
                    continue

                # Check if this looks like an IPT link
                ref = _extract_ipt_reference(url) or _extract_ipt_reference(title)
                if not ref:
                    # Also check if URL contains IPT-related keywords
                    url_lower = url.lower()
                    if not any(kw in url_lower for kw in ("ipt", "posicionamiento", "informe")):
                        continue

                if ref and ref in seen_refs:
                    continue
                if ref:
                    seen_refs.add(ref)

                if url and not url.startswith("http"):
                    url = AEMPS_BASE_URL + (url if url.startswith("/") else "/" + url)

                if url in seen_urls:
                    continue
                seen_urls.add(url)

                items.append({
                    "reference": ref or "",
                    "title": title,
                    "url": url,
                    "published_date": _parse_spanish_date(date_text.strip()) if date_text else "",
                    "positioning": self._extract_positioning_near(html, title_raw),
                })

        return items

    def _extract_date_near(self, html: str, anchor_text: str) -> str:
        """Try to find a date near an IPT entry in the HTML."""
        escaped = re.escape(anchor_text[:40]) if len(anchor_text) > 40 else re.escape(anchor_text)
        match = re.search(escaped, html, re.IGNORECASE)
        if match:
            context = html[max(0, match.start() - 200):match.end() + 500]

            # Spanish date: DD de month de YYYY
            es_date = re.search(
                r'(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|'
                r'agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})',
                context, re.IGNORECASE,
            )
            if es_date:
                return _parse_spanish_date_parts(
                    es_date.group(1), es_date.group(2), es_date.group(3),
                )

            # DD/MM/YYYY
            slash_date = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', context)
            if slash_date:
                return f"{slash_date.group(3)}-{int(slash_date.group(2)):02d}-{int(slash_date.group(1)):02d}"

            # ISO: YYYY-MM-DD
            iso_date = re.search(r'(\d{4}-\d{2}-\d{2})', context)
            if iso_date:
                return iso_date.group(1)

        return ""

    def _extract_positioning_near(self, html: str, anchor_text: str) -> str:
        """Try to find a therapeutic positioning near an IPT entry."""
        escaped = re.escape(anchor_text[:40]) if len(anchor_text) > 40 else re.escape(anchor_text)
        match = re.search(escaped, html, re.IGNORECASE)
        if match:
            context = html[match.end():match.end() + 600].lower()

            for keyword in [
                "no favorable", "desfavorable",
                "favorable condicionado", "favorable con condiciones",
                "favorable",
                "pendiente",
            ]:
                if keyword in context:
                    return keyword

        return ""

    # ── File-based caching ────────────────────────────────────────────

    def load_from_file(self, data_file: Path) -> bool:
        payload = self._read_json_file(data_file)
        if not payload or not isinstance(payload.get("data"), list):
            return False
        self._ipt_list = payload["data"]
        self._loaded = bool(self._ipt_list)
        if self._loaded:
            logger.info(
                "%s loaded %d IPT entries from %s",
                self.agency_abbreviation, len(self._ipt_list), data_file,
            )
        return self._loaded

    def save_to_file(self, data_file: Path) -> None:
        if not self._loaded:
            return
        self._safe_write_json_file(data_file, self._make_envelope(self._ipt_list))
        logger.info(
            "%s saved %d IPT entries to %s",
            self.agency_abbreviation, len(self._ipt_list), data_file,
        )


def _clean_html_text(text: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&aacute;", "\u00e1", text)
    text = re.sub(r"&eacute;", "\u00e9", text)
    text = re.sub(r"&iacute;", "\u00ed", text)
    text = re.sub(r"&oacute;", "\u00f3", text)
    text = re.sub(r"&uacute;", "\u00fa", text)
    text = re.sub(r"&ntilde;", "\u00f1", text)
    text = re.sub(r"&#\d+;", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_ipt_reference(text: str) -> str:
    """Extract an IPT reference like 'IPT-23/2024' or 'IPT 23/2024' from text."""
    match = re.search(r"(IPT[- ]?\d+/\d{4}(?:v\d+)?)", text, re.IGNORECASE)
    if match:
        return match.group(1).upper().replace(" ", "-")
    return ""


def _parse_spanish_date(text: str) -> str:
    """Try to parse various Spanish date formats to YYYY-MM-DD."""
    text = text.strip()
    if not text:
        return ""

    # DD de month de YYYY
    match = re.search(
        r'(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})', text, re.IGNORECASE,
    )
    if match:
        return _parse_spanish_date_parts(match.group(1), match.group(2), match.group(3))

    # DD/MM/YYYY
    match = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if match:
        return f"{match.group(3)}-{int(match.group(2)):02d}-{int(match.group(1)):02d}"

    # Already ISO
    if re.match(r'\d{4}-\d{2}-\d{2}', text):
        return text[:10]

    return text


def _parse_spanish_date_parts(day: str, month_name: str, year: str) -> str:
    """Convert Spanish 'DD de month de YYYY' to 'YYYY-MM-DD'."""
    months = {
        "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
        "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
        "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
    }
    month = months.get(month_name.lower(), "01")
    return f"{year}-{month}-{int(day):02d}"


def _normalize_positioning(raw: str) -> str:
    """Normalize a positioning string to a standard display value."""
    if not raw:
        return ""
    lower = raw.lower().strip()
    # Check longer patterns first
    sorted_keywords = sorted(POSITIONING_DISPLAY.keys(), key=len, reverse=True)
    for keyword in sorted_keywords:
        if keyword in lower:
            return POSITIONING_DISPLAY[keyword]
    return raw.strip().capitalize()


def _normalize_aemps_url(url: str, ipt_reference: str = "") -> str:
    """Normalize an AEMPS IPT URL to the current website format.

    The AEMPS website has migrated PDF locations over time.  Older URLs
    like ``/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-…``
    may no longer resolve.  Current IPT PDFs are served from
    ``/medicamentosUsoHumano/informesPublicos/docs/{year}/IPT-NNN-drug.pdf``.

    If the original URL appears broken (old path pattern), we attempt to
    build a working search URL on the AEMPS website using the IPT reference
    so the user can locate the document.
    """
    if not url:
        # If no URL but we have a reference, build a search link
        if ipt_reference:
            return _build_aemps_search_url(ipt_reference)
        return ""

    # http → https
    if url.startswith("http://"):
        url = "https://" + url[7:]

    # URLs pointing to the actual PDF under the new path are already correct
    if "/medicamentosUsoHumano/informesPublicos/" in url:
        return url

    # Old-style WordPress slug URLs that likely don't resolve to PDFs anymore.
    # These look like:
    #   /medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-XXX-...
    # Try to extract IPT ref from the URL and build the current-style URL.
    old_path = "/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/"
    if old_path in url and url.endswith(".pdf"):
        # Extract the slug from the old URL
        slug = url.rsplit("/", 1)[-1]  # e.g. "ipt-1-2013-esbriet-fpi.pdf"
        # Try to build the new-style URL
        ref_match = re.search(r"ipt[- ]?(\d+)[- ](\d{4})", slug, re.IGNORECASE)
        if ref_match:
            ipt_num = ref_match.group(1)
            year = ref_match.group(2)
            # Construct new-style path: convert slug separators to match
            # the current AEMPS pattern (IPT-NNN-drug-name.pdf)
            new_slug = re.sub(r"^ipt[- ]?", "IPT-", slug, flags=re.IGNORECASE)
            new_url = (
                f"https://www.aemps.gob.es/medicamentosUsoHumano/"
                f"informesPublicos/docs/{year}/{new_slug}"
            )
            return new_url

    return url


def _build_aemps_search_url(ipt_reference: str) -> str:
    """Build an AEMPS search URL from an IPT reference like 'IPT-23/2024'."""
    # Point to the AEMPS IPT tag page which lists all IPTs
    return "https://www.aemps.gob.es/tag/ipt/"
