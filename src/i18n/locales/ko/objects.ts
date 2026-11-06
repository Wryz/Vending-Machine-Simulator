// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/objects';

export default {
  coinTray: {
    empty: '돈통이 비었어요',
    box: '돈통',
    venue: '장소',
    youKeep: '내 몫',
    a11y: {
      collected: '{amount} 수금',
      summary: '돈통 {gross}, 장소 수수료 {commission}, 내 몫 {net}',
    },
  },
  contract: {
    header: '설치 계약서',
    noCash: '서명할 현금이 부족해요',
    swipe: '밀어서 서명 →',
    a11y: {
      line: '서명란. 밀어서 서명하세요.',
      sign: '서명',
    },
  },
  keyTag: {
    a11y: '{place}의 {name}, {status}',
  },
  status: {
    ok: '운영 중',
    low: '재고 부족',
    empty: '품절',
    cashFull: '돈통 가득',
    broken: '고장',
    stored: '보관 중',
    unknown: '모니터링 없음',
  },
  permit: {
    office: '시청 인허가과',
    valid: '유효',
    notHeld: '미보유',
  },
  sparkline: {
    a11y: '시간대별 손님 수',
  },
} satisfies Shape<typeof en>;
