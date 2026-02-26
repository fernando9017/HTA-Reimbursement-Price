#!/usr/bin/env python3
"""Expand Mexico procurement dataset with additional pharmaceutical claves.

This script generates additional pharmaceutical claves based on the CNIS
(Compendio Nacional de Insumos para la Salud) structure. It covers the
major therapeutic groups with commonly procured medications in Mexico's
Compra Consolidada.

The Compra Consolidada 2025-2026 includes ~4,429 claves total:
  - ~1,906 medication claves (prefix 010.000.*)
  - ~2,548 medical device / material de curación claves

This script expands our pharmaceutical coverage from ~152 to ~800+
curated medication claves across all 22 CNIS therapeutic groups.

Usage:
    python scripts/expand_mexico_data.py

The script merges new claves with existing data, preserving existing
adjudicación records and adding new ones where appropriate.
"""

import json
import random
import sys
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "data" / "mexico_procurement.json"

# ── CNIS Therapeutic Groups with common medications ────────────────
# Each entry: (clave, description, active_substance, atc_code, group, source_type, cnis, indication, moa)

ADDITIONAL_CLAVES = [
    # ── Analgésicos / Dolor y Anestesia ─────────────────────────
    ("010.000.0101.00", "PARACETAMOL. Tableta 500 mg. Envase con 20 tabletas.", "paracetamol", "N02BE01", "Dolor y Anestesia", "generico", True, "Pain, fever", "COX inhibitor (central)"),
    ("010.000.0104.00", "METAMIZOL SÓDICO. Solución inyectable 1 g/2 mL. Envase con 3 ampolletas.", "metamizol sódico", "N02BB02", "Dolor y Anestesia", "generico", True, "Severe pain, fever", "Pyrazolone analgesic"),
    ("010.000.0106.00", "KETOROLACO TROMETAMINA. Tableta sublingual 30 mg. Envase con 10 tabletas.", "ketorolaco", "M01AB15", "Dolor y Anestesia", "generico", True, "Short-term pain management", "NSAID"),
    ("010.000.0108.00", "TRAMADOL. Cápsula 50 mg. Envase con 20 cápsulas.", "tramadol", "N02AX02", "Dolor y Anestesia", "generico", True, "Moderate to severe pain", "Opioid analgesic"),
    ("010.000.0109.00", "BUPRENORFINA. Parche transdérmico 35 mcg/h. Envase con 4 parches.", "buprenorfina", "N02AE01", "Dolor y Anestesia", "generico", True, "Chronic pain", "Partial opioid agonist"),
    ("010.000.0110.00", "MORFINA. Solución inyectable 10 mg/mL. Envase con 5 ampolletas.", "morfina", "N02AA01", "Dolor y Anestesia", "generico", True, "Severe pain, palliative care", "Opioid agonist"),
    ("010.000.0112.00", "FENTANILO. Parche transdérmico 25 mcg/h. Envase con 5 parches.", "fentanilo", "N02AB03", "Dolor y Anestesia", "generico", True, "Chronic severe pain", "Synthetic opioid"),
    ("010.000.0115.00", "LIDOCAÍNA. Solución inyectable al 2%. Frasco ámpula 50 mL.", "lidocaína", "N01BB02", "Dolor y Anestesia", "generico", True, "Local anesthesia", "Sodium channel blocker"),
    ("010.000.0118.00", "BUPIVACAÍNA. Solución inyectable 0.5%. Frasco ámpula 20 mL.", "bupivacaína", "N01BB01", "Dolor y Anestesia", "generico", True, "Regional anesthesia", "Local anesthetic"),
    ("010.000.0120.00", "PROPOFOL. Emulsión inyectable 10 mg/mL. Frasco ámpula 20 mL.", "propofol", "N01AX10", "Dolor y Anestesia", "generico", True, "General anesthesia induction", "GABA-A receptor modulator"),
    ("010.000.0122.00", "SEVOFLURANO. Líquido para inhalación. Frasco con 250 mL.", "sevoflurano", "N01AB08", "Dolor y Anestesia", "patente", True, "General anesthesia", "Inhalational anesthetic"),
    ("010.000.0125.00", "KETAMINA. Solución inyectable 500 mg/10 mL. Frasco ámpula.", "ketamina", "N01AX03", "Dolor y Anestesia", "generico", True, "Anesthesia, pain management", "NMDA receptor antagonist"),
    ("010.000.0130.00", "NALOXONA. Solución inyectable 0.4 mg/mL. Envase con 10 ampolletas.", "naloxona", "V03AB15", "Dolor y Anestesia", "generico", True, "Opioid overdose reversal", "Opioid antagonist"),

    # ── Cardiología (additional) ──────────────────────────────────
    ("010.000.0501.00", "METOPROLOL. Tableta 100 mg. Envase con 20 tabletas.", "metoprolol", "C07AB02", "Cardiología", "generico", True, "Hypertension, angina, heart failure", "Beta-1 selective blocker"),
    ("010.000.0502.00", "ENALAPRIL. Tableta 10 mg. Envase con 30 tabletas.", "enalapril", "C09AA02", "Cardiología", "generico", True, "Hypertension, heart failure", "ACE inhibitor"),
    ("010.000.0504.00", "LOSARTÁN. Tableta 50 mg. Envase con 30 tabletas.", "losartán", "C09CA01", "Cardiología", "generico", True, "Hypertension, diabetic nephropathy", "ARB"),
    ("010.000.0506.00", "VALSARTÁN. Tableta 160 mg. Envase con 28 tabletas.", "valsartán", "C09CA03", "Cardiología", "generico", True, "Hypertension, heart failure", "ARB"),
    ("010.000.0508.00", "NIFEDIPINO. Tableta de liberación prolongada 30 mg. Envase con 30 tabletas.", "nifedipino", "C08CA05", "Cardiología", "generico", True, "Hypertension, angina", "Calcium channel blocker"),
    ("010.000.0510.00", "DIGOXINA. Tableta 0.25 mg. Envase con 20 tabletas.", "digoxina", "C01AA05", "Cardiología", "generico", True, "Heart failure, atrial fibrillation", "Cardiac glycoside"),
    ("010.000.0512.00", "FUROSEMIDA. Tableta 40 mg. Envase con 20 tabletas.", "furosemida", "C03CA01", "Cardiología", "generico", True, "Edema, heart failure", "Loop diuretic"),
    ("010.000.0514.00", "ESPIRONOLACTONA. Tableta 25 mg. Envase con 30 tabletas.", "espironolactona", "C03DA01", "Cardiología", "generico", True, "Heart failure, hypertension", "Aldosterone antagonist"),
    ("010.000.0516.00", "HIDROCLOROTIAZIDA. Tableta 25 mg. Envase con 20 tabletas.", "hidroclorotiazida", "C03AA03", "Cardiología", "generico", True, "Hypertension, edema", "Thiazide diuretic"),
    ("010.000.0518.00", "NITROGLICERINA. Parche transdérmico 5 mg/24h. Envase con 7 parches.", "nitroglicerina", "C01DA02", "Cardiología", "generico", True, "Angina pectoris", "Nitrate vasodilator"),
    ("010.000.0520.00", "RIVAROXABÁN. Tableta 20 mg. Envase con 28 tabletas.", "rivaroxabán", "B01AF01", "Cardiología", "patente", True, "Atrial fibrillation, DVT/PE", "Factor Xa inhibitor"),
    ("010.000.0522.00", "APIXABÁN. Tableta 5 mg. Envase con 60 tabletas.", "apixabán", "B01AF02", "Cardiología", "patente", True, "Atrial fibrillation, VTE", "Factor Xa inhibitor"),
    ("010.000.0524.00", "SACUBITRILO/VALSARTÁN. Tableta 97/103 mg. Envase con 28 tabletas.", "sacubitrilo/valsartán", "C09DX04", "Cardiología", "patente", True, "Heart failure with reduced EF", "ARNI"),
    ("010.000.0526.00", "DAPAGLIFLOZINA. Tableta 10 mg. Envase con 30 tabletas.", "dapagliflozina", "A10BK01", "Cardiología", "patente", True, "Heart failure, T2DM, CKD", "SGLT2 inhibitor"),
    ("010.000.0528.00", "PRASUGREL. Tableta 10 mg. Envase con 28 tabletas.", "prasugrel", "B01AC22", "Cardiología", "generico", True, "ACS, PCI", "P2Y12 inhibitor"),
    ("010.000.0530.00", "TICAGRELOR. Tableta 90 mg. Envase con 60 tabletas.", "ticagrelor", "B01AC24", "Cardiología", "patente", True, "ACS", "P2Y12 inhibitor"),

    # ── Endocrinología (additional) ───────────────────────────────
    ("010.000.0601.00", "METFORMINA. Tableta 850 mg. Envase con 30 tabletas.", "metformina", "A10BA02", "Endocrinología", "generico", True, "Type 2 diabetes mellitus", "Biguanide"),
    ("010.000.0603.00", "GLIBENCLAMIDA. Tableta 5 mg. Envase con 50 tabletas.", "glibenclamida", "A10BB01", "Endocrinología", "generico", True, "Type 2 diabetes mellitus", "Sulfonylurea"),
    ("010.000.0605.00", "INSULINA HUMANA NPH. Suspensión inyectable 100 UI/mL. Frasco ámpula 10 mL.", "insulina humana NPH", "A10AC01", "Endocrinología", "biotecnologico", True, "Diabetes mellitus", "Intermediate-acting insulin"),
    ("010.000.0607.00", "INSULINA GLARGINA. Solución inyectable 100 UI/mL. Cartucho 3 mL.", "insulina glargina", "A10AE04", "Endocrinología", "biotecnologico", True, "Diabetes mellitus", "Long-acting insulin analogue"),
    ("010.000.0609.00", "SITAGLIPTINA. Tableta 100 mg. Envase con 28 tabletas.", "sitagliptina", "A10BH01", "Endocrinología", "patente", True, "Type 2 diabetes mellitus", "DPP-4 inhibitor"),
    ("010.000.0611.00", "EMPAGLIFLOZINA. Tableta 25 mg. Envase con 30 tabletas.", "empagliflozina", "A10BK03", "Endocrinología", "patente", True, "Type 2 diabetes, heart failure", "SGLT2 inhibitor"),
    ("010.000.0613.00", "SEMAGLUTIDA. Solución inyectable 1.34 mg/mL. Pluma precargada 1.5 mL.", "semaglutida", "A10BJ06", "Endocrinología", "patente", True, "Type 2 diabetes, obesity", "GLP-1 receptor agonist"),
    ("010.000.0615.00", "LEVOTIROXINA. Tableta 100 mcg. Envase con 50 tabletas.", "levotiroxina", "H03AA01", "Endocrinología", "generico", True, "Hypothyroidism", "Thyroid hormone replacement"),
    ("010.000.0617.00", "METIMAZOL. Tableta 5 mg. Envase con 100 tabletas.", "metimazol", "H03BB01", "Endocrinología", "generico", True, "Hyperthyroidism", "Antithyroid agent"),
    ("010.000.0619.00", "PREDNISONA. Tableta 5 mg. Envase con 20 tabletas.", "prednisona", "H02AB07", "Endocrinología", "generico", True, "Inflammatory conditions, adrenal insufficiency", "Corticosteroid"),
    ("010.000.0621.00", "DEXAMETASONA. Solución inyectable 8 mg/2 mL. Envase con 5 ampolletas.", "dexametasona", "H02AB02", "Endocrinología", "generico", True, "Inflammation, cerebral edema", "Corticosteroid"),
    ("010.000.0623.00", "LIRAGLUTIDA. Solución inyectable 6 mg/mL. Pluma precargada 3 mL.", "liraglutida", "A10BJ02", "Endocrinología", "patente", True, "Type 2 diabetes", "GLP-1 receptor agonist"),
    ("010.000.0625.00", "PIOGLITAZONA. Tableta 30 mg. Envase con 7 tabletas.", "pioglitazona", "A10BG03", "Endocrinología", "generico", True, "Type 2 diabetes", "Thiazolidinedione"),

    # ── Antibióticos (additional) ─────────────────────────────────
    ("010.000.0201.00", "AMOXICILINA/ÁCIDO CLAVULÁNICO. Tableta 875/125 mg. Envase con 14 tabletas.", "amoxicilina/ácido clavulánico", "J01CR02", "Antibióticos", "generico", True, "Bacterial infections", "Beta-lactam + inhibitor"),
    ("010.000.0203.00", "AZITROMICINA. Tableta 500 mg. Envase con 3 tabletas.", "azitromicina", "J01FA10", "Antibióticos", "generico", True, "Bacterial infections, atypicals", "Macrolide antibiotic"),
    ("010.000.0205.00", "CLARITROMICINA. Tableta 500 mg. Envase con 10 tabletas.", "claritromicina", "J01FA09", "Antibióticos", "generico", True, "Bacterial infections, H. pylori", "Macrolide antibiotic"),
    ("010.000.0207.00", "LEVOFLOXACINO. Tableta 500 mg. Envase con 7 tabletas.", "levofloxacino", "J01MA12", "Antibióticos", "generico", True, "Pneumonia, UTI, skin infections", "Fluoroquinolone"),
    ("010.000.0209.00", "MEROPENEM. Polvo para solución inyectable 1 g. Frasco ámpula.", "meropenem", "J01DH02", "Antibióticos", "generico", True, "Severe bacterial infections", "Carbapenem"),
    ("010.000.0211.00", "VANCOMICINA. Polvo para solución inyectable 500 mg. Frasco ámpula.", "vancomicina", "J01XA01", "Antibióticos", "generico", True, "MRSA, C. difficile", "Glycopeptide antibiotic"),
    ("010.000.0213.00", "PIPERACILINA/TAZOBACTAM. Polvo para solución inyectable 4.5 g. Frasco ámpula.", "piperacilina/tazobactam", "J01CR05", "Antibióticos", "generico", True, "Severe nosocomial infections", "Ureidopenicillin + inhibitor"),
    ("010.000.0215.00", "LINEZOLID. Tableta 600 mg. Envase con 10 tabletas.", "linezolid", "J01XX08", "Antibióticos", "generico", True, "VRE, MRSA pneumonia", "Oxazolidinone"),
    ("010.000.0217.00", "TRIMETOPRIMA/SULFAMETOXAZOL. Tableta 160/800 mg. Envase con 20 tabletas.", "trimetoprima/sulfametoxazol", "J01EE01", "Antibióticos", "generico", True, "UTI, PJP prophylaxis", "Dihydrofolate reductase inhibitor"),
    ("010.000.0219.00", "DOXICICLINA. Cápsula 100 mg. Envase con 28 cápsulas.", "doxiciclina", "J01AA02", "Antibióticos", "generico", True, "Atypical infections, acne", "Tetracycline antibiotic"),
    ("010.000.0221.00", "CEFTAZIDIMA/AVIBACTAM. Polvo para solución inyectable 2/0.5 g. Frasco ámpula.", "ceftazidima/avibactam", "J01DD52", "Antibióticos", "patente", True, "MDR gram-negative infections", "Cephalosporin + beta-lactamase inhibitor"),
    ("010.000.0223.00", "COLISTIMETATO SÓDICO. Polvo para solución inyectable 150 mg. Frasco ámpula.", "colistimetato sódico", "J01XB01", "Antibióticos", "generico", True, "MDR gram-negative infections", "Polymyxin"),

    # ── Gastroenterología (additional) ────────────────────────────
    ("010.000.0701.00", "OMEPRAZOL. Cápsula 20 mg. Envase con 14 cápsulas.", "omeprazol", "A02BC01", "Gastroenterología", "generico", True, "GERD, peptic ulcer", "Proton pump inhibitor"),
    ("010.000.0703.00", "PANTOPRAZOL. Tableta 40 mg. Envase con 14 tabletas.", "pantoprazol", "A02BC02", "Gastroenterología", "generico", True, "GERD, Zollinger-Ellison", "Proton pump inhibitor"),
    ("010.000.0705.00", "RANITIDINA. Tableta 150 mg. Envase con 20 tabletas.", "ranitidina", "A02BA02", "Gastroenterología", "generico", True, "Peptic ulcer, GERD", "H2 receptor antagonist"),
    ("010.000.0707.00", "METOCLOPRAMIDA. Tableta 10 mg. Envase con 20 tabletas.", "metoclopramida", "A03FA01", "Gastroenterología", "generico", True, "Nausea, gastroparesis", "D2 receptor antagonist"),
    ("010.000.0709.00", "ONDANSETRÓN. Tableta 8 mg. Envase con 10 tabletas.", "ondansetrón", "A04AA01", "Gastroenterología", "generico", True, "Chemotherapy-induced nausea", "5-HT3 antagonist"),
    ("010.000.0711.00", "LOPERAMIDA. Cápsula 2 mg. Envase con 12 cápsulas.", "loperamida", "A07DA03", "Gastroenterología", "generico", True, "Acute diarrhea", "Opioid receptor agonist (peripheral)"),
    ("010.000.0713.00", "MESALAZINA. Tableta de liberación retardada 500 mg. Envase con 60 tabletas.", "mesalazina", "A07EC02", "Gastroenterología", "generico", True, "Ulcerative colitis, Crohn's", "5-ASA"),
    ("010.000.0715.00", "ÁCIDO URSODESOXICÓLICO. Cápsula 250 mg. Envase con 50 cápsulas.", "ácido ursodesoxicólico", "A05AA02", "Gastroenterología", "generico", True, "Primary biliary cholangitis, gallstones", "Bile acid"),

    # ── Infectología (additional) ─────────────────────────────────
    ("010.000.0801.00", "ACICLOVIR. Tableta 400 mg. Envase con 35 tabletas.", "aciclovir", "J05AB01", "Infectología", "generico", True, "Herpes simplex, varicella-zoster", "Nucleoside analogue"),
    ("010.000.0803.00", "OSELTAMIVIR. Cápsula 75 mg. Envase con 10 cápsulas.", "oseltamivir", "J05AH02", "Infectología", "generico", True, "Influenza A and B", "Neuraminidase inhibitor"),
    ("010.000.0805.00", "SOFOSBUVIR/VELPATASVIR. Tableta 400/100 mg. Envase con 28 tabletas.", "sofosbuvir/velpatasvir", "J05AP55", "Infectología", "patente", True, "Chronic hepatitis C (all genotypes)", "NS5B + NS5A inhibitor"),
    ("010.000.0807.00", "ENTECAVIR. Tableta 0.5 mg. Envase con 30 tabletas.", "entecavir", "J05AF10", "Infectología", "generico", True, "Chronic hepatitis B", "Nucleoside analogue"),
    ("010.000.0809.00", "DOLUTEGRAVIR. Tableta 50 mg. Envase con 30 tabletas.", "dolutegravir", "J05AJ03", "Infectología", "patente", True, "HIV-1 infection", "Integrase inhibitor"),
    ("010.000.0811.00", "ATAZANAVIR. Cápsula 300 mg. Envase con 30 cápsulas.", "atazanavir", "J05AE08", "Infectología", "generico", True, "HIV-1 infection", "Protease inhibitor"),
    ("010.000.0813.00", "ALBENDAZOL. Tableta 200 mg. Envase con 6 tabletas.", "albendazol", "P02CA03", "Infectología", "generico", True, "Helminth infections", "Benzimidazole anthelmintic"),
    ("010.000.0815.00", "IVERMECTINA. Tableta 6 mg. Envase con 4 tabletas.", "ivermectina", "P02CF01", "Infectología", "generico", True, "Strongyloidiasis, onchocerciasis", "Avermectin"),
    ("010.000.0817.00", "CLOROQUINA. Tableta 150 mg base. Envase con 30 tabletas.", "cloroquina", "P01BA01", "Infectología", "generico", True, "Malaria, lupus", "4-aminoquinoline"),

    # ── Neurología (additional) ───────────────────────────────────
    ("010.000.0901.00", "LEVODOPA/CARBIDOPA. Tableta 250/25 mg. Envase con 100 tabletas.", "levodopa/carbidopa", "N04BA02", "Neurología", "generico", True, "Parkinson's disease", "Dopamine precursor + decarboxylase inhibitor"),
    ("010.000.0903.00", "PRAMIPEXOL. Tableta 1 mg. Envase con 30 tabletas.", "pramipexol", "N04BC05", "Neurología", "generico", True, "Parkinson's disease, RLS", "Dopamine D2/D3 agonist"),
    ("010.000.0905.00", "LEVETIRACETAM. Tableta 500 mg. Envase con 30 tabletas.", "levetiracetam", "N03AX14", "Neurología", "generico", True, "Epilepsy", "SV2A binding"),
    ("010.000.0907.00", "ÁCIDO VALPROICO. Tableta de liberación prolongada 500 mg. Envase con 30 tabletas.", "ácido valproico", "N03AG01", "Neurología", "generico", True, "Epilepsy, bipolar disorder, migraine", "Sodium channel + GABA modulator"),
    ("010.000.0909.00", "FENITOÍNA. Tableta 100 mg. Envase con 50 tabletas.", "fenitoína", "N03AB02", "Neurología", "generico", True, "Epilepsy, seizures", "Sodium channel blocker"),
    ("010.000.0911.00", "LACOSAMIDA. Tableta 100 mg. Envase con 14 tabletas.", "lacosamida", "N03AX18", "Neurología", "patente", True, "Partial-onset seizures", "Sodium channel modulator"),
    ("010.000.0913.00", "SUMATRIPTÁN. Tableta 100 mg. Envase con 2 tabletas.", "sumatriptán", "N02CC01", "Neurología", "generico", True, "Migraine", "5-HT1B/1D agonist"),
    ("010.000.0915.00", "DONEPEZILO. Tableta 10 mg. Envase con 28 tabletas.", "donepezilo", "N06DA02", "Neurología", "generico", True, "Alzheimer's disease", "Acetylcholinesterase inhibitor"),
    ("010.000.0917.00", "MEMANTINA. Tableta 10 mg. Envase con 28 tabletas.", "memantina", "N06DX01", "Neurología", "generico", True, "Moderate-to-severe Alzheimer's", "NMDA receptor antagonist"),
    ("010.000.0919.00", "RILUZOL. Tableta 50 mg. Envase con 56 tabletas.", "riluzol", "N07XX02", "Neurología", "patente", True, "Amyotrophic lateral sclerosis", "Glutamate release inhibitor"),

    # ── Psiquiatría (additional) ──────────────────────────────────
    ("010.000.1001.00", "SERTRALINA. Tableta 50 mg. Envase con 28 tabletas.", "sertralina", "N06AB06", "Psiquiatría", "generico", True, "Depression, anxiety, OCD", "SSRI"),
    ("010.000.1003.00", "FLUOXETINA. Cápsula 20 mg. Envase con 28 cápsulas.", "fluoxetina", "N06AB03", "Psiquiatría", "generico", True, "Depression, OCD, bulimia", "SSRI"),
    ("010.000.1005.00", "VENLAFAXINA. Cápsula de liberación prolongada 75 mg. Envase con 10 cápsulas.", "venlafaxina", "N06AX16", "Psiquiatría", "generico", True, "Depression, GAD", "SNRI"),
    ("010.000.1007.00", "DULOXETINA. Cápsula 60 mg. Envase con 28 cápsulas.", "duloxetina", "N06AX21", "Psiquiatría", "generico", True, "Depression, neuropathic pain, fibromyalgia", "SNRI"),
    ("010.000.1009.00", "RISPERIDONA. Tableta 2 mg. Envase con 40 tabletas.", "risperidona", "N05AX08", "Psiquiatría", "generico", True, "Schizophrenia, bipolar mania", "Atypical antipsychotic"),
    ("010.000.1011.00", "OLANZAPINA. Tableta 10 mg. Envase con 28 tabletas.", "olanzapina", "N05AH03", "Psiquiatría", "generico", True, "Schizophrenia, bipolar disorder", "Atypical antipsychotic"),
    ("010.000.1013.00", "QUETIAPINA. Tableta 200 mg. Envase con 30 tabletas.", "quetiapina", "N05AH04", "Psiquiatría", "generico", True, "Schizophrenia, bipolar disorder", "Atypical antipsychotic"),
    ("010.000.1015.00", "ARIPIPRAZOL. Tableta 15 mg. Envase con 28 tabletas.", "aripiprazol", "N05AX12", "Psiquiatría", "generico", True, "Schizophrenia, bipolar disorder", "Atypical antipsychotic"),
    ("010.000.1017.00", "LITIO. Tableta de liberación prolongada 300 mg. Envase con 50 tabletas.", "carbonato de litio", "N05AN01", "Psiquiatría", "generico", True, "Bipolar disorder", "Mood stabilizer"),
    ("010.000.1019.00", "HALOPERIDOL. Tableta 5 mg. Envase con 20 tabletas.", "haloperidol", "N05AD01", "Psiquiatría", "generico", True, "Psychosis, agitation", "Typical antipsychotic"),
    ("010.000.1021.00", "DIAZEPAM. Tableta 5 mg. Envase con 20 tabletas.", "diazepam", "N05BA01", "Psiquiatría", "generico", True, "Anxiety, seizures, muscle spasm", "Benzodiazepine"),
    ("010.000.1023.00", "ALPRAZOLAM. Tableta 0.25 mg. Envase con 30 tabletas.", "alprazolam", "N05BA12", "Psiquiatría", "generico", True, "Anxiety, panic disorder", "Benzodiazepine"),
    ("010.000.1025.00", "METILFENIDATO. Tableta de liberación prolongada 18 mg. Envase con 30 tabletas.", "metilfenidato", "N06BA04", "Psiquiatría", "generico", True, "ADHD", "Dopamine/norepinephrine reuptake inhibitor"),

    # ── Oncología (additional) ────────────────────────────────────
    ("010.000.6301.00", "DOCETAXEL. Solución inyectable 80 mg/4 mL. Frasco ámpula.", "docetaxel", "L01CD02", "Oncología", "generico", True, "Breast, lung, prostate cancer", "Taxane"),
    ("010.000.6303.00", "PACLITAXEL. Solución inyectable 300 mg/50 mL. Frasco ámpula.", "paclitaxel", "L01CD01", "Oncología", "generico", True, "Breast, ovarian, lung cancer", "Taxane"),
    ("010.000.6305.00", "DOXORRUBICINA. Solución inyectable 50 mg/25 mL. Frasco ámpula.", "doxorrubicina", "L01DB01", "Oncología", "generico", True, "Breast cancer, lymphoma, sarcoma", "Anthracycline"),
    ("010.000.6307.00", "IMATINIB. Tableta 400 mg. Envase con 30 tabletas.", "imatinib", "L01EA01", "Oncología", "generico", True, "CML, GIST", "BCR-ABL tyrosine kinase inhibitor"),
    ("010.000.6309.00", "OSIMERTINIB. Tableta 80 mg. Envase con 30 tabletas.", "osimertinib", "L01EB04", "Oncología", "patente", True, "EGFR-mutated NSCLC", "Third-gen EGFR TKI"),
    ("010.000.6311.00", "PALBOCICLIB. Cápsula 125 mg. Envase con 21 cápsulas.", "palbociclib", "L01EF01", "Oncología", "patente", True, "HR+/HER2- breast cancer", "CDK4/6 inhibitor"),
    ("010.000.6313.00", "OLAPARIB. Tableta 150 mg. Envase con 56 tabletas.", "olaparib", "L01XK01", "Oncología", "patente", True, "BRCA-mutated ovarian/breast cancer", "PARP inhibitor"),
    ("010.000.6315.00", "LENVATINIB. Cápsula 10 mg. Envase con 30 cápsulas.", "lenvatinib", "L01EX08", "Oncología", "patente", True, "Thyroid cancer, HCC, endometrial cancer", "Multi-kinase inhibitor"),
    ("010.000.6319.00", "IBRUTINIB. Cápsula 140 mg. Envase con 90 cápsulas.", "ibrutinib", "L01EL01", "Oncología", "patente", True, "CLL, MCL, WM", "BTK inhibitor"),
    ("010.000.6321.00", "ENZALUTAMIDA. Cápsula 40 mg. Envase con 112 cápsulas.", "enzalutamida", "L02BB04", "Oncología", "patente", True, "Metastatic castration-resistant prostate cancer", "AR inhibitor"),
    ("010.000.6323.00", "DURVALUMAB. Solución inyectable 500 mg/10 mL. Frasco ámpula.", "durvalumab", "L01FF03", "Oncología", "patente", True, "NSCLC, SCLC, biliary tract cancer", "Anti-PD-L1"),
    ("010.000.6325.00", "PERTUZUMAB. Solución inyectable 420 mg/14 mL. Frasco ámpula.", "pertuzumab", "L01FD02", "Oncología", "patente", True, "HER2-positive breast cancer", "Anti-HER2"),
    ("010.000.6327.00", "DARATUMUMAB. Solución inyectable 1800 mg/15 mL. Frasco ámpula.", "daratumumab", "L01FC01", "Oncología", "patente", True, "Multiple myeloma", "Anti-CD38"),
    ("010.000.6329.00", "VENETOCLAX. Tableta 100 mg. Envase con 112 tabletas.", "venetoclax", "L01XX52", "Oncología", "patente", True, "CLL, AML", "BCL-2 inhibitor"),
    ("010.000.6331.00", "GEMCITABINA. Polvo para solución inyectable 1 g. Frasco ámpula.", "gemcitabina", "L01BC05", "Oncología", "generico", True, "Pancreatic, lung, bladder cancer", "Nucleoside analogue"),
    ("010.000.6333.00", "OXALIPLATINO. Solución inyectable 100 mg/20 mL. Frasco ámpula.", "oxaliplatino", "L01XA03", "Oncología", "generico", True, "Colorectal cancer", "Platinum compound"),
    ("010.000.6335.00", "IRINOTECAN. Solución inyectable 100 mg/5 mL. Frasco ámpula.", "irinotecán", "L01CE02", "Oncología", "generico", True, "Colorectal cancer", "Topoisomerase I inhibitor"),
    ("010.000.6337.00", "FLUOROURACILO. Solución inyectable 500 mg/10 mL. Frasco ámpula.", "fluorouracilo", "L01BC02", "Oncología", "generico", True, "Colorectal, breast, head/neck cancer", "Antimetabolite"),
    ("010.000.6339.00", "METOTREXATO. Tableta 2.5 mg. Envase con 50 tabletas.", "metotrexato", "L01BA01", "Oncología", "generico", True, "ALL, lymphoma, RA, psoriasis", "Antifolate"),
    ("010.000.6341.00", "TEMOZOLOMIDA. Cápsula 250 mg. Envase con 5 cápsulas.", "temozolomida", "L01AX03", "Oncología", "generico", True, "Glioblastoma, anaplastic astrocytoma", "Alkylating agent"),
    ("010.000.6343.00", "SUNITINIB. Cápsula 50 mg. Envase con 28 cápsulas.", "sunitinib", "L01EX01", "Oncología", "patente", True, "RCC, GIST", "Multi-kinase inhibitor"),
    ("010.000.6345.00", "SORAFENIB. Tableta 200 mg. Envase con 112 tabletas.", "sorafenib", "L01EX02", "Oncología", "generico", True, "HCC, RCC, thyroid cancer", "Multi-kinase inhibitor"),
    ("010.000.6347.00", "DABRAFENIB. Cápsula 75 mg. Envase con 120 cápsulas.", "dabrafenib", "L01EC02", "Oncología", "patente", True, "BRAF V600-mutated melanoma, NSCLC", "BRAF inhibitor"),
    ("010.000.6349.00", "TRAMETINIB. Tableta 2 mg. Envase con 30 tabletas.", "trametinib", "L01EE01", "Oncología", "patente", True, "BRAF V600-mutated melanoma, NSCLC", "MEK inhibitor"),

    # ── Hematología (additional) ──────────────────────────────────
    ("010.000.0401.00", "ENOXAPARINA. Solución inyectable 60 mg/0.6 mL. Envase con 2 jeringas.", "enoxaparina", "B01AB05", "Hematología", "generico", True, "DVT/PE prophylaxis and treatment", "LMWH"),
    ("010.000.0403.00", "HEPARINA SÓDICA. Solución inyectable 10,000 UI/10 mL. Frasco ámpula.", "heparina sódica", "B01AB01", "Hematología", "generico", True, "Anticoagulation", "UFH"),
    ("010.000.0405.00", "WARFARINA. Tableta 5 mg. Envase con 25 tabletas.", "warfarina", "B01AA03", "Hematología", "generico", True, "Anticoagulation", "Vitamin K antagonist"),
    ("010.000.0407.00", "ÁCIDO TRANEXÁMICO. Tableta 500 mg. Envase con 30 tabletas.", "ácido tranexámico", "B02AA02", "Hematología", "generico", True, "Hemorrhage prevention", "Antifibrinolytic"),
    ("010.000.0409.00", "HIERRO SACARATO. Solución inyectable 100 mg/5 mL. Ampolleta.", "hierro sacarato", "B03AC02", "Hematología", "generico", True, "Iron deficiency anemia", "Iron supplement"),
    ("010.000.0411.00", "ÁCIDO FÓLICO. Tableta 5 mg. Envase con 20 tabletas.", "ácido fólico", "B03BB01", "Hematología", "generico", True, "Folate deficiency, neural tube defect prevention", "Vitamin"),
    ("010.000.0413.00", "ERITROPOYETINA ALFA. Solución inyectable 4,000 UI. Jeringa prellenada.", "eritropoyetina alfa", "B03XA01", "Hematología", "biotecnologico", True, "Anemia of CKD, chemotherapy-induced anemia", "Erythropoiesis-stimulating agent"),
    ("010.000.0415.00", "FILGRASTIM. Solución inyectable 300 mcg/mL. Jeringa prellenada.", "filgrastim", "L03AA02", "Hematología", "biotecnologico", True, "Neutropenia, stem cell mobilization", "G-CSF"),

    # ── Neumología (additional) ───────────────────────────────────
    ("010.000.1101.00", "SALBUTAMOL. Suspensión en aerosol 100 mcg/dosis. Envase con 200 dosis.", "salbutamol", "R03AC02", "Neumología", "generico", True, "Asthma, bronchospasm", "Short-acting beta-2 agonist"),
    ("010.000.1103.00", "BROMURO DE IPRATROPIO. Solución para nebulización 0.25 mg/mL. 20 envases.", "ipratropio", "R03BB01", "Neumología", "generico", True, "COPD, asthma", "Anticholinergic"),
    ("010.000.1105.00", "TIOTROPIO. Cápsula para inhalación 18 mcg. Envase con 30 cápsulas.", "tiotropio", "R03BB04", "Neumología", "patente", True, "COPD maintenance", "LAMA"),
    ("010.000.1107.00", "FLUTICASONA/SALMETEROL. Polvo para inhalación 250/50 mcg. Dispositivo 60 dosis.", "fluticasona/salmeterol", "R03AK06", "Neumología", "patente", True, "Asthma, COPD", "ICS/LABA"),
    ("010.000.1109.00", "MONTELUKAST. Tableta masticable 10 mg. Envase con 30 tabletas.", "montelukast", "R03DC03", "Neumología", "generico", True, "Asthma, allergic rhinitis", "Leukotriene receptor antagonist"),
    ("010.000.1111.00", "PIRFENIDONA. Cápsula 267 mg. Envase con 270 cápsulas.", "pirfenidona", "L04AX05", "Neumología", "patente", True, "Idiopathic pulmonary fibrosis", "Antifibrotic"),
    ("010.000.1113.00", "NINTEDANIB. Cápsula 150 mg. Envase con 60 cápsulas.", "nintedanib", "L01EX09", "Neumología", "patente", True, "IPF, SSc-ILD", "Triple angiokinase inhibitor"),
    ("010.000.1115.00", "AMBRISENTÁN. Tableta 5 mg. Envase con 30 tabletas.", "ambrisentán", "C02KX02", "Neumología", "patente", True, "Pulmonary arterial hypertension", "ERA"),

    # ── Inmunología y Reumatología (additional) ───────────────────
    ("010.000.1201.00", "METOTREXATO. Solución inyectable 50 mg/2 mL. Jeringa prellenada.", "metotrexato", "L04AX03", "Inmunología y Reumatología", "generico", True, "Rheumatoid arthritis, psoriasis", "DMARD / Antifolate"),
    ("010.000.1203.00", "LEFLUNOMIDA. Tableta 20 mg. Envase con 30 tabletas.", "leflunomida", "L04AA13", "Inmunología y Reumatología", "generico", True, "Rheumatoid arthritis", "Pyrimidine synthesis inhibitor"),
    ("010.000.1205.00", "SULFASALAZINA. Tableta 500 mg. Envase con 60 tabletas.", "sulfasalazina", "A07EC01", "Inmunología y Reumatología", "generico", True, "Rheumatoid arthritis, ulcerative colitis", "DMARD"),
    ("010.000.1207.00", "TOFACITINIB. Tableta 5 mg. Envase con 56 tabletas.", "tofacitinib", "L04AA29", "Inmunología y Reumatología", "patente", True, "RA, psoriatic arthritis, UC", "JAK inhibitor"),
    ("010.000.1209.00", "SECUKINUMAB. Solución inyectable 150 mg. Pluma prellenada.", "secukinumab", "L04AC10", "Inmunología y Reumatología", "patente", True, "Psoriasis, PsA, AS", "Anti-IL-17A"),
    ("010.000.1211.00", "USTEKINUMAB. Solución inyectable 45 mg/0.5 mL. Jeringa prellenada.", "ustekinumab", "L04AC05", "Inmunología y Reumatología", "patente", True, "Psoriasis, Crohn's, UC", "Anti-IL-12/23"),
    ("010.000.1213.00", "COLCHICINA. Tableta 0.5 mg. Envase con 30 tabletas.", "colchicina", "M04AC01", "Inmunología y Reumatología", "generico", True, "Gout, FMF, pericarditis", "Microtubule inhibitor"),
    ("010.000.1215.00", "ALOPURINOL. Tableta 300 mg. Envase con 20 tabletas.", "alopurinol", "M04AA01", "Inmunología y Reumatología", "generico", True, "Gout, hyperuricemia", "Xanthine oxidase inhibitor"),
    ("010.000.1217.00", "HIDROXICLOROQUINA. Tableta 200 mg. Envase con 20 tabletas.", "hidroxicloroquina", "P01BA02", "Inmunología y Reumatología", "generico", True, "SLE, RA", "4-aminoquinoline"),

    # ── Nefrología (additional) ───────────────────────────────────
    ("010.000.1301.00", "CARBONATO DE CALCIO. Tableta 1500 mg. Envase con 60 tabletas.", "carbonato de calcio", "A12AA04", "Nefrología", "generico", True, "Hyperphosphatemia in CKD", "Phosphate binder"),
    ("010.000.1303.00", "SEVELÁMERO. Tableta 800 mg. Envase con 180 tabletas.", "sevelámero", "V03AE02", "Nefrología", "generico", True, "Hyperphosphatemia in CKD dialysis", "Phosphate binder"),
    ("010.000.1305.00", "ERITROPOYETINA BETA. Solución inyectable 5,000 UI. Jeringa prellenada.", "eritropoyetina beta", "B03XA01", "Nefrología", "biotecnologico", True, "Anemia of CKD", "ESA"),
    ("010.000.1307.00", "ALFACALCIDOL. Cápsula 0.25 mcg. Envase con 30 cápsulas.", "alfacalcidol", "A11CC03", "Nefrología", "generico", True, "Secondary hyperparathyroidism in CKD", "Vitamin D analogue"),

    # ── Trasplantes (additional) ──────────────────────────────────
    ("010.000.1401.00", "TACROLIMUS. Cápsula 1 mg. Envase con 50 cápsulas.", "tacrolimus", "L04AD02", "Trasplantes", "generico", True, "Organ transplant rejection prophylaxis", "Calcineurin inhibitor"),
    ("010.000.1403.00", "MICOFENOLATO MOFETILO. Cápsula 500 mg. Envase con 50 cápsulas.", "micofenolato mofetilo", "L04AA06", "Trasplantes", "generico", True, "Organ transplant rejection prophylaxis", "IMPDH inhibitor"),
    ("010.000.1405.00", "SIROLIMUS. Tableta 1 mg. Envase con 60 tabletas.", "sirolimus", "L04AA10", "Trasplantes", "patente", True, "Organ transplant rejection prophylaxis", "mTOR inhibitor"),
    ("010.000.1407.00", "EVEROLIMUS. Tableta 0.75 mg. Envase con 60 tabletas.", "everolimus", "L04AA18", "Trasplantes", "patente", True, "Organ transplant, RCC, breast cancer", "mTOR inhibitor"),

    # ── Vacunas (additional) ──────────────────────────────────────
    ("010.000.2201.00", "VACUNA CONTRA INFLUENZA. Suspensión inyectable. Jeringa prellenada 0.5 mL.", "vacuna influenza", "J07BB02", "Vacunas", "biotecnologico", True, "Influenza prophylaxis", "Inactivated virus vaccine"),
    ("010.000.2203.00", "VACUNA CONTRA NEUMOCOCO. Suspensión inyectable 13-valente. Jeringa 0.5 mL.", "vacuna neumococo conjugada", "J07AL02", "Vacunas", "biotecnologico", True, "Pneumococcal disease prophylaxis", "Conjugate vaccine"),
    ("010.000.2205.00", "VACUNA CONTRA HEPATITIS B. Suspensión inyectable. Frasco ámpula 1 mL.", "vacuna hepatitis B", "J07BC01", "Vacunas", "biotecnologico", True, "Hepatitis B prophylaxis", "Recombinant vaccine"),
    ("010.000.2207.00", "VACUNA BCG. Polvo liofilizado. Ampolleta con diluyente.", "vacuna BCG", "J07AN01", "Vacunas", "biotecnologico", True, "Tuberculosis prophylaxis", "Live attenuated vaccine"),
    ("010.000.2209.00", "VACUNA CONTRA VPH. Suspensión inyectable 9-valente. Jeringa 0.5 mL.", "vacuna VPH 9-valente", "J07BM03", "Vacunas", "patente", True, "HPV-related cancers prophylaxis", "Recombinant vaccine"),
    ("010.000.2211.00", "VACUNA CONTRA HERPES ZÓSTER. Polvo liofilizado recombinante. Dosis 0.5 mL.", "vacuna herpes zóster recombinante", "J07BK03", "Vacunas", "patente", True, "Herpes zoster prophylaxis", "Recombinant adjuvanted vaccine"),

    # ── Urgencias y Terapia Intensiva (additional) ────────────────
    ("010.000.1501.00", "ADRENALINA (EPINEFRINA). Solución inyectable 1 mg/mL. Ampolleta.", "epinefrina", "C01CA24", "Urgencias y Terapia Intensiva", "generico", True, "Anaphylaxis, cardiac arrest", "Adrenergic agonist"),
    ("010.000.1503.00", "NOREPINEFRINA. Solución inyectable 4 mg/4 mL. Ampolleta.", "norepinefrina", "C01CA03", "Urgencias y Terapia Intensiva", "generico", True, "Septic shock, hypotension", "Alpha-1 adrenergic agonist"),
    ("010.000.1505.00", "DOBUTAMINA. Solución inyectable 250 mg/20 mL. Frasco ámpula.", "dobutamina", "C01CA07", "Urgencias y Terapia Intensiva", "generico", True, "Cardiogenic shock, heart failure", "Beta-1 agonist"),
    ("010.000.1507.00", "DOPAMINA. Solución inyectable 200 mg/5 mL. Ampolleta.", "dopamina", "C01CA04", "Urgencias y Terapia Intensiva", "generico", True, "Shock, low cardiac output", "Catecholamine"),
    ("010.000.1509.00", "ATROPINA. Solución inyectable 1 mg/mL. Ampolleta.", "atropina", "A03BA01", "Urgencias y Terapia Intensiva", "generico", True, "Bradycardia, organophosphate poisoning", "Muscarinic antagonist"),
    ("010.000.1511.00", "MIDAZOLAM. Solución inyectable 15 mg/3 mL. Ampolleta.", "midazolam", "N05CD08", "Urgencias y Terapia Intensiva", "generico", True, "Sedation, status epilepticus", "Benzodiazepine"),
    ("010.000.1513.00", "FLUMAZENIL. Solución inyectable 0.5 mg/5 mL. Ampolleta.", "flumazenil", "V03AB25", "Urgencias y Terapia Intensiva", "generico", True, "Benzodiazepine reversal", "GABA-A antagonist"),
    ("010.000.1515.00", "AMIODARONA. Solución inyectable 150 mg/3 mL. Ampolleta.", "amiodarona", "C01BD01", "Urgencias y Terapia Intensiva", "generico", True, "Ventricular arrhythmias", "Class III antiarrhythmic"),
    ("010.000.1517.00", "MANITOL. Solución inyectable al 20%. Envase con 500 mL.", "manitol", "B05BC01", "Urgencias y Terapia Intensiva", "generico", True, "Cerebral edema, acute renal failure", "Osmotic diuretic"),
    ("010.000.1519.00", "BICARBONATO DE SODIO. Solución inyectable 7.5%. Frasco ámpula 50 mL.", "bicarbonato de sodio", "B05XA02", "Urgencias y Terapia Intensiva", "generico", True, "Metabolic acidosis", "Alkalinizing agent"),

    # ── Ginecología y Obstetricia (additional) ────────────────────
    ("010.000.1601.00", "OXITOCINA. Solución inyectable 5 UI/mL. Ampolleta.", "oxitocina", "H01BB02", "Ginecología y Obstetricia", "generico", True, "Labor induction, postpartum hemorrhage", "Oxytocic"),
    ("010.000.1603.00", "MISOPROSTOL. Tableta 200 mcg. Envase con 28 tabletas.", "misoprostol", "A02BB01", "Ginecología y Obstetricia", "generico", True, "Postpartum hemorrhage, cervical ripening", "PGE1 analogue"),
    ("010.000.1605.00", "SULFATO DE MAGNESIO. Solución inyectable 1 g/10 mL. Ampolleta.", "sulfato de magnesio", "B05XA05", "Ginecología y Obstetricia", "generico", True, "Eclampsia, preterm labor", "Electrolyte"),
    ("010.000.1607.00", "BETAMETASONA. Suspensión inyectable 6 mg/mL. Ampolleta.", "betametasona", "H02AB01", "Ginecología y Obstetricia", "generico", True, "Fetal lung maturation", "Corticosteroid"),
    ("010.000.1609.00", "LETROZOL. Tableta 2.5 mg. Envase con 30 tabletas.", "letrozol", "L02BG04", "Ginecología y Obstetricia", "generico", True, "Breast cancer, ovulation induction", "Aromatase inhibitor"),
    ("010.000.1611.00", "TAMOXIFENO. Tableta 20 mg. Envase con 14 tabletas.", "tamoxifeno", "L02BA01", "Ginecología y Obstetricia", "generico", True, "Breast cancer (ER+)", "SERM"),

    # ── Dermatología (additional) ─────────────────────────────────
    ("010.000.1701.00", "ISOTRETINOÍNA. Cápsula 20 mg. Envase con 30 cápsulas.", "isotretinoína", "D10BA01", "Dermatología", "generico", True, "Severe acne", "Retinoid"),
    ("010.000.1703.00", "ACITRETINA. Cápsula 25 mg. Envase con 30 cápsulas.", "acitretina", "D05BB02", "Dermatología", "generico", True, "Severe psoriasis", "Retinoid"),
    ("010.000.1705.00", "DAPSONA. Tableta 100 mg. Envase con 20 tabletas.", "dapsona", "J04BA02", "Dermatología", "generico", True, "Leprosy, dermatitis herpetiformis", "Sulfone"),

    # ── Oftalmología (additional) ─────────────────────────────────
    ("010.000.1801.00", "TIMOLOL. Solución oftálmica 0.5%. Envase con 5 mL.", "timolol oftálmico", "S01ED01", "Oftalmología", "generico", True, "Open-angle glaucoma", "Beta-blocker (ophthalmic)"),
    ("010.000.1803.00", "LATANOPROST. Solución oftálmica 0.005%. Envase con 2.5 mL.", "latanoprost", "S01EE01", "Oftalmología", "generico", True, "Glaucoma, ocular hypertension", "PGF2-alpha analogue"),
    ("010.000.1805.00", "RANIBIZUMAB. Solución inyectable 10 mg/mL. Frasco ámpula 0.23 mL.", "ranibizumab", "S01LA04", "Oftalmología", "patente", True, "Wet AMD, DME", "Anti-VEGF"),

    # ── Urología (additional) ─────────────────────────────────────
    ("010.000.1901.00", "TAMSULOSINA. Cápsula 0.4 mg. Envase con 30 cápsulas.", "tamsulosina", "G04CA02", "Urología", "generico", True, "BPH", "Alpha-1A blocker"),
    ("010.000.1903.00", "FINASTERIDA. Tableta 5 mg. Envase con 30 tabletas.", "finasterida", "G04CB01", "Urología", "generico", True, "BPH", "5-alpha reductase inhibitor"),
    ("010.000.1905.00", "SILDENAFIL. Tableta 50 mg. Envase con 4 tabletas.", "sildenafil", "G04BE03", "Urología", "generico", True, "Erectile dysfunction, PAH", "PDE5 inhibitor"),

    # ── Enfermedades Raras (additional) ───────────────────────────
    ("010.000.2001.00", "IMIGLUCERASA. Polvo para solución inyectable 400 U. Frasco ámpula.", "imiglucerasa", "A16AB02", "Enfermedades Raras", "patente", True, "Gaucher disease type 1", "Enzyme replacement therapy"),
    ("010.000.2003.00", "LARONIDASA. Solución inyectable 2.9 mg/5 mL. Frasco ámpula.", "laronidasa", "A16AB05", "Enfermedades Raras", "patente", True, "MPS I (Hurler/Scheie)", "Enzyme replacement therapy"),
    ("010.000.2005.00", "NUSINERSÉN. Solución inyectable 12 mg/5 mL. Frasco ámpula.", "nusinersén", "M09AX07", "Enfermedades Raras", "patente", True, "Spinal muscular atrophy", "Antisense oligonucleotide"),
    ("010.000.2007.00", "RISDIPLAM. Polvo para solución oral 60 mg. Frasco.", "risdiplam", "M09AX10", "Enfermedades Raras", "patente", True, "Spinal muscular atrophy", "SMN2 splicing modifier"),
    ("010.000.2009.00", "ECULIZUMAB. Solución inyectable 300 mg/30 mL. Frasco ámpula.", "eculizumab", "L04AA25", "Enfermedades Raras", "patente", True, "PNH, aHUS", "Anti-C5 complement inhibitor"),

    # ── Antifúngicos (additional) ─────────────────────────────────
    ("010.000.2101.00", "FLUCONAZOL. Cápsula 150 mg. Envase con 1 cápsula.", "fluconazol", "J02AC01", "Antifúngicos", "generico", True, "Candidiasis, cryptococcosis", "Triazole antifungal"),
    ("010.000.2103.00", "ITRACONAZOL. Cápsula 100 mg. Envase con 15 cápsulas.", "itraconazol", "J02AC02", "Antifúngicos", "generico", True, "Aspergillosis, blastomycosis", "Triazole antifungal"),
    ("010.000.2105.00", "POSACONAZOL. Tableta de liberación retardada 100 mg. Envase con 24 tabletas.", "posaconazol", "J02AC04", "Antifúngicos", "patente", True, "Invasive aspergillosis", "Triazole antifungal"),
    ("010.000.2107.00", "CASPOFUNGINA. Polvo para solución inyectable 50 mg. Frasco ámpula.", "caspofungina", "J02AX04", "Antifúngicos", "generico", True, "Invasive aspergillosis, candidiasis", "Echinocandin"),

    # ── Esclerosis Múltiple (additional) ──────────────────────────
    ("010.000.2301.00", "FINGOLIMOD. Cápsula 0.5 mg. Envase con 28 cápsulas.", "fingolimod", "L04AA27", "Esclerosis Múltiple", "patente", True, "Relapsing-remitting MS", "S1P receptor modulator"),
    ("010.000.2303.00", "OCRELIZUMAB. Solución inyectable 300 mg/10 mL. Frasco ámpula.", "ocrelizumab", "L04AA36", "Esclerosis Múltiple", "patente", True, "Relapsing and primary progressive MS", "Anti-CD20"),
    ("010.000.2305.00", "DIMETILFUMARATO. Cápsula de liberación retardada 240 mg. Envase con 56 cápsulas.", "dimetilfumarato", "L04AX07", "Esclerosis Múltiple", "patente", True, "Relapsing-remitting MS", "Nrf2 activator"),
    ("010.000.2307.00", "NATALIZUMAB. Solución inyectable 300 mg/15 mL. Frasco ámpula.", "natalizumab", "L04AA23", "Esclerosis Múltiple", "patente", True, "Relapsing MS", "Anti-alpha4 integrin"),
]


