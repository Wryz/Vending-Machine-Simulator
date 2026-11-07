import type { CurveKey } from '@/config/curves';
import { getMachineType, MACHINE_TYPES, type MachineTypeId } from '@/config/machines';
import { distanceDecay } from '@/config/places';
import { getProduct } from '@/config/products';
import { REQUEST_WANTS, REQUESTS, type RequestReason } from '@/config/requests';

import { sellUnits } from './events';
import { distanceM } from './geo';
import { addLedger } from './ledger';
import { keyedUnit } from './rng';
import { activeMachines, cashBoxCapacity, nearbyPlaces, productAllowed } from './rules';
import type { CustomerRequest, GameState, Machine, RequestsState, World } from './state';

export type { RequestReason };

export function emptyRequests(): RequestsState {
  return { nextAt: 0, open: [], served: 0 };
}

/** What happened to a request during an advance (map bubbles, toasts). */
export type RequestNews =
  | { kind: 'new'; request: CustomerRequest }
  | {
      kind: 'served';
      request: CustomerRequest;
      /** The machine that sold it (the asked one or a neighbour). */
      machineId: string;
      cents: number;
      tipCents: number;
    }
  | { kind: 'gone'; request: CustomerRequest };

/** Can this machine sell the product (its type holds it and it is unlocked)? */
export function canCarry(state: GameState, m: Machine, productId: string): boolean {
  return productAllowed(state, getMachineType(m.typeId), getProduct(productId));
}

/**
 * The machine type that would sell a product: the earliest to unlock (the
 * hint on a request this machine can't serve).
 */
export function machineTypeFor(productId: string): MachineTypeId | null {
  const family = getProduct(productId).family;
  let best: (typeof MACHINE_TYPES)[number] | null = null;
  for (const t of MACHINE_TYPES) {
    if (t.id === 'used-snack' || !t.holds.includes(family)) continue;
    if (!best || t.unlockChapter < best.unlockChapter) best = t;
  }
  return best?.id ?? null;
}

/** Your machines that can serve a request now: in stock, near the asked machine, nearest first. */
function servers(state: GameState, r: CustomerRequest): { m: Machine; slot: number }[] {
  const asked = state.machines.find((m) => m.id === r.machineId);
  if (!asked) return [];
  const out: { m: Machine; slot: number; d: number }[] = [];
  for (const m of activeMachines(state)) {
    if (m.broken) continue;
    const d = m.id === asked.id ? 0 : distanceM(m, asked);
    if (d > REQUESTS.serveRadiusM) continue;
    const slot = m.slots.findIndex((s) => s.productId === r.productId && s.qty > 0);
    if (slot >= 0 && m.slots[slot].priceCents > 0) out.push({ m, slot, d });
  }
  return out.sort((a, b) => a.d - b.d);
}

/**
 * Serve open requests that one of your machines can now sell (the customer
 * buys one and tips), and let the ones that waited too long go. Runs every
 * advance step, live or not.
 */
export function serveRequests(
  state: GameState,
  t: number,
  opts: { salesBonus?: number } = {},
): RequestNews[] {
  const rq = state.requests;
  const news: RequestNews[] = [];
  const keep: CustomerRequest[] = [];
  for (const r of rq.open) {
    const server = servers(state, r).find(
      ({ m, slot }) =>
        cashBoxCapacity(state, getMachineType(m.typeId)) - m.cashBoxCents >=
        m.slots[slot].priceCents,
    );
    if (server) {
      const s = server.m.slots[server.slot];
      const cents = sellUnits(state, server.m, s, 1, t, opts.salesBonus ?? 0);
      const tipCents = Math.round(cents * REQUESTS.tipShare);
      state.cashCents += tipCents;
      addLedger(state, 'Tips', tipCents);
      rq.served += 1;
      news.push({ kind: 'served', request: r, machineId: server.m.id, cents, tipCents });
    } else if (t >= r.until || !state.machines.some((m) => m.id === r.machineId)) {
      news.push({ kind: 'gone', request: r });
    } else {
      keep.push(r);
    }
  }
  rq.open = keep;
  return news;
}

/**
 * Maybe a new customer request (call on live ticks only). Someone from a real
 * place near one of your machines asks for a product that place makes them
 * want, and that isn't in stock nearby yet. Mostly things this machine can
 * carry; sometimes something only another machine type sells (a hint).
 */
