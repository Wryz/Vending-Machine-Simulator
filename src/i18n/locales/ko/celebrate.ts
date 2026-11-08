// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/celebrate';

export default {
  kind: {
    chapter: '챕터 완료',
    trophy: '트로피',
    order: '주문 완료',
    streak: '모든 주문 완료',
    event: '근처 이벤트 예정',
    info: '알림',
    research: '연구 완료',
  },
  modal: {
    title: '좋은 소식',
    claim: '{amount} 받기',
    ok: '확인',
    waiting: '보상이 기다리고 있어요.',
  },
  a11y: '{label}: {title}. 탭해서 닫기.',
  moment: {
    chapterTitle: '{n}. {title}',
    next: '다음: {goal}',
    unlocked: '해금: {unlock}',
    eventTitle: '{place}에서 {event}',
    startsMin: '{n}분 후 시작',
    startsHours: '{n}시간 후 시작',
    orderReady: '주문 보상 받기',
  },
} satisfies Shape<typeof en>;
