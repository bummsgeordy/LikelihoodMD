# Changelog

## Unreleased

### Schema v6 / Stabilisierungsrelease

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
