// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/money';

export default {
  a11y: {
    panel:
      '现金 {cash}。第 {n} 章，{title}：{progress}。今日销售额 {today}，售货机里还有 {waiting} 待收。',
    cash: '现金 {amount}',
    /** Appended when Double Profits is owned. */
    doubleProfits: '双倍利润已生效：每笔销售翻倍。',
  },
} satisfies Shape<typeof en>;
