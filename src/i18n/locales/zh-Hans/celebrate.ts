// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/celebrate';

export default {
  kind: {
    chapter: '章节完成',
    trophy: '奖杯',
    order: '订单完成',
    streak: '订单全部完成',
    event: '附近即将开始',
    info: '提示',
    research: '研究完成',
  },
  modal: {
    title: '好消息',
    claim: '领取 {amount}',
    ok: '好',
    waiting: '有奖励等你领取。',
  },
  a11y: '{label}：{title}。轻点关闭。',
  moment: {
    chapterTitle: '{n}. {title}',
    next: '下一步：{goal}',
    unlocked: '已解锁：{unlock}',
    eventTitle: '{place}：{event}',
    startsMin: '{n} 分钟后开始',
    startsHours: '{n} 小时后开始',
    orderReady: '订单可领取',
  },
} satisfies Shape<typeof en>;
