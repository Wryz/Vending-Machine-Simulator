// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/objects';

export default {
  coinTray: {
    empty: '金庫は空です',
    box: '金庫',
    venue: '設置先',
    youKeep: '手取り',
    a11y: {
      collected: '{amount}を回収',
      summary: '金庫 {gross}、設置先の手数料 {commission}、手取り {net}',
    },
  },
  contract: {
    header: '設置契約書',
    noCash: 'お金が足りず署名できません',
    swipe: 'スワイプして署名 →',
    a11y: {
      line: '署名欄。横にスワイプして署名。',
      sign: '署名',
    },
  },
  keyTag: {
    a11y: '{place}の{name}、{status}',
  },
  status: {
    ok: '稼働中',
    low: '在庫少',
    empty: '売り切れ',
    cashFull: '金庫満杯',
    broken: '故障中',
    stored: '倉庫保管中',
    unknown: '監視なし',
  },
  permit: {
    office: '市営許認可事務所',
    valid: '有効',
    notHeld: '未取得',
  },
  sparkline: {
    a11y: '時間帯別の客数',
  },
} satisfies Shape<typeof en>;