export function rollRequest(state: GameState, world: World, t: number): RequestNews | null {
  const rq = state.requests;
  // Tutorial first: the first sale and the first collect.
  if (state.ledger.lifetimeNetCents <= 0) return null;
  if (rq.nextAt === 0) {
    rq.nextAt = t + REQUESTS.firstAfterMs;
    return null;
  }
  if (t < rq.nextAt) return null;
  const key = `${state.id}|request|${rq.nextAt}`;
  const r = (k: string) => keyedUnit(`${key}|${k}`);
  rq.nextAt =
    t + REQUESTS.gapMinMs + Math.round(r('gap') * (REQUESTS.gapMaxMs - REQUESTS.gapMinMs));
  if (rq.open.length >= REQUESTS.maxOpen) return null;

  const machines = activeMachines(state).filter(
    (m) => !m.broken && !rq.open.some((x) => x.machineId === m.id),
  );
  if (!machines.length) return null;
  const start = Math.floor(r('machine') * machines.length) % machines.length;
  for (let i = 0; i < machines.length; i++) {
    const m = machines[(start + i) % machines.length];
    const made = requestAt(state, world, m, t, (k) => r(`${i}|${k}`), key);
    if (made) {
      rq.open.push(made);
      return { kind: 'new', request: made };
    }
  }
  return null;
}

/** Weighted pick: index into `weights` for a unit roll, or -1 when all are 0. */
function pick(weights: number[], u: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  let x = u * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}

function requestAt(
  state: GameState,
  world: World,
  m: Machine,
  t: number,
  r: (k: string) => number,
  key: string,
): CustomerRequest | null {
  // Where the customer comes from: a named place nearby, or the homes around.
  const origins: { placeId?: string; name: string; category: CurveKey; weight: number }[] = [];
  for (const p of nearbyPlaces(world, state, m, REQUESTS.originRadiusM)) {
    const w = REQUEST_WANTS[p.category]?.weight ?? 0;
    if (w > 0)
      origins.push({
        placeId: p.id,
        name: p.name,
        category: p.category,
        weight: w * distanceDecay(p.distanceM),
      });
  }
  const pop = world.cells.get(m.cellId)?.pop ?? 0;
  const homeWeight =
    (REQUEST_WANTS.residential?.weight ?? 0) * (pop / 1000) * REQUESTS.residentsPerThousand;
  if (homeWeight > 0) origins.push({ name: '', category: 'residential', weight: homeWeight });

  // Something not in stock within walking distance yet (else it's served at once).
  const stockedNearby = new Set<string>();
  for (const x of activeMachines(state)) {
    if (x.id !== m.id && distanceM(x, m) > REQUESTS.serveRadiusM) continue;
    for (const s of x.slots) if (s.productId && s.qty > 0) stockedNearby.add(s.productId);
  }
  const wantOther = r('other') < REQUESTS.otherMachineShare;

  // Try origins in weighted order until one has a fitting product.
  const left = origins.slice();
  for (let attempt = 0; left.length && attempt < 6; attempt++) {
    const oi = pick(
      left.map((o) => o.weight),
      r(`origin${attempt}`),
    );
    if (oi < 0) break;
    const origin = left.splice(oi, 1)[0];
    const wants = REQUEST_WANTS[origin.category]?.wants ?? [];
    const want = wants[Math.floor(r(`want${attempt}`) * wants.length) % wants.length];
    if (!want) continue;
    const fresh = want.products.filter((id) => !stockedNearby.has(id));
    const carry = fresh.filter((id) => canCarry(state, m, id));
    // Hints only for other machine types: a product this type holds but hasn't
    // unlocked yet would point at the same kind of machine.
    const holds = getMachineType(m.typeId).holds;
    const other = fresh.filter(
      (id) => !holds.includes(getProduct(id).family) && machineTypeFor(id) !== null,
    );
    // Hints for another machine type stay a minority; otherwise something this machine can sell.
    const pool = wantOther ? other : carry;
    if (!pool.length) continue;
    const productId = pool[Math.floor(r(`product${attempt}`) * pool.length) % pool.length];
    return {
      id: `rq-${Math.round(keyedUnit(`${key}|id`) * 1e9).toString(36)}-${m.id}`,
      machineId: m.id,
      from: { placeId: origin.placeId, name: origin.name, category: origin.category },
      reason: want.reason,
      productId,
      at: t,
      until: t + REQUESTS.waitMs,
    };
  }
  return null;
}
