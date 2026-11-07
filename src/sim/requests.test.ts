import { getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';
import { REQUEST_WANTS, REQUESTS } from '@/config/requests';

import {
  canCarry,
  machineTypeFor,
  migrateSave,
  newGame,
  placeMachine,
  rollRequest,
  serveRequests,
  withClone,
  type GameState,
} from './index';
import { decentSpot, deadSpot, gridId, makeCell, NOON_NY, testWorld } from './__fixtures__/world';

const world = testWorld();

/** A game with one placed (empty) starter machine at the decent spot, tutorial through. */
function placed(w = world, at = decentSpot()): GameState {
  const s = withClone(newGame({ cityId: 'new-york', now: NOON_NY, seed: 7 }), (d) =>
    placeMachine(d, w, {
      machineId: d.machines[0].id,
      lat: at.lat,
      lng: at.lng,
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
  s.ledger.lifetimeNetCents = 100;
  return s;
}

/** Roll until a request comes (the first roll only schedules). */
function firstRequest(s: GameState, w = world) {
  let t = s.now;
  for (let i = 0; i < 20; i++) {
    const news = rollRequest(s, w, t);
    if (news?.kind === 'new') return { news, t };
    t = Math.max(t + 1, s.requests.nextAt);
  }
  throw new Error('no request');
}

describe('customer requests', () => {
  it('wait for the tutorial (first sale and collect)', () => {
    const s = placed();
    s.ledger.lifetimeNetCents = 0;
    for (let t = NOON_NY; t < NOON_NY + 30 * 60_000; t += 60_000)
      expect(rollRequest(s, world, t)).toBeNull();
    expect(s.requests.open).toHaveLength(0);
  });

  it('ask for something people from a nearby place want, not in stock nearby', () => {
    const s = placed();
    const { news } = firstRequest(s);
    const r = news.request;
    const wants = REQUEST_WANTS[r.from.category]!.wants.find((x) => x.reason === r.reason)!;
    expect(wants.products).toContain(r.productId);
    expect(s.machines[0].slots.some((x) => x.productId === r.productId && x.qty > 0)).toBe(false);
    expect(r.until - r.at).toBe(REQUESTS.waitMs);
    if (r.from.category !== 'residential') expect(r.from.name.length).toBeGreaterThan(0);
  });

  it('a fast-food place next door makes customers thirsty', () => {
    const spot = deadSpot();
    const id = gridId(spot.lat, spot.lng);
    const w = testWorld({
      extra: [makeCell(id, { pop: 0, places: [{ name: 'Crispy Coop', category: 'fastfood' }] })],
    });
    const s = placed();
    const m = s.machines[0];
    Object.assign(m, { lat: spot.lat, lng: spot.lng, cellId: id });
    const { news } = firstRequest(s, w);
    expect(news.request.from).toMatchObject({ name: 'Crispy Coop', category: 'fastfood' });
    expect(news.request.reason).toBe('thirsty');
  });

  it('are deterministic', () => {
    const a = placed();
    const b = placed();
    expect(firstRequest(a).news).toEqual(firstRequest(b).news);
  });

  it('are served once the product is in stock: one sale plus a tip', () => {
    const s = placed();
    const { news, t } = firstRequest(s);
    const r = news.request;
    const m = s.machines[0];
    expect(canCarry(s, m, r.productId)).toBe(true);
    m.slots[0] = { ...m.slots[0], productId: r.productId, qty: 3, priceCents: 200 };
    const cash = s.cashCents;
    const served = serveRequests(s, t + 1);
    expect(served).toEqual([
      {
        kind: 'served',
        request: r,
        machineId: m.id,
        cents: 200,
        tipCents: 200 * REQUESTS.tipShare,
      },
    ]);
    expect(m.slots[0].qty).toBe(2);
    expect(m.cashBoxCents).toBe(200);
    expect(s.cashCents - cash).toBe(200 * REQUESTS.tipShare);
    expect(s.requests.open).toHaveLength(0);
    expect(s.requests.served).toBe(1);
  });

  it('can be served by another of your machines a short walk away', () => {
    const s = placed();
    const { news, t } = firstRequest(s);
    const r = news.request;
    // A second machine 60 m away that has it.
    const other = structuredClone(s.machines[0]);
    other.id = 'm-near';
    other.lat += 60 / 111_320;
    other.slots[0] = { ...other.slots[0], productId: r.productId, qty: 1, priceCents: 150 };
    other.cashBoxCents = 0;
    s.machines.push(other);
    const served = serveRequests(s, t + 1);
    expect(served[0]).toMatchObject({ kind: 'served', machineId: 'm-near', cents: 150 });
  });

  it('give up after waiting', () => {
    const s = placed();
    const { news } = firstRequest(s);
    expect(serveRequests(s, news.request.until - 1)).toEqual([]);
    expect(serveRequests(s, news.request.until)).toEqual([{ kind: 'gone', request: news.request }]);
    expect(s.requests.open).toHaveLength(0);
  });

  it('mostly ask for something this machine can sell (hints stay a minority)', () => {
    const s = placed();
    const m = s.machines[0];
    let t = s.now;
    let total = 0;
    let hints = 0;
    for (let i = 0; i < 400 && total < 80; i++) {
      const news = rollRequest(s, world, t);
      if (news?.kind === 'new') {
        total++;
        if (!canCarry(s, m, news.request.productId)) {
          hints++;
          // A hint points to another machine type, never a not-yet-unlocked product of this one.
          expect(getMachineType(m.typeId).holds).not.toContain(
            getProduct(news.request.productId).family,
          );
        }
        s.requests.open = [];
      }
      t = Math.max(t + 1, s.requests.nextAt);
    }
    expect(total).toBeGreaterThanOrEqual(40);
    expect(hints / total).toBeLessThan(REQUESTS.otherMachineShare + 0.15);
    expect(hints).toBeGreaterThan(0);
  });

  it('point to a machine type that sells what this one cannot', () => {
    expect(machineTypeFor('toothbrush-kit')).toBe('pharmacy');
    expect(machineTypeFor('clearpeak-water')).toBe('snack');
    const s = placed();
    expect(canCarry(s, s.machines[0], 'clearpeak-water')).toBe(true);
    expect(canCarry(s, s.machines[0], 'toothbrush-kit')).toBe(false);
  });

  it('only ask for products that exist and never alcohol', () => {
    for (const entry of Object.values(REQUEST_WANTS))
      for (const w of entry!.wants)
        for (const id of w.products) {
          const type = machineTypeFor(id);
          expect(type).not.toBeNull();
          expect(type).not.toMatch(/beer|sake/);
        }
  });

  it('old saves gain an empty request book', () => {
    const s = placed() as unknown as Record<string, unknown>;
    delete s.requests;
    s.schemaVersion = 6;
    expect(migrateSave(s).requests).toEqual({ nextAt: 0, open: [], served: 0 });
  });
});
