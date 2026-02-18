"""Spain AEMPS (Agencia Española de Medicamentos y Productos Sanitarios) adapter.

Data source: AEMPS Informes de Posicionamiento Terapéutico (IPT) listing page.
IPTs are therapeutic positioning reports that evaluate new medicines and provide
recommendations on their place in therapy relative to existing alternatives.

The listing page is a public HTML page on the AEMPS website.  Each IPT entry
contains the drug name, indication, date, and a link to the full PDF report.

No authentication required.
"""

import logging
import re

import httpx

from app.config import AEMPS_BASE_URL, AEMPS_IPT_LISTING_URL, AEMPS_MAX_PAGES, REQUEST_TIMEOUT
from app.models import AssessmentResult
from app.services.hta_agencies.base import HTAAgency

logger = logging.getLogger(__name__)

# Therapeutic positioning outcomes → English display values
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
        """Fetch and parse the AEMPS IPT listing page(s)."""
        all_items: list[dict] = []

        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            },
        ) as client:
            for page in range(1, AEMPS_MAX_PAGES + 1):
                try:
                    url = AEMPS_IPT_LISTING_URL
                    params = {"pg": str(page)} if page > 1 else {}
                    resp = await client.get(url, params=params)
                    resp.raise_for_status()
                    html = resp.text
                except Exception:
                    logger.warning("Failed to fetch AEMPS IPT listing page %d", page)
                    break

                items = self._parse_listing_page(html)
                if not items:
                    break

                all_items.extend(items)
                logger.debug("AEMPS IPT page %d: %d items", page, len(items))

        self._ipt_list = all_items
        self._loaded = True
        logger.info("Spain AEMPS data loaded: %d IPT entries", len(self._ipt_list))

    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Find AEMPS IPTs matching the given substance or product."""
        if not self._loaded:
            return []

        substance_lower = active_substance.lower().strip()
        product_lower = product_name.lower().strip() if product_name else ""

        results = []
        for ipt in self._ipt_list:
            title_lower = ipt.get("title", "").lower()

            substance_match = substance_lower in title_lower
            product_match = product_lower and product_lower in title_lower

            if not substance_match and not product_match:
                continue

            positioning = ipt.get("positioning", "")
            pos_display = _normalize_positioning(positioning)

            results.append(
                AssessmentResult(
                    product_name=product_name or active_substance,
                    evaluation_reason=ipt.get("title", ""),
                    opinion_date=ipt.get("published_date", ""),
                    assessment_url=ipt.get("url", ""),
                    ipt_reference=ipt.get("reference", ""),
                    therapeutic_positioning=pos_display,
                )
            )

        # Sort most recent first
        results.sort(key=lambda r: r.opinion_date, reverse=True)
        return results

    # ── Data loading helpers ──────────────────────────────────────────

    def _parse_listing_page(self, html: str) -> list[dict]:
        """Parse an AEMPS IPT listing page HTML.

        IPTs appear as links to PDF documents, typically structured as:
          <a href="...ipt-XX-YYYY...pdf">Drug name - indication</a>
        or in list/table structures with IPT references and dates.
        """
        items: list[dict] = []
        seen_refs: set[str] = set()

        # Pattern 1: Links to IPT PDFs or detail pages
        # Match href containing "ipt" with title text
        ipt_links = re.findall(
            r'href="([^"]*(?:ipt|IPT|posicionamiento)[^"]*)"[^>]*>\s*'
            r'(.*?)\s*</a>',
            html, re.IGNORECASE | re.DOTALL,
        )

        for url, title_raw in ipt_links:
            title = _clean_html_text(title_raw)
            if not title or len(title) < 5:
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


def _clean_html_text(text: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&aacute;", "á", text)
    text = re.sub(r"&eacute;", "é", text)
    text = re.sub(r"&iacute;", "í", text)
    text = re.sub(r"&oacute;", "ó", text)
    text = re.sub(r"&uacute;", "ú", text)
    text = re.sub(r"&ntilde;", "ñ", text)
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
