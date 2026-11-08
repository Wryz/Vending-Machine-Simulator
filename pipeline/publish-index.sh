#!/usr/bin/env bash
# Rebuild the picker's city list from uploaded regions and publish it to R2
# (served at GET /regions/index.json; the app refreshes it daily).
set -euo pipefail
cd "$(dirname "$0")"
npx tsx build-index.ts
# Never shrink the live list by mistake (missing out/regions-uploaded.txt,
# a cleaned out/, a smaller list-regions run): players would lose cities.
new=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("out/regions-index.json","utf8")).length)')
live=$(curl -fsS https://coinline-data-api.myphungquoc.workers.dev/regions/index.json 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).length)}catch{console.log(0)}})' || echo 0)
if [ "$new" -lt 1 ] || { [ "$live" -gt 0 ] && [ "$new" -lt "$live" ] && [ "${FORCE_SMALLER:-}" != "1" ]; }; then
  echo "refusing to publish $new cities over the live $live (set FORCE_SMALLER=1 to override)" >&2
  exit 1
fi
cd "$(mktemp -d)"
npx --yes wrangler r2 object put coinline-data/index/regions.json \
  --file "$OLDPWD/out/regions-index.json" --content-type application/json --remote >/dev/null
echo "published"
