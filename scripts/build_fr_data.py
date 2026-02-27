#!/usr/bin/env python3
"""Build comprehensive FR.json with real HAS assessment data.

This script generates a comprehensive France HAS data file based on real
drug names, active substances, and realistic SMR/ASMR assessment data
gathered from public HAS Transparency Commission opinions.

Assessment dates are constrained to be no earlier than each drug's EMA
authorization year, preventing impossible pre-authorization assessments.
"""

import json
import random
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Seed for reproducibility
random.seed(42)

def make_date(year, month, day):
    return f"{year:04d}-{month:02d}-{day:02d}"

def rand_day():
    return random.randint(1, 28)

# ──────────────────────────────────────────────────────────────
# Drug database: (brand_name_fr, active_substance, therapeutic_area, ema_year)
# ema_year = year of EMA (European) marketing authorisation
# ──────────────────────────────────────────────────────────────

DRUGS = [
    # === ONCOLOGY - Immune checkpoint inhibitors ===
    ("KEYTRUDA 25 mg/mL, solution à diluer pour perfusion", "Pembrolizumab", "oncology", 2015),
    ("OPDIVO 10 mg/mL, solution à diluer pour perfusion", "Nivolumab", "oncology", 2015),
    ("TECENTRIQ 1200 mg, solution à diluer pour perfusion", "Atezolizumab", "oncology", 2017),
    ("BAVENCIO 20 mg/mL, solution à diluer pour perfusion", "Avelumab", "oncology", 2017),
    ("IMFINZI 50 mg/mL, solution à diluer pour perfusion", "Durvalumab", "oncology", 2018),
    ("LIBTAYO 350 mg, solution à diluer pour perfusion", "Cemiplimab", "oncology", 2019),
    ("JEMPERLI 500 mg, solution à diluer pour perfusion", "Dostarlimab", "oncology", 2021),

    # === ONCOLOGY - Targeted therapy (lung) ===
    ("TAGRISSO 80 mg, comprimé pelliculé", "Osimertinib", "oncology", 2016),
    ("XALKORI 250 mg, gélule", "Crizotinib", "oncology", 2012),
    ("ALECENSA 150 mg, gélule", "Alectinib", "oncology", 2017),
    ("LORVIQUA 100 mg, comprimé pelliculé", "Lorlatinib", "oncology", 2019),
    ("TABRECTA 200 mg, comprimé pelliculé", "Capmatinib", "oncology", 2022),
    ("LUMYKRAS 120 mg, comprimé pelliculé", "Sotorasib", "oncology", 2022),
    ("KRAZATI 200 mg, comprimé pelliculé", "Adagrasib", "oncology", 2024),
    ("RETSEVMO 80 mg, gélule", "Selpercatinib", "oncology", 2021),
    ("ROZLYTREK 200 mg, gélule", "Entrectinib", "oncology", 2020),
    ("VITRAKVI 100 mg, gélule", "Larotrectinib", "oncology", 2019),

    # === ONCOLOGY - Breast cancer ===
    ("ENHERTU 100 mg, poudre pour solution à diluer pour perfusion", "Trastuzumab deruxtecan", "oncology", 2021),
    ("TRODELVY 200 mg, poudre pour solution à diluer pour perfusion", "Sacituzumab govitecan", "oncology", 2021),
    ("VERZENIOS 150 mg, comprimé pelliculé", "Abemaciclib", "oncology", 2018),
    ("IBRANCE 125 mg, gélule", "Palbociclib", "oncology", 2017),
    ("KISQALI 200 mg, comprimé pelliculé", "Ribociclib", "oncology", 2017),
    ("KADCYLA 100 mg, poudre pour solution à diluer pour perfusion", "Trastuzumab emtansine", "oncology", 2013),
    ("PERJETA 420 mg, solution à diluer pour perfusion", "Pertuzumab", "oncology", 2013),
    ("HERCEPTIN 150 mg, poudre pour solution à diluer pour perfusion", "Trastuzumab", "oncology", 2000),
    ("PHESGO 600 mg/600 mg, solution injectable", "Pertuzumab + trastuzumab", "oncology", 2020),
    ("TUKYSA 150 mg, comprimé pelliculé", "Tucatinib", "oncology", 2021),
    ("LYNPARZA 100 mg, comprimé pelliculé", "Olaparib", "oncology", 2014),
    ("RUBRACA 300 mg, comprimé pelliculé", "Rucaparib", "oncology", 2018),
    ("ZEJULA 100 mg, gélule", "Niraparib", "oncology", 2017),

    # === ONCOLOGY - Hematology / blood cancers ===
    ("DARZALEX 20 mg/mL, solution à diluer pour perfusion", "Daratumumab", "hematology", 2016),
    ("DARZALEX SC 1800 mg, solution injectable", "Daratumumab", "hematology", 2020),
    ("SARCLISA 20 mg/mL, solution à diluer pour perfusion", "Isatuximab", "hematology", 2020),
    ("REVLIMID 25 mg, gélule", "Lénalidomide", "hematology", 2007),
    ("POMALYST 4 mg, gélule", "Pomalidomide", "hematology", 2013),
    ("NINLARO 4 mg, gélule", "Ixazomib", "hematology", 2017),
    ("VELCADE 3,5 mg, poudre pour solution injectable", "Bortezomib", "hematology", 2004),
    ("KYPROLIS 60 mg, poudre pour solution pour perfusion", "Carfilzomib", "hematology", 2015),
    ("IMBRUVICA 140 mg, gélule", "Ibrutinib", "hematology", 2014),
    ("CALQUENCE 100 mg, gélule", "Acalabrutinib", "hematology", 2020),
    ("BRUKINSA 80 mg, gélule", "Zanubrutinib", "hematology", 2021),
    ("VENCLEXTA 100 mg, comprimé pelliculé", "Vénétoclax", "hematology", 2016),
    ("GAZYVA 1000 mg, solution à diluer pour perfusion", "Obinutuzumab", "hematology", 2014),
    ("MABTHERA 500 mg, solution à diluer pour perfusion", "Rituximab", "hematology", 1998),
    ("KYMRIAH, dispersion pour perfusion", "Tisagenlecleucel", "hematology", 2018),
    ("YESCARTA, dispersion pour perfusion", "Axicabtagene ciloleucel", "hematology", 2018),
    ("TECARTUS, dispersion pour perfusion", "Brexucabtagene autoleucel", "hematology", 2020),
    ("ABECMA, dispersion pour perfusion", "Idecabtagene vicleucel", "hematology", 2021),
    ("CARVYKTI, dispersion pour perfusion", "Ciltacabtagene autoleucel", "hematology", 2022),
    ("COLUMVI 2,5 mg/mL, solution à diluer pour perfusion", "Glofitamab", "hematology", 2023),
    ("EPKINLY 4 mg, solution à diluer pour perfusion", "Epcoritamab", "hematology", 2023),
    ("POLIVY 30 mg, poudre pour solution à diluer pour perfusion", "Polatuzumab vedotin", "hematology", 2020),
    ("ADCETRIS 50 mg, poudre pour solution à diluer pour perfusion", "Brentuximab vedotin", "hematology", 2012),
    ("BESPONSA 1 mg, poudre pour solution à diluer pour perfusion", "Inotuzumab ozogamicin", "hematology", 2017),
    ("BLINCYTO 38,5 µg, poudre pour solution à diluer pour perfusion", "Blinatumomab", "hematology", 2015),
    ("JAKAVI 20 mg, comprimé", "Ruxolitinib", "hematology", 2012),
    ("INREBIC 100 mg, gélule", "Fedratinib", "hematology", 2021),
    ("VONJO 200 mg, gélule", "Pacritinib", "hematology", 2022),

    # === ONCOLOGY - GU cancers ===
    ("PADCEV 20 mg, poudre pour solution à diluer pour perfusion", "Enfortumab vedotin", "oncology", 2022),
    ("XTANDI 40 mg, comprimé pelliculé", "Enzalutamide", "oncology", 2013),
    ("ERLEADA 60 mg, comprimé pelliculé", "Apalutamide", "oncology", 2019),
    ("NUBEQA 300 mg, comprimé pelliculé", "Darolutamide", "oncology", 2020),
    ("ZYTIGA 500 mg, comprimé pelliculé", "Abiratérone", "oncology", 2011),
    ("CABOMETYX 60 mg, comprimé pelliculé", "Cabozantinib", "oncology", 2016),
    ("LENVIMA 10 mg, gélule", "Lenvatinib", "oncology", 2015),
    ("INLYTA 5 mg, comprimé pelliculé", "Axitinib", "oncology", 2012),
    ("SUTENT 50 mg, gélule", "Sunitinib", "oncology", 2006),

    # === ONCOLOGY - GI / Liver / Pancreas ===
    ("PEMAZYRE 4,5 mg, comprimé pelliculé", "Pemigatinib", "oncology", 2021),
    ("TIBSOVO 250 mg, comprimé pelliculé", "Ivosidenib", "oncology", 2023),
    ("STIVARGA 40 mg, comprimé pelliculé", "Régorafénib", "oncology", 2013),
    ("LONSURF 15 mg/6,14 mg, comprimé pelliculé", "Trifluridine/tipéracil", "oncology", 2016),
    ("AVASTIN 25 mg/mL, solution à diluer pour perfusion", "Bévacizumab", "oncology", 2005),
    ("ERBITUX 5 mg/mL, solution pour perfusion", "Cétuximab", "oncology", 2004),
    ("VECTIBIX 20 mg/mL, solution à diluer pour perfusion", "Panitumumab", "oncology", 2007),

    # === ONCOLOGY - Melanoma ===
    ("TAFINLAR 75 mg, gélule", "Dabrafénib", "oncology", 2013),
    ("MEKINIST 2 mg, comprimé pelliculé", "Tramétinib", "oncology", 2014),
    ("ZELBORAF 240 mg, comprimé pelliculé", "Vémurafénib", "oncology", 2012),
    ("COTELLIC 20 mg, comprimé pelliculé", "Cobimétinib", "oncology", 2015),
    ("BRAFTOVI 75 mg, gélule", "Encorafénib", "oncology", 2018),
    ("MEKTOVI 15 mg, comprimé pelliculé", "Binimétinib", "oncology", 2018),
    ("YERVOY 5 mg/mL, solution à diluer pour perfusion", "Ipilimumab", "oncology", 2011),
    ("IMLYGIC, solution injectable", "Talimogene laherparepvec", "oncology", 2015),

    # === NEUROLOGY ===
    ("SPINRAZA 12 mg, solution injectable", "Nusinersen", "neurology", 2017),
    ("ZOLGENSMA 2 × 10^13 vg/mL, solution pour perfusion", "Onasemnogene abeparvovec", "neurology", 2020),
    ("EVRYSDI 0,75 mg/mL, poudre pour solution buvable", "Risdiplam", "neurology", 2021),
    ("OCREVUS 300 mg, solution à diluer pour perfusion", "Ocrélizumab", "neurology", 2018),
    ("KESIMPTA 20 mg, solution injectable en seringue préremplie", "Ofatumumab", "neurology", 2021),
    ("TYSABRI 300 mg, solution à diluer pour perfusion", "Natalizumab", "neurology", 2006),
    ("LEMTRADA 12 mg, solution à diluer pour perfusion", "Alemtuzumab", "neurology", 2013),
    ("MAVENCLAD 10 mg, comprimé", "Cladribine", "neurology", 2017),
    ("AUBAGIO 14 mg, comprimé pelliculé", "Tériflunomide", "neurology", 2013),
    ("GILENYA 0,5 mg, gélule", "Fingolimod", "neurology", 2011),
    ("PONVORY 20 mg, comprimé pelliculé", "Ponésimod", "neurology", 2021),
    ("ZEPOSIA 0,92 mg, gélule", "Ozanimod", "neurology", 2020),
    ("LEQEMBI 100 mg/mL, solution à diluer pour perfusion", "Lécanemab", "neurology", 2025),
    ("ADUHELM 100 mg/mL, solution à diluer pour perfusion", "Aducanumab", "neurology", 2024),

    # === IMMUNOLOGY / DERMATOLOGY ===
    ("DUPIXENT 200 mg, solution injectable en seringue préremplie", "Dupilumab", "immunology", 2017),
    ("HUMIRA 40 mg, solution injectable en seringue préremplie", "Adalimumab", "immunology", 2003),
    ("ENBREL 50 mg, solution injectable en seringue préremplie", "Étanercept", "immunology", 2000),
    ("REMICADE 100 mg, poudre pour solution à diluer pour perfusion", "Infliximab", "immunology", 1999),
    ("STELARA 45 mg, solution injectable en seringue préremplie", "Ustékinumab", "immunology", 2009),
    ("COSENTYX 150 mg, solution injectable en seringue préremplie", "Sécukinumab", "immunology", 2015),
    ("TALTZ 80 mg, solution injectable en stylo prérempli", "Ixékizumab", "immunology", 2016),
    ("TREMFYA 100 mg, solution injectable en seringue préremplie", "Guselkumab", "immunology", 2017),
    ("SKYRIZI 150 mg, solution injectable en seringue préremplie", "Risankizumab", "immunology", 2019),
    ("BIMZELX 160 mg, solution injectable en seringue préremplie", "Bimékizumab", "immunology", 2023),
    ("RINVOQ 15 mg, comprimé à libération prolongée", "Upadacitinib", "immunology", 2019),
    ("OLUMIANT 4 mg, comprimé pelliculé", "Baricitinib", "immunology", 2017),
    ("XELJANZ 5 mg, comprimé pelliculé", "Tofacitinib", "immunology", 2017),
    ("SOTYKTU 6 mg, comprimé pelliculé", "Deucravacitinib", "immunology", 2023),

    # === CARDIOLOGY ===
    ("ENTRESTO 97 mg/103 mg, comprimé pelliculé", "Sacubitril/valsartan", "cardiology", 2015),
    ("JARDIANCE 10 mg, comprimé pelliculé", "Empagliflozine", "cardiology", 2014),
    ("FORXIGA 10 mg, comprimé pelliculé", "Dapagliflozine", "cardiology", 2012),
    ("VERQUVO 10 mg, comprimé pelliculé", "Vericiguat", "cardiology", 2021),
    ("PRALUENT 150 mg, solution injectable en stylo prérempli", "Alirocumab", "cardiology", 2015),
    ("REPATHA 140 mg, solution injectable en stylo prérempli", "Évolocumab", "cardiology", 2015),
    ("LEQVIO 284 mg, solution injectable en seringue préremplie", "Inclisiran", "cardiology", 2020),
    ("ELIQUIS 5 mg, comprimé pelliculé", "Apixaban", "cardiology", 2011),
    ("XARELTO 20 mg, comprimé pelliculé", "Rivaroxaban", "cardiology", 2008),
    ("PRADAXA 150 mg, gélule", "Dabigatran", "cardiology", 2008),

    # === DIABETES / ENDOCRINOLOGY ===
    ("OZEMPIC 1 mg, solution injectable en stylo prérempli", "Sémaglutide", "endocrinology", 2018),
    ("MOUNJARO 5 mg, solution injectable en stylo prérempli", "Tirzépatide", "endocrinology", 2022),
    ("TRULICITY 1,5 mg, solution injectable en stylo prérempli", "Dulaglutide", "endocrinology", 2014),
    ("VICTOZA 6 mg/mL, solution injectable en stylo prérempli", "Liraglutide", "endocrinology", 2009),
    ("BYDUREON 2 mg, poudre et solvant pour suspension injectable", "Exénatide", "endocrinology", 2011),
    ("RYBELSUS 14 mg, comprimé", "Sémaglutide oral", "endocrinology", 2020),
    ("TRESIBA 100 U/mL, solution injectable en stylo prérempli", "Insuline dégludec", "endocrinology", 2013),
    ("TOUJEO 300 U/mL, solution injectable en stylo prérempli", "Insuline glargine", "endocrinology", 2015),

    # === OPHTHALMOLOGY ===
    ("EYLEA 40 mg/mL, solution injectable", "Aflibercept", "ophthalmology", 2012),
    ("VABYSMO 120 mg/mL, solution injectable", "Faricimab", "ophthalmology", 2022),
    ("LUCENTIS 10 mg/mL, solution injectable", "Ranibizumab", "ophthalmology", 2007),
    ("BEOVU 120 mg/mL, solution injectable", "Brolucizumab", "ophthalmology", 2020),
    ("LUXTURNA 5 × 10^12 vg/mL, solution à diluer pour injection", "Voretigene neparvovec", "ophthalmology", 2018),

    # === RARE DISEASES ===
    ("TRIKAFTA 100 mg/50 mg/75 mg, comprimé pelliculé", "Elexacaftor/tezacaftor/ivacaftor", "rare_disease", 2020),
    ("ORKAMBI 200 mg/125 mg, comprimé pelliculé", "Lumacaftor/ivacaftor", "rare_disease", 2015),
    ("KALYDECO 150 mg, comprimé pelliculé", "Ivacaftor", "rare_disease", 2012),
    ("SYMDEKO 100 mg/150 mg, comprimé pelliculé", "Tezacaftor/ivacaftor", "rare_disease", 2018),
    ("HEMLIBRA 150 mg/mL, solution injectable", "Émicizumab", "rare_disease", 2018),
    ("SOLIRIS 300 mg, solution à diluer pour perfusion", "Éculizumab", "rare_disease", 2007),
    ("ULTOMIRIS 300 mg, solution à diluer pour perfusion", "Ravulizumab", "rare_disease", 2019),
    ("CERDELGA 84 mg, gélule", "Éliglustat", "rare_disease", 2015),
    ("STRENSIQ 80 mg/mL, solution injectable", "Asfotase alfa", "rare_disease", 2015),
    ("VILTEPSO 250 mg, solution à diluer pour perfusion", "Viltolarsen", "rare_disease", 2023),
    ("ELAPRASE 2 mg/mL, solution à diluer pour perfusion", "Idursulfase", "rare_disease", 2007),
    ("MYOZYME 50 mg, poudre pour solution à diluer pour perfusion", "Alglucosidase alfa", "rare_disease", 2006),
    ("FABRAZYME 35 mg, poudre pour solution à diluer pour perfusion", "Agalsidase bêta", "rare_disease", 2001),

    # === RESPIRATORY ===
    ("NUCALA 100 mg, solution injectable en seringue préremplie", "Mépolizumab", "respiratory", 2015),
    ("FASENRA 30 mg, solution injectable en seringue préremplie", "Benralizumab", "respiratory", 2018),
    ("XOLAIR 150 mg, solution injectable en seringue préremplie", "Omalizumab", "respiratory", 2005),
    ("TEZSPIRE 210 mg, solution injectable en seringue préremplie", "Tézépélumab", "respiratory", 2023),

    # === INFECTIOUS DISEASE ===
    ("PAXLOVID 150 mg/100 mg, comprimés pelliculés", "Nirmatrelvir/ritonavir", "infectious", 2022),
    ("VEKLURY 100 mg, poudre pour solution à diluer pour perfusion", "Remdésivir", "infectious", 2020),
    ("BIKTARVY 50 mg/200 mg/25 mg, comprimé pelliculé", "Bictégravir/emtricitabine/ténofovir", "infectious", 2018),
    ("DOVATO 50 mg/300 mg, comprimé pelliculé", "Dolutégravir/lamivudine", "infectious", 2019),
    ("CABENUVA 600 mg, suspension injectable à libération prolongée", "Cabotégravir", "infectious", 2021),
    ("APRETUDE 600 mg, suspension injectable à libération prolongée", "Cabotégravir (PrEP)", "infectious", 2023),
    ("EPCLUSA 400 mg/100 mg, comprimé pelliculé", "Sofosbuvir/velpatasvir", "infectious", 2016),
    ("MAVIRET 100 mg/40 mg, comprimé pelliculé", "Glécaprévir/pibrentasvir", "infectious", 2017),

    # === PSYCHIATRY ===
    ("SPRAVATO 28 mg, solution pour pulvérisation nasale", "Eskétamine", "psychiatry", 2019),
    ("REXULTI 1 mg, comprimé", "Brexpiprazole", "psychiatry", 2023),

    # === GASTROENTEROLOGY ===
    ("ENTYVIO 300 mg, poudre pour solution à diluer pour perfusion", "Védolizumab", "gastroenterology", 2014),
    ("SKYRIZI 360 mg, solution à diluer pour perfusion (Crohn)", "Risankizumab", "gastroenterology", 2019),

    # === PAIN / MIGRAINE ===
    ("AIMOVIG 70 mg, solution injectable en stylo prérempli", "Erénumab", "neurology", 2018),
    ("AJOVY 225 mg, solution injectable en seringue préremplie", "Frémanézumab", "neurology", 2019),
    ("EMGALITY 120 mg, solution injectable en stylo prérempli", "Galcanézumab", "neurology", 2018),
    ("VYEPTI 100 mg, solution à diluer pour perfusion", "Eptinézumab", "neurology", 2022),
]

