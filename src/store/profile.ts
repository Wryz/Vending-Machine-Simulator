import { create } from 'zustand';

import { AUDIO_DEFAULTS } from '@/config/audio';
import { readJson, writeJson } from '@/services/storage';
import type { World } from '@/sim';

/**
 * Cross-city profile: settings, entitlements and the list of city save slots.
 * Local only (SPEC §7.5).
 */
export type CityInfo = World['city'] & { kind: 'fallback' | 'area'; res5?: string };

export interface Settings {
  /** Master sound switch (music, effects and ambience). */
  sound: boolean;
  /** 0..1 volumes under the master switch. */
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  haptics: boolean;
  notifications: { enabled: boolean; empty: boolean; cashFull: boolean; events: boolean };
  /** UI theme follows the city's real time (default) or the phone. */
  theme: 'city' | 'system';
  /** Temperature unit: 'auto' = °F in °F countries (src/config/climate.ts), else °C. */
  tempUnit: 'auto' | 'c' | 'f';
  /** Opt-in to personalized ads (asks App Tracking Transparency). */
  personalizedAds: boolean;
  analytics: boolean;
}

export interface Entitlements {
  removeAds: boolean;
  starterPackClaimed: boolean;
  /** Bought (restored) but not yet delivered to a game on this install. */
  starterPackOwed?: boolean;
  starterPackOffered: boolean;
  wraps: string[];
}

export interface Profile {
  version: 1;
  installId: string;
  onboarded: boolean;
  lastCityKey: string | null;
  cities: Record<string, CityInfo>;
  settings: Settings;
  entitlements: Entitlements;
  /** Unlocked features the player has opened at least once (for the NEW badge). */
  seenFeatures?: string[];
  /** The player closed the first-machine tutorial. */
  tutorialHidden?: boolean;
  /** UI language (BCP 47), or null to follow the phone. */
  language?: string | null;
}

const DEFAULT: Profile = {
  version: 1,
  installId: '',
  onboarded: false,
  lastCityKey: null,
  cities: {},
  settings: {
    sound: true,
    musicVolume: AUDIO_DEFAULTS.musicVolume,
    sfxVolume: AUDIO_DEFAULTS.sfxVolume,
    ambienceVolume: AUDIO_DEFAULTS.ambienceVolume,
    haptics: true,
    notifications: { enabled: false, empty: true, cashFull: true, events: true },
    theme: 'city',
    tempUnit: 'auto',
    personalizedAds: false,
    analytics: true,
  },
  entitlements: {
    removeAds: false,
    starterPackClaimed: false,
    starterPackOffered: false,
    wraps: [],
  },
};

function randomId(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

interface ProfileStore extends Profile {
  loaded: boolean;
  load(): void;
  update(fn: (p: Profile) => void): void;
  setSettings(patch: Partial<Settings>): void;
}

export const useProfile = create<ProfileStore>((set, get) => ({
  ...DEFAULT,
  loaded: false,
  load() {
    const saved = readJson<Profile>('profile');
    const merged: Profile = {
      ...DEFAULT,
      ...(saved ?? {}),
      settings: {
        ...DEFAULT.settings,
        ...(saved?.settings ?? {}),
        notifications: {
          ...DEFAULT.settings.notifications,
          ...(saved?.settings?.notifications ?? {}),
        },
      },
      entitlements: { ...DEFAULT.entitlements, ...(saved?.entitlements ?? {}) },
    };
    if (!merged.installId) merged.installId = randomId();
    set({ ...merged, loaded: true });
    writeJson('profile', merged);
  },
  update(fn) {
    const { load: _l, update: _u, setSettings: _s, loaded: _ld, ...current } = get();
    const next = JSON.parse(JSON.stringify(current)) as Profile;
    fn(next);
    set(next);
    writeJson('profile', next);
  },
  setSettings(patch) {
    get().update((p) => {
      p.settings = { ...p.settings, ...patch };
    });
  },
}));

export function cityKey(c: CityInfo): string {
  return c.kind === 'fallback' ? c.id : `area-${c.res5 ?? c.id}`;
}
