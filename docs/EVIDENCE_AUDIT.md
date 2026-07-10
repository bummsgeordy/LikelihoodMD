# Evidenz-Audit

Stand: 2026-07-10 · Datenschema v6

Dieser Bericht dokumentiert den maschinell prüfbaren Stand der kuratierten Daten. Ein Quellenabgleich oder eine strukturelle Prüfung setzt einen Eintrag **nicht** automatisch auf `reviewed`. Die fachliche Einzelprüfung durch einen benannten Reviewer bleibt erforderlich.

## Zentrale Korrekturen des Stabilisierungsreleases

- Nicht quantifizierbare Verfahren sind `categorical` oder `workflow-only`; LR 1/1 wird nicht als Platzhalter verwendet.
- LR− 0 und nicht endliche LR werden blockiert. Calcitonin wird mit sichtbarer Unsicherheit statt absolutem Ausschluss dargestellt.
- Troponin ist vom stabilen KHK-Kontext getrennt und als serieller ACS-/Myokardschaden-Workflow geführt.
- Diagnostikketten enthalten bedingte Fortsetzungen und Stopppfade; nach negativem D-Dimer wird im geeigneten Standardpfad keine Bildgebung fortgerechnet.
- `pretest-assumptions.json` ist die einzige kanonische Prätestbasis. Evidenzlücken werden separat dokumentiert.
- 1000er-Veranschaulichungen werden nur aus direkt hinterlegter Sensitivität und Spezifität erzeugt.

## Profilübersicht

- Profile insgesamt: 52
- Binär berechenbar: 30
- Kategorisch: 4
- Nur Workflow/Kontext: 18

