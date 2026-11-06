// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  heading: {
    n: '북쪽',
    e: '동',
    s: '남',
    w: '서',
  },
  section: {
    term: '기간',
    exclusivity: '독점',
    facing: '방향',
  },
  days: { one: '{n}일', other: '{n}일' },
  termNote: '영업일 기준. 기간이 길수록 수수료가 낮아져요. 장소가 만족하면 계약이 갱신돼요.',
  exclusive: '이 블록에서 Brightvend 막기 (수수료 +{pct})',
  exclusiveA11y: '독점 계약',
  contract: {
    machine: '자판기',
    commission: '장소 수수료',
    term: '기간',
    exclusive: '독점',
    yes: '예',
    no: '아니요',
    price: '자판기 가격',
    install: '설치비',
  },
  disclaimer: '장소는 오픈 지도 데이터에서 가져와요. 제휴나 보증과는 무관해요.',
  total: '오늘 합계',
} satisfies Shape<typeof en>;
