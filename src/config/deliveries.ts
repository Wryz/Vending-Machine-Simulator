/**
 * Restock deliveries (SPEC §4.1 Service): the player's restock is an order. A
 * van loads at the nearest real supermarket or cash-and-carry, drives to the
 * machine on the map and fills it on arrival. Times are real ms
 * (1 real min ≈ 1 business hour), kept short so the trip is fun to watch.
 */
export const DELIVERY = {
  /** Loading at the store before the van leaves. */
  loadMs: 4_000,
  /** Driving time per km of road (straight line × SERVICE.routeFactor). */
  msPerKm: 9_000,
  /** Shortest and longest drive, whatever the distance. */
  minDriveMs: 12_000,
  maxDriveMs: 75_000,
  /** Vans on the road at once, by van level (same index as SERVICE.vanCapacityByLevel). */
  vansByLevel: [1, 1, 2, 3],
} as const;