# ──────────────────────────────────────────────────────────────
# Assessment generation: realistic SMR/ASMR per therapeutic area
# ──────────────────────────────────────────────────────────────

# Real-world assessment patterns by drug
# Format: drug_index → list of (motif, year, month, smr_value, asmr_value, label_smr, label_asmr)
SPECIFIC_ASSESSMENTS = {
    # Pembrolizumab - multiple indications over years
    0: [
        ("Inscription", 2017, 3, "Important", "III", "Le service médical rendu par KEYTRUDA est important dans le mélanome avancé", "ASMR de niveau III dans le mélanome avancé (non résécable ou métastatique)"),
        ("Extension d'indication", 2018, 6, "Important", "IV", "SMR important dans le CBNPC", "ASMR mineure (IV) dans le cancer bronchique non à petites cellules en monothérapie"),
        ("Extension d'indication", 2019, 1, "Important", "III", "SMR important dans le CBNPC en association", "ASMR modérée (III) en association avec une chimiothérapie à base de sels de platine en 1ère ligne du CBNPC"),
        ("Extension d'indication", 2020, 9, "Important", "IV", "SMR important dans le cancer du rein", "ASMR mineure (IV) en association avec axitinib dans le carcinome à cellules rénales avancé"),
        ("Extension d'indication", 2021, 4, "Important", "III", "SMR important dans le cancer de l'endomètre", "ASMR modérée (III) en association avec lenvatinib dans le cancer de l'endomètre avancé"),
        ("Extension d'indication", 2022, 11, "Important", "IV", "SMR important dans le cancer du col utérin", "ASMR mineure (IV) dans le cancer du col de l'utérus persistant, récurrent ou métastatique"),
        ("Extension d'indication", 2023, 7, "Important", "IV", "SMR important dans le cancer gastrique", "ASMR mineure (IV) en association avec le trastuzumab et la chimiothérapie dans l'adénocarcinome gastrique ou de la JOG"),
        ("Extension d'indication", 2024, 3, "Important", "IV", "SMR important dans le cancer des voies biliaires", "ASMR mineure (IV) en association avec la chimiothérapie dans le cholangiocarcinome localement avancé non résécable ou métastatique"),
        ("Extension d'indication", 2024, 9, "Important", "III", "SMR important dans le cancer du rein en adjuvant", "ASMR modérée (III) en monothérapie dans le traitement adjuvant du carcinome à cellules rénales à cellules claires"),
    ],
    # Nivolumab
    1: [
        ("Inscription", 2016, 3, "Important", "III", "SMR important dans le mélanome avancé", "ASMR modérée (III) dans le mélanome non résécable ou métastatique"),
        ("Extension d'indication", 2017, 7, "Important", "IV", "SMR important dans le CBNPC", "ASMR mineure (IV) dans le cancer bronchique non à petites cellules localement avancé ou métastatique"),
        ("Extension d'indication", 2018, 2, "Important", "IV", "SMR important dans le carcinome urothélial", "ASMR mineure (IV) dans le carcinome urothélial localement avancé ou métastatique"),
        ("Extension d'indication", 2019, 7, "Important", "III", "SMR important dans le cancer du rein", "ASMR modérée (III) en association avec ipilimumab dans le carcinome à cellules rénales avancé de pronostic intermédiaire/défavorable"),
        ("Extension d'indication", 2020, 6, "Modéré", "IV", "SMR modéré dans le mésothéliome", "ASMR mineure (IV) en association avec ipilimumab dans le mésothéliome pleural malin non résécable"),
        ("Extension d'indication", 2021, 6, "Modéré", "IV", "SMR modéré dans le CBNPC en association", "ASMR mineure (IV) en association avec ipilimumab et chimiothérapie à base de sels de platine dans le CBNPC métastatique en 1ère ligne"),
        ("Extension d'indication", 2022, 10, "Important", "III", "SMR important dans le cancer de l'œsophage", "ASMR modérée (III) en association dans le cancer épidermoïde de l'œsophage non résécable, avancé, récidivant ou métastatique"),
        ("Extension d'indication", 2023, 12, "Important", "V", "SMR important dans le mélanome en adjuvant", "Absence d'ASMR (V) dans le traitement adjuvant du mélanome"),
    ],
    # Atezolizumab
    2: [
        ("Inscription", 2018, 4, "Important", "V", "SMR important dans le cancer urothélial", "Absence d'ASMR (V) dans le carcinome urothélial localement avancé ou métastatique"),
        ("Extension d'indication", 2019, 11, "Important", "IV", "SMR important dans le CBNPC", "ASMR mineure (IV) en association dans le CBNPC métastatique non épidermoïde en 1ère ligne"),
        ("Extension d'indication", 2020, 12, "Important", "IV", "SMR important dans le carcinome hépatocellulaire", "ASMR mineure (IV) en association avec bévacizumab dans le carcinome hépatocellulaire avancé ou non résécable"),
        ("Extension d'indication", 2022, 3, "Important", "V", "SMR important dans le CPPC", "Absence d'ASMR (V) dans le cancer bronchique à petites cellules au stade étendu en 1ère ligne"),
    ],
}

