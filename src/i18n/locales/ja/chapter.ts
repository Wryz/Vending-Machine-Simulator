// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/chapter';

export default {
  sales: '{have} / {goal}',
  machinesVan: { one: '自販機 {active}/{n} · バン ✓', other: '自販機 {active}/{n} · バン ✓' },
  machinesNoVan: {
    one: '自販機 {active}/{n} · バンを購入',
    other: '自販機 {active}/{n} · バンを購入',
  },
  machinesDriver: {
    one: '自販機 {active}/{n} · ドライバー {drivers}/1',
    other: '自販機 {active}/{n} · ドライバー {drivers}/1',
  },
  machinesDrivers: {
    one: '自販機 {active}/{n} · ドライバー {drivers}/3',
    other: '自販機 {active}/{n} · ドライバー {drivers}/3',
  },
  share: '市場シェア {pct}%（目標50%）',
  countries: '{have}/{n}か国・{sales} / {goal}',
  continents: '{have}/{n}大陸・{sales} / {goal}',
  done: '街はあなたのものです。',
} satisfies Shape<typeof en>;