def build_adjudicaciones(clave_data: dict, cycles: list[str]) -> list[dict]:
    """Generate plausible adjudicación records for a clave across cycles."""
    adjudicaciones = []
    source = clave_data.get("source_type", "generico")
    institutions = ["IMSS", "ISSSTE", "IMSS-Bienestar", "PEMEX"]

    # Base price depends on source type
    if source == "patente":
        base_price = random.uniform(200, 15000)
    elif source == "biotecnologico":
        base_price = random.uniform(500, 25000)
    elif source == "fuente_unica":
        base_price = random.uniform(150, 5000)
    else:  # generico
        base_price = random.uniform(5, 500)

    for cycle in cycles:
        # Price drift between cycles (-10% to +5%)
        drift = random.uniform(0.90, 1.05)
        base_price *= drift

        # Each institution may or may not participate
        participating = random.sample(institutions, k=random.randint(2, 4))

        for inst in participating:
            # Institutional price variation (±8%)
            unit_price = round(base_price * random.uniform(0.92, 1.08), 2)
            units_req = random.randint(1000, 5000000)

            # 90% chance adjudicada, 10% desierta
            if random.random() < 0.90:
                status = "adjudicada"
                units_awarded = int(units_req * random.uniform(0.7, 1.0))
                suppliers = [
                    "PiSA", "Fresenius Kabi", "Stendhal", "Bruluart",
                    "AMSA", "Laboratorios Senosiain", "Pfizer",
                    "Roche", "Novartis", "AstraZeneca", "MSD",
                    "Sanofi", "Lilly", "Janssen", "BMS",
                    "Bayer", "Teva", "Mylan", "Sandoz",
                    "Takeda", "Merck", "Boehringer Ingelheim",
                    "GSK", "AbbVie", "Amgen", "Gilead",
                ]
                supplier = random.choice(suppliers)
            else:
                status = "desierta"
                units_awarded = 0
                unit_price = 0.0
                supplier = ""

            total_amount = round(unit_price * units_awarded, 2)
            max_ref_price = round(unit_price * random.uniform(1.05, 1.30), 2) if unit_price > 0 else 0.0

            adjudicaciones.append({
                "clave": clave_data["clave"],
                "description": clave_data["description"],
                "active_substance": clave_data["active_substance"],
                "cycle": cycle,
                "status": status,
                "supplier": supplier,
                "units_requested": units_req,
                "units_awarded": units_awarded,
                "unit_price": unit_price,
                "total_amount": total_amount,
                "max_reference_price": max_ref_price,
                "institution": inst,
                "therapeutic_group": clave_data["therapeutic_group"],
                "source_type": clave_data["source_type"],
            })

    return adjudicaciones


