import { RIVAL } from '@/config/economy';
import { CHAPTER_GOALS } from '@/config/progression';
import { t, type TKey } from '@/i18n';
import { activeMachines, playerShare, type GameState } from '@/sim';

import { moneyShort, pct } from './format';

export interface Goal {
  label: string;
  value: string;
  progress: number;
}

/** Progress toward the current chapter's goal, computed like the sim does (CHAPTER_GOALS). */
export function chapterGoals(game: GameState): Goal[] {
  const machines = activeMachines(game).length;
  const count = (have: number, need: number, labelKey: TKey): Goal => ({
    label: t(labelKey),
    value: t('company.chapter.count', { have: Math.min(have, need), need }),
    progress: have / need,
  });
  switch (game.chapter) {
    case 1: {
      const need = CHAPTER_GOALS[1].salesCents;
      return [
        {
          label: t('company.chapter.sales'),
          value: t('company.chapter.count', {
            have: moneyShort(Math.min(need, game.ledger.lifetimeSalesCents)),
            need: moneyShort(need),
          }),
          progress: game.ledger.lifetimeSalesCents / need,
        },
      ];
    }
    case 2:
      return [
        count(machines, CHAPTER_GOALS[2].machines, 'company.chapter.machinesRunning'),
        count(game.vanLevel, CHAPTER_GOALS[2].vanLevel, 'company.chapter.van'),
      ];
    case 3:
      return [
        count(machines, CHAPTER_GOALS[3].machines, 'company.chapter.machinesRunning'),
        count(game.drivers.length, CHAPTER_GOALS[3].drivers, 'company.chapter.drivers'),
      ];
    case 4:
      return [
        count(machines, CHAPTER_GOALS[4].machines, 'company.chapter.machinesRunning'),
        count(game.drivers.length, CHAPTER_GOALS[4].drivers, 'company.chapter.drivers'),
      ];
    case 5: {
      const share = game.rival.active ? playerShare(game) : 0;
      return [
        {
          label: t('company.chapter.share', { rival: RIVAL.name }),
          value: t('company.chapter.count', {
            have: pct(share),
            need: pct(CHAPTER_GOALS[5].share),
          }),
          progress: share / CHAPTER_GOALS[5].share,
        },
      ];
    }
    case 6:
    case 7: {
      const six = game.chapter === 6;
      const need = six ? CHAPTER_GOALS[6].salesCents : CHAPTER_GOALS[7].salesCents;
      const sales = Math.max(0, game.ledger.lifetimeSalesCents - game.chapterStartSalesCents);
      return [
        six
          ? count(
              game.footprint.countries.length,
              CHAPTER_GOALS[6].countries,
              'company.chapter.countries',
            )
          : count(
              game.footprint.continents.length,
              CHAPTER_GOALS[7].continents,
              'company.chapter.continents',
            ),
        {
          label: t('company.chapter.salesSince'),
          value: t('company.chapter.count', {
            have: moneyShort(Math.min(need, sales)),
            need: moneyShort(need),
          }),
          progress: sales / need,
        },
      ];
    }
    default:
      return [];
  }
}
