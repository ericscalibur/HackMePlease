#!/bin/bash
# GHOST//NET launcher — serves the grid on a local web server so every
# challenge (cookies, storage, robots.txt, iframes) behaves like a real site.
# Double-click this file in Finder to play.

cd "$(dirname "$0")" || exit 1
PORT=8049

# pick python3 if available, else python
if command -v python3 >/dev/null 2>&1; then PY=python3; else PY=python; fi

URL="http://localhost:$PORT/index.html"
echo "==============================================="
echo "  GHOST//NET — Resistance Training Grid"
echo "  Serving at: $URL"
echo "  Leave this window open while you play."
echo "  Press Ctrl+C here to stop the server."
echo "==============================================="

# open the browser shortly after the server starts
( sleep 1; open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null ) &

exec "$PY" -m http.server "$PORT"
