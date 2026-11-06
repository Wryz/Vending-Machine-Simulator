// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/money';

export default {
  a11y: {
    panel:
      '所持金 {cash}。第{n}章「{title}」：{progress}。今日の売上 {today}、自販機内に {waiting}。',
    cash: '所持金 {amount}',
  },
} satisfies Shape<typeof en>;
