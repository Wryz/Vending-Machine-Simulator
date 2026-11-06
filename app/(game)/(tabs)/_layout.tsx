import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { Feature } from '@/config/progression';
import { goalProgress, unlockedFeatures } from '@/sim';
import { sound } from '@/services/audio';
import { useCelebrations } from '@/store/celebrations';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { TabBar, type TabItem } from '@/ui/TabBar';

export const unstable_settings = { initialRouteName: 'map' };

/** Each tab, and the feature that opens it (none = always there). */
const TABS: readonly (Omit<TabItem, 'badge' | 'fresh'> & { feature?: Feature })[] = [
  { name: 'map', icon: 'map', label: 'Map' },
  { name: 'keys', icon: 'keys', label: 'Keys', feature: 'keys' },
  { name: 'routes', icon: 'route', label: 'Routes', feature: 'routes' },
  { name: 'orders', icon: 'orders', label: 'Orders', feature: 'orders' },
  { name: 'company', icon: 'company', label: 'Company', feature: 'company' },
];

/**
 * The map and the four places you manage from (SPEC §8), as a keypad tab bar.
 * Tabs appear as the player reaches milestones (config FEATURE_UNLOCKS), each
 * with a NEW badge until first opened. Everything else (close-up, shop,
 * sheets) opens over it from the game stack.
 */
export default function TabsLayout() {
  const ordersReady = useGame(
    (s) =>
      s.game?.goals.items.filter((g) => !g.claimed && goalProgress(s.game!, g) >= 1).length ?? 0,
  );
  const unlockedKey = useGame((s) => (s.game ? unlockedFeatures(s.game).join(',') : ''));
  const seen = useProfile((s) => s.seenFeatures);
  const unlocked = unlockedKey ? (unlockedKey.split(',') as Feature[]) : [];
  const tabs: TabItem[] = TABS.filter((t) => !t.feature || unlocked.includes(t.feature)).map(
    (t) => ({
      ...t,
      fresh: !!t.feature && !!seen && !seen.includes(t.feature),
      badge: t.name === 'orders' && ordersReady > 0 ? String(ordersReady) : undefined,
    }),
  );

  // Announce a tab the moment it opens (not on load).
  const known = useRef<string | null>(null);
  useEffect(() => {
    const prev = known.current;
    known.current = unlockedKey;
    if (prev === null) {
      // First run of this install with the unlock system: everything open so far counts as seen.
      if (!useProfile.getState().seenFeatures)
        useProfile.getState().update((p) => {
          p.seenFeatures = unlockedKey ? unlockedKey.split(',') : [];
        });
      return;
    }
    const before = prev ? prev.split(',') : [];
    for (const t of TABS) {
      if (t.feature && unlocked.includes(t.feature) && !before.includes(t.feature)) {
        sound.play('success');
        useCelebrations.getState().push({
          kind: 'info',
          title: `New: ${t.label}`,
          subtitle: UNLOCK_NOTE[t.name],
        });
      }
    }
    // Only when the unlocked set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedKey]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          tabs={tabs}
          current={state.routes[state.index]?.name ?? 'map'}
          onSelect={(name) => {
            const route = state.routes.find((r) => r.name === name);
            if (!route) return;
            const f = TABS.find((t) => t.name === name)?.feature;
            if (f && !useProfile.getState().seenFeatures?.includes(f))
              useProfile.getState().update((p) => {
                p.seenFeatures = [...(p.seenFeatures ?? []), f];
              });
            navigateToTab(route.key);
          }}
        />
      )}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}

/** One line on what a newly opened tab is for. */
const UNLOCK_NOTE: Record<string, string> = {
  keys: 'All your machines on one key ring',
  routes: 'Plan restock runs with your van',
  orders: 'Daily orders pay bonus cash',
  company: 'Your chapter, money, upgrades and shop',
};
