import { visitorScale } from './layout';
import { LIFE_PEOPLE_MODELS } from '@/config/mapLife';

import type { StreetLife } from './sim';
import type { Customer, Person } from './types';
import {
  bubbleSpriteName,
  lifeHeadingBucket,
  lifePitchBucket,
  personSpriteName,
  type LifeLight,
} from './sprites';

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
  /** Map zoom: machine visitors spread out from their machine by its enlargement (visitorScale). */
  zoom?: number;
}

const parts: string[] = [];

function point(lng: number, lat: number, props: string): string {
  return `{"type":"Feature","geometry":{"type":"Point","coordinates":[${lng.toFixed(7)},${lat.toFixed(7)}]},"properties":{${props}}}`;
}

export function lifeGeoJSON(life: StreetLife, o: LifeRenderOptions): string {
  parts.length = 0;
  const pitch = lifePitchBucket(o.pitch);
  for (const p of life.people) pushPerson(p, o, pitch);
  for (const c of life.customers) {
    pushPerson(c, o, pitch, c);
    pushBubble(c, o, pitch);
  }
  return `{"type":"FeatureCollection","features":[${parts.join(',')}]}`;
}

/**
 * Where a machine visitor is drawn: their offset from the machine stretched by
 * the machine's enlargement, so a bigger customer still stands in front of the
 * bigger machine instead of inside it. Local meters are x east, y north.
 */
function visitorAt(c: Customer, o: LifeRenderOptions): { lng: number; lat: number } {
  const f = o.zoom === undefined ? 1 : visitorScale(o.zoom, c.lat);
  if (f <= 1) return c;
  const kLat = 111_320;
  const kLng = kLat * Math.cos((c.lat * Math.PI) / 180);
  return {
    lng: c.lng + ((c.x - c.mx) * (f - 1)) / kLng,
    lat: c.lat + ((c.y - c.my) * (f - 1)) / kLat,
  };
}

function pushPerson(
  p: Person,
  o: LifeRenderOptions,
  pitch: ReturnType<typeof lifePitchBucket>,
  visitor?: Customer,
) {
  if (p.alpha <= 0.01) return;
  const h = lifeHeadingBucket(p.heading, o.bearing);
  const name = personSpriteName(LIFE_PEOPLE_MODELS[p.model], p.frame, h, pitch, o.light);
  if (visitor) {
    // "v":1 puts them on the visitors layer: over buildings, at the machine's scale.
    const at = visitorAt(visitor, o);
    parts.push(point(at.lng, at.lat, `"i":"${name}","o":${p.alpha.toFixed(2)},"v":1`));
    return;
  }
  parts.push(point(p.lng, p.lat, `"i":"${name}","o":${p.alpha.toFixed(2)}`));
}

/** A customer's thought bubble: same ground point, the sprite floats it over their head. */
function pushBubble(c: Customer, o: LifeRenderOptions, pitch: ReturnType<typeof lifePitchBucket>) {
  if (!c.bubble) return;
  const a = c.alpha * c.bubbleAlpha;
  if (a <= 0.01) return;
  const name = bubbleSpriteName(c.bubble, pitch, o.light);
  const at = visitorAt(c, o);
  parts.push(point(at.lng, at.lat, `"i":"${name}","o":${a.toFixed(2)},"v":1`));
}
