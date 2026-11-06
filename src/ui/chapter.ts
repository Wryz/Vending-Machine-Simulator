import { CHAPTER_GOALS } from '@/config/progression';
import { t } from '@/i18n';
import { activeMachines, playerShare, type GameState } from '@/sim';

import { moneyShort } from './format';

/** The current chapter goal as one short line and a 0..1 progress value. */
export function chapterProgress(game: GameState): { text: string; value: number } {
  const active = activeMachines(game).length;
  switch (game.chapter) {
    case 1:
      return {
        text: t('chapter.sales', {
          have: moneyShort(game.ledger.lifetimeSalesCents),
          goal: moneyShort(CHAPTER_GOALS[1].salesCents),
        }),
        value: game.ledger.lifetimeSalesCents / CHAPTER_GOALS[1].salesCents,
      };
    case 2:
      return {
        text: t(game.vanLevel >= 1 ? 'chapter.machinesVan' : 'chapter.machinesNoVan', {
          active,
          n: CHAPTER_GOALS[2].machines,
        }),
        value: (Math.min(active, 5) / 5) * 0.8 + (game.vanLevel >= 1 ? 0.2 : 0),
      };
    case 3:
      return {
        text: t('chapter.machinesDriver', {
          active,
          n: CHAPTER_GOALS[3].machines,
          drivers: game.drivers.length,
        }),
        value: (Math.min(active, 15) / 15) * 0.85 + (game.drivers.length >= 1 ? 0.15 : 0),
      };
    case 4:
      return {
        text: t('chapter.machinesDrivers', {
          active,
          n: CHAPTER_GOALS[4].machines,
          drivers: game.drivers.length,
        }),
        value: (Math.min(active, 40) / 40) * 0.85 + (Math.min(3, game.drivers.length) / 3) * 0.15,
      };
    case 5:
      return {
        text: t('chapter.share', { pct: Math.round(playerShare(game) * 100) }),
        value: playerShare(game) / 0.5,
      };
    default:
      return { text: t('chapter.done'), value: 1 };
  }
}
