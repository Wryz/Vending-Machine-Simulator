#!/usr/bin/env bash
# Build every region in out/regions.json that isn't built yet, 2 jobs at a time,
# repeating passes until a pass builds nothing new (the planet server
# occasionally refuses an extract; the next pass retries it).
set -uo pipefail
cd "$(dirname "$0")"
export PLANET_URL="${PLANET_URL:-https://build.protomaps.com/20261107.pmtiles}"
for pass in 1 2 3 4; do
  before=$(ls out/regions/*.meta.json 2>/dev/null | wc -l)
  npx tsx build-region.ts --shard=0/2 >out/region-build-p$pass-0.log 2>&1 &
  npx tsx build-region.ts --shard=1/2 >out/region-build-p$pass-1.log 2>&1 &
  wait
  after=$(ls out/regions/*.meta.json | wc -l)
  echo "pass $pass: $before -> $after"
  [ "$after" -eq "$before" ] && break
done
