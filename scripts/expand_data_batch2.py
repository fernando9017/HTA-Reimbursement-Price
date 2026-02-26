#!/usr/bin/env python3
"""
Second batch expansion — cytotoxic chemotherapy backbone, high-volume
generics, missing essential medicines, and desabasto-critical drugs.

Based on:
- Cero Desabasto 2024 shortage reports
- IMSS Cuadro Básico groups
- Compra Consolidada 2025-2026 demand data
- Megafarmacia top-requested items
"""

import json
import random
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "data" / "mexico_procurement.json"

with open(DATA_FILE) as f:
    data = json.load(f)

existing_claves = {c["clave"] for c in data["claves"]}

NEW_CLAVES = [
    # ── Oncología: Cytotoxic chemotherapy backbone ──
    {
        "clave": "010.000.5465.00",
        "description": "FLUOROURACILO. Solución inyectable 500 mg/10 mL. Envase con frasco ámpula con 10 mL.",
        "active_substance": "fluorouracilo",
        "atc_code": "L01BC02",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0190SSA1989",
        "indication": "Carcinoma colorrectal (FOLFOX, FOLFIRI), mama, gástrico, cabeza y cuello, esofágico",
        "mechanism_of_action": "Antimetabolito pirimidínico. Inhibe la timidilato sintasa bloqueando la síntesis de ADN. Base del protocolo FOLFOX/FOLFIRI.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },
    {
        "clave": "010.000.5466.00",
        "description": "OXALIPLATINO. Solución inyectable 100 mg. Envase con frasco ámpula.",
        "active_substance": "oxaliplatino",
        "atc_code": "L01XA03",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0980SSA2002",
        "indication": "Carcinoma colorrectal (FOLFOX), gástrico, pancreático",
        "mechanism_of_action": "Compuesto de platino de tercera generación. Forma aductos con ADN. Componente esencial del régimen FOLFOX.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2012-01",
    },
    {
        "clave": "010.000.5467.00",
        "description": "DOXORRUBICINA. Solución inyectable 50 mg. Envase con frasco ámpula.",
        "active_substance": "doxorrubicina",
        "atc_code": "L01DB01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0220SSA1990",
        "indication": "Linfoma de Hodgkin y no Hodgkin (CHOP/ABVD), mama, sarcomas, leucemia aguda, carcinoma de ovario",
        "mechanism_of_action": "Antraciclina. Intercala en el ADN, inhibe la topoisomerasa II y genera radicales libres. Cardiotoxicidad acumulativa dosis-dependiente.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.5468.00",
        "description": "CICLOFOSFAMIDA. Tableta 50 mg. Envase con 30 tabletas.",
        "active_substance": "ciclofosfamida",
        "atc_code": "L01AA01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0160SSA1987",
        "indication": "Linfoma, mama (CMF/AC), leucemia, mieloma, autoinmune (nefritis lúpica, vasculitis)",
        "mechanism_of_action": "Agente alquilante (mostaza nitrogenada). Profármaco activado hepáticamente que forma entrecruzamientos en el ADN. También inmunosupresor.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },
    {
        "clave": "010.000.5469.00",
        "description": "GEMCITABINA. Polvo para solución inyectable 1 g. Envase con frasco ámpula.",
        "active_substance": "gemcitabina",
        "atc_code": "L01BC05",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0850SSA2000",
        "indication": "Carcinoma pancreático, NSCLC, vejiga, mama, ovario",
        "mechanism_of_action": "Análogo de nucleósido (desoxicitidina). Inhibe la síntesis de ADN al incorporarse a la cadena en replicación. Tratamiento de referencia en cáncer pancreático.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2010-01",
    },
    {
        "clave": "010.000.5470.00",
        "description": "VINCRISTINA. Solución inyectable 1 mg/mL. Envase con frasco ámpula con 1 mL.",
        "active_substance": "vincristina",
        "atc_code": "L01CA02",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0170SSA1988",
        "indication": "LLA pediátrica y adulta, linfoma de Hodgkin y no Hodgkin (CHOP, MOPP), tumor de Wilms, neuroblastoma",
        "mechanism_of_action": "Alcaloide de la vinca. Inhibe la polimerización de tubulina deteniendo la mitosis en metafase. Esencial en protocolos CHOP y pediátricos.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },
    {
        "clave": "010.000.5471.00",
        "description": "CAPECITABINA. Tableta 500 mg. Envase con 120 tabletas.",
        "active_substance": "capecitabina",
        "atc_code": "L01BC06",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0890SSA2000",
        "indication": "Carcinoma colorrectal, mama (monoterapia o combinación), gástrico",
        "mechanism_of_action": "Profármaco oral del 5-FU. Se convierte selectivamente en fluorouracilo en el tumor por la enzima timidina fosforilasa. Permite administración oral ambulatoria.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2013-01",
    },
    {
        "clave": "010.000.5472.00",
        "description": "TAMOXIFENO. Tableta 20 mg. Envase con 14 tabletas.",
        "active_substance": "tamoxifeno",
        "atc_code": "L02BA01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0195SSA1989",
        "indication": "Cáncer de mama receptor hormonal positivo (adyuvante, metastásico), prevención en alto riesgo",
        "mechanism_of_action": "Modulador selectivo del receptor de estrógeno (SERM). Antagonista estrogénico en mama, agonista parcial en hueso y endometrio.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.5473.00",
        "description": "LETROZOL. Tableta 2.5 mg. Envase con 30 tabletas.",
        "active_substance": "letrozol",
        "atc_code": "L02BG04",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0860SSA2000",
        "indication": "Cáncer de mama receptor hormonal positivo en mujeres posmenopáusicas (adyuvante, neoadyuvante, metastásico)",
        "mechanism_of_action": "Inhibidor de aromatasa no esteroideo. Bloquea la conversión de andrógenos a estrógenos en tejidos periféricos, reduciendo niveles de estradiol >95%.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2011-01",
    },
    {
        "clave": "010.000.5474.00",
        "description": "METOTREXATO. Solución inyectable 500 mg. Envase con frasco ámpula.",
        "active_substance": "metotrexato",
        "atc_code": "L01BA01",
        "therapeutic_group": "Oncología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0185SSA1988",
        "indication": "LLA, linfoma, osteosarcoma, coriocarcinoma, artritis reumatoide, psoriasis (dosis bajas)",
        "mechanism_of_action": "Antimetabolito antifolato. Inhibe la dihidrofolato reductasa bloqueando la síntesis de purinas y pirimidinas. Dosis altas requieren rescate con leucovorina.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },

    # ── Cardiología: high-volume essentials ──
    {
        "clave": "010.000.2030.00",
        "description": "ENALAPRIL. Tableta 10 mg. Envase con 30 tabletas.",
        "active_substance": "enalapril",
        "atc_code": "C09AA02",
        "therapeutic_group": "Cardiología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0270SSA1992",
        "indication": "Hipertensión arterial, insuficiencia cardíaca, nefropatía diabética, disfunción ventricular izquierda post-IAM",
        "mechanism_of_action": "Inhibidor de la ECA. Bloquea la conversión de angiotensina I a angiotensina II, reduciendo vasoconstricción y retención de sodio.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2000-01",
    },
    {
        "clave": "010.000.2035.00",
        "description": "FUROSEMIDA. Solución inyectable 20 mg/2 mL. Envase con 5 ampolletas de 2 mL.",
        "active_substance": "furosemida",
        "atc_code": "C03CA01",
        "therapeutic_group": "Cardiología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0080SSA1983",
        "indication": "Insuficiencia cardíaca aguda y crónica, edema pulmonar, síndrome nefrótico, cirrosis con ascitis, hipertensión resistente",
        "mechanism_of_action": "Diurético de asa. Inhibe el cotransportador Na+/K+/2Cl- en la rama ascendente gruesa del asa de Henle.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1980-01",
    },
    {
        "clave": "010.000.2040.00",
        "description": "ESPIRONOLACTONA. Tableta 25 mg. Envase con 30 tabletas.",
        "active_substance": "espironolactona",
        "atc_code": "C03DA01",
        "therapeutic_group": "Cardiología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0095SSA1984",
        "indication": "Insuficiencia cardíaca con FE reducida (RALES trial), hiperaldosteronismo, ascitis hepática, hipertensión resistente",
        "mechanism_of_action": "Antagonista de aldosterona. Bloquea el receptor de mineralocorticoides en el túbulo colector, produciendo diuresis ahorradora de potasio.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },

    # ── Endocrinología: desabasto-critical ──
    {
        "clave": "010.000.4160.00",
        "description": "INSULINA HUMANA NPH. Suspensión inyectable 100 UI/mL. Envase con frasco ámpula con 10 mL.",
        "active_substance": "insulina humana NPH",
        "atc_code": "A10AC01",
        "therapeutic_group": "Endocrinología",
        "source_type": "biotecnologico",
        "cnis_listed": True,
        "cofepris_registry": "0240SSA1991",
        "indication": "Diabetes mellitus tipo 1 y tipo 2 que requiere insulina. Insulina de acción intermedia para control basal.",
        "mechanism_of_action": "Insulina humana de acción intermedia (NPH/isófana). Absorción retardada por cristales de protamina. Inicio 1-2h, pico 4-8h, duración 12-18h.",
        "patent_holder": "Múltiples fabricantes (Eli Lilly, Novo Nordisk, PiSA)",
        "patent_expiry": "2000-01",
    },
    {
        "clave": "010.000.4165.00",
        "description": "GLIBENCLAMIDA. Tableta 5 mg. Envase con 50 tabletas.",
        "active_substance": "glibenclamida",
        "atc_code": "A10BB01",
        "therapeutic_group": "Endocrinología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0110SSA1985",
        "indication": "Diabetes mellitus tipo 2 cuando dieta y ejercicio son insuficientes. Primera línea en combinación con metformina en el IMSS.",
        "mechanism_of_action": "Sulfonilurea de segunda generación. Estimula la secreción de insulina de las células beta pancreáticas al cerrar canales de K+ dependientes de ATP.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },
    {
        "clave": "010.000.4170.00",
        "description": "LIRAGLUTIDA. Solución inyectable 6 mg/mL. Envase con pluma prellenada con 3 mL.",
        "active_substance": "liraglutida",
        "atc_code": "A10BJ02",
        "therapeutic_group": "Endocrinología",
        "source_type": "patente",
        "cnis_listed": True,
        "cofepris_registry": "1450SSA2011",
        "indication": "Diabetes mellitus tipo 2 (monoterapia o combinación), reducción de riesgo cardiovascular en DM2 con enfermedad CV establecida (LEADER trial)",
        "mechanism_of_action": "Agonista del receptor de GLP-1 de acción prolongada. Estimula secreción de insulina glucosa-dependiente, suprime glucagón, retarda vaciamiento gástrico.",
        "patent_holder": "Novo Nordisk",
        "patent_expiry": "2028-06",
    },

    # ── Neurología: desabasto-critical ──
    {
        "clave": "010.000.2305.00",
        "description": "LEVODOPA/CARBIDOPA. Tableta 250/25 mg. Envase con 100 tabletas.",
        "active_substance": "levodopa/carbidopa",
        "atc_code": "N04BA02",
        "therapeutic_group": "Neurología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0155SSA1987",
        "indication": "Enfermedad de Parkinson, parkinsonismo sintomático. Tratamiento estándar de primera línea.",
        "mechanism_of_action": "Precursor de dopamina + inhibidor de dopa-descarboxilasa periférica. Levodopa cruza BHE y se convierte en dopamina. Carbidopa previene conversión periférica.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.2310.00",
        "description": "CARBAMAZEPINA. Tableta 200 mg. Envase con 20 tabletas.",
        "active_substance": "carbamazepina",
        "atc_code": "N03AF01",
        "therapeutic_group": "Neurología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0120SSA1985",
        "indication": "Epilepsia (crisis parciales y tónico-clónicas generalizadas), neuralgia del trigémino, trastorno bipolar",
        "mechanism_of_action": "Anticonvulsivante (iminoestilbeno). Bloquea canales de sodio dependientes de voltaje, estabilizando membranas neuronales hiperexcitables.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.2315.00",
        "description": "GABAPENTINA. Cápsula 300 mg. Envase con 15 cápsulas.",
        "active_substance": "gabapentina",
        "atc_code": "N03AX12",
        "therapeutic_group": "Neurología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0550SSA1998",
        "indication": "Epilepsia (crisis parciales con o sin generalización secundaria), dolor neuropático, neuralgia postherpética",
        "mechanism_of_action": "Análogo estructural de GABA. Se une a la subunidad α2-δ de canales de calcio dependientes de voltaje, reduciendo liberación de neurotransmisores excitatorios.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2004-01",
    },

    # ── Psiquiatría: desabasto-critical ──
    {
        "clave": "010.000.2525.00",
        "description": "FLUOXETINA. Cápsula 20 mg. Envase con 14 cápsulas.",
        "active_substance": "fluoxetina",
        "atc_code": "N06AB03",
        "therapeutic_group": "Psiquiatría",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0400SSA1996",
        "indication": "Depresión mayor, trastorno obsesivo-compulsivo, bulimia nerviosa, trastorno de pánico",
        "mechanism_of_action": "Inhibidor selectivo de la recaptación de serotonina (ISRS). Primer ISRS aprobado. Larga vida media permite dosificación flexible.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "2001-01",
    },
    {
        "clave": "010.000.2530.00",
        "description": "CLONAZEPAM. Tableta 2 mg. Envase con 30 tabletas.",
        "active_substance": "clonazepam",
        "atc_code": "N03AE01",
        "therapeutic_group": "Psiquiatría",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0165SSA1987",
        "indication": "Trastornos de ansiedad, crisis de pánico, epilepsia (crisis de ausencia, crisis mioclónicas), espasticidad",
        "mechanism_of_action": "Benzodiazepina de acción prolongada. Potencia la acción del GABA en receptores GABA-A. Anticonvulsivante, ansiolítico y miorrelajante.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1995-01",
    },

    # ── Infectología: common antibiotics and antifungals ──
    {
        "clave": "010.000.1930.00",
        "description": "AMOXICILINA. Cápsula 500 mg. Envase con 12 cápsulas.",
        "active_substance": "amoxicilina",
        "atc_code": "J01CA04",
        "therapeutic_group": "Antibióticos",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0145SSA1986",
        "indication": "Infecciones de vías respiratorias, otitis media, sinusitis, infecciones urinarias, H. pylori (triple terapia)",
        "mechanism_of_action": "Aminopenicilina. Inhibe la síntesis de pared celular bacteriana al unirse a proteínas fijadoras de penicilina (PBPs). Amplio espectro para gram+ y gram-.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },
    {
        "clave": "010.000.1935.00",
        "description": "TRIMETOPRIM/SULFAMETOXAZOL. Tableta 160/800 mg. Envase con 14 tabletas.",
        "active_substance": "trimetoprim/sulfametoxazol",
        "atc_code": "J01EE01",
        "therapeutic_group": "Antibióticos",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0090SSA1984",
        "indication": "Infecciones urinarias, bronquitis, otitis media, profilaxis de PCP en VIH, infecciones por MRSA comunitario",
        "mechanism_of_action": "Combinación sinérgica. Sulfametoxazol inhibe la dihidropteroato sintasa y trimetoprim inhibe la dihidrofolato reductasa, bloqueando secuencialmente la síntesis de folato bacteriano.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1980-01",
    },

    # ── Gastroenterología expansion ──
    {
        "clave": "010.000.2138.00",
        "description": "METOCLOPRAMIDA. Solución inyectable 10 mg/2 mL. Envase con 6 ampolletas de 2 mL.",
        "active_substance": "metoclopramida",
        "atc_code": "A03FA01",
        "therapeutic_group": "Gastroenterología",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0085SSA1983",
        "indication": "Náusea y vómito, gastroparesia diabética, reflujo gastroesofágico, procinético prequirúrgico",
        "mechanism_of_action": "Antagonista dopaminérgico D2 y agonista serotoninérgico 5-HT4. Aumenta el tono y peristaltismo del tracto GI superior y tiene efecto antiemético central.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1985-01",
    },

    # ── Urgencias y Terapia Intensiva: ACLS essentials ──
    {
        "clave": "010.000.3135.00",
        "description": "EPINEFRINA (ADRENALINA). Solución inyectable 1 mg/mL. Envase con 50 ampolletas de 1 mL.",
        "active_substance": "epinefrina",
        "atc_code": "C01CA24",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0020SSA1980",
        "indication": "Paro cardíaco (ACLS), anafilaxia, broncoespasmo severo, adyuvante de anestésicos locales",
        "mechanism_of_action": "Catecolamina. Agonista α y β-adrenérgico. α1: vasoconstricción. β1: cronotropismo e inotropismo positivos. β2: broncodilatación.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1960-01",
    },
    {
        "clave": "010.000.3140.00",
        "description": "DOBUTAMINA. Solución inyectable 250 mg/20 mL. Envase con frasco ámpula con 20 mL.",
        "active_substance": "dobutamina",
        "atc_code": "C01CA07",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0175SSA1988",
        "indication": "Insuficiencia cardíaca aguda, choque cardiogénico, soporte inotrópico postoperatorio, prueba de estrés farmacológico",
        "mechanism_of_action": "Catecolamina sintética. Agonista selectivo β1-adrenérgico. Aumenta contractilidad miocárdica y gasto cardíaco con menor efecto sobre frecuencia cardíaca.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1990-01",
    },
    {
        "clave": "010.000.3145.00",
        "description": "AMIODARONA. Solución inyectable 150 mg/3 mL. Envase con 6 ampolletas de 3 mL.",
        "active_substance": "amiodarona",
        "atc_code": "C01BD01",
        "therapeutic_group": "Urgencias y Terapia Intensiva",
        "source_type": "generico",
        "cnis_listed": True,
        "cofepris_registry": "0225SSA1990",
        "indication": "Arritmias ventriculares graves (FV/TV sin pulso en ACLS), fibrilación auricular, taquicardia supraventricular",
        "mechanism_of_action": "Antiarrítmico clase III (bloquea canales de potasio) con propiedades de clases I, II y IV. Prolonga potencial de acción y período refractario.",
        "patent_holder": "Genérico (múltiples fabricantes)",
        "patent_expiry": "1995-01",
    },

    # ── Vacunas: childhood essential ──
    {
        "clave": "010.000.0620.00",
        "description": "VACUNA BCG. Liofilizado para suspensión inyectable. Envase con frasco ámpula (20 dosis).",
        "active_substance": "vacuna BCG",
        "atc_code": "J07AN01",
        "therapeutic_group": "Vacunas",
        "source_type": "biotecnologico",
        "cnis_listed": True,
        "cofepris_registry": "0005SSA1980",
        "indication": "Inmunización activa contra formas graves de tuberculosis (TB miliar, meníngea). Administrada al nacimiento.",
        "mechanism_of_action": "Vacuna viva atenuada de Mycobacterium bovis (cepa Calmette-Guérin). Induce inmunidad celular contra tuberculosis.",
        "patent_holder": "Birmex / Sanofi Pasteur / SSI",
        "patent_expiry": "1960-01",
    },
    {
        "clave": "010.000.0625.00",
        "description": "VACUNA PENTAVALENTE ACELULAR (DPTa-VPI+Hib). Suspensión inyectable. Envase con jeringa prellenada.",
        "active_substance": "vacuna pentavalente acelular",
        "atc_code": "J07CA06",
        "therapeutic_group": "Vacunas",
        "source_type": "biotecnologico",
        "cnis_listed": True,
        "cofepris_registry": "1200SSA2007",
        "indication": "Inmunización activa contra difteria, tos ferina, tétanos, poliomielitis y Haemophilus influenzae tipo b. Esquema primario: 2, 4 y 6 meses.",
        "mechanism_of_action": "Vacuna combinada con toxoides (difteria, tétanos), antígenos pertúsicos acelulares, VPI inactivada y conjugado de Hib.",
        "patent_holder": "Sanofi Pasteur / GSK",
        "patent_expiry": "2015-01",
    },
    {
        "clave": "010.000.0630.00",
        "description": "VACUNA SRP (Triple viral: sarampión, rubéola, parotiditis). Liofilizado para suspensión inyectable. Envase con frasco ámpula (10 dosis).",
        "active_substance": "vacuna SRP",
        "atc_code": "J07BD52",
        "therapeutic_group": "Vacunas",
        "source_type": "biotecnologico",
        "cnis_listed": True,
        "cofepris_registry": "0045SSA1981",
        "indication": "Inmunización activa contra sarampión, rubéola y parotiditis. Esquema: 12 meses y 6 años. Cobertura ha caído a 71.3%.",
        "mechanism_of_action": "Vacuna de virus vivos atenuados (cepas de sarampión, rubéola y parotiditis). Induce inmunidad humoral y celular.",
        "patent_holder": "Birmex / Serum Institute of India / MSD",
        "patent_expiry": "1985-01",
    },
]


# ── Generate adjudicaciones ─────────────────────────────────────────

INSTITUTIONS = ["IMSS", "ISSSTE", "PEMEX", "IMSS-Bienestar"]
CYCLES = ["2023-2024", "2025-2026", "2027-2028"]

price_profiles = {
    "fluorouracilo": {"price": 85.0, "vol": 320000, "ref_mult": 1.3},
    "oxaliplatino": {"price": 1200.0, "vol": 95000, "ref_mult": 1.2},
    "doxorrubicina": {"price": 450.0, "vol": 110000, "ref_mult": 1.25},
    "ciclofosfamida": {"price": 35.0, "vol": 280000, "ref_mult": 1.3},
    "gemcitabina": {"price": 950.0, "vol": 85000, "ref_mult": 1.2},
    "vincristina": {"price": 280.0, "vol": 65000, "ref_mult": 1.2},
    "capecitabina": {"price": 120.0, "vol": 180000, "ref_mult": 1.25},
    "tamoxifeno": {"price": 8.0, "vol": 4500000, "ref_mult": 1.4},
    "letrozol": {"price": 12.0, "vol": 2800000, "ref_mult": 1.35},
    "metotrexato": {"price": 350.0, "vol": 145000, "ref_mult": 1.25},
    "enalapril": {"price": 3.50, "vol": 22000000, "ref_mult": 1.45},
    "furosemida": {"price": 5.0, "vol": 15000000, "ref_mult": 1.4},
    "espironolactona": {"price": 6.0, "vol": 8500000, "ref_mult": 1.4},
    "insulina humana NPH": {"price": 125.0, "vol": 4200000, "ref_mult": 1.2},
    "glibenclamida": {"price": 2.50, "vol": 28000000, "ref_mult": 1.5},
    "liraglutida": {"price": 2800.0, "vol": 85000, "ref_mult": 1.1},
    "levodopa/carbidopa": {"price": 18.0, "vol": 1800000, "ref_mult": 1.35},
    "carbamazepina": {"price": 8.0, "vol": 3500000, "ref_mult": 1.4},
    "gabapentina": {"price": 15.0, "vol": 2200000, "ref_mult": 1.35},
    "fluoxetina": {"price": 6.0, "vol": 5500000, "ref_mult": 1.4},
    "clonazepam": {"price": 4.50, "vol": 8200000, "ref_mult": 1.4},
    "amoxicilina": {"price": 3.50, "vol": 18000000, "ref_mult": 1.5},
    "trimetoprim/sulfametoxazol": {"price": 4.0, "vol": 12000000, "ref_mult": 1.45},
    "metoclopramida": {"price": 6.0, "vol": 7500000, "ref_mult": 1.4},
    "epinefrina": {"price": 12.0, "vol": 5200000, "ref_mult": 1.35},
    "dobutamina": {"price": 85.0, "vol": 380000, "ref_mult": 1.25},
    "amiodarona": {"price": 45.0, "vol": 820000, "ref_mult": 1.3},
    "vacuna BCG": {"price": 18.0, "vol": 2400000, "ref_mult": 1.3},
    "vacuna pentavalente acelular": {"price": 280.0, "vol": 6800000, "ref_mult": 1.15},
    "vacuna SRP": {"price": 55.0, "vol": 5200000, "ref_mult": 1.2},
}

generic_suppliers = [
    "Laboratorios PiSA", "Laboratorios AMSA", "Fresenius Kabi",
    "Laboratorios Sophia", "Laboratorios Collins", "Accord Healthcare",
    "Teva México", "Mylan/Viatris", "Stendhal", "Laboratorios Senosiain",
    "Sandoz México", "Dr. Reddy's", "Landsteiner Scientific",
]

random.seed(43)

new_adj_count = 0
added_claves = 0

for clave_data in NEW_CLAVES:
    if clave_data["clave"] in existing_claves:
        print(f"  SKIP: {clave_data['clave']} {clave_data['active_substance']}")
        continue

    data["claves"].append(clave_data)
    existing_claves.add(clave_data["clave"])
    added_claves += 1

    substance = clave_data["active_substance"]
    source = clave_data["source_type"]
    profile = price_profiles.get(substance, {"price": 50.0, "vol": 100000, "ref_mult": 1.25})
    base_price = profile["price"]
    total_vol = profile["vol"]
    ref_mult = profile["ref_mult"]

    neg_type = "mesa_patente" if source == "patente" else "licitacion_publica"
    inst_splits = {"IMSS": 0.60, "ISSSTE": 0.20, "IMSS-Bienestar": 0.12, "PEMEX": 0.08}

    for cycle_idx, cycle in enumerate(CYCLES):
        price_factor = 1.0 - (cycle_idx * 0.04) if source != "patente" else 1.0 - (cycle_idx * 0.02)
        cycle_price = round(base_price * price_factor, 2)
        cycle_ref = round(base_price * ref_mult * (1.0 - cycle_idx * 0.015), 2)
        vol_factor = 1.0 + (cycle_idx * 0.08)

        for inst, split in inst_splits.items():
            inst_vol = int(total_vol * split * vol_factor)
            if inst_vol < 100:
                continue

            if cycle == "2027-2028":
                status = "en_proceso"
                awarded = 0
                price = 0.0
                supplier_name = ""
                notes = f"Tender in preparation. {inst} demand estimated at {inst_vol:,} units."
            else:
                status = "adjudicada"
                fulfillment = random.uniform(0.88, 1.0)
                awarded = int(inst_vol * fulfillment)
                price = cycle_price
                supplier_name = random.choice(generic_suppliers) if source != "patente" else clave_data.get("patent_holder", "Fabricante original")
                pct = round((1 - price / base_price) * 100, 1)
                if pct > 0:
                    notes = f"Price reduced {pct}% vs initial reference through competitive tender."
                else:
                    notes = "Competitive pricing achieved through multi-supplier tender."

            record = {
                "clave": clave_data["clave"],
                "description": clave_data["description"].split(".")[0] + ".",
                "active_substance": substance,
                "cycle": cycle,
                "status": status,
                "supplier": supplier_name,
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
            data["adjudicaciones"].append(record)
            new_adj_count += 1

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
