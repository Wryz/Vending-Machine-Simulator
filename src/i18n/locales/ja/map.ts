// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · 自販機{n}台', other: '{city} · 自販機{n}台' },
  placeHint: 'スポットをタップしてこの自販機を設置',
  /** The big key that starts placing a new machine. */
  placeKey: '自販機を置く',
  placeKeyHint: '近くのにぎやかな場所を探してカードを開きます。地図のどこをタップしてもOK。',
  placeLocked: '第1章を終えると自販機をもっと買えます',
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: '倉庫',
  wholesale: '卸売店',
  backTo: '{city}に戻る',
  a11y: {
    van: '{venue}への配送バン',
    store: '{store}（バンの積み込み先）',
    settings: '設定',
    view3d: '3D表示',
    topDown: '真上から表示',
    busyStreets: '人通りの多い道',
    myMachines: '自分の自販機',
    zoomIn: 'ズームイン',
    zoomOut: 'ズームアウト',
  },
} satisfies Shape<typeof en>;
