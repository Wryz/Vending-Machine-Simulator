// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/notify';

export default {
  machineEmpty: {
    title: '售货机已售空',
    body: '你在 {venue} 的{type}已经卖光了。',
  },
  cashFull: {
    title: '钱箱已满',
    body: '去 {venue} 收钱吧。',
  },
  event: {
    title: '附近活动即将开始',
    body: '{venue}：{event}。',
  },
} satisfies Shape<typeof en>;
