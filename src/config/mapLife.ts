/**
 * Street life on the map (pedestrians at close zoom). Data only;
 * the simulation lives in src/map/life/, the sprites in assets/sprites/life/.
 * (The 3D close-up street has its own tuning in config/streetLife.ts.)
 */
import { MAP_STYLE } from './map';

/** Ways people walk (mirrors RoadKind in src/map/life/types.ts). */
type WalkKind = 'major' | 'minor' | 'path' | 'pedestrian';

const ROAD_W = MAP_STYLE.roads.widthM;
const PATH_W = MAP_STYLE.paths.widthM;
/**
 * The sprite's feet sit a little in front of its anchor at a tilted camera,
 * so the walking line keeps about a meter clear of the drawn curb.
 */
const CURB_MARGIN_M = 1;
const SIDEWALK_BAND_M = 1.5;
const sidewalkBand = (roadWidthM: number): readonly [number, number] => [
  roadWidthM / 2 + CURB_MARGIN_M,
  roadWidthM / 2 + CURB_MARGIN_M + SIDEWALK_BAND_M,
];

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

  /** Most people simulated at once. */
  maxPeople: 80,

  people: {
    /**
     * People per km of walking line at full density: each sidewalk of a
     * street, or a whole path / pedestrian street (see `lines`).
     */
    perKm: { major: 34, minor: 26, path: 14, pedestrian: 40 } as Record<WalkKind, number>,
    /** Walking lines per way: streets have two sidewalks, paths are walked down the middle. */
    lines: { major: 2, minor: 2, path: 1, pedestrian: 1 } as Record<WalkKind, number>,
    /**
     * Walking-line offset from the centerline, meters. Streets: a sidewalk
     * band just past the drawn asphalt (half the drawn width + curb margin);
     * paths: on the path; pedestrian streets: anywhere across their width.
     */
    sidewalkOffsetM: {
      major: sidewalkBand(ROAD_W.majorCasing),
      minor: sidewalkBand(ROAD_W.minor),
      path: [0, PATH_W.path / 2 - 0.5],
      pedestrian: [0, PATH_W.pedestrian / 2 - 0.8],
    } as Record<WalkKind, readonly [number, number]>,
    /** Curb margin past the drawn asphalt edge, and the sidewalk band width, meters. */
    curbMarginM: CURB_MARGIN_M,
    sidewalkBandM: SIDEWALK_BAND_M,
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

  /**
   * Where people may not walk: water (the rendered `water` fill) and other
   * roads' drawn asphalt running alongside (dual carriageways, service roads,
   * motorways). Checked once per walking line, every `sampleM` meters.
   */
  surface: {
    sampleM: 2.5,
    /** Drawn asphalt half-width per road class, meters (major includes its casing). */
    asphaltHalfM: { major: ROAD_W.majorCasing / 2, minor: ROAD_W.minor / 2 },
    /** Clearance kept from another road's drawn edge, meters. */
    asphaltClearM: 0.5,
    /**
     * Another road only blocks a walking line it runs alongside (|cos| of the
     * angle above this); crossing a street at a corner is a crosswalk.
     */
    parallelCos: 0.8,
  },

  /** Spawned agents fade in/out over this many seconds. */
  fadeSeconds: 0.7,
  /** End-of-road search radius for a connecting road, meters. */
  connectRadiusM: 7,
  /** Agents further than this outside the view are dropped. */
  viewPaddingM: 40,
  /** Share of replacement spawns placed just outside the view, walking in. */
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
    /** Bad weather calms the city's bustle a little (soundscape busy level). */
    rainBusy: 0.9,
    /**
     * Relative street activity by local hour (index 0..23): rush hours at 8
     * and 17–18, quiet at 3 am.
     */
    busyByHourWeekday: [
      0.26, 0.18, 0.11, 0.07, 0.08, 0.15, 0.4, 0.75, 1, 0.85, 0.7, 0.7, 0.75, 0.72, 0.72, 0.8, 0.92,
      1, 0.95, 0.8, 0.66, 0.56, 0.48, 0.38,
    ],
    busyByHourRestDay: [
      0.26, 0.18, 0.12, 0.08, 0.07, 0.08, 0.14, 0.25, 0.4, 0.55, 0.65, 0.72, 0.75, 0.75, 0.74, 0.72,
      0.7, 0.68, 0.62, 0.55, 0.48, 0.42, 0.36, 0.3,
    ],
  },
} as const;

/** Pedestrian sprite variants. */
export const LIFE_PEOPLE_MODELS = ['coral', 'sky', 'mint', 'sun'] as const;

/** Walk-cycle frames rendered per pedestrian (0 = passing pose, 1/2 = left/right stride). */
export const LIFE_WALK_FRAMES = 3;
