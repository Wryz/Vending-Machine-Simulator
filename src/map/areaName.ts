import { AREA_NAME } from '@/config/map';

import { BASEMAP_SOURCE_ID, type TileSchema } from './style';

/**
 * Where the map's center is, for the tab bar's status strip: the neighbourhood
 * and the larger district or municipality around it (borough, ward, suburb).
 *
 * Place points come from the basemap's place layer through an invisible probe
 * layer (rendered at every zoom, so it can be queried). Only points in view can
 * be queried, so points seen earlier are remembered and the nearest remembered
 * one of each level within range wins.
 */
export const AREA_PROBE_LAYER_ID = 'area-probe';

export type AreaLevel = 'area' | 'district';

const OMT_LEVEL: Record<string, AreaLevel> = {
  neighbourhood: 'area',
  quarter: 'area',
  suburb: 'district',
  borough: 'district',
  city: 'district',
  town: 'district',
};
const PM_LEVEL: Record<string, AreaLevel> = {
  neighbourhood: 'area',
  macrohood: 'district',
  locality: 'district',
};

/** Invisible circle layer over the place points of either tile schema. */
export function areaProbeLayer(schema: TileSchema) {
  const omt = schema === 'openmaptiles';
  return {
    id: AREA_PROBE_LAYER_ID,
    type: 'circle' as const,
    source: BASEMAP_SOURCE_ID,
    'source-layer': omt ? 'place' : 'places',
    filter: omt
      ? ['in', ['get', 'class'], ['literal', Object.keys(OMT_LEVEL)]]
      : ['in', ['get', 'kind'], ['literal', Object.keys(PM_LEVEL)]],
    // Nearly invisible: fully transparent features aren't returned by queries.
    paint: { 'circle-radius': 1, 'circle-opacity': 0.01, 'circle-color': '#000000' },
  };
}

export interface AreaPoint {
  name: string;
  level: AreaLevel;
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
    const cls = typeof p.class === 'string' ? p.class : typeof p.kind === 'string' ? p.kind : '';
    const level = OMT_LEVEL[cls] ?? PM_LEVEL[cls];
    if (!level) continue;
    const [lng, lat] = f.geometry.coordinates;
    out.push({ name, level, lng, lat });
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

  /**
   * Nearest remembered neighbourhood and district to a point (null where none
   * is in range). `exclude` drops a name (the game city itself is a city point).
   */
  nearest(lng: number, lat: number, exclude?: string): AreaNames {
    const kx = Math.cos((lat * Math.PI) / 180);
    const best: AreaNames = { area: null, district: null };
    const bestD: Record<AreaLevel, number> = {
      area: AREA_NAME.maxDistanceM,
      district: AREA_NAME.districtMaxDistanceM,
    };
    for (const p of this.points.values()) {
      if (p.name === exclude) continue;
      const d = Math.hypot((p.lng - lng) * kx, p.lat - lat) * 111_320;
      if (d < bestD[p.level]) {
        bestD[p.level] = d;
        best[p.level] = p.name;
      }
    }
    if (best.district === best.area) best.district = null;
    return best;
  }
}

export interface AreaNames {
  /** Neighbourhood. */
  area: string | null;
  /** Borough, ward, suburb or municipality around it. */
  district: string | null;
}
