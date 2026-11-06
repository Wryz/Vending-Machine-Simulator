import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import {
  LAYER_NAMES,
  mixDelta,
  pickSpice,
  soundscapeMix,
  type LayerName,
  type SoundscapeInput,
  type SoundscapeMix,
  type SpiceName,
} from '@/audio/soundscape';
import { AUDIO_MIX } from '@/config/audio';
import { useProfile } from '@/store/profile';

/**
 * Audio engine (SPEC §3.6): soft mechanical clicks, coin clinks, compressor
 * hum near machines, a city that sounds alive when you zoom in, and calm
 * music underneath. Files are synthesized by scripts/audio/generate.mjs and
 * scripts/audio/music.mjs. Tuning lives in src/config/audio.ts.
 *
 * Public API
 *   sound.init()                       audio session: respects the silent switch, mixes with other apps
 *   sound.play(name)                   one-shot; unknown names are a silent no-op
 *     names: coin coins click thunk vend success error register drop door paper
 *            scribble whoosh pop chime notify
 *   sound.hum(on)                      compressor hum (shares the soundscape's hum layer)
 *   sound.suspend() / sound.resume()   app background / foreground: halts every loop, fades back in
 *   music.start() / music.stop()       background loop, fades in/out
 *   music.setMood('day' | 'night')     ~3 s crossfade between the two loops
 *   music.pause() / music.resume()     app background / foreground
 *   soundscape.update(input)           ambience for the current view (cheap; call on camera moves)
 *   soundscape.pause() / .resume()     app background / foreground (or leaving the game)
 *
 * Volumes follow Settings: `sound` is the master switch, then musicVolume,
 * sfxVolume and ambienceVolume (0..1). Everything is best effort: audio errors
 * never reach gameplay. Loops fade with stepped volume ramps on one timer and
 * are paused while silent, so only a handful of players run at once.
 */

const SFX_SOURCES = {
  coin: require('../../assets/audio/coin.wav'),
  coins: require('../../assets/audio/coins-stack.wav'),
  click: require('../../assets/audio/click.wav'),
  thunk: require('../../assets/audio/thunk.wav'),
  vend: require('../../assets/audio/vend.wav'),
  success: require('../../assets/audio/success.wav'),
  error: require('../../assets/audio/error.wav'),
  register: require('../../assets/audio/register.wav'),
  drop: require('../../assets/audio/drop.wav'),
  door: require('../../assets/audio/door.wav'),
  paper: require('../../assets/audio/paper.wav'),
  scribble: require('../../assets/audio/scribble.wav'),
  whoosh: require('../../assets/audio/whoosh.wav'),
  pop: require('../../assets/audio/pop.wav'),
  chime: require('../../assets/audio/chime.wav'),
  notify: require('../../assets/audio/notify.wav'),
} as const;

export type SfxName = keyof typeof SFX_SOURCES;
/** @deprecated use SfxName */
export type SoundName = SfxName;

const LAYER_SOURCES: Record<LayerName, number> = {
  cityDay: require('../../assets/audio/city-day.m4a'),
  cityNight: require('../../assets/audio/city-night.m4a'),
  traffic: require('../../assets/audio/amb-traffic.m4a'),
  crowd: require('../../assets/audio/amb-crowd.m4a'),
  birds: require('../../assets/audio/amb-birds.m4a'),
  crickets: require('../../assets/audio/amb-crickets.m4a'),
  rain: require('../../assets/audio/amb-rain.m4a'),
  wind: require('../../assets/audio/amb-wind.m4a'),
  hum: require('../../assets/audio/hum.wav'),
};

const SPICE_SOURCES: Record<SpiceName, number> = {
  carPass: require('../../assets/audio/car-pass.m4a'),
  carPass2: require('../../assets/audio/car-pass-2.m4a'),
  hornDistant: require('../../assets/audio/horn-distant.m4a'),
  birdChirp: require('../../assets/audio/bird-chirp.m4a'),
  birdChirp2: require('../../assets/audio/bird-chirp-2.m4a'),
  footsteps: require('../../assets/audio/footsteps.m4a'),
  sirenDistant: require('../../assets/audio/siren-distant.m4a'),
};

