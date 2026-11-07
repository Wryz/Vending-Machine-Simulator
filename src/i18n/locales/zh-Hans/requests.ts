// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/requests';

export default {
  reason: {
    thirsty: '刚在{place}吃完，好渴！',
    studying: '在{place}熬夜学习，需要能量！',
    dorm: '{place}附近宿舍的日用品用完了。',
    charging: '在{place}附近手机快没电了！',
    afterSchool: '{place}放学了，零食时间！',
    workout: '刚在{place}锻炼完。',
    deadline: '{place}有个大截止日期。',
    visiting: '来{place}探望人。',
    patient: '刚从{place}出来，不太舒服。',
    travel: '正在{place}赶路。',
    game: '{place}比赛日！',
    sunny: '在{place}晒太阳。',
    lateNight: '{place}的漫漫长夜…',
    sweetTooth: '{place}之后想吃点甜的。',
    shopping: '在{place}逛街歇会儿。',
    forgot: '把我的落在{place}了！',
    home: '从家里出来一下。',
  },
  card: {
    label: '顾客请求',
    title: '想要{product}',
    load: '装进去',
    loaded: '现在点“补货”',
    waiting: '还等{time}',
    tip: '小费 {amount}',
    otherMachine: '这台售货机卖不了。在 {m} 米内放一台“{type}”吧。',
    locked: '第 {n} 章解锁。',
  },
  served: {
    label: '请求完成',
    title: '{venue}的{product}',
    subtitle: '已售出，还有小费',
  },
  a11y: {
    bubble: '顾客请求：{product}。轻点打开售货机。',
  },
} satisfies Shape<typeof en>;
