import { BUSINESS_DAY_REAL_MS, DEMAND_SCALE, RIVAL, SERVICE, TIME } from '@/config/economy';

import {
  advance,
  arriveDeliveries,
  assignRoute,
  buyVan,
  businessDaysToMs,
  dispatchDriver,
  evaluateSpot,
  fillSlots,
  hireDriver,
  newGame,
  orderLowRun,
  orderRestock,
  pickUpMachine,
  placeMachine,
  planLowRun,
  localTime,
  resolveVenue,
  restockMachine,
  storeCompetitors,
  storedMachine,
  suggestRestock,
  withClone,
  type GameState,
  type World,
} from './index';
import { customersPerHour } from './demand';
import { rivalCap, rivalDecide } from './rival';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

const MIN = 60_000;
const HOUR = 60 * MIN;

function placed(world: World, seed = 3): GameState {
  return withClone(newGame({ cityId: 'new-york', now: NOON_NY, seed }), (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      ...decentSpot(),
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
}

/** The placed machine plus a copy ~300 m east, nearly empty, a driver on both (chapter 3). */
function withDriver(world: World): GameState {
  let s = placed(world);
  const a = s.machines[0];
  const lines = suggestRestock(s, a.id, 10_000);
  a.slots.forEach((x, i) => {
    x.productId = lines[i]?.productId ?? null;
    x.qty = 1;
  });
  s.machines.push({ ...structuredClone(a), id: 'm-east', lng: a.lng + 0.0035 });
  s.chapter = 3;
  s.cashCents = 5_000_000;
  s = withClone(s, (d) => buyVan(d)).state;
  s = withClone(s, (d) => hireDriver(d)).state;
  s = withClone(s, (d) =>
    assignRoute(
      d,
      d.drivers[0].id,
      d.machines.map((m) => m.id),
    ),
  ).state;
  return s;
}

describe('driver runs when short of cash', () => {
  it('still collect the cash boxes when the player is broke', () => {
    const w = testWorld();
    const s = withDriver(w);
    for (const m of s.machines) m.cashBoxCents = 20_000;
    s.cashCents = -5_000;
    const spent = dispatchDriver(s, w, s.drivers[0]);
    // Fuel only: no stock without cash, but the run goes.
    expect(spent).toBeGreaterThan(0);
    expect(s.deliveries).toHaveLength(2);
    expect(s.deliveries.every((d) => d.units === 0)).toBe(true);
    const last = Math.max(...s.deliveries.map((d) => d.arriveAt));
    const before = s.cashCents;
    arriveDeliveries(s, last);
    for (const m of s.machines) expect(m.cashBoxCents).toBe(0);
    expect(s.cashCents).toBeGreaterThan(before + 30_000);
  });

  it('buy only the stock the cash covers after fuel', () => {
    const w = testWorld();
    const s = withDriver(w);
    s.cashCents = 600;
    const spent = dispatchDriver(s, w, s.drivers[0]);
    expect(spent).toBeGreaterThan(0);
    expect(spent).toBeLessThanOrEqual(600);
    expect(s.cashCents).toBeGreaterThanOrEqual(0);
    expect(s.deliveries.reduce((a, d) => a + d.units, 0)).toBeGreaterThan(0);
  });

  it('nothing to stock or collect and no cash: no run', () => {
    const w = testWorld();
    const s = withDriver(w);
    s.cashCents = 0;
    expect(dispatchDriver(s, w, s.drivers[0])).toBe(0);
    expect(s.deliveries).toHaveLength(0);
  });
});

describe('"Restock low" counts the fuel', () => {
  it('a smaller run instead of "Not enough cash"', () => {
    const w = testWorld();
    const s = withDriver(w);
    s.drivers = [];
    s.cashCents = 10_000_000;
    const full = planLowRun(s, w)!;
    expect(full.wholesaleCents).toBeGreaterThan(0);
    // Enough for half the stock plus the fuel; the untrimmed-for-fuel plan would miss by the fuel.
    s.cashCents = Math.floor(full.wholesaleCents / 2) + full.fuelCents;
    const plan = planLowRun(s, w)!;
    expect(plan.wholesaleCents + plan.fuelCents).toBeLessThanOrEqual(s.cashCents);
    const cash = s.cashCents;
    const r = orderLowRun(s, w);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(cash - s.cashCents).toBeLessThanOrEqual(cash);
    expect(s.cashCents).toBeGreaterThanOrEqual(0);
    const fullUnits = full.legs.reduce((a, l) => a + l.lines.reduce((b, x) => b + x.qty, 0), 0);
    expect(r.units).toBeLessThan(fullUnits);
    expect(r.units).toBeGreaterThan(0);
  });

  it('not even the fuel: says so', () => {
    const w = testWorld();
    const s = withDriver(w);
    s.drivers = [];
    s.cashCents = 1;
    expect(orderLowRun(s, w)).toEqual({ ok: false, error: 'Not enough cash for this stock.' });
  });
});

describe('van arrivals', () => {
  it('are stamped with the arrival time', () => {
    const w = testWorld();
    const s = placed(w);
    const m = s.machines[0];
    const r = orderRestock(s, w, m.id, suggestRestock(s, m.id));
    if (!r.ok) throw new Error(r.error);
    const d = r.delivery;
    const now = s.now;
    arriveDeliveries(s, d.arriveAt + 5 * MIN);
    expect(s.now).toBe(now);
    for (const x of m.slots) if (x.qty > 0) expect(x.stockedAt).toBe(d.arriveAt);
    expect(m.freshUntil).toBe(
      d.arriveAt + BUSINESS_DAY_REAL_MS * SERVICE.freshStockBusinessDays,
    );
    expect(m.lastVisitAt).toBe(d.arriveAt);
    expect(s.log[s.log.length - 1].at).toBe(d.arriveAt);
    expect(businessDaysToMs(1)).toBe(BUSINESS_DAY_REAL_MS);
  });

  it('go back (refunded) when the machine was moved elsewhere meanwhile', () => {
    const w = testWorld();
    for (const sameTick of [true, false]) {
      const s = placed(w);
      const m = s.machines[0];
      const r = orderRestock(s, w, m.id, suggestRestock(s, m.id));
      if (!r.ok) throw new Error(r.error);
      if (!sameTick) s.now += MIN;
      expect(pickUpMachine(s, m.id).ok).toBe(true);
      const spot = decentSpot();
      const moved = placeMachine(s, w, {
        machineId: m.id,
        lat: spot.lat + 0.002,
        lng: spot.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      });
      expect(moved.ok).toBe(true);
      const cash = s.cashCents;
      const news = arriveDeliveries(s, r.delivery.arriveAt);
      expect(news.map((x) => x.kind)).toEqual(['returned']);
      expect(s.cashCents - cash).toBe(r.delivery.wholesaleCents);
      expect(m.slots.every((x) => x.qty === 0)).toBe(true);
    }
  });
});

describe('spoilage age on a top-up', () => {
  it('one fresh unit does not make old stock new; an empty coil starts fresh', () => {
    const w = testWorld();
    const s = placed(w);
    const m = s.machines[0];
    const [line] = suggestRestock(s, m.id, 1);
    m.slots[line.slot] = { ...m.slots[line.slot], productId: line.productId, qty: 4 };
    s.now += 10 * HOUR;
    m.slots[line.slot].stockedAt = s.now - 10 * HOUR;
    fillSlots(s, m, [{ ...line, qty: 1 }]);
    // Quantity-weighted: 4 units 10 h old + 1 new = 8 h old.
    expect(s.now - m.slots[line.slot].stockedAt).toBe(8 * HOUR);
    m.slots[line.slot].qty = 0;
    fillSlots(s, m, [{ ...line, qty: 3 }]);
    expect(m.slots[line.slot].stockedAt).toBe(s.now);
  });
});

describe('offline catch-up with a driver', () => {
  function busyDriven(): { s: GameState; w: World } {
    const w = testWorld();
    let s = withDriver(w);
    s.machines = s.machines.slice(0, 1);
    s.drivers[0].machineIds = [s.machines[0].id];
    // A technician fixes breakdowns: this is about the driver, not the dice.
    s.research.technician = ['*'];
    s = withClone(s, (d) =>
      restockMachine(d, w, d.machines[0].id, suggestRestock(d, d.machines[0].id), {
        manual: true,
      }),
    ).state;
    return { s, w };
  }

  it('keeps the contract and earns about what live play does', () => {
    const { s, w } = busyDriven();
    const span = 60 * HOUR;
    const away = advance(s, w, s.now + span);
    expect(away.report.contractsLost).toEqual([]);
    expect(away.state.machines[0].status).toBe('active');
    expect(away.state.machines[0].mood).toBeGreaterThan(0.5);
    // Driver runs at about the live cadence (every 6 business hours = 6 real minutes).
    expect(away.report.driverRuns).toBeGreaterThan(span / (6 * MIN) / 2);

    // The same day played live (short advances: 1-minute ticks).
    let live = s;
    let liveSales = 0;
    const day = 24 * HOUR;
    for (let t = s.now; t < s.now + day; t += 10 * MIN) {
      const r = advance(live, w, t + 10 * MIN);
      live = r.state;
      liveSales += r.report.salesCents;
    }
    const awayDay = advance(s, w, s.now + day);
    expect(awayDay.report.salesCents).toBeGreaterThan(liveSales * 0.6);
    expect(awayDay.report.salesCents).toBeLessThan(liveSales * 1.5);
  });

  it('runs in bounded steps over the full offline cap', () => {
    const { s, w } = busyDriven();
    const t0 = Date.now();
    const r = advance(s, w, s.now + TIME.offlineCapHours * HOUR);
    expect(r.report.contractsLost).toEqual([]);
    expect(Date.now() - t0).toBeLessThan(5_000);
  });
});

describe('Spot Card numbers', () => {
  it('match the sim: demand scale, rival weight and store weight', () => {
    const w = testWorld();
    const s = placed(w);
    const spot = { lat: decentSpot().lat + 0.0003, lng: decentSpot().lng };
    const t = NOON_NY + 30 * MIN; // 12:30 local: the card's hourly points are at :30
    const card = evaluateSpot(s, w, spot, 'snack', t);
    // The sim's own customers for a machine standing there.
    const probe = storedMachine('probe', 'snack', t);
    Object.assign(probe, {
      lat: spot.lat,
      lng: spot.lng,
      cellId: w.cellOf(spot.lat, spot.lng),
      venue: resolveVenue(w, s, spot),
      status: 'active',
    });
    const local = localTime(t, w.city.timeZone, w.city.countryCode);
    const stores = storeCompetitors(card.competitors.stores);
    const sim = customersPerHour(probe, s, {
      cell: w.cells.get(probe.cellId)!,
      local,
      weather: null,
      competitors: card.competitors.yours + stores,
      events: [],
      t,
    });
    expect(card.nowCustomers).toBeCloseTo(sim.customers, 6);
    // People passing stay the larger pool.
    card.footfall.forEach((f, h) => expect(f).toBeGreaterThanOrEqual(card.hourly[h]));

    // Before the ramp a rival machine weighs RIVAL.early.competitorWeight (the sim's rivalWeight).
    const withRival = structuredClone(s);
    withRival.rival.machines.push({
      id: 'rv-x',
      lat: spot.lat,
      lng: spot.lng + 0.0005,
      cellId: w.cellOf(spot.lat, spot.lng + 0.0005),
      typeId: 'snack',
      placedAt: s.now,
    });
    const c2 = evaluateSpot(withRival, w, spot, 'snack', t);
    const simRival = customersPerHour(probe, withRival, {
      cell: w.cells.get(probe.cellId)!,
      local,
      weather: null,
      competitors: card.competitors.yours + RIVAL.early.competitorWeight + stores,
      events: [],
      t,
    });
    expect(c2.nowCustomers).toBeCloseTo(simRival.customers, 6);
    expect(DEMAND_SCALE).toBeGreaterThan(1);
  });
});

describe('rival fleet cap', () => {
  it('contract steals never push the rival past its cap', () => {
    const w = testWorld();
    let s = withDriver(w);
    s.drivers = [];
    s.rival.active = true;
    s.rival.ramped = true;
    s.rival.nextDecisionAt = s.now + 1e12;
    const cap = rivalCap(s);
    for (let i = 0; s.rival.machines.length < cap && i < 50; i++)
      s.rival.machines.push({
        id: `rv-f${i}`,
        lat: 0,
        lng: 0,
        cellId: 'nowhere',
        typeId: 'snack',
        placedAt: s.now,
      });
    for (const m of s.machines) {
      m.mood = 0.3;
      m.lowMoodSince = null;
      m.contract.endsAt = s.now + MIN;
      m.slots.forEach((x) => (x.qty = 5));
    }
    s = advance(s, w, s.now + 3 * MIN).state;
    expect(s.rival.machines.length).toBeLessThanOrEqual(cap);
    expect(s.machines.every((m) => m.status === 'active')).toBe(true);
  });

  it('new rival machines get ids that no other id scheme uses', () => {
    const w = testWorld();
    const s = placed(w);
    s.chapter = 3;
    s.ledger.lifetimeUnits = 1;
    s.ledger.lifetimeNetCents = 1;
    s.ledger.lifetimeSalesCents = 1_000_000;
    rivalDecide(s, w, s.now);
    expect(s.rival.machines.length).toBeGreaterThan(0);
    for (const r of s.rival.machines) expect(r.id).toMatch(/^rv-[0-9a-z]+$/);
  });

  it('decisions from long before the offline window are not replayed', () => {
    const w = testWorld();
    const s = placed(w);
    s.rival.active = true;
    s.rival.machines = [];
    s.rival.nextDecisionAt = s.now - 365 * 24 * HOUR;
    rivalDecide(s, w, s.now);
    expect(s.rival.nextDecisionAt).toBeGreaterThan(s.now);
  });
});
