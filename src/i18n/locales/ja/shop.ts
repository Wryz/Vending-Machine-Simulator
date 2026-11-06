// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/shop';

export default {
  title: 'ショップ',
  subtitle: '買い切りのみ。サブスクなし。',
  products: {
    removeAds: {
      title: '広告削除＋長めの休憩',
      detail: '広告オファーを非表示にし、オフライン上限を25%アップ。',
    },
    starterPack: {
      title: 'スターターパック',
      detail: 'バンの強化、スナック自販機2台、所持金{amount}。第1章クリア後に1回だけ販売。',
    },
    doubleProfits: {
      title: '利益2倍',
      detail: 'すべての売上がずっと2倍。',
    },
  },
  owned: '購入済み',
  doubleProfitsNote: 'すべての自販機、すべての都市で。章の目標は通常の売上で数えます。',
  buy: '購入 · {price}',
  starterAdded: 'スターターパックを追加しました。スナック自販機2台が倉庫にあります。',
  starterPending: '購入を記録しました。都市を開くとスターターパックを受け取れます。',
  yours: '{title}を入手しました。',
  restored: '購入を復元しました。',
  restoreFailed: '購入を復元できませんでした。',
  noReward: '今回は報酬なし。',
  doubled: {
    one: '{n}分間、収益が2倍になりました。',
    other: '{n}分間、収益が2倍になりました。',
  },
  noStore: 'このビルドではストアを利用できません。',
  noStoreBody: 'ゲーム内のすべてはプレイで手に入ります。',
  section: {
    purchases: '購入',
    rewards: '無料報酬',
  },
  doubleTitle: {
    one: '{n}分間 収益2倍',
    other: '{n}分間 収益2倍',
  },
  doubleNote: '任意です。タップしたときだけ短い広告が流れます。',
  active: '有効 · 残り{time}',
  addMinutes: {
    one: '{n}分追加 · 広告を見る',
    other: '{n}分追加 · 広告を見る',
  },
  watchAd: '広告を見る',
  restore: '購入を復元',
} satisfies Shape<typeof en>;
