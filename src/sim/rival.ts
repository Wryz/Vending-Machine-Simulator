import { CONTRACT, DEMAND_SCALE, RIVAL } from '@/config/economy';
import { getMachineType } from '@/config/machines';

import { baseTraffic, competitionShare } from './demand';
import { distanceM, offsetPoint } from './geo';
import { log } from './ledger';
import { nextRandom, pick } from './rng';
import { activeMachines } from './rules';
import type { GameState, RivalMachine, World } from './state';
import { businessHoursToMs, type LocalTime } from './time';

/**
 * Brightvend, the AI rival (SPEC §4.6). Readable and beatable:
 * - places machines in high-demand cells near yours, never more than
 *   `maxFleetRatio` × your fleet;
 * - undercuts prices (its machines count extra as competitors);
 * - bids for contracts when a venue is unhappy at renewal;
 * - retreats when you dominate the market.
 */

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
    if (exclusiveZone(state, pos.lat, pos.lng)) continue;
    if (mine.some((m) => distanceM(m, pos) < 15)) continue;
    const machine: RivalMachine = {
      id: `r${state.nextId++}`,
      lat: pos.lat,
      lng: pos.lng,
      cellId: c.id,
      typeId: nextRandom(state) < 0.6 ? 'snack' : 'cold-drinks',
      placedAt: t,
    };
    state.rival.machines.push(machine);
    return machine;
  }
  return null;
}

/** Rival decisions; returns true when its fleet changed (competition must be recomputed). */
export function rivalDecide(state: GameState, world: World, t: number): boolean {
  const rival = state.rival;
  if (!rival.active) {
    if (state.chapter < RIVAL.arrivesChapter) return false;
    rival.active = true;
    rival.nextDecisionAt = t;
    for (let i = 0; i < RIVAL.startFleet; i++) placeRivalMachine(state, world, t);
    log(state, 'rival', `${RIVAL.name} has entered the city.`);
    return true;
  }
  let changed = false;
  while (rival.nextDecisionAt <= t) {
    rival.nextDecisionAt += businessHoursToMs(RIVAL.decisionEveryHours);
    const share = playerShare(state);
    const cap = Math.max(
      RIVAL.startFleet,
      Math.ceil(activeMachines(state).length * RIVAL.maxFleetRatio),
    );
    if (share > 0.7 && rival.machines.length > 0 && nextRandom(state) < share - 0.6) {
      const gone = rival.machines.splice(
        Math.floor(nextRandom(state) * rival.machines.length),
        1,
      )[0];
      log(
        state,
        'rival',
        `${RIVAL.name} pulled a machine out (${Math.round(share * 100)}% share is yours).`,
      );
      void gone;
      changed = true;
    } else if (
      rival.machines.length < cap &&
      nextRandom(state) < RIVAL.growthChance * (1.2 - share)
    ) {
      if (placeRivalMachine(state, world, t)) {
        log(state, 'rival', `${RIVAL.name} placed a machine near yours.`);
        changed = true;
      }
    }
  }
  return changed;
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
