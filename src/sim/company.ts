import { BRANCHES } from '@/config/progression';
import { GEO_REGIONS } from '@/data/geoRegions';

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
  'footprint',
  'chapterStartSalesCents',
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

export type Reach = 'none' | 'state' | 'country' | 'region' | 'continent' | 'world';

/** How far from home this chapter lets the company open branches. */
export function branchReach(chapter: number): Reach {
  let reach: Reach = 'none';
  for (const [ch, r] of Object.entries(BRANCHES.reach)) if (chapter >= Number(ch)) reach = r;
  return reach;
}

/** Where a city is, for the ladder: country (ISO alpha-2) and state/province (ISO 3166-2). */
export interface Whereabouts {
  cc: string;
  state?: string;
}

const ORDER: Reach[] = ['state', 'country', 'region', 'continent', 'world'];

/** The smallest reach that covers `target` from `home`. */
export function reachNeeded(home: Whereabouts, target: Whereabouts): Reach {
  const sameCountry = !!home.cc && home.cc === target.cc;
  // Where states aren't mapped on either side, the state step is the country.
  if (sameCountry && (!home.state || !target.state || home.state === target.state)) return 'state';
  if (sameCountry) return 'country';
  const h = GEO_REGIONS[home.cc];
  const g = GEO_REGIONS[target.cc];
  if (h && g && h[0] === g[0]) return 'region';
  if (h && g && h[1] === g[1]) return 'continent';
  return 'world';
}

/** Can a company in `chapter`, based in `home`, open a branch in `target`? */
export function canBranchTo(chapter: number, home: Whereabouts, target: Whereabouts): boolean {
  const have = branchReach(chapter);
  if (have === 'none') return false;
  return ORDER.indexOf(reachNeeded(home, target)) <= ORDER.indexOf(have);
}

/** The chapter that first lets the company branch out to `target`. */
export function chapterFor(home: Whereabouts, target: Whereabouts): number {
  const need = ORDER.indexOf(reachNeeded(home, target));
  for (const [ch, r] of Object.entries(BRANCHES.reach))
    if (ORDER.indexOf(r) >= need) return Number(ch);
  return BRANCHES.unlockChapter;
}

/** Note a country (and its continent) in the company's footprint. */
export function addToFootprint(state: { footprint: GameState['footprint'] }, cc: string): void {
  if (!cc) return;
  if (!state.footprint.countries.includes(cc)) state.footprint.countries.push(cc);
  const c = continentOf(cc);
  if (c && !state.footprint.continents.includes(c)) state.footprint.continents.push(c);
}

/** The continent a country is on ('' unknown). */
export function continentOf(cc: string): string {
  return GEO_REGIONS[cc]?.[1] ?? '';
}
