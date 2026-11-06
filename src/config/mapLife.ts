/**
 * Street life on the map (cars and pedestrians at close zoom). Data only;
 * the simulation lives in src/map/life/, the sprites in assets/sprites/life/.
 * (The 3D close-up street has its own tuning in config/streetLife.ts.)
 */

export const MAP_LIFE = {
  /** Agents appear from this zoom and are fully opaque at `fadeInEndZoom`. */
  minZoom: 16,
  fadeInEndZoom: 16.8,
  /** Simulation + GeoJSON update rate on the map. */
  fps: 14,
  /** Debounce before re-querying roads after the camera settles. */
  roadQueryDebounceMs: 350,
  /** onLifeStats callback rate limit. */
  statsIntervalMs: 500,
  /** Sale pops (receipt chip + ground ring) show from this zoom. */
  salePopMinZoom: 14,

  caps: { cars: 40, people: 80 },

  cars: {
    /** Cars per km of drivable road in view at full density (calm, not gridlock). */
    perKm: { highway: 36, major: 40, minor: 18, service: 2 },
    /** Cruise speed range by road kind, km/h. */
    speedKmh: {
      highway: [34, 40],
      major: [26, 36],
      minor: [17, 26],
      service: [12, 16],
    } as Record<string, readonly [number, number]>,
    /** Lane center offset to the right of the centerline, meters (two-way roads). */
    laneOffsetM: {
      highway: [3.2, 5.5],
      major: [2.4, 3.4],
      minor: [1.5, 2.0],
      service: [0, 0],
    } as Record<string, readonly [number, number]>,
    /** One-way roads: lanes spread over ± this half-width around the centerline. */
    onewaySpreadM: { highway: 3.5, major: 3, minor: 1.2, service: 0 } as Record<string, number>,
    accelMps2: 2.2,
    brakeMps2: 5,
    /** Center-to-center distance kept behind the car ahead at standstill. */
    followGapM: 7.5,
    /** Max turn rate of the displayed heading, deg/s. */
    turnRateDegPerS: 150,
    /** Slow to this fraction of cruise speed through sharp bends. */
    bendSlowdown: 0.45,
    /** Chance at a road end to turn when going straight is also possible. */
    turnChance: 0.25,
  },

  people: {
    /** People per km of sidewalk (each side) at full density. */
    perKm: { major: 34, minor: 26 },
    /** Walking-line offset from the road centerline, meters. */
    sidewalkOffsetM: { major: [8, 9.5], minor: [5.2, 6.8] } as Record<
      string,
      readonly [number, number]
    >,
    /** Walking speed range, km/h. */
    speedKmh: [3.9, 5.1] as const,
    /** Chance per second to pause (window shopping, phone) and for how long. */
    stopChancePerS: 0.025,
    stopSeconds: [1.5, 5] as const,
    /** One walk-cycle step per this many meters. */
    strideM: 0.7,
  },

  /**
   * Customers: for each sale while you watch (zoom >= minZoom), someone walks
   * up to the machine, stands at it, and the sale pops when they buy.
   */
  customers: {
    /** Where they come from / go to, meters along the nearest sidewalk. */
    startM: [8, 12] as const,
    exitM: [10, 15] as const,
    /** Look for a sidewalk within this distance of the machine. */
    sidewalkSearchM: 30,
    /** Standing spot in front of the machine, meters from its center. */
    standM: 1.3,
    speedKmh: 5.6,
    /** Time at the machine before the sale lands, seconds. */
    buySeconds: 1.3,
    /** Give up walking after this long (a sale is never held back for more). */
    maxWalkSeconds: 9,
    /** More waiting customers than this: the rest pop straight away. */
    max: 10,
    /** Customers per sale at most (a sale of several items brings a small group). */
    perSale: 2,
  },

  /** Spawned agents fade in/out over this many seconds. */
  fadeSeconds: 0.7,
  /** End-of-road search radius for a connecting road, meters. */
  connectRadiusM: 7,
  /** Agents further than this outside the view are dropped. */
  viewPaddingM: 40,
  /** Share of replacement spawns placed just outside the view, driving in. */
  edgeSpawnShare: 0.7,

  density: {
    /** baseTraffic total (per res-9 cell, see sim/demand) that counts as "busy". */
    busyFootTraffic: 300,
    /** Floor so a quiet residential block still has a few people by day. */
    minPeopleShare: 0.08,
    /** Weather multipliers. */
    rainPeople: 0.45,
    stormPeople: 0.25,
    snowPeople: 0.6,
    fogPeople: 0.85,
    rainCars: 0.9,
    /**
     * Relative car traffic by local hour (index 0..23): rush hours at 8 and
     * 17–18, quiet at 3 am.
     */
    carsByHourWeekday: [
      0.26, 0.18, 0.11, 0.07, 0.08, 0.15, 0.4, 0.75, 1, 0.85, 0.7, 0.7, 0.75, 0.72, 0.72, 0.8, 0.92,
      1, 0.95, 0.8, 0.66, 0.56, 0.48, 0.38,
    ],
    carsByHourRestDay: [
      0.26, 0.18, 0.12, 0.08, 0.07, 0.08, 0.14, 0.25, 0.4, 0.55, 0.65, 0.72, 0.75, 0.75, 0.74, 0.72,
      0.7, 0.68, 0.62, 0.55, 0.48, 0.42, 0.36, 0.3,
    ],
  },

  /** Night headlight pools on the road ahead of each car. */
  beams: { aheadM: 5, radiusM: 4.5, color: '#FFE7B8', opacity: 0.22 },
} as const;

/** Car sprite models (body-color). The sprite script renders exactly these. */
export const LIFE_CAR_MODELS = [
  'sedan-graphite',
  'sedan-silver',
  'sedan-white',
  'sedan-navy',
  'sedan-oxblood',
  'hatch-sage',
  'hatch-white',
  'hatch-slate',
  'hatch-sand',
  'van-white',
  'van-silver',
  'van-graphite',
  'taxi-yellow',
] as const;

/** Relative frequency of each car model (taxis common downtown, not dominant). */
export const LIFE_CAR_WEIGHTS: Record<(typeof LIFE_CAR_MODELS)[number], number> = {
  'sedan-graphite': 1.3,
  'sedan-silver': 1.3,
  'sedan-white': 1.1,
  'sedan-navy': 0.8,
  'sedan-oxblood': 0.5,
  'hatch-sage': 0.5,
  'hatch-white': 0.8,
  'hatch-slate': 0.8,
  'hatch-sand': 0.5,
  'van-white': 0.9,
  'van-silver': 0.5,
  'van-graphite': 0.5,
  'taxi-yellow': 0.9,
};

/** Pedestrian sprite variants. */
export const LIFE_PEOPLE_MODELS = ['navy', 'camel', 'olive', 'charcoal'] as const;

/** Walk-cycle frames rendered per pedestrian (0 = passing pose, 1/2 = left/right stride). */
export const LIFE_WALK_FRAMES = 3;