type Mood = 'day' | 'night';
const MUSIC_SOURCES: Record<Mood, number> = {
  day: require('../../assets/audio/music-day.m4a'),
  night: require('../../assets/audio/music-night.m4a'),
};

/** Voices per one-shot so quick repeats overlap instead of cutting off. */
const VOICES: Partial<Record<SfxName, number>> = { coin: 4, coins: 2, click: 2, pop: 2 };

const TICK_MS = 100;
const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    // Audio is optional; never crash gameplay for it.
  }
}

// ---------- settings ----------
function settings() {
  const s = useProfile.getState().settings;
  return {
    on: s.sound !== false,
    music: clamp01(s.musicVolume ?? 0.5),
    sfx: clamp01(s.sfxVolume ?? 1),
    ambience: clamp01(s.ambienceVolume ?? 0.8),
  };
}

// ---------- faders: looping players with stepped volume ramps ----------
interface Fader {
  source: number;
  player: AudioPlayer | null;
  playing: boolean;
  current: number;
  target: number;
  /** Volume units per second. */
  rate: number;
}

const faders = new Map<string, Fader>();
let ticker: ReturnType<typeof setInterval> | null = null;

function fader(key: string, source: number): Fader {
  let f = faders.get(key);
  if (!f) {
    f = { source, player: null, playing: false, current: 0, target: 0, rate: 1 };
    faders.set(key, f);
  }
  return f;
}

function ensurePlayer(f: Fader): AudioPlayer | null {
  if (f.player) return f.player;
  try {
    const p = createAudioPlayer(f.source, { updateInterval: 2000 });
    p.loop = true;
    p.volume = 0;
    f.player = p;
  } catch {
    f.player = null;
  }
  return f.player;
}

function setTarget(f: Fader, value: number, sec: number): void {
  const v = clamp01(value);
  if (Math.abs(v - f.target) < 0.001 && (v > 0 || !f.playing)) return;
  f.target = v;
  f.rate = Math.max(Math.abs(v - f.current) / Math.max(0.05, sec), 0.02);
  if (v > 0 && !f.playing && !suspended) {
    const p = ensurePlayer(f);
    if (!p) return;
    safe(() => {
      p.volume = f.current;
      p.play();
      f.playing = true;
    });
  }
  if (!ticker) ticker = setInterval(step, TICK_MS);
}

