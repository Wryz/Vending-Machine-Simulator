// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/orders';

export default {
  title: '주문',
  streakLabel: '연속 일수',
  streakValue: { one: '{n}일', other: '{n}일' },
  streakBonusLabel:
    '세 개를 모두 끝내면 연속 보너스를 받아요. 연속 일수만큼 곱해지고 최대 {cap}. 하루 놓치면 처음부터예요.',
  streakBonusValue: '{amount} × 연속',
  empty: '새 주문은 하루가 시작되면 도착해요.',
  progress: '{have} / {target}',
  claimed: '받음',
  done: '완료',
  claim: '받기',
  streakToast: {
    title: '{n}일 연속',
    subtitle: '오늘의 주문을 모두 끝냈어요.',
  },
  trophies: '트로피 {got}/{total}',
  a11y: {
    trophyUnlocked: '{title}: {desc}, 해금됨',
    trophyLocked: '{title}: {desc}, 잠김',
  },
} satisfies Shape<typeof en>;
