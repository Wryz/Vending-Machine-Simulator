// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/services';

export default {
  products: {
    removeAds: {
      title: '広告削除＋長めの休憩',
      detail: '広告オファーを非表示にし、オフライン上限を25%アップ。',
    },
    starterPack: {
      title: 'スターターパック',
      detail: 'バンの強化、スナック自販機2台、所持金$2,000。第1章クリア後に1回だけ販売。',
    },
    wrapNight: {
      title: 'ナイトシフト・ラッピング',
      detail: 'ダークで落ち着いたラッピング。見た目のみ。',
    },
    wrapLinen: {
      title: 'リネン・ラッピング',
      detail: 'あたたかみのあるオフホワイト。見た目のみ。',
    },
    lightingWarm: {
      title: '暖色ライトパック',
      detail: '夜の商品照明をナトリウム灯の暖色に。見た目のみ。',
    },
  },
  errors: {
    storeUnavailable: 'このビルドではストアを利用できません。',
    productNotFound: '商品が見つかりません。',
    purchaseFailed: '購入に失敗しました。料金は請求されていません。',
    restoreFailed: '購入を復元できませんでした。',
  },
} satisfies Shape<typeof en>;
