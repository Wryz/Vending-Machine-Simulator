// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/collections';

export default {
  title: '컬렉션',
  noGame: '운영 중인 사업이 없어요.',
  subtitle: { one: '수집품 {n}개 모음', other: '수집품 {n}개 모음' },
  rarity: {
    common: '일반',
    uncommon: '고급',
    rare: '희귀',
    ultra: '울트라',
  },
  reveal: {
    a11y: '{item} 획득, {rarity}',
    a11yNew: '{item} 획득, {rarity}, 새로운 아이템',
    isNew: '{rarity} · 새로움',
    duplicate: '{rarity} · 중복',
  },
  perkDone: '완성! {family} 자판기 매출 +{pct}.',
  perkGoal: '세트를 완성하면 {family} 자판기 매출 +{pct}.',
  a11y: {
    owned: '{item}, {rarity}, {n}개 보유',
    missing: '{n}번, 아직 못 찾음',
  },
  section: {
    pulls: '뽑기',
    odds: '확률',
  },
  buyPull: '뽑기 구매 · {price}',
  locked:
    '뽑기 구매는 챕터 3(법인)에서 해금돼요. 캡슐 자판기에서 수금할 때 무료 뽑기가 나올 수도 있어요.',
  freePull: {
    one: '무료 뽑기 · 광고 보기 (오늘 {n}회 남음)',
    other: '무료 뽑기 · 광고 보기 (오늘 {n}회 남음)',
  },
  noFreePulls: '오늘 무료 뽑기를 다 썼어요',
  freePullHint: '선택 사항. 짧은 광고를 본 뒤 캡슐 하나를 열어요.',
  capsuleDrop: '캡슐 자판기에서 수금하면 {pct} 확률로 무료 뽑기도 나와요.',
  oddsNote:
    '뽑기마다 이 확률로 등급을 정하고, 그 등급의 아이템 하나를 무작위로 골라요. 뽑기에는 게임 머니만 써요.',
  noReward: '이번에는 보상이 없어요.',
} satisfies Shape<typeof en>;
