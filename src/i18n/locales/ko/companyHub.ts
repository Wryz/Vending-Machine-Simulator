// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/companyHub';

export default {
  section: {
    hintOpen: '이 섹션을 접습니다',
    hintClosed: '이 섹션을 펼칩니다',
  },
  chapter: {
    requirements: '레벨 업 조건',
    toReach: '챕터 {n}에 가려면',
    rewards: '이 챕터를 마치면 열림',
    last: '마지막 챕터: 준비되면 회사를 매각하세요.',
    stepsHint: '숫자를 눌러 해당 챕터를 보세요',
    stepHint: '이 챕터의 목표와 해금 내용을 보여 줍니다',
  },
  chapterSheet: {
    title: '챕터 {n}',
    done: '완료',
    current: '진행 중',
    locked: '예정',
    goal: '목표',
    unlocks: '해금',
    unlocked: '해금됨',
    close: '닫기',
  },
  finances: {
    cash: '현금',
    cashDesc: '보유 자금',
    netToday: '오늘 순이익',
    netTodayDesc: '오늘 수입 − 지출',
    inToday: '오늘 수입',
    inTodayDesc: '매출과 보상',
    outToday: '오늘 지출',
    outTodayDesc: '재고, 임대료, 급여…',
    netYesterday: '어제 순이익',
    netYesterdayDesc: '하루 전체',
    lifetimeSales: '누적 매출',
    lifetimeSalesDesc: '시작 이후',
    lifetimeCosts: '누적 비용',
    lifetimeCostsDesc: '시작 이후',
    unitsSold: '판매 수량',
    unitsSoldDesc: '누적',
    breakdown: '오늘 항목별',
    noActivity: '오늘은 아직 활동이 없어요',
  },
  more: {
    research: '연구',
    rankings: '도시 순위',
    globalRanking: '글로벌 순위',
    prestige: '프레스티지',
    trophies: '트로피',
  },
  trophies: {
    title: '트로피',
    subtitle: '{total}개 중 {got}개 획득',
    waiting: '받을 보상',
    claim: '{amount} 받기',
    claimed: '{amount} 받음',
  },
} satisfies Shape<typeof en>;
