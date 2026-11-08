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
  restockLow: '在庫が少ない自販機を補充',
  lowRun: {
    title: { one: '在庫が少ない自販機{n}台を補充', other: '在庫が少ない自販機{n}台を補充' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items}個 · {cost} · 約{time}',
    send: 'バンを出す',
    cancel: 'あとで',
    vansOut: 'バンはすべて出ています',
  },
  backTo: '{city}に戻る',
  areas: {
    hood: '{name}\n第{n}章で開放',
    ring: '第{n}章で開放',
  },
  clockAhead: {
    title: '端末の時計が進んでいました',
    body: '実際の時刻が追いつくまで街は待機します(約{time})。その後、自販機は再び売れ始めます。',
  },
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
