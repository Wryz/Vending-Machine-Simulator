/**
 * Pure helpers behind the Game Center sync (no React Native, no I/O), so they
 * can be unit-tested: which scores to send and when. This week's sales come
 * from the sim's city ranking board (src/sim/rankings.ts weeklyScore).
 */
import { GAME_CENTER, weeklyLeaderboardFor } from '@/config/gameCenter';
import type { GameState } from '@/sim';
import { weeklyScore } from '@/sim/rankings';

export interface ScoreSubmission {
  /** Weekly city leaderboard id, or null outside the fallback cities. */
  weeklyId: string | null;
  weeklyCents: number;
  allTimeId: string;
  allTimeCents: number;
}

export function scoresFor(state: GameState): ScoreSubmission {
  return {
    weeklyId: weeklyLeaderboardFor(state.cityId),
    weeklyCents: weeklyScore(state),
    allTimeId: GAME_CENTER.allTimeLeaderboardId,
    allTimeCents: Math.max(0, Math.round(state.ledger.lifetimeSalesCents)),
  };
}

export interface LastSubmit {
  at: number;
  weeklyId: string | null;
  weeklyCents: number;
  allTimeCents: number;
}

/**
 * Debounce: send when something changed and either `force` (app going to the
 * background) or the minimum interval has passed since the last send.
 */
export function shouldSubmit(
  last: LastSubmit | null,
  next: ScoreSubmission,
  now: number,
  force = false,
): boolean {
  if (next.weeklyCents <= 0 && next.allTimeCents <= 0) return false;
  if (!last) return true;
  const changed =
    last.weeklyId !== next.weeklyId ||
    last.weeklyCents !== next.weeklyCents ||
    last.allTimeCents !== next.allTimeCents;
  if (!changed) return false;
  return force || now - last.at >= GAME_CENTER.scoreMinIntervalMs;
}

/** Trophy ids unlocked in the save that this session hasn't reported yet. */
export function unreportedAchievements(
  unlocked: Record<string, number>,
  reported: ReadonlySet<string>,
): string[] {
  return Object.keys(unlocked).filter((id) => !reported.has(id));
}
