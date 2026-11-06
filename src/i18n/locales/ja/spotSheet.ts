// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  streetCorner: '街角',
  district: '第{n}地区',
  venueLine: '{category} · {distance}',
  perHour: '1時間あたり',
  perDay: '1日あたり',
  yours: '{type}（所有）',
  districtLocked: 'この地区は後の章で解放されます。',
  placeMine: 'ここに自販機を設置',
  placeType: '{type}を設置',
  nearby: '近くの場所',
  noNearby: '400m以内に名前のある場所はありません。',
  placeLine: '{category} · {distance}',
  host: '設置先',
  use: '選ぶ',
  report: '報告',
  attribution: '場所はオープンな地図データより。提携や推奨の関係はありません。',
  a11y: {
    customers: '1時間あたり{n}人',
    sales: '1日あたりの売上 {amount}',
  },
  reportAlert: {
    title: 'この場所を報告しますか？',
    body: '{name}はゲームから非表示になります。',
    cancel: 'キャンセル',
    confirm: '非表示',
  },
} satisfies Shape<typeof en>;
