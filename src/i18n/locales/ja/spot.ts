// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spot';

export default {
  streetCorner: '街角',
  ratingA11y: '5点中{n}点',
  district: '第{n}地区',
  venueLine: '{category} · {distance} · 第{n}地区',
  section: {
    machine: '自販機',
    why: '理由',
    nearby: '近くの場所',
  },
  owned: '{name}（所有）',
  stat: {
    now: '現在の客数',
    day: '1営業日あたり',
    sales: '予想売上/日',
  },
  perHour: '{n}/時',
  best: 'おすすめ：{list}',
  theft: '盗難リスク：{risk}',
  risk: {
    low: '低',
    medium: '中',
    high: '高',
  },
  competitors: '競合：{n}',
  commission: '希望手数料 約{pct}',
  noNearby: '400m以内に名前のある場所はありません。',
  host: '設置先',
  use: '選ぶ',
  report: '報告',
  disclaimer: '場所はオープンな地図データから表示しています。提携や推奨の関係はありません。',
  districtLocked: 'この地区は後の章で解放されます。',
  placeMine: 'ここに自販機を設置',
  placeType: 'ここに{type}を設置',
  reportAlert: {
    title: 'この場所を報告しますか？',
    body: '{name}はゲームから非表示になります。',
    cancel: 'キャンセル',
    hide: '非表示',
  },
} satisfies Shape<typeof en>;
