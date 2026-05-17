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
