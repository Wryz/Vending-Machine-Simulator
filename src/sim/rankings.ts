import { RIVAL } from '@/config/economy';
import { OPERATOR_NAMES, RANKINGS } from '@/config/rankings';

import { hashString } from './rng';
import type { GameState } from './state';
import { addDays, type LocalTime } from './time';

/**
 * City ranking board (SPEC §4.8): "Top operators in <City>". The player, the
 * rival (Brightvend, with its real simulated sales) and a field of fictional
 * AI operators, ranked by this week's sales. Single player and offline: the AI
 * operators' sales are generated from a seed (city + week + day) and scale
 * with the player's chapter and last week, so there is always someone to pass.
 *
 * The board is taken at the city's local midnight ("nightly"); weeks start on
 * the local Monday. Everything here is pure and deterministic: AI form comes
 * from hashes, never from the game's RNG, so the board never perturbs sales.
 */

export type RankEntryKind = 'player' | 'rival' | 'ai';

export interface RankEntry {
  /** 'player', 'rival' or 'ai:<n>'. */
  id: string;
  kind: RankEntryKind;
  /** Operator name (fictional proper noun); empty for the player (the UI says "You"). */
  name: string;
  /** Sales this week so far, in cents. */
  scoreCents: number;
}

/** One nightly board. */
export interface RankBoard {
  /** When it was taken (epoch ms, just after local midnight). */
  at: number;
  /** Local Monday (YYYY-MM-DD) of the week it scores. */
  weekKey: string;
  /** Days of the week it covers, 1..7. */
  day: number;
  /** The week's final standings (taken at the midnight that ends Sunday). */
  final: boolean;
  /** Best first. */
  entries: RankEntry[];
  /** The player's place, 1-based. */
  rank: number;
  /** The player's place on the previous board of the same week (null on a week's first board). */
  prevRank: number | null;
  /** Ids of operators the player moved past since the previous board, best first. */
  passed: string[];
}

export interface RankingsState {
  /** Local date the board last saw; '' until the first step. */
  dayKey: string;
  /** Local Monday of the week being scored. */
  weekKey: string;
  /** Lifetime sales when the week began (the player's score is the difference). */
  weekStartSalesCents: number;
  /** The rival's sales this week (its real simulated revenue). */
  rivalWeekCents: number;
  /** AI operators' sales this week, by operator index. */
  aiWeekCents: number[];
  /** Share of the current day the AI field counts (a player who starts at 8 pm shares only 4 h). */
  dayShare: number;
  /** The player's last full week (scales the next week's field). */
  lastWeek: { weekKey: string; scoreCents: number; rank: number; of: number } | null;
  /** The latest nightly board, or null before the first midnight. */
  board: RankBoard | null;
}

export function emptyRankings(): RankingsState {
  return {
    dayKey: '',
    weekKey: '',
    weekStartSalesCents: 0,
    rivalWeekCents: 0,
    aiWeekCents: Array.from({ length: RANKINGS.operators }, () => 0),
    dayShare: 1,
    lastWeek: null,
    board: null,
  };
}

// ---------------------------------------------------------------------------
// Calendar

/** 0 = Monday … 6 = Sunday, for a local date key (calendar math, zone-free). */
export function weekDayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** The local Monday that starts the week containing `dateKey`. */
export function weekKeyOf(dateKey: string): string {
  return addDays(dateKey, -weekDayIndex(dateKey));
}

// ---------------------------------------------------------------------------
// Seeded form

