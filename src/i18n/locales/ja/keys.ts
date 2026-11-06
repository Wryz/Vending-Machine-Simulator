// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/keys';

export default {
  title: 'キーリング',
  noBusiness: '開いているビジネスがありません。',
  subtitle: '設置 {placed} · 保管 {stored}',
  placed: '設置中',
  nonePlaced: 'まだ設置していません。',
  inStorage: '倉庫保管中',
  readyToPlace: '設置できます',
  place: '設置',
  cashSeen: '{amount} · {ago}前',
  a11y: {
    placeHint: 'この{machine}を置くスポットをマップで選ぶ',
  },
} satisfies Shape<typeof en>;
