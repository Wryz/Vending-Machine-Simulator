import { canSellCompany, type GameState } from '@/sim';
import { useProfile, type SeenMore } from '@/store/profile';

import {
  researchDoneCount,
  researchStartable,
  trophiesUnlocked,
  type MoreBadges,
} from './moreBadges';

/** Mark what is behind a More key as seen (call when its screen opens). */
export function markSeen(game: GameState, key: keyof MoreBadges): void {
  useProfile.getState().update((p) => {
    const s: SeenMore = { ...(p.seenMore ?? {}) };
    if (key === 'research') {
      s.research = researchDoneCount(game);
      s.startable = researchStartable(game);
    }
    if (key === 'trophies') s.trophies = trophiesUnlocked(game);
    if (key === 'prestige' && canSellCompany(game)) s.prestige = true;
    if (key === 'rankings' && game.rankings.board)
      s.rank = { ...(s.rank ?? {}), [game.cityId]: game.rankings.board.rank };
    p.seenMore = s;
  });
}
