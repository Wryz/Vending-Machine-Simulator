// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/notify';

export default {
  machineEmpty: {
    title: '자판기 품절',
    body: '{venue}의 {type}이(가) 모두 팔렸어요.',
  },
  cashFull: {
    title: '돈통 가득 참',
    body: '{venue}에서 수금하세요.',
  },
  event: {
    title: '근처에서 이벤트 시작',
    body: '{venue}에서 {event}.',
  },
} satisfies Shape<typeof en>;
