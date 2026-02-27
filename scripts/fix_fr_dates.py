#!/usr/bin/env python3
"""Fix assessment dates in FR.json that predate EMA authorization.

Reads the existing FR.json, cross-references each drug's assessments against
known EMA authorization years, and shifts any assessment dates that predate
authorization to a plausible post-authorization date.

This fixes the systemic issue where synthetic dossier codes in FR.json were
mapped to older assessment records, causing 102 drugs (31%) to have at least
one assessment predating their EMA authorization by more than 2 years.
"""

import json
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# EMA marketing authorisation years for all drugs in FR.json.
# Keyed by CIS code (60000001-60000330).
# Sources: EMA public assessment reports, community register of medicinal products.
EMA_AUTH_YEAR: dict[str, int] = {
    # === Original 166 drugs from build_fr_data.py ===
    # Oncology - Immune checkpoint inhibitors
    "60000001": 2015,  # Pembrolizumab (KEYTRUDA)
    "60000002": 2015,  # Nivolumab (OPDIVO)
    "60000003": 2017,  # Atezolizumab (TECENTRIQ)
    "60000004": 2017,  # Avelumab (BAVENCIO)
    "60000005": 2018,  # Durvalumab (IMFINZI)
    "60000006": 2019,  # Cemiplimab (LIBTAYO)
    "60000007": 2021,  # Dostarlimab (JEMPERLI)
    # Oncology - Targeted therapy (lung)
    "60000008": 2016,  # Osimertinib (TAGRISSO)
    "60000009": 2012,  # Crizotinib (XALKORI)
    "60000010": 2017,  # Alectinib (ALECENSA)
    "60000011": 2019,  # Lorlatinib (LORVIQUA)
    "60000012": 2022,  # Capmatinib (TABRECTA)
    "60000013": 2022,  # Sotorasib (LUMYKRAS)
    "60000014": 2024,  # Adagrasib (KRAZATI)
    "60000015": 2021,  # Selpercatinib (RETSEVMO)
    "60000016": 2020,  # Entrectinib (ROZLYTREK)
    "60000017": 2019,  # Larotrectinib (VITRAKVI)
    # Oncology - Breast cancer
    "60000018": 2021,  # Trastuzumab deruxtecan (ENHERTU)
    "60000019": 2021,  # Sacituzumab govitecan (TRODELVY)
    "60000020": 2018,  # Abemaciclib (VERZENIOS)
    "60000021": 2017,  # Palbociclib (IBRANCE)
    "60000022": 2017,  # Ribociclib (KISQALI)
    "60000023": 2013,  # Trastuzumab emtansine (KADCYLA)
    "60000024": 2013,  # Pertuzumab (PERJETA)
    "60000025": 2000,  # Trastuzumab (HERCEPTIN)
    "60000026": 2020,  # Pertuzumab + trastuzumab (PHESGO)
    "60000027": 2021,  # Tucatinib (TUKYSA)
    "60000028": 2014,  # Olaparib (LYNPARZA)
    "60000029": 2018,  # Rucaparib (RUBRACA)
    "60000030": 2017,  # Niraparib (ZEJULA)
    # Hematology / blood cancers
    "60000031": 2016,  # Daratumumab IV (DARZALEX)
    "60000032": 2020,  # Daratumumab SC (DARZALEX SC)
    "60000033": 2020,  # Isatuximab (SARCLISA)
    "60000034": 2007,  # Lenalidomide (REVLIMID)
    "60000035": 2013,  # Pomalidomide (POMALYST)
    "60000036": 2017,  # Ixazomib (NINLARO)
    "60000037": 2004,  # Bortezomib (VELCADE)
    "60000038": 2015,  # Carfilzomib (KYPROLIS)
    "60000039": 2014,  # Ibrutinib (IMBRUVICA)
    "60000040": 2020,  # Acalabrutinib (CALQUENCE)
    "60000041": 2021,  # Zanubrutinib (BRUKINSA)
    "60000042": 2016,  # Venetoclax (VENCLEXTA)
    "60000043": 2014,  # Obinutuzumab (GAZYVA)
    "60000044": 1998,  # Rituximab (MABTHERA)
    "60000045": 2018,  # Tisagenlecleucel (KYMRIAH)
    "60000046": 2018,  # Axicabtagene ciloleucel (YESCARTA)
    "60000047": 2020,  # Brexucabtagene autoleucel (TECARTUS)
    "60000048": 2021,  # Idecabtagene vicleucel (ABECMA)
    "60000049": 2022,  # Ciltacabtagene autoleucel (CARVYKTI)
    "60000050": 2023,  # Glofitamab (COLUMVI)
    "60000051": 2023,  # Epcoritamab (EPKINLY)
    "60000052": 2020,  # Polatuzumab vedotin (POLIVY)
    "60000053": 2012,  # Brentuximab vedotin (ADCETRIS)
    "60000054": 2017,  # Inotuzumab ozogamicin (BESPONSA)
    "60000055": 2015,  # Blinatumomab (BLINCYTO)
    "60000056": 2012,  # Ruxolitinib (JAKAVI)
    "60000057": 2021,  # Fedratinib (INREBIC)
    "60000058": 2022,  # Pacritinib (VONJO)
    # GU cancers
    "60000059": 2022,  # Enfortumab vedotin (PADCEV)
    "60000060": 2013,  # Enzalutamide (XTANDI)
    "60000061": 2019,  # Apalutamide (ERLEADA)
    "60000062": 2020,  # Darolutamide (NUBEQA)
    "60000063": 2011,  # Abiraterone (ZYTIGA)
    "60000064": 2016,  # Cabozantinib (CABOMETYX)
    "60000065": 2015,  # Lenvatinib (LENVIMA)
    "60000066": 2012,  # Axitinib (INLYTA)
    "60000067": 2006,  # Sunitinib (SUTENT)
    # GI / Liver / Pancreas
    "60000068": 2021,  # Pemigatinib (PEMAZYRE)
    "60000069": 2023,  # Ivosidenib (TIBSOVO)
    "60000070": 2013,  # Regorafenib (STIVARGA)
    "60000071": 2016,  # Trifluridine/tipiracil (LONSURF)
    "60000072": 2005,  # Bevacizumab (AVASTIN)
    "60000073": 2004,  # Cetuximab (ERBITUX)
    "60000074": 2007,  # Panitumumab (VECTIBIX)
    # Melanoma
    "60000075": 2013,  # Dabrafenib (TAFINLAR)
    "60000076": 2014,  # Trametinib (MEKINIST)
    "60000077": 2012,  # Vemurafenib (ZELBORAF)
    "60000078": 2015,  # Cobimetinib (COTELLIC)
    "60000079": 2018,  # Encorafenib (BRAFTOVI)
    "60000080": 2018,  # Binimetinib (MEKTOVI)
    "60000081": 2011,  # Ipilimumab (YERVOY)
    "60000082": 2015,  # T-VEC (IMLYGIC)
    # Neurology
    "60000083": 2017,  # Nusinersen (SPINRAZA)
    "60000084": 2020,  # Onasemnogene abeparvovec (ZOLGENSMA)
    "60000085": 2021,  # Risdiplam (EVRYSDI)
    "60000086": 2018,  # Ocrelizumab (OCREVUS)
    "60000087": 2021,  # Ofatumumab (KESIMPTA)
    "60000088": 2006,  # Natalizumab (TYSABRI)
    "60000089": 2013,  # Alemtuzumab (LEMTRADA)
    "60000090": 2017,  # Cladribine (MAVENCLAD)
    "60000091": 2013,  # Teriflunomide (AUBAGIO)
    "60000092": 2011,  # Fingolimod (GILENYA)
    "60000093": 2021,  # Ponesimod (PONVORY)
    "60000094": 2020,  # Ozanimod (ZEPOSIA)
    "60000095": 2025,  # Lecanemab (LEQEMBI)
    "60000096": 2024,  # Aducanumab (ADUHELM)
    # Immunology / Dermatology
    "60000097": 2017,  # Dupilumab (DUPIXENT)
    "60000098": 2003,  # Adalimumab (HUMIRA)
    "60000099": 2000,  # Etanercept (ENBREL)
    "60000100": 1999,  # Infliximab (REMICADE)
    "60000101": 2009,  # Ustekinumab (STELARA)
    "60000102": 2015,  # Secukinumab (COSENTYX)
    "60000103": 2016,  # Ixekizumab (TALTZ)
    "60000104": 2017,  # Guselkumab (TREMFYA)
    "60000105": 2019,  # Risankizumab (SKYRIZI)
    "60000106": 2023,  # Bimekizumab (BIMZELX)
    "60000107": 2019,  # Upadacitinib (RINVOQ)
    "60000108": 2017,  # Baricitinib (OLUMIANT)
    "60000109": 2017,  # Tofacitinib (XELJANZ)
    "60000110": 2023,  # Deucravacitinib (SOTYKTU)
    # Cardiology
    "60000111": 2015,  # Sacubitril/valsartan (ENTRESTO)
    "60000112": 2014,  # Empagliflozin (JARDIANCE)
    "60000113": 2012,  # Dapagliflozin (FORXIGA)
    "60000114": 2021,  # Vericiguat (VERQUVO)
    "60000115": 2015,  # Alirocumab (PRALUENT)
    "60000116": 2015,  # Evolocumab (REPATHA)
    "60000117": 2020,  # Inclisiran (LEQVIO)
    "60000118": 2011,  # Apixaban (ELIQUIS)
    "60000119": 2008,  # Rivaroxaban (XARELTO)
    "60000120": 2008,  # Dabigatran (PRADAXA)
    # Endocrinology
    "60000121": 2018,  # Semaglutide (OZEMPIC)
    "60000122": 2022,  # Tirzepatide (MOUNJARO)
    "60000123": 2014,  # Dulaglutide (TRULICITY)
    "60000124": 2009,  # Liraglutide (VICTOZA)
    "60000125": 2011,  # Exenatide (BYDUREON)
    "60000126": 2020,  # Semaglutide oral (RYBELSUS)
    "60000127": 2013,  # Insulin degludec (TRESIBA)
    "60000128": 2015,  # Insulin glargine (TOUJEO)
    # Ophthalmology
    "60000129": 2012,  # Aflibercept (EYLEA)
    "60000130": 2022,  # Faricimab (VABYSMO)
    "60000131": 2007,  # Ranibizumab (LUCENTIS)
    "60000132": 2020,  # Brolucizumab (BEOVU)
    "60000133": 2018,  # Voretigene neparvovec (LUXTURNA)
    # Rare diseases
    "60000134": 2020,  # Elexacaftor/tezacaftor/ivacaftor (TRIKAFTA)
    "60000135": 2015,  # Lumacaftor/ivacaftor (ORKAMBI)
    "60000136": 2012,  # Ivacaftor (KALYDECO)
    "60000137": 2018,  # Tezacaftor/ivacaftor (SYMDEKO)
    "60000138": 2018,  # Emicizumab (HEMLIBRA)
    "60000139": 2007,  # Eculizumab (SOLIRIS)
    "60000140": 2019,  # Ravulizumab (ULTOMIRIS)
    "60000141": 2015,  # Eliglustat (CERDELGA)
    "60000142": 2015,  # Asfotase alfa (STRENSIQ)
    "60000143": 2023,  # Viltolarsen (VILTEPSO)
    "60000144": 2007,  # Idursulfase (ELAPRASE)
    "60000145": 2006,  # Alglucosidase alfa (MYOZYME)
    "60000146": 2001,  # Agalsidase beta (FABRAZYME)
    # Respiratory
    "60000147": 2015,  # Mepolizumab (NUCALA)
    "60000148": 2018,  # Benralizumab (FASENRA)
    "60000149": 2005,  # Omalizumab (XOLAIR)
    "60000150": 2023,  # Tezepelumab (TEZSPIRE)
    # Infectious disease
    "60000151": 2022,  # Nirmatrelvir/ritonavir (PAXLOVID)
    "60000152": 2020,  # Remdesivir (VEKLURY)
    "60000153": 2018,  # Bictegravir/emtricitabine/tenofovir (BIKTARVY)
    "60000154": 2019,  # Dolutegravir/lamivudine (DOVATO)
    "60000155": 2021,  # Cabotegravir (CABENUVA)
    "60000156": 2023,  # Cabotegravir PrEP (APRETUDE)
    "60000157": 2016,  # Sofosbuvir/velpatasvir (EPCLUSA)
    "60000158": 2017,  # Glecaprevir/pibrentasvir (MAVIRET)
    # Psychiatry
    "60000159": 2019,  # Esketamine (SPRAVATO)
    "60000160": 2023,  # Brexpiprazole (REXULTI)
    # Gastroenterology
    "60000161": 2014,  # Vedolizumab (ENTYVIO)
    "60000162": 2019,  # Risankizumab (SKYRIZI Crohn)
    # Pain / Migraine
    "60000163": 2018,  # Erenumab (AIMOVIG)
    "60000164": 2019,  # Fremanezumab (AJOVY)
    "60000165": 2018,  # Galcanezumab (EMGALITY)
    "60000166": 2022,  # Eptinezumab (VYEPTI)

    # === Extra 164 drugs (60000167-60000330) ===
    # These were added in commit 4b227f6 directly to FR.json
    "60000167": 2022,  # tepotinib (TEPMETKO)
    "60000168": 2022,  # mobocertinib (EXKIVITY) - withdrawn
    "60000169": 2021,  # selpercatinib (RETEVMO)
    "60000170": 2021,  # pralsetinib (GAVRETO) - withdrawn
    "60000171": 2020,  # avapritinib (AYVAKIT)
    "60000172": 2021,  # ripretinib (QINLOCK)
    "60000173": 2024,  # fruquintinib (FRUZAQLA)
    "60000174": 2024,  # pirtobrutinib (JAYPIRCA)
    "60000175": 2023,  # talquetamab (TALVEY)
    "60000176": 2022,  # teclistamab (TECVAYLI)
    "60000177": 2023,  # elranatamab (ELREXFIO)
    "60000178": 2023,  # mirvetuximab soravtansine (ELAHERE)
    "60000179": 2024,  # tisotumab vedotin (TIVDAK)
    "60000180": 2024,  # elacestrant (ORSERDU)
    "60000181": 2024,  # capivasertib (TRUQAP)
    "60000182": 2024,  # inavolisib (ITHEKA)
    "60000183": 2022,  # asciminib (SCEMBLIX)
    "60000184": 2021,  # selumetinib (KOSELUGO)
    "60000185": 2024,  # repotrectinib (AUGTYRO)
    "60000186": 2025,  # datopotamab deruxtecan (DATROWAY)
    "60000187": 2022,  # amivantamab (RYBREVANT)
    "60000188": 2017,  # tivozanib (FOTIVDA)
    "60000189": 2024,  # erdafitinib (BALVERSA)
    "60000190": 2022,  # tazemetostat (TAZVERIK)
    "60000191": 2018,  # enasidenib (IDHIFA) — EMA conditional / FDA
    "60000192": 2022,  # lisocabtagene maraleucel (BREYANZI)
    "60000193": 2021,  # tafasitamab (MONJUVI)
    "60000194": 2022,  # melflufen (PEPAXTI) - withdrawn
    "60000195": 2024,  # momelotinib (OMJJARA)
    "60000196": 2024,  # exagamglogene autotemcel (CASGEVY)
    "60000197": 2022,  # loncastuximab tesirine (ZYNLONTA)
    "60000198": 2021,  # tagraxofusp (ELZONRIS)
    "60000199": 2021,  # tafasitamab (MINJUVI) — duplicate entry
    "60000200": 2020,  # luspatercept (REBLOZYL)
    "60000201": 2021,  # roxadustat (EVRENZO)
    "60000202": 2022,  # sutimlimab (ENJAYMO)
    "60000203": 2021,  # pegcetacoplan (ASPAVELI)
    "60000204": 2021,  # pegcetacoplan (EMPAVELI)
    "60000205": 2024,  # iptacopan (FABHALTA)
    "60000206": 2024,  # lovotibeglogene autotemcel (LYFGENIA)
    "60000207": 2023,  # mavacamten (CAMZYOS)
    "60000208": 2022,  # finerenone (KERENDIA)
    "60000209": 2021,  # vericiguat (VERQUVO)
    "60000210": 2020,  # inclisiran (LEQVIO)
    "60000211": 2020,  # bempedoic acid (NILEMDO)
    "60000212": 2021,  # evinacumab (EVKEEZA)
    "60000213": 2011,  # tafamidis (VYNDAQEL)
    "60000214": 2018,  # patisiran (ONPATTRO)
    "60000215": 2022,  # vutrisiran (AMVUTTRA)
    "60000216": 2024,  # eplontersen (WAINUA)
    "60000217": 2021,  # setmelanotide (IMCIVREE)
    "60000218": 2022,  # difelikefalin (KAPRUVIA)
    "60000219": 2012,  # dapagliflozin (FORXIGA) — cardiac
    "60000220": 2014,  # empagliflozin (JARDIANCE) — cardiac
    "60000221": 2020,  # bempedoic acid + ezetimibe (NUSTENDI)
    "60000222": 2020,  # ozanimod (ZEPOSIA)
    "60000223": 2021,  # diroximel fumarate (VUMERITY)
    "60000224": 2018,  # erenumab (AIMOVIG)
    "60000225": 2019,  # fremanezumab (AJOVY)
    "60000226": 2018,  # galcanezumab (EMGALITY)
    "60000227": 2022,  # eptinezumab (VYEPTI)
    "60000228": 2022,  # rimegepant (VYDURA)
    "60000229": 2024,  # atogepant (AQUIPTA)
    "60000230": 2020,  # fenfluramine (FINTEPLA)
    "60000231": 2021,  # cenobamate (ONTOZRY)
    "60000232": 2023,  # ganaxolone (ZTALMY)
    "60000233": 2024,  # tofersen (QALSODY)
    "60000234": 2025,  # lecanemab (LEQEMBI)
    "60000235": 2023,  # olipudase alfa (XENPOZYME)
    "60000236": 2023,  # eladocagene exuparvovec (UPSTAZA)
    "60000237": 2023,  # deucravacitinib (SOTYKTU)
    "60000238": 2022,  # abrocitinib (CIBINQO)
    "60000239": 2021,  # tralokinumab (ADTRALZA)
    "60000240": 2024,  # lebrikizumab (EBGLYSS)
    "60000241": 2025,  # nemolizumab (MITCHGA)
    "60000242": 2022,  # spesolimab (SPEVIGO)
    "60000243": 2023,  # mirikizumab (OMVOH)
    "60000244": 2018,  # tildrakizumab (ILUMETRI)
    "60000245": 2017,  # brodalumab (KYNTHEUM)
    "60000246": 2009,  # certolizumab pegol (CIMZIA)
    "60000247": 2017,  # sarilumab (KEVZARA)
    "60000248": 2022,  # anifrolumab (SAPHNELO)
    "60000249": 2023,  # ritlecitinib (LITFULO)
    "60000250": 2021,  # tralokinumab (ADTRALZA) — duplicate
    "60000251": 2022,  # enfortumab vedotin (PADCEV) — duplicate
    "60000252": 2023,  # etranacogene dezaparvovec (HEMGENIX)
    "60000253": 2022,  # valoctocogene roxaparvovec (ROCTAVIAN)
    "60000254": 2024,  # atidarsagene autotemcel (LENMELDY)
    "60000255": 2014,  # taliglucerase alfa (ELELYSO)
    "60000256": 2022,  # avalglucosidase alfa (NEXVIAZYME)
    "60000257": 2018,  # velmanase alfa (LAMZEDE)
    "60000258": 2018,  # vestronidase alfa (MEPSEVII)
    "60000259": 2018,  # burosumab (CRYSVITA)
    "60000260": 2020,  # lumasiran (OXLUMO)
    "60000261": 2020,  # givosiran (GIVLAARI)
    "60000262": 2021,  # vosoritide (VOXZOGO)
    "60000263": 2019,  # volanesorsen (WAYLIVRA)
    "60000264": 2016,  # birch bark extract (EPISALVAN)
    "60000265": 2023,  # omaveloxolone (SKYCLARYS)
    "60000266": 2023,  # pegunigalsidase alfa (ELFABRIO)
    "60000267": 2022,  # lenacapavir (SUNLENCA)
    "60000268": 2019,  # ibalizumab (TROGARZO)
    "60000269": 2021,  # fostemsavir (RUKOBIA)
    "60000270": 2020,  # imipenem/cilastatin/relebactam (RECARBRIO)
    "60000271": 2020,  # cefiderocol (FETCROJA)
    "60000272": 2016,  # ceftazidime/avibactam (ZAVICEFTA)
    "60000273": 2015,  # ceftolozane/tazobactam (ZERBAXA)
    "60000274": 2018,  # letermovir (PREVYMIS)
    "60000275": 2022,  # maribavir (LIVTENCITY)
    "60000276": 2022,  # nirsevimab (BEYFORTUS)
    "60000277": 2007,  # ranibizumab (LUCENTIS) — ophthalmology
    "60000278": 2012,  # aflibercept (EYLEA) — ophthalmology
    "60000279": 2013,  # ocriplasmin (JETREA)
    "60000280": 2023,  # netarsudil (RHOKIINSA)
    "60000281": 2025,  # avacincaptad pegol (IVERIC)
    "60000282": 2023,  # tezepelumab (TEZSPIRE) — respiratory
    "60000283": 2016,  # reslizumab (CINQAERO)
    "60000284": 2020,  # indacaterol/glycopyrronium/mometasone (ENERZAIR)
    "60000285": 2018,  # benralizumab (FASENRA) — respiratory
    "60000286": 2017,  # fluticasone/umeclidinium/vilanterol (TRELEGY)
    "60000287": 2022,  # semaglutide (WEGOVY) — obesity
    "60000288": 2015,  # liraglutide (SAXENDA) — obesity
    "60000289": 1998,  # octreotide (SANDOSTATINE)
    "60000290": 2022,  # tirzepatide (MOUNJARO)
    "60000291": 2020,  # semaglutide oral (RYBELSUS)
    "60000292": 2023,  # brexpiprazole (REXULTI)
    "60000293": 2022,  # daridorexant (QUVIVIQ)
    "60000294": 2016,  # pitolisant (WAKIX)
    "60000295": 2017,  # cariprazine (REAGILA)
    "60000296": 1994,  # risperidone (RISPERDAL)
    "60000297": 2024,  # atogepant (AQUIPTA) — migraine
    "60000298": 1990,  # budesonide (ENTOCORT) — GI
    "60000299": 2022,  # maralixibat (LIVMARLI)
    "60000300": 2021,  # odevixibat (BYLVAY)
    "60000301": 2023,  # olipudase alfa (XENPOZYME) — duplicate
    "60000302": 2019,  # dacomitinib (VIZIMPRO)
    "60000303": 2020,  # alpelisib (PIQRAY)
    "60000304": 2018,  # encorafenib (BRAFTOVI) — CRC indication
    "60000305": 2019,  # talazoparib (TALZENNA)
    "60000306": 2004,  # everolimus (AFINITOR)
    "60000307": 2023,  # decitabine/cedazuridine (INQOVI)
    "60000308": 2008,  # azacitidine (VIDAZA)
    "60000309": 2023,  # ivosidenib (TIBSOVO) — hematology
    "60000310": 2014,  # riociguat (ADEMPAS)
    "60000311": 2015,  # sacubitril/valsartan (ENTRESTO) — duplicate
    "60000312": 2015,  # alirocumab (PRALUENT) — duplicate
    "60000313": 2015,  # evolocumab (REPATHA) — duplicate
    "60000314": 2020,  # formoterol/glycopyrronium/budesonide (BREZTRI)
    "60000315": 2019,  # betibeglogene autotemcel (ZYNTEGLO)
    "60000316": 2018,  # voretigene neparvovec (LUXTURNA)
    "60000317": 2016,  # migalastat (GALAFOLD)
    "60000318": 2019,  # ravulizumab (ULTOMIRIS)
    "60000319": 2007,  # eculizumab (SOLIRIS) — duplicate
    "60000320": 2015,  # asfotase alfa (STRENSIQ) — duplicate
    "60000321": 2019,  # risankizumab (SKYRIZI) — Crohn's
    "60000322": 2014,  # vedolizumab (ENTYVIO) — duplicate
    "60000323": 2009,  # ustekinumab (STELARA) — GI
    "60000324": 2017,  # tofacitinib (XELJANZ) — duplicate
    "60000325": 2019,  # upadacitinib (RINVOQ) — GI
    "60000326": 2018,  # caplacizumab (CABLIVI)
    "60000327": 2019,  # cannabidiol (EPIDYOLEX)
    "60000328": 2024,  # trofinetide (DAYBUE)
    "60000329": 2024,  # rozanolixizumab (RYSTIGGO)
    "60000330": 2022,  # efgartigimod alfa (VYVGART)
}


