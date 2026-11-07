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
