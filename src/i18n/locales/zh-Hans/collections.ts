// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/collections';

export default {
  title: '收藏',
  noGame: '还没有开张的生意。',
  subtitle: { one: '已收集 {n} 件', other: '已收集 {n} 件' },
  rarity: {
    common: '普通',
    uncommon: '少见',
    rare: '稀有',
    ultra: '超稀有',
  },
  reveal: {
    a11y: '你获得了{item}，{rarity}',
    a11yNew: '你获得了{item}，{rarity}，新的',
    isNew: '{rarity} · 新',
    duplicate: '{rarity} · 重复',
  },
  perkDone: '已集齐。{family}售货机销量 +{pct}。',
  perkGoal: '集齐这一套，{family}售货机销量 +{pct}。',
  a11y: {
    owned: '{item}，{rarity}，拥有 {n} 个',
    missing: '{n} 号，尚未获得',
  },
  section: {
    pulls: '扭蛋',
    odds: '概率',
  },
  buyPull: '扭一次 · {price}',
  locked: '购买扭蛋将在第 3 章（开公司）解锁。收取扭蛋机的钱时，仍有机会掉落免费扭蛋。',
  freePull: {
    one: '免费扭一次 · 看广告（今天剩 {n} 次）',
    other: '免费扭一次 · 看广告（今天剩 {n} 次）',
  },
  noFreePulls: '今天的免费扭蛋已用完',
  freePullHint: '可选。播放一段短广告，然后打开一个扭蛋。',
  capsuleDrop: '收取扭蛋机的钱时，有 {pct} 的概率掉落一次免费扭蛋。',
  oddsNote: '每次扭蛋先按以下概率决定稀有度，再从该稀有度中随机抽取一件。扭蛋只用游戏内金钱。',
  noReward: '这次没有奖励。',
} satisfies Shape<typeof en>;
