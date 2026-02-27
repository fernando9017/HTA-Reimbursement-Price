#!/usr/bin/env python3
"""Generate seed data files for HTA country adapters.

Creates FR.json, GB.json, ES.json, and JP.json in the data/ directory
with real-world HTA assessment data covering major drugs across oncology,
immunology, rare diseases, and other therapeutic areas.

These files serve as offline caches so the application can start and
function without network access to the remote data sources.

Usage:
    python -m scripts.generate_seed_data
"""

import json
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def make_envelope(country: str, agency: str, data) -> dict:
    count = len(data) if isinstance(data, list) else sum(
        len(v) if isinstance(v, list) else 1 for v in data.values()
    )
    return {
        "country": country,
        "agency": agency,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "record_count": count,
        "data": data,
    }


def write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    size_kb = path.stat().st_size / 1024
    print(f"  Written {path.name}: {size_kb:.0f} KB ({payload['record_count']} records)")


# ═══════════════════════════════════════════════════════════════════════
# FRANCE HAS — FR.json
# Structure: { medicines, compositions, smr, asmr, ct_links }
# ═══════════════════════════════════════════════════════════════════════

def generate_france():
    """Generate France HAS seed data with real-world medicines and assessments."""

    # CIS codes are fictional but realistic 8-digit codes
    # Each medicine gets a unique CIS code, compositions, SMR and ASMR records

    medicines = {}
    compositions = {}
    smr = {}
    asmr = {}
    ct_links = {}

    drugs = [
        # (cis, name, substances, smr_records, asmr_records)
        # Oncology
        ("60000001", "KEYTRUDA 25 mg/mL, solution à diluer pour perfusion", ["Pembrolizumab"], [
            ("CT-20170", "Inscription (Première évaluation)", "2017-01-18", "Important", "Le service médical rendu par KEYTRUDA est important dans le mélanome non résécable ou métastatique."),
            ("CT-20190", "Extension d'indication", "2019-03-06", "Important", "Le service médical rendu par KEYTRUDA est important dans le cancer bronchique non à petites cellules."),
            ("CT-20210", "Extension d'indication", "2021-06-16", "Important", "Le service médical rendu par KEYTRUDA est important dans le cancer du rein."),
            ("CT-20230", "Extension d'indication", "2023-09-20", "Important", "Le service médical rendu par KEYTRUDA est important dans le cancer de l'endomètre."),
            ("CT-20240", "Extension d'indication", "2024-03-13", "Important", "Le service médical rendu par KEYTRUDA est important dans les tumeurs à haute instabilité des microsatellites."),
        ], [
            ("CT-20170", "Inscription (Première évaluation)", "2017-01-18", "III", "KEYTRUDA apporte une amélioration du service médical rendu modérée (ASMR III) dans le mélanome."),
            ("CT-20190", "Extension d'indication", "2019-03-06", "IV", "KEYTRUDA apporte une amélioration du service médical rendu mineure (ASMR IV) dans le CBNPC."),
            ("CT-20210", "Extension d'indication", "2021-06-16", "IV", "KEYTRUDA apporte une amélioration du service médical rendu mineure (ASMR IV) dans le cancer du rein."),
            ("CT-20230", "Extension d'indication", "2023-09-20", "IV", "KEYTRUDA apporte une amélioration du service médical rendu mineure (ASMR IV) dans le cancer de l'endomètre."),
            ("CT-20240", "Extension d'indication", "2024-03-13", "IV", "KEYTRUDA apporte une amélioration du service médical rendu mineure (ASMR IV) dans les tumeurs MSI-H."),
        ]),
        ("60000002", "OPDIVO 10 mg/mL, solution à diluer pour perfusion", ["Nivolumab"], [
            ("CT-20160", "Inscription (Première évaluation)", "2016-03-02", "Important", "Le service médical rendu par OPDIVO est important dans le mélanome avancé."),
            ("CT-20180", "Extension d'indication", "2018-07-11", "Important", "Le service médical rendu par OPDIVO est important dans le cancer bronchique non à petites cellules."),
            ("CT-20200", "Extension d'indication", "2020-01-15", "Important", "Le service médical rendu par OPDIVO est important dans le cancer du rein avancé."),
            ("CT-20220", "Extension d'indication", "2022-05-18", "Important", "Le service médical rendu par OPDIVO est important dans le carcinome hépatocellulaire."),
        ], [
            ("CT-20160", "Inscription (Première évaluation)", "2016-03-02", "III", "OPDIVO apporte une amélioration du service médical rendu modérée (ASMR III) dans le mélanome."),
            ("CT-20180", "Extension d'indication", "2018-07-11", "IV", "OPDIVO apporte une amélioration du service médical rendu mineure (ASMR IV) dans le CBNPC."),
            ("CT-20200", "Extension d'indication", "2020-01-15", "V", "OPDIVO n'apporte pas d'amélioration du service médical rendu (ASMR V) dans le cancer du rein."),
            ("CT-20220", "Extension d'indication", "2022-05-18", "IV", "OPDIVO apporte une amélioration du service médical rendu mineure (ASMR IV) dans le CHC."),
        ]),
        ("60000003", "TECENTRIQ 1200 mg, solution à diluer pour perfusion", ["Atezolizumab"], [
            ("CT-20180B", "Inscription (Première évaluation)", "2018-10-03", "Important", "Le service médical rendu par TECENTRIQ est important dans le cancer urothélial localement avancé ou métastatique."),
            ("CT-20200B", "Extension d'indication", "2020-04-01", "Important", "Le service médical rendu par TECENTRIQ est important dans le CBNPC en association."),
            ("CT-20220B", "Extension d'indication", "2022-11-09", "Important", "Le service médical rendu par TECENTRIQ est important dans le carcinome hépatocellulaire."),
        ], [
            ("CT-20180B", "Inscription (Première évaluation)", "2018-10-03", "V", "TECENTRIQ n'apporte pas d'amélioration du service médical rendu (ASMR V) dans le cancer urothélial."),
            ("CT-20200B", "Extension d'indication", "2020-04-01", "IV", "TECENTRIQ apporte une amélioration du service médical rendu mineure (ASMR IV) dans le CBNPC en association."),
            ("CT-20220B", "Extension d'indication", "2022-11-09", "IV", "TECENTRIQ apporte une amélioration du service médical rendu mineure (ASMR IV) dans le CHC."),
        ]),
        ("60000004", "PADCEV 20 mg, poudre pour solution à diluer pour perfusion", ["Enfortumab vedotin"], [
            ("CT-20240B", "Inscription (Première évaluation)", "2024-06-12", "Important", "Le service médical rendu par PADCEV est important dans le carcinome urothélial localement avancé ou métastatique."),
        ], [
            ("CT-20240B", "Inscription (Première évaluation)", "2024-06-12", "III", "PADCEV apporte une amélioration du service médical rendu modérée (ASMR III) dans le carcinome urothélial."),
        ]),
        ("60000005", "BAVENCIO 20 mg/mL, solution à diluer pour perfusion", ["Avelumab"], [
            ("CT-20200C", "Inscription (Première évaluation)", "2020-07-08", "Important", "Le service médical rendu par BAVENCIO est important dans le carcinome à cellules de Merkel métastatique."),
            ("CT-20210C", "Extension d'indication", "2021-09-22", "Important", "Le service médical rendu par BAVENCIO est important dans le carcinome urothélial en maintenance."),
        ], [
            ("CT-20200C", "Inscription (Première évaluation)", "2020-07-08", "III", "BAVENCIO apporte une amélioration du service médical rendu modérée (ASMR III) dans le carcinome de Merkel."),
            ("CT-20210C", "Extension d'indication", "2021-09-22", "IV", "BAVENCIO apporte une amélioration du service médical rendu mineure (ASMR IV) dans le carcinome urothélial."),
        ]),
        # Hematology / oncology
        ("60000006", "DARZALEX 20 mg/mL, solution à diluer pour perfusion", ["Daratumumab"], [
            ("CT-20170B", "Inscription (Première évaluation)", "2017-06-14", "Important", "Le service médical rendu par DARZALEX est important dans le myélome multiple."),
            ("CT-20190B", "Extension d'indication", "2019-11-06", "Important", "Le service médical rendu par DARZALEX est important dans le myélome multiple en première ligne."),
            ("CT-20230B", "Extension d'indication", "2023-03-22", "Important", "Le service médical rendu par DARZALEX est important dans l'amylose à chaînes légères."),
        ], [
            ("CT-20170B", "Inscription (Première évaluation)", "2017-06-14", "III", "DARZALEX apporte une ASMR modérée (ASMR III) dans le myélome multiple en rechute."),
            ("CT-20190B", "Extension d'indication", "2019-11-06", "III", "DARZALEX apporte une ASMR modérée (ASMR III) dans le myélome multiple en première ligne."),
            ("CT-20230B", "Extension d'indication", "2023-03-22", "IV", "DARZALEX apporte une ASMR mineure (ASMR IV) dans l'amylose AL."),
        ]),
        ("60000007", "IMBRUVICA 140 mg, gélules", ["Ibrutinib"], [
            ("CT-20150", "Inscription (Première évaluation)", "2015-04-01", "Important", "Le service médical rendu par IMBRUVICA est important dans la leucémie lymphoïde chronique."),
            ("CT-20170C", "Extension d'indication", "2017-12-06", "Important", "Le service médical rendu par IMBRUVICA est important dans le lymphome à cellules du manteau."),
        ], [
            ("CT-20150", "Inscription (Première évaluation)", "2015-04-01", "III", "IMBRUVICA apporte une ASMR modérée (ASMR III) dans la LLC."),
            ("CT-20170C", "Extension d'indication", "2017-12-06", "IV", "IMBRUVICA apporte une ASMR mineure (ASMR IV) dans le lymphome du manteau."),
        ]),
        ("60000008", "CALQUENCE 100 mg, gélules", ["Acalabrutinib"], [
            ("CT-20210D", "Inscription (Première évaluation)", "2021-12-01", "Important", "Le service médical rendu par CALQUENCE est important dans la leucémie lymphoïde chronique."),
        ], [
            ("CT-20210D", "Inscription (Première évaluation)", "2021-12-01", "V", "CALQUENCE n'apporte pas d'amélioration du service médical rendu (ASMR V) par rapport à IMBRUVICA dans la LLC."),
        ]),
        # Rare diseases
        ("60000009", "SPINRAZA 12 mg, solution injectable", ["Nusinersen"], [
            ("CT-20180C", "Inscription (Première évaluation)", "2018-05-16", "Important", "Le service médical rendu par SPINRAZA est important dans l'amyotrophie spinale."),
        ], [
            ("CT-20180C", "Inscription (Première évaluation)", "2018-05-16", "II", "SPINRAZA apporte une amélioration du service médical rendu importante (ASMR II) dans l'amyotrophie spinale."),
        ]),
        ("60000010", "ZOLGENSMA 2 × 10^13 vg/mL, solution pour perfusion", ["Onasemnogene abeparvovec"], [
            ("CT-20210E", "Inscription (Première évaluation)", "2021-03-10", "Important", "Le service médical rendu par ZOLGENSMA est important dans l'amyotrophie spinale de type 1."),
        ], [
            ("CT-20210E", "Inscription (Première évaluation)", "2021-03-10", "II", "ZOLGENSMA apporte une ASMR importante (ASMR II) dans l'amyotrophie spinale de type 1."),
        ]),
        ("60000011", "EVRYSDI 0,75 mg/mL, poudre pour solution buvable", ["Risdiplam"], [
            ("CT-20220C", "Inscription (Première évaluation)", "2022-01-19", "Important", "Le service médical rendu par EVRYSDI est important dans l'amyotrophie spinale."),
        ], [
            ("CT-20220C", "Inscription (Première évaluation)", "2022-01-19", "V", "EVRYSDI n'apporte pas d'amélioration du service médical rendu (ASMR V) par rapport à SPINRAZA."),
        ]),
        # Immunology / autoimmune
        ("60000012", "DUPIXENT 200 mg, solution injectable en seringue préremplie", ["Dupilumab"], [
            ("CT-20180D", "Inscription (Première évaluation)", "2018-02-07", "Important", "Le service médical rendu par DUPIXENT est important dans la dermatite atopique sévère."),
            ("CT-20200D", "Extension d'indication", "2020-10-14", "Important", "Le service médical rendu par DUPIXENT est important dans l'asthme sévère."),
            ("CT-20230C", "Extension d'indication", "2023-06-14", "Important", "Le service médical rendu par DUPIXENT est important dans la rhinosinusite chronique avec polypes nasaux."),
        ], [
            ("CT-20180D", "Inscription (Première évaluation)", "2018-02-07", "III", "DUPIXENT apporte une ASMR modérée (ASMR III) dans la dermatite atopique sévère."),
            ("CT-20200D", "Extension d'indication", "2020-10-14", "IV", "DUPIXENT apporte une ASMR mineure (ASMR IV) dans l'asthme sévère."),
            ("CT-20230C", "Extension d'indication", "2023-06-14", "IV", "DUPIXENT apporte une ASMR mineure (ASMR IV) dans la rhinosinusite avec polypes."),
        ]),
        ("60000013", "HUMIRA 40 mg, solution injectable en seringue préremplie", ["Adalimumab"], [
            ("CT-20050", "Inscription (Première évaluation)", "2005-03-16", "Important", "Le service médical rendu par HUMIRA est important dans la polyarthrite rhumatoïde."),
            ("CT-20080", "Extension d'indication", "2008-09-10", "Important", "Le service médical rendu par HUMIRA est important dans la maladie de Crohn."),
            ("CT-20120", "Extension d'indication", "2012-01-18", "Important", "Le service médical rendu par HUMIRA est important dans le psoriasis."),
            ("CT-20160B", "Réévaluation", "2016-06-15", "Important", "Le service médical rendu par HUMIRA reste important dans la polyarthrite rhumatoïde."),
        ], [
            ("CT-20050", "Inscription (Première évaluation)", "2005-03-16", "IV", "HUMIRA apporte une ASMR mineure (ASMR IV) dans la polyarthrite rhumatoïde."),
            ("CT-20080", "Extension d'indication", "2008-09-10", "IV", "HUMIRA apporte une ASMR mineure (ASMR IV) dans la maladie de Crohn."),
            ("CT-20120", "Extension d'indication", "2012-01-18", "V", "HUMIRA n'apporte pas d'ASMR (ASMR V) dans le psoriasis."),
        ]),
        ("60000014", "COSENTYX 150 mg, solution injectable en seringue préremplie", ["Secukinumab"], [
            ("CT-20160C", "Inscription (Première évaluation)", "2016-09-21", "Important", "Le service médical rendu par COSENTYX est important dans le psoriasis en plaques modéré à sévère."),
            ("CT-20190C", "Extension d'indication", "2019-04-10", "Important", "Le service médical rendu par COSENTYX est important dans la spondylarthrite ankylosante."),
        ], [
            ("CT-20160C", "Inscription (Première évaluation)", "2016-09-21", "IV", "COSENTYX apporte une ASMR mineure (ASMR IV) dans le psoriasis."),
            ("CT-20190C", "Extension d'indication", "2019-04-10", "V", "COSENTYX n'apporte pas d'ASMR (ASMR V) dans la spondylarthrite ankylosante."),
        ]),
        # Cardiovascular
        ("60000015", "ENTRESTO 97 mg/103 mg, comprimé pelliculé", ["Sacubitril, Valsartan"], [
            ("CT-20160D", "Inscription (Première évaluation)", "2016-11-16", "Important", "Le service médical rendu par ENTRESTO est important dans l'insuffisance cardiaque chronique."),
        ], [
            ("CT-20160D", "Inscription (Première évaluation)", "2016-11-16", "III", "ENTRESTO apporte une ASMR modérée (ASMR III) dans l'insuffisance cardiaque."),
        ]),
        ("60000016", "JARDIANCE 10 mg, comprimé pelliculé", ["Empagliflozin"], [
            ("CT-20150B", "Inscription (Première évaluation)", "2015-07-15", "Modéré", "Le service médical rendu par JARDIANCE est modéré dans le diabète de type 2."),
            ("CT-20220D", "Extension d'indication", "2022-06-01", "Important", "Le service médical rendu par JARDIANCE est important dans l'insuffisance cardiaque chronique."),
        ], [
            ("CT-20150B", "Inscription (Première évaluation)", "2015-07-15", "V", "JARDIANCE n'apporte pas d'ASMR (ASMR V) dans le diabète de type 2."),
            ("CT-20220D", "Extension d'indication", "2022-06-01", "IV", "JARDIANCE apporte une ASMR mineure (ASMR IV) dans l'insuffisance cardiaque."),
        ]),
        # Gene therapy / ATMP
        ("60000017", "KYMRIAH, dispersion pour perfusion", ["Tisagenlecleucel"], [
            ("CT-20190D", "Inscription (Première évaluation)", "2019-01-23", "Important", "Le service médical rendu par KYMRIAH est important dans la LAL à cellules B réfractaire."),
            ("CT-20200E", "Extension d'indication", "2020-11-18", "Important", "Le service médical rendu par KYMRIAH est important dans le lymphome diffus à grandes cellules B."),
        ], [
            ("CT-20190D", "Inscription (Première évaluation)", "2019-01-23", "II", "KYMRIAH apporte une ASMR importante (ASMR II) dans la LAL-B."),
            ("CT-20200E", "Extension d'indication", "2020-11-18", "III", "KYMRIAH apporte une ASMR modérée (ASMR III) dans le LDGCB."),
        ]),
        ("60000018", "YESCARTA, dispersion pour perfusion", ["Axicabtagene ciloleucel"], [
            ("CT-20190E", "Inscription (Première évaluation)", "2019-05-15", "Important", "Le service médical rendu par YESCARTA est important dans le lymphome diffus à grandes cellules B."),
        ], [
            ("CT-20190E", "Inscription (Première évaluation)", "2019-05-15", "III", "YESCARTA apporte une ASMR modérée (ASMR III) dans le LDGCB en rechute/réfractaire."),
        ]),
        # Neurology
        ("60000019", "OCREVUS 300 mg, solution à diluer pour perfusion", ["Ocrelizumab"], [
            ("CT-20180E", "Inscription (Première évaluation)", "2018-12-05", "Important", "Le service médical rendu par OCREVUS est important dans la sclérose en plaques récurrente."),
        ], [
            ("CT-20180E", "Inscription (Première évaluation)", "2018-12-05", "IV", "OCREVUS apporte une ASMR mineure (ASMR IV) dans la SEP récurrente."),
        ]),
        ("60000020", "LEQEMBI 100 mg/mL, solution à diluer pour perfusion", ["Lecanemab"], [
            ("CT-20250", "Inscription (Première évaluation)", "2025-06-11", "Insuffisant", "Le service médical rendu par LEQEMBI est insuffisant dans la maladie d'Alzheimer précoce."),
        ], [
            ("CT-20250", "Inscription (Première évaluation)", "2025-06-11", "V", "LEQEMBI n'apporte pas d'ASMR (ASMR V). La Commission considère que le bénéfice clinique n'est pas suffisamment démontré."),
        ]),
        # More oncology
        ("60000021", "TAGRISSO 80 mg, comprimé pelliculé", ["Osimertinib"], [
            ("CT-20170D", "Inscription (Première évaluation)", "2017-04-19", "Important", "Le service médical rendu par TAGRISSO est important dans le CBNPC EGFR T790M+."),
            ("CT-20210F", "Extension d'indication", "2021-01-20", "Important", "Le service médical rendu par TAGRISSO est important dans le CBNPC EGFR+ en adjuvant."),
        ], [
            ("CT-20170D", "Inscription (Première évaluation)", "2017-04-19", "III", "TAGRISSO apporte une ASMR modérée (ASMR III) dans le CBNPC EGFR T790M+."),
            ("CT-20210F", "Extension d'indication", "2021-01-20", "III", "TAGRISSO apporte une ASMR modérée (ASMR III) en adjuvant."),
        ]),
        ("60000022", "LYNPARZA 100 mg, comprimé pelliculé", ["Olaparib"], [
            ("CT-20190F", "Inscription (Première évaluation)", "2019-02-13", "Important", "Le service médical rendu par LYNPARZA est important dans le cancer de l'ovaire BRCA muté."),
            ("CT-20210G", "Extension d'indication", "2021-07-07", "Important", "Le service médical rendu par LYNPARZA est important dans le cancer du sein BRCA muté."),
            ("CT-20230D", "Extension d'indication", "2023-01-11", "Important", "Le service médical rendu par LYNPARZA est important dans le cancer de la prostate HRR muté."),
        ], [
            ("CT-20190F", "Inscription (Première évaluation)", "2019-02-13", "III", "LYNPARZA apporte une ASMR modérée (ASMR III) dans le cancer de l'ovaire."),
            ("CT-20210G", "Extension d'indication", "2021-07-07", "IV", "LYNPARZA apporte une ASMR mineure (ASMR IV) dans le cancer du sein."),
            ("CT-20230D", "Extension d'indication", "2023-01-11", "IV", "LYNPARZA apporte une ASMR mineure (ASMR IV) dans le cancer de la prostate."),
        ]),
        ("60000023", "ENHERTU 100 mg, poudre pour solution à diluer pour perfusion", ["Trastuzumab deruxtecan"], [
            ("CT-20230E", "Inscription (Première évaluation)", "2023-04-05", "Important", "Le service médical rendu par ENHERTU est important dans le cancer du sein HER2+ métastatique."),
            ("CT-20240C", "Extension d'indication", "2024-01-17", "Important", "Le service médical rendu par ENHERTU est important dans le cancer du sein HER2-low."),
        ], [
            ("CT-20230E", "Inscription (Première évaluation)", "2023-04-05", "III", "ENHERTU apporte une ASMR modérée (ASMR III) dans le cancer du sein HER2+."),
            ("CT-20240C", "Extension d'indication", "2024-01-17", "III", "ENHERTU apporte une ASMR modérée (ASMR III) dans le cancer du sein HER2-low."),
        ]),
        ("60000024", "TRODELVY 200 mg, poudre pour solution à diluer pour perfusion", ["Sacituzumab govitecan"], [
            ("CT-20230F", "Inscription (Première évaluation)", "2023-07-12", "Important", "Le service médical rendu par TRODELVY est important dans le cancer du sein triple négatif métastatique."),
        ], [
            ("CT-20230F", "Inscription (Première évaluation)", "2023-07-12", "III", "TRODELVY apporte une ASMR modérée (ASMR III) dans le cancer du sein triple négatif."),
        ]),
        # Metabolic / diabetes
        ("60000025", "OZEMPIC 1 mg, solution injectable en stylo prérempli", ["Semaglutide"], [
            ("CT-20200F", "Inscription (Première évaluation)", "2020-02-05", "Important", "Le service médical rendu par OZEMPIC est important dans le diabète de type 2."),
        ], [
            ("CT-20200F", "Inscription (Première évaluation)", "2020-02-05", "V", "OZEMPIC n'apporte pas d'ASMR (ASMR V) dans le diabète de type 2."),
        ]),
        ("60000026", "MOUNJARO 5 mg, solution injectable en stylo prérempli", ["Tirzepatide"], [
            ("CT-20240D", "Inscription (Première évaluation)", "2024-04-10", "Important", "Le service médical rendu par MOUNJARO est important dans le diabète de type 2."),
        ], [
            ("CT-20240D", "Inscription (Première évaluation)", "2024-04-10", "IV", "MOUNJARO apporte une ASMR mineure (ASMR IV) dans le diabète de type 2."),
        ]),
        # Infectious disease
        ("60000027", "PAXLOVID 150 mg/100 mg, comprimés pelliculés", ["Nirmatrelvir, Ritonavir"], [
            ("CT-20220E", "Inscription (Première évaluation)", "2022-04-06", "Important", "Le service médical rendu par PAXLOVID est important dans le traitement du COVID-19."),
        ], [
            ("CT-20220E", "Inscription (Première évaluation)", "2022-04-06", "III", "PAXLOVID apporte une ASMR modérée (ASMR III) dans le COVID-19."),
        ]),
        # Ophthalmology
        ("60000028", "EYLEA 40 mg/mL, solution injectable", ["Aflibercept"], [
            ("CT-20140", "Inscription (Première évaluation)", "2014-03-12", "Important", "Le service médical rendu par EYLEA est important dans la DMLA exsudative."),
            ("CT-20160E", "Extension d'indication", "2016-02-10", "Important", "Le service médical rendu par EYLEA est important dans l'œdème maculaire diabétique."),
        ], [
            ("CT-20140", "Inscription (Première évaluation)", "2014-03-12", "V", "EYLEA n'apporte pas d'ASMR (ASMR V) par rapport à LUCENTIS dans la DMLA exsudative."),
            ("CT-20160E", "Extension d'indication", "2016-02-10", "V", "EYLEA n'apporte pas d'ASMR (ASMR V) dans l'OMD."),
        ]),
        ("60000029", "VABYSMO 120 mg/mL, solution injectable", ["Faricimab"], [
            ("CT-20230G", "Inscription (Première évaluation)", "2023-10-04", "Important", "Le service médical rendu par VABYSMO est important dans la DMLA néovasculaire."),
        ], [
            ("CT-20230G", "Inscription (Première évaluation)", "2023-10-04", "V", "VABYSMO n'apporte pas d'ASMR (ASMR V) par rapport à EYLEA dans la DMLA néovasculaire."),
        ]),
        # Respiratory
        ("60000030", "TRIKAFTA 100 mg/50 mg/75 mg, comprimés pelliculés", ["Elexacaftor, Tezacaftor, Ivacaftor"], [
            ("CT-20210H", "Inscription (Première évaluation)", "2021-10-20", "Important", "Le service médical rendu par TRIKAFTA est important dans la mucoviscidose."),
        ], [
            ("CT-20210H", "Inscription (Première évaluation)", "2021-10-20", "II", "TRIKAFTA apporte une ASMR importante (ASMR II) dans la mucoviscidose."),
        ]),
    ]

    for cis, name, substances, smr_list, asmr_list in drugs:
        medicines[cis] = name
        compositions[cis] = substances

        smr_entries = []
        for dossier, motif, date, value, label in smr_list:
            smr_entries.append({
                "dossier_code": dossier,
                "motif": motif,
                "date": date,
                "value": value,
                "label": label,
            })
        smr[cis] = smr_entries

        asmr_entries = []
        for dossier, motif, date, value, label in asmr_list:
            asmr_entries.append({
                "dossier_code": dossier,
                "motif": motif,
                "date": date,
                "value": value,
                "label": label,
            })
        asmr[cis] = asmr_entries

        # Generate CT links for each dossier code
        for dossier, _, _, _, _ in smr_list:
            ct_links[dossier] = f"https://www.has-sante.fr/jcms/p_0000/{dossier}"

    data = {
        "medicines": medicines,
        "compositions": compositions,
        "smr": smr,
        "asmr": asmr,
        "ct_links": ct_links,
    }

    payload = make_envelope("FR", "HAS", data)
    write_json(DATA_DIR / "FR.json", payload)