function step(): void {
  let moving = false;
  const dt = TICK_MS / 1000;
  for (const f of faders.values()) {
    if (f.current !== f.target) {
      const d = f.target - f.current;
      const s = f.rate * dt;
      f.current = Math.abs(d) <= s ? f.target : f.current + Math.sign(d) * s;
      const p = f.player;
      if (p) safe(() => (p.volume = f.current));
      if (f.current !== f.target) moving = true;
    }
    if (f.playing && f.current === 0 && f.target === 0) {
      const p = f.player;
      if (p) safe(() => p.pause());
      f.playing = false;
    }
  }
  if (!moving && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

/** Hard stop of every loop (app going to background: timers will not run). */
function haltAll(): void {
  for (const f of faders.values()) {
    const p = f.player;
    if (p && f.playing) safe(() => p.pause());
    f.playing = false;
    f.current = 0;
    f.target = 0;
    if (p) safe(() => (p.volume = 0));
  }
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

// ---------- state ----------
let initialized = false;
let suspended = false;
const musicState = { started: false, paused: false, mood: 'day' as Mood };
const scape = {
  mix: null as SoundscapeMix | null,
  input: null as SoundscapeInput | null,
  paused: false,
  /** True once a screen drives the soundscape (the legacy `ambience` shim then steps aside). */
  driven: false,
};
let humForced = false;
let spiceTimer: ReturnType<typeof setInterval> | null = null;
const spicePlayers = new Map<SpiceName, AudioPlayer>();

function ensureInit(): void {
  if (initialized) return;
  initialized = true;
  safe(() => {
    useProfile.subscribe((s, prev) => {
      if (s.settings !== prev.settings) applyTargets(AUDIO_MIX.ramp.settings);
    });
  });
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(
    () => undefined,
  );
}

function layerTarget(name: LayerName): number {
  const s = settings();
  if (!s.on || suspended) return 0;
  let level = !scape.paused && scape.mix ? scape.mix.layers[name] : 0;
  if (name === 'hum' && humForced) level = 1;
  return level * AUDIO_MIX.layerTrim[name] * s.ambience;
}

function applyLayer(name: LayerName, sec: number): void {
  const v = layerTarget(name);
  const key = `layer:${name}`;
  if (v > 0 || faders.has(key)) setTarget(fader(key, LAYER_SOURCES[name]), v, sec);
}

/** Recompute every loop's target from the logical state and settings. */
function applyTargets(sec?: number): void {
  const s = settings();
  const live = s.on && !suspended;
  for (const mood of ['day', 'night'] as const) {
    const on = live && musicState.started && !musicState.paused && musicState.mood === mood;
    const v = on ? s.music * AUDIO_MIX.musicTrim : 0;
    const key = `music:${mood}`;
    if (v > 0 || faders.has(key))
      setTarget(fader(key, MUSIC_SOURCES[mood]), v, sec ?? AUDIO_MIX.ramp.music);
  }
  for (const name of LAYER_NAMES) applyLayer(name, sec ?? AUDIO_MIX.ramp.layer);
  syncSpiceTimer(live && !scape.paused && scape.mix !== null && s.ambience > 0);
}

function syncSpiceTimer(on: boolean): void {
  if (on && !spiceTimer) {
    spiceTimer = setInterval(spiceTick, AUDIO_MIX.spiceTickSec * 1000);
  } else if (!on && spiceTimer) {
    clearInterval(spiceTimer);
    spiceTimer = null;
  }
}

function spiceTick(): void {
  const mix = scape.mix;
  if (!mix) return;
  const name = pickSpice(mix, Math.random, AUDIO_MIX.spiceTickSec);
  if (!name) return;
  safe(() => {
    let p = spicePlayers.get(name);
    if (!p) {
      p = createAudioPlayer(SPICE_SOURCES[name], { updateInterval: 2000 });
      spicePlayers.set(name, p);
    } else if (p.playing) {
      return; // the same sound twice at once sounds fake
    }
    const j = AUDIO_MIX.spiceJitter;
    p.volume = AUDIO_MIX.spiceTrim[name] * settings().ambience * (j + (1 - j) * Math.random());
    const player = p;
    player.seekTo(0).catch(() => undefined);
    player.play();
  });
}

// ---------- one-shots ----------
const pools = new Map<SfxName, AudioPlayer[]>();
const nextVoice = new Map<SfxName, number>();

function isSfx(name: string): name is SfxName {
  return Object.prototype.hasOwnProperty.call(SFX_SOURCES, name);
}

function voice(name: SfxName): AudioPlayer {
  let pool = pools.get(name);
  if (!pool) {
    pool = Array.from({ length: VOICES[name] ?? 1 }, () => createAudioPlayer(SFX_SOURCES[name]));
    pools.set(name, pool);
  }
  const i = ((nextVoice.get(name) ?? -1) + 1) % pool.length;
  nextVoice.set(name, i);
  return pool[i];
}

// ---------- public API ----------
export const sound = {
  /** Configure the audio session (safe to call more than once). */
  async init(): Promise<void> {
    ensureInit();
  },

  /** Play a one-shot. Unknown names are ignored. */
  play(name: SfxName | (string & Record<never, never>)): void {
    if (!isSfx(name)) return;
    const s = settings();
    if (!s.on || s.sfx <= 0) return;
    ensureInit();
    safe(() => {
      const p = voice(name);
      p.volume = AUDIO_MIX.sfx[name] * s.sfx;
      p.seekTo(0).catch(() => undefined);
      p.play();
    });
  },

  /** Compressor hum while looking at a machine close-up. */
  hum(on: boolean): void {
    ensureInit();
    humForced = on;
    safe(() => applyLayer('hum', on ? 0.8 : AUDIO_MIX.ramp.layer));
  },

  /** App going to background: stop every loop at once (timers will not run). */
  suspend(): void {
    suspended = true;
    syncSpiceTimer(false);
    haltAll();
  },

  /** Back to foreground: fade music and ambience back in. */
  resume(): void {
    if (!suspended) return;
    suspended = false;
    safe(() => applyTargets(AUDIO_MIX.ramp.resume));
  },

  /**
   * @deprecated Use `soundscape.update()`. Kept so older call sites work: drives
   * a mid-zoom city mix until a screen calls `soundscape.update()`.
   */
  ambience(name: 'cityDay' | 'cityNight' | null): void {
    ensureInit();
    if (name === null) {
      soundscape.pause();
      return;
    }
    if (scape.driven) return;
    const night = name === 'cityNight';
    setMix({
      zoom: 15.5,
      tod: { night: night ? 1 : 0, dawn: 0, day: night ? 0 : 1, dusk: 0 },
      weather: null,
      traffic: 0.5,
      scene: 'map',
    });
    scape.paused = false;
    safe(() => applyTargets());
  },
};

function setMix(input: SoundscapeInput): boolean {
  const mix = soundscapeMix(input);
  scape.input = input;
  if (scape.mix && mixDelta(scape.mix, mix) < 0.005) return false;
  scape.mix = mix;
  return true;
}

export const music = {
  /** Start (or keep) the background music with a gentle fade-in. */
  start(mood?: Mood): void {
    ensureInit();
    if (mood) musicState.mood = mood;
    if (musicState.started && !musicState.paused) return;
    musicState.started = true;
    musicState.paused = false;
    safe(() => applyTargets(AUDIO_MIX.ramp.music));
  },
  stop(): void {
    musicState.started = false;
    safe(() => applyTargets(AUDIO_MIX.ramp.music));
  },
  /** Crossfade to the day or night loop. */
  setMood(mood: Mood): void {
    if (musicState.mood === mood) return;
    musicState.mood = mood;
    if (musicState.started) safe(() => applyTargets(AUDIO_MIX.ramp.music));
  },
  get mood(): Mood {
    return musicState.mood;
  },
  pause(): void {
    musicState.paused = true;
    for (const mood of ['day', 'night'] as const) {
      const f = faders.get(`music:${mood}`);
      if (!f) continue;
      const p = f.player;
      if (p && f.playing) safe(() => p.pause());
      f.playing = false;
      f.current = 0;
      f.target = 0;
    }
  },
  resume(): void {
    if (!musicState.paused) return;
    musicState.paused = false;
    safe(() => applyTargets(AUDIO_MIX.ramp.resume));
  },
};

export const soundscape = {
  /**
   * Ambience for what is on screen. Cheap enough to call on every camera
   * change (it only touches players when the mix actually moves).
   */
  update(input: SoundscapeInput): void {
    ensureInit();
    scape.driven = true;
    let changed = false;
    safe(() => {
      changed = setMix(input);
    });
    if (changed && !scape.paused) safe(() => applyTargets());
  },
  /** Silence the ambience and stop spice (keeps the last mix for resume). */
  pause(): void {
    scape.paused = true;
    syncSpiceTimer(false);
    for (const name of LAYER_NAMES) {
      if (name === 'hum' && humForced) continue;
      const f = faders.get(`layer:${name}`);
      if (!f) continue;
      const p = f.player;
      if (p && f.playing) safe(() => p.pause());
      f.playing = false;
      f.current = 0;
      f.target = 0;
    }
  },
  resume(): void {
    if (!scape.paused) return;
    scape.paused = false;
    safe(() => applyTargets(AUDIO_MIX.ramp.resume));
  },
  /** The current mix (for diagnostics). */
  get mix(): SoundscapeMix | null {
    return scape.mix;
  },
};
