# Likelihood-Ratio-Rechner

Deutschsprachiges Lehr- und Rechentool für medizinische Fachpersonen zur Berechnung von Vor- und Nachtestwahrscheinlichkeiten diagnostischer Tests.

## Zweck und Grenzen

Diese Anwendung zeigt, wie Prätestwahrscheinlichkeit, Sensitivität, Spezifität und Likelihood-Ratios die Posttestwahrscheinlichkeit beeinflussen. Sie ist ein edukatives Rechentool und keine alleinige Entscheidungsgrundlage, keine Therapieempfehlung und kein zertifiziertes Medizinprodukt.

Bitte keine Patientendaten eingeben. Eigene Tests und Prätest-Annahmen werden nur lokal im Browser gespeichert und können als JSON exportiert werden.

## Diagnostischer Hintergrund

Das Projekt basiert auf dem Prinzip, dass diagnostische Tests Wahrscheinlichkeiten verändern, aber Diagnosen nicht isoliert beweisen oder ausschließen. Die zentrale Grundlage ist die Vierfeldertafel:

| | Krankheit vorhanden | Krankheit nicht vorhanden | Aussage |
|---|---:|---:|---|
| **Test positiv** | TP = richtig positiv | FP = falsch positiv | **PPV** = TP / (TP + FP) |
| **Test negativ** | FN = falsch negativ | TN = richtig negativ | **NPV** = TN / (FN + TN) |
| **Testgüte** | **Sensitivität** = TP / (TP + FN) | **Spezifität** = TN / (FP + TN) | **Prävalenz** = (TP + FN) / alle |

Sensitivität und Spezifität beschreiben den Test. PPV und NPV beschreiben die Bedeutung des Testergebnisses in einer konkreten Population und hängen daher stark von Prävalenz beziehungsweise Prätestwahrscheinlichkeit ab.

Likelihood Ratios verbinden Testgüte und Prätestwahrscheinlichkeit:

    LR+ = Sensitivität / (1 − Spezifität)
    LR− = (1 − Sensitivität) / Spezifität

Das Tool soll helfen, diese Zusammenhänge sichtbar zu machen. Ziel ist nicht die automatische Diagnose, sondern eine transparentere, rationalere und weniger biasanfällige diagnostische Entscheidungsfindung. Eine ausführlichere Erklärung steht auf der Info-Seite [Diagnostische Kennzahlen verstehen](public/info/vierfeldertafel/index.html); veröffentlicht ist sie unter [GitHub Pages](https://bummsgeordy.github.io/LikelihoodMD/info/vierfeldertafel/).

## Funktionen

- Kuratierte diagnostische Tests mit auswählbaren Evidenzprofilen für unterschiedliche Quellen, Cut-offs oder Populationen.
- Umschalter zwischen diagnostischen Tests und körperlicher Untersuchung.
- Körperliche Untersuchungsbefunde nach McGee, *Evidence-Based Physical Diagnosis*: priorisierte Akut-/Innere- und endokrinologie-nahe Befunde mit LR+, LR−, 95%-KI, Prätestbereich und Reviewstatus.
- Vordefinierte Diagnostikketten, die Nachtestwahrscheinlichkeiten einer Stufe als Prätestwahrscheinlichkeit der nächsten Stufe nutzen.
- Kuratierte Prätest-Annahmen nach Setting und Erkrankung mit grüner Direktdaten- oder oranger Fallback-Markierung.
- Manuelle Prätestwahrscheinlichkeit.
- Klinische Modifikatoren wie Symptome, Zeichen oder Kontextfaktoren: qualitativ sichtbar, rechnerisch nur bei explizit hinterlegtem Faktor/LR und aktiver Übernahme.
- Eigene Tests, Evidenzprofile, Szenarien und Prätest-Annahmen in einem getrennten Verwaltungs-Drawer.
- Datenkatalog im Verwaltungs-Drawer mit tabellarischer Sicht auf Setting, Erkrankung, Prätest-Annahmen, Modifikatoren, Tests, Evidenzprofile, Quellen und Grenzen.
- Szenarien markieren bewusst abweichende Werte mit Begründung, statt kuratierte Quellen still zu überschreiben.
- Lokale Speicherung, JSON-Import und JSON-Export im Schema `schemaVersion: 5`.
- Installierbare PWA: Nach dem ersten vollständigen Laden kann die GitHub-Pages-Version auf iPhone/iPad offline genutzt werden.
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

## Offline auf iPhone und iPad

Die veröffentlichte GitHub-Pages-Version ist als PWA vorbereitet. Für die Offline-Nutzung auf iPhone/iPad:

1. In Safari `https://bummsgeordy.github.io/LikelihoodMD/` öffnen.
2. Einmal vollständig laden lassen.
3. Teilen-Symbol antippen.
4. **Zum Home-Bildschirm** wählen.
5. Die App danach über das Home-Screen-Symbol starten.

Nach diesem Erstaufruf sind App, kuratierte Daten und Info-Seite offline verfügbar. Updates werden beim nächsten Online-Besuch automatisch in den Cache übernommen. Eigene Daten bleiben lokal im Browser-/App-Speicher des Geräts.

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

Körperliche Untersuchungsbefunde liegen in `src/data/physical-findings.json`, gruppiert über `src/data/physical-systems.json` und `src/data/physical-conditions.json`. Die Werte basieren auf McGee, *Evidence-Based Physical Diagnosis*, und sind als knappe, deutsch beschriftete Fakteneinträge kuratiert. Der Umfang ist in [docs/mcgee-data-overview.md](docs/mcgee-data-overview.md) dokumentiert. Öffentliche Daten sind bewusst knapp transformiert und nicht als Kopie der Originaltabellen angelegt.

Jede Zahl braucht eine Quelle, eine Begründung, eine Zielpopulation, Grenzen der Übertragbarkeit, ein Datum der letzten Prüfung und konservativ gesetzte Review-/Qualitätsfelder. Eigene lokale Ergänzungen aus dem Drawer bleiben im Browser gespeichert und können als JSON exportiert werden.

Details stehen in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

Maschinenlesbare Schemata liegen in `schemas/`. Ein Beispiel für eigene exportierte Daten liegt in `examples/user-data-example.json`.

Für neue Inhalte können GitHub Issues über die vorbereiteten Templates angelegt werden. Fachliche Prüfregeln stehen in [docs/GOVERNANCE.md](docs/GOVERNANCE.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
