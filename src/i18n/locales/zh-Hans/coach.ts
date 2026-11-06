// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: '放置第一台售货机',
      line: '轻点一条热闹的街道。火焰键会显示人流去向。',
    },
    stock: {
      title: '装货',
      line: '轻点你的售货机，然后点“装满”和“补货”。',
    },
    wait: {
      title: '等顾客上门',
      line: '放大地图，看行人走过来买东西。',
    },
    collect: {
      title: '收钱',
      line: '轻点你的售货机，清空钱箱。',
    },
    goal: {
      title: '你的第一个目标',
      line: '销售额达到 $1,000 即可完成第 1 章。顶部的进度条会记录进度。',
    },
  },
  ok: '好',
  a11y: {
    gotIt: '知道了',
    close: '关闭教程',
  },
} satisfies Shape<typeof en>;
