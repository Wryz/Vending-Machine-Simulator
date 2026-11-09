import { SERVICE, STAFF } from '@/config/economy';
import { getMachineType, SLOT_ROWS } from '@/config/machines';
import { getProduct, PRODUCTS } from '@/config/products';

import {
  addSlotRow,
  advance,
  assignRoute,
  buyDriverVan,
  driverOnDuty,
  driverRentMs,
  extendDriver,
  hireDriver,
  newGame,
  nextSlotRow,
  pickUpMachine,
  placeMachine,
  startSlots,
  storedMachine,
  wholesaleCents,
  withClone,
  type GameState,
  type World,
} from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

const MIN = 60_000;

function placed(world: World): GameState {
  return withClone(newGame({ cityId: 'new-york', now: NOON_NY, seed: 7 }), (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      ...decentSpot(),
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
}

describe('machine upgrades: rows of slots (owner, 2026-11-08)', () => {
  it('coil machines start with 10 slots; hopper machines keep their full size', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    expect(s.machines[0].slots).toHaveLength(SLOT_ROWS.startSlots);
    expect(s.machines[0].seen.qty).toHaveLength(SLOT_ROWS.startSlots);
    expect(storedMachine('x', 'snack', NOON_NY).slots).toHaveLength(10);
    expect(storedMachine('x', 'coffee', NOON_NY).slots).toHaveLength(4);
    expect(startSlots(getMachineType('ice'))).toBe(1);
  });

  it('every coil machine grows in whole rows of 5 up to its type size', () => {
    for (const id of ['used-snack', 'snack', 'combo', 'cold-drinks', 'pharmacy'] as const) {
      const type = getMachineType(id);
      expect(type.grid.cols).toBe(SLOT_ROWS.rowSlots);
      expect(type.slots % SLOT_ROWS.rowSlots).toBe(0);
      expect(type.slots).toBeGreaterThan(SLOT_ROWS.startSlots);
    }
  });

  it('a row costs a small price, adds 5 empty slots and stays when the machine moves', () => {
    const w = testWorld();
    const s = placed(w);
    s.cashCents = 5_000_000;
    const m = s.machines[0];
    const max = getMachineType(m.typeId).slots;
    const paid: number[] = [];
    while (nextSlotRow(m)) {
      const cash = s.cashCents;
      const r = addSlotRow(s, m.id);
      if (!r.ok) throw new Error(r.error);
      paid.push(cash - s.cashCents);
      expect(r.costCents).toBe(cash - s.cashCents);
    }
    expect(m.slots).toHaveLength(max);
    expect(m.seen.qty).toHaveLength(max);
    expect(paid).toEqual(SLOT_ROWS.rowCostCents.slice(0, paid.length));
    expect(paid.every((c) => c <= 50_000)).toBe(true);
    expect(m.slots.slice(SLOT_ROWS.startSlots).every((x) => !x.productId && x.qty === 0)).toBe(
      true,
    );
    expect(addSlotRow(s, m.id)).toEqual({ ok: false, error: 'This machine has all its slots.' });
    // Permanent: picking the machine up keeps the rows.
    expect(pickUpMachine(s, m.id).ok).toBe(true);
    expect(s.machines[0].slots).toHaveLength(max);
  });

  it('needs the cash', () => {
    const s = placed(testWorld());
    s.cashCents = 0;
    expect(addSlotRow(s, s.machines[0].id)).toEqual({ ok: false, error: 'Not enough cash.' });
    expect(s.machines[0].slots).toHaveLength(SLOT_ROWS.startSlots);
  });
});

describe('cheaper deliveries (owner, 2026-11-08)', () => {
  it('restock orders pay a share of the wholesale list price', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    const p = getProduct(PRODUCTS[0].id);
    expect(wholesaleCents(s, p)).toBe(Math.round(p.wholesaleCents * SERVICE.deliveryStockShare));
    expect(SERVICE.deliveryStockShare).toBeLessThan(1);
  });
});

