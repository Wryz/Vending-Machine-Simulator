// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/money';

export default {
  a11y: {
    panel:
      '현금 {cash}. 챕터 {n}, {title}: {progress}. 오늘 매출 {today}, 자판기에 {waiting} 대기 중.',
    cash: '현금 {amount}',
    /** Appended when Double Profits is owned. */
    doubleProfits: '수익 2배 적용 중: 모든 판매가 2배.',
  },
} satisfies Shape<typeof en>;
