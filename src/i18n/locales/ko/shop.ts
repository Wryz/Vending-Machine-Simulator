// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/shop';

export default {
  title: '상점',
  subtitle: '일회성 구매. 구독 없음.',
  products: {
    removeAds: {
      title: '광고 제거 + 더 긴 휴식',
      detail: '광고 제안을 숨기고 오프라인 한도를 25% 늘려요.',
    },
    starterPack: {
      title: '스타터 팩',
      detail: '밴 업그레이드, 스낵 자판기 2대, 현금 $2,000. 챕터 1 이후 한 번만 제공.',
    },
    wrapNight: {
      title: '야간 근무 래핑',
      detail: '어둡고 차분한 자판기 래핑. 외형 전용.',
    },
    wrapLinen: {
      title: '리넨 래핑',
      detail: '따뜻한 아이보리 래핑. 외형 전용.',
    },
    lightingWarm: {
      title: '따뜻한 조명 팩',
      detail: '밤에 나트륨등처럼 따뜻한 상품 조명. 외형 전용.',
    },
  },
  owned: '보유',
  buy: '구매 · {price}',
  starterAdded: '스타터 팩 지급 완료. 스낵 자판기 2대가 보관함에 있어요.',
  starterPending: '구매가 기록됐어요. 도시를 열면 스타터 팩을 받아요.',
  yours: '{title}을(를) 얻었어요.',
  restored: '구매를 복원했어요.',
  restoreFailed: '구매를 복원할 수 없어요.',
  noReward: '이번에는 보상이 없어요.',
  doubled: {
    one: '{n}분 동안 수익 두 배.',
    other: '{n}분 동안 수익 두 배.',
  },
  noStore: '이 빌드에서는 상점을 쓸 수 없어요.',
  noStoreBody: '게임 속 모든 것은 플레이로 얻을 수 있어요.',
  section: {
    purchases: '구매',
    looks: '외형',
    rewards: '무료 보상',
  },
  looksNote: '래핑과 조명은 자판기 클로즈업에서 적용해요. 외형 전용.',
  doubleTitle: {
    one: '{n}분 동안 수익 두 배',
    other: '{n}분 동안 수익 두 배',
  },
  doubleNote: '선택 사항. 탭할 때만 짧은 광고가 나와요.',
  active: '적용 중 · {time} 남음',
  addMinutes: {
    one: '{n}분 추가 · 광고 보기',
    other: '{n}분 추가 · 광고 보기',
  },
  watchAd: '광고 보기',
  restore: '구매 복원',
} satisfies Shape<typeof en>;
