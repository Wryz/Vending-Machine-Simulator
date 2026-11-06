// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/rankings';

export default {
  title: '顶级运营商',
  subtitle: '本周 · {city}',
  you: '你',
  rivalTag: '对手',
  day: '第 {n}/7 天 · 午夜更新',
  final: '最终排名 · 今天开始新的一周',
  preview: '实时预览 · 首次排名在午夜',
  of: '/{n}',
  overnightUp: { one: '一夜上升 {n} 名', other: '一夜上升 {n} 名' },
  overnightDown: { one: '一夜下降 {n} 名', other: '一夜下降 {n} 名' },
  overnightSame: '与昨晚名次相同',
  climbed: '一夜之间从第 {from} 名升到第 {to} 名',
  thisWeek: '你本周的销售额',
  toPass: '再卖 {amount} 就能超过 {name}',
  leading: '你是全城第一，继续保持！',
  lastWeek: '上周：{n} 家中第 {rank} 名',
  howItWorks: '按周一以来的销售额排名。每晚当地时间午夜更新。',
  a11y: {
    row: '第 {rank} 名 {name}：{amount}',
    chip: '城市排名第 {rank}/{n}。打开排行榜。',
  },
  moment: {
    label: '城市排名',
    passed: '你超过了 {name}！',
    top: '你是{city}第一！',
    rank: '{city}第 {rank} 名',
  },
  company: {
    section: '城市排名',
    open: '查看排行榜',
    none: '首次排名将在午夜公布。',
  },
} satisfies Shape<typeof en>;
