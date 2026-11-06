// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/format';

export default {
  meters: '{n} m',
  km: '{n} km',
  min: '{n} min',
  hoursMin: '{h} h {m} min',
  daysHours: '{d} j {h} h',
} satisfies Shape<typeof en>;
