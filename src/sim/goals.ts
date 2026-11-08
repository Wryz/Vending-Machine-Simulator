import {
  ACHIEVEMENTS,
  COLLECTIONS,
  DAILY_GOALS,
  DAILY_GOALS_PER_DAY,
  STREAK_BONUS,
  type GoalKind,
} from '@/config/progression';

import { addLedger, log } from './ledger';
import { hashString } from './rng';
import { activeMachines, isSeriesComplete } from './rules';
import type { GameState } from './state';
import { addDays } from './time';

/**
 * Daily orders, streaks and trophies (gamification). Pure; the state carries
 * per-day counters that actions and the advance loop increment.
 */
export type Counters = Record<GoalKind, number>;

export function emptyCounters(): Counters {
  return {
    sales: 0,
    units: 0,
    restocks: 0,
    collects: 0,
    places: 0,
    repairs: 0,
    research: 0,
    pulls: 0,
  };
}

export interface DailyGoal {
  id: string;
  kind: GoalKind;
  title: string;
  target: number;
  rewardCents: number;
  claimed: boolean;
}

export interface GoalsState {
  dateKey: string;
  day: Counters;
  items: DailyGoal[];
  /** Days in a row with all orders claimed. */
  streak: number;
  /** Last local date the streak was extended. */
  streakDateKey: string;
  streakClaimed: boolean;
}

export function emptyGoals(): GoalsState {
  return {
    dateKey: '',
    day: emptyCounters(),
    items: [],
    streak: 0,
    streakDateKey: '',
    streakClaimed: false,
  };
}

/** Count something toward today's orders. */
export function bump(state: GameState, kind: GoalKind, by = 1): void {
  state.goals.day[kind] += by;
}

function chapterIndex(state: GameState): number {
  return Math.max(0, Math.min(5, state.chapter - 1));
}

/** Deterministic 3 orders for a save and local day. */
export function pickGoals(state: GameState, dateKey: string): DailyGoal[] {
  const ci = chapterIndex(state);
  const eligible = DAILY_GOALS.filter(
    (g) => state.chapter >= g.minChapter && g.rewardCentsByChapter[ci] > 0,
  );
  const ranked = eligible
    .map((g) => ({ g, k: hashString(`${state.id}|${dateKey}|${g.id}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, DAILY_GOALS_PER_DAY);
  return ranked.map(({ g }) => ({
    id: g.id,
    kind: g.kind,
    title: g.title,
    target: g.targetByChapter[ci],
    rewardCents: g.rewardCentsByChapter[ci],
    claimed: false,
  }));
}

/**
 * Roll to a new local day: fresh counters and orders; a missed day breaks the streak.
 * Only forward: the orders are the company's, and branches in other time zones can
 * be a day behind (YYYY-MM-DD keys compare as text).
 */
export function rollGoalsDay(state: GameState, dateKey: string): void {
  const g = state.goals;
  if (g.dateKey && dateKey <= g.dateKey) return;
  if (g.streakDateKey && g.streakDateKey !== addDays(dateKey, -1) && g.streakDateKey !== dateKey)
    g.streak = 0;
  g.dateKey = dateKey;
  g.day = emptyCounters();
  g.items = pickGoals(state, dateKey);
  g.streakClaimed = false;
}

export function goalProgress(state: GameState, goal: DailyGoal): number {
  return Math.min(1, state.goals.day[goal.kind] / Math.max(1, goal.target));
}

export type ClaimResult =
  { ok: true; rewardCents: number; streakBonusCents: number } | { ok: false; error: string };

/** Claim a finished order. Finishing all of them extends the streak with a bonus. */
export function claimGoal(state: GameState, goalId: string): ClaimResult {
  const goal = state.goals.items.find((x) => x.id === goalId);
  if (!goal) return { ok: false, error: 'No such order today.' };
  if (goal.claimed) return { ok: false, error: 'Already claimed.' };
  if (goalProgress(state, goal) < 1) return { ok: false, error: 'Not finished yet.' };
  goal.claimed = true;
  state.cashCents += goal.rewardCents;
  addLedger(state, 'Orders', goal.rewardCents);
  log(
    state,
    'info',
    `Order complete: ${goal.title.replace('{n}', String(goal.target))}`,
    undefined,
    goal.rewardCents,
  );
  let streakBonusCents = 0;
  const g = state.goals;
  if (!g.streakClaimed && g.items.every((x) => x.claimed)) {
    g.streak = g.streakDateKey === addDays(g.dateKey, -1) ? g.streak + 1 : 1;
    g.streakDateKey = g.dateKey;
    g.streakClaimed = true;
    streakBonusCents =
      STREAK_BONUS.baseCentsByChapter[chapterIndex(state)] * Math.min(g.streak, STREAK_BONUS.cap);
    state.cashCents += streakBonusCents;
    addLedger(state, 'Orders', streakBonusCents);
    log(state, 'info', `All orders done: day ${g.streak} streak`, undefined, streakBonusCents);
  }
  return { ok: true, rewardCents: goal.rewardCents, streakBonusCents };
}

/** Claim every waiting trophy reward (the moments modal's Claim key). */
export function claimRewards(state: GameState): { ok: true; cents: number } | { ok: false; error: string } {
  if (!state.unclaimed.length) return { ok: false, error: 'Nothing to claim.' };
  const cents = state.unclaimed.reduce((a, r) => a + r.cents, 0);
  state.cashCents += cents;
  addLedger(state, 'Trophies', cents);
  state.unclaimed = [];
  return { ok: true, cents };
}

/** Trophies earned now (checked every advance); rewards wait in `unclaimed`. Returns new ids. */
export function checkAchievements(state: GameState): string[] {
  const got: string[] = [];
  const has = (id: string) => id in state.achievements;
  const units = state.ledger.lifetimeUnits;
  const sales = state.ledger.lifetimeSalesCents;
  const n = activeMachines(state).length;
  const tests: Record<string, boolean> = {
    'first-sale': units >= 1,
    'units-100': units >= 100,
    'units-10k': units >= 10_000,
    'sales-1k': sales >= 100_000,
    'sales-100k': sales >= 10_000_000,
    'sales-1m': sales >= 100_000_000,
    'machines-5': n >= 5,
    'machines-15': n >= 15,
    'machines-40': n >= 40,
    'machines-100': n >= 100,
    'first-driver': state.drivers.length >= 1,
    'first-research': Object.keys(state.research).length >= 1,
    'full-set': COLLECTIONS.some((s) => isSeriesComplete(state, s.id)),
    'beat-rival': !!state.chapterDoneAt[5],
    'streak-7': state.goals.streak >= 7,
    'sold-company': state.prestige.sales >= 1,
  };
  for (const a of ACHIEVEMENTS) {
    if (has(a.id) || !tests[a.id]) continue;
    state.achievements[a.id] = state.now;
    // The reward waits in the moments modal until claimed (claimRewards).
    if (a.rewardCents) state.unclaimed.push({ id: a.id, cents: a.rewardCents });
    log(state, 'info', `Trophy: ${a.title}`, undefined, a.rewardCents || undefined);
    got.push(a.id);
  }
  return got;
}
