import { DELIVERY } from '@/config/deliveries';
import { SERVICE } from '@/config/economy';

import {
  advance,
  arriveDeliveries,
  deliveryProgress,
  migrateSave,
  nearestSupplier,
  newGame,
  orderRestock,
  placeMachine,
  suggestRestock,
  tutorialStep,
  withClone,
  type GameState,
  type World,
} from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

/** A warehouse about 1 km north of the decent spot, and one far away. */
function worldWithStores(): World {
  const at = decentSpot();
  return {
    ...testWorld(),
    suppliers: [
      { id: 'osm:n1', name: 'Far Yard', kind: 'warehouse', lat: at.lat + 0.05, lng: at.lng },
      {
        id: 'osm:n2',
        name: 'Pier Warehouse',
        kind: 'warehouse',
        lat: at.lat + 0.009,
        lng: at.lng,
      },
    ],
  };
}

function placed(world: World): GameState {
  return withClone(newGame({ cityId: 'new-york', now: NOON_NY, seed: 3 }), (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      ...decentSpot(),
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
}

describe('restock deliveries', () => {
  it('load at the nearest warehouse, or a depot at the city center', () => {
    const w = worldWithStores();
    expect(nearestSupplier(w, decentSpot())).toMatchObject({ name: 'Pier Warehouse' });
    expect(nearestSupplier(testWorld(), decentSpot())).toMatchObject({ kind: 'depot', name: '' });
  });

  it('are paid when ordered and fill the machine only when the van arrives', () => {
    const w = worldWithStores();
    const s = placed(w);
    const m = s.machines[0];
    const lines = suggestRestock(s, m.id);
    const cash = s.cashCents;
    const r = orderRestock(s, w, m.id, lines);
    if (!r.ok) throw new Error(r.error);
    const d = r.delivery;
    expect(cash - s.cashCents).toBe(d.wholesaleCents + d.fuelCents);
    expect(d.fuelCents).toBeGreaterThan(0);
    expect(d.from.name).toBe('Pier Warehouse');
    expect(d.departAt - d.orderedAt).toBe(DELIVERY.loadMs);
    expect(d.arriveAt - d.departAt).toBeGreaterThanOrEqual(DELIVERY.minDriveMs);
    expect(d.arriveAt - d.departAt).toBeLessThanOrEqual(DELIVERY.maxDriveMs);
    // Nothing in the coils yet.
    expect(m.slots.every((x) => x.qty === 0)).toBe(true);
    expect(arriveDeliveries(s, d.arriveAt - 1)).toEqual([]);
    const news = arriveDeliveries(s, d.arriveAt);
    expect(news).toEqual([{ kind: 'arrived', delivery: d, units: d.units }]);
    expect(m.slots.reduce((a, x) => a + x.qty, 0)).toBe(d.units);
    expect(m.freshUntil).toBeGreaterThan(s.now);
    expect(s.deliveries).toHaveLength(0);
  });

  it('arrive during advance (live or while away)', () => {
    const w = worldWithStores();
    const s = placed(w);
    const r = orderRestock(s, w, s.machines[0].id, suggestRestock(s, s.machines[0].id));
    if (!r.ok) throw new Error(r.error);
    const { state, report } = advance(s, w, r.delivery.arriveAt + 60_000);
    expect(report.deliveries.map((x) => x.kind)).toEqual(['arrived']);
    expect(state.deliveries).toHaveLength(0);
    expect(
      state.ledger.lifetimeUnits + state.machines[0].slots.reduce((a, x) => a + x.qty, 0),
    ).toBe(r.delivery.units);
  });

  it('one van per machine, and only as many vans as the van level allows', () => {
    const w = worldWithStores();
    const s = placed(w);
    const id = s.machines[0].id;
    expect(orderRestock(s, w, id, suggestRestock(s, id, 5)).ok).toBe(true);
    expect(orderRestock(s, w, id, suggestRestock(s, id, 5))).toEqual({
      ok: false,
      error: 'A van is already on its way here.',
    });
    expect(DELIVERY.vansByLevel[0]).toBe(1);
  });

  it('refund the stock when the machine is gone on arrival', () => {
    const w = worldWithStores();
    const s = placed(w);
    const m = s.machines[0];
    const r = orderRestock(s, w, m.id, suggestRestock(s, m.id));
    if (!r.ok) throw new Error(r.error);
    const afterOrder = s.cashCents;
    m.status = 'stored';
    expect(arriveDeliveries(s, r.delivery.arriveAt)[0].kind).toBe('returned');
    expect(s.cashCents - afterOrder).toBe(r.delivery.wholesaleCents);
  });

  it('show progress from the store (0) to the machine (1)', () => {
    const w = worldWithStores();
    const s = placed(w);
    const r = orderRestock(s, w, s.machines[0].id, suggestRestock(s, s.machines[0].id));
    if (!r.ok) throw new Error(r.error);
    const d = r.delivery;
    expect(deliveryProgress(d, d.orderedAt)).toBe(0);
    expect(deliveryProgress(d, (d.departAt + d.arriveAt) / 2)).toBeCloseTo(0.5);
    expect(deliveryProgress(d, d.arriveAt + 1)).toBe(1);
  });

  it('the tutorial waits for the first van', () => {
    const w = worldWithStores();
    const s = placed(w);
    expect(tutorialStep(s)).toBe('stock');
    orderRestock(s, w, s.machines[0].id, suggestRestock(s, s.machines[0].id));
    expect(tutorialStep(s)).toBe('delivery');
  });

  it('fuel pays for the round trip from the store', () => {
    const w = worldWithStores();
    const s = placed(w);
    const r = orderRestock(s, w, s.machines[0].id, suggestRestock(s, s.machines[0].id));
    if (!r.ok) throw new Error(r.error);
    // ~1 km away: 2 km × route factor × per-km fuel, within rounding.
    const expected = 2 * 1.0 * SERVICE.routeFactor * SERVICE.fuelCentsPerKm;
    expect(Math.abs(r.delivery.fuelCents - expected)).toBeLessThan(expected * 0.05);
  });

  it('old saves gain an empty delivery list', () => {
    const s = placed(testWorld()) as unknown as Record<string, unknown>;
    delete s.deliveries;
    s.schemaVersion = 7;
    expect(migrateSave(s).deliveries).toEqual([]);
  });
});
