import { DISTRICTS, HOODS } from '@/config/progression';

import { distanceM } from './geo';

/** A named neighbourhood point (pipeline/build-hoods.ts): k = neighbourhood | macrohood | locality. */
/** Metres per degree of latitude (and of longitude at the equator). */
const M_PER_DEG = 111_195;

export interface HoodPoint {
  n: string;
  a: number;
  o: number;
  k: 'n' | 'm' | 'l';
}

/** A neighbourhood the city is divided into, with the district (chapter ring) it opens in. */
export interface Hood {
  name: string;
  lat: number;
  lng: number;
  district: number;
}

export interface HoodMap {
  hoods: Hood[];
  /** Cell id → index into `hoods` (cells too far from any name are absent). */
  cellHood: ReadonlyMap<string, number>;
}

/** The ring (district id) a distance from the start point falls in. */
export function ringOf(km: number): number {
  for (const d of DISTRICTS) if (km <= d.radiusKm) return d.id;
  return DISTRICTS[DISTRICTS.length - 1].id;
}

/**
 * Divide a city into neighbourhoods: every cell joins its nearest name, and
 * each neighbourhood opens in the ring its name sits in, measured from the
 * start point. The neighbourhood holding the start point is always district 1.
 * Deterministic for the same inputs (names are sorted by the pipeline).
 */
export function assignHoods(
  points: readonly HoodPoint[],
  cells: readonly { id: string; lat: number; lng: number }[],
  start: { lat: number; lng: number },
  startCell: string,
): HoodMap | null {
  const fine = points.filter((p) => p.k === 'n');
  const use = fine.length >= HOODS.minFine ? fine : points;
  if (!use.length) return null;
  const hoods: Hood[] = use.map((p) => ({
    name: p.n,
    lat: p.a,
    lng: p.o,
    district: ringOf(distanceM(start, { lat: p.a, lng: p.o }) / 1000),
  }));
  const cellHood = new Map<string, number>();
  // A grid of names (cells of at least maxKm): a cell only checks the 3×3 grid
  // cells around it, so big cities with hundreds of names stay fast.
  const maxM = HOODS.maxKm * 1000;
  const kx = Math.cos((start.lat * Math.PI) / 180);
  const binDeg = HOODS.maxKm / 111;
  const binOf = (lat: number, lng: number) =>
    [Math.floor(lat / binDeg), Math.floor((lng * kx) / binDeg)] as const;
  const grid = new Map<string, number[]>();
  hoods.forEach((h, i) => {
    const [by, bx] = binOf(h.lat, h.lng);
    const key = `${by},${bx}`;
    const list = grid.get(key);
    if (list) list.push(i);
    else grid.set(key, [i]);
  });
  for (const c of cells) {
    const [by, bx] = binOf(c.lat, c.lng);
    let best = -1;
    // Squared flat distance in metres²: plenty exact at neighbourhood scale, and fast.
    let bestM = maxM * maxM;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const list = grid.get(`${by + dy},${bx + dx}`);
        if (!list) continue;
        for (const i of list) {
          const ny = (hoods[i].lat - c.lat) * M_PER_DEG;
          const nx = (hoods[i].lng - c.lng) * M_PER_DEG * kx;
          const m = nx * nx + ny * ny;
          if (m < bestM || (m === bestM && i < best)) {
            bestM = m;
            best = i;
          }
        }
      }
    if (best >= 0) cellHood.set(c.id, best);
  }
  const home = cellHood.get(startCell);
  if (home !== undefined) hoods[home] = { ...hoods[home], district: 1 };
  return { hoods, cellHood };
}
