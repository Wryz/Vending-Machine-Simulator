/**
 * Tunables for the data API. Data only.
 * Thresholds mirror SPEC §6.2 ("enough data" rule).
 */

/** A point within this distance of a fallback city center plays that city. */
export const CITY_RADIUS_M = 25_000;

/** SPEC §6.2: thresholds are evaluated within this radius of the start point. */
export const PLAYABLE_RADIUS_M = 2_000;
/** SPEC §6.2: at least this many named places… */
export const MIN_NAMED_PLACES = 150;
/** …in at least this many distinct categories. */
export const MIN_CATEGORIES = 6;
/** SPEC §6.2: at least this many residents. */
export const MIN_RESIDENTS = 20_000;

/** Coordinates are rounded to this many decimals (~1.1 km at the equator) before any use. */
export const COORD_DECIMALS = 2;

/** H3 resolutions (SPEC §5.2 / §6.5). */
export const REGION_RES = 5;
export const CELL_RES = 9;

/** Cache lifetimes, seconds. */
export const CACHE = {
  /** Region / city packs are immutable per pipeline run; clients revalidate with ETag. */
  pack: 'public, max-age=86400, stale-while-revalidate=604800',
  tiles: 'public, max-age=86400, stale-while-revalidate=604800',
  /** Weather: edge cache 1 h (s-maxage), clients 15 min. */
  weather: 'public, max-age=900, s-maxage=3600',
  areaCheck: 'public, max-age=3600',
  health: 'no-store',
} as const;

/** Open-Meteo request window: we ask for 3 days and slice the next 48 hours. */
export const WEATHER_HOURS = 48;
export const WEATHER_FORECAST_DAYS = 3;
/** mm/h of precipitation that maps to intensity 1.0. */
export const WEATHER_PRECIP_FULL_MM = 5;
