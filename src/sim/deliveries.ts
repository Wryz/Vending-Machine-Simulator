import { DELIVERY, ROADS } from '@/config/deliveries';
import { SERVICE } from '@/config/economy';

import {
  checkRestock,
  fillSlots,
  markVisited,
  restockCostCents,
  type ActionResult,
} from './actions';
import { nextId } from './create';
import { distanceM } from './geo';
import { addLedger, log } from './ledger';
import { vanCapacity } from './rules';
import type { Delivery, GameState, Machine, RestockLine, World } from './state';

/**
 * Restock deliveries (SPEC §4.1 Service). The player's restock is an order:
 * paid now, a van loads at the nearest supermarket or cash-and-carry, drives
 * to the machine and fills it on arrival (with the fresh-stock bonus).
 */

export type DeliveryNews =
  | { kind: 'arrived'; delivery: Delivery; units: number }
  /** The machine was picked up or sold on the way: the stock goes back, refunded. */
  | { kind: 'returned'; delivery: Delivery };

/** Where a van for this spot loads: the nearest warehouse, else a depot at the city center. */
export function nearestSupplier(world: World, at: { lat: number; lng: number }): Delivery['from'] {
  let best: Delivery['from'] | null = null;
  let bestD = Infinity;
  for (const s of world.suppliers ?? []) {
    const d = distanceM(at, s);
    if (d < bestD) {
      bestD = d;
      best = { id: s.id, name: s.name, kind: s.kind, lat: s.lat, lng: s.lng };
    }
  }
  return best ?? { id: 'depot', name: '', kind: 'depot', lat: world.city.lat, lng: world.city.lng };
}

/** Vans the player has (by van level). */
export function vanCount(state: GameState): number {
  return DELIVERY.vansByLevel[Math.min(state.vanLevel, DELIVERY.vansByLevel.length - 1)];
}

export function vansFree(state: GameState): number {
  return Math.max(0, vanCount(state) - state.deliveries.length);
}

/** The van on its way to this machine, if any. */
export function deliveryFor(state: GameState, machineId: string): Delivery | null {
  return state.deliveries.find((d) => d.machineId === machineId) ?? null;
}

/** Drive time for a road distance (clamped so trips stay fun to watch). */
export function driveMsFor(roadM: number): number {
  return Math.round(
    Math.min(DELIVERY.maxDriveMs, Math.max(DELIVERY.minDriveMs, (roadM / 1000) * DELIVERY.msPerKm)),
  );
}

/**
 * The van's way from the warehouse to the machine: along the streets when the
 * city has road data, else a straight line (road length ≈ straight × routeFactor).
 */
export function routeFor(
  world: World,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): { path: [number, number][]; roadM: number } {
  const r = world.route?.(from, to);
  if (r && r.path.length >= 2) return { path: thin(r.path), roadM: r.lengthM };
  return {
    path: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    roadM: distanceM(from, to) * SERVICE.routeFactor,
  };
}

function thin(path: [number, number][]): [number, number][] {
  const r5 = (v: number) => Math.round(v * 1e5) / 1e5;
  const max = ROADS.maxPathPoints;
  const step = Math.ceil(path.length / max);
  const out = path.filter((_, i) => i % step === 0 || i === path.length - 1);
  return out.map(([x, y]) => [r5(x), r5(y)]);
}

/**
 * The warehouse nearest by road and the van's way from it: the few closest in
 * a straight line are routed, and the shortest drive wins (a warehouse across
 * the river is not "near").
 */
export function supplierRoute(
  world: World,
  to: { lat: number; lng: number },
): { from: Delivery['from']; path: [number, number][]; roadM: number } {
  const all = world.suppliers ?? [];
  if (!all.length || !world.route) {
    const from = nearestSupplier(world, to);
    return { from, ...routeFor(world, from, to) };
  }
  const near = all
    .map((s) => ({ s, d: distanceM(to, s) }))
    .sort((a, b) => a.d - b.d || a.s.id.localeCompare(b.s.id))
    .slice(0, DELIVERY.routeCandidates);
  let best: { from: Delivery['from']; path: [number, number][]; roadM: number } | null = null;
  for (const { s } of near) {
    const from: Delivery['from'] = { id: s.id, name: s.name, kind: s.kind, lat: s.lat, lng: s.lng };
    const r = routeFor(world, from, to);
    if (!best || r.roadM < best.roadM) best = { from, ...r };
  }
  return best!;
}

