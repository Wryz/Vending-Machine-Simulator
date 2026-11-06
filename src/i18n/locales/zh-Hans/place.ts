// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  heading: {
    n: '朝北',
    e: '东',
    s: '南',
    w: '西',
  },
  section: {
    term: '合同期',
    exclusivity: '独家',
    facing: '朝向',
  },
  days: { one: '{n} 天', other: '{n} 天' },
  termNote: '按营业日计。合同期越长，佣金越低。场所满意时合同会自动续约。',
  exclusive: '不让 Brightvend 进入这个街区（佣金 +{pct}）',
  exclusiveA11y: '独家合同',
  contract: {
    machine: '售货机',
    commission: '场所佣金',
    term: '合同期',
    exclusive: '独家',
    yes: '是',
    no: '否',
    price: '售货机价格',
    install: '安装费',
  },
  disclaimer: '地点来自开放地图数据。与这些地点无任何关联或背书。',
  total: '今日合计',
} satisfies Shape<typeof en>;
