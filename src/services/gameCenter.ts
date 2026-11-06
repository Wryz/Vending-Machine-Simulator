import { requireOptionalNativeModule } from 'expo';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { GAME_CENTER, achievementGcId, weeklyLeaderboardFor } from '@/config/gameCenter';
import { ACHIEVEMENTS } from '@/config/progression';
import type { GameState } from '@/sim';
import { useGame } from '@/store/game';

import {
  scoresFor,
  shouldSubmit,
  unreportedAchievements,
  type LastSubmit,
} from './gameCenterScores';

/**
 * Apple Game Center (iOS only): weekly city leaderboards, an all-time
 * leaderboard and trophies mirrored as achievements. Local module in
 * modules/game-center. Everything here is silent and optional: if the player
 * isn't signed in to Game Center, nothing happens and nothing is asked
 * (SPEC: no forced prompts). On Android, or on an older dev client without the
 * native module, every call is a no-op.
 */

interface AuthState {
  authenticated: boolean;
  /** Apple's sign-in sheet is ready to show from Settings. */
  canSignIn: boolean;
  displayName: string | null;
}

interface GameCenterNative {
  isAuthenticated(): boolean;
  authenticate(): Promise<AuthState>;
  presentSignIn(): Promise<boolean>;
  submitScore(score: number, leaderboardIds: string[]): Promise<void>;
  reportAchievements(ids: string[], percents: number[]): Promise<void>;
  showDashboard(leaderboardId: string | null): Promise<boolean>;
  addListener(event: 'onAuthChange', fn: (s: AuthState) => void): { remove(): void };
}

const native: GameCenterNative | null =
  Platform.OS === 'ios' ? requireOptionalNativeModule<GameCenterNative>('GameCenter') : null;

export const useGameCenter = create<AuthState & { available: boolean }>(() => ({
  available: !!native,
  authenticated: false,
  canSignIn: false,
  displayName: null,
}));

const KNOWN_ACHIEVEMENTS = new Set(ACHIEVEMENTS.map((a) => a.id));
const RETRY_MS = GAME_CENTER.scoreMinIntervalMs;

let started = false;
let lastSubmit: LastSubmit | null = null;
let submitting = false;
const reported = new Set<string>();
let achievementsBusy = false;
let achievementsFailedAt = 0;
function signedIn(): boolean {
  return !!native && useGameCenter.getState().authenticated;
}

/** Start silently at app launch. Never presents UI. Safe to call more than once. */
export function initGameCenter(): void {
  if (!native || started) return;
  started = true;
  const apply = (s: AuthState) => {
    useGameCenter.setState({
      authenticated: !!s.authenticated,
      canSignIn: !!s.canSignIn,
      displayName: s.displayName ?? null,
    });
    if (s.authenticated) sync(true);
  };
  try {
    native.addListener('onAuthChange', apply);
    native.authenticate().then(apply, () => undefined);
  } catch {
    // Older dev client or GameKit unavailable: stay off.
  }
  useGame.subscribe((s, prev) => {
    if (s.game !== prev.game) sync(false);
  });
  AppState.addEventListener('change', (next) => {
    if (next === 'background') sync(true);
  });
}

/**
 * Called on every game change: reports new trophies and sends scores at most
 * every few minutes (or now when `force`, e.g. going to the background).
 */
function sync(force: boolean): void {
  const game = useGame.getState().game;
  if (!game || !signedIn()) return;
  flushAchievements(game);
  const next = scoresFor(game);
  const now = Date.now();
  if (submitting || !shouldSubmit(lastSubmit, next, now, force)) return;
  submitting = true;
  const sends: Promise<void>[] = [submitAllTime(next.allTimeCents)];
  if (next.weeklyId) sends.push(submitWeeklyScore(game.cityId, next.weeklyCents));
  Promise.all(sends)
    .then(() => {
      lastSubmit = {
        at: now,
        weeklyId: next.weeklyId,
        weeklyCents: next.weeklyCents,
        allTimeCents: next.allTimeCents,
      };
    })
    .catch(() => {
      // Keep the old mark; try again after the interval.
      lastSubmit = lastSubmit ? { ...lastSubmit, at: now } : null;
    })
    .finally(() => {
      submitting = false;
    });
}

function flushAchievements(game: GameState): void {
  if (achievementsBusy || Date.now() - achievementsFailedAt < RETRY_MS) return;
  const ids = unreportedAchievements(game.achievements, reported).filter((id) =>
    KNOWN_ACHIEVEMENTS.has(id),
  );
  if (!ids.length) return;
  achievementsBusy = true;
  native!
    .reportAchievements(
      ids.map(achievementGcId),
      ids.map(() => 100),
    )
    .then(() => ids.forEach((id) => reported.add(id)))
    .catch(() => {
      achievementsFailedAt = Date.now();
    })
    .finally(() => {
      achievementsBusy = false;
    });
}

/** This week's sales in a fallback city (cents). No-op outside the 9 cities. */
export async function submitWeeklyScore(cityId: string, cents: number): Promise<void> {
  const id = weeklyLeaderboardFor(cityId);
  if (!signedIn() || !id) return;
  await native!.submitScore(Math.max(0, Math.round(cents)), [id]);
}

/** Lifetime sales (cents) on the global all-time leaderboard. */
export async function submitAllTime(cents: number): Promise<void> {
  if (!signedIn()) return;
  await native!.submitScore(Math.max(0, Math.round(cents)), [GAME_CENTER.allTimeLeaderboardId]);
}

/** Mark one trophy as earned in Game Center. */
export async function reportAchievement(id: string): Promise<void> {
  if (!signedIn() || !KNOWN_ACHIEVEMENTS.has(id)) return;
  await native!.reportAchievements([achievementGcId(id)], [100]);
  reported.add(id);
}

/** Apple's Game Center screen: a city's weekly board, or all leaderboards. */
export async function showLeaderboards(cityId?: string): Promise<boolean> {
  if (!signedIn()) return false;
  const id = cityId ? weeklyLeaderboardFor(cityId) : null;
  return native!.showDashboard(id).catch(() => false);
}

/** Apple's sign-in sheet, only when the player taps "Sign in" in Settings. */
export async function signInToGameCenter(): Promise<boolean> {
  if (!native) return false;
  return native.presentSignIn().catch(() => false);
}
