import { emptyGoals } from './goals';
import { emptySurprises } from './events';
import { emptyRankings } from './rankings';
import { emptyRequests } from './requests';
import { SCHEMA_VERSION, type GameState } from './state';

/**
 * Versioned save migrations (SPEC §7.5). Each step upgrades from version n to
 * n + 1. Add a step whenever GameState changes shape.
 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
  // v2: daily orders, streaks and trophies.
  1: (s) => ({ ...s, goals: emptyGoals(), achievements: {}, schemaVersion: 2 }),
  // v3: cosmetic wraps were dropped (SPEC §9, 2026-11); machines lose `wrap`.
  2: (s) => ({
    ...s,
    machines: Array.isArray(s.machines)
      ? (s.machines as Record<string, unknown>[]).map(({ wrap: _wrap, ...m }) => m)
      : s.machines,
    schemaVersion: 3,
  }),
  // v4: reserved (the rival and surprise fields moved to v6; v3 saves just step through).
  3: (s) => ({ ...s, schemaVersion: 4 }),
  // v5: city ranking board (SPEC §4.8). The first week starts at the next step.
  4: (s) => ({ ...s, rankings: emptyRankings(), schemaVersion: 5 }),
  // v6: day-one rival with a face, and surprise moments (SPEC §4.6). A rival
  // that was already active arrived the old way (chapter 3), so it has ramped.
  5: (s) => {
    const rival = (s.rival ?? {}) as Record<string, unknown>;
    return {
      ...s,
      rival: {
        active: false,
        machines: [],
        nextDecisionAt: 0,
        ...rival,
        ramped: !!rival.active,
        lastStingAt: 0,
        lead: null,
      },
      surprises: emptySurprises(),
      schemaVersion: 6,
    };
  },
  // v7: customer requests (SPEC §4.6).
  6: (s) => ({ ...s, requests: emptyRequests(), schemaVersion: 7 }),
  // v8: restock deliveries (vans on the road).
  7: (s) => ({ ...s, deliveries: [], schemaVersion: 8 }),
  // v9: the expansion ladder (chapters 6 Continental and 7 Global; Prestige moves from 6 to 8).
  8: (s) => {
    const chapter = Number(s.chapter ?? 1);
    const done = { ...((s.chapterDoneAt as Record<number, number>) ?? {}) };
    if (chapter >= 6) {
      const at = done[5] ?? Number(s.now ?? 0);
      done[6] = done[6] ?? at;
      done[7] = done[7] ?? at;
    }
    const ledger = s.ledger as { lifetimeSalesCents?: number } | undefined;
    return {
      ...s,
      chapter: chapter >= 6 ? chapter + 2 : chapter,
      chapterDoneAt: done,
      footprint: { countries: [], continents: [] },
      chapterStartSalesCents: ledger?.lifetimeSalesCents ?? 0,
      schemaVersion: 9,
    };
  },
};

export class SaveError extends Error {}

export function migrateSave(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new SaveError('Save file is not an object.');
  let s = raw as Record<string, unknown>;
  let v = typeof s.schemaVersion === 'number' ? s.schemaVersion : 0;
  if (v > SCHEMA_VERSION) throw new SaveError(`Save is from a newer version (${v}).`);
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new SaveError(`No migration from save version ${v}.`);
    s = step(s);
    v = s.schemaVersion as number;
  }
  const required = ['id', 'cityId', 'now', 'cashCents', 'machines', 'ledger', 'chapter'];
  for (const k of required) if (!(k in s)) throw new SaveError(`Save is missing "${k}".`);
  return s as unknown as GameState;
}

export function exportSave(state: GameState): string {
  return JSON.stringify(state);
}

export function importSave(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new SaveError('That is not valid save JSON.');
  }
  return migrateSave(parsed);
}
