# LikelihoodMD

Deutschsprachiges Lehr- und Rechentool für medizinisches Fachpersonal: [likelihood.engert.me](https://likelihood.engert.me)

## Idee

Ein Testergebnis ist nie einfach positiv oder negativ. Seine Bedeutung hängt davon ab, wie wahrscheinlich die Erkrankung vor dem Test war. LikelihoodMD zeigt deshalb Prätestwahrscheinlichkeit, Testgüte beziehungsweise Likelihood Ratios und daraus die Posttestwahrscheinlichkeit visuell an.

Das ist besonders hilfreich bei typischen Praxisfallen: Seltene Erkrankungen werden bei niedriger Ausgangswahrscheinlichkeit trotz positivem Test oft überschätzt. Umgekehrt kann ein negativer Test bei hoher Ausgangswahrscheinlichkeit nicht ausreichend beruhigen.

Grob benutzen:

1. Klinisches Setting oder manuelle Prätestwahrscheinlichkeit wählen.
2. Diagnostischen Test oder körperlichen Befund auswählen.
3. Posttestwahrscheinlichkeit, Nomogramm und 1000er-Veranschaulichung prüfen.

LikelihoodMD ist kein Diagnose- oder Therapieautomat. Es ist ein Denk- und Lehrtool, das Tests, Befunde und klinische Einschätzung transparenter kalibrieren soll.

## Funktionen

- Diagnostische Tests mit Evidenzprofilen für unterschiedliche Quellen, Cut-offs, Methoden und Populationen.
- Körperliche Untersuchungsbefunde nach McGee, *Evidence-Based Physical Diagnosis*, 6. Auflage, als deutschsprachig aufbereitete Arbeitsfassung. Alle Einträge bleiben bis zur fachlichen und sprachlichen Einzelprüfung `needs-review`.
- Setting-basierte Prätestannahmen, plausible Spannweiten, Qualitätslabel und Quellen.
- Klinische Modifikatoren sowie profilbezogene Präanalytik- und Medikamentenwarnungen.
- Bedingte Diagnostikketten mit Fortsetzungs- und Stopppfaden.
- Getrennte Darstellung von Bayes-Berechnung, kategorischer Risikoklassifikation und klinischem Workflow.
- Nomogramme, Balkendarstellung und 1000er-Erklärung zur Reduktion von Base-Rate-Neglect.
- Datenkatalog und lokaler Verwaltungs-Drawer für eigene Tests, Annahmen, Szenarien und JSON-Import/-Export.
- Unterseiten für [diagnostische Kennzahlen](public/info/vierfeldertafel/index.html), [CKD-Risiko nach eGFR/Albuminurie](public/info/ckd-risiko/index.html) und [interaktive Simulation](public/simulation/index.html).
- GitHub-Pages- und PWA-fähiger statischer Build ohne Backend und ohne Online-Datenbank.

Eigene Daten bleiben lokal im Browser gespeichert. Online-Nutzer können die kuratierte öffentliche Datenbasis nicht verändern.

## Datenmodell

Kuratierte Daten liegen in `src/data/`:

- `conditions.json`: zentrale Krankheitsbilder.
- `tests.json`: diagnostische Tests und Evidenzprofile.
- `pretest-assumptions.json`: Setting- und Fallback-Prätestannahmen.
- `clinical-modifiers.json`: Symptome, Zeichen, Anamnese- und Kontextfaktoren.
- `diagnostic-chains.json`: vordefinierte sequentielle Testpfade.
- `condition-guidance.json`: krankheitsspezifische Kurzinfos und Links.
- `physical-*.json`: körperliche Untersuchung nach System, Krankheitsbild und Befund.

`pretest-assumptions.json` ist die einzige kanonische Prätestbasis. Präanalytik und Medikamente gehören an das jeweilige Evidenzprofil. Nicht quantifizierbare Verfahren erhalten keine künstlichen LR-Werte, sondern werden als Kategorie oder Workflow dargestellt.

Jede kuratierte Zahl soll Quelle, Population, Begründung, Grenzen, Reviewstatus, Evidenzqualität und Datum der letzten Prüfung enthalten. Unsichere Daten bleiben als `needs-review`, `expert-opinion`, `partial` oder `minimal` sichtbar. Der vollständige Profilstand steht im [Evidenz-Audit](docs/EVIDENCE_AUDIT.md).

## Entwicklung

Die CI verwendet Node.js 22; `.nvmrc` hält lokale Browser- und Buildtests auf derselben unterstützten Version.

```bash
npm install
npm run dev
```

Lokaler Produktionsbuild:

```bash
npm run validate:data
npm run test:run
npm run audit:evidence
npm run build
npm run check:pages
npm run check:bundle
npm run smoke:test
npm run test:e2e
```

Auf macOS kann alternativ `Likelihood-Ratio-Rechner starten.command` doppelt geklickt werden. Details stehen in [LOKAL_STARTEN.md](LOKAL_STARTEN.md).

## Veröffentlichung

Der GitHub-Workflow `.github/workflows/deploy.yml` prüft Daten, Abhängigkeiten, Unit- und Browsertests, Evidenz-Audit, Build, Bundlebudget und Pages-Referenzen. Danach veröffentlicht er `dist/` über GitHub Pages.

Empfohlener Ablauf vor dem Push:

```bash
npm run validate:data
npm run test:run
npm run audit:evidence
npm run build
npm run check:pages
npm run check:bundle
npm run smoke:test
npm run test:e2e
git status
```

Mehr dazu steht in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Beiträge

Korrekturen und Ergänzungen sind willkommen, brauchen aber belastbare Quellen und klare Grenzen der Übertragbarkeit. Gute Beiträge nennen mindestens:

- Erkrankung, Setting und Zielpopulation.
- Test, Methode, Cut-off und intended use.
- Sensitivität/Spezifität oder LR-Werte, falls vorhanden.
- Präanalytik, Interferenzen und typische Fehlinterpretationen.
- Quelle mit URL, DOI oder PubMed-Link.

Externe Vorschläge können über GitHub Issues, Pull Requests oder JSON-Export aus der App eingereicht werden. Fachliche Regeln stehen in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) und [docs/GOVERNANCE.md](docs/GOVERNANCE.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
