import { emptyGoals } from './goals';
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
