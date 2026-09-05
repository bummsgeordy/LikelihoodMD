# Changelog

## Unreleased

### Nomogramm-Regression behoben

- Berechenbare Tests zeigen wieder unmittelbar beide Nomogramme und Posttestwerte. Fehlende klinische Prävalenzdaten sind von einem ausdrücklich als Lehrbeispiel markierten Rechenstart von 5 % getrennt.
- Alte leere Startzustände werden repariert; gültige eigene Eingaben bleiben erhalten. Bewusst geleerte oder ungültige Eingaben zeigen einen direkten Hinweis statt großer leerer Diagrammflächen.
- Slider, Zahlenfeld, Bericht und Beispielkennzeichnung bleiben konsistent. Keine Änderung der medizinischen Testgüte oder Prävalenzdaten.

### Schema v7 / Praxis und Lehre

- Zwölf strukturierte Praxisfragen, sechs neue Themen und getrennte Befundkonstellationen ergänzt.
- Seltene Wahrscheinlichkeiten ohne 0,1-%-Untergrenze; ungültige und fehlende Werte werden nicht berechnet. Herkunft, Quellenprüfung und menschliche Freigabe getrennt.
- Calcitonin-Ersatzwerte, EU-TIRADS-Mittelpunkte, pauschale FNA-Dichotomisierung und unbelegte numerische Ketten zurückgezogen. Akromegalie, Steroidachse, MACS, PA, Herzinsuffizienz und Zöliakie korrigiert; Belege im Praxis-Review.
- CKD-Sammel-HR durch exakt zugeordnete endpunktspezifische Werte ersetzt.
- Hauptrechner und Simulation teilen Bayes-/Nomogrammlogik und Evidenzprofile. Häufigkeitsbaum, zwei Szenarien, Vortragsfälle und Druckansicht ergänzt.
- Quellen und ausführliche Guidance kompakter ausklappbar; Zustände bleiben bei Eingabeänderungen erhalten.
- Import-/Speicherprüfungen, v1–v6-Migration, revisionsbasierter Offline-Cache und WebKit-Regressionen ergänzt. Kontext- und Untersuchungsdaten werden getrennt geladen.
- PostCSS und Nanoid in der Build-Werkzeugkette aktualisiert. Audit wird beim Release erneut ausgeführt, nicht als dauerhafte Sicherheitsgarantie verstanden.

### Schema v6 / Stabilisierungsrelease

- PA-Daten mit dem Nature Reviews Disease Primer 2026 abgeglichen: breiter Screeningkontext, assay-spezifische ARR-Orientierungsgrenzen, Wiederholungsmessung bei hoher Prätestwahrscheinlichkeit, selektive Suppressionstests und probabilistische Subtypisierung ergänzt.
- Sicherheitsupdate für Playwright 1.61, Vite 8 und Vitest 4; der CI-Abhängigkeitsaudit meldet keine bekannten Schwachstellen mehr. GitHub-Actions wurden auf ihre Node-24-kompatiblen Hauptversionen aktualisiert.
- Berechnungsmodi `binary-lr`, `categorical` und `workflow-only` eingeführt; nicht quantifizierbare Verfahren erzeugen keine künstlichen LR- oder Posttestwerte mehr.
- Exportformat auf Schema v6 angehoben; v1-v5 bleiben importierbar. Importgröße, Eintragszahl und Textlängen werden begrenzt.
- Prätestdaten auf `pretest-assumptions.json` als einzige kanonische Struktur zusammengeführt.
- Diagnostikketten auf bedingte Fortsetzungen und Stopppfade umgestellt; negatives D-Dimer wird im geeigneten Standardpfad nicht mehr zu CTPA/Ultraschall weitergerechnet.
- Troponin aus dem stabilen KHK-Kontext in „Akutes Koronarsyndrom / Myokardschaden“ verschoben.
- Allgemeines ARR-Profil und 48-h-DST wegen fehlender universell übertragbarer LR als Workflow markiert; methodenspezifisches direktes-Renin-Profil bleibt berechenbar.
- Calcitonin-LR− 0 entfernt und Unsicherheit sichtbar gemacht.
- 1000er-Veranschaulichung nutzt nur direkt hinterlegte Sensitivität/Spezifität.
- Englische Originalspalten aus den öffentlichen McGee-Daten entfernt; die deutschsprachig aufbereitete Arbeitsfassung bleibt bis zum fachlichen und sprachlichen Einzelreview `needs-review`. 99 starke Rule-in-, 51 starke Rule-out- und 94 fehlende LR−-Befunde sind als prioritäre Auditgruppen festgeschrieben.
- Untersuchungsbefunde, Guidance und Diagnostikketten werden bedarfsgeladen; Produktions-Sourcemaps entfernt und Initialbundle auf unter 120 kB gzip begrenzt.
- Echte Chromium-Tests, Bundlebudget, npm-Audit, Dependabot und reproduzierbarer Evidenz-Audit ergänzt.

- Diagnostikketten als neue kuratierte Datenebene ergänzt.
- Krankheitsbilder in `conditions.json` zentralisiert.
- Datenmodell auf Schema v5 vorbereitet.
- Internistische Krankheitsbilder und Testprofile für CKD, Glomerulonephritis, KHK, renale Arterienstenose, PHPT und Schilddrüsenknoten ergänzt.
- README und GitHub-Dokumentation an den aktuellen Projektstand angepasst.
- Evidenzprofile um intended use, Präanalytikrisiko, Anwendbarkeitswarnung und Reviewpriorität erweitert.
- Klinische Modifikatoren um Risikostratum und Mapping auf Prätest-Annahmen erweitert, damit Doppelzählung sichtbarer wird.
- Datenkatalog um Vollbildmodus, gespeicherte Filter und lokale Review-Markierungen erweitert.
- GitHub-Prozess um Issue-Templates für Quellenkorrekturen und Reviewanfragen ergänzt.
- Statischen Smoke-Test für GitHub-Pages-Build ergänzt.