| Erkrankung | Test | Profil | Modus | Primärquelle | Status |
|---|---|---|---|---|---|
| Akromegalie | GH-Suppression im oralen Glukosetest | 75-g-OGTT/GH-Suppression, Leitlinienprofil ohne LR | workflow-only | [Endocrine Society Clinical Practice Guideline: Acromegaly](https://academic.oup.com/jcem/article/99/11/3933/2836347) (2014) | needs-review |
| Akromegalie | Serum-IGF-1 | IGF-1, Leitlinienprofil ohne LR | workflow-only | [Endocrine Society Clinical Practice Guideline: Acromegaly](https://academic.oup.com/jcem/article/99/11/3933/2836347) (2014) | needs-review |
| Akutes Koronarsyndrom / Myokardschaden | High-sensitivity Troponin T | ACS-Kontext, nicht stabile KHK | workflow-only | [2023 ESC Guidelines for the management of acute coronary syndromes](https://doi.org/10.1093/eurheartj/ehad191) (2023) | needs-review |
| Chronische Nierenkrankheit | Albumin-Kreatinin-Quotient im Urin (UACR) | KDIGO 2024: Albuminurie A1-A3 | categorical | [KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease](https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf) (2024) | needs-review |
| Chronische Nierenkrankheit | eGFR nach Kreatinin | KDIGO 2024: eGFRcr | categorical | [KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease](https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf) (2024) | needs-review |
| Chronische Nierenkrankheit | eGFR nach Kreatinin und Cystatin C | KDIGO 2024: eGFRcr-cys | categorical | [KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease](https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf) (2024) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | 1-mg Dexamethason-Hemmtest | Overnight-DST, Leitlinien-/Reviewprofil | binary-lr | [Endocrine Society Guideline: Diagnosis of Cushing's Syndrome](https://academic.oup.com/jcem/article/93/5/1526/2598096) (2008) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | 2-mg Dexamethason-Hemmtest über 48 h | 48-h-DST, Protokollkontext ohne universelle LR | workflow-only | [StatPearls: Dexamethasone Suppression Test](https://www.ncbi.nlm.nih.gov/books/NBK542317/) (2024) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | 24-h-Urin auf freies Cortisol | UFC, Meta-Analyse diagnostischer Tests | binary-lr | [Endocrine Society Guideline: Diagnosis of Cushing's Syndrome](https://academic.oup.com/jcem/article/93/5/1526/2598096) (2008) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | Late-night salivary cortisol (LNSC) | Elecsys Cortisol II, ECE 2024 | binary-lr | [Endocrine Society Guideline: Diagnosis of Cushing's Syndrome](https://academic.oup.com/jcem/article/93/5/1526/2598096) (2008) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | Late-night salivary cortisol (LNSC) | Meta-Analyse, ältere Studien | binary-lr | [Late-night salivary cortisol for the diagnosis of Cushing syndrome: a meta-analysis](https://pubmed.ncbi.nlm.nih.gov/19502211/) (2009) | needs-review |
| Glomerulonephritis | GN-Serologiepanel | Kontextabhängige Serologie | workflow-only | [KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases](https://kdigo.org/guidelines/gd/) (2021) | needs-review |
| Glomerulonephritis | Nierenbiopsie bei GN-Verdacht | KDIGO 2021: histologische Einordnung | workflow-only | [KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases](https://kdigo.org/guidelines/gd/) (2021) | needs-review |
| Glomerulonephritis | Urinsediment und Mikroskopie | Nephritisches Sediment | workflow-only | [KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases](https://kdigo.org/guidelines/gd/) (2021) | needs-review |
| Glomerulonephritis | Urinstatus: Hämaturie und Proteinurie | Hämaturie + Proteinurie als Warnsignal | workflow-only | [KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases](https://kdigo.org/guidelines/gd/) (2021) | needs-review |
| Herzinsuffizienz | Lungenultraschall: diffuse bilaterale B-Linien | Akute Dyspnoe: diffuse bilaterale B-Linien | binary-lr | [Emergency department ultrasound for B-lines in acute decompensated heart failure: systematic review and meta-analysis](https://pubmed.ncbi.nlm.nih.gov/29619917/) (2018) | needs-review |
| Herzinsuffizienz | NT-proBNP ohne Vorhofflimmern | Cut-off 125 pg/ml | binary-lr | [Natriuretic peptide testing and heart failure diagnosis in primary care: diagnostic accuracy study](https://pubmed.ncbi.nlm.nih.gov/36543554/) (2025) | needs-review |
| Herzinsuffizienz | NT-proBNP ohne Vorhofflimmern | Cut-off 400 pg/ml | binary-lr | [Natriuretic peptide testing and heart failure diagnosis in primary care: diagnostic accuracy study](https://pubmed.ncbi.nlm.nih.gov/36543554/) (2025) | needs-review |
| Lungenembolie | CT-Pulmonalisangiografie bei LE-Verdacht | Multidetektor-CTPA, PIOPED-II-Arbeitswert | binary-lr | [2019 ESC Guidelines for Acute Pulmonary Embolism](https://academic.oup.com/eurheartj/article/41/4/543/5556136) (2019) | needs-review |
| Lungenembolie | D-Dimer bei Verdacht auf Lungenembolie | Hochsensitives D-Dimer, Standard-Cut-off | binary-lr | [ASH 2018 Guidelines: Diagnosis of Venous Thromboembolism](https://pmc.ncbi.nlm.nih.gov/articles/PMC6258916/) (2018) | needs-review |
| Medulläres Schilddrüsenkarzinom | Basales Calcitonin bei Schilddrüsenknoten | Basales Calcitonin, Cut-off 10 pg/ml | binary-lr | [Diagnostic accuracy of calcitonin for medullary thyroid carcinoma](https://pubmed.ncbi.nlm.nih.gov/39178090/) (2024) | needs-review |
| Morbus Basedow | Schilddrüsen-Doppler bei Thyreotoxikose | Diffuse Hypervaskularität / thyroid inferno | binary-lr | [Endotext: Diagnosis and Treatment of Graves Disease](https://www.ncbi.nlm.nih.gov/books/NBK285548/) (2026) | needs-review |
| Morbus Basedow | TSH-Rezeptor-Antikörper (TRAb) | TRAb, 2. Generation | binary-lr | [TSH receptor antibodies for the diagnosis of Graves' disease: systematic review and meta-analysis](https://pubmed.ncbi.nlm.nih.gov/22776786/) (2012) | needs-review |
| Morbus Basedow | TSH-Rezeptor-Antikörper (TRAb) | TRAb, 3. Generation | binary-lr | [TSH receptor antibodies for the diagnosis of Graves' disease: systematic review and meta-analysis](https://pubmed.ncbi.nlm.nih.gov/22776786/) (2012) | needs-review |
| Nebenniereninsuffizienz | ACTH-Stimulationstest 250 µg | 250-µg-Test, sekundäre Nebenniereninsuffizienz | binary-lr | [ACTH Stimulation Tests for the Diagnosis of Adrenal Insufficiency: Systematic Review and Meta-Analysis](https://pubmed.ncbi.nlm.nih.gov/26649617/) (2016) | needs-review |
| Nebenniereninsuffizienz | Low-dose ACTH-Stimulationstest 1 µg | 1-µg-Test, sekundäre Nebenniereninsuffizienz | binary-lr | [ACTH Stimulation Tests for the Diagnosis of Adrenal Insufficiency: Systematic Review and Meta-Analysis](https://pubmed.ncbi.nlm.nih.gov/26649617/) (2016) | needs-review |
| Obstruktive koronare Herzkrankheit | Echokardiographie bei KHK-Verdacht | Ruhe-Echo als Kontexttest | workflow-only | [2021 AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain](https://www.jacc.org/doi/10.1016/j.jacc.2021.07.053) (2021) | needs-review |
| Obstruktive koronare Herzkrankheit | Ergometrie / Belastungs-EKG | Belastungs-EKG, klassischer Startwert | binary-lr | [2021 AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain](https://www.jacc.org/doi/10.1016/j.jacc.2021.07.053) (2021) | needs-review |
| Obstruktive koronare Herzkrankheit | Koronar-CT-Angiographie (CCTA) | Stabiler Thoraxschmerz, CCTA | binary-lr | [2021 AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain](https://doi.org/10.1016/j.jacc.2021.07.053) (2021) | needs-review |
| Obstruktive koronare Herzkrankheit | Koronarangiographie | Invasive Angiographie | workflow-only | [2021 AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain](https://www.jacc.org/doi/10.1016/j.jacc.2021.07.053) (2021) | needs-review |
| Obstruktive koronare Herzkrankheit | Stress-Kard-MRT | Stress-CMR, stabiler Thoraxschmerz | binary-lr | [2021 AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain](https://www.jacc.org/doi/10.1016/j.jacc.2021.07.053) (2021) | needs-review |
| Phäochromozytom / Paragangliom | Plasmafreie Metanephrine | Fraktionierte freie Plasma-Metanephrine, konservative Meta-Annahme | binary-lr | [A comparison of biochemical tests for pheochromocytoma: measurement of fractionated plasma metanephrines compared with other tests](https://pmc.ncbi.nlm.nih.gov/articles/PMC459231/) (2004) | needs-review |
| Phäochromozytom / Paragangliom | Plasmafreie Metanephrine | Plasmafreie Metanephrine | binary-lr | [Endocrine Society Clinical Practice Guideline: Pheochromocytoma and Paraganglioma](https://academic.oup.com/jcem/article/99/6/1915/2537399) (2014) | needs-review |
| Phäochromozytom / Paragangliom | Urinfraktionierte Metanephrine | Urinfraktionierte Metanephrine | binary-lr | [Endocrine Society Clinical Practice Guideline: Pheochromocytoma and Paraganglioma](https://academic.oup.com/jcem/article/99/6/1915/2537399) (2014) | needs-review |
| Primärer Hyperaldosteronismus | Aldosteron-Renin-Ratio | ADRR mit direkter Reninkonzentration, Meta-Analyse | binary-lr | [Diagnostic accuracy of aldosterone/direct renin concentration ratio for primary aldosteronism](https://journals.sagepub.com/doi/10.1177/1470320316657450) (2016) | needs-review |
| Primärer Hyperaldosteronismus | Aldosteron-Renin-Ratio | ARR-Screening, methodenabhängiger Leitlinienkontext | workflow-only | [Systematic Review Supporting the Endocrine Society Guideline on Primary Aldosteronism](https://academic.oup.com/jcem/article/110/9/e2833/8196230) (2025) | needs-review |
| Primärer Hyperaldosteronismus | Kochsalzinfusionstest | Saline infusion test, LC-MS/MS-Profil | binary-lr | [Saline Infusion Test for Primary Aldosteronism: Implications of Immunoassay Inaccuracy](https://academic.oup.com/jcem/article/107/5/e2027/6485559) (2022) | needs-review |
| Primärer Hyperaldosteronismus | Oraler Kochsalzbelastungstest | Oral sodium loading, Endotext | binary-lr | [Endotext: Primary Aldosteronism](https://www.ncbi.nlm.nih.gov/books/NBK279065/) (2024) | needs-review |
| Primärer Hyperparathyreoidismus | 24h-Urincalcium / Calcium-Kreatinin-Clearance-Ratio | FHH-Abgrenzung / Calciurie | workflow-only | [Evaluation and Management of Primary Hyperparathyroidism: Fifth International Workshop](https://pubmed.ncbi.nlm.nih.gov/36245251/) (2022) | needs-review |
| Primärer Hyperparathyreoidismus | 25-OH-Vitamin D im PHPT-Kontext | Vitamin-D-Kontext | workflow-only | [Evaluation and Management of Primary Hyperparathyroidism: Fifth International Workshop](https://pubmed.ncbi.nlm.nih.gov/36245251/) (2022) | needs-review |
| Primärer Hyperparathyreoidismus | Calcium + Parathormon-Konstellation | PHPT-Kernmuster | workflow-only | [Evaluation and Management of Primary Hyperparathyroidism: Fifth International Workshop](https://pubmed.ncbi.nlm.nih.gov/36245251/) (2022) | needs-review |
| Renale Arterienstenose / renovaskuläre Hypertonie | CTA/MRA der Nierenarterien | CTA/MRA im Hochrisikokontext | workflow-only | [ACR Appropriateness Criteria: Renovascular Hypertension](https://pubmed.ncbi.nlm.nih.gov/29101991/) (2017) | needs-review |
| Renale Arterienstenose / renovaskuläre Hypertonie | Duplexsonographie der Nierenarterien | Duplexsonographie, heterogene Schwellen | workflow-only | [ACR Appropriateness Criteria: Renovascular Hypertension](https://pubmed.ncbi.nlm.nih.gov/29101991/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Feinnadelpunktion / Bethesda-Zytologie | FNA: Bethesda II vs. V/VI | binary-lr | [2015 American Thyroid Association Management Guidelines for Adult Patients with Thyroid Nodules](https://pmc.ncbi.nlm.nih.gov/articles/PMC4739132/) (2015) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | MIBI-Szintigraphie bei indeterminierter Schilddrüsenzytologie | Europäische Multicenter-Studie | binary-lr | [Diagnostic Performance of 99mTc-MIBI for Risk Stratification of Hypofunctioning Thyroid Nodules](https://pmc.ncbi.nlm.nih.gov/articles/PMC9221758/) (2022) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Molekulare Marker bei indeterminierter Schilddrüsenzytologie | Panelabhängige Zusatzdiagnostik | workflow-only | [2015 American Thyroid Association Management Guidelines for Adult Patients with Thyroid Nodules](https://pmc.ncbi.nlm.nih.gov/articles/PMC4739132/) (2015) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsen-Elastographie | Ergänzung zur Sonographie | workflow-only | [European Thyroid Association Guidelines for Ultrasound Malignancy Risk Stratification of Thyroid Nodules in Adults: EU-TIRADS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5652895/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsensonographie / TI-RADS | EU-/ACR-/ATA-TIRADS Kontext | categorical | [European Thyroid Association Guidelines for Ultrasound Malignancy Risk Stratification of Thyroid Nodules in Adults: EU-TIRADS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5652895/) (2017) | needs-review |
| Tiefe Venenthrombose | D-Dimer bei Verdacht auf TVT | Hochsensitives D-Dimer, Standard-Cut-off | binary-lr | [ASH 2018 Guidelines: Diagnosis of Venous Thromboembolism](https://pmc.ncbi.nlm.nih.gov/articles/PMC6258916/) (2018) | needs-review |
| Tiefe Venenthrombose | Kompressionssonografie bei TVT-Verdacht | Proximale Kompressionssonografie | binary-lr | [Systematic review and meta-analysis of the diagnostic accuracy of ultrasonography for deep vein thrombosis](https://pmc.ncbi.nlm.nih.gov/articles/PMC1262723/) (2005) | needs-review |
| Zöliakie | Endomysium-IgA-Antikörper (EMA-IgA) | EMA-IgA, Bestätigungsserologie | binary-lr | [Comparative Accuracy of Diagnostic Tests for Celiac Disease](https://www.ncbi.nlm.nih.gov/books/NBK447451/) (2017) | needs-review |
| Zöliakie | Transglutaminase-IgA (tTG-IgA) | tTG-IgA, Erwachsene | binary-lr | [Comparative Accuracy of Diagnostic Tests for Celiac Disease](https://www.ncbi.nlm.nih.gov/books/NBK447451/) (2017) | needs-review |

## Prätestannahmen

- Kanonische Annahmen: 46
- Klinische Modifikatoren: 39

| Erkrankung | Setting/Population | Startwert | Spanne | Primärquelle | Status |
|---|---|---:|---:|---|---|
| Akromegalie | Allgemeine Erkrankungsannahme | 0,006 % | 0,003–0,01 % | [Endotext: Acromegaly](https://www.ncbi.nlm.nih.gov/books/NBK279097/) (2022) | needs-review |
| Akromegalie | Ambulant: Endokrinologie | 5 % | 1–20 % | [Endocrine Society Clinical Practice Guideline: Acromegaly](https://academic.oup.com/jcem/article/99/11/3933/2836347) (2014) | needs-review |
| Akutes Koronarsyndrom / Myokardschaden | Allgemeine Erkrankungsannahme | 10 % | 1–50 % | [2023 ESC Guidelines for the management of acute coronary syndromes](https://doi.org/10.1093/eurheartj/ehad191) (2023) | needs-review |
| Chronische Nierenkrankheit | Allgemeine Erkrankungsannahme | 10 % | 4,9–35,8 % | [KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease](https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf) (2024) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | Allgemeine Erkrankungsannahme | 2 % | 0,5–10 % | [Endocrine Society Guideline: Diagnosis of Cushing's Syndrome](https://academic.oup.com/jcem/article/93/5/1526/2598096) (2008) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | Ambulant: Endokrinologie | 5 % | 2–20 % | [Endocrine Society Guideline: Diagnosis of Cushing's Syndrome](https://academic.oup.com/jcem/article/93/5/1526/2598096) (2008) | needs-review |
| Cushing-Syndrom / Hyperkortisolismus | Hausarztpraxis | 0,1 % | 0,05–0,5 % | [Endocrine Society Guideline: Diagnosis of Cushing's Syndrome](https://academic.oup.com/jcem/article/93/5/1526/2598096) (2008) | needs-review |
| Glomerulonephritis | Allgemeine Erkrankungsannahme | 5 % | 0,1–20 % | [KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases](https://kdigo.org/guidelines/gd/) (2021) | needs-review |
| Herzinsuffizienz | Allgemeine Erkrankungsannahme | 20 % | 5–40 % | [ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure](https://academic.oup.com/eurheartj/article/42/36/3599/6358045) (2021) | needs-review |
| Herzinsuffizienz | Hausarztpraxis | 15 % | 5–30 % | [ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure](https://academic.oup.com/eurheartj/article/42/36/3599/6358045) (2021) | needs-review |
| Herzinsuffizienz | Klinik-Notaufnahme | 20 % | 10–35 % | [Dyspnea Due to Acute Heart Failure Syndrome](https://www.aafp.org/pubs/afp/issues/2019/0201/od1.html) (2019) | needs-review |
| Lungenembolie | Allgemeine Erkrankungsannahme | 10 % | 3–30 % | [ASH 2018 Guidelines: Diagnosis of Venous Thromboembolism](https://pmc.ncbi.nlm.nih.gov/articles/PMC6258916/) (2018) | needs-review |
| Lungenembolie | Klinik-Notaufnahme | 15 % | 5–30 % | [NICE NG158: Venous thromboembolic diseases](https://www.nice.org.uk/guidance/ng158/chapter/Recommendations) (2020) | needs-review |
| Medulläres Schilddrüsenkarzinom | Allgemeine Erkrankungsannahme | 0,5 % | 0,1–2 % | [Diagnostic accuracy of calcitonin for medullary thyroid carcinoma](https://pubmed.ncbi.nlm.nih.gov/39178090/) (2024) | needs-review |
| Medulläres Schilddrüsenkarzinom | Ambulant: Endokrinologie | 0,5 % | 0,11–1,4 % | [Prevalence and significance of indeterminate calcitonin values in patients with thyroid nodules: a systematic review and meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC10404572/) (2023) | needs-review |
| Medulläres Schilddrüsenkarzinom | Hausarztpraxis | 0,32 % | 0,11–0,85 % | [Prevalence and significance of indeterminate calcitonin values in patients with thyroid nodules: a systematic review and meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC10404572/) (2023) | needs-review |
| Morbus Basedow | Allgemeine Erkrankungsannahme | 60 % | 30–80 % | [TSH receptor antibodies for the diagnosis of Graves' disease: systematic review and meta-analysis](https://pubmed.ncbi.nlm.nih.gov/22776786/) (2012) | needs-review |
| Morbus Basedow | Ambulant: Endokrinologie | 65 % | 45–85 % | [2018 European Thyroid Association Guideline for the Management of Graves' Hyperthyroidism](https://www.karger.com/Article/FullText/490384) (2018) | needs-review |
| Morbus Basedow | Hausarztpraxis | 50 % | 30–75 % | [2018 European Thyroid Association Guideline for the Management of Graves' Hyperthyroidism](https://www.karger.com/Article/FullText/490384) (2018) | needs-review |
| Nebenniereninsuffizienz | Allgemeine Erkrankungsannahme | 10 % | 3–30 % | [ESE/Endocrine Society Guideline: Glucocorticoid-induced Adrenal Insufficiency](https://www.endocrine.org/clinical-practice-guidelines/glucocorticoid-induced-adrenal-insufficiency) (2024) | needs-review |
| Nebenniereninsuffizienz | Ambulant: Endokrinologie | 10 % | 5–30 % | [ESE/Endocrine Society Guideline: Glucocorticoid-induced Adrenal Insufficiency](https://www.endocrine.org/clinical-practice-guidelines/glucocorticoid-induced-adrenal-insufficiency) (2024) | needs-review |
| Obstruktive koronare Herzkrankheit | Allgemeine Erkrankungsannahme | 15 % | 1–61 % | [2021 AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain](https://www.jacc.org/doi/10.1016/j.jacc.2021.07.053) (2021) | needs-review |
| Phäochromozytom / Paragangliom | Allgemeine Erkrankungsannahme | 2 % | 0,5–8 % | [Pheochromocytoma: Symptom to Diagnosis, An Evidence-Based Guide](https://accessmedicine.mhmedical.com/content.aspx?bookid=2715&sectionid=249060850) (2020) | needs-review |
| Phäochromozytom / Paragangliom | Ambulant: Endokrinologie | 5 % | 2–15 % | [Pheochromocytoma: Symptom to Diagnosis, An Evidence-Based Guide](https://accessmedicine.mhmedical.com/content.aspx?bookid=2715&sectionid=249060850) (2020) | needs-review |
| Phäochromozytom / Paragangliom | Hausarztpraxis | 0,3 % | 0,2–0,6 % | [Pheochromocytoma: Symptom to Diagnosis, An Evidence-Based Guide](https://accessmedicine.mhmedical.com/content.aspx?bookid=2715&sectionid=249060850) (2020) | needs-review |
| Primärer Hyperaldosteronismus | Allgemeine Erkrankungsannahme | 6 % | 3–14 % | [Systematic Review Supporting the Endocrine Society Guideline on Primary Aldosteronism](https://academic.oup.com/jcem/article/110/9/e2833/8196230) (2025) | needs-review |
| Primärer Hyperaldosteronismus | Ambulant: Nephrologie / Hypertonie | 20 % | 10–30 % | [Systematic Review Supporting the Endocrine Society Guideline on Primary Aldosteronism](https://academic.oup.com/jcem/article/110/9/e2833/8196230) (2025) | needs-review |
| Primärer Hyperaldosteronismus | Hausarztpraxis | 6 % | 4–14 % | [Systematic Review Supporting the Endocrine Society Guideline on Primary Aldosteronism](https://academic.oup.com/jcem/article/110/9/e2833/8196230) (2025) | needs-review |
| Primärer Hyperparathyreoidismus | Allgemeine Erkrankungsannahme | 20 % | 5–80 % | [Evaluation and Management of Primary Hyperparathyroidism: Fifth International Workshop](https://pubmed.ncbi.nlm.nih.gov/36245251/) (2022) | needs-review |
| Renale Arterienstenose | Allgemeine Erkrankungsannahme | 10 % | 1–40 % | [ACR Appropriateness Criteria: Renovascular Hypertension](https://pubmed.ncbi.nlm.nih.gov/29101991/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Allgemeine Erkrankungsannahme | 5 % | 1–15 % | [2023 European Thyroid Association Clinical Practice Guidelines for thyroid nodule management](https://pmc.ncbi.nlm.nih.gov/articles/PMC10448590/) (2023) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: ACR TI-RADS 1 | 0,3 % | 0–0,6 % | [ACR Thyroid Imaging, Reporting and Data System (TI-RADS): White Paper](https://pubmed.ncbi.nlm.nih.gov/28372962/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: ACR TI-RADS 2 | 1,5 % | 0,5–3 % | [ACR Thyroid Imaging, Reporting and Data System (TI-RADS): White Paper](https://pubmed.ncbi.nlm.nih.gov/28372962/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: ACR TI-RADS 3 | 4,8 % | 3–7 % | [ACR Thyroid Imaging, Reporting and Data System (TI-RADS): White Paper](https://pubmed.ncbi.nlm.nih.gov/28372962/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: ACR TI-RADS 4 | 9,1 % | 6–13 % | [ACR Thyroid Imaging, Reporting and Data System (TI-RADS): White Paper](https://pubmed.ncbi.nlm.nih.gov/28372962/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: ACR TI-RADS 5 | 35 % | 25–45 % | [ACR Thyroid Imaging, Reporting and Data System (TI-RADS): White Paper](https://pubmed.ncbi.nlm.nih.gov/28372962/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: EU-TIRADS 1 | 0,1 % | 0–0,5 % | [European Thyroid Association Guidelines for Ultrasound Malignancy Risk Stratification of Thyroid Nodules in Adults: EU-TIRADS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5652895/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: EU-TIRADS 2 | 0,1 % | 0–0,5 % | [European Thyroid Association Guidelines for Ultrasound Malignancy Risk Stratification of Thyroid Nodules in Adults: EU-TIRADS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5652895/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: EU-TIRADS 3 | 3 % | 2–4 % | [European Thyroid Association Guidelines for Ultrasound Malignancy Risk Stratification of Thyroid Nodules in Adults: EU-TIRADS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5652895/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: EU-TIRADS 4 | 11 % | 6–17 % | [European Thyroid Association Guidelines for Ultrasound Malignancy Risk Stratification of Thyroid Nodules in Adults: EU-TIRADS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5652895/) (2017) | needs-review |
| Schilddrüsenknoten / Malignitätsrisiko | Schilddrüsenknoten: EU-TIRADS 5 | 56 % | 26–87 % | [European Thyroid Association Guidelines for Ultrasound Malignancy Risk Stratification of Thyroid Nodules in Adults: EU-TIRADS](https://pmc.ncbi.nlm.nih.gov/articles/PMC5652895/) (2017) | needs-review |
| Tiefe Venenthrombose | Allgemeine Erkrankungsannahme | 15 % | 5–35 % | [ASH 2018 Guidelines: Diagnosis of Venous Thromboembolism](https://pmc.ncbi.nlm.nih.gov/articles/PMC6258916/) (2018) | needs-review |
| Tiefe Venenthrombose | Klinik-Notaufnahme | 20 % | 10–35 % | [ASH 2018 Guidelines: Diagnosis of Venous Thromboembolism](https://pmc.ncbi.nlm.nih.gov/articles/PMC6258916/) (2018) | needs-review |
| Zöliakie | Allgemeine Erkrankungsannahme | 5 % | 1–15 % | [Comparative Accuracy of Diagnostic Tests for Celiac Disease](https://www.ncbi.nlm.nih.gov/books/NBK447451/) (2017) | needs-review |
| Zöliakie | Ambulant: Diabetologie | 6 % | 3–10 % | [European Society for the Study of Coeliac Disease 2025 Updated Guidelines on the Diagnosis and Management of Coeliac Disease in Adults. Part 1: Diagnostic Approach](https://pmc.ncbi.nlm.nih.gov/articles/PMC12704582/) (2025) | needs-review |
| Zöliakie | Hausarztpraxis | 1 % | 0,6–3 % | [European Society for the Study of Coeliac Disease 2025 Updated Guidelines on the Diagnosis and Management of Coeliac Disease in Adults. Part 1: Diagnostic Approach](https://pmc.ncbi.nlm.nih.gov/articles/PMC12704582/) (2025) | needs-review |

## Diagnostikketten und Guidance

- Bedingte Diagnostikketten: 7
- Krankheitsbezogene Guidance-Einträge: 18

| Kette | Bedingte Stufen | Primärquelle | Status |
|---|---|---|---|
| Basedow: TRAb → Doppler/Szintigrafie-Kontext | Labor: TRAb 3. Generation → Kontext: Doppler-Sonografie / ggf. Szintigrafie | [Endotext: Diagnosis and Treatment of Graves Disease](https://www.ncbi.nlm.nih.gov/books/NBK285548/) (2026) | needs-review |
| Cushing: LNSC → 1-mg-DST | Screening: Late-night salivary cortisol → Zweiter Screeningtest: 1-mg-DST | [Endocrine Society Guideline: Diagnosis of Cushing's Syndrome](https://academic.oup.com/jcem/article/93/5/1526/2598096) (2008) | needs-review |
| Herzinsuffizienz: NT-proBNP → Lungenultraschall | Labor: NT-proBNP 400 pg/ml → Bildgebung: Lungenultraschall-B-Linien | [NICE NG106: Chronic heart failure in adults](https://www.nice.org.uk/guidance/ng106/chapter/Recommendations) (2018) | needs-review |
| LE: D-Dimer → CTPA | Screening/Rule-out: hochsensitives D-Dimer → Bildgebung: CT-Pulmonalisangiografie | [2019 ESC Guidelines for Acute Pulmonary Embolism](https://academic.oup.com/eurheartj/article/41/4/543/5556136) (2019) | needs-review |
| PA: ARR → oraler Kochsalzbelastungstest | Screening: Aldosteron/direct-Renin-Ratio (methodenspezifisches Beispiel) → Bestätigung: oraler Kochsalzbelastungstest | [Systematic Review Supporting the Endocrine Society Guideline on Primary Aldosteronism](https://academic.oup.com/jcem/article/110/9/e2833/8196230) (2025) | needs-review |
| TVT: D-Dimer → Kompressionssonografie | Screening/Rule-out: hochsensitives D-Dimer → Bildgebung: proximale Kompressionssonografie | [NICE NG158: Venous thromboembolic diseases](https://www.nice.org.uk/guidance/ng158/chapter/Recommendations) (2020) | needs-review |
| Zöliakie: tTG-IgA → Bestätigungskontext | Screening: tTG-IgA plus Gesamt-IgA → Mögliche Bestätigung bei diskordantem/niedrigerem Titer: EMA-IgA | [ESsCD 2025 Updated Guidelines on the Diagnosis of Coeliac Disease in Adults](https://doi.org/10.1002/ueg2.70119) (2025) | needs-review |

## Körperliche Untersuchung nach McGee

- Befunde insgesamt: 732
- Prioritäre Einzelprüfung LR+ ≥ 10: 99
- Prioritäre Einzelprüfung LR− ≤ 0,1: 51
- LR− nicht berichtet: 94
- Öffentlicher Status: alle Einträge `needs-review`

Der öffentliche Datensatz ist als deutschsprachige Arbeitsfassung aufbereitet und enthält Kriterien, LR/Konfidenzintervalle und präzise Buchreferenzen. Einzelne medizinische Begriffe sind noch nicht abschließend sprachlich vereinheitlicht. Englische Originalspalten und Arbeitsmaterial bleiben außerhalb des öffentlichen Bundles. Vor einer breiteren Wiederverwendung sind fachlicher, sprachlicher und urheberrechtlicher Review erforderlich.

## Verbleibende Grenzen

- Viele LR gelten nur für die jeweilige Population, Methode und den jeweiligen Cut-off.
- Bei fehlenden Konfidenzintervallen kann kein vollständiger Posttest-Unsicherheitsbereich berechnet werden.
- Klinische Modifikatoren bleiben ohne direkt belegten numerischen Effekt qualitativ.
- Lokale Prävalenzen, Laborassays und Behandlungspfade können von den kuratierten Startwerten abweichen.
- Die verbleibende Aufteilung der großen UI-Startdatei in weitere unabhängige Renderer ist technischer Folgebedarf; medizinische Berechnungen und 1000er-Logik sind bereits DOM-unabhängig getestet.
