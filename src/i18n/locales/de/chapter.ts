// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/chapter';

export default {
  sales: '{have} von {goal}',
  machinesVan: { one: '{active}/{n} Automat · Van ✓', other: '{active}/{n} Automaten · Van ✓' },
  machinesNoVan: {
    one: '{active}/{n} Automat · kauf einen Van',
    other: '{active}/{n} Automaten · kauf einen Van',
  },
  machinesDriver: {
    one: '{active}/{n} Automat · {drivers}/1 Fahrer',
    other: '{active}/{n} Automaten · {drivers}/1 Fahrer',
  },
  machinesDrivers: {
    one: '{active}/{n} Automat · {drivers}/3 Fahrer',
    other: '{active}/{n} Automaten · {drivers}/3 Fahrer',
  },
  share: '{pct} % Marktanteil (Ziel 50 %)',
  done: 'Die Stadt gehört dir.',
} satisfies Shape<typeof en>;
