// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · 자판기 {n}대', other: '{city} · 자판기 {n}대' },
  placeHint: '자리를 탭해서 이 자판기를 설치하세요',
  /** The big key that starts placing a new machine. */
  placeKey: '자판기 놓기',
  placeKeyHint: '근처의 붐비는 곳을 찾아 카드를 열어요. 지도 아무 곳이나 눌러도 돼요.',
  placeLocked: '1장을 마치면 자판기를 더 살 수 있어요',
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: '창고',
  wholesale: '도매상',
  restockLow: '부족한 자판기 채우기',
  lowRun: {
    title: { one: '부족한 자판기 {n}대 채우기', other: '부족한 자판기 {n}대 채우기' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items}개 · {cost} · 약 {time}',
    send: '밴 보내기',
    cancel: '나중에',
    vansOut: '밴이 모두 나가 있어요',
  },
  backTo: '{city}(으)로 돌아가기',
  areas: {
    hood: '{name}\n{n}장에서 열림',
    ring: '{n}장에서 열림',
  },
  a11y: {
    van: '{venue}(으)로 가는 배송 밴',
    store: '{store}, 밴이 짐을 싣는 곳',
    settings: '설정',
    view3d: '3D 보기',
    topDown: '위에서 보기',
    busyStreets: '붐비는 거리',
    myMachines: '내 자판기',
    zoomIn: '확대',
    zoomOut: '축소',
  },
} satisfies Shape<typeof en>;
