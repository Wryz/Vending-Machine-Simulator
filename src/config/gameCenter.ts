/**
 * Apple Game Center ids and timings. The ids must match App Store Connect
 * exactly (docs/app-store/game-center.md lists the full setup).
 *
 * - One recurring weekly leaderboard for the whole world: this week's sales in
 *   your city (per-city, state and country boards come with our own server).
 * - One classic all-time leaderboard: lifetime sales.
 * - One achievement per in-game trophy (src/config/progression.ts ACHIEVEMENTS).
 */
import { ACHIEVEMENTS } from './progression';

export const GAME_CENTER = {
  /** Prefix shared by every id, so they read clearly in App Store Connect. */
  prefix: 'coinline',
  allTimeLeaderboardId: 'coinline.alltime',
  weeklyLeaderboardId: 'coinline.weekly.world',
  /**
   * The weekly board's period in App Store Connect: starts Monday 12:00 UTC,
   * lasts a week. Every city's in-game week (local Monday 00:00, src/sim/rankings.ts)
   * has begun by then, so no city carries last week's total into a new period.
   */
  weeklyStartUtc: 'Monday 12:00',
  /** At most one score submission per this long while playing. */
  scoreMinIntervalMs: 5 * 60_000,
} as const;

/**
 * Game Center ids allow only letters, digits, '.' and '_'; our city and trophy
 * ids use '-', so map anything else to '_'.
 */
function gcSafe(id: string): string {
  return id.replace(/[^A-Za-z0-9._]/g, '_');
}

/** This week's board: one for every city. */
export function weeklyLeaderboardFor(_cityId: string): string {
  return GAME_CENTER.weeklyLeaderboardId;
}

export function achievementGcId(achievementId: string): string {
  return `${GAME_CENTER.prefix}.ach.${gcSafe(achievementId)}`;
}

export const WEEKLY_LEADERBOARD_IDS: readonly string[] = [GAME_CENTER.weeklyLeaderboardId];

/**
 * Game Center points per trophy (App Store Connect total must stay ≤ 1000).
 * Bigger milestones are worth more.
 */
export const ACHIEVEMENT_POINTS: Record<string, number> = {
  'first-sale': 10,
  'units-100': 15,
  'units-10k': 60,
  'sales-1k': 20,
  'sales-100k': 60,
  'sales-1m': 100,
  'machines-5': 20,
  'machines-15': 40,
  'machines-40': 70,
  'machines-100': 100,
  'first-driver': 30,
  'first-research': 20,
  'full-set': 60,
  'beat-rival': 100,
  'streak-7': 50,
  'sold-company': 80,
};

/** Trophies hidden in Game Center until earned (spoilers for later chapters). */
export const HIDDEN_ACHIEVEMENTS: readonly string[] = ['beat-rival', 'sold-company'];

export const ACHIEVEMENT_GC_IDS: readonly string[] = ACHIEVEMENTS.map((a) => achievementGcId(a.id));
