// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spot';

export default {
  streetCorner: '街角',
  ratingA11y: '{n} 星（满分 5 星）',
  district: '{n} 区',
  venueLine: '{category} · {distance} · {n} 区',
  section: {
    machine: '售货机',
    why: '原因',
    nearby: '附近地点',
  },
  owned: '{name}（已拥有）',
  stat: {
    now: '当前顾客',
    day: '每营业日',
    sales: '预计日销售额',
  },
  perHour: '{n}/时',
  best: '最适合：{list}',
  theft: '失窃风险：{risk}',
  risk: {
    low: '低',
    medium: '中',
    high: '高',
  },
  competitors: '竞争者：{n}',
  commission: '佣金要价约 {pct}',
  noNearby: '400 米内没有具名地点。',
  host: '场所',
  use: '选用',
  report: '举报',
  disclaimer: '地点来自开放地图数据。与这些地点无任何关联或背书。',
  districtLocked: '该区域将在后续章节解锁。',
  placeMine: '把我的售货机放在这里',
  placeType: '在这里放一台{type}',
  reportAlert: {
    title: '举报此地点？',
    body: '{name}将从你的游戏中隐藏。',
    cancel: '取消',
    hide: '隐藏',
  },
} satisfies Shape<typeof en>;
