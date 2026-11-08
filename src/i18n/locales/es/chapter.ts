// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/chapter';

export default {
  sales: '{have} de {goal}',
  machinesVan: {
    one: '{active}/{n} máquina · camioneta ✓',
    other: '{active}/{n} máquinas · camioneta ✓',
  },
  machinesNoVan: {
    one: '{active}/{n} máquina · compra camioneta',
    other: '{active}/{n} máquinas · compra camioneta',
  },
  machinesDriver: {
    one: '{active}/{n} máquina · {drivers}/1 repartidor',
    other: '{active}/{n} máquinas · {drivers}/1 repartidor',
  },
  machinesDrivers: {
    one: '{active}/{n} máquina · {drivers}/3 repartidores',
    other: '{active}/{n} máquinas · {drivers}/3 repartidores',
  },
  share: '{pct}% del mercado (meta 50%)',
  countries: '{have}/{n} países · {sales} de {goal}',
  continents: '{have}/{n} continentes · {sales} de {goal}',
  done: 'La ciudad es tuya.',
} satisfies Shape<typeof en>;
