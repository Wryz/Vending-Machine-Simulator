#!/usr/bin/env bash
# Upload named-neighbourhood files (out/hoods/{res5}.json, from build-hoods.ts) to the
# data API's R2 bucket as cells/{res5}-hoods.json.gz. Only files not uploaded yet
# (tracked in out/hoods-uploaded.txt), 6 at a time. Safe to re-run.
#
#   ./upload-hoods.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$HERE/out/hoods"
GZ="$HERE/out/hoods-gz"
DONE="$HERE/out/hoods-uploaded.txt"
BUCKET="${BUCKET:-coinline-data}"
mkdir -p "$GZ"
touch "$DONE"
cd "$(mktemp -d)"

upload_one() {
  local res5="$1" dir="$2" gz="$3" bucket="$4" done="$5"
  gzip -9 -c "$dir/$res5.json" >"$gz/$res5.json.gz" &&
    npx --yes wrangler r2 object put "$bucket/cells/$res5-hoods.json.gz" --file "$gz/$res5.json.gz" \
      --content-type application/octet-stream --remote >/dev/null 2>&1 &&
    echo "$res5" >>"$done" || echo "failed: $res5" >&2
}
export -f upload_one

ls "$DIR"/*.json | xargs -n1 basename | sed 's/\.json$//' | sort |
  comm -23 - <(sort "$DONE") |
  xargs -P 6 -I{} bash -c 'upload_one "$@"' _ {} "$DIR" "$GZ" "$BUCKET" "$DONE"
echo "uploaded: $(wc -l <"$DONE") neighbourhood files"
