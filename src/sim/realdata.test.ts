/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

import { gunzipSync, strFromU8 } from 'fflate';
import { gridDisk, latLngToCell } from 'h3-js';

import { FALLBACK_CITIES } from '@/config/cities';
import type { RegionPack } from '@/data/types';

import {
  advance,
  baseTraffic,
  calibrateCells,
  collectCash,
  repairMachine,
  evaluateSpot,
  newGame,
  placeMachine,
  restockMachine,
  suggestRestock,
  withClone,
  type World,
} from './index';

/** Balancing against the real bundled city packs (OSM-derived). */
function loadWorld(cityId: string): World {
  const bytes = readFileSync(join(__dirname, '../../assets/cities', `${cityId}.json.gz`));
  const pack = JSON.parse(strFromU8(gunzipSync(new Uint8Array(bytes)))) as RegionPack;
  const city = FALLBACK_CITIES.find((c) => c.id === cityId)!;
  return {
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
    weatherAt: () => null,
  };
}

const NOON_NY = Date.UTC(2026, 5, 10, 16);

describe.each(FALLBACK_CITIES.map((c) => c.id))('real data: %s', (cityId) => {
  const world = loadWorld(cityId);
  it('has a spread of good and bad spots in district 1', () => {
    const traffic = [...world.cells.values()]
      .map((c) => baseTraffic(c, 12.5, false).total)
      .sort((a, b) => a - b);
    expect(traffic.length).toBeGreaterThan(100);
    const p10 = traffic[Math.floor(traffic.length * 0.1)];
    const p90 = traffic[Math.floor(traffic.length * 0.9)];
    expect(p90).toBeGreaterThan(p10 * 3);
  });
});

describe('real data pacing (New York)', () => {
  it('chapter 1 at a 75th-percentile downtown spot takes 15–45 minutes', () => {
    const world = loadWorld('new-york');
    const cells = [...world.cells.values()]
      .filter((c) => Math.hypot(c.lat - world.city.lat, (c.lng - world.city.lng) * 0.76) < 0.01)
      .sort((a, b) => baseTraffic(a, 12.5, false).total - baseTraffic(b, 12.5, false).total);
    const cell = cells[Math.floor(cells.length * 0.75)];
    let s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 42 });
    const spot = evaluateSpot(s, world, cell, 'used-snack', NOON_NY);
    s = withClone(s, (d) =>
      placeMachine(d, world, {
        machineId: d.machines[0].id,
        lat: cell.lat,
        lng: cell.lng,
        heading: 180,
        termDays: 30,
        exclusive: false,
      }),
    ).state;
    expect(s.machines[0].status).toBe('active');
    s = withClone(s, (d) =>
      restockMachine(d, world, d.machines[0].id, suggestRestock(d, d.machines[0].id), {
        manual: true,
      }),
    ).state;
    let minutes = 0;
    while (s.chapter === 1 && minutes < 180) {
      s = advance(s, world, s.now + 60_000).state;
      minutes++;
      const m = s.machines[0];
      if (m.broken) s = withClone(s, (d) => repairMachine(d, m.id)).state;
      if (m.slots.reduce((a, x) => a + x.qty, 0) < 40) {
        s = withClone(s, (d) => collectCash(d, m.id)).state;
        s = withClone(s, (d) =>
          restockMachine(d, world, m.id, suggestRestock(d, m.id), { manual: true }),
        ).state;
      }
    }
    console.log(
      `NY p75 spot (${spot.venue.name}, ${spot.nowCustomers.toFixed(1)} customers/h): chapter 1 in ${minutes} min`,
    );
    expect(minutes).toBeGreaterThanOrEqual(15);
    expect(minutes).toBeLessThanOrEqual(45);
  });
});
