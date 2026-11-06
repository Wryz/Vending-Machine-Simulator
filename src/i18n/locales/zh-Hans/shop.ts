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
    wrapNight: {
      title: '夜班外观',
      detail: '低调深色的售货机外观。仅装饰。',
    },
    wrapLinen: {
      title: '亚麻外观',
      detail: '温暖的米白色外观。仅装饰。',
    },
    lightingWarm: {
      title: '暖光灯光包',
      detail: '夜间钠灯般的暖色商品照明。仅装饰。',
    },
  },
  owned: '已拥有',
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
    looks: '外观',
    rewards: '免费奖励',
  },
  looksNote: '在售货机特写中应用外观和灯光。仅装饰。',
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
