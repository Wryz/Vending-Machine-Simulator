// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/picker';

export default {
  title: '去哪里？',
  subtitle: '转动地球仪或选一座城市',
  locate: '使用我的位置',
  locateHint: '大致位置，只询问一次，从不保存',
  here: '这里',
  km: '{n} 公里',
  nearYou: '附近',
  bigCities: '大城市',
  saved: '已保存',
  playing: '游戏中',
  start: '在{city}开始',
  go: '前往{city}',
  sell: '出售并在{city}重新开始',
  youreHere: '你正在这里游戏',
  none: '这里还没有城市',
  nearest: '最近：{city}，{km}',
  flyNearest: '查看{city}',
  opening: '正在打开{city}…',
  offline: '请联网一次以下载{city}。',
  failed: '无法打开{city}，请重试。',
  district: '{city}·{dir}',
  dir: {
    n: '北部',
    ne: '东北部',
    e: '东部',
    se: '东南部',
    s: '南部',
    sw: '西南部',
    w: '西部',
    nw: '西北部',
  },
  a11y: {
    card: '{city}，{km}',
    globe: '地球仪。拖动旋转，双指缩放。',
  },
} satisfies Shape<typeof en>;
