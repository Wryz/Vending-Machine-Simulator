// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/orders';

export default {
  title: '订单',
  streakLabel: '连续天数',
  streakValue: { one: '{n} 天', other: '{n} 天' },
  streakBonusLabel: '完成全部三项可得连续奖励，乘以连续天数，最高 {cap}。断一天就从头开始。',
  streakBonusValue: '{amount} × 连续天数',
  empty: '新订单会随新一天到来。',
  progress: '{have} / {target}',
  claimed: '已领取',
  done: '完成',
  claim: '领取',
  streakToast: {
    title: '连续 {n} 天',
    subtitle: '今天的订单全部完成。',
  },
  trophies: '奖杯 {got}/{total}',
  a11y: {
    trophyUnlocked: '{title}：{desc}，已解锁',
    trophyLocked: '{title}：{desc}，未解锁',
  },
} satisfies Shape<typeof en>;
