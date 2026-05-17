#!/bin/zsh
set -e

APP_DIR="${0:A:h}"
PORT="${LIKELIHOOD_RATIO_PORT:-5174}"

cd "$APP_DIR"

show_error() {
  /usr/bin/osascript -e "display dialog \"$1\" buttons {\"OK\"} default button \"OK\" with icon caution" >/dev/null 2>&1 || true
  echo "$1"
}

if ! command -v python3 >/dev/null 2>&1; then
  show_error "Python 3 wurde nicht gefunden. Bitte installiere Python 3 oder starte die App mit npm run dev."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  show_error "npm wurde nicht gefunden. Bitte Node.js/npm installieren oder die App mit vorhandener dist-Version per Python starten."
  exit 1
fi

echo "Aktualisiere die lokale Version..."
if [ ! -d "$APP_DIR/node_modules" ]; then
  npm install
fi
npm run build

CACHE_BUSTER="$(date +%s)"
APP_URL="http://127.0.0.1:$PORT/?v=$CACHE_BUSTER"

if /usr/sbin/lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Lokaler Server läuft bereits auf Port $PORT."
  open "$APP_URL"
  exit 0
else
  echo "Starte lokalen Server auf http://127.0.0.1:$PORT/"
fi

(sleep 1; open "$APP_URL") &

echo ""
echo "Likelihood-Ratio-Rechner läuft lokal:"
echo "http://127.0.0.1:$PORT/"
echo ""
echo "Dieses Terminalfenster offen lassen, solange du die App benutzt."
echo "Zum Beenden: Ctrl-C drücken oder dieses Fenster schließen."
echo ""

cd "$APP_DIR/dist"
python3 -m http.server "$PORT" --bind 127.0.0.1
