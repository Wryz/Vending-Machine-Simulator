// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · 自販機{n}台', other: '{city} · 自販機{n}台' },
  placeHint: 'スポットをタップしてこの自販機を設置',
  backTo: '{city}に戻る',
  a11y: {
    settings: '設定',
    view3d: '3D表示',
    topDown: '真上から表示',
    busyStreets: '人通りの多い道',
    myMachines: '自分の自販機',
    zoomIn: 'ズームイン',
    zoomOut: 'ズームアウト',
  },
} satisfies Shape<typeof en>;
