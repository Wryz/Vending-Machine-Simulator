// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  section: {
    term: '期間',
    exclusivity: '独占契約',
  },
  days: { one: '{n}日', other: '{n}日' },
  permanent: '無期限',
  permanentNote: '最初の自販機はここにずっと置けます。期間も更新もありません。',
  termChip: '{days} · {pct}',
  termNote:
    '営業日数です。期間が長いほど手数料が下がります。設置先の機嫌が良ければ契約は更新されます。',
  exclusive: 'この区画からBrightvendを締め出す（手数料 +{pct}）',
  exclusiveA11y: '独占契約',
  contract: {
    machine: '自販機',
    commission: '設置先への手数料',
    term: '期間',
    exclusive: '独占',
    yes: 'あり',
    no: 'なし',
    price: '自販機の価格',
    install: '設置費',
  },
  disclaimer: '場所はオープンな地図データから表示しています。提携や推奨の関係はありません。',
  total: '本日の合計',
} satisfies Shape<typeof en>;
