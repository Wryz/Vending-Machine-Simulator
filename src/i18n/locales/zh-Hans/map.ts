// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} 台售货机', other: '{city} · {n} 台售货机' },
  placeHint: '轻点一个位置放置这台售货机',
  /** The big key that starts placing a new machine. */
  placeKey: '放置售货机',
  placeKeyHint: '在附近找一个热闹的地方并打开它的卡片。也可以点地图上的任何位置。',
  placeLocked: '完成第1章才能买更多售货机',
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: '仓库',
  wholesale: '批发商',
  restockLow: '给快空的售货机补货',
  lowRun: {
    title: { one: '给 {n} 台快空的售货机补货', other: '给 {n} 台快空的售货机补货' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items} 件 · {cost} · 约 {time}',
    send: '派出货车',
    cancel: '以后再说',
    vansOut: '货车都出去了',
  },
  backTo: '返回{city}',
  a11y: {
    van: '开往{venue}的送货车',
    store: '{store}，你的货车在这里装货',
    settings: '设置',
    view3d: '3D 视图',
    topDown: '俯视图',
    busyStreets: '热闹街道',
    myMachines: '我的售货机',
    zoomIn: '放大',
    zoomOut: '缩小',
  },
} satisfies Shape<typeof en>;