/** What an order would cost and how long it takes, before ordering. */
export function quoteDelivery(
  state: GameState,
  world: World,
  m: Machine,
  lines: readonly RestockLine[],
): {
  from: Delivery['from'];
  path: [number, number][];
  wholesaleCents: number;
  fuelCents: number;
  etaMs: number;
} {
  const { from, path, roadM } = supplierRoute(world, m);
  // There and back.
  const fuelCents = Math.round(((2 * roadM) / 1000) * SERVICE.fuelCentsPerKm);
  return {
    from,
    path,
    wholesaleCents: restockCostCents(state, lines),
    fuelCents,
    etaMs: DELIVERY.loadMs + driveMsFor(roadM),
  };
}

/** Order a restock: pay now; a van brings it. */
export function orderRestock(
  state: GameState,
  world: World,
  machineId: string,
  lines: readonly RestockLine[],
): ActionResult<{ delivery: Delivery }> {
  const m = state.machines.find((x) => x.id === machineId);
  if (!m || m.status !== 'active') return { ok: false, error: 'Machine not found.' };
  const units = lines.reduce((a, l) => a + l.qty, 0);
  if (units <= 0) return { ok: false, error: 'Pick something to restock.' };
  if (deliveryFor(state, machineId))
    return { ok: false, error: 'A van is already on its way here.' };
  if (vansFree(state) <= 0) return { ok: false, error: 'All your vans are out.' };
  const problem = checkRestock(state, m, lines, vanCapacity(state));
  if (problem) return { ok: false, error: problem };
  const q = quoteDelivery(state, world, m, lines);
  const cost = q.wholesaleCents + q.fuelCents;
  if (cost > state.cashCents) return { ok: false, error: 'Not enough cash for this stock.' };
  state.cashCents -= cost;
  addLedger(state, 'Wholesale', -q.wholesaleCents);
  if (q.fuelCents) addLedger(state, 'Fuel', -q.fuelCents);
  const departAt = state.now + DELIVERY.loadMs;
  const delivery: Delivery = {
    id: nextId(state, 'd'),
    machineId,
    lines: lines.map((l) => ({ ...l })),
    units,
    from: q.from,
    path: q.path,
    orderedAt: state.now,
    departAt,
    arriveAt: state.now + q.etaMs,
    wholesaleCents: q.wholesaleCents,
    fuelCents: q.fuelCents,
  };
  state.deliveries.push(delivery);
  log(state, 'restock', `Van on its way with ${units} items`, m.id, -cost);
  return { ok: true, delivery };
}

/** Vans that reach their machine by `t` fill it. Runs every sim step, live and offline. */
export function arriveDeliveries(state: GameState, t: number): DeliveryNews[] {
  if (!state.deliveries.length) return [];
  const news: DeliveryNews[] = [];
  const due = state.deliveries
    .filter((d) => d.arriveAt <= t)
    .sort((a, b) => a.arriveAt - b.arriveAt);
  if (!due.length) return news;
  const gone = new Set(due.map((d) => d.id));
  state.deliveries = state.deliveries.filter((d) => !gone.has(d.id));
  for (const d of due) {
    const m = state.machines.find((x) => x.id === d.machineId);
    if (!m || m.status !== 'active') {
      state.cashCents += d.wholesaleCents;
      addLedger(state, 'Wholesale', d.wholesaleCents);
      news.push({ kind: 'returned', delivery: d });
      continue;
    }
    // Checked when ordered; fillSlots still never goes past a coil's capacity.
    const units = fillSlots(state, m, d.lines);
    markVisited(state, m);
    log(state, 'restock', `Restocked ${units} items`, m.id, 0);
    news.push({ kind: 'arrived', delivery: d, units });
  }
  return news;
}

/** Where a van is now: 0 at the store (loading), 1 at the machine. */
export function deliveryProgress(d: Delivery, t: number): number {
  if (t <= d.departAt) return 0;
  return Math.min(1, (t - d.departAt) / Math.max(1, d.arriveAt - d.departAt));
}
