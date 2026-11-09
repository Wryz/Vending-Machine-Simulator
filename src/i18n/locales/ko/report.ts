// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/report';

export default {
  title: '자리를 비운 사이…',
  awayFor: '{time} 동안 자리를 비웠어요',
  inMachines: '자판기에 쌓인 현금',
  collect: '{amount} 수거',
  collected: '{amount} 수거했어요',
  nothing: '보고할 내용이 없어요.',
  done: '완료',
  soldMachine: '판매한 자판기',
  aMachine: '자판기',
  more: '· 외 {n}개',
  line: {
    sales: '매출',
    items: '판매 수량',
    venueCut: '장소 수수료',
    costs: '비용',
    driverRuns: '기사 운행',
    breakdowns: '고장',
    thefts: '도난',
    spoiled: '상한 상품',
  },
  profit: '이익',
  footerCapped: '오프라인 한도 도달. {time}은 계산되지 않았어요.',
  footerThanks: '이용해 주셔서 감사합니다.',
  bestSpots: '최고의 자리',
  issue: {
    empty: '품절됨',
    cashFull: '돈통 가득',
    contractsLost: '잃은 계약',
    events: '지역 이벤트',
    chapters: '완료한 챕터',
  },
  chapterLine: '{n}. {title}',
  lostNote: '계약을 잃은 자판기는 보관함으로 돌아왔어요. 열쇠고리에서 다시 설치하세요.',
  double: '두 배로 · 광고 보기 (+{amount})',
  doubleHint: '선택 사항. 짧은 광고를 본 뒤 같은 금액을 한 번 더 받아요.',
  noReward: '이번에는 보상이 없어요.',
  added: '{amount} 추가됨',
} satisfies Shape<typeof en>;
