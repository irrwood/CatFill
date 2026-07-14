#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/manifest.json').version")"
OUTPUT="$ROOT/dist/CatFill-$VERSION.zip"

rm -f "$OUTPUT"
cd "$ROOT"
zip -qr "$OUTPUT" \
  manifest.json background.js content.js companyDetector.js fieldOrganizer.js i18n.js \
  popup.html popup.css popup.js sidepanel.html sidepanel.css sidepanel.js \
  assets icons vendor _locales LICENSE THIRD_PARTY_NOTICES.md PRIVACY.md

printf 'Created %s\n' "$OUTPUT"
