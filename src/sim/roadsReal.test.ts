/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

import { gunzipSync, strFromU8 } from 'fflate';

import { FALLBACK_CITIES } from '@/config/cities';
import type { RegionPack, RoadNet } from '@/data/types';

import { buildRoadGraph, routeOnRoads, supplierRoute, type World } from './index';
import { distanceM } from './geo';

/** The bundled street files (pipeline/lib/roads.ts) route vans in every city. */
function read<T>(file: string): T {
  const bytes = readFileSync(join(__dirname, '../../assets/cities', file));
  return JSON.parse(strFromU8(gunzipSync(new Uint8Array(bytes)))) as T;
}

describe.each(FALLBACK_CITIES.map((c) => c.id))('%s streets', (cityId) => {
  const city = FALLBACK_CITIES.find((c) => c.id === cityId)!;
  const pack = read<RegionPack>(`${cityId}.json.gz`);
  const g = buildRoadGraph(read<RoadNet>(`${cityId}-roads.json.gz`));

  it('has warehouses, none of them shops', () => {
    expect(pack.suppliers?.length).toBeGreaterThan(0);
    for (const s of pack.suppliers ?? []) expect(['warehouse', 'wholesale']).toContain(s.kind);
  });

  it('routes a van from the nearest warehouse to spots around the center', () => {
    const world = {
      city,
      suppliers: pack.suppliers,
      route: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
        routeOnRoads(g, a, b),
    } as unknown as World;
    for (const [dLat, dLng] of [
      [0, 0],
      [0.01, 0.01],
      [-0.012, 0.004],
    ]) {
      const to = { lat: city.lat + dLat, lng: city.lng + dLng };
      const { from, path, roadM } = supplierRoute(world, to);
      expect(path.length).toBeGreaterThan(2);
      const straight = distanceM(from, to);
      // Streets are longer than the crow flies, but not absurdly so.
      expect(roadM).toBeGreaterThanOrEqual(straight * 0.98);
      expect(roadM).toBeLessThan(straight * 3 + 1500);
    }
  });
});
