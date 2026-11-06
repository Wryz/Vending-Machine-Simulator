// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/rankings';

export default {
  title: 'トップ事業者',
  subtitle: '今週の{city}',
  you: 'あなた',
  rivalTag: 'ライバル',
  day: '7日中{n}日目 · 深夜0時に更新',
  final: '最終順位 · 今日から新しい週',
  preview: 'ライブプレビュー · 初回ランキングは深夜0時',
  of: '/{n}',
  overnightUp: { one: '一晩で{n}位アップ', other: '一晩で{n}位アップ' },
  overnightDown: { one: '一晩で{n}位ダウン', other: '一晩で{n}位ダウン' },
  overnightSame: '昨夜と同じ順位',
  climbed: '一晩で{from}位から{to}位に上がりました',
  thisWeek: '今週の売上',
  toPass: 'あと{amount}で{name}を抜けます',
  leading: '街のトップです。この調子で！',
  lastWeek: '先週: {n}中{rank}位',
  howItWorks: '月曜からの売上で順位を決めます。毎晩、現地時間の深夜0時に更新されます。',
  a11y: {
    row: '{rank}位 {name}: {amount}',
    chip: '街のランキング {n}中{rank}位。ランキングを開きます。',
  },
  moment: {
    label: '街のランキング',
    passed: '{name}を抜きました！',
    top: '{city}で1位になりました！',
    rank: '{city}で{rank}位',
  },
  company: {
    section: '街のランキング',
    open: 'ランキングを見る',
    none: '最初のランキングは深夜0時に発表されます。',
  },
} satisfies Shape<typeof en>;
