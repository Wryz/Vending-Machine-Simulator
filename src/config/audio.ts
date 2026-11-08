/**
 * Audio tuning (SPEC §1.2 calm and premium, §3.6 sound). Used by the pure
 * soundscape mixer (src/audio/soundscape.ts) and the engine
 * (src/services/audio.ts). Asset loudness: music about -18 LUFS, ambience beds
 * about -20 LUFS, spice one-shots peak -6 dBFS, UI/machine one-shots in
 * loudness tiers (scripts/audio/sfx.mjs); the trims below set the mix.
 *
 * There is no constant city bed (it read as a loud ocean wash far out): far
 * out is near silent under the music, and each ambience comes from the places
 * that make it, near the view center (src/map/envProbe.ts).
 */

export const AUDIO_DEFAULTS = {
  musicVolume: 0.5,
  sfxVolume: 1,
  ambienceVolume: 0.8,
} as const;

/** Steps offered by the settings screen for each volume. */
export const VOLUME_STEPS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

export const SOUNDSCAPE = {
  /** MapLibre zoom where street detail starts to come in, and where it is full. */
  nearZoom: [14.5, 17.5] as const,
  /** Spice one-shots start a little after detail starts. */
  spiceZoom: [15, 16.5] as const,
  /**
   * Positional ambience: how near (meters from the view center) a source must
   * be to be heard. Full at or inside `fullM`, silent from `zeroM`.
   */
  proximity: {
    park: { fullM: 20, zeroM: 260 },
  },
  /**
   * Birds and crickets away from any green (street trees, balconies), relative
   * to right by a park. Used once the map has probed its surroundings.
   */
  awayFromGreen: { birds: 0.3, crickets: 0.2 },
  /**
   * Map probe for those sources (CityMap, on camera idle): how far around the
   * view center to look (≥ the largest zeroM), and the debounce after a move.
   */
  probe: { rangeM: 500, debounceMs: 450 },
  /** Close-up scales the street layers down (the machine is the focus). */
  closeup: { crowd: 0.55, birds: 0.7, crickets: 0.8, spice: 0.5, footsteps: 2 },
  /** How much rain (0..1) suppresses birds and the crowd. */
  rainSuppress: { birds: 0.75, crowd: 0.35 },
  /**
   * The crowd, rain and wind beds are synthesized filtered noise and read as
   * loud static on phone speakers (owner, 2026-11-08): off. Weather still
   * quiets the birds and crickets.
   */
  noiseBeds: false,
  rainByCondition: { clear: 0, cloudy: 0, fog: 0, rain: 0.7, storm: 1, snow: 0 },
  /** Wind only when it is actually windy (no constant breeze far out). */
  windByCondition: { clear: 0, cloudy: 0, fog: 0, rain: 0.2, storm: 0.85, snow: 0.4 },
  /** Crickets fade out below fullTempC and are silent at minTempC. */
  crickets: { minTempC: 5, fullTempC: 14 },
  /** Fewer birds in freezing weather. */
  birds: { coldTempC: 0, coldFactor: 0.4 },
  /** Layers below this are treated as silent (keeps the player count low). */
  floor: 0.03,
  /** Average events per minute at full strength. */
  spicePerMin: {
    birdChirp: 2,
    birdChirp2: 1.6,
    footsteps: 1.2,
  },
} as const;

export const AUDIO_MIX = {
  /** Music player volume = musicVolume × trim. */
  musicTrim: 1,
  /** Player volume per ambience layer at mix 1.0 and ambienceVolume 1. */
  layerTrim: {
    crowd: 0.28,
    birds: 0.3,
    crickets: 0.22,
    rain: 0.32,
    wind: 0.26,
    hum: 0.3,
  },
  /** Spice one-shot volume (randomized down to ×spiceJitter per play). */
  spiceTrim: {
    birdChirp: 0.12,
    birdChirp2: 0.13,
    footsteps: 0.35,
  },
  spiceJitter: 0.55,
  /**
   * UI / machine one-shots at sfxVolume 1. The assets are leveled by loudness
   * in tiers (scripts/audio/sfx.mjs: taps quietest, rewards loudest), so they
   * share one trim; change a single entry only to nudge one sound.
   */
  sfx: {
    coin: 0.4,
    coins: 0.4,
    click: 0.4,
    thunk: 0.4,
    vend: 0.4,
    success: 0.4,
    error: 0.4,
    register: 0.4,
    drop: 0.4,
    door: 0.4,
    paper: 0.4,
    scribble: 0.4,
    whoosh: 0.4,
    pop: 0.4,
    chime: 0.4,
    notify: 0.4,
  },
  /** Ramp times in seconds. */
  ramp: { layer: 1.5, music: 3, settings: 0.4, resume: 1.2 },
  /** How often spice one-shots are rolled. */
  spiceTickSec: 1,
} as const;
