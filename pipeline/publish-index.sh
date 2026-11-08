#!/usr/bin/env bash
# Rebuild the picker's city list from uploaded regions and publish it to R2
# (served at GET /regions/index.json; the app refreshes it daily).
set -euo pipefail
cd "$(dirname "$0")"
npx tsx build-index.ts
cd "$(mktemp -d)"
npx --yes wrangler r2 object put coinline-data/index/regions.json \
  --file "$OLDPWD/out/regions-index.json" --content-type application/json --remote >/dev/null
echo "published"
