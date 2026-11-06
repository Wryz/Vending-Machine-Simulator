// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/keys';

export default {
  title: '钥匙串',
  noBusiness: '还没有开张的生意。',
  subtitle: '已放置 {placed} · 库存 {stored}',
  placed: '已放置',
  nonePlaced: '还没有放置售货机。',
  inStorage: '库存中',
  readyToPlace: '待放置',
  place: '放置',
  cashSeen: '{amount} · {ago}前',
  a11y: {
    placeHint: '在地图上为这台{machine}选个位置',
  },
} satisfies Shape<typeof en>;
