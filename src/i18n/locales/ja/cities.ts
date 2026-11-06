// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/cities';

export default {
  title: '都市',
  subtitle: '都市ごとに別々のビジネス',
  section: {
    current: '現在の都市',
    area: 'あなたの地域',
    cities: '都市',
  },
  chapterMachines: {
    one: '第{chapter}章 · 自販機{n}台',
    other: '第{chapter}章 · 自販機{n}台',
  },
  label: {
    saved: '保存済み',
    current: '現在地',
    newSave: '新規',
  },
  a11y: {
    row: '{name}、現地時刻 {time}、{label}',
    switchHint: 'この都市に切り替える',
  },
  openFailed: 'この都市を開けませんでした。',
  confirm: {
    startTitle: '{name}で始めますか？',
    goTitle: '{name}へ移動しますか？',
    startBody: '新しいセーブで新ビジネスを始めます。{current}の進行状況は保存されたままです。',
    goBody: '先に{current}の進行状況を保存します。',
    thisCity: 'この都市',
    cancel: 'キャンセル',
    start: '開始',
    go: '移動',
  },
  footer:
    '切り替える前にこのビジネスを保存します。第5章をクリアすると会社を売却して、好きな都市で有利にリスタートできます。',
  opening: '都市を開いています…',
} satisfies Shape<typeof en>;
