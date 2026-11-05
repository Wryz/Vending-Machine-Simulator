import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { gunzipSync, strFromU8 } from 'fflate';

import { CITY_PACKS } from '@assets/cities';

import { fetchRegionPack } from './api';
import type { RegionPack } from './types';

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
  if (cached.exists) return decodePack(await cached.bytes());
  const bytes = await fetchRegionPack(res5);
  const pack = decodePack(bytes);
  cached.writeSync(bytes);
  return pack;
}
