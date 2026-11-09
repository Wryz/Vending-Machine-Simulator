/**
 * Restock deliveries (SPEC §4.1 Service): the player's restock is an order. A
 * van loads at the nearest real warehouse (industrial area) or cash-and-carry, drives along the streets to the
 * machine on the map and fills it on arrival. Times are real ms
 * (1 real min ≈ 1 business hour), kept short so the trip is fun to watch.
 */
export const DELIVERY = {
  /** Loading at the store before the van leaves. */
  loadMs: 4_000,
  /** Driving time per km of road (street route; straight line × SERVICE.routeFactor without road data). */
  msPerKm: 9_000,
  /** Shortest and longest drive, whatever the distance. */
  minDriveMs: 12_000,
  maxDriveMs: 75_000,
  /** Vans on the road at once, by van level (same index as SERVICE.vanCapacityByLevel). */
  vansByLevel: [1, 1, 2, 3],
  /** Warehouses (closest in a straight line) compared by road to pick the nearest drive. */
  routeCandidates: 4,
  /** Unloading at each stop of a multi-stop run before driving to the next. */
  unloadMs: 3_000,
  /**
   * A driver puts items into the machine one at a time: one every this many
   * business ms (owner's call, 2026-11-09: 2 s; at 16× that is 8 items a real second).
   */
  driverItemBusinessMs: 2_000,
} as const;

/** The map's "Restock low" key: one van runs to every machine running low. */
export const RESTOCK_RUN = {
  /** A machine is low at or under this share of its full capacity. */
  lowShare: 0.5,
  /** Stops per run (the van's capacity is shared between them). */
  maxStops: 6,
} as const;

/** Street routing for the vans (src/sim/roads.ts). */
export const ROADS = {
  /** Driving speed by road class: highway, major road, minor street (km/h). */
  speedKmhByClass: [55, 35, 22],
  /** Nearest-road index cell size, degrees (~200 m). */
  bucketDeg: 0.002,
  /** Give up snapping to a road this many cells away (~2 km). */
  maxSnapRings: 10,
  /** Longest path kept on a delivery (points); longer ones are thinned. */
  maxPathPoints: 400,
  /** Street routes remembered per city (drivers repeat the same legs every run). */
  routeCacheSize: 256,
} as const;
