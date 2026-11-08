// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/chapter';

export default {
  sales: '{have} / {goal}',
  machinesVan: { one: '{active}/{n} 台售货机 · 货车 ✓', other: '{active}/{n} 台售货机 · 货车 ✓' },
  machinesNoVan: {
    one: '{active}/{n} 台售货机 · 买辆货车',
    other: '{active}/{n} 台售货机 · 买辆货车',
  },
  machinesDriver: {
    one: '{active}/{n} 台售货机 · {drivers}/1 名司机',
    other: '{active}/{n} 台售货机 · {drivers}/1 名司机',
  },
  machinesDrivers: {
    one: '{active}/{n} 台售货机 · {drivers}/3 名司机',
    other: '{active}/{n} 台售货机 · {drivers}/3 名司机',
  },
  share: '市场份额 {pct}%（目标 50%）',
  countries: '{have}/{n} 个国家 · {sales} / {goal}',
  continents: '{have}/{n} 个大洲 · {sales} / {goal}',
  done: '全城都是你的了。',
} satisfies Shape<typeof en>;
