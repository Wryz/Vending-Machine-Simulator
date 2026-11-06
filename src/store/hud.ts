import { create } from 'zustand';

/**
 * Small shared HUD state: the tab bar's measured height (it floats over the
 * screens, so they pad by it) and the neighbourhood under the map's camera,
 * shown in the tab bar's status strip.
 */
interface HudStore {
  tabBarHeight: number;
  /** Neighbourhood / district name at the map's center, if known. */
  area: string | null;
  setTabBarHeight(h: number): void;
  setArea(name: string | null): void;
}

export const useHud = create<HudStore>((set, get) => ({
  tabBarHeight: 0,
  area: null,
  setTabBarHeight(h) {
    if (Math.abs(get().tabBarHeight - h) > 0.5) set({ tabBarHeight: h });
  },
  setArea(name) {
    if (get().area !== name) set({ area: name });
  },
}));
