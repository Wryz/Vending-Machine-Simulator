// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/report';

export default {
  title: '你不在的时候……',
  nothing: '没有新动态。',
  done: '完成',
  soldMachine: '你已卖掉的售货机',
  aMachine: '一台售货机',
  more: '· 还有 {n} 项',
  line: {
    sales: '销售额',
    items: '售出件数',
    costs: '成本',
    driverRuns: '司机出车',
    breakdowns: '故障',
    thefts: '失窃',
    spoiled: '变质商品',
  },
  cashChange: '现金变化',
  footerCapped: '已达离线上限。{time} 未计入。',
  footerThanks: '感谢惠顾。',
  bestSpots: '最佳点位',
  issue: {
    empty: '已售空',
    cashFull: '钱箱已满',
    contractsLost: '失去的合同',
    events: '本地活动',
    chapters: '完成的章节',
  },
  chapterLine: '{n}. {title}',
  lostNote: '失去合同的售货机已回到库存。可从钥匙串重新放置。',
  double: '翻倍 · 看广告（+{amount}）',
  doubleHint: '可选。播放一段短广告，然后再加一份同样的金额。',
  noReward: '这次没有奖励。',
  added: '已增加 {amount}',
} satisfies Shape<typeof en>;
