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
      detail: '货车升级、两台零食机和 $2,000 现金。第 1 章后限购一次。',
    },
    wrapNight: {
      title: '夜班外观',
      detail: '低调深色的售货机外观。仅装饰。',
    },
    wrapLinen: {
      title: '亚麻外观',
      detail: '温暖的米白色外观。仅装饰。',
    },
    lightingWarm: {
      title: '暖光灯光包',
      detail: '夜间钠灯般的暖色商品照明。仅装饰。',
    },
  },
  errors: {
    storeUnavailable: '此版本无法使用商店。',
    productNotFound: '找不到商品。',
    purchaseFailed: '购买失败。未产生扣费。',
    restoreFailed: '无法恢复购买。',
  },
} satisfies Shape<typeof en>;
