// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · 자판기 {n}대', other: '{city} · 자판기 {n}대' },
  placeHint: '자리를 탭해서 이 자판기를 설치하세요',
  backTo: '{city}(으)로 돌아가기',
  a11y: {
    settings: '설정',
    view3d: '3D 보기',
    topDown: '위에서 보기',
    busyStreets: '붐비는 거리',
    myMachines: '내 자판기',
    zoomIn: '확대',
    zoomOut: '축소',
  },
} satisfies Shape<typeof en>;
