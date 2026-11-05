import { TILES } from '@/config/map';
import { ENV } from '@/data/env';

import type { TileSource } from './style';

/**
 * Which basemap to use (see docs/hosting.md):
 * 1. `EXPO_PUBLIC_TILES_URL` set → self-hosted Protomaps tiles: a `.pmtiles`
 *    URL (native pmtiles://) or an XYZ template with {z}/{x}/{y}. `{name}` is
 *    replaced by the city id. A URL ending in TileJSON with
 *    `EXPO_PUBLIC_TILES_SCHEMA=openmaptiles` also works (e.g. your own
 *    OpenFreeMap/OpenMapTiles server).
 * 2. Otherwise → OpenFreeMap's free public instance (OpenMapTiles schema).
 */
export function tileSourceFor(
  cityId: string,
  env: { tilesUrl: string; tilesSchema: string } = ENV,
): TileSource {
  const raw = env.tilesUrl.trim();
  if (!raw) return { kind: 'tilejson', url: TILES.openFreeMapTileJson, schema: 'openmaptiles' };
  const name = cityId.startsWith('area-') ? 'planet' : cityId;
  const url = raw.replace('{name}', name);
  const schema = env.tilesSchema === 'openmaptiles' ? 'openmaptiles' : 'protomaps';
  if (url.includes('{z}')) return { kind: 'xyz', urlTemplate: url, schema };
  if (url.startsWith('pmtiles://') || /\.pmtiles(\?|$)/.test(url))
    return { kind: 'pmtiles', url, schema };
  return { kind: 'tilejson', url, schema };
}