/** A well-mixed unit float from a string seed (FNV-1a + a mulberry32 round). */
function unit(seed: string): number {
  let t = (hashString(seed) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface Operator {
  id: string;
  name: string;
  /** Index into RANKINGS.tierMultipliers (0 = strongest). */
  tier: number;
}

/** The city's AI operators: stable names and tiers for a city (seeded by its id). */
export function cityOperators(cityId: string): Operator[] {
  const shuffle = (xs: readonly string[], salt: string) =>
    xs
      .map((x) => ({ x, k: unit(`${cityId}|${salt}|${x}`) }))
      .sort((a, b) => a.k - b.k)
      .map((e) => e.x);
  const local = shuffle(OPERATOR_NAMES.byCity[cityId] ?? [], 'city');
  const generic = shuffle(
    OPERATOR_NAMES.generic.filter((n) => !local.includes(n)),
    'generic',
  );
  const names = [...local, ...generic].slice(0, RANKINGS.operators);
  // Tiers are dealt separately, so a city's own names are not always the strongest.
  const tiers = shuffle(
    names.map((_, i) => String(i)),
    'tier',
  ).map(Number);
  return names.map((name, i) => ({ id: `ai:${i}`, name, tier: tiers[i] }));
}

/** Weekly sales (cents) a casual player is expected to make at a chapter. */
export function chapterRefCents(chapter: number): number {
  const refs = RANKINGS.weeklyRefCents;
  return refs[Math.max(1, Math.min(refs.length - 1, chapter))];
}

/**
 * The field's reference weekly sales: the chapter's expectation, blended
 * (geometrically) with the player's own last full week.
 */
export function referenceCents(state: GameState): number {
  const base = chapterRefCents(state.chapter);
  const last = state.rankings.lastWeek?.scoreCents;
  if (last === undefined) return base;
  const w = RANKINGS.lastWeekWeight;
  const l = Math.max(last, base * RANKINGS.lastWeekFloor);
  return base ** (1 - w) * l ** w;
}

/** An operator's strength vs the reference at a chapter (top tiers taper later on). */
export function tierMultiplier(tier: number, chapter: number): number {
  const m = RANKINGS.tierMultipliers[tier] ?? 1;
  if (m <= 1) return m;
  const tapers = RANKINGS.topTaper;
  return 1 + (m - 1) * tapers[Math.max(0, Math.min(tapers.length - 1, chapter))];
}

/** One operator's sales for one local day (cents, before the day share). */
function dailyCents(state: GameState, op: Operator, dateKey: string): number {
  const seed = `${state.cityId}|${op.id}`;
  const wn = RANKINGS.weekNoise;
  const weekForm = Math.exp(Math.log(1 + wn) * (2 * unit(`${seed}|w|${weekKeyOf(dateKey)}`) - 1));
  const dayForm = 1 + RANKINGS.dayNoise * (2 * unit(`${seed}|d|${dateKey}`) - 1);
  return (referenceCents(state) * tierMultiplier(op.tier, state.chapter) * weekForm * dayForm) / 7;
}

// ---------------------------------------------------------------------------
// Scores and boards

/**
 * The player's score for the current week: sales (cents, integer) since the
 * city's local Monday 00:00. This is what a Game Center weekly leaderboard
 * submits.
 */
export function weeklyScore(state: GameState): number {
  return Math.max(
    0,
    Math.round(state.ledger.lifetimeSalesCents - state.rankings.weekStartSalesCents),
  );
}

function rivalOnBoard(state: GameState): boolean {
  return state.rival.active || state.rankings.rivalWeekCents > 0;
}

/**
 * Current standings, best first. `todayShare` (0..1) adds that share of the
 * AI field's sales for the day in progress (a live preview between boards).
 */
export function standings(state: GameState, todayShare = 0, todayKey?: string): RankEntry[] {
  const r = state.rankings;
  const ops = cityOperators(state.cityId);
  const share = Math.max(0, Math.min(1, todayShare)) * r.dayShare;
  const entries: RankEntry[] = ops.map((op, i) => ({
    id: op.id,
    kind: 'ai',
    name: op.name,
    scoreCents: Math.round(
      (r.aiWeekCents[i] ?? 0) +
        (share > 0 && todayKey ? dailyCents(state, op, todayKey) * share : 0),
    ),
  }));
  if (rivalOnBoard(state))
    entries.push({
      id: 'rival',
      kind: 'rival',
      name: RIVAL.name,
      scoreCents: Math.round(r.rivalWeekCents),
    });
  entries.push({ id: 'player', kind: 'player', name: '', scoreCents: weeklyScore(state) });
  // Ties go to the player (generous), then a stable order.
  return entries.sort(
    (a, b) =>
      b.scoreCents - a.scoreCents ||
      (a.kind === 'player' ? -1 : b.kind === 'player' ? 1 : a.id.localeCompare(b.id)),
  );
}

export function playerRank(entries: readonly RankEntry[]): number {
  return entries.findIndex((e) => e.kind === 'player') + 1;
}

function takeBoard(state: GameState, endedDay: string, final: boolean): RankBoard {
  const r = state.rankings;
  const entries = standings(state);
  const rank = playerRank(entries);
  const prev = r.board && r.board.weekKey === r.weekKey ? r.board : null;
  const passed: string[] = [];
  if (prev) {
    const prevIdx = new Map(prev.entries.map((e, i) => [e.id, i]));
    const prevMe = prev.rank - 1;
    entries.forEach((e, i) => {
      const was = prevIdx.get(e.id);
      if (e.kind !== 'player' && was !== undefined && was < prevMe && i > rank - 1)
        passed.push(e.id);
    });
  }
  const board: RankBoard = {
    at: state.now,
    weekKey: r.weekKey,
    day: weekDayIndex(endedDay) + 1,
    final,
    entries,
    rank,
    prevRank: prev ? prev.rank : null,
    passed,
  };
  r.board = board;
  return board;
}

function startWeek(state: GameState, weekKey: string): void {
  const r = state.rankings;
  r.weekKey = weekKey;
  r.weekStartSalesCents = state.ledger.lifetimeSalesCents;
  r.rivalWeekCents = 0;
  r.aiWeekCents = Array.from({ length: RANKINGS.operators }, () => 0);
}

/** Longest gap the board walks day by day (longer gaps just start a fresh week). */
const MAX_WALK_DAYS = 21;

/**
 * Called once per sim step with the step's local time and the rival's sales
 * in it. Credits the AI field for each local day that ended, takes a board at
 * each local midnight and rolls the week on Monday. Several midnights in one
 * catch-up are walked in order; only the last board is returned (one nightly
 * update, one celebration). Mutates `state`.
 */
export function rankingsStep(
  state: GameState,
  local: LocalTime,
  rivalCents: number,
): RankBoard | null {
  const r = state.rankings;
  r.rivalWeekCents += Math.max(0, rivalCents);
  if (!r.dayKey) {
    r.dayKey = local.dateKey;
    startWeek(state, weekKeyOf(local.dateKey));
    // Today's sales so far count (this step's included, and a migrated save's day).
    if (state.ledger.day.dateKey === local.dateKey)
      r.weekStartSalesCents -= Math.max(0, state.ledger.day.lines.Sales ?? 0);
    r.dayShare = Math.max(0, Math.min(1, (24 - local.hour) / 24));
    return null;
  }
  if (local.dateKey <= r.dayKey) return null;

  const ops = cityOperators(state.cityId);
  let board: RankBoard | null = null;
  let day = r.dayKey;
  for (let walked = 0; day < local.dateKey; walked++) {
    if (walked >= MAX_WALK_DAYS) {
      // Away for weeks (e.g. an old save): start over with this week.
      board = null;
      startWeek(state, weekKeyOf(local.dateKey));
      break;
    }
    if (weekKeyOf(day) === r.weekKey) {
      ops.forEach((op, i) => {
        r.aiWeekCents[i] =
          (r.aiWeekCents[i] ?? 0) + Math.round(dailyCents(state, op, day) * r.dayShare);
      });
    }
    r.dayShare = 1;
    const next = addDays(day, 1);
    board = null;
    if (weekKeyOf(next) !== r.weekKey) {
      board = takeBoard(state, day, true);
      r.lastWeek = {
        weekKey: r.weekKey,
        scoreCents: weeklyScore(state),
        rank: board.rank,
        of: board.entries.length,
      };
      startWeek(state, weekKeyOf(next));
    }
    day = next;
  }
  board ??= takeBoard(state, addDays(local.dateKey, -1), false);
  r.dayKey = local.dateKey;
  return board;
}

/** The player's place on the latest board and how it moved overnight. */
export function rankChange(state: GameState): { rank: number; delta: number; of: number } | null {
  const b = state.rankings.board;
  if (!b) return null;
  return {
    rank: b.rank,
    delta: b.prevRank === null ? 0 : b.prevRank - b.rank,
    of: b.entries.length,
  };
}
