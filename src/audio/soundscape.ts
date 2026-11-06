import { SOUNDSCAPE } from '@/config/audio';

/**
 * Pure soundscape mixer (no React Native imports; unit-tested).
 *
 * Far out the city is a soft bed. Zooming in towards the street (MapLibre zoom
 * 14.5 → 17.5) brings in traffic, people and birds, and occasional one-shot
 * "spice" (a car passing, a bird, steps). Birds belong to dawn and day,
 * crickets to warm nights, the crowd to busy daytime areas; rain and wind
 * follow the weather. The machine close-up adds the compressor hum and keeps
 * the street present but lower. Menus get the beds only.
 */

export type LayerName =
  | 'cityDay'
  | 'cityNight'
  | 'traffic'
  | 'crowd'
  | 'birds'
  | 'crickets'
  | 'rain'
  | 'wind'
  | 'hum';

export type SpiceName =
  | 'carPass'
  | 'carPass2'
  | 'hornDistant'
  | 'birdChirp'
  | 'birdChirp2'
  | 'footsteps'
  | 'sirenDistant';

export const LAYER_NAMES: readonly LayerName[] = [
  'cityDay',
  'cityNight',
  'traffic',
  'crowd',
  'birds',
  'crickets',
  'rain',
  'wind',
  'hum',
];

export const SPICE_NAMES: readonly SpiceName[] = [
  'carPass',
  'carPass2',
  'hornDistant',
  'birdChirp',
  'birdChirp2',
  'footsteps',
  'sirenDistant',
];

/** Time-of-day preset weights (src/map/timeOfDay.ts); expected to sum to 1. */
export interface TodWeights {
  night: number;
  dawn: number;
  day: number;
  dusk: number;
}

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

export interface SoundscapeInput {
  /** MapLibre camera zoom. */
  zoom: number;
  tod: TodWeights;
  weather: { condition: WeatherCondition; tempC: number } | null;
  /** 0..1: how busy the area in view is. */
  traffic: number;
  scene: 'map' | 'closeup' | 'menu';
}

export interface SoundscapeMix {
  /** 0..1 relative volume per looping layer. */
  layers: Record<LayerName, number>;
  /** Average events per minute per one-shot. */
  spiceRatePerMin: Record<SpiceName, number>;
}

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** 0 far out → 1 at street level. */
export function nearness(zoom: number): number {
  return smoothstep(SOUNDSCAPE.nearZoom[0], SOUNDSCAPE.nearZoom[1], Number.isFinite(zoom) ? zoom : 0);
}

function normTod(tod: TodWeights): TodWeights {
  const w = {
    night: clamp01(tod.night),
    dawn: clamp01(tod.dawn),
    day: clamp01(tod.day),
    dusk: clamp01(tod.dusk),
  };
  const s = w.night + w.dawn + w.day + w.dusk;
  if (s <= 0) return { night: 0, dawn: 0, day: 1, dusk: 0 };
  return { night: w.night / s, dawn: w.dawn / s, day: w.day / s, dusk: w.dusk / s };
}

/** How dark it is (0 day .. 1 night); twilight counts half. */
export function darkness(tod: TodWeights): number {
  const t = normTod(tod);
  return clamp01(t.night + 0.5 * (t.dawn + t.dusk));
}

/** Music mood for the city's time of day: evening and night get the night loop. */
export function musicMoodFor(tod: TodWeights): 'day' | 'night' {
  const t = normTod(tod);
  return t.night + 0.6 * t.dusk + 0.3 * t.dawn >= 0.5 ? 'night' : 'day';
}

function zeroLayers(): Record<LayerName, number> {
  return {
    cityDay: 0,
    cityNight: 0,
    traffic: 0,
    crowd: 0,
    birds: 0,
    crickets: 0,
    rain: 0,
    wind: 0,
    hum: 0,
  };
}

function zeroSpice(): Record<SpiceName, number> {
  return {
    carPass: 0,
    carPass2: 0,
    hornDistant: 0,
    birdChirp: 0,
    birdChirp2: 0,
    footsteps: 0,
    sirenDistant: 0,
  };
}

