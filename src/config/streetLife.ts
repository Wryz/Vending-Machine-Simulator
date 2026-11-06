/**
 * Street life around the 3D close-up (SPEC §3.3, §7.4): pedestrians,
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
  laneFromFrontM: { east: 0.86, west: 1.42 },
  /** Small lateral offsets so people never walk on one line. */
  subLaneM: [-0.05, 0, 0.05],
  /**
   * One speed per direction: start times are spaced, so nobody overtakes
   * (and walks through) anybody.
   */
  speedsMps: { east: 1.3, west: 1.38 },
  /** People enter and leave at ±this x (outside the close-up view). */
  halfSpanM: 22,
  /** Each walker slot repeats on this period with a jittered start. */
  periodS: 64,
  startJitterS: 10,
  /** Two steps; the walk cycle is driven by distance so feet never skate. */
  strideM: 1.42,
  /** Stubby toy legs have no knee: a wider swing reads as a waddling stride. */
  legSwingDeg: 28,
  armSwingDeg: 22,
  /** Side-to-side body roll per step (toy waddle). */
  waddleDeg: 3,
  /** Share of the stance-leg hip drop kept (1 = rigid-leg bob, 0 = none). */
  bobDamping: 0.45,
  heightM: [1.6, 1.86],
  shoulderScale: [0.88, 1.08],
  customer: {
    /** East-bound walker slots that may stop (half a period apart: never two at once). */
    slots: [0, 6],
    chance: 0.42,
    stopS: [2, 4],
    /** Distance over which they slow down and speed up again. */
    easeM: 0.6,
    /** Lateral detour half-width around the stop point. */
    detourM: 1.4,
    /** Where they stand: x offset (the control column) and distance from the front. */
    standX: 0.2,
    standOffM: 0.38,
    turnS: 0.55,
  },
  /** Reaching into the pickup bin after a sale. */
  reach: { delayS: 0.45, inS: 0.5, holdS: 0.35, outS: 0.5, minStopLeftS: 1.7 },
} as const;

/**
 * Simple toy-figure people (SPEC §3.3): a round head, a rounded bean body and
 * stubby rounded limbs, no hands, feet or hair. Meters at the 1.75 m reference
 * height (each person is scaled to their own height). Shared by the close-up
 * crowd (src/three/life/people.ts) and the map sprites (scripts/sprites/life).
 */
export const PERSON_SHAPE = {
  refHeightM: 1.75,
  /** Hip pivot height = leg length (hip to the rounded leg tip on the ground). */
  legM: 0.6,
  legRadiusM: 0.088,
  hipXM: 0.105,
  /** Bean body: bottom and top heights, widest radius, depth / width ratio. */
  body: { bottomM: 0.47, topM: 1.31, radiusM: 0.235, depth: 0.8 },
  head: { centerYM: 1.535, radiusM: 0.215 },
  arm: { shoulderYM: 1.17, shoulderXM: 0.235, lengthM: 0.44, radiusM: 0.066, splayRad: 0.16 },
  /** Share of people in short sleeves (skin-colored arms). */
  bareArmsShare: 0.3,
  /** Squatting at the pickup bin: legs forward and out, body leans, small step back. */
  crouch: { hipRad: 0.95, splayRad: 0.32, leanRad: 0.5, stepBackM: 0.14 },
} as const;

/** Real foot traffic (baseTraffic total) → 0..1 crowd, square-root response. */
export const STREET_DENSITY = {
  crowdFullTraffic: 500,
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
  /** A 3D slot tap arriving this soon after an orbit drag ended is the drag's tail, not a tap. */
  orbitTapGuardMs: 150,
  restock: { slideMs: 250, staggerMs: 55, slideM: 0.05, maxTicks: 8, flashMs: 420 },
  drop: { tipMs: 130, fallMs: 430 },
  coins: { count: 8, doorMs: 240, firstCoinMs: 200, staggerMs: 70, slideMs: 420, holdMs: 900 },
  /** Delay before the 2D coin tray appears after the cash door opens. */
  coinTrayDelayMs: 1000,
  selectedPulseS: 1.8,
  /** Broken screen flicker: bin length and dim chance per bin. */
  flicker: { binS: 0.09, dimChance: 0.11 },
} as const;
