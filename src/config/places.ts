import type { PlaceCategory } from '../data/types';

/**
 * Place tuning (SPEC §5.2). Data only.
 * `weight` = expected passers per hour contributed by one place at peak,
 * before distance decay and the hourly curve.
 */
export const PLACE_WEIGHT: Record<PlaceCategory, number> = {
  school: 55,
  university: 70,
  gym: 30,
  office: 40,
  hospital: 90,
  clinic: 18,
  station: 140,
  stadium: 60,
  park: 22,
  beach: 45,
  nightlife: 26,
  cafe: 14,
  restaurant: 12,
  fastfood: 18,
  shopping: 35,
  hotel: 30,
  airport: 220,
  convention: 70,
  religious: 10,
  competitor: 0,
};

/** Passers per hour per resident in the cell, at the residential curve's peak. */
export const RESIDENTIAL_WEIGHT = 0.035;

/** Demand radius and distance decay used by the pipeline (SPEC §5.2). */
export const DEMAND_RADIUS_M = 400;
/** decay(d) = 1 / (1 + (d / halfDistanceM)^2) — 0.5 at halfDistanceM. */
export const DECAY_HALF_DISTANCE_M = 150;

export function distanceDecay(distanceM: number): number {
  if (distanceM > DEMAND_RADIUS_M) return 0;
  return 1 / (1 + (distanceM / DECAY_HALF_DISTANCE_M) ** 2);
}

/** Categories that count as "youth places" for the 300 m alcohol rule (SPEC §4.3). */
export const YOUTH_CATEGORIES: readonly PlaceCategory[] = ['school'];
export const ALCOHOL_MIN_DISTANCE_M = 300;

/** Categories a machine can be contracted with (the venue hosts the machine). */
export const VENUE_CATEGORIES: readonly PlaceCategory[] = [
  'school',
  'university',
  'gym',
  'office',
  'hospital',
  'clinic',
  'station',
  'stadium',
  'park',
  'beach',
  'nightlife',
  'cafe',
  'restaurant',
  'fastfood',
  'shopping',
  'hotel',
  'airport',
  'convention',
];

/** Venue category display names (no logos — SPEC §4.5). */
export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  school: 'School',
  university: 'University',
  gym: 'Gym',
  office: 'Office',
  hospital: 'Hospital',
  clinic: 'Clinic',
  station: 'Station',
  stadium: 'Stadium',
  park: 'Park',
  beach: 'Beach',
  nightlife: 'Nightlife',
  cafe: 'Café',
  restaurant: 'Restaurant',
  fastfood: 'Fast food',
  shopping: 'Shopping',
  hotel: 'Hotel',
  airport: 'Airport',
  convention: 'Convention center',
  religious: 'Place of worship',
  competitor: 'Convenience store',
};

/**
 * Commission the venue asks (fraction of revenue), before negotiation.
 * High-traffic venues ask more (SPEC §4.5: 10–35%).
 */
export const VENUE_COMMISSION: Record<PlaceCategory, number> = {
  school: 0.15,
  university: 0.18,
  gym: 0.15,
  office: 0.12,
  hospital: 0.22,
  clinic: 0.12,
  station: 0.3,
  stadium: 0.28,
  park: 0.1,
  beach: 0.2,
  nightlife: 0.2,
  cafe: 0.12,
  restaurant: 0.12,
  fastfood: 0.14,
  shopping: 0.25,
  hotel: 0.2,
  airport: 0.35,
  convention: 0.25,
  religious: 0.1,
  competitor: 0.35,
};
