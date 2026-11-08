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
    branchTitle: '{name}に支店を出しますか?',
    branchBody: '会社の資金・章・研究はそのまま引き継がれ、{current}は留守の間も営業を続けます。',
    branch: '支店を出す',
    lockedTitle: '支店は第{n}章から',
    lockedBody: '第{n}章からは、開く都市すべてが同じ会社の支店になります。それまでは{name}は資金も別の独立した事業になります。',
    separate: '別事業として始める',
    farTitle: '{name}は第{n}章で開放',
    farBody: '会社は本拠地から広がります。まず州・県、次に国、地域、大陸、そして最後に全世界へ。',
    fullTitle: '今は{count}都市が上限です',
    fullBody: 'あなたの会社は{count}都市まで運営できます。次の章でさらに増えます。',
  },
  footer:
    '切り替えるとこの都市が先に保存されます。第3章からは都市がひとつの会社の支店になり、資金と進行を共有します。',
  opening: '都市を開いています…',
} satisfies Shape<typeof en>;
