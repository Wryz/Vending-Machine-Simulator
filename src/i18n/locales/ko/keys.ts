// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/keys';

export default {
  title: '열쇠고리',
  noBusiness: '운영 중인 사업이 없어요.',
  subtitle: '설치 {placed} · 보관 {stored}',
  placed: '설치됨',
  nonePlaced: '아직 설치한 자판기가 없어요.',
  inStorage: '보관 중',
  readyToPlace: '설치 가능',
  place: '설치',
  cashSeen: '{amount} · {ago} 전',
  a11y: {
    placeHint: '이 {machine}을(를) 설치할 자리를 지도에서 고르세요',
  },
} satisfies Shape<typeof en>;
