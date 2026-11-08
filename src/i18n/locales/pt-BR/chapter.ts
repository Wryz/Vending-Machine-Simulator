// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/chapter';

export default {
  sales: '{have} de {goal}',
  machinesVan: { one: '{active}/{n} máquina · van ✓', other: '{active}/{n} máquinas · van ✓' },
  machinesNoVan: {
    one: '{active}/{n} máquina · compre uma van',
    other: '{active}/{n} máquinas · compre uma van',
  },
  machinesDriver: {
    one: '{active}/{n} máquina · {drivers}/1 motorista',
    other: '{active}/{n} máquinas · {drivers}/1 motorista',
  },
  machinesDrivers: {
    one: '{active}/{n} máquina · {drivers}/3 motoristas',
    other: '{active}/{n} máquinas · {drivers}/3 motoristas',
  },
  share: '{pct}% do mercado (meta 50%)',
  countries: '{have}/{n} países · {sales} de {goal}',
  continents: '{have}/{n} continentes · {sales} de {goal}',
  done: 'A cidade é sua.',
} satisfies Shape<typeof en>;
