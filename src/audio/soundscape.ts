import { SOUNDSCAPE } from '@/config/audio';

/**
 * Pure soundscape mixer (no React Native imports; unit-tested).
 *
 * Positional and calm: there is no constant city bed, so far out it is near
 * silent under the music. Each source is heard by how close the camera is
 * (zoom, 14.5 → 17.5 is "street level") and how near the place that makes it
 * is to the view center (`env`, probed from the map): birds by parks at dawn and day, crickets in green spots on warm
 * nights, the crowd and footsteps where the streets are busy. Rain and wind
 * follow the weather. The machine close-up adds the compressor hum and keeps
 * the street present but lower. Menus are silent (music only).
 */

export type LayerName = 'crowd' | 'birds' | 'crickets' | 'rain' | 'wind' | 'hum';

export type SpiceName = 'birdChirp' | 'birdChirp2' | 'footsteps';

export const LAYER_NAMES: readonly LayerName[] = [
  'crowd',
  'birds',
  'crickets',
  'rain',
  'wind',
  'hum',
];

export const SPICE_NAMES: readonly SpiceName[] = ['birdChirp', 'birdChirp2', 'footsteps'];

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
  busy: number;
  scene: 'map' | 'closeup' | 'menu';
  /**
   * What is around the view center (src/map/envProbe.ts): distance in meters
   * to the nearest water and green (0 = on it; null = none within range).
   * Omitted until the map has probed: then birds and crickets fall back to
   * time of day alone.
   */
  env?: SoundscapeEnv;
}

export interface SoundscapeEnv {
  waterDistM: number | null;
  parkDistM: number | null;
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
  return smoothstep(
    SOUNDSCAPE.nearZoom[0],
    SOUNDSCAPE.nearZoom[1],
    Number.isFinite(zoom) ? zoom : 0,
  );
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

/** 1 at or inside `fullM` of a source, easing to 0 at `zeroM`; 0 when there is none (null). */
export function proximity(
  distM: number | null | undefined,
  range: { fullM: number; zeroM: number },
): number {
  if (distM === null || distM === undefined || !Number.isFinite(distM)) return 0;
  return 1 - smoothstep(range.fullM, range.zeroM, Math.max(0, distM));
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
    crowd: 0,
    birds: 0,
    crickets: 0,
    rain: 0,
    wind: 0,
    hum: 0,
  };
}

function zeroSpice(): Record<SpiceName, number> {
  return { birdChirp: 0, birdChirp2: 0, footsteps: 0 };
}

/** Target volumes and one-shot rates for the current view. Cheap: call it as often as needed. */
export function soundscapeMix(input: SoundscapeInput): SoundscapeMix {
  const S = SOUNDSCAPE;
  const tod = normTod(input.tod);
  const layers = zeroLayers();
  const spice = zeroSpice();

  if (input.scene === 'menu') return { layers, spiceRatePerMin: spice };

  const closeup = input.scene === 'closeup';
  const near = closeup ? 1 : nearness(input.zoom);
  const spiceGate = closeup
    ? S.closeup.spice
    : smoothstep(S.spiceZoom[0], S.spiceZoom[1], Number.isFinite(input.zoom) ? input.zoom : 0);
  const busy = clamp01(input.busy);
  const cond = input.weather?.condition ?? 'clear';
  const tempC = Number.isFinite(input.weather?.tempC) ? (input.weather?.tempC ?? 15) : 15;
  const rain = S.rainByCondition[cond] ?? 0;
  const wind = S.windByCondition[cond] ?? 0;
  /** People out and about. */
  const activity = tod.day + 0.75 * tod.dusk + 0.45 * tod.dawn + 0.12 * tod.night;

  const env = input.env;
  /** Near green: 1 by a park, `awayFromGreen` elsewhere; 1 until the map has probed. */
  const green = (away: number) =>
    env ? away + (1 - away) * proximity(env.parkDistM, S.proximity.park) : 1;

  layers.crowd =
    near ** 1.3 * (0.15 + 0.85 * busy) * activity ** 1.2 * (1 - S.rainSuppress.crowd * rain);

  const birdTime = tod.dawn + 0.7 * tod.day + 0.35 * tod.dusk;
  const cold = tempC <= S.birds.coldTempC ? S.birds.coldFactor : 1;
  layers.birds =
    near *
    birdTime *
    (1 - S.rainSuppress.birds * rain) *
    (1 - 0.3 * busy) *
    (1 - 0.5 * wind) *
    cold *
    green(S.awayFromGreen.birds);

  const cricketTime = tod.night + 0.5 * tod.dusk;
  const warm = clamp01(
    (tempC - S.crickets.minTempC) / (S.crickets.fullTempC - S.crickets.minTempC),
  );
  layers.crickets =
    cricketTime *
    (0.35 + 0.65 * near) *
    warm *
    (1 - rain) *
    (1 - 0.5 * busy) *
    green(S.awayFromGreen.crickets);

  layers.rain = rain * (0.65 + 0.35 * near);
  // Wind (only in windy weather) is a bit stronger high above the city.
  layers.wind = wind * (0.55 + 0.45 * (1 - near));

  if (closeup) {
    layers.crowd *= S.closeup.crowd;
    layers.birds *= S.closeup.birds;
    layers.crickets *= S.closeup.crickets;
    layers.hum = 1;
  }

  const r = S.spicePerMin;
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
