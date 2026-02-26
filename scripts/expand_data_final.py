#!/usr/bin/env python3
"""
Final comprehensive expansion of Mexico Compra Consolidada seed data.

Adds ~46 new claves across new and existing therapeutic groups to reach
120+ claves covering the full pharmaceutical landscape of Mexico's
public health procurement.

New therapeutic groups:
- Antifúngicos (hospital antifungals)
- Urgencias y Terapia Intensiva (emergency/ICU drugs)
- Ginecología y Obstetricia
- Urología

Expanded existing groups:
- Gastroenterología (was 1, adding 3)
- Psiquiatría (was 2, adding 4)
- Neumología (was 2, adding 3)
- Trasplantes (was 2, adding 2)
- Nefrología (was 2, adding 2)
- Antibióticos (was 4, adding 3)
- Cardiología (was 6, adding 3)
- Dolor y Anestesia (was 3, adding 3)
- Oncología (was 20, adding 5 — chemo backbone + supportive)
- Hematología (was 5, adding 1)
- Infectología (was 5, adding 1)
- Vacunas (was 2, adding 1)
"""

import json
import random
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "data" / "mexico_procurement.json"

# Load existing data
with open(DATA_FILE) as f:
    data = json.load(f)

existing_claves = {c["clave"] for c in data["claves"]}


def gen_clave(group_num, seq):
    """Generate a realistic clave number."""
    return f"010.000.{group_num:04d}.{seq:02d}"


# ── NEW CLAVES ───────────────────────────────────────────────────────

