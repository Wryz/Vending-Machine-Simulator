/**
 * Apple Game Center ids and timings. The ids must match App Store Connect
 * exactly (docs/app-store/game-center.md lists the full setup).
 *
 * - One recurring weekly leaderboard per fallback city: this week's sales.
 * - One classic all-time leaderboard: lifetime sales.
 * - One achievement per in-game trophy (src/config/progression.ts ACHIEVEMENTS).
 */
import { FALLBACK_CITIES, type CityId } from './cities';
import { ACHIEVEMENTS } from './progression';

export const GAME_CENTER = {
  /** Prefix shared by every id, so they read clearly in App Store Connect. */
  prefix: 'coinline',
  allTimeLeaderboardId: 'coinline.alltime',
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

/**
 * Start of each city's recurring weekly leaderboard in App Store Connect, as
 * UTC "weekday HH:MM": the city's local Monday 00:00 in STANDARD time. The
 * in-game week (src/sim/rankings.ts) starts at local Monday midnight; daylight
 * time only moves that earlier in UTC, so a fresh week never carries last
 * week's total into Game Center's new period. Duration: 1 week.
 */
export const WEEKLY_START_UTC: Record<CityId, string> = {
  'new-york': 'Monday 05:00',
  'los-angeles': 'Monday 08:00',
  chicago: 'Monday 06:00',
  london: 'Monday 00:00',
  paris: 'Sunday 23:00',
  tokyo: 'Sunday 15:00',
  seoul: 'Sunday 15:00',
  singapore: 'Sunday 16:00',
  sydney: 'Sunday 14:00',
};

export function weeklyLeaderboardId(cityId: CityId): string {
  return `${GAME_CENTER.prefix}.weekly.${gcSafe(cityId)}`;
}

/** Weekly leaderboard for a city id, or null when it isn't a fallback city. */
export function weeklyLeaderboardFor(cityId: string): string | null {
  const city = FALLBACK_CITIES.find((c) => c.id === cityId);
  return city ? weeklyLeaderboardId(city.id) : null;
}

export function achievementGcId(achievementId: string): string {
  return `${GAME_CENTER.prefix}.ach.${gcSafe(achievementId)}`;
}

export const WEEKLY_LEADERBOARD_IDS: readonly string[] = FALLBACK_CITIES.map((c) =>
  weeklyLeaderboardId(c.id),
);

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
