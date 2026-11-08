import { File, Paths } from 'expo-file-system';
import { gunzipSync, strFromU8 } from 'fflate';

import { DATA_CACHE } from '@/config/dataCache';

import {
  fetchCityPack,
  fetchCityRoads,
  fetchRegionHoods,
  fetchRegionPack,
  fetchRegionRoads,
} from './api';
import type { HoodPoint } from '@/sim/hoods';

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

/** Read `name` from the cache, or download it (`decode` checks it before caching). */
async function cached<T>(
  name: string,
  download: () => Promise<Uint8Array>,
  decode: (b: Uint8Array) => T,
): Promise<T> {
  // Re-downloadable data lives in Caches (not backed up to iCloud). Packs
  // saved by older builds in Documents move over on first use.
  const file = new File(Paths.cache, name);
  const old = new File(Paths.document, name);
  if (!file.exists && old.exists) {
    try {
      old.moveSync(file);
    } catch {
      old.delete();
    }
  }
  let stale: T | null = null;
  if (file.exists) {
    try {
      const value = decode(await file.bytes());
      const at = file.info().modificationTime ?? 0;
      if (Date.now() - at < DATA_CACHE.refreshAfterDays * 86_400_000) return value;
      stale = value;
    } catch {
      // Truncated or from an old schema: drop it and download it again.
      file.delete();
    }
  }
  let bytes: Uint8Array;
  try {
    bytes = await download();
  } catch (e) {
    if (stale !== null) return stale; // Offline: the old copy still plays.
    throw e;
  }
  const value = decode(bytes);
  try {
    if (file.exists) file.delete();
    file.create();
    file.writeSync(bytes);
  } catch {
    // Disk full or similar: play from memory; it downloads again next time.
  }
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
/** A region's named neighbourhoods (districts follow them), or null: plain rings then. */
export function decodeHoods(bytes: Uint8Array): HoodPoint[] {
  const file = JSON.parse(strFromU8(gunzipSync(bytes))) as { v?: number; hoods?: unknown };
  if (file.v !== 1 || !Array.isArray(file.hoods))
    throw new Error('Unsupported neighbourhood file.');
  return (file.hoods as HoodPoint[]).filter(
    (h) => typeof h?.n === 'string' && typeof h.a === 'number' && typeof h.o === 'number',
  );
}

export async function loadRegionHoods(res5: string): Promise<HoodPoint[] | null> {
  try {
    return await cached(`region-${res5}-hoods.json.gz`, () => fetchRegionHoods(res5), decodeHoods);
  } catch {
    return null;
  }
}

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
