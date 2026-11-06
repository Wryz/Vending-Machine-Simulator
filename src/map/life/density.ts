import { MAP_LIFE } from '@/config/mapLife';

import type { LifeConditions, RoadKind } from './types';

const D = MAP_LIFE.density;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Smoothly interpolated hourly curve (24 values, wraps at midnight). */
export function hourCurve(curve: readonly number[], hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  const i = Math.floor(h);
  const t = h - i;
  return curve[i] * (1 - t) + curve[(i + 1) % 24] * t;
}

/** 0..1 bustle of the city for the hour (rush hours ≈ 1, 3 am ≈ 0.06). */
export function cityActivity(c: LifeConditions): number {
  const curve = c.restDay ? D.busyByHourRestDay : D.busyByHourWeekday;
  let a = hourCurve(curve, c.hour);
  // Busy districts are livelier, quiet ones a little calmer.
  a *= 0.75 + 0.35 * footShare(c);
  if (c.weather === 'rain' || c.weather === 'storm' || c.weather === 'snow') a *= D.rainBusy;
  return clamp01(a);
}

/** 0..1 share of "busy" foot traffic (baseTraffic already follows the hour). */
function footShare(c: LifeConditions): number {
  return clamp01(c.footTraffic / D.busyFootTraffic);
}

/** 0..1 pedestrian activity: foot traffic of the cells in view, weather. */
export function peopleActivity(c: LifeConditions): number {
  // Square-root response: a modest block still has people; downtown is full.
  let a = Math.sqrt(footShare(c));
  // Late at night streets empty out even where the data has residents.
  const night = hourCurve(D.busyByHourWeekday, c.hour);
  a = Math.max(a, D.minPeopleShare) * (0.35 + 0.65 * Math.min(1, night * 1.6));
  switch (c.weather) {
    case 'rain':
      a *= D.rainPeople;
      break;
    case 'storm':
      a *= D.stormPeople;
      break;
    case 'snow':
      a *= D.snowPeople;
      break;
    case 'fog':
      a *= D.fogPeople;
      break;
    default:
      break;
  }
  return clamp01(a);
}

/**
 * How busy the city sounds/looks right now, 0..1 (soundscape input). Depends
 * only on the hour, foot traffic and weather, so it works at any zoom.
 */
export function busyLevel(c: LifeConditions): number {
  return clamp01(0.6 * cityActivity(c) + 0.4 * peopleActivity(c));
}

/** Target number of people for the streets in view (meters of street per kind). */
export function peopleTarget(c: LifeConditions, roadM: Record<RoadKind, number>): number {
  const perKm = MAP_LIFE.people.perKm;
  // Two sidewalks per street.
  const people =
    ((2 * (roadM.major * perKm.major + roadM.minor * perKm.minor)) / 1000) * peopleActivity(c);
  return Math.min(MAP_LIFE.maxPeople, Math.round(people));
}
