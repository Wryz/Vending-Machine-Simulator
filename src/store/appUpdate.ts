import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { LINKS, UPDATE_CHECK } from '@/config/links';
import { isNewer } from '@/data/version';

/**
 * Is a newer Coinline on the App Store? Settings shows an update key when so
 * (nothing pops up on its own). Apple's lookup is public; it is asked with the
 * app's bundle id only, at most every few hours.
 */
interface AppUpdateStore {
  /** The App Store's version when it is newer than this build, else null. */
  latest: string | null;
  /** Where the update key goes (the store page from the lookup, or our app id link). */
  url: string;
  checkedAt: number;
  check(): Promise<void>;
}

export const appVersion = (): string => Constants.expoConfig?.version ?? '0.0.0';

export const useAppUpdate = create<AppUpdateStore>((set, get) => ({
  latest: null,
  url: LINKS.appStore,
  checkedAt: 0,
  async check() {
    if (Platform.OS !== 'ios' || __DEV__) return;
    if (Date.now() - get().checkedAt < UPDATE_CHECK.everyHours * 3_600_000) return;
    set({ checkedAt: Date.now() });
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), UPDATE_CHECK.timeoutMs);
      const res = await fetch(LINKS.appStoreLookup, { signal: ctrl.signal });
      clearTimeout(timer);
      const body = (await res.json()) as {
        results?: { version?: string; trackViewUrl?: string }[];
      };
      const live = body.results?.[0];
      if (!live?.version) return;
      set({
        latest: isNewer(live.version, appVersion()) ? live.version : null,
        url: live.trackViewUrl || LINKS.appStore,
      });
    } catch {
      // Offline: ask again next time.
    }
  },
}));
