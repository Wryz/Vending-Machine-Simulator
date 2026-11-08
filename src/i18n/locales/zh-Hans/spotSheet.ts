// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  streetCorner: '街角',
  district: '{n} 区',
  venueLine: '{category} · {distance}',
  perHour: '每小时',
  perDay: '每天',
  yours: '{type}（你的）',
  districtLocked: '该区域将在后续章节解锁。',
  placeMine: '把我的售货机放在这里',
  placeType: '放置{type}',
  nearby: '附近',
  noNearby: '400 米内没有具名地点。',
  placeLine: '{category} · {distance}',
  host: '场所',
  use: '选用',
  report: '举报',
  attribution: '地点来自开放地图数据。与这些地点无任何关联或背书。',
  about: '关于这片区域',
  passing: '路人/小时',
  residents: '居民',
  vending: '附近售货：你的 {yours} · 对手 {rival} · 商店 {stores}',
  night: {
    low: '夜间热闹：机器安全',
    medium: '夜间安静',
    high: '夜间冷清：更易遭破坏',
  },
  a11y: {
    passing: '每小时 {n} 人经过',
    residents: '{n} 位居民',
    customers: '每小时 {n} 位顾客',
    sales: '每天销售额 {amount}',
  },
  reportAlert: {
    title: '举报此地点？',
    body: '{name}将从你的游戏中隐藏。',
    cancel: '取消',
    confirm: '隐藏',
  },
} satisfies Shape<typeof en>;
