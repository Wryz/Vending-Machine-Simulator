// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/format';

export default {
  meters: '{n}m',
  km: '{n}km',
  min: '{n}分',
  hoursMin: '{h}時間{m}分',
  daysHours: '{d}日{h}時間',
} satisfies Shape<typeof en>;
