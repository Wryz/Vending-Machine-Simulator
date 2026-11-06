// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/services';

export default {
  products: {
    removeAds: {
      title: '광고 제거 + 더 긴 휴식',
      detail: '광고 제안을 숨기고 오프라인 한도를 25% 늘려요.',
    },
    starterPack: {
      title: '스타터 팩',
      detail: '밴 업그레이드, 스낵 자판기 2대, 현금 {amount}. 챕터 1 이후 한 번만 제공.',
    },
    doubleProfits: {
      title: '수익 2배',
      detail: '모든 판매 수익이 영구히 2배.',
    },
  },
  errors: {
    storeUnavailable: '이 빌드에서는 상점을 쓸 수 없어요.',
    productNotFound: '상품을 찾을 수 없어요.',
    purchaseFailed: '구매에 실패했어요. 결제되지 않았어요.',
    restoreFailed: '구매를 복원할 수 없어요.',
  },
} satisfies Shape<typeof en>;
