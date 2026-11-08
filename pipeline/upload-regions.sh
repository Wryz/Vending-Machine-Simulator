#!/usr/bin/env bash
# Upload built "your area" regions (out/regions/) to the data API's R2 bucket
# as cells/{res5}.json.gz, cells/{res5}-roads.json.gz and cells/{res5}.meta.json.
# Only regions not uploaded yet (tracked in out/regions-uploaded.txt), 6 at a time.
#
#   ./upload-regions.sh
#
# Needs `npx wrangler login` once. Runs from a temp dir so wrangler doesn't
# auto-configure the Expo app at the repo root.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$HERE/out/regions"
DONE="$HERE/out/regions-uploaded.txt"
BUCKET="${BUCKET:-coinline-data}"
touch "$DONE"
cd "$(mktemp -d)"

upload_one() {
  local res5="$1" dir="$2" bucket="$3" done="$4"
  # The meta goes last: the Worker treats a region as built once its pack exists.
  npx --yes wrangler r2 object put "$bucket/cells/$res5-roads.json.gz" --file "$dir/$res5-roads.json.gz" \
    --content-type application/octet-stream --remote >/dev/null 2>&1 &&
    npx --yes wrangler r2 object put "$bucket/cells/$res5.json.gz" --file "$dir/$res5.json.gz" \
      --content-type application/octet-stream --remote >/dev/null 2>&1 &&
    npx --yes wrangler r2 object put "$bucket/cells/$res5.meta.json" --file "$dir/$res5.meta.json" \
      --content-type application/json --remote >/dev/null 2>&1 &&
    echo "$res5" >>"$done" || echo "failed: $res5" >&2
}
export -f upload_one

ls "$DIR"/*.meta.json | xargs -n1 basename | sed 's/\.meta\.json$//' | sort |
  comm -23 - <(sort "$DONE") |
  xargs -P 6 -I{} bash -c 'upload_one "$@"' _ {} "$DIR" "$BUCKET" "$DONE"
echo "uploaded: $(wc -l <"$DONE") regions"
