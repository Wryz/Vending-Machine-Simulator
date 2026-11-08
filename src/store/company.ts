import type { BranchMark, CompanyState, Whereabouts } from '@/sim';
import { useCityIndex } from '@/store/cityIndex';
import { kmBetween } from '@/data/cityIndex';
import type { CityInfo } from '@/store/profile';
import { readJson, writeJson } from '@/services/storage';

/**
 * The company file (one per install): the shared state from the branch you
 * last played, and what each branch held when you left it (BRANCHES, SPEC §4.8).
 * Written whenever the open city saves once branches are unlocked.
 */
export interface CompanyFile {
  state: CompanyState;
  branches: Record<string, BranchMark>;
  /** When the other branches were last caught up (real ms). */
  syncedAt: number;
  /** The company's home city: the expansion ladder is measured from here. */
  home?: Whereabouts;
}

/** Country and state of a city, for the ladder (state from the city list; nearest entry for legacy cities). */
export function whereaboutsOf(city: CityInfo): Whereabouts {
  const entries = useCityIndex.getState().entries;
  let entry = city.res5 ? entries.find((e) => e.r === city.res5) : undefined;
  if (!entry) {
    let best = 40;
    for (const e of entries) {
      const km = kmBetween(city, { lat: e.a, lng: e.o });
      if (km < best) {
        best = km;
        entry = e;
      }
    }
  }
  return { cc: city.countryCode || entry?.c || '', state: entry?.s };
}

const KEY = 'company';

export function readCompany(): CompanyFile | null {
  const f = readJson<CompanyFile>(KEY);
  return f && f.state && f.branches ? f : null;
}

export function writeCompany(f: CompanyFile): void {
  writeJson(KEY, f);
}
