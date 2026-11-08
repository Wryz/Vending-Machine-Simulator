import { BRANCHES } from '@/config/progression';

import type { GameState } from './state';

/**
 * One company, many cities (SPEC §4.8, BRANCHES): what every branch shares.
 * Each city keeps its own save (machines, vans, drivers, rival, rankings);
 * switching cities hands these fields from the branch you leave to the one you
 * open, and a branch's cash change while you were away joins the company cash.
 */
export const COMPANY_FIELDS = [
  'cashCents',
  'chapter',
  'chapterDoneAt',
  'research',
  'collection',
  'freePulls',
  'boosts',
  'prestige',
  'tutorial',
  'goals',
  'achievements',
  'ledger',
] as const satisfies readonly (keyof GameState)[];

export type CompanyState = Pick<GameState, (typeof COMPANY_FIELDS)[number]>;

/** A deep copy of the company's shared state, taken from the branch in front of you. */
export function companyOf(state: GameState): CompanyState {
  const out = {} as Record<string, unknown>;
  for (const k of COMPANY_FIELDS) out[k] = structuredClone(state[k]);
  return out as CompanyState;
}

/** What a branch held when you last left it (its change since joins the company). */
export interface BranchMark {
  cashCents: number;
  salesCents: number;
  netCents: number;
  units: number;
}

export function branchMark(state: GameState): BranchMark {
  return {
    cashCents: state.cashCents,
    salesCents: state.ledger.lifetimeSalesCents,
    netCents: state.ledger.lifetimeNetCents,
    units: state.ledger.lifetimeUnits,
  };
}

/** The branch's own change since `mark`: cash, and lifetime sales for goals and trophies. */
export function branchDelta(state: GameState, mark: BranchMark): BranchMark {
  const now = branchMark(state);
  return {
    cashCents: now.cashCents - mark.cashCents,
    salesCents: now.salesCents - mark.salesCents,
    netCents: now.netCents - mark.netCents,
    units: now.units - mark.units,
  };
}

/** Add a branch's change to the company's books (cash and lifetime totals). */
export function addToCompany(
  state: { cashCents: number; ledger: GameState['ledger'] },
  d: BranchMark,
): void {
  state.cashCents += d.cashCents;
  state.ledger.lifetimeSalesCents += d.salesCents;
  state.ledger.lifetimeNetCents += d.netCents;
  state.ledger.lifetimeUnits += d.units;
}

/**
 * Open a branch with the company's state. Anything the branch earned (or
 * spent) since `mark` joins the company. Returns that change too.
 */
export function joinCompany(
  branch: GameState,
  company: CompanyState,
  mark: BranchMark,
): { state: GameState; delta: BranchMark } {
  const delta = branchDelta(branch, mark);
  const state: GameState = { ...branch };
  const out = state as unknown as Record<string, unknown>;
  for (const k of COMPANY_FIELDS) out[k] = structuredClone(company[k]);
  addToCompany(state, delta);
  return { state, delta };
}

/** Can this company run branches at all, and how many cities may it hold? */
export function branchesUnlocked(chapter: number): boolean {
  return chapter >= BRANCHES.unlockChapter;
}

export function maxCities(chapter: number): number {
  let max = 1;
  for (const [ch, n] of Object.entries(BRANCHES.maxCities)) if (chapter >= Number(ch)) max = n;
  return max;
}
