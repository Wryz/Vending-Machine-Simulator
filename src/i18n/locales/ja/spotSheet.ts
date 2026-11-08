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
  districtLocked: 'このエリアは第{n}章で開放。今置ける範囲はオレンジの線の内側です。',
  lockedType: '🔒 {type}・第{n}章',
  hoodLocked: '{name}は第{n}章で開放。今置ける範囲はオレンジの線の内側です。',
  placeMine: 'ここに自販機を設置',
  placeType: '{type}を設置',
  nearby: '近くの場所',
  noNearby: '400m以内に名前のある場所はありません。',
  placeLine: '{category} · {distance}',
  host: '設置先',
  use: '選ぶ',
  report: '報告',
  attribution: '場所はオープンな地図データより。提携や推奨の関係はありません。',
  about: 'このエリアについて',
  passing: '通行人/時',
  residents: '住民',
  vending: '近くの自販機：自分 {yours}・ライバル {rival}・店 {stores}',
  night: {
    low: '夜もにぎやか：自販機は安全',
    medium: '夜は静か',
    high: '夜は人けがない：いたずらが増えます',
  },
  a11y: {
    passing: '1時間に{n}人が通行',
    residents: '住民{n}人',
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
