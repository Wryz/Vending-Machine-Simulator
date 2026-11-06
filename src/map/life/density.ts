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

/** 0..1 relative car traffic for the hour (rush hours ≈ 1, 3 am ≈ 0.06). */
export function carActivity(c: LifeConditions): number {
  const curve = c.restDay ? D.carsByHourRestDay : D.carsByHourWeekday;
  let a = hourCurve(curve, c.hour);
  // Busy districts have more traffic, quiet ones a little less.
  a *= 0.75 + 0.35 * footShare(c);
  if (c.weather === 'rain' || c.weather === 'storm' || c.weather === 'snow') a *= D.rainCars;
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
  const night = hourCurve(D.carsByHourWeekday, c.hour);
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
export function trafficLevel(c: LifeConditions): number {
  return clamp01(0.6 * carActivity(c) + 0.4 * peopleActivity(c));
}

/** Target agent counts for the roads in view (meters of road per kind). */
export function lifeTargets(
  c: LifeConditions,
  roadM: Record<RoadKind, number>,
): { cars: number; people: number } {
  const ca = carActivity(c);
  const pa = peopleActivity(c);
  const carsKm = MAP_LIFE.cars.perKm;
  const pplKm = MAP_LIFE.people.perKm;
  const cars =
    ((roadM.highway * carsKm.highway +
      roadM.major * carsKm.major +
      roadM.minor * carsKm.minor +
      roadM.service * carsKm.service) /
      1000) *
    ca;
  // Two sidewalks per street.
  const people = ((2 * (roadM.major * pplKm.major + roadM.minor * pplKm.minor)) / 1000) * pa;
  return {
    cars: Math.min(MAP_LIFE.caps.cars, Math.round(cars)),
    people: Math.min(MAP_LIFE.caps.people, Math.round(people)),
  };
}
