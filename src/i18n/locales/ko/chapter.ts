// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/chapter';

export default {
  sales: '{have} / {goal}',
  machinesVan: { one: '자판기 {active}/{n} · 밴 ✓', other: '자판기 {active}/{n} · 밴 ✓' },
  machinesNoVan: {
    one: '자판기 {active}/{n} · 밴 구매',
    other: '자판기 {active}/{n} · 밴 구매',
  },
  machinesDriver: {
    one: '자판기 {active}/{n} · 기사 {drivers}/1',
    other: '자판기 {active}/{n} · 기사 {drivers}/1',
  },
  machinesDrivers: {
    one: '자판기 {active}/{n} · 기사 {drivers}/3',
    other: '자판기 {active}/{n} · 기사 {drivers}/3',
  },
  share: '시장 점유율 {pct}% (목표 50%)',
  countries: '{have}/{n}개국 · {sales} / {goal}',
  continents: '{have}/{n}개 대륙 · {sales} / {goal}',
  done: '도시를 장악했어요.',
} satisfies Shape<typeof en>;