describe('drivers: rent a van or own it (owner, 2026-11-08)', () => {
  const world = testWorld();
  const start = (chapter: number) => {
    const s = placed(world);
    s.chapter = chapter;
    s.cashCents = 5_000_000;
    // Nearly sold out, with cash to collect: a driver has work to do.
    const p = PRODUCTS.find((x) => x.family === 'snack')!;
    for (const x of s.machines[0].slots) Object.assign(x, { productId: p.id, qty: 1, par: 8 });
    s.machines[0].cashBoxCents = 10_000;
    return s;
  };

  it('unlock in chapter 2, with no van of your own needed', () => {
    const s1 = start(1);
    expect(hireDriver(s1)).toEqual({ ok: false, error: 'Drivers unlock in chapter 2.' });
    const s2 = start(2);
    expect(s2.vanLevel).toBe(0);
    expect(hireDriver(s2).ok).toBe(true);
  });

  it('a rental costs its price, works for a while, then waits for an extension', () => {
    let s = start(2);
    const cash = s.cashCents;
    s = withClone(s, (d) => hireDriver(d)).state;
    expect(cash - s.cashCents).toBe(STAFF.driverRentCents);
    const d = s.drivers[0];
    expect(d.rentedUntil).toBe(s.now + driverRentMs());
    s = withClone(s, (g) => assignRoute(g, g.drivers[0].id, [g.machines[0].id])).state;

    // While rented: runs its route, and no wages on top of the rental.
    const during = advance(s, world, s.now + 5 * MIN);
    expect(during.report.driverRuns).toBeGreaterThan(0);
    expect(during.state.ledger.day.lines.Wages ?? 0).toBe(0);

    // After the rental: parked, no runs.
    const later = advance(s, world, d.rentedUntil! + MIN).state;
    expect(driverOnDuty(later.drivers[0], later.now)).toBe(false);
    later.machines[0].slots.forEach((x) => (x.qty = 0));
    later.machines[0].cashBoxCents = 10_000;
    expect(advance(later, world, later.now + 30 * MIN).report.driverRuns).toBe(0);

    // Extend: one more period from now, for the same price, and it drives again.
    const before = later.cashCents;
    const ext = extendDriver(later, later.drivers[0].id);
    if (!ext.ok) throw new Error(ext.error);
    expect(before - later.cashCents).toBe(STAFF.driverRentCents);
    expect(ext.rentedUntil).toBe(later.now + driverRentMs());
    expect(advance(later, world, later.now + 5 * MIN).report.driverRuns).toBeGreaterThan(0);
  });

  it('extending early adds to the time left', () => {
    const s = start(2);
    hireDriver(s);
    const until = s.drivers[0].rentedUntil!;
    expect(extendDriver(s, s.drivers[0].id).ok).toBe(true);
    expect(s.drivers[0].rentedUntil).toBe(until + driverRentMs());
  });

  it('owning the van: one price, for good, with a daily wage', () => {
    const s = start(2);
    hireDriver(s);
    const cash = s.cashCents;
    expect(buyDriverVan(s, s.drivers[0].id).ok).toBe(true);
    expect(cash - s.cashCents).toBe(STAFF.driverOwnCents);
    expect(s.drivers[0].rentedUntil).toBeUndefined();
    expect(driverOnDuty(s.drivers[0], s.now + 1000 * 3_600_000)).toBe(true);
    expect(extendDriver(s, s.drivers[0].id)).toEqual({
      ok: false,
      error: 'This van is already yours.',
    });
    expect(buyDriverVan(s, s.drivers[0].id).ok).toBe(false);
    const next = advance(s, world, s.now + 30 * MIN).state;
    expect(next.ledger.day.lines.Wages).toBeLessThan(0);

    // Or hire straight away with a van of their own.
    const t = start(2);
    const before = t.cashCents;
    expect(hireDriver(t, { own: true }).ok).toBe(true);
    expect(before - t.cashCents).toBe(STAFF.driverOwnCents);
    expect(t.drivers[0].rentedUntil).toBeUndefined();
  });
});

describe('removed research (auto-reorder, owner 2026-11-09)', () => {
  it('drops it from old saves and refunds it, researched or still in the lab', () => {
    const world = testWorld();
    const done = placed(world);
    (done.research as Record<string, string[]>)['auto-reorder'] = ['*'];
    const cash = done.cashCents;
    const a = advance(done, world, done.now + 1_000).state;
    expect('auto-reorder' in a.research).toBe(false);
    expect(a.cashCents).toBeGreaterThanOrEqual(cash + 250_000 - 10_000);

    const inLab = placed(world);
    (inLab as { lab: unknown }).lab = {
      id: 'auto-reorder',
      key: '*',
      startedAt: inLab.now,
      doneAt: inLab.now + 60_000,
    };
    const b = advance(inLab, world, inLab.now + 1_000).state;
    expect(b.lab).toBeNull();
    expect(b.cashCents).toBeGreaterThanOrEqual(inLab.cashCents + 250_000 - 10_000);
  });
});
