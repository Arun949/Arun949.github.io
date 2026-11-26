#!/usr/bin/env bash
# Regenerates assets/Arunkumar_Aluru_CV.pdf from cv.html (run after editing the CV).
# Usage: scripts/build-cv-pdf.sh   (needs Google Chrome; serves the site locally on a free port)
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=${PORT:-8799}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
for page in cv:assets/Arunkumar_Aluru_CV.pdf fr/cv:assets/Arunkumar_Aluru_CV_FR.pdf; do
  src="${page%%:*}"; out="${page#*:}"
  [ -f "$src.html" ] || continue
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=5000 \
    --print-to-pdf="$out" "http://localhost:$PORT/$src.html" >/dev/null 2>&1
  echo "wrote $out"
done
