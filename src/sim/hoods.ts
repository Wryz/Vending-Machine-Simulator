import { DISTRICTS, HOODS } from '@/config/progression';

import { distanceM } from './geo';

/** A named neighbourhood point (pipeline/build-hoods.ts): k = neighbourhood | macrohood | locality. */
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
  const maxM = HOODS.maxKm * 1000;
  for (const c of cells) {
    let best = -1;
    let bestM = maxM;
    for (let i = 0; i < hoods.length; i++) {
      const m = distanceM(c, hoods[i]);
      if (m < bestM) {
        bestM = m;
        best = i;
      }
    }
    if (best >= 0) cellHood.set(c.id, best);
  }
  const home = cellHood.get(startCell);
  if (home !== undefined) hoods[home] = { ...hoods[home], district: 1 };
  return { hoods, cellHood };
}
