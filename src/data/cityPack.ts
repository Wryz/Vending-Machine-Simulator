import { File, Paths } from 'expo-file-system';
import { gunzipSync, strFromU8 } from 'fflate';

import { fetchCityPack, fetchCityRoads, fetchRegionPack, fetchRegionRoads } from './api';
import type { RegionPack, RoadNet } from './types';

/**
 * City data on device. Nothing is bundled: every city (a region, or one of
 * the former built-in nine for older saves) is downloaded once from the data
 * API and cached, so a city keeps working offline after its first visit.
 */

/** Parse a gzip'd RegionPack. Pure (used by tests too). */
export function decodePack(bytes: Uint8Array): RegionPack {
  const json = strFromU8(gunzipSync(bytes));
  const pack = JSON.parse(json) as RegionPack;
  if (pack.schemaVersion !== 1 || !Array.isArray(pack.cells))
    throw new Error('Unsupported region pack.');
  return pack;
}

/** Parse a gzip'd RoadNet. Pure (used by tests too). */
export function decodeRoads(bytes: Uint8Array): RoadNet {
  const net = JSON.parse(strFromU8(gunzipSync(bytes))) as RoadNet;
  if (net.schemaVersion !== 1 || !Array.isArray(net.lines))
    throw new Error('Unsupported road file.');
  return net;
}

/** Read `name` from the cache, or download it once (`decode` checks it before caching). */
async function cached<T>(
  name: string,
  download: () => Promise<Uint8Array>,
  decode: (b: Uint8Array) => T,
): Promise<T> {
  const file = new File(Paths.document, name);
  if (file.exists) {
    try {
      return decode(await file.bytes());
    } catch {
      // Truncated or from an old schema: drop it and download it again.
      file.delete();
    }
  }
  const bytes = await download();
  const value = decode(bytes);
  file.writeSync(bytes);
  return value;
}

/** A region's pack (any city or outer district). */
export function loadRegionPack(res5: string): Promise<RegionPack> {
  return cached(`region-${res5}.json.gz`, () => fetchRegionPack(res5), decodePack);
}

/** A former built-in city's pack, for saves started there before regions. */
export function loadCityPack(cityId: string): Promise<RegionPack> {
  return cached(`city-${cityId}.json.gz`, () => fetchCityPack(cityId), decodePack);
}

/** A region's streets for the vans, or null (offline on first visit): vans then drive straight. */
export async function loadRegionRoads(res5: string): Promise<RoadNet | null> {
  try {
    return await cached(`region-${res5}-roads.json.gz`, () => fetchRegionRoads(res5), decodeRoads);
  } catch {
    return null;
  }
}

/** A former built-in city's streets, or null. */
export async function loadCityRoads(cityId: string): Promise<RoadNet | null> {
  try {
    return await cached(`city-${cityId}-roads.json.gz`, () => fetchCityRoads(cityId), decodeRoads);
  } catch {
    return null;
  }
}
