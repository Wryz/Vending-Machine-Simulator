import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useProfile } from '@/store/profile';

/**
 * Sound (SPEC §3.6): soft mechanical clicks, coin clinks, compressor hum near
 * machines, distant city ambience by time of day. No loud jingles.
 * Files are synthesized by scripts/audio/generate.mjs.
 */

const SOURCES = {
  coin: require('../../assets/audio/coin.wav'),
  coins: require('../../assets/audio/coins-stack.wav'),
  click: require('../../assets/audio/click.wav'),
  thunk: require('../../assets/audio/thunk.wav'),
  vend: require('../../assets/audio/vend.wav'),
  success: require('../../assets/audio/success.wav'),
  error: require('../../assets/audio/error.wav'),
  hum: require('../../assets/audio/hum.wav'),
  cityDay: require('../../assets/audio/city-day.wav'),
  cityNight: require('../../assets/audio/city-night.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;
type OneShot = Exclude<SoundName, 'hum' | 'cityDay' | 'cityNight'>;

const VOLUME: Record<SoundName, number> = {
  coin: 0.55,
  coins: 0.6,
  click: 0.4,
  thunk: 0.6,
  vend: 0.6,
  success: 0.5,
  error: 0.45,
  hum: 0.18,
  cityDay: 0.22,
  cityNight: 0.18,
};

const pools = new Map<SoundName, AudioPlayer[]>();
let next = 0;
let ambience: AudioPlayer | null = null;
let ambienceName: SoundName | null = null;
let initialized = false;

function enabled(): boolean {
  return useProfile.getState().settings.sound;
}

function player(name: SoundName): AudioPlayer {
  let pool = pools.get(name);
  if (!pool) {
    // A few voices per one-shot so rapid coins can overlap.
    pool = Array.from({ length: name === 'coin' ? 4 : 1 }, () => {
      const p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name];
      return p;
    });
    pools.set(name, pool);
  }
  next = (next + 1) % pool.length;
  return pool[next];
}

export const sound = {
  async init() {
    if (initialized) return;
    initialized = true;
    // Respect the silent switch; mix with the player's music.
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(
      () => undefined,
    );
  },
  play(name: OneShot) {
    if (!enabled()) return;
    try {
      const p = player(name);
      p.seekTo(0).catch(() => undefined);
      p.play();
    } catch {
      // Audio is optional; never crash gameplay for it.
    }
  },
  /** City ambience loop: day or night bed. */
  ambience(name: 'cityDay' | 'cityNight' | null) {
    if (!enabled() || name === null) {
      ambience?.pause();
      ambienceName = null;
      return;
    }
    if (ambienceName === name) return;
    ambience?.pause();
    try {
      ambience = createAudioPlayer(SOURCES[name]);
      ambience.loop = true;
      ambience.volume = VOLUME[name];
      ambience.play();
      ambienceName = name;
    } catch {
      ambience = null;
    }
  },
  /** Compressor hum while looking at a machine close-up. */
  hum(on: boolean) {
    const p = player('hum');
    p.loop = true;
    if (on && enabled()) p.play();
    else p.pause();
  },
};