/** Target volumes and one-shot rates for the current view. Cheap: call it as often as needed. */
export function soundscapeMix(input: SoundscapeInput): SoundscapeMix {
  const S = SOUNDSCAPE;
  const tod = normTod(input.tod);
  const dark = darkness(tod);
  const layers = zeroLayers();
  const spice = zeroSpice();

  if (input.scene === 'menu') {
    layers.cityDay = S.bed.menu * (1 - dark);
    layers.cityNight = S.bed.menu * dark;
    return { layers: floored(layers), spiceRatePerMin: spice };
  }

  const closeup = input.scene === 'closeup';
  const near = closeup ? 1 : nearness(input.zoom);
  const spiceGate = closeup
    ? S.closeup.spice
    : smoothstep(S.spiceZoom[0], S.spiceZoom[1], Number.isFinite(input.zoom) ? input.zoom : 0);
  const busy = clamp01(input.traffic);
  const cond = input.weather?.condition ?? 'clear';
  const tempC = Number.isFinite(input.weather?.tempC) ? (input.weather?.tempC ?? 15) : 15;
  const rain = S.rainByCondition[cond] ?? 0;
  const wind = S.windByCondition[cond] ?? 0;
  /** People out and about. */
  const activity = tod.day + 0.75 * tod.dusk + 0.45 * tod.dawn + 0.12 * tod.night;

  const bed = closeup ? S.bed.closeup : S.bed.far + (S.bed.near - S.bed.far) * near;
  layers.cityDay = bed * (1 - dark);
  layers.cityNight = bed * dark;

  layers.traffic = near * (0.2 + 0.8 * busy) * (0.45 + 0.55 * activity) + (1 - near) * 0.08 * busy;
  layers.crowd =
    near ** 1.3 * (0.15 + 0.85 * busy) * activity ** 1.2 * (1 - S.rainSuppress.crowd * rain);

  const birdTime = tod.dawn + 0.7 * tod.day + 0.35 * tod.dusk;
  const cold = tempC <= S.birds.coldTempC ? S.birds.coldFactor : 1;
  layers.birds =
    near * birdTime * (1 - S.rainSuppress.birds * rain) * (1 - 0.3 * busy) * (1 - 0.5 * wind) * cold;

  const cricketTime = tod.night + 0.5 * tod.dusk;
  const warm = clamp01((tempC - S.crickets.minTempC) / (S.crickets.fullTempC - S.crickets.minTempC));
  layers.crickets = cricketTime * (0.35 + 0.65 * near) * warm * (1 - rain) * (1 - 0.5 * busy);

  layers.rain = rain * (0.65 + 0.35 * near);
  // Wind is stronger high above the city.
  layers.wind = wind * (0.55 + 0.45 * (1 - near)) + 0.06 * (1 - near);

  if (closeup) {
    layers.traffic *= S.closeup.traffic;
    layers.crowd *= S.closeup.crowd;
    layers.birds *= S.closeup.birds;
    layers.crickets *= S.closeup.crickets;
    layers.hum = 1;
  }

  const r = S.spicePerMin;
  const cars = spiceGate * near ** 1.5 * (0.15 + 0.85 * busy) * (0.3 + 0.7 * activity);
  spice.carPass = r.carPass * cars;
  spice.carPass2 = r.carPass2 * cars;
  spice.hornDistant = r.hornDistant * spiceGate * busy * activity * (1 - 0.8 * tod.night);
  const birdRate = spiceGate * clamp01(layers.birds / (closeup ? S.closeup.birds : 1));
  spice.birdChirp = r.birdChirp * birdRate;
  spice.birdChirp2 = r.birdChirp2 * birdRate;
  spice.footsteps =
    r.footsteps *
    spiceGate *
    near ** 2 *
    (0.2 + 0.8 * activity) *
    (0.3 + 0.7 * busy) *
    (1 - 0.5 * rain) *
    (closeup ? S.closeup.footsteps : 1);
  spice.sirenDistant =
    r.sirenDistant * spiceGate * (tod.night + 0.3 * tod.dusk) * (0.3 + 0.7 * busy);

  for (const k of SPICE_NAMES) spice[k] = Number.isFinite(spice[k]) ? Math.max(0, spice[k]) : 0;
  return { layers: floored(layers), spiceRatePerMin: spice };
}

function floored(layers: Record<LayerName, number>): Record<LayerName, number> {
  for (const k of LAYER_NAMES) {
    const v = clamp01(layers[k]);
    layers[k] = v < SOUNDSCAPE.floor ? 0 : v;
  }
  return layers;
}

/**
 * Which one-shot (if any) to play in the next `dtSec`, as a Poisson process
 * over the mix's rates. Deterministic for a given `rng`: draws nothing when
 * no event is possible, otherwise one draw for "whether" and, on a hit, one
 * for "which".
 */
export function pickSpice(mix: SoundscapeMix, rng: () => number, dtSec: number): SpiceName | null {
  let total = 0;
  for (const k of SPICE_NAMES) total += mix.spiceRatePerMin[k];
  if (!(total > 0) || !(dtSec > 0)) return null;
  const p = 1 - Math.exp((-total / 60) * dtSec);
  if (rng() >= p) return null;
  let u = rng() * total;
  let last: SpiceName | null = null;
  for (const k of SPICE_NAMES) {
    if (!(mix.spiceRatePerMin[k] > 0)) continue;
    last = k;
    u -= mix.spiceRatePerMin[k];
    if (u < 0) return k;
  }
  return last; // only reached through float rounding
}

/** Largest per-layer difference between two mixes (to skip redundant updates). */
export function mixDelta(a: SoundscapeMix, b: SoundscapeMix): number {
  let d = 0;
  for (const k of LAYER_NAMES) d = Math.max(d, Math.abs(a.layers[k] - b.layers[k]));
  for (const k of SPICE_NAMES)
    d = Math.max(d, Math.abs(a.spiceRatePerMin[k] - b.spiceRatePerMin[k]) / 10);
  return d;
}
