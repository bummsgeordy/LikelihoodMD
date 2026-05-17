# Beitragen

Dieses Projekt soll auch für medizinische Fachpersonen nachvollziehbar bleiben. Beiträge sind willkommen, müssen aber die Herkunft jeder diagnostischen Zahl transparent machen.

## Diagnostischen Test ergänzen

Ein neuer Test gehört in `src/data/tests.json`. Ein Test beschreibt nur das diagnostische Verfahren und die Fragestellung. Die Testgüte wird separat in Evidenzprofilen dokumentiert, damit mehrere Studien, Cut-offs oder Populationen nebeneinander auswählbar bleiben.

Bitte pro Test angeben:

- `name`: verständlicher Name des Tests.
- `category`: Fachgebiet oder thematische Gruppe.
- `condition`: Krankheitsbild oder diagnostische Fragestellung.
- `description`: kurze Beschreibung, wofür dieser Testeintrag steht.

## Evidenzprofil ergänzen

Ein Evidenzprofil gehört zu genau einem Test. Es kann direkt im jeweiligen Test unter `evidenceProfiles` stehen oder als nutzereigenes Profil exportiert/importiert werden. Bitte pro Profil angeben:

- `label`: verständlicher Name der Quelle oder Annahme, z. B. "Meta-Analyse 2019" oder "Cut-off 400 pg/ml".
- `kind`: `curated`, `custom` oder `scenario`.
- `method`: Messmethode oder Testprotokoll.
- `cutoff`: Schwellenwert mit Einheit.
- optional `procedure`: sehr knappe Durchführung für die Testkarte.
- `sensitivity` und `specificity`: als Dezimalzahlen zwischen 0 und 1.
- optional `lrPositive` und `lrNegative`, wenn sie direkt aus der Quelle übernommen werden.
- `population`: für wen gelten die Zahlen?
- `rationale`: warum ist dieses Profil geeignet oder warum weicht es von anderen Profilen ab?
- `limitations`: wann ist der Wert nicht übertragbar?
- `sources`: mindestens eine Quelle mit Titel, Jahr, URL, Quellentyp und Kurznotiz.
- `lastReviewed`: Datum im Format `YYYY-MM-DD`.
- `isDefault`: bei kuratierten Profilen genau einmal pro Test `true`.

Szenarien sind bewusst abweichende Werte. Sie müssen zusätzlich `deviationFromProfileId` und `deviationReason` enthalten, damit die Abweichung sichtbar bleibt.

## Prätest-Annahme ergänzen

Eine neue Annahme gehört in `src/data/pretest-assumptions.json`. Bitte angeben:

- `condition`: Krankheitsbild.
- `conditionId`: stabile ID des Krankheitsbilds, aus dem Namen abgeleitet.
- `setting`: z. B. Hausarztpraxis, Klinik-Notaufnahme, Ambulant: Endokrinologie.
- `settingId`: stabile Setting-ID; allgemeine Erkrankungs-Fallbacks nutzen `general`.
- `evidenceLevel`: `direct` für konkrete Setting-Daten, `fallback` für allgemeine Erkrankungsannahmen.
- `population`: Patientengruppe, auf die sich die Annahme bezieht.
- `probability`: Ausgangswahrscheinlichkeit als Dezimalzahl zwischen 0 und 1.
- optional `rangeLow` und `rangeHigh` als plausible Spanne.
- `kind`: `curated`, `custom` oder `scenario`.
- `rationale`, `limitations`, `sources`, `lastReviewed`.

Eigene Annahmen aus dem Drawer werden als `custom` gespeichert. Direkte Setting-Annahmen werden in der App grün markiert; allgemeine Fallbacks werden orange markiert.

## Klinischen Modifikator ergänzen

Klinische Modifikatoren gehören in `src/data/clinical-modifiers.json`. Sie beschreiben Symptome, Zeichen, Anamnese- oder Kontextfaktoren, die die Prätestwahrscheinlichkeit beeinflussen können.

Bitte pro Modifikator angeben:

- `conditionId`: stabile ID der Erkrankung, auf die sich der Modifikator bezieht.
- `label`: kurze, klinisch verständliche Bezeichnung.
- `category`: `Symptom`, `Klinisches Zeichen`, `Anamnese`, `Kontext` oder `Labor/Vorbefund`.
- `direction`: `increases`, `decreases` oder `uncertain`.
- optional `likelihoodRatio` oder `probabilityFactor`, nur wenn dafür eine belastbare Quelle angegeben ist.
- `rationale`: warum verändert dieser Faktor die Prätestwahrscheinlichkeit?
- `limitations`: Grenzen der Übertragbarkeit.
- `sources`, `lastReviewed`, `kind`.

Ohne quantifizierten Faktor wird der Modifikator im Rechner nur qualitativ angezeigt. Die Rechnung bleibt dann unverändert, weist aber sichtbar darauf hin, dass die wahre Posttestwahrscheinlichkeit klinisch höher oder niedriger liegen kann.

## Quellenqualität

Bevorzugt sind Leitlinien, systematische Reviews, diagnostische Genauigkeitsstudien und gut beschriebene lokale Daten. Einzelne Expertenschätzungen können als lokale Annahmen dokumentiert werden, müssen aber klar als solche markiert sein.

## Prüfung vor einem Beitrag

```bash
npm run validate:data
npm run test:run
npm run build
```

Die Datenstruktur ist zusätzlich als JSON Schema dokumentiert:

- `schemas/diagnostic-test.schema.json`
- `schemas/evidence-profile.schema.json`
- `schemas/pretest-assumption.schema.json`
- `schemas/clinical-modifier.schema.json`
- `schemas/user-data-export.schema.json`

Ein vollständiges Beispiel für eigene importierbare Daten steht in `examples/user-data-example.json`.

## Medizinischer Hinweis

Dieses Projekt ist als Lehr- und Rechentool angelegt. Beiträge dürfen nicht so formuliert werden, dass die Anwendung eine individuelle Diagnose- oder Therapieentscheidung vorgibt.
