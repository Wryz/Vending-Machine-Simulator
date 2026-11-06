// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/objects';

export default {
  coinTray: {
    empty: '钱箱是空的',
    box: '钱箱',
    venue: '场所',
    youKeep: '你的收入',
    a11y: {
      collected: '已收款 {amount}',
      summary: '钱箱 {gross}，场所佣金 {commission}，你的收入 {net}',
    },
  },
  contract: {
    header: '场地租用协议',
    noCash: '现金不足，无法签约',
    swipe: '划过签名 →',
    a11y: {
      line: '签名线。划过即可签名。',
      sign: '签名',
    },
  },
  keyTag: {
    a11y: '{place}的{name}，{status}',
  },
  status: {
    ok: '运营中',
    low: '库存不足',
    empty: '已售空',
    cashFull: '钱箱已满',
    broken: '故障',
    stored: '库存中',
    unknown: '无远程监控',
  },
  permit: {
    office: '市营业执照办公室',
    valid: '有效',
    notHeld: '未持有',
  },
  sparkline: {
    a11y: '每小时顾客数',
  },
} satisfies Shape<typeof en>;
