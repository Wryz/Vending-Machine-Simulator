import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { LogBox, View } from 'react-native';

import type { CityId } from '@/config/cities';
import { CONTRACT, RIVAL } from '@/config/economy';
import { SURPRISES } from '@/config/surprises';
import { placeMachine, restockMachine, suggestRestock } from '@/sim';
import { offsetPoint } from '@/sim/geo';
import { cityInfoFor, useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { announceSurprises } from '@/store/rivalMoments';
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
    rival,
    surprise,
    stings,
    rivalCard,
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
    /** `1`: the day-one rival arrives on the next tick (tutorial counted as done). */
    rival?: string;
    /** Start a surprise on the first machine: `vip`, `jackpot` or `deal`. */
    surprise?: string;
    /** Rival stings to queue (a customer walks to the rival machine instead), after `rival=1`. */
    stings?: string;
    /** Open the first rival machine's card this many ms after landing. */
    rivalCard?: string;
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
        if (rival || surprise) {
          // The tutorial is through (first sale and collect): rival and surprises may come.
          d.ledger.lifetimeUnits = Math.max(d.ledger.lifetimeUnits, 50);
          d.ledger.lifetimeSalesCents = Math.max(
            d.ledger.lifetimeSalesCents,
            RIVAL.early.afterSalesCents,
          );
          d.ledger.lifetimeNetCents = Math.max(d.ledger.lifetimeNetCents, 1_000);
        }
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
      if (surprise) setTimeout(() => qaSurprise(surprise), 5000);
      if (rivalCard)
        setTimeout(
          () => {
            const r = useGame.getState().game?.rival.machines[0];
            if (r) router.setParams({ rival: r.id });
          },
          Number(rivalCard) || 9000,
        );
      const ns = Math.max(0, Math.min(10, Number(stings) || 0));
      for (let i = 0; i < ns; i++)
        setTimeout(
          () => {
            const st = useGame.getState();
            const r = st.game?.rival.machines[0];
            if (!r) return;
            const sale = {
              at: Date.now(),
              machineId: r.id,
              cents: 165,
              units: 1,
              kind: 'rival' as const,
            };
            useGame.setState({ ticker: [...st.ticker, sale].slice(-30) });
          },
          7000 + i * 4000,
        );
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
  }, [
    city,
    to,
    machines,
    cash,
    chapter,
    sales,
    saleAt,
    focusAt,
    focusAfter,
    stockOnly,
    rival,
    surprise,
    stings,
    rivalCard,
  ]);

  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Mono>{note}</Mono>
    </View>
  );
}

/** Dev QA: start a surprise on the first active machine now (state + its moment). */
function qaSurprise(kind: string) {
  const st = useGame.getState();
  const g = st.game;
  const m = g?.machines.find((x) => x.status === 'active');
  if (!g || !m) return;
  const now = g.now;
  if (kind === 'vip') {
    const sale = { at: Date.now(), machineId: m.id, cents: 1400, units: 1, kind: 'vip' as const };
    useGame.setState({ ticker: [...st.ticker, sale].slice(-30) });
    announceSurprises(g, [{ kind: 'vip', machineId: m.id, units: 8, cents: 1400 }]);
    return;
  }
  useGame.getState().act((d) => {
    if (kind === 'jackpot')
      d.surprises.jackpot = {
        machineId: m.id,
        until: now + SURPRISES.jackpot.durationMs,
        multiplier: SURPRISES.jackpot.multiplier,
      };
    else
      d.surprises.deal = {
        id: 'deal-qa',
        machineId: m.id,
        venueName: m.venue.name,
        commission: SURPRISES.deal.commission,
        offerUntil: now + SURPRISES.deal.offerMs,
        activeUntil: 0,
      };
    return { ok: true };
  });
  announceSurprises(useGame.getState().game!, [
    kind === 'jackpot'
      ? { kind: 'jackpot', machineId: m.id, multiplier: SURPRISES.jackpot.multiplier }
      : {
          kind: 'deal',
          machineId: m.id,
          dealId: 'deal-qa',
          commission: m.contract.commission,
          dealCommission: SURPRISES.deal.commission,
        },
  ]);
}
