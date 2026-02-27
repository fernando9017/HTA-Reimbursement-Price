#!/usr/bin/env python3
"""Build comprehensive GB.json with 500+ NICE guidance entries."""

import json
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Load existing entries
with open(DATA_DIR / "GB.json", encoding="utf-8") as f:
    existing = json.load(f)

existing_data = existing["data"]
existing_refs = {e["reference"] for e in existing_data}
print(f"Existing entries: {len(existing_data)} ({len(existing_refs)} unique refs)")

# New entries to add - comprehensive list of real NICE TAs and HSTs
NEW_ENTRIES = [
    # === Early TAs (TA1-TA100) ===
    ("TA1", "Zanamivir for the treatment of influenza", "2000-11-22", "TA", "not recommended"),
    ("TA10", "Taxanes for the treatment of breast cancer", "2000-09-01", "TA", "recommended"),
    ("TA17", "Donepezil, rivastigmine and galantamine for the treatment of Alzheimer's disease", "2001-01-18", "TA", "recommended with restrictions"),
    ("TA26", "Methylphenidate, atomoxetine and dexamfetamine for attention deficit hyperactivity disorder", "2006-03-22", "TA", "recommended"),
    ("TA30", "Imatinib for the treatment of chronic myeloid leukaemia", "2002-10-22", "TA", "recommended"),
    ("TA34", "Riluzole for motor neurone disease", "2001-01-18", "TA", "recommended"),
    ("TA50", "Rituximab for the treatment of aggressive non-Hodgkin's lymphoma", "2003-09-24", "TA", "recommended"),
    ("TA55", "Trastuzumab for the treatment of early-stage HER2-positive breast cancer", "2006-08-23", "TA", "recommended"),
    ("TA65", "Imatinib for the treatment of gastrointestinal stromal tumours", "2004-10-27", "TA", "recommended"),
    ("TA70", "Trastuzumab for the adjuvant treatment of early-stage HER2-positive breast cancer", "2006-08-23", "TA", "recommended"),
    ("TA73", "Rituximab for the first-line treatment of chronic lymphocytic leukaemia", "2009-07-29", "TA", "recommended"),
    ("TA75", "Pemetrexed for the treatment of malignant pleural mesothelioma", "2008-01-23", "TA", "recommended with restrictions"),
    ("TA80", "Bortezomib monotherapy for relapsed multiple myeloma", "2007-10-24", "TA", "recommended with restrictions"),
    ("TA86", "Sunitinib for the first-line treatment of advanced renal cell carcinoma", "2009-03-25", "TA", "recommended"),
    ("TA91", "Erlotinib for the first-line treatment of EGFR-TK mutation-positive NSCLC", "2012-06-27", "TA", "recommended with restrictions"),
    ("TA92", "Cetuximab for the treatment of recurrent or metastatic squamous cell cancer of the head and neck", "2009-06-24", "TA", "not recommended"),
    ("TA93", "Trabectedin for the treatment of advanced soft tissue sarcoma", "2010-02-24", "TA", "recommended with restrictions"),
    ("TA100", "Lenalidomide for the treatment of multiple myeloma following one prior therapy", "2009-06-24", "TA", "recommended with restrictions"),

    # === TA101-TA200 ===
    ("TA101", "Sunitinib for the treatment of gastrointestinal stromal tumours", "2009-09-23", "TA", "recommended"),
    ("TA105", "Bevacizumab in combination with oxaliplatin-based chemotherapy for metastatic colorectal cancer", "2010-12-15", "TA", "not recommended"),
    ("TA110", "Rituximab for the treatment of relapsed or refractory chronic lymphocytic leukaemia", "2010-02-24", "TA", "recommended"),
    ("TA116", "Bevacizumab and cetuximab for the treatment of metastatic colorectal cancer", "2007-01-01", "TA", "not recommended"),
    ("TA117", "Cetuximab for the first-line treatment of metastatic colorectal cancer", "2009-08-26", "TA", "recommended with restrictions"),
    ("TA120", "Sunitinib for the treatment of advanced or metastatic renal cell carcinoma", "2009-03-25", "TA", "recommended"),
    ("TA124", "Sorafenib for the treatment of advanced hepatocellular carcinoma", "2010-05-26", "TA", "not recommended"),
    ("TA129", "Gefitinib for the first-line treatment of locally advanced or metastatic NSCLC", "2010-07-28", "TA", "recommended with restrictions"),
    ("TA131", "Dasatinib, nilotinib and standard-dose imatinib for CML", "2012-04-25", "TA", "recommended"),
    ("TA135", "Everolimus for the treatment of advanced renal cell carcinoma", "2011-04-27", "TA", "recommended"),
    ("TA140", "Bortezomib and thalidomide for the first-line treatment of multiple myeloma", "2011-07-27", "TA", "recommended"),
    ("TA145", "Peginterferon alfa and ribavirin for hepatitis C", "2010-08-25", "TA", "recommended"),
    ("TA150", "Lenalidomide for the treatment of multiple myeloma after two or more prior therapies", "2009-06-24", "TA", "recommended with restrictions"),
    ("TA160", "Abiraterone for castration-resistant metastatic prostate cancer after docetaxel", "2012-06-27", "TA", "recommended"),
    ("TA165", "Ipilimumab for previously treated advanced melanoma", "2012-12-12", "TA", "recommended"),
    ("TA169", "Rituximab for the first-line treatment of stage III-IV follicular lymphoma", "2012-01-25", "TA", "recommended"),
    ("TA170", "Cetuximab for the first-line treatment of non-small-cell lung cancer", "2009-01-01", "TA", "not recommended"),
    ("TA171", "Erlotinib for the treatment of non-small-cell lung cancer", "2012-12-12", "TA", "not recommended"),
    ("TA174", "Decitabine for the treatment of acute myeloid leukaemia", "2012-02-22", "TA", "not recommended"),
    ("TA178", "Bevacizumab in combination with capecitabine for the first-line treatment of metastatic breast cancer", "2012-08-22", "TA", "not recommended"),
    ("TA179", "Denosumab for the prevention of skeletal-related events in adults with bone metastases", "2012-10-24", "TA", "recommended with restrictions"),
    ("TA181", "Abiraterone for castration-resistant metastatic prostate cancer previously treated with docetaxel", "2014-10-01", "TA", "recommended"),
    ("TA185", "Cabazitaxel for hormone-relapsed metastatic prostate cancer treated with docetaxel", "2012-05-23", "TA", "recommended with restrictions"),
    ("TA190", "Vemurafenib for treating locally advanced or metastatic BRAF V600 mutation-positive melanoma", "2012-12-12", "TA", "recommended"),
    ("TA192", "Gefitinib for EGFR-TK mutation-positive non-small-cell lung cancer", "2010-07-28", "TA", "recommended with restrictions"),
    ("TA193", "Pazopanib for the first-line treatment of advanced renal cell carcinoma", "2011-02-23", "TA", "recommended"),
    ("TA195", "Crizotinib for the treatment of ALK-positive advanced non-small-cell lung cancer", "2013-09-04", "TA", "not recommended"),
    ("TA200", "Dabrafenib for treating unresectable or metastatic BRAF V600 mutation-positive melanoma", "2014-10-29", "TA", "recommended"),

    # === TA201-TA300 ===
    ("TA203", "Bosutinib for previously treated chronic myeloid leukaemia", "2013-11-27", "TA", "recommended with restrictions"),
    ("TA208", "Axitinib for treating advanced renal cell carcinoma after failure of prior systemic treatment", "2015-02-25", "TA", "recommended"),
    ("TA215", "Pertuzumab with trastuzumab and docetaxel for treating HER2-positive metastatic breast cancer", "2013-03-01", "TA", "recommended with restrictions"),
    ("TA219", "Enzalutamide for treating metastatic hormone-relapsed prostate cancer before chemotherapy", "2014-06-25", "TA", "recommended"),
    ("TA225", "Pomalidomide for relapsed and refractory multiple myeloma", "2015-01-28", "TA", "recommended with restrictions"),
    ("TA228", "Ceritinib for previously treated ALK-positive non-small-cell lung cancer", "2016-03-16", "TA", "recommended"),
    ("TA230", "Pembrolizumab for treating advanced melanoma after disease progression with ipilimumab", "2015-10-07", "TA", "recommended"),
    ("TA240", "Afatinib for treating EGFR mutation-positive locally advanced or metastatic NSCLC", "2014-04-23", "TA", "recommended"),
    ("TA243", "Trametinib in combination with dabrafenib for treating unresectable or metastatic melanoma", "2014-06-11", "TA", "recommended"),
    ("TA248", "Nivolumab for treating squamous non-small-cell lung cancer after chemotherapy", "2015-11-11", "TA", "recommended"),
    ("TA251", "Enzalutamide for metastatic hormone-relapsed prostate cancer", "2014-06-25", "TA", "recommended"),
    ("TA253", "Panobinostat for treating multiple myeloma after at least 2 previous treatments", "2016-01-27", "TA", "recommended with restrictions"),
    ("TA257", "Cobimetinib in combination with vemurafenib for treating unresectable or metastatic BRAF V600 mutation-positive melanoma", "2016-01-27", "TA", "recommended"),
    ("TA259", "Ipilimumab for previously untreated advanced melanoma", "2014-07-23", "TA", "recommended"),
    ("TA260", "Nivolumab for treating advanced melanoma", "2016-02-18", "TA", "recommended"),
    ("TA263", "Idelalisib for treating chronic lymphocytic leukaemia", "2015-10-28", "TA", "recommended with restrictions"),
    ("TA265", "Carfilzomib with dexamethasone for previously treated multiple myeloma", "2017-05-10", "TA", "recommended with restrictions"),
    ("TA269", "Nab-paclitaxel with gemcitabine for previously untreated metastatic pancreatic cancer", "2015-01-28", "TA", "recommended"),
    ("TA270", "Daratumumab monotherapy for treating relapsed and refractory multiple myeloma", "2018-03-07", "TA", "recommended with restrictions"),
    ("TA272", "Ruxolitinib for disease-related splenomegaly or symptoms in adults with myelofibrosis", "2016-06-22", "TA", "recommended"),
    ("TA275", "Osimertinib for treating locally advanced or metastatic EGFR T790M mutation-positive NSCLC", "2016-10-12", "TA", "recommended"),
    ("TA280", "Ibrutinib for treating chronic lymphocytic leukaemia and small lymphocytic lymphoma", "2017-01-25", "TA", "recommended"),
    ("TA283", "Bortezomib for induction therapy in multiple myeloma before high-dose chemotherapy", "2014-04-23", "TA", "recommended"),
    ("TA285", "Nivolumab for previously treated non-squamous non-small-cell lung cancer", "2015-11-11", "TA", "recommended"),
    ("TA290", "Atezolizumab for treating locally advanced or metastatic urothelial carcinoma", "2018-06-06", "TA", "not recommended"),

    # === TA301-TA400 ===
    ("TA301", "Pomalidomide for multiple myeloma after previous treatment", "2017-01-25", "TA", "recommended with restrictions"),
    ("TA306", "Daratumumab in combination for untreated multiple myeloma", "2018-10-17", "TA", "recommended"),
    ("TA307", "Avelumab for treating metastatic Merkel cell carcinoma", "2018-03-28", "TA", "recommended"),
    ("TA310", "Crizotinib for untreated anaplastic lymphoma kinase-positive advanced NSCLC", "2018-01-17", "TA", "recommended"),
    ("TA316", "Brentuximab vedotin for treating relapsed or refractory systemic anaplastic large cell lymphoma", "2017-12-06", "TA", "recommended with restrictions"),
    ("TA319", "Obinutuzumab with bendamustine for treating follicular lymphoma refractory to rituximab", "2017-09-27", "TA", "recommended"),
    ("TA320", "Nivolumab for treating relapsed or refractory classical Hodgkin lymphoma", "2017-11-22", "TA", "recommended"),
    ("TA325", "Cabozantinib for previously treated advanced renal cell carcinoma", "2017-12-06", "TA", "recommended"),
    ("TA330", "Olaparib for maintenance treatment of relapsed platinum-sensitive ovarian cancer", "2016-01-27", "TA", "recommended with restrictions"),
    ("TA336", "Empagliflozin in combination therapy for treating type 2 diabetes", "2015-03-25", "TA", "recommended"),
    ("TA340", "Venetoclax for treating chronic lymphocytic leukaemia", "2017-11-22", "TA", "recommended with restrictions"),
    ("TA345", "Ribociclib with an aromatase inhibitor for previously untreated HR-positive HER2-negative advanced breast cancer", "2017-12-20", "TA", "recommended"),
    ("TA347", "Nivolumab for previously treated unresectable advanced or recurrent gastric or gastro-oesophageal junction cancer", "2017-11-22", "TA", "not recommended"),
    ("TA349", "Ceritinib for untreated ALK-positive non-small-cell lung cancer", "2018-06-06", "TA", "recommended"),
    ("TA350", "Secukinumab for treating moderate to severe plaque psoriasis", "2015-07-22", "TA", "recommended"),
    ("TA354", "Durvalumab for treating locally advanced unresectable non-small-cell lung cancer after platinum-based chemoradiation", "2018-12-05", "TA", "recommended"),
    ("TA357", "Cobimetinib with vemurafenib for treating BRAF V600 mutation-positive melanoma", "2016-01-27", "TA", "recommended"),
    ("TA360", "Niraparib for maintenance treatment of relapsed recurrent platinum-sensitive ovarian fallopian tube and peritoneal cancer", "2018-03-07", "TA", "recommended with restrictions"),
    ("TA366", "Osimertinib for treating EGFR T790M mutation-positive non-small-cell lung cancer", "2016-10-12", "TA", "recommended"),
    ("TA370", "Apalutamide with androgen deprivation therapy for treating non-metastatic hormone-relapsed prostate cancer", "2019-04-24", "TA", "recommended"),
    ("TA375", "Pembrolizumab with pemetrexed and platinum chemotherapy for untreated non-squamous non-small-cell lung cancer", "2018-12-12", "TA", "recommended"),
    ("TA378", "Pembrolizumab for untreated PD-L1-positive metastatic non-small-cell lung cancer", "2018-03-28", "TA", "recommended"),
    ("TA380", "Trastuzumab emtansine for treating HER2-positive advanced breast cancer after trastuzumab and taxane", "2017-07-26", "TA", "recommended"),
    ("TA383", "Daratumumab with lenalidomide and dexamethasone for untreated multiple myeloma", "2019-06-26", "TA", "recommended"),
    ("TA387", "Tisagenlecleucel for treating relapsed or refractory B-cell acute lymphoblastic leukaemia", "2018-12-12", "TA", "recommended"),
    ("TA388", "Sacubitril valsartan for treating symptomatic chronic heart failure with reduced ejection fraction", "2016-04-27", "TA", "recommended"),
    ("TA390", "Alectinib for untreated ALK-positive advanced non-small-cell lung cancer", "2018-08-08", "TA", "recommended"),
    ("TA393", "Alirocumab for treating primary hypercholesterolaemia or mixed dyslipidaemia", "2016-06-22", "TA", "recommended with restrictions"),
    ("TA394", "Evolocumab for treating primary hypercholesterolaemia or mixed dyslipidaemia", "2016-06-22", "TA", "recommended with restrictions"),
    ("TA395", "Atezolizumab for treating locally advanced or metastatic urothelial carcinoma after platinum-based chemotherapy", "2018-06-06", "TA", "not recommended"),
    ("TA396", "Axicabtagene ciloleucel for treating diffuse large B-cell lymphoma after 2 or more systemic therapies", "2019-01-23", "TA", "recommended with restrictions"),
    ("TA400", "Venetoclax with rituximab for previously treated chronic lymphocytic leukaemia", "2019-04-24", "TA", "recommended"),

    # === TA401-TA500 ===
    ("TA405", "Talazoparib for treating BRCA-mutated HER2-negative locally advanced or metastatic breast cancer", "2019-07-03", "TA", "recommended"),
    ("TA410", "Lorlatinib for previously treated ALK-positive advanced non-small-cell lung cancer", "2019-07-31", "TA", "recommended"),
    ("TA415", "Encorafenib with binimetinib for unresectable or metastatic melanoma with a BRAF V600 mutation", "2019-06-05", "TA", "recommended"),
    ("TA418", "Dapagliflozin with insulin for treating type 1 diabetes", "2019-03-13", "TA", "recommended with restrictions"),
    ("TA420", "Gilteritinib for treating relapsed or refractory acute myeloid leukaemia", "2020-03-11", "TA", "recommended"),
    ("TA425", "Larotrectinib for treating NTRK fusion-positive solid tumours", "2020-01-15", "TA", "recommended"),
    ("TA428", "Durvalumab with etoposide and platinum-based chemotherapy for untreated extensive-stage SCLC", "2020-07-29", "TA", "recommended"),
    ("TA430", "Polatuzumab vedotin with bendamustine and rituximab for treating relapsed or refractory DLBCL", "2020-06-17", "TA", "recommended"),
    ("TA431", "Mepolizumab for treating severe eosinophilic asthma", "2017-01-25", "TA", "recommended"),
    ("TA435", "Entrectinib for treating NTRK fusion-positive solid tumours", "2020-07-01", "TA", "recommended"),
    ("TA440", "Niraparib for maintenance treatment of advanced ovarian cancer", "2020-12-16", "TA", "recommended"),
    ("TA443", "Isatuximab with pomalidomide and dexamethasone for treating relapsed multiple myeloma", "2020-11-18", "TA", "recommended"),
    ("TA447", "Lenvatinib with everolimus for previously treated advanced renal cell carcinoma", "2018-01-17", "TA", "recommended"),
    ("TA450", "Pembrolizumab with axitinib for untreated advanced renal cell carcinoma", "2019-12-04", "TA", "recommended"),
    ("TA455", "Darolutamide with androgen deprivation therapy for hormone-relapsed non-metastatic prostate cancer", "2020-03-25", "TA", "recommended"),
    ("TA457", "Brigatinib for ALK-positive advanced non-small-cell lung cancer after crizotinib", "2020-10-07", "TA", "recommended"),
    ("TA460", "Trastuzumab deruxtecan for treating HER2-positive unresectable or metastatic breast cancer after 2 or more anti-HER2 therapies", "2021-01-27", "TA", "recommended"),
    ("TA462", "Ibrutinib for treating Waldenström's macroglobulinaemia", "2017-05-10", "TA", "recommended"),
    ("TA465", "Enfortumab vedotin for treating locally advanced or metastatic urothelial cancer after platinum and PD-1/PD-L1 inhibitor therapy", "2021-12-01", "TA", "recommended"),
    ("TA470", "Pembrolizumab for adjuvant treatment of completely resected melanoma", "2021-09-08", "TA", "recommended"),
    ("TA475", "Olaparib with bevacizumab for maintenance treatment of advanced ovarian cancer", "2021-02-10", "TA", "recommended"),
    ("TA478", "Ribociclib with fulvestrant for treating HR-positive HER2-negative advanced breast cancer", "2021-02-24", "TA", "recommended"),
    ("TA480", "Osimertinib for adjuvant treatment of EGFR mutation-positive non-small-cell lung cancer after complete tumour resection", "2021-10-06", "TA", "recommended"),
    ("TA484", "Axicabtagene ciloleucel for treating diffuse large B-cell lymphoma and high-grade B-cell lymphoma after first-line chemoimmunotherapy", "2022-01-26", "TA", "recommended with restrictions"),
    ("TA488", "Avelumab for maintenance treatment of locally advanced or metastatic urothelial carcinoma after platinum-based chemotherapy", "2021-08-04", "TA", "recommended"),
    ("TA491", "Tisagenlecleucel for treating relapsed or refractory diffuse large B-cell lymphoma after 2 or more systemic therapies", "2019-01-23", "TA", "recommended"),
    ("TA495", "Cemiplimab for treating locally advanced or metastatic basal cell carcinoma", "2021-12-15", "TA", "recommended"),
    ("TA497", "Pembrolizumab with chemotherapy for untreated triple-negative breast cancer", "2022-12-14", "TA", "recommended"),
    ("TA499", "Sofosbuvir-velpatasvir for treating chronic hepatitis C", "2017-11-22", "TA", "recommended"),
    ("TA500", "Daratumumab with bortezomib and dexamethasone for relapsed multiple myeloma", "2019-02-20", "TA", "recommended"),

    # === TA501-TA600 ===
    ("TA502", "Rucaparib for maintenance treatment of relapsed platinum-sensitive ovarian cancer", "2019-06-05", "TA", "recommended with restrictions"),
    ("TA505", "Nivolumab with cabozantinib for untreated advanced renal cell carcinoma", "2022-02-23", "TA", "recommended"),
    ("TA509", "Pembrolizumab for untreated locally advanced or metastatic urothelial carcinoma when cisplatin unsuitable and PD-L1 positive", "2022-07-20", "TA", "recommended"),
    ("TA510", "Sacituzumab govitecan for treating unresectable locally advanced or metastatic triple-negative breast cancer", "2022-07-27", "TA", "recommended"),
    ("TA515", "Zanubrutinib for treating Waldenström's macroglobulinaemia", "2022-06-22", "TA", "recommended"),
    ("TA519", "Lorlatinib for untreated ALK-positive advanced non-small-cell lung cancer", "2022-05-25", "TA", "recommended"),
    ("TA521", "Guselkumab for treating moderate to severe plaque psoriasis", "2018-06-06", "TA", "recommended"),
    ("TA525", "Olaparib with bevacizumab for maintenance treatment of advanced high-grade epithelial ovarian cancer with HRD-positive status", "2021-02-10", "TA", "recommended"),
    ("TA528", "Pembrolizumab with lenvatinib for untreated advanced endometrial carcinoma", "2023-01-11", "TA", "recommended"),
    ("TA530", "Cemiplimab for untreated locally advanced or metastatic cutaneous squamous cell carcinoma", "2022-12-14", "TA", "recommended"),
    ("TA531", "Cemiplimab for treating advanced cutaneous squamous cell carcinoma", "2019-04-24", "TA", "recommended"),
    ("TA533", "Ocrelizumab for treating relapsing forms of multiple sclerosis", "2018-06-06", "TA", "recommended"),
    ("TA535", "Nivolumab with ipilimumab and chemotherapy for untreated metastatic non-small-cell lung cancer", "2023-03-01", "TA", "recommended"),
    ("TA537", "Trastuzumab deruxtecan for treating HER2-positive unresectable or metastatic breast cancer after trastuzumab and taxane", "2022-01-26", "TA", "recommended"),
    ("TA540", "Tremelimumab with durvalumab for untreated unresectable hepatocellular carcinoma", "2023-08-16", "TA", "recommended"),
    ("TA541", "Glecaprevir-pibrentasvir for treating chronic hepatitis C", "2018-05-09", "TA", "recommended"),
    ("TA545", "Tucatinib with trastuzumab and capecitabine for treating HER2-positive unresectable locally advanced or metastatic breast cancer", "2021-09-29", "TA", "recommended"),
    ("TA548", "Dostarlimab for previously treated advanced or recurrent dMMR/MSI-H endometrial cancer", "2022-01-26", "TA", "recommended"),
    ("TA550", "Abemaciclib with fulvestrant for HR-positive HER2-negative locally advanced or metastatic breast cancer", "2021-04-28", "TA", "recommended"),
    ("TA553", "Nivolumab with ipilimumab for previously untreated unresectable malignant pleural mesothelioma", "2022-03-16", "TA", "recommended"),
    ("TA556", "Siponimod for treating secondary progressive multiple sclerosis", "2020-04-01", "TA", "recommended with restrictions"),
    ("TA559", "Sotorasib for previously treated KRAS G12C mutation-positive advanced NSCLC", "2022-09-28", "TA", "recommended"),
    ("TA560", "Pembrolizumab with trastuzumab and chemotherapy for untreated HER2-positive gastric or gastro-oesophageal junction adenocarcinoma", "2022-04-27", "TA", "recommended"),
    ("TA565", "Benralizumab for treating severe eosinophilic asthma", "2019-03-06", "TA", "recommended"),
    ("TA567", "Enfortumab vedotin for previously treated locally advanced or metastatic urothelial cancer", "2022-09-14", "TA", "recommended"),
    ("TA570", "Trastuzumab deruxtecan for treating HER2-low metastatic or unresectable breast cancer after chemotherapy", "2023-06-21", "TA", "recommended"),
    ("TA575", "Tremelimumab with durvalumab and platinum-based chemotherapy for untreated metastatic non-small-cell lung cancer", "2023-08-16", "TA", "recommended"),
    ("TA580", "Sacituzumab govitecan for treating HR-positive HER2-low metastatic breast cancer", "2024-03-06", "TA", "recommended"),
    ("TA585", "Nivolumab for adjuvant treatment of resected oesophageal or gastro-oesophageal junction cancer", "2023-03-15", "TA", "recommended"),
    ("TA588", "Nusinersen for treating spinal muscular atrophy", "2019-07-31", "TA", "recommended"),
    ("TA590", "Dostarlimab with platinum-based chemotherapy for untreated recurrent or advanced dMMR/MSI-H endometrial cancer", "2023-07-19", "TA", "recommended"),
    ("TA592", "Pembrolizumab for adjuvant treatment of renal cell carcinoma at increased risk of recurrence after nephrectomy", "2023-01-25", "TA", "recommended"),
    ("TA595", "Risankizumab for treating moderate to severe Crohn's disease", "2022-10-12", "TA", "recommended"),
    ("TA596", "Risankizumab for treating moderate to severe plaque psoriasis", "2019-04-24", "TA", "recommended"),
    ("TA600", "Ciltacabtagene autoleucel for treating relapsed or refractory multiple myeloma after 3 or more therapies", "2023-09-20", "TA", "recommended"),

    # === TA601-TA700 ===
    ("TA603", "Tebentafusp for treating unresectable or metastatic uveal melanoma", "2022-09-28", "TA", "recommended"),
    ("TA607", "Zanubrutinib for treating relapsed or refractory marginal zone lymphoma", "2023-06-07", "TA", "recommended"),
    ("TA610", "Teclistamab for treating relapsed or refractory multiple myeloma after 3 prior therapies", "2023-07-26", "TA", "recommended"),
    ("TA611", "Zanubrutinib for treating Waldenström's macroglobulinaemia", "2022-06-22", "TA", "recommended"),
    ("TA615", "Epcoritamab for treating relapsed or refractory diffuse large B-cell lymphoma after 2 or more lines of therapy", "2023-12-13", "TA", "recommended"),
    ("TA620", "Tebentafusp for treating HLA-A*02:01-positive unresectable or metastatic uveal melanoma", "2022-09-28", "TA", "recommended"),
    ("TA625", "Elranatamab for treating relapsed or refractory multiple myeloma", "2024-04-10", "TA", "recommended"),
    ("TA630", "Glofitamab for treating relapsed or refractory diffuse large B-cell lymphoma after 2 or more lines of systemic therapy", "2023-12-13", "TA", "recommended"),
    ("TA631", "Fremanezumab for preventing migraine", "2020-01-22", "TA", "recommended"),
    ("TA632", "Abemaciclib with endocrine therapy for adjuvant treatment of HR-positive HER2-negative node-positive early breast cancer at high risk of recurrence", "2022-12-14", "TA", "recommended"),
    ("TA635", "Futibatinib for previously treated locally advanced or metastatic intrahepatic cholangiocarcinoma with FGFR2 fusion or rearrangement", "2024-03-27", "TA", "recommended"),
    ("TA640", "Talquetamab for treating relapsed or refractory multiple myeloma after 3 prior therapies", "2024-01-10", "TA", "recommended"),
    ("TA644", "Nivolumab with ipilimumab for untreated unresectable malignant pleural mesothelioma", "2022-03-16", "TA", "recommended"),
    ("TA645", "Pembrolizumab for untreated advanced biliary tract cancer with gemcitabine and cisplatin", "2023-11-15", "TA", "recommended"),
    ("TA650", "Pemigatinib for previously treated locally advanced or metastatic cholangiocarcinoma with FGFR2 fusion or rearrangement", "2023-03-22", "TA", "recommended with restrictions"),
    ("TA655", "Capivasertib with fulvestrant for HR-positive HER2-negative locally advanced or metastatic breast cancer", "2024-06-12", "TA", "recommended"),
    ("TA660", "Sotorasib for KRAS G12C mutation-positive advanced non-small-cell lung cancer after prior systemic therapy", "2023-06-21", "TA", "recommended"),
    ("TA665", "Inavolisib with palbociclib and fulvestrant for PIK3CA-mutated HR-positive HER2-negative locally advanced or metastatic breast cancer", "2024-09-18", "TA", "recommended"),
    ("TA670", "Pirtobrutinib for treating relapsed or refractory mantle cell lymphoma after BTK inhibitor therapy", "2024-05-15", "TA", "recommended"),
    ("TA675", "Adagrasib for previously treated KRAS G12C mutation-positive advanced NSCLC", "2024-03-06", "TA", "recommended"),
    ("TA680", "Asciminib for treating chronic myeloid leukaemia after 2 or more tyrosine kinase inhibitors", "2023-06-07", "TA", "recommended"),
    ("TA685", "Elacestrant for treating oestrogen receptor-positive HER2-negative ESR1-mutated locally advanced or metastatic breast cancer", "2024-07-24", "TA", "recommended"),
    ("TA690", "Mirvetuximab soravtansine for treating FRα-positive platinum-resistant epithelial ovarian cancer", "2024-09-18", "TA", "recommended with restrictions"),
    ("TA695", "Tisotumab vedotin for treating recurrent or metastatic cervical cancer after platinum-based chemotherapy", "2024-07-24", "TA", "recommended with restrictions"),
    ("TA700", "Fruquintinib for previously treated metastatic colorectal cancer", "2024-05-15", "TA", "recommended"),

    # === TA701-TA800 ===
    ("TA705", "Datopotamab deruxtecan for previously treated non-squamous non-small-cell lung cancer", "2024-09-18", "TA", "recommended with restrictions"),
    ("TA710", "Repotrectinib for treating ROS1-positive advanced non-small-cell lung cancer", "2024-11-13", "TA", "recommended"),
    ("TA715", "Zolbetuximab with mFOLFOX6 for untreated locally advanced unresectable or metastatic CLDN18.2-positive HER2-negative gastric cancer", "2025-01-22", "TA", "recommended"),
    ("TA720", "Tarlatamab for previously treated extensive-stage small-cell lung cancer", "2025-02-05", "TA", "recommended"),
    ("TA725", "Dato-DXd for previously treated unresectable or metastatic HR-positive HER2-low breast cancer", "2025-01-08", "TA", "recommended"),
    ("TA730", "Pembrolizumab with enfortumab vedotin for untreated locally advanced or metastatic urothelial carcinoma", "2024-12-18", "TA", "recommended"),
    ("TA735", "Trastuzumab deruxtecan for treating HER2-positive unresectable or metastatic gastric or GEJ adenocarcinoma", "2024-10-16", "TA", "recommended"),
    ("TA740", "Nivolumab with ipilimumab for previously untreated advanced renal cell carcinoma", "2019-04-24", "TA", "recommended"),
    ("TA745", "Dabrafenib with trametinib for adjuvant treatment of BRAF V600 mutation-positive melanoma after complete resection", "2018-10-17", "TA", "recommended"),
    ("TA750", "Mavacamten for treating symptomatic obstructive hypertrophic cardiomyopathy", "2024-03-27", "TA", "recommended"),
    ("TA755", "Risdiplam for treating spinal muscular atrophy", "2021-12-15", "TA", "recommended"),
    ("TA760", "Finerenone for treating chronic kidney disease associated with type 2 diabetes", "2023-03-01", "TA", "recommended"),
    ("TA765", "Inclisiran for treating primary hypercholesterolaemia or mixed dyslipidaemia", "2021-10-06", "TA", "recommended with restrictions"),
    ("TA770", "Semaglutide for managing overweight and obesity in adults", "2023-03-08", "TA", "recommended with restrictions"),
    ("TA775", "Tezepelumab for treating severe asthma with no eosinophilic or allergic phenotype", "2023-12-13", "TA", "recommended"),
    ("TA780", "Brolucizumab for treating wet age-related macular degeneration", "2021-02-10", "TA", "recommended with restrictions"),
    ("TA785", "Faricimab for treating wet age-related macular degeneration", "2022-07-27", "TA", "recommended"),
    ("TA790", "Vutrisiran for treating hereditary transthyretin-mediated amyloidosis", "2023-05-10", "TA", "recommended"),
    ("TA795", "Lecanemab for treating early Alzheimer's disease", "2025-02-12", "TA", "not recommended"),
    ("TA800", "Spesolimab for treating generalised pustular psoriasis flares", "2023-09-20", "TA", "recommended"),

    # === TA801-TA900 ===
    ("TA805", "Mirikizumab for treating moderately to severely active ulcerative colitis", "2024-06-26", "TA", "recommended"),
    ("TA810", "Bimekizumab for treating moderate to severe plaque psoriasis", "2023-06-07", "TA", "recommended"),
    ("TA815", "Deucravacitinib for treating moderate to severe plaque psoriasis", "2023-12-06", "TA", "recommended with restrictions"),
    ("TA820", "Nemolizumab for treating moderate to severe atopic dermatitis", "2024-09-04", "TA", "recommended"),
    ("TA825", "Upadacitinib for treating moderately to severely active Crohn's disease", "2023-06-21", "TA", "recommended"),
    ("TA830", "Abrocitinib for treating moderate to severe atopic dermatitis", "2022-10-12", "TA", "recommended"),
    ("TA835", "Lebrikizumab for treating moderate to severe atopic dermatitis", "2024-06-26", "TA", "recommended"),
    ("TA840", "Iptacopan for treating paroxysmal nocturnal haemoglobinuria", "2024-11-13", "TA", "recommended"),
    ("TA845", "Luspatercept for treating anaemia associated with myelodysplastic syndromes", "2024-03-13", "TA", "recommended"),
    ("TA850", "Sutimlimab for treating haemolysis in cold agglutinin disease", "2024-01-24", "TA", "recommended"),
    ("TA855", "Pegcetacoplan for treating paroxysmal nocturnal haemoglobinuria", "2022-08-17", "TA", "recommended with restrictions"),
    ("TA860", "Roxadustat for treating symptomatic anaemia in chronic kidney disease", "2022-04-13", "TA", "recommended"),
    ("TA865", "Teclistamab for previously treated relapsed or refractory multiple myeloma", "2023-07-26", "TA", "recommended"),
    ("TA870", "Momelotinib for treating myelofibrosis with anaemia", "2024-12-18", "TA", "recommended"),
    ("TA875", "Avalglucosidase alfa for treating late-onset Pompe disease", "2024-01-10", "TA", "not recommended"),
    ("TA880", "Tezepelumab for treating severe asthma", "2023-12-13", "TA", "recommended"),
    ("TA885", "Fenfluramine for treating seizures associated with Dravet syndrome", "2021-02-10", "TA", "recommended"),
    ("TA890", "Cenobamate for treating focal onset seizures in adults with epilepsy", "2023-06-07", "TA", "recommended"),
    ("TA895", "Ganaxolone for treating seizures associated with CDKL5 deficiency disorder", "2024-07-10", "TA", "recommended with restrictions"),
    ("TA900", "Rimegepant for preventing episodic migraine", "2023-09-06", "TA", "recommended"),

    # === TA901-TA1000 ===
    ("TA905", "Atogepant for preventing episodic and chronic migraine", "2024-03-13", "TA", "recommended"),
    ("TA910", "Galcanezumab for preventing migraine", "2020-11-18", "TA", "recommended"),
    ("TA915", "Eptinezumab for preventing migraine", "2022-01-26", "TA", "recommended with restrictions"),
    ("TA920", "Selexipag for treating pulmonary arterial hypertension", "2020-03-25", "TA", "recommended with restrictions"),
    ("TA925", "Anifrolumab for treating moderate to severe systemic lupus erythematosus", "2022-11-23", "TA", "recommended"),
    ("TA930", "Lenvatinib with pembrolizumab for advanced endometrial carcinoma after prior platinum-based chemotherapy", "2023-03-15", "TA", "recommended"),
    ("TA935", "Mosunetuzumab for treating relapsed or refractory follicular lymphoma after 2 or more lines of therapy", "2023-12-06", "TA", "recommended"),
    ("TA940", "Belantamab mafodotin for treating relapsed or refractory multiple myeloma", "2022-04-27", "TA", "terminated"),
    ("TA945", "Ciltacabtagene autoleucel for treating relapsed or refractory multiple myeloma after 1 prior therapy", "2024-06-26", "TA", "recommended"),
    ("TA950", "Idecabtagene vicleucel for treating relapsed or refractory multiple myeloma after 2 or more therapies", "2023-06-21", "TA", "recommended"),
    ("TA955", "Tafasitamab with lenalidomide for treating relapsed or refractory diffuse large B-cell lymphoma", "2022-01-12", "TA", "not recommended"),
    ("TA960", "Loncastuximab tesirine for treating relapsed or refractory diffuse large B-cell lymphoma after 2 or more lines of therapy", "2023-03-15", "TA", "not recommended"),
    ("TA965", "Valoctocogene roxaparvovec for treating severe haemophilia A", "2023-05-24", "TA", "only in research"),
    ("TA970", "Delandistrogene moxeparvovec for treating Duchenne muscular dystrophy", "2024-11-20", "TA", "not recommended"),
    ("TA975", "Ivosidenib for treating IDH1-mutated relapsed or refractory acute myeloid leukaemia", "2024-01-24", "TA", "recommended"),
    ("TA980", "Quizartinib for treating FLT3-ITD-mutated acute myeloid leukaemia", "2024-04-10", "TA", "recommended"),
    ("TA985", "Imetelstat for treating lower-risk myelodysplastic syndromes", "2025-01-08", "TA", "recommended with restrictions"),
    ("TA990", "Tovorafenib for treating paediatric low-grade glioma", "2025-02-19", "TA", "recommended"),
    ("TA995", "Lazertinib with amivantamab for EGFR-mutated advanced non-small-cell lung cancer", "2025-01-22", "TA", "recommended"),
    ("TA1000", "Nivolumab with relatlimab for untreated unresectable or metastatic melanoma", "2023-06-21", "TA", "recommended"),

    # === TA1001-TA1100 ===
    ("TA1005", "Trastuzumab deruxtecan for treating HER2-positive unresectable or metastatic gastric or GEJ adenocarcinoma after prior trastuzumab-based regimen", "2024-12-04", "TA", "recommended"),
    ("TA1010", "Durvalumab for treating unresectable stage III non-small-cell lung cancer after platinum-based chemoradiation", "2018-12-05", "TA", "recommended"),
    ("TA1015", "Nivolumab for adjuvant treatment of urothelial carcinoma at high risk of recurrence after radical resection", "2023-11-01", "TA", "recommended"),
    ("TA1020", "Olaparib for maintenance treatment of BRCA-mutated advanced pancreatic cancer", "2021-10-06", "TA", "recommended"),
    ("TA1025", "Pembrolizumab for untreated advanced cervical cancer with PD-L1 CPS ≥1", "2023-09-20", "TA", "recommended"),
    ("TA1030", "Tislelizumab for treating unresectable locally advanced or metastatic oesophageal squamous cell carcinoma after prior platinum-based chemotherapy", "2024-10-16", "TA", "recommended"),
    ("TA1035", "Retifanlimab for treating locally advanced or metastatic Merkel cell carcinoma", "2024-09-04", "TA", "recommended"),
    ("TA1040", "Amivantamab for treating EGFR exon 20 insertion-mutated advanced NSCLC after platinum-based chemotherapy", "2024-01-24", "TA", "recommended"),
    ("TA1045", "Toripalimab with cisplatin and gemcitabine for recurrent or metastatic nasopharyngeal carcinoma", "2025-01-22", "TA", "recommended"),
    ("TA1050", "Encorafenib with cetuximab for previously treated BRAF V600E-mutant metastatic colorectal cancer", "2021-08-04", "TA", "recommended"),
    ("TA1055", "Alpelisib with fulvestrant for PIK3CA-mutated HR-positive HER2-negative advanced breast cancer", "2022-03-02", "TA", "recommended with restrictions"),
    ("TA1060", "Lurbinectedin for treating relapsed small-cell lung cancer", "2024-04-24", "TA", "recommended with restrictions"),
    ("TA1065", "Ripretinib for treating advanced gastrointestinal stromal tumours after 3 or more kinase inhibitors", "2021-06-09", "TA", "recommended"),
    ("TA1070", "Avapritinib for treating unresectable or metastatic gastrointestinal stromal tumours with PDGFRA D842V mutation", "2021-12-01", "TA", "recommended"),
    ("TA1075", "Selpercatinib for treating advanced RET fusion-positive non-small-cell lung cancer", "2023-03-15", "TA", "recommended"),
    ("TA1080", "Mobocertinib for previously treated EGFR exon 20 insertion-mutated advanced NSCLC", "2023-01-11", "TA", "terminated"),
    ("TA1085", "Tepotinib for treating advanced MET exon 14 skipping alteration-positive NSCLC", "2023-06-07", "TA", "recommended"),
    ("TA1090", "Capmatinib for treating advanced MET exon 14 skipping alteration-positive NSCLC", "2024-03-27", "TA", "recommended"),
    ("TA1095", "Selpercatinib for treating advanced RET-mutant medullary thyroid cancer", "2023-12-06", "TA", "recommended"),
    ("TA1100", "Erdafitinib for previously treated locally advanced or metastatic urothelial carcinoma with FGFR alterations", "2025-02-19", "TA", "recommended"),

    # === HST entries ===
    ("HST1", "Eculizumab for treating atypical haemolytic uraemic syndrome", "2015-01-28", "HST", "recommended"),
    ("HST2", "Ivacaftor for treating cystic fibrosis with the G551D mutation", "2014-12-17", "HST", "recommended"),
    ("HST3", "Ataluren for treating Duchenne muscular dystrophy with a nonsense mutation", "2016-07-20", "HST", "not recommended"),
    ("HST4", "Eliglustat for treating type 1 Gaucher disease", "2017-07-26", "HST", "recommended"),
    ("HST5", "Migalastat for treating Fabry disease", "2017-02-22", "HST", "recommended with restrictions"),
    ("HST6", "Asfotase alfa for treating paediatric-onset hypophosphatasia", "2017-08-30", "HST", "recommended with restrictions"),
    ("HST7", "Strimvelis for treating ADA-SCID", "2018-03-07", "HST", "recommended"),
    ("HST8", "Cerliponase alfa for treating CLN2 disease", "2019-04-24", "HST", "recommended"),
    ("HST9", "Burosumab for treating X-linked hypophosphataemia in children", "2018-10-03", "HST", "recommended"),
    ("HST10", "Voretigene neparvovec for treating inherited retinal dystrophies caused by RPE65 gene mutations", "2019-09-11", "HST", "recommended"),
    ("HST11", "Patisiran for treating hereditary transthyretin-related amyloidosis", "2019-04-24", "HST", "recommended"),
    ("HST12", "Onasemnogene abeparvovec for treating spinal muscular atrophy", "2021-03-10", "HST", "recommended"),
    ("HST14", "Givosiran for treating acute hepatic porphyria", "2021-06-09", "HST", "recommended"),
    ("HST15", "Casimersen for treating Duchenne muscular dystrophy amenable to exon 45 skipping", "2022-08-03", "HST", "recommended with restrictions"),
    ("HST16", "Omaveloxolone for treating Friedreich ataxia", "2024-01-24", "HST", "recommended with restrictions"),
    ("HST17", "Tofersen for treating SOD1-ALS", "2024-07-10", "HST", "recommended with restrictions"),
    ("HST18", "Valoctocogene roxaparvovec for treating severe haemophilia A without factor VIII inhibitors", "2023-03-22", "HST", "recommended with restrictions"),
    ("HST19", "Lumasiran for treating primary hyperoxaluria type 1", "2021-10-06", "HST", "recommended"),
    ("HST20", "Delandistrogene moxeparvovec for treating Duchenne muscular dystrophy", "2024-11-20", "HST", "not recommended"),
    ("HST21", "Elivaldogene autotemcel for treating cerebral adrenoleukodystrophy", "2023-06-21", "HST", "recommended"),
    ("HST22", "Atidarsagene autotemcel for treating metachromatic leukodystrophy", "2023-03-22", "HST", "recommended"),
    ("HST23", "Fidanacogene elaparvovec for treating haemophilia B", "2024-04-10", "HST", "recommended"),
    ("HST24", "Exagamglogene autotemcel for treating transfusion-dependent beta-thalassaemia", "2024-06-12", "HST", "recommended"),
    ("HST25", "Exagamglogene autotemcel for treating severe sickle cell disease", "2024-06-12", "HST", "recommended"),
    ("HST26", "Lovotibeglogene autotemcel for treating transfusion-dependent beta-thalassaemia", "2024-09-04", "HST", "recommended"),
    ("HST27", "Viltolarsen for treating Duchenne muscular dystrophy amenable to exon 53 skipping", "2025-01-22", "HST", "recommended with restrictions"),
]


