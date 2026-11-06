import { t } from '@/i18n';
import { featureUnlocked, type AdvanceReport, type GameState } from '@/sim';

import { useCelebrations } from './celebrations';

/**
 * The nightly ranking update as a moment (SPEC §4.8): "You passed Night Owl
 * Snacks! #4 in London". At most one per nightly board, and only when the
 * player moved past someone.
 */
export function announceRanking(
  state: GameState,
  report: AdvanceReport,
  cityName: string | undefined,
): void {
  const b = report.rankUpdate;
  if (!b || !b.passed.length || !featureUnlocked(state, 'rankings')) return;
  // The operator now right below the player: the one just passed.
  const passed = b.entries.find((e) => e.id === b.passed[0]);
  if (!passed) return;
  const city = cityName ?? '';
  useCelebrations.getState().push({
    kind: 'trophy',
    label: t('rankings.moment.label'),
    title:
      b.rank === 1
        ? t('rankings.moment.top', { city })
        : t('rankings.moment.passed', { name: passed.name }),
    subtitle:
      b.rank === 1
        ? t('rankings.moment.passed', { name: passed.name })
        : t('rankings.moment.rank', { rank: b.rank, city }),
  });
}
