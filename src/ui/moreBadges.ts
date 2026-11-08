import { MACHINE_TYPES } from '@/config/machines';
import { ACHIEVEMENTS, RESEARCH } from '@/config/progression';
import { canSellCompany, hasResearch, type GameState } from '@/sim';
import type { SeenMore } from '@/store/profile';

/**
 * Number badges on the Company → More keys: something new to look at behind
 * each one. Read-only over the game; "seen" markers live in the profile.
 */
export interface MoreBadges {
  research: number;
  rankings: number;
  prestige: number;
  trophies: number;
}

/** Finished research slots (each family, or '*' for a global one). */
export function researchDoneCount(game: GameState): number {
  return Object.values(game.research).reduce((a, list) => a + (list?.length ?? 0), 0);
}

export function trophiesUnlocked(game: GameState): number {
  return ACHIEVEMENTS.filter((a) => a.id in game.achievements).length;
}

/** Research the player could start right now: unlocked, affordable, not done, lab free. */
export function researchStartable(game: GameState): number {
  if (game.lab) return 0;
  const families = new Set(
    MACHINE_TYPES.filter((m) => m.unlockChapter <= game.chapter).map((m) => m.family),
  );
  return RESEARCH.filter((r) => {
    if (game.chapter < r.unlockChapter || game.cashCents < r.costCents) return false;
    if (r.global) return !hasResearch(game, r.id, 'snacks');
    const open = [...families].filter((f) => (r.id === 'id-check' ? f === 'alcohol' : true));
    return open.some((f) => !hasResearch(game, r.id, f));
  }).length;
}

export function moreBadges(game: GameState, seen: SeenMore | undefined): MoreBadges {
  const s = seen ?? {};
  const researchDone = researchDoneCount(game) > (s.research ?? 0) ? 1 : 0;
  const board = game.rankings.board;
  const seenRank = s.rank?.[game.cityId];
  const rankMoved = !board
    ? false
    : seenRank !== undefined
      ? seenRank !== board.rank
      : board.prevRank !== null && board.prevRank !== board.rank;
  const newTrophies = Math.max(0, trophiesUnlocked(game) - (s.trophies ?? 0));
  return {
    // New things to start since you last looked (or research that finished).
    research: Math.max(researchStartable(game) - (s.startable ?? 0), researchDone, 0),
    rankings: rankMoved ? 1 : 0,
    prestige: canSellCompany(game) && !s.prestige ? 1 : 0,
    trophies: Math.max(game.unclaimed.length, newTrophies),
  };
}
