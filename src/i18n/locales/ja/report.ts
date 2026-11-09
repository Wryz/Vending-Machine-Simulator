// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/report';

export default {
  title: 'お留守の間に…',
  awayFor: '{time}留守にしていました',
  inMachines: '自販機にたまっている売上',
  collect: '{amount}を回収',
  collected: '{amount}を回収しました',
  nothing: '報告することはありません。',
  done: 'OK',
  soldMachine: '売却した自販機',
  aMachine: '自販機',
  more: '· ほか{n}件',
  line: {
    sales: '売上',
    items: '販売数',
    venueCut: '設置先の取り分',
    costs: '経費',
    driverRuns: '配送回数',
    breakdowns: '故障',
    thefts: '盗難',
    spoiled: '廃棄',
  },
  profit: '利益',
  footerCapped: 'オフライン上限に到達。{time}分は計算されません。',
  footerThanks: 'ご利用ありがとうございました。',
  bestSpots: 'ベストスポット',
  issue: {
    empty: '売り切れ',
    cashFull: '金庫満杯',
    contractsLost: '失った契約',
    events: '地域イベント',
    chapters: 'クリアした章',
  },
  chapterLine: '{n}. {title}',
  lostNote: '契約を失った自販機は倉庫に戻りました。キーリングから設置できます。',
  double: '2倍にする · 広告を見る（+{amount}）',
  doubleHint: '任意です。短い広告のあと、同じ額がもう一度入ります。',
  noReward: '今回は報酬なし。',
  added: '{amount}を追加',
} satisfies Shape<typeof en>;
