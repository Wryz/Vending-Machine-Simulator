// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/notify';

export default {
  machineEmpty: {
    title: '自販機が売り切れ',
    body: '{venue}の{type}が売り切れました。',
  },
  cashFull: {
    title: '金庫がいっぱい',
    body: '{venue}で売上を回収しましょう。',
  },
  event: {
    title: '近くでイベント開始',
    body: '{venue}で{event}。',
  },
} satisfies Shape<typeof en>;
