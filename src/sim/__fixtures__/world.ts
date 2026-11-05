import type { CellData, NamedPlace, PlaceCategory, WeatherHour } from '@/data/types';

import type { World } from '../state';

/**
 * Synthetic test world on a square grid (~150 m cells) instead of H3, so sim
 * tests don't depend on real data. Cell ids are "g{row}_{col}".
 */
export const GRID_DEG = 0.0015;

export function gridId(lat: number, lng: number): string {
  return `g${Math.floor(lat / GRID_DEG)}_${Math.floor(lng / GRID_DEG)}`;
}

function parse(id: string): [number, number] {
  const [r, c] = id.slice(1).split('_').map(Number);
  return [r, c];
}

export function cellCenter(id: string): { lat: number; lng: number } {
  const [r, c] = parse(id);
  return { lat: (r + 0.5) * GRID_DEG, lng: (c + 0.5) * GRID_DEG };
}

export interface CellSpec {
  pop?: number;
  nearby?: Partial<Record<PlaceCategory, number>>;
  places?: { name: string; category: PlaceCategory; dLat?: number; dLng?: number }[];
  competitors?: number;
  isolation?: number;
}

export function makeCell(id: string, spec: CellSpec): CellData {
  const c = cellCenter(id);
  const places: NamedPlace[] = (spec.places ?? []).map((p, i) => ({
    id: `${id}-p${i}`,
    name: p.name,
    category: p.category,
    lat: c.lat + (p.dLat ?? 0.0001 * (i + 1)),
    lng: c.lng + (p.dLng ?? 0),
  }));
  const counts: Partial<Record<PlaceCategory, number>> = {};
  for (const p of places) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return {
    id,
    lat: c.lat,
    lng: c.lng,
    pop: spec.pop ?? 0,
    counts,
    nearby: spec.nearby ?? {},
    places,
    competitors: spec.competitors ?? 0,
    isolation: spec.isolation ?? 0.2,
  };
}

export const NYC = {
  id: 'new-york',
  name: 'New York',
  lat: 40.7128,
  lng: -74.006,
  timeZone: 'America/New_York',
  countryCode: 'US',
};

/** A downtown with a decent office/café spot at the center and a dead spot far away. */
export function testWorld(
  opts: { weather?: (t: number) => WeatherHour | null; extra?: CellData[] } = {},
): World {
  const center = gridId(NYC.lat, NYC.lng);
  const [r, c] = parse(center);
  const cells = new Map<string, CellData>();
  const decent = makeCell(center, {
    pop: 2500,
    nearby: { office: 4, cafe: 3, station: 0.6, school: 0.5, gym: 0.8, restaurant: 3, shopping: 1 },
    places: [
      { name: 'Lakeview Fitness', category: 'gym' },
      { name: 'Hudson Works', category: 'office' },
      { name: 'Corner Bean', category: 'cafe' },
    ],
    competitors: 1,
  });
  cells.set(decent.id, decent);
  // A ring of busy neighbours for the rival to target.
  for (let dr = -3; dr <= 3; dr++) {
    for (let dc = -3; dc <= 3; dc++) {
      const id = `g${r + dr}_${c + dc}`;
      if (cells.has(id)) continue;
      cells.set(
        id,
        makeCell(id, {
          pop: 1500 + 100 * ((dr + dc + 6) % 5),
          nearby: { office: 2 + ((dr * 7 + dc) % 3), cafe: 1, restaurant: 1 },
          places:
            (dr + dc) % 2 === 0 ? [{ name: `Block ${dr},${dc} Offices`, category: 'office' }] : [],
          isolation: 0.3,
        }),
      );
    }
  }
  // School near the center for alcohol rules, stadium for events.
  const schoolId = `g${r + 1}_${c}`;
  const school = cells.get(schoolId)!;
  school.places.push({
    id: `${schoolId}-school`,
    name: 'PS 41',
    category: 'school',
    lat: school.lat,
    lng: school.lng,
  });
  const stadiumId = `g${r - 2}_${c - 2}`;
  const stadium = cells.get(stadiumId)!;
  stadium.places.push({
    id: `${stadiumId}-stadium`,
    name: 'Pier Stadium',
    category: 'stadium',
    lat: stadium.lat,
    lng: stadium.lng,
  });
  // A dead spot.
  const deadId = `g${r + 40}_${c + 40}`;
  cells.set(deadId, makeCell(deadId, { pop: 20, isolation: 0.95 }));
  for (const e of opts.extra ?? []) cells.set(e.id, e);

  return {
    city: NYC,
    cells,
    cellOf: gridId,
    neighbors(id, k) {
      const [rr, cc] = parse(id);
      const out: string[] = [];
      for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) out.push(`g${rr + a}_${cc + b}`);
      return out;
    },
    weatherAt: opts.weather ?? (() => null),
  };
}

export function decentSpot() {
  return cellCenter(gridId(NYC.lat, NYC.lng));
}

export function deadSpot() {
  const [r, c] = parse(gridId(NYC.lat, NYC.lng));
  return cellCenter(`g${r + 40}_${c + 40}`);
}

/** 2026-06-10 (Wednesday) 12:00 New York (EDT, UTC-4). */
export const NOON_NY = Date.UTC(2026, 5, 10, 16, 0, 0);