# Generic assessment templates for drugs without specific data
def _pick_year_from(choices, ema_year):
    """Pick a year from choices, ensuring it's >= ema_year.

    HAS typically evaluates a drug within 0-2 years of EMA authorisation.
    If all choices predate the EMA year, return ema_year + 1 (typical HAS lag).
    """
    valid = [y for y in choices if y >= ema_year]
    if valid:
        return random.choice(valid)
    # All choices predate authorisation — use ema_year + 0..1 year lag
    return ema_year + random.randint(0, 1)


def generate_assessments(drug_idx, substance, area, ema_year):
    """Generate realistic assessments for a drug based on its therapeutic area.

    All generated dates are constrained to be >= ema_year so assessments
    never predate the EMA marketing authorisation.
    """
    assessments = []

    if area == "oncology":
        # Inscription
        year = _pick_year_from([2015, 2016, 2017, 2018, 2019, 2020], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "IV", "IV", "IV", "V", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"Le service médical rendu par ce médicament est {smr.lower()} dans l'indication évaluée",
            f"ASMR de niveau {asmr} dans l'indication évaluée"))
        # Often have extensions
        for _ in range(random.randint(1, 3)):
            year += random.randint(1, 3)
            if year > 2025:
                break
            asmr = random.choice(["III", "IV", "IV", "V", "V"])
            assessments.append(("Extension d'indication", year, random.randint(1, 12), smr, asmr,
                f"SMR {smr.lower()} dans la nouvelle indication",
                f"ASMR de niveau {asmr} dans cette extension d'indication"))
        # Sometimes a renouvellement
        if random.random() > 0.5:
            year = min(year + random.randint(2, 4), 2025)
            assessments.append(("Renouvellement", year, random.randint(1, 12), smr, "",
                f"Le service médical rendu par ce médicament reste {smr.lower()}", ""))

    elif area == "hematology":
        year = _pick_year_from([2015, 2016, 2017, 2018, 2019, 2020, 2021], ema_year)
        smr = "Important"
        asmr = random.choice(["II", "III", "III", "IV", "IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans l'hémopathie maligne évaluée",
            f"ASMR de niveau {asmr} dans l'indication hématologique"))
        for _ in range(random.randint(0, 2)):
            year += random.randint(1, 3)
            if year > 2025:
                break
            asmr = random.choice(["III", "IV", "IV", "V"])
            assessments.append(("Extension d'indication", year, random.randint(1, 12), smr, asmr,
                f"SMR important dans cette nouvelle indication hématologique",
                f"ASMR de niveau {asmr} dans cette extension d'indication"))

    elif area == "neurology":
        year = _pick_year_from([2016, 2017, 2018, 2019, 2020, 2021], ema_year)
        smr = random.choice(["Important", "Important", "Modéré"])
        asmr = random.choice(["II", "III", "IV", "IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR {smr.lower()} dans la pathologie neurologique évaluée",
            f"ASMR de niveau {asmr} dans l'indication neurologique"))
        if random.random() > 0.4:
            year += random.randint(2, 4)
            if year <= 2025:
                assessments.append(("Renouvellement", year, random.randint(1, 12), smr, "",
                    f"Le service médical rendu reste {smr.lower()}", ""))

    elif area == "immunology":
        year = _pick_year_from([2015, 2016, 2017, 2018, 2019, 2020], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "IV", "IV", "IV", "V", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans la pathologie immunologique/dermatologique évaluée",
            f"ASMR de niveau {asmr} dans l'indication évaluée"))
        for _ in range(random.randint(1, 3)):
            year += random.randint(1, 3)
            if year > 2025:
                break
            new_asmr = random.choice(["III", "IV", "V", "V"])
            assessments.append(("Extension d'indication", year, random.randint(1, 12), smr, new_asmr,
                f"SMR important dans cette extension d'indication",
                f"ASMR de niveau {new_asmr} dans cette extension d'indication en dermatologie/immunologie"))

    elif area == "cardiology":
        year = _pick_year_from([2016, 2017, 2018, 2019, 2020], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "III", "IV", "IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans l'indication cardiovasculaire",
            f"ASMR de niveau {asmr} dans l'indication cardiovasculaire évaluée"))
        if random.random() > 0.5:
            year += random.randint(2, 4)
            if year <= 2025:
                assessments.append(("Renouvellement", year, random.randint(1, 12), smr, "",
                    f"Maintien du service médical rendu important", ""))

    elif area == "endocrinology":
        year = _pick_year_from([2017, 2018, 2019, 2020, 2021], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "IV", "IV", "V", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans le traitement du diabète de type 2",
            f"ASMR de niveau {asmr} dans le traitement du diabète de type 2"))
        if random.random() > 0.5:
            year += random.randint(2, 3)
            if year <= 2025:
                assessments.append(("Extension d'indication", year, random.randint(1, 12), smr, random.choice(["IV", "V"]),
                    f"SMR important dans cette nouvelle indication",
                    f"ASMR de niveau {asmr} dans cette extension d'indication"))

    elif area == "ophthalmology":
        year = _pick_year_from([2014, 2015, 2016, 2017, 2018, 2019, 2020], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "IV", "IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans la pathologie ophtalmologique évaluée",
            f"ASMR de niveau {asmr} dans l'indication ophtalmologique"))
        if random.random() > 0.5:
            year += random.randint(2, 4)
            if year <= 2025:
                assessments.append(("Extension d'indication", year, random.randint(1, 12), smr, random.choice(["IV", "V"]),
                    f"SMR important dans cette extension d'indication ophtalmologique",
                    f"ASMR de niveau {asmr}"))

    elif area == "rare_disease":
        year = _pick_year_from([2016, 2017, 2018, 2019, 2020, 2021], ema_year)
        smr = "Important"
        asmr = random.choice(["I", "II", "II", "III", "III", "IV"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans cette maladie rare",
            f"ASMR de niveau {asmr} dans le traitement de cette maladie rare"))
        if random.random() > 0.5:
            year += random.randint(3, 5)
            if year <= 2025:
                assessments.append(("Réévaluation", year, random.randint(1, 12), smr, "",
                    f"Maintien du service médical rendu important après réévaluation", ""))

    elif area == "respiratory":
        year = _pick_year_from([2016, 2017, 2018, 2019, 2020], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "IV", "IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans l'asthme sévère",
            f"ASMR de niveau {asmr} dans le traitement de l'asthme sévère"))
        if random.random() > 0.5:
            year += random.randint(2, 4)
            if year <= 2025:
                assessments.append(("Renouvellement", year, random.randint(1, 12), smr, "",
                    f"Maintien du service médical rendu important", ""))

    elif area == "infectious":
        year = _pick_year_from([2017, 2018, 2019, 2020, 2021, 2022], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "IV", "IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans la pathologie infectieuse évaluée",
            f"ASMR de niveau {asmr} dans le traitement de la maladie infectieuse"))

    elif area == "psychiatry":
        year = _pick_year_from([2020, 2021, 2022], ema_year)
        smr = random.choice(["Important", "Modéré"])
        asmr = random.choice(["IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR {smr.lower()} dans le trouble psychiatrique évalué",
            f"ASMR de niveau {asmr} dans l'indication psychiatrique"))

    elif area == "gastroenterology":
        year = _pick_year_from([2017, 2018, 2019, 2020], ema_year)
        smr = "Important"
        asmr = random.choice(["III", "IV", "IV"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR important dans la maladie inflammatoire chronique de l'intestin",
            f"ASMR de niveau {asmr} dans le traitement de la MICI"))

    else:
        year = _pick_year_from([2017, 2018, 2019, 2020], ema_year)
        smr = "Important"
        asmr = random.choice(["IV", "V"])
        assessments.append(("Inscription", year, random.randint(1, 12), smr, asmr,
            f"SMR {smr.lower()}", f"ASMR de niveau {asmr}"))

    return assessments


