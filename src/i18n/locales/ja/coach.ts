// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: '最初の自販機を設置',
      line: '人通りの多い道をタップ。炎のキーで人の流れが見えます。',
    },
    stock: {
      title: '商品を入れよう',
      line: '自販機をタップして「満タン」と「補充」を押します。',
    },
    wait: {
      title: 'お客さんを待とう',
      line: 'ズームインすると、人が買いに来る様子が見えます。',
    },
    collect: {
      title: '売上を回収',
      line: '自販機をタップして金庫を空にします。',
    },
    goal: {
      title: '最初の目標',
      line: '売上{amount}で第1章クリア。上のメーターで進み具合を確認できます。',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'わかった',
    close: 'チュートリアルを閉じる',
  },
} satisfies Shape<typeof en>;
