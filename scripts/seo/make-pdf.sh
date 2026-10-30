#!/bin/bash
# Renders the printable standards sheet (written to $TMPDIR by more-pages.mjs during `npm run build`) to the public PDF.
# Run locally after a data change, then rebuild so the guide links it. Vercel has no Chrome, so the PDF is committed.
set -e
cd "$(dirname "$0")/../.."
SRC="${TMPDIR:-/tmp}/pr-standards-print.html"
[ -f "$SRC" ] || SRC="$(node -e 'console.log(require("os").tmpdir())')/pr-standards-print.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="public/track-and-field-recruiting-standards-2026.pdf" "file://$SRC" 2>/dev/null
ls -l public/track-and-field-recruiting-standards-2026.pdf