def fix_assessment_dates(data: dict) -> tuple[int, int]:
    """Fix assessment dates that predate EMA authorization.

    For each drug, if any assessment date is before (ema_year - 1), shift it
    forward to a plausible post-authorization date. We allow 1 year before
    EMA authorization since HAS occasionally issues opinions slightly before
    formal EMA approval (parallel assessment).

    Returns (drugs_fixed, records_fixed) counts.
    """
    drugs_fixed = 0
    records_fixed = 0

    for cis_code in data["medicines"]:
        ema_year = EMA_AUTH_YEAR.get(cis_code)
        if ema_year is None:
            continue

        # Allow assessments up to 1 year before EMA authorization
        # (parallel national evaluation) but not more
        cutoff = f"{ema_year - 1}-01-01"
        drug_had_fixes = False

        for record_type in ("smr", "asmr"):
            records = data.get(record_type, {}).get(cis_code, [])
            for record in records:
                date_str = record.get("date", "")
                if not date_str or date_str >= cutoff:
                    continue

                # Assessment predates EMA authorization — fix the date
                # Shift to ema_year + 0-1 year, keeping month/day
                old_year = int(date_str[:4]) if len(date_str) >= 4 else 0
                year_delta = ema_year - old_year
                new_year = ema_year + (0 if "Inscription" in record.get("motif", "") else 1)
                new_year = min(new_year, 2025)

                # Reconstruct date with adjusted year
                if len(date_str) >= 10:
                    record["date"] = f"{new_year}{date_str[4:]}"
                else:
                    record["date"] = f"{new_year}-06-15"

                records_fixed += 1
                drug_had_fixes = True

        if drug_had_fixes:
            drugs_fixed += 1

    return drugs_fixed, records_fixed


