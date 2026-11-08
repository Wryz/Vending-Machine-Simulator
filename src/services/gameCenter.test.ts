import {
  ACHIEVEMENT_GC_IDS,
  ACHIEVEMENT_POINTS,
  GAME_CENTER,
  HIDDEN_ACHIEVEMENTS,
  WEEKLY_LEADERBOARD_IDS,
  achievementGcId,
  weeklyLeaderboardFor,
} from '@/config/gameCenter';
import { ACHIEVEMENTS } from '@/config/progression';
import type { GameState } from '@/sim';

import { scoresFor, shouldSubmit, unreportedAchievements } from './gameCenterScores';

const GC_ID = /^[A-Za-z0-9._]+$/;

function fakeState(cityId: string, lifetime: number, weekStart: number): GameState {
  // Only the fields the score helpers read.
  return {
    cityId,
    ledger: { lifetimeSalesCents: lifetime },
    rankings: { weekStartSalesCents: weekStart },
  } as unknown as GameState;
}

describe('Game Center ids', () => {
  it('has one worldwide weekly board and one all-time board, every city on them', () => {
    expect(WEEKLY_LEADERBOARD_IDS).toEqual(['coinline.weekly.world']);
    for (const id of [...WEEKLY_LEADERBOARD_IDS, GAME_CENTER.allTimeLeaderboardId])
      expect(id).toMatch(GC_ID);
    expect(weeklyLeaderboardFor('tokyo')).toBe('coinline.weekly.world');
    expect(weeklyLeaderboardFor('area-8541422bfffffff')).toBe('coinline.weekly.world');
    expect(GAME_CENTER.weeklyStartUtc).toBe('Monday 12:00');
  });

  it('mirrors every trophy with a valid id, points and a ≤1000 total', () => {
    expect(achievementGcId('units-10k')).toBe('coinline.ach.units_10k');
    expect(ACHIEVEMENT_GC_IDS).toHaveLength(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENT_GC_IDS).size).toBe(ACHIEVEMENTS.length);
    for (const id of ACHIEVEMENT_GC_IDS) {
      expect(id).toMatch(GC_ID);
      expect(id.length).toBeLessThanOrEqual(100);
    }
    let total = 0;
    for (const a of ACHIEVEMENTS) {
      const p = ACHIEVEMENT_POINTS[a.id];
      expect({ id: a.id, ok: Number.isInteger(p) && p > 0 && p <= 100 }).toEqual({
        id: a.id,
        ok: true,
      });
      total += p;
    }
    expect(total).toBeLessThanOrEqual(1000);
    expect(Object.keys(ACHIEVEMENT_POINTS).sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());
    for (const id of HIDDEN_ACHIEVEMENTS) expect(ACHIEVEMENT_POINTS[id]).toBeDefined();
  });
});

describe('score selection', () => {
  it("uses this week's sales and lifetime sales", () => {
    const s = scoresFor(fakeState('paris', 1_234_500, 1_000_000));
    expect(s).toEqual({
      weeklyId: 'coinline.weekly.world',
      weeklyCents: 234_500,
      allTimeId: 'coinline.alltime',
      allTimeCents: 1_234_500,
    });
  });

  it('puts every city on the worldwide weekly board', () => {
    expect(scoresFor(fakeState('area-8541422bfffffff', 500, 0)).weeklyId).toBe(
      'coinline.weekly.world',
    );
  });
});

describe('debounce', () => {
  const next = { weeklyId: 'w', weeklyCents: 100, allTimeId: 'a', allTimeCents: 500 };
  const gap = GAME_CENTER.scoreMinIntervalMs;

  it('sends the first time when there is a score', () => {
    expect(shouldSubmit(null, next, 0)).toBe(true);
    expect(shouldSubmit(null, { ...next, weeklyCents: 0, allTimeCents: 0 }, 0)).toBe(false);
  });

  it('waits for the interval unless forced, and skips unchanged scores', () => {
    const last = { at: 1_000, weeklyId: 'w', weeklyCents: 50, allTimeCents: 400 };
    expect(shouldSubmit(last, next, 1_000 + gap - 1)).toBe(false);
    expect(shouldSubmit(last, next, 1_000 + gap)).toBe(true);
    expect(shouldSubmit(last, next, 1_001, true)).toBe(true);
    const same = { at: 0, weeklyId: 'w', weeklyCents: 100, allTimeCents: 500 };
    expect(shouldSubmit(same, next, 10 * gap, true)).toBe(false);
  });

  it('lists trophies not yet reported this session', () => {
    expect(unreportedAchievements({ a: 1, b: 2, c: 3 }, new Set(['b']))).toEqual(['a', 'c']);
  });
});