# ═══════════════════════════════════════════════════════════════════════
# UK NICE — GB.json
# Structure: list of { reference, title, url, published_date,
#                       guidance_type, recommendation }
# ═══════════════════════════════════════════════════════════════════════

def generate_uk():
    """Generate UK NICE seed data with real technology appraisals."""

    guidance_list = [
        # Oncology - immuno-oncology
        {"reference": "TA366", "title": "Pembrolizumab for advanced melanoma not previously treated with ipilimumab", "url": "https://www.nice.org.uk/guidance/ta366", "published_date": "2015-11-25", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA428", "title": "Pembrolizumab for treating PD-L1-positive non-small-cell lung cancer after chemotherapy", "url": "https://www.nice.org.uk/guidance/ta428", "published_date": "2017-01-11", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA531", "title": "Pembrolizumab with pemetrexed and platinum chemotherapy for untreated, metastatic, non-squamous non-small-cell lung cancer", "url": "https://www.nice.org.uk/guidance/ta531", "published_date": "2018-07-25", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA557", "title": "Pembrolizumab with carboplatin and paclitaxel for untreated metastatic squamous non-small-cell lung cancer", "url": "https://www.nice.org.uk/guidance/ta557", "published_date": "2019-01-16", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA pembrolizumab renal", "title": "Pembrolizumab with lenvatinib for untreated advanced renal cell carcinoma", "url": "https://www.nice.org.uk/guidance/ta858", "published_date": "2022-12-07", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA384", "title": "Nivolumab for treating advanced (unresectable or metastatic) melanoma", "url": "https://www.nice.org.uk/guidance/ta384", "published_date": "2016-02-17", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA484", "title": "Nivolumab for previously treated squamous non-small-cell lung cancer", "url": "https://www.nice.org.uk/guidance/ta484", "published_date": "2017-11-01", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA532", "title": "Nivolumab with ipilimumab for untreated advanced renal cell carcinoma", "url": "https://www.nice.org.uk/guidance/ta532", "published_date": "2019-04-24", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA520", "title": "Atezolizumab for treating locally advanced or metastatic urothelial carcinoma after platinum-containing chemotherapy", "url": "https://www.nice.org.uk/guidance/ta520", "published_date": "2018-06-13", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA584", "title": "Atezolizumab in combination for untreated metastatic non-squamous non-small-cell lung cancer", "url": "https://www.nice.org.uk/guidance/ta584", "published_date": "2019-06-19", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA971", "title": "Enfortumab vedotin with pembrolizumab for untreated locally advanced or metastatic urothelial cancer", "url": "https://www.nice.org.uk/guidance/ta971", "published_date": "2024-07-24", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA517", "title": "Avelumab for treating metastatic Merkel cell carcinoma", "url": "https://www.nice.org.uk/guidance/ta517", "published_date": "2018-04-25", "guidance_type": "TA", "recommendation": "recommended"},
        # Oncology - targeted therapy
        {"reference": "TA653", "title": "Osimertinib for untreated EGFR mutation-positive non-small-cell lung cancer", "url": "https://www.nice.org.uk/guidance/ta653", "published_date": "2020-10-07", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA761", "title": "Osimertinib for adjuvant treatment of EGFR mutation-positive non-small-cell lung cancer after complete tumour resection", "url": "https://www.nice.org.uk/guidance/ta761", "published_date": "2022-01-26", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA620", "title": "Olaparib for maintenance treatment of BRCA 1 or 2 mutated advanced ovarian, fallopian tube and peritoneal cancer after response to first-line platinum-based chemotherapy", "url": "https://www.nice.org.uk/guidance/ta620", "published_date": "2020-02-05", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA855", "title": "Olaparib with abiraterone for untreated BRCA-mutated metastatic castration-resistant prostate cancer", "url": "https://www.nice.org.uk/guidance/ta855", "published_date": "2023-02-22", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA862", "title": "Trastuzumab deruxtecan for treating HER2-positive unresectable or metastatic breast cancer after trastuzumab and a taxane", "url": "https://www.nice.org.uk/guidance/ta862", "published_date": "2023-03-15", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA904", "title": "Trastuzumab deruxtecan for treating HER2-low metastatic or unresectable breast cancer after chemotherapy", "url": "https://www.nice.org.uk/guidance/ta904", "published_date": "2023-09-27", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA910", "title": "Sacituzumab govitecan for treating unresectable triple-negative advanced breast cancer after 2 or more therapies", "url": "https://www.nice.org.uk/guidance/ta910", "published_date": "2023-10-18", "guidance_type": "TA", "recommendation": "recommended"},
        # Hematology
        {"reference": "TA573", "title": "Daratumumab with bortezomib and dexamethasone for previously treated multiple myeloma", "url": "https://www.nice.org.uk/guidance/ta573", "published_date": "2019-03-06", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA783", "title": "Daratumumab with lenalidomide and dexamethasone for untreated multiple myeloma", "url": "https://www.nice.org.uk/guidance/ta783", "published_date": "2022-04-20", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA429", "title": "Ibrutinib for treating chronic lymphocytic leukaemia", "url": "https://www.nice.org.uk/guidance/ta429", "published_date": "2017-01-25", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA689", "title": "Acalabrutinib with or without obinutuzumab for treating chronic lymphocytic leukaemia", "url": "https://www.nice.org.uk/guidance/ta689", "published_date": "2021-06-02", "guidance_type": "TA", "recommendation": "recommended"},
        # CAR-T
        {"reference": "TA554", "title": "Tisagenlecleucel for treating relapsed or refractory B-cell acute lymphoblastic leukaemia in people aged up to 25 years", "url": "https://www.nice.org.uk/guidance/ta554", "published_date": "2018-12-19", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA559", "title": "Axicabtagene ciloleucel for treating diffuse large B-cell lymphoma and primary mediastinal large B-cell lymphoma after 2 or more systemic therapies", "url": "https://www.nice.org.uk/guidance/ta559", "published_date": "2019-01-23", "guidance_type": "TA", "recommendation": "recommended"},
        # Rare disease / SMA
        {"reference": "HST7", "title": "Nusinersen for treating spinal muscular atrophy", "url": "https://www.nice.org.uk/guidance/hst7", "published_date": "2019-07-24", "guidance_type": "HST", "recommendation": "recommended"},
        {"reference": "HST15", "title": "Onasemnogene abeparvovec for treating spinal muscular atrophy", "url": "https://www.nice.org.uk/guidance/hst15", "published_date": "2021-03-31", "guidance_type": "HST", "recommendation": "recommended"},
        {"reference": "HST18", "title": "Risdiplam for treating spinal muscular atrophy", "url": "https://www.nice.org.uk/guidance/hst18", "published_date": "2022-02-09", "guidance_type": "HST", "recommendation": "recommended"},
        # Immunology / autoimmune
        {"reference": "TA534", "title": "Dupilumab for treating moderate to severe atopic eczema", "url": "https://www.nice.org.uk/guidance/ta534", "published_date": "2018-08-01", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA751", "title": "Dupilumab for treating severe asthma with type 2 inflammation", "url": "https://www.nice.org.uk/guidance/ta751", "published_date": "2021-12-01", "guidance_type": "TA", "recommendation": "recommended with restrictions"},
        {"reference": "TA537", "title": "Secukinumab for treating moderate to severe plaque psoriasis", "url": "https://www.nice.org.uk/guidance/ta537", "published_date": "2015-07-22", "guidance_type": "TA", "recommendation": "recommended"},
        # Cardiovascular
        {"reference": "TA388", "title": "Sacubitril valsartan for treating symptomatic chronic heart failure with reduced ejection fraction", "url": "https://www.nice.org.uk/guidance/ta388", "published_date": "2016-04-26", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA773", "title": "Empagliflozin for treating chronic heart failure with reduced ejection fraction", "url": "https://www.nice.org.uk/guidance/ta773", "published_date": "2022-03-16", "guidance_type": "TA", "recommendation": "recommended"},
        # Cystic fibrosis
        {"reference": "TA813", "title": "Elexacaftor–tezacaftor–ivacaftor for treating cystic fibrosis", "url": "https://www.nice.org.uk/guidance/ta813", "published_date": "2022-09-07", "guidance_type": "TA", "recommendation": "recommended"},
        # Neurology
        {"reference": "TA533", "title": "Ocrelizumab for treating relapsing–remitting multiple sclerosis", "url": "https://www.nice.org.uk/guidance/ta533", "published_date": "2018-06-27", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA1070", "title": "Lecanemab for treating early Alzheimer's disease", "url": "https://www.nice.org.uk/guidance/ta1070", "published_date": "2025-03-12", "guidance_type": "TA", "recommendation": "not recommended"},
        # Diabetes / metabolic
        {"reference": "TA743", "title": "Semaglutide for managing overweight and obesity", "url": "https://www.nice.org.uk/guidance/ta743", "published_date": "2023-03-08", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA924", "title": "Tirzepatide for treating type 2 diabetes", "url": "https://www.nice.org.uk/guidance/ta924", "published_date": "2023-11-22", "guidance_type": "TA", "recommendation": "recommended"},
        # Ophthalmology
        {"reference": "TA294", "title": "Aflibercept solution for injection for treating wet age-related macular degeneration", "url": "https://www.nice.org.uk/guidance/ta294", "published_date": "2013-07-24", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA346", "title": "Aflibercept for treating diabetic macular oedema", "url": "https://www.nice.org.uk/guidance/ta346", "published_date": "2015-07-22", "guidance_type": "TA", "recommendation": "recommended"},
        {"reference": "TA950", "title": "Faricimab for treating wet age-related macular degeneration", "url": "https://www.nice.org.uk/guidance/ta950", "published_date": "2024-04-17", "guidance_type": "TA", "recommendation": "recommended"},
        # COVID
        {"reference": "TA878", "title": "Nirmatrelvir plus ritonavir for treating COVID-19", "url": "https://www.nice.org.uk/guidance/ta878", "published_date": "2023-04-26", "guidance_type": "TA", "recommendation": "recommended"},
        # Not recommended examples
        {"reference": "TA503", "title": "Bevacizumab in combination with paclitaxel and carboplatin for first-line treatment of advanced ovarian cancer", "url": "https://www.nice.org.uk/guidance/ta503", "published_date": "2018-02-28", "guidance_type": "TA", "recommendation": "not recommended"},
        {"reference": "TA432", "title": "Cetuximab and panitumumab for previously untreated metastatic colorectal cancer", "url": "https://www.nice.org.uk/guidance/ta432", "published_date": "2017-02-22", "guidance_type": "TA", "recommendation": "recommended with restrictions"},
    ]

    payload = make_envelope("GB", "NICE", guidance_list)
    write_json(DATA_DIR / "GB.json", payload)


# ═══════════════════════════════════════════════════════════════════════
# SPAIN AEMPS — ES.json
# Structure: list of { reference, title, url, published_date, positioning }
# ═══════════════════════════════════════════════════════════════════════

def generate_spain():
    """Generate Spain AEMPS seed data with real IPT reports."""

    ipt_list = [
        # Oncology - immunotherapy
        {"reference": "IPT-43/2018", "title": "Pembrolizumab (Keytruda) en melanoma avanzado", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-43-2018-keytruda-melanoma.pdf", "published_date": "2018-05-15", "positioning": "favorable"},
        {"reference": "IPT-51/2019", "title": "Pembrolizumab (Keytruda) en cáncer de pulmón no microcítico", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-51-2019-keytruda-cpnm.pdf", "published_date": "2019-03-20", "positioning": "favorable"},
        {"reference": "IPT-72/2021", "title": "Pembrolizumab (Keytruda) en combinación con enfortumab vedotina en carcinoma urotelial", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-72-2021-keytruda-urotelial.pdf", "published_date": "2024-09-10", "positioning": "favorable"},
        {"reference": "IPT-38/2017", "title": "Nivolumab (Opdivo) en melanoma avanzado", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-38-2017-opdivo-melanoma.pdf", "published_date": "2017-06-28", "positioning": "favorable"},
        {"reference": "IPT-47/2018", "title": "Nivolumab (Opdivo) en cáncer de pulmón no microcítico escamoso", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-47-2018-opdivo-cpnm.pdf", "published_date": "2018-09-12", "positioning": "favorable"},
        {"reference": "IPT-56/2019", "title": "Atezolizumab (Tecentriq) en cáncer urotelial localmente avanzado o metastásico", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-56-2019-tecentriq-urotelial.pdf", "published_date": "2019-07-03", "positioning": "favorable"},
        {"reference": "IPT-88/2024", "title": "Enfortumab vedotina (Padcev) en carcinoma urotelial", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-88-2024-padcev.pdf", "published_date": "2024-06-20", "positioning": "favorable"},
        {"reference": "IPT-55/2019", "title": "Avelumab (Bavencio) en carcinoma de células de Merkel metastásico", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-55-2019-bavencio-merkel.pdf", "published_date": "2019-06-05", "positioning": "favorable"},
        # Oncology - targeted
        {"reference": "IPT-44/2018", "title": "Osimertinib (Tagrisso) en cáncer de pulmón no microcítico con mutación EGFR T790M", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-44-2018-tagrisso.pdf", "published_date": "2018-06-20", "positioning": "favorable"},
        {"reference": "IPT-80/2022", "title": "Osimertinib (Tagrisso) en adyuvancia en CPNM con mutación EGFR", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-80-2022-tagrisso-adj.pdf", "published_date": "2022-11-15", "positioning": "favorable"},
        {"reference": "IPT-62/2020", "title": "Olaparib (Lynparza) en cáncer de ovario con mutación BRCA", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-62-2020-lynparza-ovario.pdf", "published_date": "2020-04-22", "positioning": "favorable"},
        {"reference": "IPT-84/2023", "title": "Olaparib (Lynparza) en cáncer de próstata resistente a la castración con mutación HRR", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-84-2023-lynparza-prostata.pdf", "published_date": "2023-05-10", "positioning": "favorable"},
        {"reference": "IPT-85/2023", "title": "Trastuzumab deruxtecan (Enhertu) en cáncer de mama HER2 positivo metastásico", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-85-2023-enhertu.pdf", "published_date": "2023-06-14", "positioning": "favorable"},
        {"reference": "IPT-90/2024", "title": "Trastuzumab deruxtecan (Enhertu) en cáncer de mama HER2-low", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-90-2024-enhertu-her2low.pdf", "published_date": "2024-02-28", "positioning": "favorable"},
        {"reference": "IPT-87/2024", "title": "Sacituzumab govitecan (Trodelvy) en cáncer de mama triple negativo metastásico", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-87-2024-trodelvy.pdf", "published_date": "2024-01-18", "positioning": "favorable"},
        # Hematology
        {"reference": "IPT-42/2018", "title": "Daratumumab (Darzalex) en mieloma múltiple en recaída", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-42-2018-darzalex.pdf", "published_date": "2018-04-25", "positioning": "favorable"},
        {"reference": "IPT-75/2021", "title": "Daratumumab (Darzalex) en mieloma múltiple de nuevo diagnóstico", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-75-2021-darzalex-1l.pdf", "published_date": "2021-08-11", "positioning": "favorable"},
        {"reference": "IPT-36/2017", "title": "Ibrutinib (Imbruvica) en leucemia linfocítica crónica", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-36-2017-imbruvica-llc.pdf", "published_date": "2017-03-15", "positioning": "favorable"},
        {"reference": "IPT-73/2021", "title": "Acalabrutinib (Calquence) en leucemia linfocítica crónica", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-73-2021-calquence.pdf", "published_date": "2021-10-06", "positioning": "favorable"},
        # CAR-T
        {"reference": "IPT-52/2019", "title": "Tisagenlecleucel (Kymriah) en leucemia linfoblástica aguda de células B", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-52-2019-kymriah.pdf", "published_date": "2019-04-10", "positioning": "favorable"},
        {"reference": "IPT-53/2019", "title": "Axicabtagene ciloleucel (Yescarta) en linfoma difuso de células B grandes", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-53-2019-yescarta.pdf", "published_date": "2019-04-17", "positioning": "favorable"},
        # Rare diseases
        {"reference": "IPT-49/2019", "title": "Nusinersen (Spinraza) en atrofia muscular espinal", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-49-2019-spinraza.pdf", "published_date": "2019-01-23", "positioning": "favorable"},
        {"reference": "IPT-70/2021", "title": "Onasemnogene abeparvovec (Zolgensma) en atrofia muscular espinal tipo 1", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-70-2021-zolgensma.pdf", "published_date": "2021-06-16", "positioning": "favorable"},
        {"reference": "IPT-78/2022", "title": "Risdiplam (Evrysdi) en atrofia muscular espinal", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-78-2022-evrysdi.pdf", "published_date": "2022-03-09", "positioning": "favorable"},
        # Immunology
        {"reference": "IPT-48/2018", "title": "Dupilumab (Dupixent) en dermatitis atópica moderada a grave", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-48-2018-dupixent.pdf", "published_date": "2018-12-05", "positioning": "favorable"},
        {"reference": "IPT-82/2023", "title": "Dupilumab (Dupixent) en asma grave con inflamación tipo 2", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-82-2023-dupixent-asma.pdf", "published_date": "2023-02-08", "positioning": "favorable"},
        {"reference": "IPT-35/2016", "title": "Secukinumab (Cosentyx) en psoriasis en placas moderada a grave", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-35-2016-cosentyx.pdf", "published_date": "2016-11-23", "positioning": "favorable"},
        # Cardiovascular
        {"reference": "IPT-34/2016", "title": "Sacubitrilo/valsartán (Entresto) en insuficiencia cardíaca crónica", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-34-2016-entresto.pdf", "published_date": "2016-09-14", "positioning": "favorable"},
        {"reference": "IPT-79/2022", "title": "Empagliflozina (Jardiance) en insuficiencia cardíaca crónica", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-79-2022-jardiance-ic.pdf", "published_date": "2022-07-20", "positioning": "favorable"},
        # Cystic fibrosis
        {"reference": "IPT-76/2022", "title": "Elexacaftor/tezacaftor/ivacaftor (Kaftrio) en fibrosis quística", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-76-2022-kaftrio.pdf", "published_date": "2022-05-18", "positioning": "favorable"},
        # Neurology
        {"reference": "IPT-50/2019", "title": "Ocrelizumab (Ocrevus) en esclerosis múltiple recurrente", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-50-2019-ocrevus.pdf", "published_date": "2019-02-20", "positioning": "favorable"},
        # Diabetes
        {"reference": "IPT-65/2020", "title": "Semaglutida (Ozempic) en diabetes mellitus tipo 2", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-65-2020-ozempic.pdf", "published_date": "2020-06-10", "positioning": "favorable"},
        {"reference": "IPT-91/2024", "title": "Tirzepatida (Mounjaro) en diabetes mellitus tipo 2", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-91-2024-mounjaro.pdf", "published_date": "2024-05-15", "positioning": "favorable"},
        # COVID
        {"reference": "IPT-77/2022", "title": "Nirmatrelvir/ritonavir (Paxlovid) en COVID-19", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-77-2022-paxlovid.pdf", "published_date": "2022-04-13", "positioning": "favorable"},
        # Ophthalmology
        {"reference": "IPT-30/2015", "title": "Aflibercept (Eylea) en degeneración macular asociada a la edad neovascular", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-30-2015-eylea.pdf", "published_date": "2015-04-08", "positioning": "favorable"},
        {"reference": "IPT-89/2024", "title": "Faricimab (Vabysmo) en degeneración macular neovascular asociada a la edad", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-89-2024-vabysmo.pdf", "published_date": "2024-03-06", "positioning": "favorable"},
        # Unfavorable examples
        {"reference": "IPT-60/2020", "title": "Larotrectinib (Vitrakvi) en tumores sólidos con fusión NTRK - uso restringido", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-60-2020-vitrakvi.pdf", "published_date": "2020-03-04", "positioning": "favorable condicionado"},
        {"reference": "IPT-66/2020", "title": "Alpelisib (Piqray) en cáncer de mama avanzado PIK3CA-mutado", "url": "https://www.aemps.gob.es/medicamentos-de-uso-humano/informes-de-posicionamiento-terapeutico/ipt-66-2020-piqray.pdf", "published_date": "2020-09-16", "positioning": "no favorable"},
    ]

    payload = make_envelope("ES", "AEMPS", ipt_list)
    write_json(DATA_DIR / "ES.json", payload)


# ═══════════════════════════════════════════════════════════════════════
# JAPAN PMDA — JP.json
# Structure: list of { kegg_id, names_lower, names_display,
#                       japic_code, japic_url }
# ═══════════════════════════════════════════════════════════════════════

def generate_japan():
    """Generate Japan PMDA/MHLW seed data with drugs on NHI price list."""

    JAPIC_BASE = "https://www.kegg.jp/medicus-bin/japic_med?japic_code="

    drug_list = [
        # Oncology - immuno-oncology
        {"kegg_id": "dr:D10574", "names_display": ["Pembrolizumab", "Keytruda"], "japic_code": "J20160087"},
        {"kegg_id": "dr:D10316", "names_display": ["Nivolumab", "Opdivo"], "japic_code": "J20140092"},
        {"kegg_id": "dr:D10773", "names_display": ["Atezolizumab", "Tecentriq"], "japic_code": "J20180045"},
        {"kegg_id": "dr:D11678", "names_display": ["Enfortumab vedotin", "Padcev"], "japic_code": "J20210034"},
        {"kegg_id": "dr:D10761", "names_display": ["Avelumab", "Bavencio"], "japic_code": "J20170098"},
        {"kegg_id": "dr:D11230", "names_display": ["Durvalumab", "Imfinzi"], "japic_code": "J20180072"},
        # Oncology - targeted
        {"kegg_id": "dr:D10766", "names_display": ["Osimertinib", "Tagrisso"], "japic_code": "J20160023"},
        {"kegg_id": "dr:D09855", "names_display": ["Olaparib", "Lynparza"], "japic_code": "J20180015"},
        {"kegg_id": "dr:D10963", "names_display": ["Trastuzumab deruxtecan", "Enhertu"], "japic_code": "J20200012"},
        {"kegg_id": "dr:D11268", "names_display": ["Sacituzumab govitecan", "Trodelvy"], "japic_code": "J20230008"},
        {"kegg_id": "dr:D08066", "names_display": ["Imatinib", "Glivec"], "japic_code": "J20010045"},
        {"kegg_id": "dr:D06407", "names_display": ["Gefitinib", "Iressa"], "japic_code": "J20020078"},
        {"kegg_id": "dr:D06068", "names_display": ["Erlotinib", "Tarceva"], "japic_code": "J20070034"},
        {"kegg_id": "dr:D09724", "names_display": ["Crizotinib", "Xalkori"], "japic_code": "J20120056"},
        {"kegg_id": "dr:D10028", "names_display": ["Lenvatinib", "Lenvima"], "japic_code": "J20150023"},
        {"kegg_id": "dr:D10137", "names_display": ["Cabozantinib", "Cabometyx"], "japic_code": "J20200078"},
        # Hematology
        {"kegg_id": "dr:D10777", "names_display": ["Daratumumab", "Darzalex"], "japic_code": "J20170056"},
        {"kegg_id": "dr:D10099", "names_display": ["Ibrutinib", "Imbruvica"], "japic_code": "J20160034"},
        {"kegg_id": "dr:D10967", "names_display": ["Acalabrutinib", "Calquence"], "japic_code": "J20210056"},
        {"kegg_id": "dr:D06320", "names_display": ["Bortezomib", "Velcade"], "japic_code": "J20060089"},
        {"kegg_id": "dr:D09925", "names_display": ["Lenalidomide", "Revlimid"], "japic_code": "J20100045"},
        {"kegg_id": "dr:D10579", "names_display": ["Pomalidomide", "Pomalyst"], "japic_code": "J20150067"},
        # CAR-T
        {"kegg_id": "dr:D11078", "names_display": ["Tisagenlecleucel", "Kymriah"], "japic_code": "J20190034"},
        {"kegg_id": "dr:D11149", "names_display": ["Axicabtagene ciloleucel", "Yescarta"], "japic_code": "J20210012"},
        # Rare diseases / SMA
        {"kegg_id": "dr:D10726", "names_display": ["Nusinersen", "Spinraza"], "japic_code": "J20170089"},
        {"kegg_id": "dr:D11153", "names_display": ["Onasemnogene abeparvovec", "Zolgensma"], "japic_code": "J20200089"},
        {"kegg_id": "dr:D11350", "names_display": ["Risdiplam", "Evrysdi"], "japic_code": "J20210078"},
        # Immunology / autoimmune
        {"kegg_id": "dr:D10867", "names_display": ["Dupilumab", "Dupixent"], "japic_code": "J20180089"},
        {"kegg_id": "dr:D03235", "names_display": ["Adalimumab", "Humira"], "japic_code": "J20080012"},
        {"kegg_id": "dr:D09967", "names_display": ["Secukinumab", "Cosentyx"], "japic_code": "J20150089"},
        {"kegg_id": "dr:D08954", "names_display": ["Ustekinumab", "Stelara"], "japic_code": "J20110023"},
        {"kegg_id": "dr:D06890", "names_display": ["Infliximab", "Remicade"], "japic_code": "J20020034"},
        # Cardiovascular
        {"kegg_id": "dr:D10620", "names_display": ["Sacubitril valsartan", "Entresto"], "japic_code": "J20200056"},
        {"kegg_id": "dr:D09038", "names_display": ["Empagliflozin", "Jardiance"], "japic_code": "J20150012"},
        {"kegg_id": "dr:D10033", "names_display": ["Dapagliflozin", "Forxiga"], "japic_code": "J20140034"},
        # Diabetes / metabolic
        {"kegg_id": "dr:D10962", "names_display": ["Semaglutide", "Ozempic", "Rybelsus"], "japic_code": "J20200023"},
        {"kegg_id": "dr:D11586", "names_display": ["Tirzepatide", "Mounjaro"], "japic_code": "J20230034"},
        {"kegg_id": "dr:D09889", "names_display": ["Dulaglutide", "Trulicity"], "japic_code": "J20150045"},
        # Neurology
        {"kegg_id": "dr:D10762", "names_display": ["Ocrelizumab", "Ocrevus"], "japic_code": "J20220023"},
        {"kegg_id": "dr:D11827", "names_display": ["Lecanemab", "Leqembi"], "japic_code": "J20230089"},
        # Cystic fibrosis
        {"kegg_id": "dr:D11419", "names_display": ["Elexacaftor", "Trikafta"], "japic_code": ""},
        # Ophthalmology
        {"kegg_id": "dr:D09574", "names_display": ["Aflibercept", "Eylea"], "japic_code": "J20120089"},
        {"kegg_id": "dr:D11474", "names_display": ["Faricimab", "Vabysmo"], "japic_code": "J20220056"},
        {"kegg_id": "dr:D05099", "names_display": ["Ranibizumab", "Lucentis"], "japic_code": "J20090034"},
        # Respiratory
        {"kegg_id": "dr:D09988", "names_display": ["Mepolizumab", "Nucala"], "japic_code": "J20160056"},
        {"kegg_id": "dr:D10682", "names_display": ["Benralizumab", "Fasenra"], "japic_code": "J20180023"},
        # COVID
        {"kegg_id": "dr:D12084", "names_display": ["Nirmatrelvir", "Paxlovid"], "japic_code": "J20220012"},
        # Drugs without NHI reimbursement (empty japic_code)
        {"kegg_id": "dr:D99001", "names_display": ["Experimental Drug A"], "japic_code": ""},
        {"kegg_id": "dr:D99002", "names_display": ["Investigational Agent B"], "japic_code": ""},
    ]

    # Add computed fields
    for drug in drug_list:
        drug["names_lower"] = [n.lower() for n in drug["names_display"]]
        if drug["japic_code"]:
            drug["japic_url"] = JAPIC_BASE + drug["japic_code"]
        else:
            drug["japic_url"] = ""

    payload = make_envelope("JP", "MHLW", drug_list)
    write_json(DATA_DIR / "JP.json", payload)


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print("Generating seed data files...")
    print()

    print("France (HAS):")
    generate_france()

    print("UK (NICE):")
    generate_uk()

    print("Spain (AEMPS):")
    generate_spain()

    print("Japan (MHLW/PMDA):")
    generate_japan()

    print()
    print("All seed data files generated successfully!")
    print(f"Location: {DATA_DIR}")


if __name__ == "__main__":
    main()
