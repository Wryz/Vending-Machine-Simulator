import type { BranchMark, CompanyState } from '@/sim';
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
}

const KEY = 'company';

export function readCompany(): CompanyFile | null {
  const f = readJson<CompanyFile>(KEY);
  return f && f.state && f.branches ? f : null;
}

export function writeCompany(f: CompanyFile): void {
  writeJson(KEY, f);
}