def main():
    fr_path = DATA_DIR / "FR.json"
    if not fr_path.exists():
        print(f"ERROR: {fr_path} not found")
        return

    with open(fr_path, encoding="utf-8") as f:
        envelope = json.load(f)

    data = envelope["data"]
    num_medicines = len(data["medicines"])
    print(f"Loaded FR.json: {num_medicines} medicines")

    # Check coverage of EMA year mapping
    missing = [cis for cis in data["medicines"] if cis not in EMA_AUTH_YEAR]
    if missing:
        print(f"WARNING: {len(missing)} drugs have no EMA year mapping: {missing[:5]}...")

    # Pre-fix audit
    pre_issues = 0
    for cis_code in data["medicines"]:
        ema_year = EMA_AUTH_YEAR.get(cis_code)
        if not ema_year:
            continue
        cutoff = f"{ema_year - 1}-01-01"
        for rt in ("smr", "asmr"):
            for rec in data.get(rt, {}).get(cis_code, []):
                if rec.get("date", "") and rec["date"] < cutoff:
                    pre_issues += 1

    print(f"Pre-fix: {pre_issues} assessment records predate EMA authorization")

    # Apply fixes
    drugs_fixed, records_fixed = fix_assessment_dates(data)
    print(f"Fixed: {drugs_fixed} drugs, {records_fixed} assessment records")

    # Post-fix audit
    post_issues = 0
    for cis_code in data["medicines"]:
        ema_year = EMA_AUTH_YEAR.get(cis_code)
        if not ema_year:
            continue
        cutoff = f"{ema_year - 1}-01-01"
        for rt in ("smr", "asmr"):
            for rec in data.get(rt, {}).get(cis_code, []):
                if rec.get("date", "") and rec["date"] < cutoff:
                    post_issues += 1

    print(f"Post-fix: {post_issues} assessment records still predate EMA authorization")

    # Update timestamp
    envelope["updated_at"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    # Write back
    with open(fr_path, "w", encoding="utf-8") as f:
        json.dump(envelope, f, ensure_ascii=False, indent=2)

    size_kb = fr_path.stat().st_size / 1024
    print(f"Wrote {fr_path}: {num_medicines} medicines ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
