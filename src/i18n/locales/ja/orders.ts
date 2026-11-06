// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/orders';

export default {
  title: 'デイリー注文',
  streakLabel: '連続日数',
  streakValue: { one: '{n}日', other: '{n}日' },
  streakBonusLabel:
    '3つすべて達成すると連続ボーナス（連続日数倍、最大{cap}）。1日休むとリセットされます。',
  streakBonusValue: '{amount} × 連続',
  empty: '新しい注文は日付が変わると届きます。',
  progress: '{have} / {target}',
  claimed: '受取済み',
  done: '達成',
  claim: '受け取る',
  streakToast: {
    title: '{n}日連続',
    subtitle: '今日の注文をすべて達成しました。',
  },
  trophies: 'トロフィー {got}/{total}',
  a11y: {
    trophyUnlocked: '{title}：{desc}、獲得済み',
    trophyLocked: '{title}：{desc}、未獲得',
  },
} satisfies Shape<typeof en>;
