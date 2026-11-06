/**
 * Street life around the 3D close-up (SPEC §3.3, §7.4): pedestrians, cars,
 * street furniture and the small machine animations. Units: meters, seconds,
 * milliseconds where named. The street is laid out in the machine's local
 * frame: the machine faces +z, the facade is behind it (-z), the sidewalk is
 * in front of it and the road beyond the curb.
 */

export const STREET_LAYOUT = {
  /** Gap between the machine's back and the facade. */
  wallGapM: 0.1,
  /** Sidewalk depth from the machine's front face to the curb. */
  frontToCurbM: 2.55,
  curbHeightM: 0.14,
  laneWidthM: 3.3,
  /** Far sidewalk across the road. */
  farSidewalkM: 4,
  /** Half-length of the modelled street segment along x. */
  halfLengthM: 34,
  facadeHeightM: 9,
  /** Building depth behind the facade (hides the reflection box from above). */
  buildingDepthM: 15,
  /** Shop windows either side of the machine: inner edge, outer edge, sill, head (m). */
  shopWindow: { innerX: 1.25, outerX: 3.9, sillY: 0.45, headY: 2.7, recessM: 0.08 },
  lamp: { x: 3.7, fromCurbM: 0.35, heightM: 4.3, armM: 0.9 },
  tree: { x: -3.9, fromCurbM: 0.6, trunkM: 2.3 },
  bin: { gapM: 0.32, radiusM: 0.22, heightM: 0.86 },
  bench: { x: 2.55, lengthM: 1.6 },
} as const;

export const PEDESTRIANS = {
  /** Upper bound on people simulated at once (SPEC: 4–10 on a busy street). */
  max: 10,
  /** Walk-lane centers measured from the machine front, by walking direction. */
  laneFromFrontM: { east: 0.72, west: 1.47 },
  /** Small lateral offsets so people never walk on one line. */
  subLaneM: [-0.12, 0, 0.12],
  /** One speed per sub-lane: nobody overtakes inside their sub-lane. */
  speedsMps: [1.24, 1.33, 1.41],
  /** People enter and leave at ±this x (outside the close-up view). */
  halfSpanM: 22,
  /** Each walker slot repeats on this period with a jittered start. */
  periodS: 64,
  startJitterS: 10,
  /** Two steps; the walk cycle is driven by distance so feet never skate. */
  strideM: 1.42,
  legSwingDeg: 21,
  armSwingDeg: 13,
  /** Peak-to-peak vertical bob. */
  bobM: 0.024,
  heightM: [1.6, 1.86],
  shoulderScale: [0.88, 1.08],
  customer: {
    /** Walker slots that may stop (half a period apart: never two at once). */
    slots: [0, 5],
    chance: 0.42,
    stopS: [2, 4],
    /** Distance over which they slow down and speed up again. */
    easeM: 0.6,
    /** Lateral detour half-width around the stop point. */
    detourM: 1.4,
    /** Where they stand: x offset (the control column) and distance from the front. */
    standX: 0.2,
    standOffM: 0.42,
    turnS: 0.55,
  },
  /** Reaching into the pickup bin after a sale. */
  reach: { delayS: 0.45, inS: 0.5, holdS: 0.35, outS: 0.5, minStopLeftS: 1.7 },
} as const;

export const CARS = {
  /** Each lane repeats on this cycle; at most `maxPerCycle` cars enter per cycle. */
  cycleS: 12,
  maxPerCycle: 2,
  /** Minimum time between two cars entering a lane (no overtaking on screen). */
  minHeadwayS: 4,
  speedMps: [8, 12],
  halfSpanM: 32,
  /** Simultaneous cars rendered (2 lanes × 2 + slack). */
  capacity: 6,
  wheelRadiusM: 0.32,
} as const;

/** Countries that drive on the left (near lane flows the other way). */
export const LEFT_HAND_TRAFFIC = [
  'GB',
  'IE',
  'JP',
  'AU',
  'NZ',
  'SG',
  'HK',
  'MO',
  'IN',
  'ZA',
  'TH',
  'MY',
  'ID',
  'KE',
  'MT',
  'CY',
] as const;

/** Real foot/car traffic (baseTraffic total) → 0..1 density, square-root response. */
export const STREET_DENSITY = {
  crowdFullTraffic: 500,
  carsFullTraffic: 600,
  carsFloor: 0.1,
} as const;

export const CLOSEUP_MOTION = {
  /** Idle drift once the dolly ends: slow yaw sway and breathing. */
  idleYawDeg: 2.5,
  idleYawPeriodS: 17,
  breatheM: 0.012,
  breathePeriodS: 5.5,
  idleRampS: 2.5,
  /** Horizontal drag orbits the camera around the machine. */
  orbitMaxDeg: 35,
  orbitDegPerPt: 0.22,
  /** Exponential smoothing rate toward the dragged yaw (1/s). */
  orbitFollow: 7,
  /** Camera distance range over which orbit/drift fade out (map ↔ close-up). */
  orbitFadeM: [6, 14],
  restock: { slideMs: 250, staggerMs: 55, slideM: 0.05, maxTicks: 8, flashMs: 420 },
  drop: { tipMs: 130, fallMs: 430 },
  coins: { count: 8, doorMs: 240, firstCoinMs: 200, staggerMs: 70, slideMs: 420, holdMs: 900 },
  /** Delay before the 2D coin tray appears after the cash door opens. */
  coinTrayDelayMs: 900,
  selectedPulseS: 1.8,
  /** Broken screen flicker: bin length and dim chance per bin. */
  flicker: { binS: 0.09, dimChance: 0.11 },
} as const;
