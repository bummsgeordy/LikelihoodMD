# Lokal starten

Die Datei `index.html` im Projektordner ist die Entwicklungs-Einstiegsdatei der Vite-App und ist nicht für den direkten Doppelklick gedacht.

Auf macOS kannst du stattdessen doppelklicken:

```text
Likelihood-Ratio-Rechner starten.command
```

Der Starter macht automatisch:

1. Falls nötig: `npm install`
2. Falls nötig: `npm run build`
3. Start eines lokalen Servers für `dist/`
4. Öffnen der App unter `http://127.0.0.1:5174/`

Das Terminalfenster muss offen bleiben, solange du die App nutzt. Zum Beenden `Ctrl-C` drücken oder das Fenster schließen.

Alternativ im Terminal:

```bash
npm install
npm run build
python3 -m http.server 5174 --bind 127.0.0.1 --directory dist
```

Danach im Browser öffnen:

```text
http://127.0.0.1:5174/
```

## iPhone/iPad offline nutzen

Die GitHub-Pages-Version kann als PWA auf iPhone und iPad installiert werden:

1. In Safari `https://bummsgeordy.github.io/LikelihoodMD/` öffnen.
2. Warten, bis die Seite vollständig geladen ist.
3. Teilen-Symbol antippen.
4. **Zum Home-Bildschirm** auswählen.
5. Die App danach über das neue Home-Screen-Symbol öffnen.

Danach ist die App ohne Internet nutzbar. Für Aktualisierungen die App bei bestehender Internetverbindung erneut öffnen; der Offline-Cache wird dann aktualisiert.

Hinweis: Eine erstmalige Installation ganz ohne Internet ist damit nicht möglich. Dafür müsste das Projekt separat als Dateienpaket oder native iOS-App verteilt werden.
