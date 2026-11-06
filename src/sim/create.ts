import { START } from '@/config/economy';
import { getMachineType, type MachineTypeId } from '@/config/machines';

import { emptyGoals } from './goals';
import { perkLevel } from './rules';
import { SCHEMA_VERSION, type GameState, type Machine } from './state';

export function emptyLedgerDay(dateKey: string) {
  return { dateKey, lines: {} as Record<string, number> };
}

/** An owned machine that is not placed yet (in storage). */
export function storedMachine(id: string, typeId: MachineTypeId, now: number): Machine {
  const type = getMachineType(typeId);
  return {
    id,
    typeId,
    lat: 0,
    lng: 0,
    cellId: '',
    heading: 180,
    status: 'stored',
    venue: { placeId: '', name: 'Storage', category: 'street', distanceM: 0 },
    contract: {
      commission: 0,
      termDays: 0,
      startedAt: now,
      endsAt: now,
      exclusive: false,
      renegotiated: false,
    },
    mood: 0.8,
    lowMoodSince: null,
    slots: Array.from({ length: type.slots }, () => ({
      productId: null,
      qty: 0,
      priceCents: 0,
      par: 0,
      stockedAt: now,
    })),
    cashBoxCents: 0,
    broken: null,
    freshUntil: 0,
    placedAt: now,
    lastVisitAt: now,
    seen: { at: now, qty: Array.from({ length: type.slots }, () => 0), cashBoxCents: 0 },
    stats: { unitsTotal: 0, revenueTotalCents: 0, revenueRecentCents: 0, lastSaleAt: null },
  };
}

export interface NewGameOptions {
  cityId: string;
  now: number;
  seed: number;
  /** Carried over from a prestige sale. */
  prestige?: GameState['prestige'];
  /** One-time Starter Pack (IAP) — applied by the app, not here. */
}

export function newGame(opts: NewGameOptions): GameState {
  const prestige = opts.prestige ?? { reputation: 0, perks: {}, sales: 0 };
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    id: `${opts.cityId}-${opts.now.toString(36)}`,
    cityId: opts.cityId,
    createdAt: opts.now,
    now: opts.now,
    rng: opts.seed | 0,
    cashCents: START.cashCents,
    chapter: 1,
    chapterDoneAt: {},
    vanLevel: 0,
    warehouse: false,
    liquorPermit: false,
    research: {},
    machines: [],
    drivers: [],
    rival: { active: false, machines: [], nextDecisionAt: 0 },
    events: [],
    eventDays: [],
    collection: {},
    freePulls: { dateKey: '', count: 0 },
    boosts: { doubleEarningsUntil: 0 },
    prestige,
    hiddenPlaces: [],
    tutorial: { step: 0, done: false },
    goals: emptyGoals(),
    achievements: {},
    ledger: {
      lifetimeSalesCents: 0,
      lifetimeNetCents: 0,
      lifetimeCostsCents: 0,
      lifetimeUnits: 0,
      recentPlayerCents: 0,
      recentRivalCents: 0,
      day: emptyLedgerDay(''),
      yesterday: null,
    },
    log: [],
    nextId: 1,
  };
  state.cashCents += 200_000 * perkLevel(state, 'head-start');
  if (perkLevel(state, 'old-van') > 0) state.vanLevel = Math.max(state.vanLevel, 1);
  state.machines.push(storedMachine(nextId(state, 'm'), START.starterMachineType, opts.now));
  return state;
}

export function nextId(state: GameState, prefix: string): string {
  const id = `${prefix}${state.nextId.toString(36)}`;
  state.nextId += 1;
  return id;
}
