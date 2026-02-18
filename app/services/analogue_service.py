"""Analogue selection service.

Uses EMA medicine data to find analogues for a given therapy based on
configurable filters: therapeutic area, orphan status, years since
approval, first approval, authorisation status, ATC code, marketing
authorisation holder, regulatory pathway flags, and prevalence category.
"""

import logging
import re
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# ATC Level 1 anatomical main groups
ATC_LEVEL1 = {
    "A": "Alimentary tract and metabolism",
    "B": "Blood and blood forming organs",
    "C": "Cardiovascular system",
    "D": "Dermatologicals",
    "G": "Genito-urinary system and sex hormones",
    "H": "Systemic hormonal preparations",
    "J": "Anti-infectives for systemic use",
    "L": "Antineoplastic and immunomodulating agents",
    "M": "Musculo-skeletal system",
    "N": "Nervous system",
    "P": "Antiparasitic products, insecticides",
    "R": "Respiratory system",
    "S": "Sensory organs",
    "V": "Various",
}

# Keywords suggesting ultra-rare conditions (prevalence < 1 in 50,000)
_ULTRA_RARE_KEYWORDS = [
    "ultra-rare", "ultra rare",
    "spinal muscular atrophy", "sma type",
    "duchenne", "haemophilia", "hemophilia",
    "huntington", "cystic fibrosis",
    "beta-thalassaemia", "thalassemia",
    "batten disease", "fabry", "gaucher", "pompe",
    "mucopolysaccharidos", "mps i", "mps ii",
    "phenylketonuria", "pku",
    "retinal dystrophy", "leber",
]

# Keywords suggesting rare conditions (prevalence < 5 in 10,000)
_RARE_KEYWORDS = [
    "rare", "orphan",
    "amyotrophic lateral sclerosis", "als",
    "multiple sclerosis",
    "pulmonary arterial hypertension", "pah",
    "idiopathic pulmonary fibrosis",
    "systemic lupus erythematosus",
    "myasthenia gravis",
    "sickle cell", "sickle-cell",
    "narcolepsy", "acromegaly",
    "glioblastoma", "glioma",
    "acute lymphoblastic",
    "acute myeloid",
    "chronic lymphocytic",
    "mantle cell lymphoma",
    "follicular lymphoma",
    "hodgkin",
    "myelofibrosis",
    "myelodysplastic",
    "neuroblastoma", "retinoblastoma",
    "mesothelioma",
    "cholangiocarcinoma",
    "hepatocellular carcinoma",
    "pancreatic",
    "oesophageal", "esophageal",
    "gastric cancer",
    "ovarian",
    "endometrial",
    "soft tissue sarcoma", "osteosarcoma",
]


def _classify_prevalence(orphan: bool, indication: str) -> str:
    """Classify a medicine's target indication prevalence.

    Uses orphan status and indication text keywords as proxies.
    Returns: 'ultra-rare', 'rare', or 'non-rare'.
    """
    ind_lower = indication.lower()

    if orphan:
        for kw in _ULTRA_RARE_KEYWORDS:
            if kw in ind_lower:
                return "ultra-rare"
        return "rare"

    # Some non-orphan drugs target relatively rare conditions
    for kw in _ULTRA_RARE_KEYWORDS:
        if kw in ind_lower:
            return "ultra-rare"
    for kw in _RARE_KEYWORDS:
        if kw in ind_lower:
            return "rare"

    return "non-rare"


