// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/shop';

export default {
  title: '商店',
  subtitle: '一次性购买。没有订阅。',
  products: {
    removeAds: {
      title: '去广告 + 更长离线',
      detail: '隐藏广告奖励选项，离线上限提高 25%。',
    },
    starterPack: {
      title: '新手礼包',
      detail: '货车升级、两台零食机和 $2,000 现金。第 1 章后限购一次。',
    },
    doubleProfits: {
      title: '双倍利润',
      detail: '每笔销售永久翻倍。',
    },
  },
  owned: '已拥有',
  doubleProfitsNote: '所有售货机、所有城市通用。章节目标按普通销售计算。',
  buy: '购买 · {price}',
  starterAdded: '新手礼包已到账。两台零食机已放入库存。',
  starterPending: '购买已记录。打开一座城市即可领取新手礼包。',
  yours: '{title} 已归你所有。',
  restored: '购买已恢复。',
  restoreFailed: '无法恢复购买。',
  noReward: '这次没有奖励。',
  doubled: {
    one: '收入翻倍 {n} 分钟。',
    other: '收入翻倍 {n} 分钟。',
  },
  noStore: '此版本无法使用商店。',
  noStoreBody: '游戏里的一切都可以通过游玩获得。',
  section: {
    purchases: '购买',
    rewards: '免费奖励',
  },
  doubleTitle: {
    one: '收入翻倍 {n} 分钟',
    other: '收入翻倍 {n} 分钟',
  },
  doubleNote: '可选。只有你点击时才会播放短广告。',
  active: '生效中 · 剩余 {time}',
  addMinutes: {
    one: '增加 {n} 分钟 · 看广告',
    other: '增加 {n} 分钟 · 看广告',
  },
  watchAd: '看广告',
  restore: '恢复购买',
} satisfies Shape<typeof en>;
