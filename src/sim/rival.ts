import { COMPETITION, CONTRACT, DEMAND_SCALE, RIVAL } from '@/config/economy';
import { getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';

import type { ActionResult } from './actions';
import { baseTraffic, competitionShare } from './demand';
import { distanceM, offsetPoint } from './geo';
import { log } from './ledger';
import { keyedUnit, nextRandom, pick } from './rng';
import { activeMachines, isEmpty } from './rules';
import type { GameState, Machine, RivalMachine, World } from './state';
import { businessHoursToMs, type LocalTime } from './time';

/**
 * Brightvend, the AI rival (SPEC §4.6), run by its owner Rex Brightley.
 * Readable and beatable:
 * - day one: once the tutorial is through, one machine opens near your first
 *   one; a small early fleet (1–2) that competes gently until chapter 3;
 * - chapter 3 ramp: its full fleet arrives and grows near yours, never more
 *   than `maxFleetRatio` × your fleet;
 * - undercuts prices (its machines count extra as competitors once ramped);
 * - bids for contracts when a venue is unhappy at renewal (after the ramp);
 * - retreats when you dominate the market.
 * Everything it does is also reported as `RivalNews` for the rival's cards.
 */

/** Something the rival did (or that happened to it), for the rival's taunt cards. */
export type RivalNewsKind =
  /** Its first machine opened (day one, or chapter 3 for old saves). */
  | 'arrives'
  /** Chapter 3: its full fleet rolls in. */
  | 'ramp'
  /** A new machine near yours, undercutting your prices. */
  | 'placed'
  /** You pushed it out of a spot. */
  | 'retreat'
  /** It took over a contract you lost. */
  | 'steal'
  /** You passed it in market share. */
  | 'passed'
  /** It passed you in market share. */
  | 'behind';

export interface RivalNews {
  kind: RivalNewsKind;
  rivalId?: string;
  /** Your machine it is about (nearest, or the lost one). */
  machineId?: string;
}

/** A customer near your machine bought at the rival's instead (map moment, live play only). */
export interface RivalSting {
  machineId: string;
  rivalId: string;
  /** What they spent at the rival. */
  cents: number;
}

export function playerShare(state: GameState): number {
  const p = state.ledger.recentPlayerCents;
  const r = state.ledger.recentRivalCents;
  if (p + r <= 0) return state.rival.active ? 0.5 : 1;
  return p / (p + r);
}

function exclusiveZone(state: GameState, lat: number, lng: number): boolean {
  return activeMachines(state).some(
    (m) => m.contract.exclusive && distanceM(m, { lat, lng }) <= CONTRACT.exclusivityRadiusM,
  );
}

function noonTraffic(world: World, cellId: string): number {
  const cell = world.cells.get(cellId);
  return cell ? baseTraffic(cell, 12.5, false).total : 0;
}

/** Deterministic pseudo-random in [0,1) from a key (does not touch the sim's RNG stream). */
export function keyed(key: string): number {
  return keyedUnit(key);
}

/** Your nearest active machine to a point, with its distance. */
export function nearestMine(
  state: GameState,
  p: { lat: number; lng: number },
): { machine: Machine; distanceM: number } | null {
  let best: { machine: Machine; distanceM: number } | null = null;
  for (const m of activeMachines(state)) {
    const d = distanceM(m, p);
    if (!best || d < best.distanceM) best = { machine: m, distanceM: d };
  }
  return best;
}

function newRivalMachine(
  state: GameState,
  pos: { lat: number; lng: number },
  cellId: string,
  t: number,
): RivalMachine {
  const machine: RivalMachine = {
    id: `r${state.nextId++}`,
    lat: pos.lat,
    lng: pos.lng,
    cellId,
    typeId: nextRandom(state) < 0.6 ? 'snack' : 'cold-drinks',
    placedAt: t,
  };
  state.rival.machines.push(machine);
  return machine;
}

function freeSpot(state: GameState, pos: { lat: number; lng: number }): boolean {
  if (exclusiveZone(state, pos.lat, pos.lng)) return false;
  if (activeMachines(state).some((m) => distanceM(m, pos) < 15)) return false;
  return !state.rival.machines.some((r) => distanceM(r, pos) < 15);
}

export function placeRivalMachine(
  state: GameState,
  world: World,
  t: number,
  near?: { lat: number; lng: number },
): RivalMachine | null {
  const mine = activeMachines(state);
  const anchor = near ?? (mine.length ? pick(state, mine) : world.city);
  const anchorCell = world.cellOf(anchor.lat, anchor.lng);
  const taken = new Set(state.rival.machines.map((r) => r.cellId));
  const candidates = world
    .neighbors(anchorCell, 3)
    .filter((id) => world.cells.has(id) && !taken.has(id))
    .map((id) => ({ id, traffic: noonTraffic(world, id) }))
    .filter((c) => c.traffic > 0)
    .sort((a, b) => b.traffic - a.traffic)
    .slice(0, 4);
  for (const c of candidates) {
    const cell = world.cells.get(c.id)!;
    const pos = offsetPoint(cell, nextRandom(state) * 360, 10 + nextRandom(state) * 30);
    if (!freeSpot(state, pos)) continue;
    return newRivalMachine(state, pos, c.id, t);
  }
  return null;
}

/**
 * The day-one machine: close to your first machine, inside the competition
 * radius, so the two go head to head where you can see it.
 */
export function placeRivalNear(
  state: GameState,
  world: World,
  t: number,
  anchor: { lat: number; lng: number },
): RivalMachine | null {
  const { placeMinM, placeMaxM } = RIVAL.early;
  const start = nextRandom(state) * 360;
  for (let i = 0; i < 8; i++) {
    const dist = placeMinM + nextRandom(state) * (placeMaxM - placeMinM);
    const pos = offsetPoint(anchor, start + i * 45, dist);
    const cellId = world.cellOf(pos.lat, pos.lng);
    if (!world.cells.has(cellId) || !freeSpot(state, pos)) continue;
    return newRivalMachine(state, pos, cellId, t);
  }
  return placeRivalMachine(state, world, t, anchor);
}

/** Day one: the tutorial is through (first sale and collect) and you've sold enough. */
function earlyArrivalDue(state: GameState): boolean {
  if (state.chapter >= RIVAL.arrivesChapter) return true;
  return (
    state.ledger.lifetimeUnits > 0 &&
    state.ledger.lifetimeNetCents > 0 &&
    state.ledger.lifetimeSalesCents >= RIVAL.early.afterSalesCents &&
    activeMachines(state).length > 0
  );
}

/** Max rival machines right now. */
export function rivalCap(state: GameState): number {
  if (!state.rival.ramped)
    return RIVAL.early.maxMachines[state.chapter] ?? RIVAL.early.maxMachines[2] ?? 1;
  return Math.max(RIVAL.startFleet, Math.ceil(activeMachines(state).length * RIVAL.maxFleetRatio));
}

function firstPlaced(state: GameState): Machine | null {
  const mine = activeMachines(state);
  if (!mine.length) return null;
  return mine.reduce((a, b) => (b.placedAt < a.placedAt ? b : a));
}

function news(
  out: RivalNews[] | undefined,
  state: GameState,
  kind: RivalNewsKind,
  r: RivalMachine | null,
  machineId?: string,
): void {
  if (!out) return;
  out.push({
    kind,
    rivalId: r?.id,
    machineId: machineId ?? (r ? nearestMine(state, r)?.machine.id : undefined),
  });
}

/** Rival decisions; returns true when its fleet changed (competition must be recomputed). */
export function rivalDecide(state: GameState, world: World, t: number, out?: RivalNews[]): boolean {
  const rival = state.rival;
  let changed = false;
  if (!rival.active) {
    if (!earlyArrivalDue(state)) return false;
    changed = true;
    rival.active = true;
    rival.nextDecisionAt = t + businessHoursToMs(RIVAL.decisionEveryHours);
    const first = firstPlaced(state);
    const r = first ? placeRivalNear(state, world, t, first) : placeRivalMachine(state, world, t);
    log(state, 'rival', `${RIVAL.name} has entered the city.`);
    news(out, state, 'arrives', r);
    // Chapter 3 or later already (old saves): ramp in this same step.
  }
  if (!rival.ramped && state.chapter >= RIVAL.arrivesChapter) {
    changed = true;
    rival.ramped = true;
    rival.nextDecisionAt = Math.min(rival.nextDecisionAt, t);
    let first: RivalMachine | null = null;
    for (let i = 0; i < RIVAL.startFleet; i++) first ??= placeRivalMachine(state, world, t);
    news(out, state, 'ramp', first);
  }
  while (rival.nextDecisionAt <= t) {
    rival.nextDecisionAt += businessHoursToMs(RIVAL.decisionEveryHours);
    const share = playerShare(state);
    const cap = rivalCap(state);
    // Before the ramp the rival keeps its one face on the map.
    const floor = rival.ramped ? 0 : 1;
    if (share > 0.7 && rival.machines.length > floor && nextRandom(state) < share - 0.6) {
      const gone = rival.machines.splice(
        Math.floor(nextRandom(state) * rival.machines.length),
        1,
      )[0];
      log(
        state,
        'rival',
        `${RIVAL.name} pulled a machine out (${Math.round(share * 100)}% share is yours).`,
      );
      news(out, state, 'retreat', gone);
      changed = true;
    } else if (
      rival.machines.length < cap &&
      nextRandom(state) < RIVAL.growthChance * (1.2 - share)
    ) {
      const r = placeRivalMachine(state, world, t);
      if (r) {
        log(state, 'rival', `${RIVAL.name} placed a machine near yours.`);
        news(out, state, 'placed', r);
        changed = true;
      }
    }
  }
  return changed;
}

/**
 * Who leads the market share, with hysteresis; reports a pass either way.
 * The first judgement is silent (nobody "passed" anyone yet).
 */
export function updateLead(state: GameState, out?: RivalNews[]): void {
  const rival = state.rival;
  if (!rival.active) return;
  const { recentPlayerCents: p, recentRivalCents: r } = state.ledger;
  if (p < RIVAL.leadMinCents || r < RIVAL.leadMinCents) return;
  const share = playerShare(state);
  const h = RIVAL.leadHysteresis;
  if (rival.lead !== 'player' && share >= 0.5 + h) {
    if (rival.lead === 'rival') news(out, state, 'passed', null);
    rival.lead = 'player';
  } else if (rival.lead !== 'rival' && share <= 0.5 - h) {
    if (rival.lead === 'player') news(out, state, 'behind', null);
    rival.lead = 'rival';
  }
}

/** The rival's price for one of your slots' products (it undercuts the suggested price). */
export function rivalPriceCents(suggestedCents: number): number {
  return Math.max(5, Math.round((suggestedCents * (1 - RIVAL.priceUndercut)) / 5) * 5);
}

function avgPrices(m: Machine): { yours: number; theirs: number } | null {
  let yours = 0;
  let theirs = 0;
  let n = 0;
  for (const s of m.slots) {
    if (!s.productId) continue;
    yours += s.priceCents;
    theirs += rivalPriceCents(getProduct(s.productId).suggestedCents);
    n++;
  }
  return n ? { yours: Math.round(yours / n), theirs: Math.round(theirs / n) } : null;
}

/**
 * A customer near one of your machines buys at a rival machine instead
 * (live play only, rate-limited). Purely a moment: the lost sales are already
 * in the competition share (SPEC §5.2). Keyed randomness, so the sim's RNG
 * stream is untouched.
 */
export function rivalSting(state: GameState, t: number): RivalSting | null {
  const rival = state.rival;
  if (!rival.active || !rival.machines.length) return null;
  if (t - rival.lastStingAt < RIVAL.sting.minGapMs) return null;
  const key = `${state.id}|sting|${Math.floor(t / 60_000)}`;
  if (keyed(key) >= RIVAL.sting.chancePerMinute) return null;
  const pairs: { m: Machine; r: RivalMachine }[] = [];
  for (const m of activeMachines(state)) {
    if (m.broken || isEmpty(m)) continue;
    for (const r of rival.machines)
      if (distanceM(m, r) <= COMPETITION.radiusM) pairs.push({ m, r });
  }
  if (!pairs.length) return null;
  const { m, r } = pairs[Math.floor(keyed(`${key}|pair`) * pairs.length) % pairs.length];
  const prices = avgPrices(m);
  rival.lastStingAt = t;
  return { machineId: m.id, rivalId: r.id, cents: prices?.theirs ?? 150 };
}

/** What the rival card shows: its prices vs yours at your nearest machine. */
export interface RivalMatchup {
  rival: RivalMachine;
  /** Your nearest machine (any distance), or null when you have none placed. */
  nearest: { machineId: string; venueName: string; distanceM: number } | null;
  /** Average price per item at your nearest machine vs the rival's for the same products. */
  yoursCents: number | null;
  theirsCents: number | null;
  /** Your machines inside the competition radius (what "Undercut" reprices). */
  nearbyIds: string[];
}

export function rivalMatchup(state: GameState, rivalId: string): RivalMatchup | null {
  const r = state.rival.machines.find((x) => x.id === rivalId);
  if (!r) return null;
  const near = nearestMine(state, r);
  const prices = near ? avgPrices(near.machine) : null;
  return {
    rival: r,
    nearest: near
      ? {
          machineId: near.machine.id,
          venueName: near.machine.venue.name,
          distanceM: Math.round(near.distanceM),
        }
      : null,
    yoursCents: prices?.yours ?? null,
    theirsCents: prices?.theirs ?? null,
    nearbyIds: activeMachines(state)
      .filter((m) => distanceM(m, r) <= COMPETITION.radiusM)
      .map((m) => m.id),
  };
}

/**
 * Counter-move "Undercut": your machines near a rival machine drop their
 * prices to `RIVAL.counterPriceRatio` × suggested (below the rival's), never
 * raising a price that is already lower. Price setting must be unlocked.
 */
export function undercutRival(
  state: GameState,
  rivalId: string,
): ActionResult<{ machines: number; slots: number }> {
  if (state.chapter < 2 && !state.chapterDoneAt[1])
    return { ok: false, error: 'Price setting unlocks after chapter 1.' };
  const match = rivalMatchup(state, rivalId);
  if (!match) return { ok: false, error: 'Machine not found.' };
  let machines = 0;
  let slots = 0;
  for (const id of match.nearbyIds) {
    const m = state.machines.find((x) => x.id === id);
    if (!m) continue;
    let changed = 0;
    for (const s of m.slots) {
      if (!s.productId) continue;
      const target =
        Math.round((getProduct(s.productId).suggestedCents * RIVAL.counterPriceRatio) / 5) * 5;
      if (target < s.priceCents) {
        s.priceCents = target;
        changed++;
      }
    }
    if (changed) machines++;
    slots += changed;
  }
  return { ok: true, machines, slots };
}

/** Rival revenue for the market-share window (business hours `bh`). */
export function rivalRevenue(
  state: GameState,
  world: World,
  local: LocalTime,
  bh: number,
  comp: Map<string, number>,
): number {
  let total = 0;
  for (const r of state.rival.machines) {
    const cell = world.cells.get(r.cellId);
    if (!cell) continue;
    const type = getMachineType(r.typeId);
    const n = comp.get(`rival:${r.id}`) ?? 0;
    const customers =
      baseTraffic(cell, local.hour, local.restDay).total *
      type.captureRate *
      DEMAND_SCALE *
      (1 - competitionShare(n));
    total += customers * bh * 0.7 * 190 * (1 - RIVAL.priceUndercut) * RIVAL.efficiency;
  }
  return total;
}