class AnalogueService:
    """Finds analogue medicines from EMA data using multi-criteria filters."""

    def __init__(self) -> None:
        self._medicines: list[dict] = []
        self._first_approval_dates: dict[str, str] = {}
        self._therapeutic_areas: list[str] = []
        self._mahs: list[str] = []
        self._atc_prefixes: list[str] = []
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_from_ema(self, raw_medicines: list[dict]) -> None:
        """Enrich and index EMA medicine records for analogue filtering."""
        enriched: list[dict] = []
        substance_dates: dict[str, list[str]] = {}
        area_set: set[str] = set()
        mah_set: set[str] = set()
        atc_set: set[str] = set()

        for med in raw_medicines:
            name = _get_str(med, "medicineName", "name_of_medicine", "medicine_name")
            substance = _get_str(
                med, "activeSubstance", "active_substance",
                "inn_common_name", "internationalNonProprietaryNameINN",
            )
            indication = _get_str(
                med, "therapeuticIndication", "therapeutic_indication",
                "condition_indication",
            )
            status = _get_str(
                med, "authorisationStatus", "authorisation_status",
                "marketing_authorisation_status",
            )
            ema_number = _get_str(
                med, "emaNumber", "ema_product_number", "product_number",
            )
            therapeutic_area = _get_str(
                med, "condition", "therapeutic_area",
                "therapeuticArea", "therapeutic_area_mesh",
            )
            url = _get_str(med, "url", "product_page_url", "ema_url")

            # Orphan status
            orphan_raw = _get_str(
                med, "orphanMedicine", "orphan_medicine",
                "orphan_designation", "orphan",
            ).lower()
            orphan = orphan_raw in ("yes", "true", "1", "orphan")

            # Authorisation date
            auth_date = _get_str(
                med, "authorisationDate", "marketing_authorisation_date",
                "first_published", "initial_authorisation_date",
                "marketingAuthorisationDate",
            )
            auth_date = _normalize_date(auth_date)

            # Generic / biosimilar
            generic_raw = _get_str(
                med, "generic", "genericMedicine", "generic_medicine",
            ).lower()
            biosimilar_raw = _get_str(
                med, "biosimilar", "biosimilarMedicine", "biosimilar_medicine",
            ).lower()
            is_generic = generic_raw in ("yes", "true", "1")
            is_biosimilar = biosimilar_raw in ("yes", "true", "1")

            # ATC code
            atc_code = _get_str(med, "atcCode", "atc_code", "ATC_code")

            # Marketing authorisation holder (company)
            mah = _get_str(
                med, "marketingAuthorisationHolder",
                "marketing_authorisation_holder_company_name",
                "marketing_authorisation_holder", "mah",
            )

            # Regulatory pathway flags
            conditional_raw = _get_str(
                med, "conditionalApproval", "conditional_approval",
                "conditional", "conditionalMA",
            ).lower()
            conditional = conditional_raw in ("yes", "true", "1")

            exceptional_raw = _get_str(
                med, "exceptionalCircumstances", "exceptional_circumstances",
                "exceptional",
            ).lower()
            exceptional = exceptional_raw in ("yes", "true", "1")

            accelerated_raw = _get_str(
                med, "acceleratedAssessment", "accelerated_assessment",
                "accelerated",
            ).lower()
            accelerated = accelerated_raw in ("yes", "true", "1")

            new_substance_raw = _get_str(
                med, "newActiveSubstance", "new_active_substance",
                "novel_active_substance", "activeSubstanceNew",
            ).lower()
            new_active_substance = new_substance_raw in ("yes", "true", "1")

            additional_monitoring_raw = _get_str(
                med, "additionalMonitoring", "additional_monitoring",
                "blackTriangle", "black_triangle",
            ).lower()
            additional_monitoring = additional_monitoring_raw in ("yes", "true", "1")

            # Medicine type / legal basis
            medicine_type = _get_str(
                med, "medicineType", "medicine_type", "product_type",
                "productGroup", "product_group",
            )

            # Prevalence category (derived from orphan + indication text)
            prevalence = _classify_prevalence(orphan, indication)

            # Track therapeutic areas
            if therapeutic_area:
                for area in re.split(r"[;,]", therapeutic_area):
                    area = area.strip()
                    if area:
                        area_set.add(area)

            # Track MAHs
            if mah:
                mah_set.add(mah)

            # Track ATC Level 1+2 codes (e.g. "L01" from "L01FF02")
            if atc_code and len(atc_code) >= 3:
                prefix = atc_code[:3].upper()
                atc_set.add(prefix)

            # Track first approval per substance
            substance_key = substance.lower().strip()
            if substance_key and auth_date:
                substance_dates.setdefault(substance_key, []).append(auth_date)

            record = {
                "name": name,
                "active_substance": substance,
                "therapeutic_indication": indication,
                "authorisation_status": status,
                "ema_number": ema_number,
                "therapeutic_area": therapeutic_area,
                "orphan_medicine": orphan,
                "authorisation_date": auth_date,
                "url": url,
                "generic": is_generic,
                "biosimilar": is_biosimilar,
                "atc_code": atc_code,
                "marketing_authorisation_holder": mah,
                "conditional_approval": conditional,
                "exceptional_circumstances": exceptional,
                "accelerated_assessment": accelerated,
                "new_active_substance": new_active_substance,
                "additional_monitoring": additional_monitoring,
                "medicine_type": medicine_type,
                "prevalence_category": prevalence,
            }
            enriched.append(record)

        # Compute first approval dates per substance
        for subst, dates in substance_dates.items():
            sorted_dates = sorted(d for d in dates if d)
            if sorted_dates:
                self._first_approval_dates[subst] = sorted_dates[0]

        # Mark first_approval flag on each record
        for rec in enriched:
            subst_key = rec["active_substance"].lower().strip()
            first_date = self._first_approval_dates.get(subst_key, "")
            rec["first_approval"] = (
                bool(rec["authorisation_date"])
                and rec["authorisation_date"] == first_date
            )

        self._medicines = enriched
        self._therapeutic_areas = sorted(area_set)
        self._mahs = sorted(mah_set)
        self._atc_prefixes = sorted(atc_set)
        self._loaded = True
        logger.info(
            "Analogue service loaded: %d medicines, %d therapeutic areas, "
            "%d MAHs, %d ATC prefixes",
            len(self._medicines), len(self._therapeutic_areas),
            len(self._mahs), len(self._atc_prefixes),
        )

    def get_therapeutic_areas(self) -> list[str]:
        return self._therapeutic_areas

    def get_filter_options(self) -> dict:
        """Return all available filter options for the frontend."""
        statuses: set[str] = set()
        for med in self._medicines:
            if med["authorisation_status"]:
                statuses.add(med["authorisation_status"])

        return {
            "therapeutic_areas": self._therapeutic_areas,
            "year_ranges": [
                {"label": "Last 3 years", "value": 3},
                {"label": "Last 5 years", "value": 5},
                {"label": "Last 10 years", "value": 10},
                {"label": "Last 15 years", "value": 15},
                {"label": "All time", "value": 0},
            ],
            "statuses": sorted(statuses),
            "mahs": self._mahs,
            "atc_prefixes": [
                {"code": code, "label": f"{code} — {ATC_LEVEL1.get(code[0], '')}"}
                for code in self._atc_prefixes
            ],
            "prevalence_categories": ["ultra-rare", "rare", "non-rare"],
        }

    def search(
        self,
        therapeutic_area: str = "",
        orphan: str = "",
        years_since_approval: int = 0,
        first_approval: str = "",
        status: str = "",
        substance: str = "",
        name: str = "",
        exclude_generics: bool = False,
        exclude_biosimilars: bool = False,
        atc_code: str = "",
        mah: str = "",
        conditional_approval: str = "",
        exceptional_circumstances: str = "",
        accelerated_assessment: str = "",
        new_active_substance: str = "",
        additional_monitoring: str = "",
        prevalence_category: str = "",
        indication_keyword: str = "",
        limit: int = 200,
    ) -> list[dict]:
        """Search for analogue medicines matching the given filters."""
        if not self._loaded:
            return []

        cutoff_date = ""
        if years_since_approval > 0:
            cutoff = date.today() - timedelta(days=years_since_approval * 365)
            cutoff_date = cutoff.isoformat()

        results = []
        area_lower = therapeutic_area.lower().strip()
        status_lower = status.lower().strip()
        substance_lower = substance.lower().strip()
        name_lower = name.lower().strip()
        atc_lower = atc_code.lower().strip()
        mah_lower = mah.lower().strip()
        prevalence_lower = prevalence_category.lower().strip()
        keyword_lower = indication_keyword.lower().strip()

        for med in self._medicines:
            # Filter: therapeutic area
            if area_lower and area_lower not in med["therapeutic_area"].lower():
                continue

            # Filter: orphan status
            if orphan == "yes" and not med["orphan_medicine"]:
                continue
            if orphan == "no" and med["orphan_medicine"]:
                continue

            # Filter: years since approval
            if cutoff_date:
                if not med["authorisation_date"] or med["authorisation_date"] < cutoff_date:
                    continue

            # Filter: first approval
            if first_approval == "yes" and not med["first_approval"]:
                continue
            if first_approval == "no" and med["first_approval"]:
                continue

            # Filter: authorisation status
            if status_lower and med["authorisation_status"].lower() != status_lower:
                continue

            # Filter: substance name (partial match)
            if substance_lower and substance_lower not in med["active_substance"].lower():
                continue

            # Filter: medicine name (partial match)
            if name_lower and name_lower not in med["name"].lower():
                continue

            # Filter: exclude generics
            if exclude_generics and med["generic"]:
                continue

            # Filter: exclude biosimilars
            if exclude_biosimilars and med["biosimilar"]:
                continue

            # Filter: ATC code (prefix match)
            if atc_lower and not med["atc_code"].lower().startswith(atc_lower):
                continue

            # Filter: MAH / company (partial match)
            if mah_lower and mah_lower not in med["marketing_authorisation_holder"].lower():
                continue

            # Filter: conditional approval
            if conditional_approval == "yes" and not med["conditional_approval"]:
                continue
            if conditional_approval == "no" and med["conditional_approval"]:
                continue

            # Filter: exceptional circumstances
            if exceptional_circumstances == "yes" and not med["exceptional_circumstances"]:
                continue
            if exceptional_circumstances == "no" and med["exceptional_circumstances"]:
                continue

            # Filter: accelerated assessment
            if accelerated_assessment == "yes" and not med["accelerated_assessment"]:
                continue
            if accelerated_assessment == "no" and med["accelerated_assessment"]:
                continue

            # Filter: new active substance
            if new_active_substance == "yes" and not med["new_active_substance"]:
                continue
            if new_active_substance == "no" and med["new_active_substance"]:
                continue

            # Filter: additional monitoring (black triangle)
            if additional_monitoring == "yes" and not med["additional_monitoring"]:
                continue
            if additional_monitoring == "no" and med["additional_monitoring"]:
                continue

            # Filter: prevalence category
            if prevalence_lower and med["prevalence_category"] != prevalence_lower:
                continue

            # Filter: indication keyword search
            if keyword_lower and keyword_lower not in med["therapeutic_indication"].lower():
                continue

            results.append(med)

        results.sort(key=lambda r: r.get("authorisation_date", ""), reverse=True)
        return results[:limit]


def _get_str(data: dict, *keys: str) -> str:
    """Try multiple possible key names, return first non-empty value."""
    for key in keys:
        val = data.get(key)
        if val is not None:
            return str(val).strip()
    return ""


def _normalize_date(raw: str) -> str:
    """Normalize various date formats to YYYY-MM-DD."""
    raw = raw.strip()
    if not raw:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw
    if re.match(r"^\d{8}$", raw):
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    m = re.match(r"^(\d{1,2})[./](\d{1,2})[./](\d{4})$", raw)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    m = re.match(r"^(\d{4}-\d{2}-\d{2})T", raw)
    if m:
        return m.group(1)
    m = re.match(r"^(\d{4})$", raw)
    if m:
        return f"{raw}-01-01"
    return raw
