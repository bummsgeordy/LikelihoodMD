# Veröffentlichung und Datenpflege

## Zielbild

Die GitHub-Pages-Version ist eine statische Kopie der App mit den kuratierten Daten aus dem Repository. Besucher können die App nutzen, eigene Daten lokal im Browser speichern und JSON exportieren. Sie können aber die öffentliche Datenbasis nicht verändern, weil es kein Backend, keine Online-Datenbank und keinen Schreibzugriff aus der Webseite heraus gibt.

Kuratierte Daten werden ausschließlich durch Änderungen im Repository gepflegt:

- `src/data/conditions.json`
- `src/data/tests.json`
- `src/data/pretest-assumptions.json`
- `src/data/clinical-modifiers.json`
- `src/data/clinical-settings.json`
- `src/data/diagnostic-chains.json`
- `src/data/condition-guidance.json`
- `src/data/physical-*.json`

## Einmalig auf GitHub veröffentlichen

1. Auf GitHub ein neues öffentliches Repository anlegen, z. B. `likelihood-ratio-rechner`.
2. Lokal im Projektordner den Remote setzen:

   ```bash
   git remote add origin https://github.com/DEIN-NAME/likelihood-ratio-rechner.git
   ```

3. Dateien committen und pushen:

   ```bash
   git add .
   git commit -m "Initial public likelihood ratio calculator"
   git branch -M main
   git push -u origin main
   ```

4. In GitHub unter `Settings -> Pages` als Quelle `GitHub Actions` auswählen.
5. Der Workflow `.github/workflows/deploy.yml` baut automatisch und veröffentlicht die App.
6. Der Live-Link steht nach erfolgreichem Lauf unter `Settings -> Pages`.

## Updates veröffentlichen

Nach einer Änderung an Daten oder Code:

```bash
npm run validate:data
npm run test:run
npm run audit:evidence
npm run build
npm run check:pages
npm run check:bundle
npm run smoke:test
npm run test:e2e
git add .
git commit -m "Update curated diagnostic data"
git push
```

Der Push auf `main` startet automatisch den GitHub-Pages-Deploy.

## Empfehlungen von außen einbinden

Empfohlenes Vorgehen ohne Backend:

1. Externe Nutzer öffnen den Datenkatalog in der App.
2. Sie wählen den passenden Eintrag und nutzen `JSON-Vorschlag`.
3. Sie senden dir die JSON-Datei per E-Mail, GitHub Issue oder Pull Request.
4. Du importierst die Datei lokal im Drawer oder übernimmst die Daten manuell in die kuratierten JSON-Dateien.
5. Vor Veröffentlichung immer prüfen:

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

6. Erst danach committen und pushen.

Damit bleiben öffentliche Daten unter deiner Kontrolle. Online-Nutzer können nur ihre lokale Browserkopie ändern; andere Besucher sehen weiterhin die kuratierten Repository-Daten.

## Empfohlene Repository-Einstellungen

- `Settings -> Pages`: Quelle `GitHub Actions`.
- `Settings -> Branches`: Branch Protection für `main` aktivieren.
- Pull Requests nur mergen, wenn Validierung, Tests, Build, Pages-Check und Smoke-Test grün sind.
- Externe Vorschläge bevorzugt über Issue-Templates oder JSON-Vorschläge sammeln.
- `reviewed` erst setzen, wenn du den medizinischen Inhalt fachlich geprüft hast.

## Direkte Beiträge über GitHub

Für strukturierte Vorschläge können externe Beitragende auch einen Pull Request erstellen. Medizinische Beiträge sollten mindestens enthalten:

- betroffene Erkrankung und Setting
- Quelle mit URL/DOI/PubMed-Link
- Population
- Sensitivität/Spezifität oder LR-Werte
- Cut-off und Methode
- Begründung und Grenzen der Übertragbarkeit
- Datum der letzten Prüfung

Die fachlichen Anforderungen stehen in `docs/CONTRIBUTING.md`.
