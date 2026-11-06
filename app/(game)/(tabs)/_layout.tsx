import { Tabs } from 'expo-router';

import { goalProgress } from '@/sim';
import { useGame } from '@/store/game';
import { TabBar, type TabItem } from '@/ui/TabBar';

export const unstable_settings = { initialRouteName: 'map' };

/**
 * The map and the four places you manage from (SPEC §8), as a keypad tab bar.
 * Everything else (close-up, shop, sheets) opens over it from the game stack.
 */
export default function TabsLayout() {
  const ordersReady = useGame(
    (s) =>
      s.game?.goals.items.filter((g) => !g.claimed && goalProgress(s.game!, g) >= 1).length ?? 0,
  );
  const tabs: TabItem[] = [
    { name: 'map', icon: 'map', label: 'Map' },
    { name: 'keys', icon: 'keys', label: 'Keys' },
    { name: 'routes', icon: 'route', label: 'Routes' },
    {
      name: 'orders',
      icon: 'orders',
      label: 'Orders',
      badge: ordersReady > 0 ? String(ordersReady) : undefined,
    },
    { name: 'company', icon: 'company', label: 'Company' },
  ];
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          tabs={tabs}
          current={state.routes[state.index]?.name ?? 'map'}
          onSelect={(name) => {
            const route = state.routes.find((r) => r.name === name);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      {tabs.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}
