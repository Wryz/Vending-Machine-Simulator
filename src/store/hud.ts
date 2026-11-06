import { create } from 'zustand';

/**
 * Small shared HUD state: the tab bar's measured height (it floats over the
 * screens, so they pad by it) and the neighbourhood under the map's camera,
 * shown in the tab bar's status strip.
 */
interface HudStore {
  tabBarHeight: number;
  /** Neighbourhood at the map's center, if known. */
  area: string | null;
  /** The district / municipality around it, if known. */
  district: string | null;
  setTabBarHeight(h: number): void;
  setArea(names: { area: string | null; district: string | null } | null): void;
}

export const useHud = create<HudStore>((set, get) => ({
  tabBarHeight: 0,
  area: null,
  district: null,
  setTabBarHeight(h) {
    if (Math.abs(get().tabBarHeight - h) > 0.5) set({ tabBarHeight: h });
  },
  setArea(names) {
    const area = names?.area ?? null;
    const district = names?.district ?? null;
    if (get().area !== area || get().district !== district) set({ area, district });
  },
}));
