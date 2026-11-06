import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useGame } from '@/store/game';

/**
 * Dev builds only: queue test sales at a machine, for checking customers on
 * the map without waiting for real ones, e.g.
 * `xcrun simctl openurl booted "coinline://qa-sale?machine=m1&count=3"`.
 * Goes back to the map, then adds one ticker entry every 2.5 s. Never in release.
 */
export default function QaSale() {
  const { machine, count = '3' } = useLocalSearchParams<{ machine?: string; count?: string }>();
  useEffect(() => {
    if (!__DEV__) return;
    router.back();
    const n = Math.max(1, Math.min(10, Number(count) || 1));
    for (let i = 0; i < n; i++) {
      setTimeout(
        () => {
          const s = useGame.getState();
          const id = machine ?? s.game?.machines.find((m) => m.status === 'active')?.id;
          if (!id) return;
          const sale = { at: Date.now(), machineId: id, cents: 175, units: 1 + (i % 2) };
          useGame.setState({ ticker: [...s.ticker, sale].slice(-30) });
        },
        800 + i * 2500,
      );
    }
  }, [machine, count]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
