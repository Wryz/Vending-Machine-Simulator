import { SURPRISES } from '@/config/surprises';

import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';
import { collectCash, placeMachine, restockMachine, suggestRestock, withClone } from './actions';
import { advance } from './advance';
import { newGame } from './create';
import {
  acceptDeal,
  dealSavingCents,
  expireSurprises,
  rollSurprise,
  surpriseBoost,
  type SurpriseNews,
} from './events';
import type { GameState, World } from './state';

const MIN = 60_000;

function playing(world: World, seed = 5): GameState {
  let s = newGame({ cityId: 'new-york', now: NOON_NY, seed });
  const spot = decentSpot();
  s = withClone(s, (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      lat: spot.lat,
      lng: spot.lng,
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
  s = withClone(s, (d) =>
    restockMachine(d, world, d.machines[0].id, suggestRestock(d, d.machines[0].id, 10_000), {
      manual: true,
      capacity: 10_000,
    }),
  ).state;
  // The tutorial is through: first collect done.
  s.ledger.lifetimeNetCents = 500;
  s.ledger.lifetimeUnits = 20;
  return s;
}

/** Live play: 5-second ticks, restocking and collecting so the machine keeps selling. */
function play(world: World, s: GameState, minutes: number) {
  const news: SurpriseNews[] = [];
  let r = s;
  for (let i = 0; i < minutes * 12; i++) {
    const step = advance(r, world, r.now + 5_000);
    r = step.state;
    news.push(...step.report.surprises);
    if (i % 60 === 0) {
      const id = r.machines[0].id;
      r = withClone(r, (d) => collectCash(d, id)).state;
      r = withClone(r, (d) =>
        restockMachine(d, world, id, suggestRestock(d, id, 10_000), {
          manual: false,
          capacity: 10_000,
        }),
      ).state;
    }
  }
  return { state: r, news };
}

describe('surprise moments (SPEC §4.6)', () => {
  const world = testWorld();

  it('wait for the tutorial, then come every few minutes of live play', () => {
    const fresh = playing(world);
    fresh.ledger.lifetimeNetCents = 0;
    expect(rollSurprise(fresh, fresh.now + 10 * MIN)).toBeNull();
    expect(fresh.surprises.nextAt).toBe(0);

    const { news } = play(world, playing(world), 60);
    // First after ≥ 3 min, then one every 4–9 min: about 6–14 in an hour.
    expect(news.length).toBeGreaterThanOrEqual(Math.floor((60 - 3) / 9));
    expect(news.length).toBeLessThanOrEqual(Math.ceil(60 / 4));
    expect(new Set(news.map((n) => n.kind)).size).toBeGreaterThan(1);
  });

  it('never pile up from an offline catch-up', () => {
    const s = playing(world);
    s.surprises.nextAt = s.now + MIN;
    const { state, report } = advance(s, world, s.now + 6 * 3_600_000);
    expect(report.surprises).toEqual([]);
    expect(state.surprises.nextAt).toBe(s.surprises.nextAt);
  });

  it('are deterministic for the same save and inputs', () => {
    const a = play(world, playing(world), 25).news;
    const b = play(world, playing(world), 25).news;
    expect(a).toEqual(b);
  });

  it('VIP customer buys a whole row into the cash box', () => {
    const s = playing(world);
    s.surprises.nextAt = s.now;
    // Force the VIP: find a key that rolls it by trying successive times.
    let vip: SurpriseNews | null = null;
    for (let i = 0; i < 50 && !vip; i++) {
      const d = JSON.parse(JSON.stringify(s)) as GameState;
      d.surprises.nextAt = d.now + i;
      const n = rollSurprise(d, d.now + i);
      if (n?.kind === 'vip') {
        vip = n;
        const m = d.machines[0];
        expect(n.units!).toBeGreaterThanOrEqual(SURPRISES.vip.minUnits);
        expect(n.units!).toBeLessThanOrEqual(SURPRISES.vip.maxUnits);
        expect(m.cashBoxCents).toBe(s.machines[0].cashBoxCents + n.cents!);
        expect(d.ledger.lifetimeSalesCents).toBe(s.ledger.lifetimeSalesCents + n.cents!);
        const before = s.machines[0].slots.reduce((a, x) => a + x.qty, 0);
        expect(m.slots.reduce((a, x) => a + x.qty, 0)).toBe(before - n.units!);
      }
    }
    expect(vip).not.toBeNull();
  });

  it('jackpot hour boosts one spot until it ends', () => {
    const s = playing(world);
    const id = s.machines[0].id;
    s.surprises.jackpot = { machineId: id, until: s.now + 30 * MIN, multiplier: 1.5 };
    expect(surpriseBoost(s, id, s.now)).toBe(1.5);
    expect(surpriseBoost(s, 'other', s.now)).toBe(1);
    // Same seed with and without (collecting each minute so the cash box never caps sales).
    const units = (g: GameState) => {
      let r = g;
      let n = 0;
      for (let k = 0; k < 6; k++) {
        const step = advance(r, world, r.now + MIN);
        n += step.report.units;
        r = withClone(step.state, (d) => collectCash(d, d.machines[0].id)).state;
      }
      return n;
    };
    expect(units(s)).toBeGreaterThan(units(playing(world)) * 1.2);
    expireSurprises(s, s.now + 31 * MIN);
    expect(s.surprises.jackpot).toBeNull();
  });

  it('venue deal: accept before it lapses, then sales save commission until it ends', () => {
    const s = playing(world);
    const m = s.machines[0];
    m.contract.commission = 0.2;
    s.surprises.deal = {
      id: 'deal-x',
      machineId: m.id,
      venueName: m.venue.name,
      commission: SURPRISES.deal.commission,
      offerUntil: s.now + SURPRISES.deal.offerMs,
      activeUntil: 0,
    };
    // Not accepted: no saving.
    expect(dealSavingCents(s, m, 1_000, s.now)).toBe(0);
    expect(acceptDeal(s, 'nope').ok).toBe(false);
    const r = acceptDeal(s, 'deal-x');
    expect(r.ok).toBe(true);
    expect(s.surprises.deal!.activeUntil).toBe(s.now + SURPRISES.deal.durationMs);
    expect(dealSavingCents(s, m, 1_000, s.now + MIN)).toBe(150);
    // Sales during the deal credit the saving at once.
    const plainCash = (() => {
      const p = playing(world);
      p.machines[0].contract.commission = 0.2;
      return advance(p, world, p.now + 5 * MIN).state.cashCents - p.cashCents;
    })();
    const dealCash = advance(s, world, s.now + 5 * MIN).state.cashCents - s.cashCents;
    expect(dealCash).toBeGreaterThan(plainCash);
    expireSurprises(s, s.now + SURPRISES.deal.durationMs + 1);
    expect(s.surprises.deal).toBeNull();
    // An offer nobody accepts lapses.
    const late = playing(world);
    late.surprises.deal = {
      id: 'd2',
      machineId: late.machines[0].id,
      venueName: '',
      commission: 0.05,
      offerUntil: late.now - 1,
      activeUntil: 0,
    };
    expect(acceptDeal(late, 'd2').ok).toBe(false);
    expireSurprises(late, late.now);
    expect(late.surprises.deal).toBeNull();
  });
});
