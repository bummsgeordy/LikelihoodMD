# Likelihood-Ratio-Rechner

Deutschsprachiges Lehr- und Rechentool für medizinische Fachpersonen zur Berechnung von Vor- und Nachtestwahrscheinlichkeiten diagnostischer Tests.

## Zweck und Grenzen

Diese Anwendung zeigt, wie Prätestwahrscheinlichkeit, Sensitivität, Spezifität und Likelihood-Ratios die Posttestwahrscheinlichkeit beeinflussen. Sie ist ein edukatives Rechentool und keine alleinige Entscheidungsgrundlage, keine Therapieempfehlung und kein zertifiziertes Medizinprodukt.

Bitte keine Patientendaten eingeben. Eigene Tests und Prätest-Annahmen werden nur lokal im Browser gespeichert und können als JSON exportiert werden.

## Funktionen

- Kuratierte diagnostische Tests mit auswählbaren Evidenzprofilen für unterschiedliche Quellen, Cut-offs oder Populationen.
- Kuratierte Prätest-Annahmen nach Setting und Erkrankung mit grüner Direktdaten- oder oranger Fallback-Markierung.
- Manuelle Prätestwahrscheinlichkeit.
- Klinische Modifikatoren wie Symptome, Zeichen oder Kontextfaktoren: qualitativ sichtbar, rechnerisch nur bei explizit hinterlegtem Faktor/LR und aktiver Übernahme.
- Eigene Tests, Evidenzprofile, Szenarien und Prätest-Annahmen in einem getrennten Verwaltungs-Drawer.
- Datenkatalog im Verwaltungs-Drawer mit tabellarischer Sicht auf Setting, Erkrankung, Prätest-Annahmen, Modifikatoren, Tests, Evidenzprofile, Quellen und Grenzen.
- Szenarien markieren bewusst abweichende Werte mit Begründung, statt kuratierte Quellen still zu überschreiben.
- Lokale Speicherung, JSON-Import und JSON-Export im Schema `schemaVersion: 4`.
- Review- und Qualitätsfelder für Datenpflege: `reviewStatus`, `evidenceQuality` und `dataCompleteness`.
- Kurzbericht zum Kopieren.
- Fagan-ähnliches Nomogramm und Balkendarstellung.

## Entwicklung

```bash
npm install
npm run dev
```

## Lokal per Doppelklick starten

Auf macOS die Datei `Likelihood-Ratio-Rechner starten.command` doppelklicken. Sie baut die App bei Bedarf und öffnet sie lokal unter `http://127.0.0.1:5174/`.

Mehr Details stehen in [LOKAL_STARTEN.md](LOKAL_STARTEN.md).

Build und Prüfungen:

```bash
npm run test:run
npm run validate:data
npm run build
npm run check:pages
```

## Veröffentlichung mit GitHub Pages

Das Projekt ist für GitHub Pages vorbereitet. Nach dem Push in den `main`-Branch baut der Workflow in `.github/workflows/deploy.yml` die statische Vite-App und veröffentlicht `dist/`.

Eine eigene Domain kann später über die GitHub-Pages-Einstellungen ergänzt werden. Dann sollte zusätzlich ein `CNAME` mit der Domain angelegt und die DNS-Konfiguration beim Domainanbieter gesetzt werden.

Eine Schritt-für-Schritt-Anleitung steht in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Daten beitragen

Kuratierte Tests liegen in `src/data/tests.json`, Prätest-Annahmen in `src/data/pretest-assumptions.json`, klinische Modifikatoren in `src/data/clinical-modifiers.json`, klinische Settings in `src/data/clinical-settings.json`. Ein Test beschreibt das diagnostische Verfahren; Sensitivität, Spezifität, LR-Werte, Cut-off, Methode, knappe Durchführung und Quellen stehen in Evidenzprofilen. So können mehrere Studien oder konkurrierende Annahmen zum gleichen Test transparent nebeneinander stehen.

Jede Zahl braucht eine Quelle, eine Begründung, eine Zielpopulation, Grenzen der Übertragbarkeit, ein Datum der letzten Prüfung und konservativ gesetzte Review-/Qualitätsfelder. Eigene lokale Ergänzungen aus dem Drawer bleiben im Browser gespeichert und können als JSON exportiert werden.

Details stehen in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

Maschinenlesbare Schemata liegen in `schemas/`. Ein Beispiel für eigene exportierte Daten liegt in `examples/user-data-example.json`.

Für neue Inhalte können GitHub Issues über die vorbereiteten Templates angelegt werden. Fachliche Prüfregeln stehen in [docs/GOVERNANCE.md](docs/GOVERNANCE.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
