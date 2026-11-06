// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/store';

export default {
  stillCounting: 'まだコインを集計中です。',
  noGame: 'ゲームが読み込まれていません。',
  load: {
    noApi: 'データAPIが設定されていません。',
    badPack: '非対応の地域パックです。',
    noPack: '{id}の同梱パックがありません',
    http: 'HTTP {status}',
  },
} satisfies Shape<typeof en>;
