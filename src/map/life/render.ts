import { LIFE_PEOPLE_MODELS } from '@/config/mapLife';

import type { StreetLife } from './sim';
import type { Person } from './types';
import { lifeHeadingBucket, lifePitchBucket, personSpriteName, type LifeLight } from './sprites';

/**
 * StreetLife -> GeoJSON text for the map's `life` source. Built as one string
 * (no intermediate feature objects, no JSON.stringify): the native source
 * gets a string either way, and this keeps per-frame allocations to the
 * string itself.
 *
 * Feature properties (short keys, they cross the bridge every frame):
 *   i: sprite image name
 *   o: opacity 0..1 (spawn / despawn fades)
 */

export interface LifeRenderOptions {
  bearing: number;
  pitch: number;
  light: LifeLight;
}

const parts: string[] = [];

function point(lng: number, lat: number, props: string): string {
  return `{"type":"Feature","geometry":{"type":"Point","coordinates":[${lng.toFixed(7)},${lat.toFixed(7)}]},"properties":{${props}}}`;
}

export function lifeGeoJSON(life: StreetLife, o: LifeRenderOptions): string {
  parts.length = 0;
  const pitch = lifePitchBucket(o.pitch);
  for (const p of life.people) pushPerson(p, o, pitch);
  for (const p of life.customers) pushPerson(p, o, pitch);
  return `{"type":"FeatureCollection","features":[${parts.join(',')}]}`;
}

function pushPerson(p: Person, o: LifeRenderOptions, pitch: ReturnType<typeof lifePitchBucket>) {
  if (p.alpha <= 0.01) return;
  const h = lifeHeadingBucket(p.heading, o.bearing);
  const name = personSpriteName(LIFE_PEOPLE_MODELS[p.model], p.frame, h, pitch, o.light);
  parts.push(point(p.lng, p.lat, `"i":"${name}","o":${p.alpha.toFixed(2)}`));
}
