import { LIFE_CAR_MODELS, LIFE_PEOPLE_MODELS, MAP_LIFE } from '@/config/mapLife';

import type { StreetLife } from './sim';
import type { Person } from './types';
import {
  carSpriteName,
  lifeHeadingBucket,
  lifePitchBucket,
  personSpriteName,
  residualRotation,
  type LifeLight,
} from './sprites';

/**
 * StreetLife -> GeoJSON text for the map's `life` source. Built as one string
 * (no intermediate feature objects, no JSON.stringify): the native source
 * gets a string either way, and this keeps per-frame allocations to the
 * string itself.
 *
 * Feature properties (short keys, they cross the bridge every frame):
 *   k: 0 car, 1 person, 2 headlight pool
 *   i: sprite image name
 *   r: icon-rotate (cars: residual heading correction, deg)
 *   o: opacity 0..1 (spawn / despawn fades)
 */

export interface LifeRenderOptions {
  bearing: number;
  pitch: number;
  light: LifeLight;
}

const BEAM = MAP_LIFE.beams;
const DEG = Math.PI / 180;

const parts: string[] = [];

function point(lng: number, lat: number, props: string): string {
  return `{"type":"Feature","geometry":{"type":"Point","coordinates":[${lng.toFixed(7)},${lat.toFixed(7)}]},"properties":{${props}}}`;
}

export function lifeGeoJSON(life: StreetLife, o: LifeRenderOptions): string {
  parts.length = 0;
  const pitch = lifePitchBucket(o.pitch);
  const net = life.net;
  for (const c of life.cars) {
    if (c.alpha <= 0.01) continue;
    const h = lifeHeadingBucket(c.heading, o.bearing);
    const rot = residualRotation(c.heading, o.bearing, o.pitch, h, pitch);
    const name = carSpriteName(LIFE_CAR_MODELS[c.model], h, pitch, o.light);
    if (o.light === 'night' && net) {
      // Headlight pool on the road ahead.
      const lng = c.lng + (Math.sin(c.heading * DEG) * BEAM.aheadM) / net.kx;
      const lat = c.lat + (Math.cos(c.heading * DEG) * BEAM.aheadM) / net.ky;
      parts.push(point(lng, lat, `"k":2,"o":${c.alpha.toFixed(2)}`));
    }
    parts.push(
      point(c.lng, c.lat, `"k":0,"i":"${name}","r":${rot.toFixed(1)},"o":${c.alpha.toFixed(2)}`),
    );
  }
  for (const p of life.people) pushPerson(p, o, pitch);
  for (const p of life.customers) pushPerson(p, o, pitch);
  return `{"type":"FeatureCollection","features":[${parts.join(',')}]}`;
}

function pushPerson(p: Person, o: LifeRenderOptions, pitch: ReturnType<typeof lifePitchBucket>) {
  if (p.alpha <= 0.01) return;
  const h = lifeHeadingBucket(p.heading, o.bearing);
  const name = personSpriteName(LIFE_PEOPLE_MODELS[p.model], p.frame, h, pitch, o.light);
  parts.push(point(p.lng, p.lat, `"k":1,"i":"${name}","r":0,"o":${p.alpha.toFixed(2)}`));
}
