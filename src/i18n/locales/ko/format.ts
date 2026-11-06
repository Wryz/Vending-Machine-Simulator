// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/format';

export default {
  meters: '{n} m',
  km: '{n} km',
  min: '{n}분',
  hoursMin: '{h}시간 {m}분',
  daysHours: '{d}일 {h}시간',
} satisfies Shape<typeof en>;
