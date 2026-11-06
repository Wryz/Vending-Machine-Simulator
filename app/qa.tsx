import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { LogBox, View } from 'react-native';

import type { CityId } from '@/config/cities';
import { CONTRACT } from '@/config/economy';
import { placeMachine, restockMachine, suggestRestock } from '@/sim';
import { offsetPoint } from '@/sim/geo';
import { cityInfoFor, useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { Mono } from '@/ui/kit';

/**
 * Dev builds only: seed a playable state for unattended QA and screenshots,
 * e.g. `EXPO_PUBLIC_QA_ROUTE='/qa?city=new-york&machines=1' npm start`.
 * Opens a fresh game, places and stocks the starter machine (and, with
 * `machines`, more), then lands on the map. Never reachable in release.
 */
export default function Qa() {
  const {
    city = 'new-york',
    to = '/map',
    machines = '1',
    cash,
    chapter,
    sales,
    saleAt,
    focusAt,
    focusAfter,
    stockOnly,
  } = useLocalSearchParams<{
    city?: string;
    to?: string;
    /** Machines to place and stock (the starter, plus bought ones). */
    machines?: string;
    /** Cash to set afterwards, in dollars. */
    cash?: string;
    chapter?: string;
    /** Test sales to queue at the first machine after landing (customers walk up). */
    sales?: string;
    /** Machine id for the test sales (default: the first active machine). */
    saleAt?: string;
    /** After landing, open this machine (flies the map in), `focusAfter` ms later (preview videos). */
    focusAt?: string;
    focusAfter?: string;
    /** Stock only the Nth placed machine (1-based), so only it sells (preview videos). */
    stockOnly?: string;
  }>();
  const [note, setNote] = useState('Seeding…');

  useEffect(() => {
    if (!__DEV__) return;
    // Captures for the store: no dev log toasts (RevenueCat logs a missing paywall offering).
    LogBox.ignoreLogs(['[RevenueCat]']);
    (async () => {
      const info = cityInfoFor(city as CityId);
      await useGame.getState().openCity(info, { fresh: true, seed: 7 });
      if (!useGame.getState().world) return setNote(`Could not open ${city}.`);
      const want = Math.max(1, Math.min(12, Number(machines) || 1));
      useGame.getState().act((d, world) => {
        if (want > 1) {
          // Enough to buy the extra machines; set to the requested cash afterwards.
          d.chapter = Math.max(d.chapter, 2);
          d.cashCents += 1_000_000;
        }
        let placed = 0;
        // Walk outward from the city centre, placing where a placement is accepted.
        for (let i = 0; i < 160 && placed < want; i++) {
          const stored = d.machines.find((m) => m.status === 'stored');
          const p = offsetPoint(world.city, (i * 47) % 360, 60 + i * 20);
          const r = placeMachine(d, world, {
            ...(stored
              ? { machineId: stored.id }
              : { typeId: (['snack', 'cold-drinks', 'coffee', 'combo'] as const)[placed % 4] }),
            lat: p.lat,
            lng: p.lng,
            heading: 180,
            termDays: CONTRACT.termsDays[0],
            exclusive: false,
          } as Parameters<typeof placeMachine>[2]);
          if (r.ok) {
            if (!stockOnly || Number(stockOnly) === placed + 1)
              restockMachine(d, world, r.machine.id, suggestRestock(d, r.machine.id, 10_000), {
                manual: true,
                capacity: 10_000,
              });
            placed++;
          }
        }
        if (cash) d.cashCents = Math.round(Number(cash) * 100);
        if (chapter) {
          d.chapter = Number(chapter);
          // Earlier chapters count as finished (the Shop offers the Starter Pack after chapter 1).
          for (let c = 1; c < d.chapter; c++) d.chapterDoneAt[c] ??= d.now;
        }
        return placed ? { ok: true } : { ok: false };
      });
      useProfile.getState().update((p) => {
        p.onboarded = true;
      });
      router.replace(to as never);
      if (focusAt)
        setTimeout(() => router.setParams({ focus: focusAt }), Number(focusAfter) || 3000);
      const n = Math.max(0, Math.min(10, Number(sales) || 0));
      for (let i = 0; i < n; i++)
        setTimeout(
          () => {
            const st = useGame.getState();
            const id = saleAt ?? st.game?.machines.find((m) => m.status === 'active')?.id;
            if (!id) return;
            const sale = { at: Date.now(), machineId: id, cents: 175, units: 1 + (i % 2) };
            useGame.setState({ ticker: [...st.ticker, sale].slice(-30) });
          },
          6000 + i * 2500,
        );
    })().catch((e) => setNote(`QA seed failed: ${String(e)}`));
  }, [city, to, machines, cash, chapter, sales, saleAt, focusAt, focusAfter, stockOnly]);

  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Mono>{note}</Mono>
    </View>
  );
}
