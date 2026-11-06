/**
 * Audio tuning (SPEC §1.2 calm and premium, §3.6 sound). Used by the pure
 * soundscape mixer (src/audio/soundscape.ts) and the engine
 * (src/services/audio.ts). Asset loudness: music about -18 LUFS, ambience beds
 * about -20 LUFS, spice one-shots peak -6 dBFS; the trims below set the mix.
 */

export const AUDIO_DEFAULTS = {
  musicVolume: 0.5,
  sfxVolume: 1,
  ambienceVolume: 0.8,
} as const;

/** Steps offered by the settings screen for each volume. */
export const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

export const SOUNDSCAPE = {
  /** MapLibre zoom where street detail starts to come in, and where it is full. */
  nearZoom: [14.5, 17.5] as const,
  /** Spice one-shots start a little after detail starts. */
  spiceZoom: [15, 16.5] as const,
  /** City bed level far out, fully zoomed in, in the close-up and in menus. */
  bed: { far: 0.9, near: 0.55, closeup: 0.45, menu: 0.5 },
  /** Close-up scales the street layers down (the machine is the focus). */
  closeup: { traffic: 0.6, crowd: 0.55, birds: 0.7, crickets: 0.8, spice: 0.5, footsteps: 2 },
  /** How much rain (0..1) suppresses birds and the crowd. */
  rainSuppress: { birds: 0.75, crowd: 0.35 },
  rainByCondition: { clear: 0, cloudy: 0, fog: 0, rain: 0.7, storm: 1, snow: 0 },
  windByCondition: { clear: 0.08, cloudy: 0.15, fog: 0.05, rain: 0.25, storm: 0.9, snow: 0.5 },
  /** Crickets fade out below fullTempC and are silent at minTempC. */
  crickets: { minTempC: 5, fullTempC: 14 },
  /** Fewer birds in freezing weather. */
  birds: { coldTempC: 0, coldFactor: 0.4 },
  /** Layers below this are treated as silent (keeps the player count low). */
  floor: 0.03,
  /** Average events per minute at full strength. */
  spicePerMin: {
    carPass: 5,
    carPass2: 2.5,
    hornDistant: 0.5,
    birdChirp: 2,
    birdChirp2: 1.6,
    footsteps: 1.2,
    sirenDistant: 0.12,
  },
} as const;

export const AUDIO_MIX = {
  /** Music player volume = musicVolume × trim. */
  musicTrim: 1,
  /** Player volume per ambience layer at mix 1.0 and ambienceVolume 1. */
  layerTrim: {
    cityDay: 0.3,
    cityNight: 0.28,
    traffic: 0.3,
    crowd: 0.28,
    birds: 0.3,
    crickets: 0.22,
    rain: 0.32,
    wind: 0.26,
    hum: 0.3,
  },
  /** Spice one-shot volume (randomized down to ×spiceJitter per play). */
  spiceTrim: {
    carPass: 0.3,
    carPass2: 0.28,
    hornDistant: 0.1,
    birdChirp: 0.12,
    birdChirp2: 0.13,
    footsteps: 0.35,
    sirenDistant: 0.1,
  },
  spiceJitter: 0.55,
  /** UI / machine one-shots at sfxVolume 1. */
  sfx: {
    coin: 0.55,
    coins: 0.6,
    click: 0.4,
    thunk: 0.6,
    vend: 0.6,
    success: 0.5,
    error: 0.45,
    register: 0.5,
    drop: 0.6,
    door: 0.5,
    paper: 0.45,
    scribble: 0.5,
    whoosh: 0.35,
    pop: 0.4,
    chime: 0.5,
    notify: 0.45,
  },
  /** Ramp times in seconds. */
  ramp: { layer: 1.5, music: 3, settings: 0.4, resume: 1.2 },
  /** How often spice one-shots are rolled. */
  spiceTickSec: 1,
} as const;
