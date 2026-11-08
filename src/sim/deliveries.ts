import { DELIVERY, RESTOCK_RUN, ROADS } from '@/config/deliveries';
import { SERVICE } from '@/config/economy';
import { getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';

import {
  checkRestock,
  collectCash,
  fillSlots,
  markVisited,
  restockCostCents,
  suggestRestock,
  type ActionResult,
} from './actions';
import { nextId } from './create';
import { distanceM, orderStops } from './geo';
import { addLedger, log } from './ledger';
import { hasResearch } from './demand';
import { driverCapacity, slotCapacity, vanCapacity, wholesaleCents } from './rules';
import type { Delivery, Driver, GameState, Machine, RestockLine, World } from './state';

/**
 * Restock deliveries (SPEC §4.1 Service). The player's restock is an order:
 * paid now, a van loads at the nearest warehouse by road, drives the streets
 * to the machine and fills it on arrival (with the fresh-stock bonus). One van
 * can run several stops; hired drivers' route runs use the same vans.
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

/** The player's own vans on the road (a multi-stop run is one van; drivers' vans are theirs). */
export function vansOut(state: GameState): number {
  return new Set(state.deliveries.filter((d) => !d.driverId).map((d) => d.run ?? d.id)).size;
}

export function vansFree(state: GameState): number {
  return Math.max(0, vanCount(state) - vansOut(state));
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
  const plan = planRun(state, world, [{ machine: m, lines }]);
  return {
    from: plan.from,
    path: plan.legs[0].path,
    wholesaleCents: plan.wholesaleCents,
    fuelCents: plan.fuelCents,
    etaMs: plan.legs[0].arriveIn,
  };
}

export interface RunStop {
  machine: Machine;
  lines: readonly RestockLine[];
}

export interface RunPlan {
  from: Delivery['from'];
  /** Stops in driving order; times are from now. */
  legs: {
    machine: Machine;
    lines: RestockLine[];
    path: [number, number][];
    wholesaleCents: number;
    departIn: number;
    arriveIn: number;
  }[];
  wholesaleCents: number;
  /** There and back: every leg plus the drive home to the warehouse. */
  fuelCents: number;
  /** When the last stop is filled, from now. */
  doneIn: number;
}

/**
 * One van's run: it loads at the warehouse nearest the route by road, then
 * drives stop to stop (nearest next) along the streets, unloading at each.
 */
export function planRun(state: GameState, world: World, stops: readonly RunStop[]): RunPlan {
  const first = orderStops(
    world.city,
    stops.map((x) => ({ ...x, lat: x.machine.lat, lng: x.machine.lng })),
  )[0];
  const { from } = supplierRoute(world, first);
  const ordered = orderStops(
    from,
    stops.map((x) => ({ ...x, lat: x.machine.lat, lng: x.machine.lng })),
  );
  let at: { lat: number; lng: number } = from;
  let clock = DELIVERY.loadMs;
  let roadTotal = 0;
  let wholesaleTotal = 0;
  const legs: RunPlan['legs'] = ordered.map((x, i) => {
    const r = routeFor(world, at, x.machine);
    at = x.machine;
    if (i > 0) clock += DELIVERY.unloadMs;
    const departIn = clock;
    clock += driveMsFor(r.roadM);
    roadTotal += r.roadM;
    const wholesale = restockCostCents(state, x.lines);
    wholesaleTotal += wholesale;
    return {
      machine: x.machine,
      lines: x.lines.map((l) => ({ ...l })),
      path: r.path,
      wholesaleCents: wholesale,
      departIn,
      arriveIn: clock,
    };
  });
  // Home again: one stop is the same road back; a longer run drives back from its last stop.
  roadTotal += legs.length === 1 ? roadTotal : routeFor(world, at, from).roadM;
  return {
    from,
    legs,
    wholesaleCents: wholesaleTotal,
    fuelCents: Math.round((roadTotal / 1000) * SERVICE.fuelCentsPerKm),
    doneIn: clock,
  };
}

/** Pay for a planned run and put its van on the road. */
function dispatch(state: GameState, plan: RunPlan, driverId?: string): Delivery[] {
  state.cashCents -= plan.wholesaleCents + plan.fuelCents;
  if (plan.wholesaleCents) addLedger(state, 'Wholesale', -plan.wholesaleCents);
  if (plan.fuelCents) addLedger(state, 'Fuel', -plan.fuelCents);
  const run = nextId(state, 'r');
  const out = plan.legs.map((leg, i): Delivery => {
    const d: Delivery = {
      id: nextId(state, 'd'),
      machineId: leg.machine.id,
      lines: leg.lines,
      units: leg.lines.reduce((a, l) => a + l.qty, 0),
      from: plan.from,
      path: leg.path,
      orderedAt: state.now,
      departAt: state.now + leg.departIn,
      arriveAt: state.now + leg.arriveIn,
      wholesaleCents: leg.wholesaleCents,
      // The run's fuel is paid once, on its first stop.
      fuelCents: i === 0 ? plan.fuelCents : 0,
      run,
      leg: i,
    };
    if (driverId) d.driverId = driverId;
    return d;
  });
  state.deliveries.push(...out);
  return out;
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
  const plan = planRun(state, world, [{ machine: m, lines }]);
  if (plan.wholesaleCents + plan.fuelCents > state.cashCents)
    return { ok: false, error: 'Not enough cash for this stock.' };
  const [delivery] = dispatch(state, plan);
  log(
    state,
    'restock',
    `Van on its way with ${units} items`,
    m.id,
    -(plan.wholesaleCents + plan.fuelCents),
  );
  return { ok: true, delivery };
}

/** How full a machine is (0..1) across its coils. */
export function fillShare(state: GameState, m: Machine): number {
  const cap = slotCapacity(state, getMachineType(m.typeId)) * m.slots.length;
  return cap > 0 ? m.slots.reduce((a, x) => a + x.qty, 0) / cap : 1;
}

/**
 * Machines the "Restock low" key would send a van to: running low, no van on
 * the way, and not on a hired driver's route (the driver handles those).
 */
export function lowMachines(state: GameState): Machine[] {
  const driven = new Set(state.drivers.flatMap((d) => d.machineIds));
  return state.machines
    .filter(
      (m) =>
        m.status === 'active' &&
        !driven.has(m.id) &&
        !deliveryFor(state, m.id) &&
        fillShare(state, m) <= RESTOCK_RUN.lowShare,
    )
    .sort((a, b) => fillShare(state, a) - fillShare(state, b) || a.id.localeCompare(b.id));
}

/**
 * The "Restock low" run: the emptiest machines first, each topped up with its
 * usual products while the van has room and the cash lasts.
 */
export function planLowRun(state: GameState, world: World): RunPlan | null {
  let room = vanCapacity(state);
  let cash = state.cashCents;
  const low = lowMachines(state).slice(0, RESTOCK_RUN.maxStops);
  const stops: RunStop[] = [];
  low.forEach((m, i) => {
    // Share the van fairly: each stop gets its part of what room is left.
    const share = Math.floor(room / (low.length - i));
    if (share <= 0) return;
    let lines = suggestRestock(state, m.id, share);
    // Keep the trip affordable: trim the stop to what the cash still covers.
    while (lines.length && restockCostCents(state, lines) > cash) {
      const last = lines[lines.length - 1];
      lines =
        last.qty > 1 ? [...lines.slice(0, -1), { ...last, qty: last.qty - 1 }] : lines.slice(0, -1);
    }
    const units = lines.reduce((a, l) => a + l.qty, 0);
    if (units <= 0) return;
    stops.push({ machine: m, lines });
    room -= units;
    cash -= restockCostCents(state, lines);
  });
  return stops.length ? planRun(state, world, stops) : null;
}

/** Send one van to every machine running low. */
export function orderLowRun(
  state: GameState,
  world: World,
): ActionResult<{ deliveries: Delivery[]; units: number }> {
  if (vansFree(state) <= 0) return { ok: false, error: 'All your vans are out.' };
  const plan = planLowRun(state, world);
  if (!plan) return { ok: false, error: 'Nothing is running low.' };
  const cost = plan.wholesaleCents + plan.fuelCents;
  if (cost > state.cashCents) return { ok: false, error: 'Not enough cash for this stock.' };
  const deliveries = dispatch(state, plan);
  const units = deliveries.reduce((a, d) => a + d.units, 0);
  log(
    state,
    'restock',
    `Van on its way with ${units} items for ${deliveries.length} machines`,
    undefined,
    -cost,
  );
  return { ok: true, deliveries, units };
}

/**
 * A hired driver's route run (SPEC §4.2): their van loads at the warehouse and
 * drives the route, topping each machine up (to par with auto-reorder) and
 * emptying its cash box. Machines with a van already on the way are skipped.
 * Returns what the run cost (stock plus fuel).
 */
export function dispatchDriver(state: GameState, world: World, driver: Driver): number {
  let capacity = driverCapacity(state);
  let cash = state.cashCents;
  const stops: RunStop[] = [];
  for (const id of driver.machineIds) {
    const m = state.machines.find((x) => x.id === id);
    if (!m || m.status !== 'active' || deliveryFor(state, m.id)) continue;
    const type = getMachineType(m.typeId);
    const cap = slotCapacity(state, type);
    const autoReorder = hasResearch(state, 'auto-reorder', type.family);
    const lines: RestockLine[] = [];
    m.slots.forEach((s, i) => {
      if (!s.productId || capacity <= 0) return;
      const target = autoReorder && s.par > 0 ? Math.min(cap, s.par) : cap;
      const need = Math.min(capacity, Math.max(0, target - s.qty));
      if (need <= 0) return;
      const cost = wholesaleCents(state, getProduct(s.productId)) * need;
      if (cost > cash) return;
      cash -= cost;
      capacity -= need;
      lines.push({ slot: i, productId: s.productId, qty: need });
    });
    // A stop for the cash box alone is still worth it.
    if (lines.length || m.cashBoxCents > 0) stops.push({ machine: m, lines });
  }
  if (!stops.length) return 0;
  const plan = planRun(state, world, stops);
  if (plan.wholesaleCents + plan.fuelCents > state.cashCents) return 0;
  const out = dispatch(state, plan, driver.id);
  const units = out.reduce((a, d) => a + d.units, 0);
  log(state, 'driver', `${driver.name}'s van left with ${units} items for ${out.length} machines`);
  return plan.wholesaleCents + plan.fuelCents;
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
      if (d.wholesaleCents) addLedger(state, 'Wholesale', d.wholesaleCents);
      news.push({ kind: 'returned', delivery: d });
      continue;
    }
    // Checked when ordered; fillSlots still never goes past a coil's capacity.
    const units = d.lines.length ? fillSlots(state, m, d.lines) : 0;
    if (d.driverId) {
      // The driver's stop: no fresh-stock bonus (that is for the owner's own visits).
      collectCash(state, m.id);
      if (units > 0) log(state, 'restock', `Driver restocked ${units} items`, m.id, 0);
    } else {
      markVisited(state, m);
      log(state, 'restock', `Restocked ${units} items`, m.id, 0);
    }
    news.push({ kind: 'arrived', delivery: d, units });
  }
  return news;
}

/** The stop each van is driving to now: per run, the first one not reached yet. */
export function currentLegs(deliveries: readonly Delivery[]): Delivery[] {
  const byRun = new Map<string, Delivery>();
  for (const d of deliveries) {
    const key = d.run ?? d.id;
    const cur = byRun.get(key);
    if (!cur || (d.leg ?? 0) < (cur.leg ?? 0)) byRun.set(key, d);
  }
  return [...byRun.values()];
}

/** Where a van is now: 0 at the store (loading), 1 at the machine. */
export function deliveryProgress(d: Delivery, t: number): number {
  if (t <= d.departAt) return 0;
  return Math.min(1, (t - d.departAt) / Math.max(1, d.arriveAt - d.departAt));
}
