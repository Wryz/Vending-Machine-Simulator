// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/collections';

export default {
  title: 'コレクション',
  noGame: '開いているビジネスがありません。',
  subtitle: { one: '{n}個 収集済み', other: '{n}個 収集済み' },
  rarity: {
    common: 'コモン',
    uncommon: 'アンコモン',
    rare: 'レア',
    ultra: 'ウルトラ',
  },
  reveal: {
    a11y: '{item}（{rarity}）をゲット',
    a11yNew: '{item}（{rarity}）をゲット、新アイテム',
    isNew: '{rarity} · NEW',
    duplicate: '{rarity} · ダブり',
  },
  perkDone: 'コンプリート。{family}自販機の売上 +{pct}。',
  perkGoal: 'セットをそろえると{family}自販機の売上 +{pct}。',
  a11y: {
    owned: '{item}、{rarity}、{n}個所持',
    missing: 'No.{n}、未発見',
  },
  section: {
    pulls: 'ガチャ',
    odds: '排出率',
  },
  buyPull: 'ガチャを回す · {price}',
  locked:
    'ガチャの購入は第3章（LLC）で解放。カプセル自販機は売上回収時に無料ガチャが出ることがあります。',
  freePull: {
    one: '無料ガチャ · 広告を見る（本日残り{n}回）',
    other: '無料ガチャ · 広告を見る（本日残り{n}回）',
  },
  noFreePulls: '本日の無料ガチャは終了',
  freePullHint: '任意です。短い広告のあと、カプセルを1つ開けます。',
  capsuleDrop: 'カプセル自販機は売上回収時に{pct}の確率で無料ガチャも出ます。',
  oddsNote:
    'ガチャはこの確率でレア度を決め、そのレア度のアイテムをランダムに選びます。ゲーム内のお金だけを使います。',
  noReward: '今回は報酬なし。',
} satisfies Shape<typeof en>;
