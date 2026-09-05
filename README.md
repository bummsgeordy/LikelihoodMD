# LikelihoodMD

[LikelihoodMD öffnen](https://likelihood.engert.me) · Deutschsprachiges Praxisnachschlage- und Lehrwerkzeug für medizinisches Fachpersonal.

## Die Idee

Ein Testergebnis ist nicht einfach „positiv oder negativ“. Seine Bedeutung hängt davon ab, wie wahrscheinlich die Erkrankung zuvor war, ob der Test zur klinischen Frage passt und unter welchen Bedingungen er durchgeführt wurde.

LikelihoodMD verbindet diese Fragen mit einer visuellen Bayes-Berechnung. Ein positiver Test bei einer seltenen Erkrankung kann häufig falsch positiv sein; ein negativer Test bei hoher Ausgangswahrscheinlichkeit muss nicht ausreichend beruhigen. Die anschließende Entscheidung hängt außerdem von Folgen, Belastung, Alternativen und Patientenpräferenzen ab.

## Benutzung

1. Klinische Frage oder Erkrankung und Anlass wählen.
2. Indikation, Voraussetzungen und passende Tests prüfen.
3. Population, Quelle und Startannahme prüfen; die Prätestwahrscheinlichkeit bei Bedarf selbst anpassen.
4. Positive und negative Ergebnisse, Unsicherheit und mögliche nächste Klärung vergleichen.

Die App zeigt beide Testergebnisse gleichzeitig. Kategorische Befunde und klinische Abläufe bleiben ohne künstliche Posttestzahl. Unklare oder nicht verwertbare Befunde haben eigene Hinweise.

## Ansichten

- **Praxis:** zwölf strukturierte Fragestellungen mit Indikation, Voraussetzungen, Befundkonstellationen und Quellen. Neue Themen sind Schilddrüsenfunktion, Hyperprolaktinämie, männlicher Hypogonadismus, Osteoporose, Hyperandrogenismus/Zyklusstörungen und Glukose/HbA1c.
- **Rechner:** passende Evidenzprofile, Nomogramme, Prätestherkunft und ausklappbare Interferenzhinweise. Seltene Wahrscheinlichkeiten wie 0,006 % bleiben rechnerisch erhalten.
- **Körperliche Untersuchung:** 732 deutschsprachig aufbereitete Befunde nach McGee, *Evidence-Based Physical Diagnosis*, 6. Auflage. Das Buch liefert den unverzichtbaren Untersuchungs- und Interpretationskontext. Die Arbeitsfassung ersetzt es nicht; fachlicher, sprachlicher und urheberrechtlicher Einzelreview bleiben offen.
- **Simulation / Vortrag:** gemeinsame Rechenlogik und Katalogprofile, zwei Vergleichsszenarien, Häufigkeitsbäume, sechs schrittweise aufdeckbare Fallfragen und Druckansicht.
- **Hintergrund:** diagnostische Kennzahlen und Einordnung der Prätestwahrscheinlichkeit.
- **CKD-Risiko:** qualitative KDIGO-Klassifikation und belegte, endpunktspezifische Hazard Ratios. Prognostische HR sind keine diagnostischen LR.
- **Administration:** filterbarer Datenkatalog mit 50 Einträgen je Seite, lokale Ergänzungen und JSON-Import/-Export.

## Was die Zahlen bedeuten

Für alle 24 Krankheitsbilder stehen insgesamt 66 quellenbezogene Prätestannahmen bereit. Der Rechner übernimmt die passende Startannahme; Quelle und Zielpopulation bleiben sichtbar. Spezifische Kontexte wie MACS, Steroidexposition oder TVT/LE-Risikostufen haben eigene Einträge. Fehlen Daten für eine Fachabteilung, wird eine allgemeine Referenz derselben Erkrankung mit entsprechendem Hinweis verwendet, keine vermeintlich gemessene lokale Prävalenz.

**Studienwerte und Arbeitsannahmen sind nicht dasselbe.** Beobachtete Häufigkeiten, übertragene Kohorten, gerundete Referenzwerte und nicht validierte Arbeitsannahmen sind getrennt gekennzeichnet. Bei einer Arbeitsannahme begründen Quellen den klinischen Kontext, nicht zwingend die gewählte Prozentzahl. Deren Auswahl ist eigens erläutert. Studienintervalle, Unterschiede zwischen Studien und hypothetische Szenariospannen bleiben unterscheidbar; eine Spanne liefert nicht automatisch einen Mittelpunkt.

Eigene Eingaben bleiben erhalten. Ohne anwendbare Startannahme steht ein separat markiertes Lehrbeispiel von 5 % bereit; bewusst geleerte oder ungültige Eingaben werden nicht berechnet. EU-TIRADS 1/2 eröffnen keine FNA-Rechnung. Die körperliche Untersuchung behält ihre manuelle Prätesteingabe.

Quellenprüfung (`sourceCheck`) und menschliche Freigabe (`reviewStatus`) sind getrennt. Eine recherchierte Fundstelle macht einen Eintrag nicht automatisch klinisch übertragbar oder freigegeben. Einschränkungen stehen am Ergebnis und im [Evidenz-Audit](docs/EVIDENCE_AUDIT.md).

Häufigkeitsbäume verwenden nur direkt hinterlegte Sensitivität und Spezifität. LR-Werte werden nicht rückwärts in scheinexakte Testgüte umgerechnet. Kombinierte Extremwerte ergeben eine **Szenariospanne**, kein gemeinsames 95-%-Konfidenzintervall. Die derzeitigen Diagnostikketten sind klinische Abläufe ohne numerische LR-Verkettung.

## Zweck und Grenzen

Ziel ist die Schulung analytischen Denkens in der erwachsenen ambulanten Versorgung, nicht eine automatische Diagnose, Therapie oder vollständige Laborinterpretation. Weniger Untersuchungen sind nicht grundsätzlich besser. Eine Verbesserung realer Patientenversorgung ist durch die App nicht nachgewiesen.

Keine Patientenakte, kein Login, kein Backend und kein Tracking. Eigene Ergänzungen bleiben im jeweiligen Browser; Webseitenbesucher verändern die öffentliche Datenbasis nicht. Externe Quellen brauchen Internet. Vor patientenbezogener Entscheidungsunterstützung muss die konkrete Zweckbestimmung fachlich und regulatorisch geprüft werden; ein Disclaimer allein genügt nicht.

[Medizinische Änderungen und offene Prüfungen](docs/PRACTICE_REVIEW.md) · [Fachliche Regeln](docs/GOVERNANCE.md)

## Lokal starten

Node.js 22 verwenden (`.nvmrc`):

```bash
npm ci
npm run dev
```

Die Simulation liegt unter `/simulation/`. Für einen Produktions- oder Offline-Test:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

Auf iPhone/iPad einmal online in Safari vollständig laden und über **Teilen → Zum Home-Bildschirm** installieren. Der Offline-Cache enthält auch Unterseiten und Untersuchungsbefunde. Gerätespeicher kann vom Browser gelöscht werden; eigene Daten regelmäßig exportieren. Weitere Hinweise: [Lokal starten](LOKAL_STARTEN.md).

## Daten und Entwicklung

Kuratierte Daten liegen in `src/data/`: Erkrankungen, Settings, Tests, Prätestannahmen, Evidenzlücken, Modifikatoren, Diagnostikketten, Guidance, Praxisfragen und Untersuchungsbefunde. `pretest-assumptions.json` ist die einzige kanonische Prätestbasis; `probability: null` bedeutet **kein belastbarer Punktwert**, nicht null Prozent.

Exportformat **v7**; v1–v6 bleiben importierbar. Optionale Angaben zu Startwertbegründung, Spannenart und Testzuordnung ergänzen v7, ohne ältere eigene Einträge ungültig zu machen. Bestehende IDs und lokale Profile werden erhalten. Die private Mac-App gehört nicht zu diesem Repository und wurde nicht angepasst; ihre v7-Kompatibilität ist separat zu prüfen.

Importe ergänzen vorhandene eigene Daten. Änderungen an derselben ID benötigen eine Bestätigung; kuratierte Einträge werden nicht überschrieben.

Die Prüfungen vor einer Veröffentlichung:

```bash
npx playwright install chromium webkit
npm run validate:data
npm run test:run
npm run audit:evidence
npm run build
npm run check:pages
npm run check:bundle
npm run smoke:test
npm run test:e2e
npm audit --audit-level=high
```

Der Bundlecheck begrenzt den statischen JavaScript-Einstiegsgraphen je Seite auf 600 kB beziehungsweise 120 kB gzip. Nachgeladene Kontextdaten und die vollständige Offline-Vorhaltung sind zusätzlich zu berücksichtigen. Produktions-Sourcemaps werden nicht veröffentlicht.

[Veröffentlichung mit GitHub Desktop](docs/PUBLISHING.md) · [Datenbeiträge](docs/CONTRIBUTING.md)

## Lizenz

Projektcode: [MIT](LICENSE). Rechte an zitierten Quellen und am McGee-Buch verbleiben bei ihren Rechteinhabern. Die Code-Lizenz ersetzt keine Prüfung der Weiterverwendung von Quelleninhalten.
