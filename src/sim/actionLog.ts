import { ACTION_LOG } from '@/config/progression';

import type { GameState } from './state';

/**
 * The player's actions, in order (owner's call, 2026-11-08; docs/design/v2-online.md).
 * The sim is deterministic, so a server can replay this log with the same
 * code and get the same city: the groundwork for shared customers between
 * players. Each entry is the action's name, the sim time it happened and its
 * arguments (the World is left out: the server has the same city data).
 */
export interface LoggedAction {
  /** Sim time (real epoch ms) when the action was taken. */
  t: number;
  /** Action name, e.g. 'placeMachine'. */
  a: string;
  /** Arguments after the state (World arguments are written as null). */
  p: unknown[];
}

function isWorld(x: unknown): boolean {
  return (
    typeof x === 'object' &&
    x !== null &&
    'cells' in x &&
    (x as { cells: unknown }).cells instanceof Map
  );
}

/** Note one action (after it succeeded). Oldest entries drop off past the cap. */
export function recordAction(state: GameState, name: string, args: readonly unknown[]): void {
  state.actionLog.push({
    t: state.now,
    a: name,
    p: args.map((x) => (isWorld(x) ? null : x === undefined ? null : structuredClone(x))),
  });
  const over = state.actionLog.length - ACTION_LOG.cap;
  if (over > 0) {
    state.actionLog.splice(0, over);
    state.actionLogDropped += over;
  }
}

/** Wrap a sim action so every successful call is logged. */
export function recorded<A extends unknown[], R>(
  name: string,
  fn: (state: GameState, ...args: A) => R,
): (state: GameState, ...args: A) => R {
  return (state, ...args) => {
    const r = fn(state, ...args);
    const ok = typeof r === 'object' && r !== null && 'ok' in r ? (r as { ok: boolean }).ok : true;
    if (ok) recordAction(state, name, args);
    return r;
  };
}