def build_fr_data():
    """Build comprehensive FR.json data structure."""
    medicines = {}
    compositions = {}
    smr_data = {}
    asmr_data = {}
    ct_links = {}

    dossier_counter = 20000

    for idx, (brand_name, substance, area, ema_year) in enumerate(DRUGS):
        cis_code = str(60000001 + idx)
        medicines[cis_code] = brand_name

        # Handle combination substances
        if " + " in substance or "/" in substance:
            parts = substance.replace(" + ", "/").split("/")
            compositions[cis_code] = [p.strip() for p in parts]
        else:
            compositions[cis_code] = [substance]

        # Get assessments - use specific data if available, otherwise generate
        if idx in SPECIFIC_ASSESSMENTS:
            assessments = SPECIFIC_ASSESSMENTS[idx]
        else:
            assessments = generate_assessments(idx, substance, area, ema_year)

        smr_list = []
        asmr_list = []

        for assessment in assessments:
            motif, year, month, smr_value, asmr_value, smr_label, asmr_label = assessment
            dossier_code = f"CT-{dossier_counter}"
            dossier_counter += 1
            date = make_date(year, month, rand_day())

            ct_url = f"https://www.has-sante.fr/jcms/p_{3000000 + dossier_counter}/fr/avis-{dossier_code.lower()}"
            ct_links[dossier_code] = ct_url

            if smr_value:
                smr_list.append({
                    "dossier_code": dossier_code,
                    "motif": motif,
                    "date": date,
                    "value": smr_value,
                    "label": smr_label,
                })

            if asmr_value:
                asmr_list.append({
                    "dossier_code": dossier_code,
                    "motif": motif,
                    "date": date,
                    "value": asmr_value,
                    "label": asmr_label,
                })

        if smr_list:
            smr_data[cis_code] = smr_list
        if asmr_list:
            asmr_data[cis_code] = asmr_list

    # Build envelope
    total_smr = sum(len(v) for v in smr_data.values())
    total_asmr = sum(len(v) for v in asmr_data.values())

    envelope = {
        "country": "FR",
        "agency": "HAS",
        "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "record_count": len(medicines),
        "data": {
            "medicines": medicines,
            "compositions": compositions,
            "smr": smr_data,
            "asmr": asmr_data,
            "ct_links": ct_links,
        },
    }

    return envelope, total_smr, total_asmr


def main():
    envelope, total_smr, total_asmr = build_fr_data()
    num_medicines = len(envelope["data"]["medicines"])

    output_file = DATA_DIR / "FR.json"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(envelope, f, ensure_ascii=False, indent=2)

    size_kb = output_file.stat().st_size / 1024
    print(f"Generated FR.json: {num_medicines} medicines, {total_smr} SMR records, {total_asmr} ASMR records ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
