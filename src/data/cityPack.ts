import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { gunzipSync, strFromU8 } from 'fflate';

import { CITY_PACKS, CITY_ROADS } from '@assets/cities';

import { fetchRegionPack, fetchRegionRoads } from './api';
import type { RegionPack, RoadNet } from './types';

/** Parse a gzip'd RegionPack. Pure (used by tests too). */
export function decodePack(bytes: Uint8Array): RegionPack {
  const json = strFromU8(gunzipSync(bytes));
  const pack = JSON.parse(json) as RegionPack;
  if (pack.schemaVersion !== 1 || !Array.isArray(pack.cells))
    throw new Error('Unsupported region pack.');
  return pack;
}

/** Load a bundled fallback city pack (offline, ships with the app). */
export async function loadCityPack(cityId: string): Promise<RegionPack> {
  const mod = CITY_PACKS[cityId];
  if (mod === undefined) throw new Error(`No bundled pack for ${cityId}`);
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const bytes = await new File(uri).bytes();
  return decodePack(bytes);
}

/** Download a "your area" region pack once and cache it on device. */
export async function loadRegionPack(res5: string): Promise<RegionPack> {
  const cached = new File(Paths.document, `region-${res5}.json.gz`);
  if (cached.exists) {
    try {
      return decodePack(await cached.bytes());
    } catch {
      // Truncated or from an old schema: drop it and download it again.
      cached.delete();
    }
  }
  const bytes = await fetchRegionPack(res5);
  const pack = decodePack(bytes);
  cached.writeSync(bytes);
  return pack;
}

/** Parse a gzip'd RoadNet. Pure (used by tests too). */
export function decodeRoads(bytes: Uint8Array): RoadNet {
  const net = JSON.parse(strFromU8(gunzipSync(bytes))) as RoadNet;
  if (net.schemaVersion !== 1 || !Array.isArray(net.lines))
    throw new Error('Unsupported road file.');
  return net;
}

/** A bundled city's streets for the delivery vans, or null (no file, or unreadable). */
export async function loadCityRoads(cityId: string): Promise<RoadNet | null> {
  const mod = CITY_ROADS[cityId];
  if (mod === undefined) return null;
  try {
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    return decodeRoads(await new File(asset.localUri ?? asset.uri).bytes());
  } catch {
    return null;
  }
}

/**
 * A "your area" region's streets, downloaded once and cached on device, or
 * null (not built yet, offline): vans then drive a straight line.
 */
export async function loadRegionRoads(res5: string): Promise<RoadNet | null> {
  const cached = new File(Paths.document, `region-${res5}-roads.json.gz`);
  if (cached.exists) {
    try {
      return decodeRoads(await cached.bytes());
    } catch {
      cached.delete();
    }
  }
  try {
    const bytes = await fetchRegionRoads(res5);
    const net = decodeRoads(bytes);
    cached.writeSync(bytes);
    return net;
  } catch {
    return null;
  }
}
