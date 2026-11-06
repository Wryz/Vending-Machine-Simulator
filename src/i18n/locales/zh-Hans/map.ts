// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} 台售货机', other: '{city} · {n} 台售货机' },
  placeHint: '轻点一个位置放置这台售货机',
  backTo: '返回{city}',
  a11y: {
    settings: '设置',
    view3d: '3D 视图',
    topDown: '俯视图',
    busyStreets: '热闹街道',
    myMachines: '我的售货机',
    zoomIn: '放大',
    zoomOut: '缩小',
  },
} satisfies Shape<typeof en>;
