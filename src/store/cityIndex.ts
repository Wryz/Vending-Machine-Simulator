import { create } from 'zustand';

import { REGION_INDEX } from '@assets/cities';
import { fetchCityIndex } from '@/data/api';
import type { CityIndexEntry } from '@/data/types';
import { readJson, writeJson } from '@/services/storage';

/**
 * Every playable city for the picker: the copy bundled with the app, replaced
 * by the newest list from the data API (regions keep being built), kept on
 * device so the globe works offline.
 */
const KEY = 'city-index';
const REFRESH_MS = 24 * 3_600_000;

interface Stored {
  at: number;
  entries: CityIndexEntry[];
}

interface CityIndexStore {
  entries: CityIndexEntry[];
  refresh(): Promise<void>;
}

const stored = readJson<Stored>(KEY);

export const useCityIndex = create<CityIndexStore>((set) => ({
  entries:
    stored && stored.entries.length >= REGION_INDEX.length ? stored.entries : REGION_INDEX,
  async refresh() {
    const last = readJson<Stored>(KEY);
    if (last && Date.now() - last.at < REFRESH_MS) return;
    try {
      const entries = await fetchCityIndex();
      if (!Array.isArray(entries) || entries.length === 0) return;
      writeJson(KEY, { at: Date.now(), entries } satisfies Stored);
      set({ entries });
    } catch {
      // Offline or no data API: the bundled list still works.
    }
  },
}));
