/**
 * Offline catch-up on the real New York pack, mirroring Diagnostics
 * ("Offline catch-up: 200 machines"): 72 h, synthetic weather.
 *
 *   npx esbuild scripts/bench/offline-catchup-real.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/b.cjs && node /tmp/b.cjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { gunzipSync, strFromU8 } from 'fflate';
import { gridDisk, latLngToCell } from 'h3-js';

import { FALLBACK_CITIES } from '../../src/config/cities';
import { syntheticWeather } from '../../src/data/weather';
import type { RegionPack } from '../../src/data/types';
import {
  advance,
  calibrateCells,
  cloneState,
  localTime,
  newGame,
  placeMachine,
  restockMachine,
  suggestRestock,
  type World,
} from '../../src/sim';
import { offsetPoint } from '../../src/sim/geo';

const city = FALLBACK_CITIES.find((c) => c.id === 'new-york')!;
const pack = JSON.parse(
  strFromU8(
    gunzipSync(new Uint8Array(readFileSync(join(process.cwd(), 'assets/cities/new-york.json.gz')))),
  ),
) as RegionPack;
const world: World = {
  city: {
    id: city.id,
    name: city.name,
    lat: city.lat,
    lng: city.lng,
    timeZone: city.timeZone,
    countryCode: city.countryCode,
  },
  cells: new Map(calibrateCells(pack.cells, city).cells.map((c) => [c.id, c])),
  cellOf: (lat, lng) => latLngToCell(lat, lng, 9),
  neighbors: (id, k) => gridDisk(id, k),
  weatherAt: (t) => {
    const lt = localTime(t, city.timeZone, city.countryCode);
    return syntheticWeather(city.id, t, lt.hour, lt.month);
  },
};

const count = Number(process.argv[2] ?? 200);
let s = newGame({ cityId: 'new-york', now: Date.UTC(2026, 5, 10, 16), seed: 1 });
s.chapter = 5;
s.cashCents = 1e12;
for (let i = 0; i < count; i++) {
  const p = offsetPoint(world.city, (i * 37) % 360, 40 + (i % 40) * 25);
  const r = placeMachine(s, world, {
    typeId: 'snack',
    lat: p.lat,
    lng: p.lng,
    heading: 0,
    termDays: 180,
    exclusive: false,
  });
  if (r.ok)
    restockMachine(s, world, r.machine.id, suggestRestock(s, r.machine.id, 10_000), {
      manual: false,
      capacity: 10_000,
    });
}
s = cloneState(s);
const runs: number[] = [];
let out = advance(s, world, s.now + 72 * 3_600_000);
for (let k = 0; k < 8; k++) {
  const t0 = performance.now();
  out = advance(s, world, s.now + 72 * 3_600_000);
  runs.push(performance.now() - t0);
}
runs.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    machines: s.machines.filter((m) => m.status === 'active').length,
    medianMs: Math.round(runs[runs.length >> 1]),
    cash: out.state.cashCents,
    units: out.state.ledger.lifetimeUnits,
    lost: out.report.contractsLost.length,
  }),
);