NEW_CLAVES = [
    # ── Gastroenterología expansion (was 1: omeprazol) ──
    {
        "clave": "010.000.2135.00",
        "description": "PANTOPRAZOL. Solución inyectable 40 mg. Envase con frasco ámpula y diluyente.",
        "active_substance": "pantoprazol",
        "atc_code": "A02BC02",
        "therapeutic_group": "Gastroenterología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0412SSA2002",
        "indication": "Úlcera gástrica, úlcera duodenal, ERGE, síndrome de Zollinger-Ellison, profilaxis de úlcera por estrés en UCI",
        "mechanism_of_action": "Inhibidor de bomba de protones. Bloquea la H+/K+-ATPasa en las células parietales gástricas.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2010-01",
    },
    {
        "clave": "010.000.2136.00",
        "description": "MESALAZINA. Tableta de liberación prolongada 500 mg. Envase con 60 tabletas.",
        "active_substance": "mesalazina",
        "atc_code": "A07EC02",
        "therapeutic_group": "Gastroenterología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0580SSA1998",
        "indication": "Colitis ulcerosa crónica inespecífica, enfermedad de Crohn con afectación colónica",
        "mechanism_of_action": "Antiinflamatorio intestinal. Actúa localmente inhibiendo la producción de prostaglandinas y leucotrienos en la mucosa colónica.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2005-01",
    },
    {
        "clave": "010.000.2137.00",
        "description": "OCTREOTIDA. Solución inyectable 0.1 mg/mL. Envase con 3 ampolletas de 1 mL.",
        "active_substance": "octreotida",
        "atc_code": "H01CB02",
        "therapeutic_group": "Gastroenterología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0815SSA1999",
        "indication": "Acromegalia, tumores neuroendocrinos, hemorragia variceal, fístulas pancreáticas",
        "mechanism_of_action": "Análogo de somatostatina. Inhibe la secreción de hormona del crecimiento, glucagón, insulina y otras hormonas gastrointestinales.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2007-01",
    },

    # ── Psiquiatría expansion (was 2: clozapina, paliperidona) ──
    {
        "clave": "010.000.2505.00",
        "description": "RISPERIDONA. Tableta 2 mg. Envase con 40 tabletas.",
        "active_substance": "risperidona",
        "atc_code": "N05AX08",
        "therapeutic_group": "Psiquiatría",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0498SSA1997",
        "indication": "Esquizofrenia, trastorno bipolar, irritabilidad asociada a trastorno autista",
        "mechanism_of_action": "Antipsicótico atípico. Antagonista de receptores dopaminérgicos D2 y serotoninérgicos 5-HT2A.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2008-01",
    },
    {
        "clave": "010.000.2510.00",
        "description": "SERTRALINA. Cápsula o tableta 50 mg. Envase con 14 tabletas.",
        "active_substance": "sertralina",
        "atc_code": "N06AB06",
        "therapeutic_group": "Psiquiatría",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0499SSA1997",
        "indication": "Depresión mayor, trastorno obsesivo-compulsivo, trastorno de pánico, trastorno de estrés postraumático, fobia social",
        "mechanism_of_action": "Inhibidor selectivo de la recaptación de serotonina (ISRS).",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2006-01",
    },
    {
        "clave": "010.000.2515.00",
        "description": "VALPROATO DE MAGNESIO. Tableta de liberación prolongada 600 mg. Envase con 30 tabletas.",
        "active_substance": "valproato de magnesio",
        "atc_code": "N03AG01",
        "therapeutic_group": "Psiquiatría",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0352SSA1995",
        "indication": "Epilepsia, trastorno bipolar (fase maníaca), migraña profiláctica",
        "mechanism_of_action": "Antiepiléptico y estabilizador del ánimo. Aumenta la actividad del GABA y bloquea canales de sodio dependientes de voltaje.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2002-01",
    },
    {
        "clave": "010.000.2520.00",
        "description": "HALOPERIDOL. Solución inyectable 5 mg/mL. Envase con 6 ampolletas de 1 mL.",
        "active_substance": "haloperidol",
        "atc_code": "N05AD01",
        "therapeutic_group": "Psiquiatría",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0125SSA1985",
        "indication": "Esquizofrenia, estados psicóticos agudos, agitación, delirium, corea de Huntington, náusea y vómito severo",
        "mechanism_of_action": "Antipsicótico típico (butirofenona). Antagonista potente de receptores dopaminérgicos D2.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },

    # ── Neumología expansion (was 2: budesonida/formoterol, nintedanib) ──
    {
        "clave": "010.000.2605.00",
        "description": "SALBUTAMOL. Suspensión en aerosol 100 μg/dosis. Envase presurizado con 200 dosis.",
        "active_substance": "salbutamol",
        "atc_code": "R03AC02",
        "therapeutic_group": "Neumología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0180SSA1988",
        "indication": "Asma bronquial, EPOC, broncoespasmo agudo, profilaxis del broncoespasmo inducido por ejercicio",
        "mechanism_of_action": "Agonista selectivo de receptores β2-adrenérgicos. Produce relajación del músculo liso bronquial.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.2610.00",
        "description": "TIOTROPIO. Solución para inhalación 2.5 μg/dosis. Envase con cartucho e inhalador (60 dosis).",
        "active_substance": "tiotropio",
        "atc_code": "R03BB04",
        "therapeutic_group": "Neumología",
        "source_type": "patente",
        "cnis_listed": True,
        "cofepris_registry": "1125SSA2005",
        "indication": "EPOC (mantenimiento), asma no controlada como terapia adyuvante",
        "mechanism_of_action": "Anticolinérgico de acción prolongada. Antagonista de receptores muscarínicos M3 en el músculo liso bronquial.",
        "patent_holder": "Boehringer Ingelheim",
        "patent_expiry": "2025-03",
    },
    {
        "clave": "010.000.2615.00",
        "description": "FLUTICASONA/SALMETEROL. Polvo para inhalación 250/50 μg/dosis. Envase con dispositivo para 60 dosis.",
        "active_substance": "fluticasona/salmeterol",
        "atc_code": "R03AK06",
        "therapeutic_group": "Neumología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0920SSA2001",
        "indication": "Asma bronquial persistente moderada a grave, EPOC con exacerbaciones frecuentes",
        "mechanism_of_action": "Combinación de corticosteroide inhalado (fluticasona) + agonista β2 de acción prolongada (salmeterol). Reduce inflamación bronquial y broncoconstricción.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2016-01",
    },

    # ── Trasplantes expansion (was 2: tacrolimus, micofenolato) ──
    {
        "clave": "010.000.2705.00",
        "description": "CICLOSPORINA. Cápsula de gelatina blanda 100 mg. Envase con 50 cápsulas.",
        "active_substance": "ciclosporina",
        "atc_code": "L04AD01",
        "therapeutic_group": "Trasplantes",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0290SSA1993",
        "indication": "Prevención de rechazo en trasplante de órgano sólido (riñón, hígado, corazón), nefritis lúpica, psoriasis grave, artritis reumatoide grave",
        "mechanism_of_action": "Inmunosupresor (inhibidor de calcineurina). Bloquea la activación de linfocitos T al inhibir la transcripción de IL-2.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2003-01",
    },
    {
        "clave": "010.000.2710.00",
        "description": "BASILIXIMAB. Solución inyectable 20 mg. Envase con frasco ámpula y diluyente.",
        "active_substance": "basiliximab",
        "atc_code": "L04AC02",
        "therapeutic_group": "Trasplantes",
        "source_type": "patente",
        "cnis_listed": True,
        "cofepris_registry": "0880SSA2000",
        "indication": "Inducción de inmunosupresión en trasplante renal. Prevención de rechazo agudo en combinación con ciclosporina y corticosteroides.",
        "mechanism_of_action": "Anticuerpo monoclonal quimérico anti-CD25 (anti-receptor de IL-2). Inhibe la activación de linfocitos T alorreactivos.",
        "patent_holder": "Novartis",
        "patent_expiry": "2024-01",
    },

    # ── Nefrología expansion (was 2: EPO, darbepoetina) ──
    {
        "clave": "010.000.2805.00",
        "description": "SEVELÁMERO. Tableta 800 mg. Envase con 180 tabletas.",
        "active_substance": "sevelámero",
        "atc_code": "V03AE02",
        "therapeutic_group": "Nefrología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0940SSA2001",
        "indication": "Hiperfosfatemia en pacientes con enfermedad renal crónica en diálisis",
        "mechanism_of_action": "Quelante de fósforo no absorbible. Polímero catiónico que se une a fosfato en el tracto GI impidiendo su absorción.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2014-01",
    },
    {
        "clave": "010.000.2810.00",
        "description": "CALCITRIOL. Cápsula de gelatina blanda 0.25 μg. Envase con 50 cápsulas.",
        "active_substance": "calcitriol",
        "atc_code": "A11CC04",
        "therapeutic_group": "Nefrología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0260SSA1992",
        "indication": "Osteodistrofia renal, hipoparatiroidismo, hiperparatiroidismo secundario en ERC",
        "mechanism_of_action": "Forma activa de vitamina D3 (1,25-dihidroxicolecalciferol). Regula absorción de calcio y fósforo, suprime PTH.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1995-01",
    },

    # ── Antibióticos expansion (was 4, adding 3) ──
    {
        "clave": "010.000.1915.00",
        "description": "CIPROFLOXACINO. Solución inyectable 200 mg/100 mL. Envase con frasco ámpula con 100 mL.",
        "active_substance": "ciprofloxacino",
        "atc_code": "J01MA02",
        "therapeutic_group": "Antibióticos",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0285SSA1993",
        "indication": "Infecciones urinarias complicadas, infecciones intraabdominales, infecciones respiratorias, osteomielitis, anthrax",
        "mechanism_of_action": "Fluoroquinolona. Inhibe la ADN-girasa y la topoisomerasa IV bacterianas, impidiendo la replicación del ADN.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2004-01",
    },
    {
        "clave": "010.000.1920.00",
        "description": "CLINDAMICINA. Solución inyectable 300 mg/2 mL. Envase con 5 ampolletas.",
        "active_substance": "clindamicina",
        "atc_code": "J01FF01",
        "therapeutic_group": "Antibióticos",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0150SSA1986",
        "indication": "Infecciones por anaerobios, infecciones de piel y tejidos blandos, infecciones pélvicas, osteomielitis, profilaxis de endocarditis",
        "mechanism_of_action": "Lincosamida. Se une a la subunidad ribosomal 50S bacteriana inhibiendo la síntesis de proteínas.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.1925.00",
        "description": "AMIKACINA. Solución inyectable 500 mg/2 mL. Envase con 1 frasco ámpula.",
        "active_substance": "amikacina",
        "atc_code": "J01GB06",
        "therapeutic_group": "Antibióticos",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0148SSA1986",
        "indication": "Infecciones graves por gram negativos resistentes, septicemia, infecciones urinarias complicadas, meningitis, infecciones intraabdominales",
        "mechanism_of_action": "Aminoglucósido. Se une irreversiblemente a la subunidad ribosomal 30S bacteriana, inhibiendo la síntesis de proteínas.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },

    # ── Cardiología expansion (was 6, adding 3) ──
    {
        "clave": "010.000.2015.00",
        "description": "CLOPIDOGREL. Tableta 75 mg. Envase con 14 tabletas.",
        "active_substance": "clopidogrel",
        "atc_code": "B01AC04",
        "therapeutic_group": "Cardiología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0875SSA2000",
        "indication": "Prevención de eventos aterotrombóticos (IAM, EVC, enfermedad arterial periférica), síndrome coronario agudo con o sin stent",
        "mechanism_of_action": "Antiagregante plaquetario (tienopiridina). Inhibe irreversiblemente el receptor P2Y12 de ADP en las plaquetas.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2012-01",
    },
    {
        "clave": "010.000.2020.00",
        "description": "ÁCIDO ACETILSALICÍLICO. Tableta 100 mg. Envase con 28 tabletas.",
        "active_substance": "ácido acetilsalicílico",
        "atc_code": "B01AC06",
        "therapeutic_group": "Cardiología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0010SSA1980",
        "indication": "Prevención secundaria de eventos cardiovasculares (IAM, EVC), antiagregación plaquetaria post-stent, preeclampsia",
        "mechanism_of_action": "Antiagregante plaquetario. Inhibe irreversiblemente la ciclooxigenasa-1 (COX-1) plaquetaria, reduciendo la producción de tromboxano A2.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1900-01",
    },
    {
        "clave": "010.000.2025.00",
        "description": "METOPROLOL. Tableta de liberación prolongada 100 mg. Envase con 20 tabletas.",
        "active_substance": "metoprolol",
        "atc_code": "C07AB02",
        "therapeutic_group": "Cardiología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0200SSA1989",
        "indication": "Hipertensión arterial, angina de pecho, insuficiencia cardíaca, arritmias supraventriculares, prevención secundaria post-IAM",
        "mechanism_of_action": "Betabloqueador cardioselectivo (β1). Reduce frecuencia cardíaca, gasto cardíaco y presión arterial.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1995-01",
    },

    # ── Dolor y Anestesia expansion (was 3, adding 3) ──
    {
        "clave": "010.000.2905.00",
        "description": "METAMIZOL SÓDICO. Solución inyectable 1 g/2 mL. Envase con 3 ampolletas de 2 mL.",
        "active_substance": "metamizol sódico",
        "atc_code": "N02BB02",
        "therapeutic_group": "Dolor y Anestesia",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0130SSA1985",
        "indication": "Dolor agudo moderado a severo, dolor postoperatorio, fiebre resistente a otros antipiréticos, cólico renal y biliar",
        "mechanism_of_action": "Analgésico-antipirético (pirrazolona). Inhibe la síntesis de prostaglandinas a nivel central y periférico.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },
    {
        "clave": "010.000.2910.00",
        "description": "KETOROLACO TROMETAMINA. Solución inyectable 30 mg/mL. Envase con 3 ampolletas de 1 mL.",
        "active_substance": "ketorolaco",
        "atc_code": "M01AB15",
        "therapeutic_group": "Dolor y Anestesia",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0370SSA1995",
        "indication": "Dolor agudo moderado a severo, dolor postoperatorio (uso a corto plazo ≤5 días)",
        "mechanism_of_action": "AINE (ácido arilacético). Potente inhibidor no selectivo de ciclooxigenasa (COX-1 y COX-2). Analgésico más potente que antipirético.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2003-01",
    },
    {
        "clave": "010.000.2915.00",
        "description": "PARACETAMOL. Solución inyectable 10 mg/mL. Envase con frasco con 100 mL.",
        "active_substance": "paracetamol",
        "atc_code": "N02BE01",
        "therapeutic_group": "Dolor y Anestesia",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0060SSA1982",
        "indication": "Dolor leve a moderado, fiebre, analgesia postoperatoria multimodal",
        "mechanism_of_action": "Analgésico-antipirético. Inhibe la síntesis de prostaglandinas predominantemente a nivel central (COX-3).",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1960-01",
    },

    # ── Oncología expansion (was 20, adding 5 — chemo backbone + supportive) ──
    {
        "clave": "010.000.5460.00",
        "description": "CARBOPLATINO. Solución inyectable 150 mg. Envase con frasco ámpula con 15 mL.",
        "active_substance": "carboplatino",
        "atc_code": "L01XA02",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0310SSA1994",
        "indication": "Carcinoma de ovario avanzado, NSCLC, carcinoma endometrial, tumores de células germinales",
        "mechanism_of_action": "Compuesto de platino. Forma aductos con el ADN produciendo entrecruzamiento inter e intracatenario que inhibe la replicación y transcripción.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2004-01",
    },
    {
        "clave": "010.000.5461.00",
        "description": "CISPLATINO. Solución inyectable 50 mg. Envase con frasco ámpula con 50 mL.",
        "active_substance": "cisplatino",
        "atc_code": "L01XA01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0245SSA1991",
        "indication": "Carcinoma testicular, ovario, vejiga, cabeza y cuello, pulmón, cérvix, esofágico",
        "mechanism_of_action": "Compuesto de platino (alquilante). Se une al ADN formando aductos intra e intercatenarios que inhiben la replicación celular.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.5462.00",
        "description": "PACLITAXEL. Solución inyectable 100 mg/16.7 mL. Envase con frasco ámpula con 16.7 mL.",
        "active_substance": "paclitaxel",
        "atc_code": "L01CD01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0380SSA1996",
        "indication": "Carcinoma de mama, ovario, NSCLC, sarcoma de Kaposi, cabeza y cuello",
        "mechanism_of_action": "Taxano. Estabiliza los microtúbulos impidiendo su despolimerización, deteniendo el ciclo celular en mitosis.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2004-01",
    },
    {
        "clave": "010.000.5463.00",
        "description": "ONDANSETRÓN. Solución inyectable 8 mg/4 mL. Envase con 3 ampolletas.",
        "active_substance": "ondansetrón",
        "atc_code": "A04AA01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0340SSA1994",
        "indication": "Prevención y tratamiento de náusea y vómito inducido por quimioterapia, radioterapia y postoperatorio",
        "mechanism_of_action": "Antagonista selectivo del receptor 5-HT3 de serotonina. Bloquea la estimulación vagal y del centro del vómito.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2006-01",
    },
    {
        "clave": "010.000.5464.00",
        "description": "ÁCIDO ZOLEDRÓNICO. Solución inyectable 4 mg/5 mL. Envase con frasco ámpula con 5 mL.",
        "active_substance": "ácido zoledrónico",
        "atc_code": "M05BA08",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0950SSA2001",
        "indication": "Metástasis óseas de tumores sólidos, mieloma múltiple, hipercalcemia maligna",
        "mechanism_of_action": "Bisfosfonato de tercera generación. Inhibe la resorción ósea mediada por osteoclastos al bloquear la farnesil-pirofosfato sintasa.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2013-01",
    },

    # ── Hematología expansion (was 5, adding 1) ──
    {
        "clave": "010.000.4525.00",
        "description": "HIERRO SACAROSA. Solución inyectable 20 mg/mL. Envase con 5 ampolletas de 5 mL (100 mg).",
        "active_substance": "hierro sacarosa",
        "atc_code": "B03AC02",
        "therapeutic_group": "Hematología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0910SSA2001",
        "indication": "Anemia por deficiencia de hierro en ERC, intolerancia o falta de respuesta a hierro oral, prediálisis y diálisis",
        "mechanism_of_action": "Hierro elemental en complejo con sacarosa. Proporciona hierro para la síntesis de hemoglobina y restitución de depósitos corporales.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2010-01",
    },

    # ── Infectología expansion (was 5, adding 1) ──
    {
        "clave": "010.000.4615.00",
        "description": "FLUCONAZOL. Cápsula 100 mg. Envase con 10 cápsulas.",
        "active_substance": "fluconazol",
        "atc_code": "J02AC01",
        "therapeutic_group": "Infectología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0330SSA1994",
        "indication": "Candidiasis sistémica y mucosa, meningitis criptocócica, profilaxis antifúngica en pacientes inmunocomprometidos",
        "mechanism_of_action": "Antifúngico triazólico. Inhibe la 14-α-desmetilasa fúngica (CYP51) impidiendo la síntesis de ergosterol de la membrana celular.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2004-01",
    },

    # ── Vacunas expansion (was 2, adding 1) ──
    {
        "clave": "010.000.0615.00",
        "description": "VACUNA CONTRA HEPATITIS B recombinante. Suspensión inyectable 20 μg/1 mL. Envase con frasco ámpula con 1 mL.",
        "active_substance": "vacuna hepatitis B",
        "atc_code": "J07BC01",
        "therapeutic_group": "Vacunas",
        "source_type": "biotecnologico",
        "cnis_listed": True,
        "cofepris_registry": "0340SSA1994",
        "indication": "Inmunización activa contra hepatitis B. Personal de salud, recién nacidos, pacientes en diálisis, contactos de portadores",
        "mechanism_of_action": "Vacuna recombinante. Contiene antígeno de superficie del virus de hepatitis B (HBsAg) producido por tecnología de ADN recombinante.",
        "patent_holder": "Múltiples fabricantes (Sanofi Pasteur, GSK, Birmex)",
        "patent_expiry": "2000-01",
    },

    # ── NEW GROUP: Antifúngicos ──
    {
        "clave": "010.000.4620.00",
        "description": "VORICONAZOL. Polvo para solución inyectable 200 mg. Envase con frasco ámpula.",
        "active_substance": "voriconazol",
        "atc_code": "J02AC03",
        "therapeutic_group": "Antifúngicos",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "1015SSA2003",
        "indication": "Aspergilosis invasiva, candidemia en no neutropénicos, infecciones por Scedosporium y Fusarium",
        "mechanism_of_action": "Antifúngico triazólico de segunda generación. Inhibe la 14-α-desmetilasa (CYP51) fúngica con amplio espectro incluyendo Aspergillus.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2016-01",
    },
    {
        "clave": "010.000.4625.00",
        "description": "ANIDULAFUNGINA. Polvo para solución inyectable 100 mg. Envase con frasco ámpula y diluyente.",
        "active_substance": "anidulafungina",
        "atc_code": "J02AX06",
        "therapeutic_group": "Antifúngicos",
        "source_type": "patente",
        "cnis_listed": True,
        "cofepris_registry": "1280SSA2008",
        "indication": "Candidemia, candidiasis invasiva, candidasis esofágica",
        "mechanism_of_action": "Equinocandina. Inhibe la síntesis de 1,3-β-D-glucano, componente esencial de la pared celular fúngica.",
        "patent_holder": "Pfizer",
        "patent_expiry": "2027-05",
    },
    {
        "clave": "010.000.4630.00",
        "description": "ANFOTERICINA B LIPOSOMAL. Polvo para infusión 50 mg. Envase con frasco ámpula.",
        "active_substance": "anfotericina B liposomal",
        "atc_code": "J02AA01",
        "therapeutic_group": "Antifúngicos",
        "source_type": "patente",
        "cnis_listed": True,
        "cofepris_registry": "0750SSA1999",
        "indication": "Infecciones fúngicas sistémicas graves refractarias, aspergilosis invasiva, mucormicosis, leishmaniasis visceral",
        "mechanism_of_action": "Polieno antifúngico en formulación liposomal. Se une al ergosterol de la membrana fúngica formando poros que causan lisis celular. La formulación liposomal reduce nefrotoxicidad.",
        "patent_holder": "Gilead Sciences (Astellas)",
        "patent_expiry": "2026-01",
    },

    # ── NEW GROUP: Urgencias y Terapia Intensiva ──
    {
        "clave": "010.000.3105.00",
        "description": "NOREPINEFRINA. Solución inyectable 4 mg/4 mL. Envase con 5 ampolletas de 4 mL.",
        "active_substance": "norepinefrina",
        "atc_code": "C01CA03",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0140SSA1986",
        "indication": "Choque séptico, choque cardiogénico, hipotensión aguda grave, vasopresor de primera línea en UCI",
        "mechanism_of_action": "Catecolamina. Agonista α1-adrenérgico potente (vasoconstricción) con menor acción β1 (inotrópico). Aumenta presión arterial y resistencia vascular periférica.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1980-01",
    },
    {
        "clave": "010.000.3110.00",
        "description": "DEXMEDETOMIDINA. Solución inyectable 200 μg/2 mL. Envase con frasco ámpula con 2 mL.",
        "active_substance": "dexmedetomidina",
        "atc_code": "N05CM18",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "1180SSA2006",
        "indication": "Sedación en UCI (pacientes intubados), sedación procedural, prevención de delirium en UCI",
        "mechanism_of_action": "Agonista α2-adrenérgico selectivo. Produce sedación consciente, analgesia y ansiolisis sin depresión respiratoria significativa.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2018-01",
    },
    {
        "clave": "010.000.3115.00",
        "description": "DEXAMETASONA. Solución inyectable 8 mg/2 mL. Envase con 5 ampolletas de 2 mL.",
        "active_substance": "dexametasona",
        "atc_code": "H02AB02",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0050SSA1982",
        "indication": "Edema cerebral, insuficiencia suprarrenal aguda, shock anafiláctico, antiemético, antiinflamatorio sistémico, COVID-19 grave (RECOVERY trial)",
        "mechanism_of_action": "Corticosteroide fluorado de alta potencia. Inhibe la fosfolipasa A2, reduce citoquinas proinflamatorias (IL-1, IL-6, TNF-α), estabiliza membranas lisosomales.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1970-01",
    },
    {
        "clave": "010.000.3120.00",
        "description": "MIDAZOLAM. Solución inyectable 5 mg/mL. Envase con 5 ampolletas de 3 mL (15 mg).",
        "active_substance": "midazolam",
        "atc_code": "N05CD08",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0210SSA1989",
        "indication": "Sedación en UCI, inducción y mantenimiento de anestesia, premedicación, estado epiléptico, sedación procedural",
        "mechanism_of_action": "Benzodiazepina de acción corta. Potencia la acción del GABA en receptores GABA-A, produciendo sedación, amnesia y actividad anticonvulsivante.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1997-01",
    },
    {
        "clave": "010.000.3125.00",
        "description": "FENTANILO. Solución inyectable 0.5 mg/10 mL. Envase con 6 ampolletas de 10 mL.",
        "active_substance": "fentanilo",
        "atc_code": "N01AH01",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0100SSA1984",
        "indication": "Analgesia en UCI, anestesia general (adyuvante o primario), dolor agudo severo, neuroleptoanestesia",
        "mechanism_of_action": "Opioide sintético. Agonista puro de receptores μ con potencia 100 veces mayor que morfina. Acción rápida y corta duración.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1981-01",
    },
    {
        "clave": "010.000.3130.00",
        "description": "HEPARINA SÓDICA. Solución inyectable 10,000 UI/10 mL. Envase con frasco ámpula con 10 mL.",
        "active_substance": "heparina sódica",
        "atc_code": "B01AB01",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0070SSA1983",
        "indication": "Tromboembolismo venoso, trombosis arterial, anticoagulación en cirugía cardiovascular, hemodiálisis, CID, SICA",
        "mechanism_of_action": "Anticoagulante. Potencia la actividad de la antitrombina III, acelerando la inactivación de trombina (factor IIa), Xa y otros factores de coagulación.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1970-01",
    },

    # ── NEW GROUP: Ginecología y Obstetricia ──
    {
        "clave": "010.000.3205.00",
        "description": "OXITOCINA. Solución inyectable 5 UI/mL. Envase con 50 ampolletas de 1 mL.",
        "active_substance": "oxitocina",
        "atc_code": "H01BB02",
        "therapeutic_group": "Ginecología y Obstetricia",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0075SSA1983",
        "indication": "Inducción de trabajo de parto, prevención y tratamiento de hemorragia postparto, aborto incompleto",
        "mechanism_of_action": "Hormona peptídica sintética. Estimula contracciones uterinas al unirse a receptores de oxitocina en el miometrio, aumentando la frecuencia e intensidad de las contracciones.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1970-01",
    },
    {
        "clave": "010.000.3210.00",
        "description": "MISOPROSTOL. Tableta 200 μg. Envase con 28 tabletas.",
        "active_substance": "misoprostol",
        "atc_code": "A02BB01",
        "therapeutic_group": "Ginecología y Obstetricia",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0330SSA1994",
        "indication": "Maduración cervical e inducción del trabajo de parto, prevención de hemorragia postparto (cuando oxitocina no disponible), aborto médico, úlcera gástrica por AINE",
        "mechanism_of_action": "Análogo sintético de prostaglandina E1. Induce contracciones uterinas y maduración cervical. También protege mucosa gástrica inhibiendo secreción ácida.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2000-01",
    },
    {
        "clave": "010.000.3215.00",
        "description": "PROGESTERONA MICRONIZADA. Cápsula 200 mg. Envase con 15 cápsulas.",
        "active_substance": "progesterona micronizada",
        "atc_code": "G03DA04",
        "therapeutic_group": "Ginecología y Obstetricia",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0280SSA1993",
        "indication": "Amenaza de aborto, soporte de fase lútea en reproducción asistida, terapia de reemplazo hormonal, prevención de parto pretérmino",
        "mechanism_of_action": "Hormona esteroide natural. Se une a receptores de progesterona en el endometrio transformándolo de proliferativo a secretor y manteniendo la gestación.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2000-01",
    },

    # ── NEW GROUP: Urología ──
    {
        "clave": "010.000.3305.00",
        "description": "TAMSULOSINA. Cápsula de liberación prolongada 0.4 mg. Envase con 30 cápsulas.",
        "active_substance": "tamsulosina",
        "atc_code": "G04CA02",
        "therapeutic_group": "Urología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0880SSA2000",
        "indication": "Hiperplasia prostática benigna (síntomas obstructivos urinarios bajos), litiasis ureteral distal (terapia expulsiva médica)",
        "mechanism_of_action": "Antagonista selectivo de receptores α1A-adrenérgicos. Relaja el músculo liso prostático y del cuello vesical facilitando la micción.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2009-01",
    },
    {
        "clave": "010.000.3310.00",
        "description": "FINASTERIDA. Tableta 5 mg. Envase con 30 tabletas.",
        "active_substance": "finasterida",
        "atc_code": "G04CB01",
        "therapeutic_group": "Urología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0550SSA1998",
        "indication": "Hiperplasia prostática benigna (reducción del volumen prostático), prevención de retención urinaria aguda y cirugía prostática",
        "mechanism_of_action": "Inhibidor de la 5-alfa-reductasa tipo II. Bloquea la conversión de testosterona a dihidrotestosterona (DHT), reduciendo el volumen prostático.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2006-01",
    },
]


# ── Generate adjudicaciones for new claves ────────────────────────────

INSTITUTIONS = ["IMSS", "ISSSTE", "PEMEX", "IMSS-Bienestar"]
CYCLES = ["2023-2024", "2025-2026", "2027-2028"]

# Realistic pricing and volume by type
def get_pricing_profile(clave_data):
    """Generate realistic pricing based on drug type and source."""
    substance = clave_data["active_substance"]
    source = clave_data["source_type"]
    group = clave_data["therapeutic_group"]

    # Base prices vary dramatically by drug type
    price_profiles = {
        # Gastroenterología
        "pantoprazol": {"price": 45.0, "vol": 2800000, "ref_mult": 1.25},
        "mesalazina": {"price": 85.0, "vol": 180000, "ref_mult": 1.3},
        "octreotida": {"price": 450.0, "vol": 42000, "ref_mult": 1.2},
        # Psiquiatría
        "risperidona": {"price": 18.0, "vol": 1500000, "ref_mult": 1.3},
        "sertralina": {"price": 12.0, "vol": 3200000, "ref_mult": 1.35},
        "valproato de magnesio": {"price": 35.0, "vol": 900000, "ref_mult": 1.3},
        "haloperidol": {"price": 28.0, "vol": 600000, "ref_mult": 1.25},
        # Neumología
        "salbutamol": {"price": 42.0, "vol": 8500000, "ref_mult": 1.3},
        "tiotropio": {"price": 380.0, "vol": 320000, "ref_mult": 1.15},
        "fluticasona/salmeterol": {"price": 285.0, "vol": 480000, "ref_mult": 1.2},
        # Trasplantes
        "ciclosporina": {"price": 220.0, "vol": 95000, "ref_mult": 1.25},
        "basiliximab": {"price": 18500.0, "vol": 4200, "ref_mult": 1.1},
        # Nefrología
        "sevelámero": {"price": 180.0, "vol": 320000, "ref_mult": 1.2},
        "calcitriol": {"price": 45.0, "vol": 850000, "ref_mult": 1.3},
        # Antibióticos
        "ciprofloxacino": {"price": 22.0, "vol": 3500000, "ref_mult": 1.35},
        "clindamicina": {"price": 35.0, "vol": 2200000, "ref_mult": 1.3},
        "amikacina": {"price": 28.0, "vol": 1800000, "ref_mult": 1.3},
        # Cardiología
        "clopidogrel": {"price": 8.50, "vol": 5200000, "ref_mult": 1.4},
        "ácido acetilsalicílico": {"price": 1.80, "vol": 42000000, "ref_mult": 1.5},
        "metoprolol": {"price": 6.50, "vol": 18000000, "ref_mult": 1.4},
        # Dolor y Anestesia
        "metamizol sódico": {"price": 8.50, "vol": 12000000, "ref_mult": 1.4},
        "ketorolaco": {"price": 12.0, "vol": 9500000, "ref_mult": 1.35},
        "paracetamol": {"price": 32.0, "vol": 6500000, "ref_mult": 1.3},
        # Oncología support
        "carboplatino": {"price": 350.0, "vol": 185000, "ref_mult": 1.25},
        "cisplatino": {"price": 180.0, "vol": 145000, "ref_mult": 1.3},
        "paclitaxel": {"price": 1200.0, "vol": 120000, "ref_mult": 1.2},
        "ondansetrón": {"price": 18.0, "vol": 4200000, "ref_mult": 1.35},
        "ácido zoledrónico": {"price": 850.0, "vol": 78000, "ref_mult": 1.2},
        # Hematología
        "hierro sacarosa": {"price": 120.0, "vol": 580000, "ref_mult": 1.25},
        # Infectología
        "fluconazol": {"price": 15.0, "vol": 2100000, "ref_mult": 1.35},
        # Vacunas
        "vacuna hepatitis B": {"price": 45.0, "vol": 3200000, "ref_mult": 1.2},
        # Antifúngicos
        "voriconazol": {"price": 1850.0, "vol": 32000, "ref_mult": 1.15},
        "anidulafungina": {"price": 4500.0, "vol": 18000, "ref_mult": 1.1},
        "anfotericina B liposomal": {"price": 8500.0, "vol": 12000, "ref_mult": 1.1},
        # Urgencias y Terapia Intensiva
        "norepinefrina": {"price": 65.0, "vol": 3800000, "ref_mult": 1.3},
        "dexmedetomidina": {"price": 280.0, "vol": 420000, "ref_mult": 1.2},
        "dexametasona": {"price": 15.0, "vol": 9200000, "ref_mult": 1.4},
        "midazolam": {"price": 42.0, "vol": 2800000, "ref_mult": 1.3},
        "fentanilo": {"price": 85.0, "vol": 3200000, "ref_mult": 1.25},
        "heparina sódica": {"price": 95.0, "vol": 2400000, "ref_mult": 1.25},
        # Ginecología y Obstetricia
        "oxitocina": {"price": 8.0, "vol": 4500000, "ref_mult": 1.5},
        "misoprostol": {"price": 35.0, "vol": 850000, "ref_mult": 1.3},
        "progesterona micronizada": {"price": 65.0, "vol": 420000, "ref_mult": 1.25},
        # Urología
        "tamsulosina": {"price": 12.0, "vol": 3800000, "ref_mult": 1.35},
        "finasterida": {"price": 8.0, "vol": 2200000, "ref_mult": 1.4},
    }

    return price_profiles.get(substance, {"price": 100.0, "vol": 50000, "ref_mult": 1.2})


def gen_adjudicaciones(clave_data):
    """Generate realistic adjudicaciones across cycles and institutions."""
    records = []
    profile = get_pricing_profile(clave_data)
    base_price = profile["price"]
    total_vol = profile["vol"]
    ref_mult = profile["ref_mult"]

    # Institution demand split (IMSS gets ~60%, ISSSTE ~20%, IMSS-Bienestar ~12%, PEMEX ~8%)
    inst_splits = {
        "IMSS": 0.60,
        "ISSSTE": 0.20,
        "IMSS-Bienestar": 0.12,
        "PEMEX": 0.08,
    }

    # Determine negotiation type
    source = clave_data["source_type"]
    if source == "patente":
        neg_type = "mesa_patente"
    elif source == "fuente_unica":
        neg_type = "adjudicacion_directa"
    else:
        neg_type = "licitacion_publica"

    for cycle_idx, cycle in enumerate(CYCLES):
        # Price evolution: slight decrease each cycle for generics, slight increase for patentes
        if source in ("generico", "biotecnologico"):
            price_factor = 1.0 - (cycle_idx * 0.04)  # 4% decrease per cycle
        else:
            price_factor = 1.0 - (cycle_idx * 0.02)  # 2% decrease even for patent (negotiation pressure)

        cycle_price = round(base_price * price_factor, 2)
        cycle_ref = round(base_price * ref_mult * (1.0 - cycle_idx * 0.015), 2)

        # Volume grows ~8% per cycle
        vol_factor = 1.0 + (cycle_idx * 0.08)

        for inst, split in inst_splits.items():
            inst_vol = int(total_vol * split * vol_factor)
            if inst_vol < 100:
                continue

            # 2027-2028 is en_proceso
            if cycle == "2027-2028":
                status = "en_proceso"
                awarded = 0
                price = 0.0
                supplier = ""
                notes = f"Tender in preparation. {inst} demand estimated at {inst_vol:,} units."
            else:
                # Small chance of desierta for patente drugs
                if source == "patente" and random.random() < 0.05 and cycle_idx > 0:
                    status = "desierta"
                    awarded = 0
                    price = 0.0
                    supplier = ""
                    notes = f"No offers received below BIRMEX reference price of ${cycle_ref:,.2f} MXN."
                else:
                    status = "adjudicada"
                    fulfillment = random.uniform(0.88, 1.0) if source == "generico" else random.uniform(0.82, 0.98)
                    awarded = int(inst_vol * fulfillment)
                    price = cycle_price
                    supplier = _get_supplier(clave_data, source)
                    notes = _get_negotiation_notes(clave_data, cycle, cycle_price, base_price, source)

            record = {
                "clave": clave_data["clave"],
                "description": clave_data["description"].split(".")[0] + ".",
                "active_substance": clave_data["active_substance"],
                "cycle": cycle,
                "status": status,
                "supplier": supplier,
                "units_requested": inst_vol,
                "units_awarded": awarded,
                "unit_price": price,
                "total_amount": round(price * awarded, 2),
                "max_reference_price": cycle_ref,
                "institution": inst,
                "therapeutic_group": clave_data["therapeutic_group"],
                "source_type": source,
                "negotiation_type": neg_type,
                "negotiation_notes": notes,
            }

            # Add competitor bids for generics/biosimilars in 2025-2026 IMSS
            if source in ("generico", "biotecnologico") and cycle == "2025-2026" and inst == "IMSS":
                record["competitor_bids"] = _gen_competitor_bids(clave_data, cycle_price, cycle_ref)

            records.append(record)

    return records


def _get_supplier(clave_data, source):
    """Return a realistic supplier name."""
    generic_suppliers = [
        "Laboratorios PiSA", "Laboratorios AMSA", "Fresenius Kabi",
        "Laboratorios Sophia", "Laboratorios Collins", "Accord Healthcare",
        "Teva México", "Mylan/Viatris", "Stendhal", "Laboratorios Senosiain",
        "Sandoz México", "Dr. Reddy's", "Landsteiner Scientific",
    ]
    bio_suppliers = [
        "Laboratorios PiSA", "Probiomed", "Landsteiner Scientific",
        "Fresenius Kabi", "Stendhal",
    ]

    substance = clave_data["active_substance"]

    # Specific patent holders
    patent_map = {
        "tiotropio": "Boehringer Ingelheim",
        "basiliximab": "Novartis México",
        "anidulafungina": "Pfizer México",
        "anfotericina B liposomal": "Gilead/Astellas",
        "semaglutida": "Novo Nordisk México",
    }
    if substance in patent_map:
        return patent_map[substance]

    if source == "patente":
        holder = clave_data.get("patent_holder", "")
        if holder and "enérico" not in holder:
            return holder
        return "Fabricante original"
    elif source == "biotecnologico":
        return random.choice(bio_suppliers)
    else:
        return random.choice(generic_suppliers)


def _get_negotiation_notes(clave_data, cycle, price, base_price, source):
    """Generate realistic negotiation notes."""
    substance = clave_data["active_substance"]
    group = clave_data["therapeutic_group"]

    if source == "generico":
        pct = round((1 - price/base_price) * 100, 1)
        if pct > 0:
            return f"Competitive generic tender. Price reduced {pct}% vs initial reference. Multiple suppliers qualified."
        return "Multiple generic suppliers participated in open tender. Competitive pricing achieved."
    elif source == "biotecnologico":
        return f"Open tender for {substance}. Biosimilar/biogeneric competition among qualified suppliers."
    elif source == "patente":
        return f"Patent-protected. Price negotiated under Mesa de Patente framework with BIRMEX reference ceiling."
    else:
        return f"Single-source procurement for {substance}."


def _gen_competitor_bids(clave_data, winning_price, ref_price):
    """Generate realistic competitor bids for generic/biosimilar tenders."""
    suppliers = [
        "Laboratorios PiSA", "Fresenius Kabi", "Laboratorios AMSA",
        "Sandoz México", "Teva México", "Mylan/Viatris", "Accord Healthcare",
        "Laboratorios Collins", "Stendhal", "Landsteiner Scientific",
    ]
    random.shuffle(suppliers)

    bids = []
    # Winner
    bids.append({
        "supplier": suppliers[0],
        "unit_price_offered": winning_price,
        "outcome": "awarded",
        "reason": "Lowest compliant bid meeting technical specifications",
    })
    # 2nd place
    second_price = round(winning_price * random.uniform(1.03, 1.12), 2)
    bids.append({
        "supplier": suppliers[1],
        "unit_price_offered": second_price,
        "outcome": "second_place",
        "reason": "Second lowest compliant bid",
    })
    # 3rd place or rejected
    third_price = round(winning_price * random.uniform(1.08, 1.20), 2)
    bids.append({
        "supplier": suppliers[2],
        "unit_price_offered": third_price,
        "outcome": "backup" if third_price < ref_price else "rejected",
        "reason": "Third compliant bid" if third_price < ref_price else "Price exceeded reference threshold",
    })

    return bids


# ── Main execution ───────────────────────────────────────────────────

random.seed(42)  # Reproducible

new_adj_count = 0
added_claves = 0

for clave_data in NEW_CLAVES:
    if clave_data["clave"] in existing_claves:
        print(f"  SKIP (exists): {clave_data['clave']} {clave_data['active_substance']}")
        continue

    data["claves"].append(clave_data)
    existing_claves.add(clave_data["clave"])
    added_claves += 1

    adj_records = gen_adjudicaciones(clave_data)
    data["adjudicaciones"].extend(adj_records)
    new_adj_count += len(adj_records)

# Write out
with open(DATA_FILE, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

total_claves = len(data["claves"])
total_adj = len(data["adjudicaciones"])
groups = sorted(set(c["therapeutic_group"] for c in data["claves"]))

print(f"\n{'='*60}")
print(f"Added {added_claves} new claves, {new_adj_count} new adjudicaciones")
print(f"Total claves: {total_claves}")
print(f"Total adjudicaciones: {total_adj}")
print(f"Therapeutic groups ({len(groups)}): {groups}")
print(f"Institutions: {sorted(set(a['institution'] for a in data['adjudicaciones']))}")
