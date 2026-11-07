import { RIVAL, SERVICE } from '@/config/economy';
import { getProduct } from '@/config/products';
import { SURPRISES } from '@/config/surprises';
import { t, type TKey } from '@/i18n';
import { venueName } from '@/i18n/sim';
import {
  type DeliveryNews,
  acceptDeal,
  playerShare,
  type GameState,
  type RivalNews,
  type RivalNewsKind,
  type RequestNews,
  type SurpriseNews,
} from '@/sim';

import { useCelebrations } from './celebrations';
// Circular with game.ts (it announces through here); only used at call time.
import { useGame } from './game';

/**
 * The rival's owner talks, and surprises announce themselves, through the
 * moments queue (CelebrationHost). Sparingly: one rival card per
 * `RIVAL.tauntMinGapMs` (arrivals and the chapter-3 ramp always show), and
 * one card per advance at most.
 */

/** Taunt pool size by situation (keys rival.taunt.<kind><1..n>). */
const TAUNTS: Record<RivalNewsKind, number> = {
  arrives: 3,
  ramp: 2,
  placed: 3,
  steal: 2,
  retreat: 3,
  passed: 2,
  behind: 2,
};

/** Which news wins when several land at once (offline catch-up). */
const PRIORITY: RivalNewsKind[] = [
  'arrives',
  'ramp',
  'steal',
  'passed',
  'behind',
  'retreat',
  'placed',
];

let lastTauntAt = 0;
const lastLine: Partial<Record<RivalNewsKind, number>> = {};

/** A taunt line for a situation, never the same one twice in a row. */
export function tauntFor(kind: RivalNewsKind, seed = Math.random()): string {
  const n = TAUNTS[kind];
  let i = 1 + Math.floor(seed * n);
  if (n > 1 && i === lastLine[kind]) i = (i % n) + 1;
  lastLine[kind] = i;
  return t(`rival.taunt.${kind}${i}` as TKey);
}

/** A served customer request: "Water at Hudson Works", sold plus a tip. */
export function announceRequests(state: GameState, news: readonly RequestNews[]): void {
  const push = useCelebrations.getState().push;
  for (const n of news) {
    if (n.kind !== 'served') continue;
    push({
      kind: 'surprise',
      icon: 'request',
      label: t('requests.served.label'),
      title: t('requests.served.title', {
        product: getProduct(n.request.productId).name,
        venue: venueOf(state, n.machineId),
      }),
      subtitle: t('requests.served.subtitle'),
      amountCents: n.cents + n.tipCents,
    });
  }
}

/** A restock van arrived: "24 items at Hudson Works". */
export function announceDeliveries(state: GameState, news: readonly DeliveryNews[]): void {
  const push = useCelebrations.getState().push;
  for (const n of news) {
    if (n.kind !== 'arrived' || n.units <= 0) continue;
    push({
      kind: 'surprise',
      icon: 'delivery',
      label: t('machinePanel.delivered.label'),
      title: t('machinePanel.delivered.title', {
        n: n.units,
        venue: venueOf(state, n.delivery.machineId),
      }),
      subtitle: t('machinePanel.delivered.subtitle', {
        pct: Math.round(SERVICE.freshStockBonus * 100),
      }),
    });
  }
}

function venueOf(state: GameState, machineId?: string): string {
  const m = machineId ? state.machines.find((x) => x.id === machineId) : undefined;
  return m ? venueName(m.venue.name) : state.cityId;
}

function factFor(state: GameState, n: RivalNews): string {
  const vars = {
    rival: RIVAL.name,
    venue: venueOf(state, n.machineId),
    n: state.rival.machines.length,
    pct:
      n.kind === 'placed'
        ? Math.round(RIVAL.priceUndercut * 100)
        : Math.round(playerShare(state) * 100),
  };
  return t(`rival.fact.${n.kind}` as TKey, vars);
}

export function announceRival(state: GameState, news: readonly RivalNews[]): void {
  if (!news.length) return;
  const n = PRIORITY.map((k) => news.find((x) => x.kind === k)).find(Boolean);
  if (!n) return;
  const now = Date.now();
  const always = n.kind === 'arrives' || n.kind === 'ramp';
  if (!always && now - lastTauntAt < RIVAL.tauntMinGapMs) return;
  lastTauntAt = now;
  useCelebrations.getState().push({
    kind: 'rival',
    label: t('rival.says', { owner: RIVAL.owner, rival: RIVAL.name }),
    title: `“${tauntFor(n.kind)}”`,
    subtitle: factFor(state, n),
    showMs: always ? 7000 : 5500,
  });
}

export function announceSurprises(state: GameState, news: readonly SurpriseNews[]): void {
  const push = useCelebrations.getState().push;
  for (const s of news) {
    const venue = venueOf(state, s.machineId);
    if (s.kind === 'vip') {
      push({
        kind: 'surprise',
        icon: 'vip',
        label: t('rival.surprise.vipLabel'),
        title: t('rival.surprise.vipTitle', { venue }),
        subtitle: t('rival.surprise.vipSub', { n: s.units ?? 0 }),
        amountCents: s.cents,
      });
    } else if (s.kind === 'jackpot') {
      push({
        kind: 'surprise',
        icon: 'jackpot',
        label: t('rival.surprise.jackpotLabel'),
        title: t('rival.surprise.jackpotTitle', { venue, x: s.multiplier ?? 1 }),
        subtitle: t('rival.surprise.jackpotSub', {
          n: Math.round(SURPRISES.jackpot.durationMs / 60_000),
        }),
      });
    } else if (s.kind === 'deal' && s.dealId) {
      const dealId = s.dealId;
      const to = Math.round((s.dealCommission ?? 0) * 100);
      const mins = Math.round(SURPRISES.deal.durationMs / 60_000);
      push({
        kind: 'surprise',
        icon: 'deal',
        label: t('rival.surprise.dealLabel'),
        title: t('rival.surprise.dealTitle', {
          venue,
          from: Math.round((s.commission ?? 0) * 100),
          to,
        }),
        subtitle: t('rival.surprise.dealSub', { n: mins }),
        showMs: 12_000,
        action: { label: t('rival.surprise.dealAccept'), run: () => takeDeal(dealId, to, mins) },
      });
    }
  }
}

/** Accept a venue deal (from its card or its map badge). */
export function takeDeal(dealId: string, toPct?: number, mins?: number): boolean {
  const r = useGame.getState().act((d) => acceptDeal(d, dealId));
  const deal = useGame.getState().game?.surprises.deal;
  useCelebrations.getState().push({
    kind: 'info',
    title: r.ok
      ? t('rival.surprise.dealAccepted', {
          to: toPct ?? Math.round((deal?.commission ?? 0) * 100),
          n: mins ?? Math.round(SURPRISES.deal.durationMs / 60_000),
        })
      : t('rival.surprise.dealGone'),
  });
  return r.ok;
}