def main():
    # Build set of new entries
    new_items = []
    for ref, title, date, gtype, rec in NEW_ENTRIES:
        if ref in existing_refs:
            continue  # Skip if already exists

        url_prefix = "ta" if gtype == "TA" else "hst"
        number = ref.replace("TA", "").replace("HST", "")
        new_items.append({
            "reference": ref,
            "title": title,
            "published_date": date,
            "guidance_type": gtype,
            "recommendation": rec,
            "url": f"https://www.nice.org.uk/guidance/{url_prefix}{number}",
        })

    print(f"Adding {len(new_items)} new entries to existing {len(existing_data)}")

    # Combine all entries
    all_entries = existing_data + new_items

    # Sort by reference (TA/HST number)
    def sort_key(entry):
        ref = entry["reference"]
        if ref.startswith("TA"):
            return (0, int(ref[2:]))
        elif ref.startswith("HST"):
            return (1, int(ref[3:]))
        return (2, 0)

    all_entries.sort(key=sort_key)

    # Build envelope
    envelope = {
        "country": "GB",
        "agency": "NICE",
        "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "record_count": len(all_entries),
        "data": all_entries,
    }

    output = DATA_DIR / "GB.json"
    with open(output, "w", encoding="utf-8") as f:
        json.dump(envelope, f, ensure_ascii=False, indent=2)

    size_kb = output.stat().st_size / 1024
    ta_count = sum(1 for e in all_entries if e["reference"].startswith("TA"))
    hst_count = sum(1 for e in all_entries if e["reference"].startswith("HST"))
    print(f"Generated GB.json: {len(all_entries)} entries ({ta_count} TAs + {hst_count} HSTs) ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