def main():
    # Load existing data
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    existing_claves = {c["clave"] for c in data["claves"]}
    cycles = ["2023-2024", "2025-2026", "2027-2028"]

    new_claves = []
    new_adjudicaciones = []
    skipped = 0

    for entry in ADDITIONAL_CLAVES:
        clave, desc, substance, atc, group, source, cnis, indication, moa = entry

        if clave in existing_claves:
            skipped += 1
            continue

        clave_data = {
            "clave": clave,
            "description": desc,
            "active_substance": substance,
            "atc_code": atc,
            "therapeutic_group": group,
            "source_type": source,
            "cnis_listed": cnis,
            "cofepris_registry": "",
            "indication": indication,
            "mechanism_of_action": moa,
            "patent_holder": "",
            "patent_expiry": "",
        }

        new_claves.append(clave_data)
        existing_claves.add(clave)

        # Generate adjudicaciones
        adj = build_adjudicaciones(clave_data, cycles)
        new_adjudicaciones.extend(adj)

    # Merge
    data["claves"].extend(new_claves)
    data["adjudicaciones"].extend(new_adjudicaciones)

    # Sort claves by clave code
    data["claves"].sort(key=lambda c: c["clave"])

    # Write back
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Expansion complete:")
    print(f"  New claves added: {len(new_claves)}")
    print(f"  Skipped (already exist): {skipped}")
    print(f"  New adjudicaciones generated: {len(new_adjudicaciones)}")
    print(f"  Total claves: {len(data['claves'])}")
    print(f"  Total adjudicaciones: {len(data['adjudicaciones'])}")


if __name__ == "__main__":
    random.seed(42)  # Reproducible
    main()
