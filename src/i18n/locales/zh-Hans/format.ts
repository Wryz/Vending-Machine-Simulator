// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/format';

export default {
  meters: '{n} 米',
  km: '{n} 公里',
  min: '{n} 分钟',
  hoursMin: '{h} 小时 {m} 分',
  daysHours: '{d} 天 {h} 小时',
} satisfies Shape<typeof en>;
