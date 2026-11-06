import { AREA_NAME } from '@/config/map';

import { BASEMAP_SOURCE_ID, type TileSchema } from './style';

/**
 * The neighbourhood under the map's center, for the tab bar's status strip.
 *
 * Neighbourhood points come from the basemap's place layer through an
 * invisible probe layer (rendered at every zoom, so it can be queried). Only
 * points in view can be queried, so points seen earlier are remembered and the
 * nearest remembered one within AREA_NAME.maxDistanceM wins.
 */
export const AREA_PROBE_LAYER_ID = 'area-probe';

const OMT_CLASSES = ['neighbourhood', 'quarter', 'suburb'];
const PM_KINDS = ['neighbourhood', 'macrohood'];

/** Invisible circle layer over the place points of either tile schema. */
export function areaProbeLayer(schema: TileSchema) {
  const omt = schema === 'openmaptiles';
  return {
    id: AREA_PROBE_LAYER_ID,
    type: 'circle' as const,
    source: BASEMAP_SOURCE_ID,
    'source-layer': omt ? 'place' : 'places',
    filter: omt
      ? ['in', ['get', 'class'], ['literal', OMT_CLASSES]]
      : ['in', ['get', 'kind'], ['literal', PM_KINDS]],
    // Nearly invisible: fully transparent features aren't returned by queries.
    paint: { 'circle-radius': 1, 'circle-opacity': 0.01, 'circle-color': '#000000' },
  };
}

export interface AreaPoint {
  name: string;
  lng: number;
  lat: number;
}

/** Area points from queried features (English name first, like the map labels). */
export function areaPoints(features: readonly GeoJSON.Feature[]): AreaPoint[] {
  const out: AreaPoint[] = [];
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const name = [p['name:en'], p['name:latin'], p.name].find(
      (x): x is string => typeof x === 'string' && x.length > 0,
    );
    if (!name) continue;
    const [lng, lat] = f.geometry.coordinates;
    out.push({ name, lng, lat });
  }
  return out;
}

/** Remembers area points across camera moves. */
export class AreaBook {
  private readonly points = new Map<string, AreaPoint>();

  add(list: readonly AreaPoint[]): void {
    for (const p of list) {
      const key = `${p.name}|${p.lng.toFixed(3)}|${p.lat.toFixed(3)}`;
      this.points.delete(key);
      this.points.set(key, p);
    }
    while (this.points.size > AREA_NAME.cacheSize) {
      const first = this.points.keys().next().value;
      if (first === undefined) break;
      this.points.delete(first);
    }
  }

  /** Name of the nearest remembered area to a point, or null if none is close. */
  nearest(lng: number, lat: number): string | null {
    const kx = Math.cos((lat * Math.PI) / 180);
    let best: string | null = null;
    let bestD: number = AREA_NAME.maxDistanceM;
    for (const p of this.points.values()) {
      const d = Math.hypot((p.lng - lng) * kx, p.lat - lat) * 111_320;
      if (d < bestD) {
        bestD = d;
        best = p.name;
      }
    }
    return best;
  }
}
