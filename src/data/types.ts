/**
 * Shared data contracts between the offline pipeline (pipeline/), the data API
 * (workers/data-api/) and the app. Keep this file dependency-free: the Worker
 * and pipeline import it directly.
 */

/** Game place taxonomy (SPEC §6.4). */
export const PLACE_CATEGORIES = [
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
  'shopping',
  'hotel',
  'airport',
  'convention',
  'religious',
  'competitor',
  /** Fast food (split from restaurant 2026-11; appended so category bitmasks keep their bits). */
  'fastfood',
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export type CategoryNumbers = Partial<Record<PlaceCategory, number>>;

export interface NamedPlace {
  /** Stable id from the source dataset (e.g. "osm:n123" or "ovt:..."). */
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
}

/** One H3 resolution-9 cell (~0.1 km²). */
export interface CellData {
  /** H3 index, resolution 9. */
  id: string;
  lat: number;
  lng: number;
  /** Estimated residents in the cell. */
  pop: number;
  /** Raw counts of places inside the cell. */
  counts: CategoryNumbers;
  /**
   * Distance-decayed place counts within the demand radius (400 m) around the
   * cell center: Σ decay(distance) per category. Category weights are applied
   * at runtime from src/config/places.ts so they stay tunable.
   */
  nearby: CategoryNumbers;
  /** Named places inside the cell (capped per category). */
  places: NamedPlace[];
  /** Existing real vending / convenience competitors within the radius. */
  competitors: number;
  /** 0 (busy, overlooked) .. 1 (isolated) — feeds theft risk. */
  isolation: number;
}

/** A store a delivery van loads at: a wholesaler or a supermarket (real name, no logo). */
export interface Supplier {
  id: string;
  name: string;
  kind: 'wholesale' | 'supermarket';
  lat: number;
  lng: number;
}

export interface RegionPack {
  schemaVersion: 1;
  /** Fallback city id, or undefined for a "your area" region. */
  cityId?: string;
  /** H3 resolution-5 parent (for "your area" regions). */
  res5?: string;
  name: string;
  center: { lat: number; lng: number };
  generatedAt: string;
  /** Human-readable data sources for the credits screen. */
  sources: string[];
  cells: CellData[];
  /** Wholesalers and supermarkets that delivery vans load at (packs from 2026-11-07 on). */
  suppliers?: Supplier[];
}

export interface AreaCheckResponse {
  playable: boolean;
  cityName: string | null;
  reason:
    'ok' | 'not_enough_places' | 'not_enough_population' | 'region_not_computed' | 'bad_request';
  centroid: { lat: number; lng: number } | null;
  /** Fallback city id when the point is inside one of the 9 bundled cities. */
  cityId?: string;
  /** H3 res-5 region to download via GET /cells/{res5}.bin. */
  res5?: string;
}

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

export interface WeatherHour {
  /** ISO hour, UTC. */
  time: string;
  tempC: number;
  condition: WeatherCondition;
  /** 0..1 */
  precipitation: number;
}

export interface WeatherResponse {
  region: string;
  fetchedAt: string;
  source: string;
  hours: WeatherHour[];
}
