// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/services';

export default {
  products: {
    removeAds: {
      title: '去广告 + 更长离线',
      detail: '隐藏广告奖励选项，离线上限提高 25%。',
    },
    starterPack: {
      title: '新手礼包',
      detail: '货车升级、两台零食机和 {amount} 现金。第 1 章后限购一次。',
    },
    doubleProfits: {
      title: '双倍利润',
      detail: '每笔销售永久翻倍。',
    },
  },
  errors: {
    storeUnavailable: '此版本无法使用商店。',
    productNotFound: '找不到商品。',
    purchaseFailed: '购买失败。未产生扣费。',
    restoreFailed: '无法恢复购买。',
  },
} satisfies Shape<typeof en>;
