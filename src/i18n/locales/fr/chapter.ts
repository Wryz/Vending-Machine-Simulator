// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/chapter';

export default {
  sales: '{have} sur {goal}',
  machinesVan: {
    one: '{active}/{n} distributeur · camionnette ✓',
    other: '{active}/{n} distributeurs · camionnette ✓',
  },
  machinesNoVan: {
    one: '{active}/{n} distributeur · achète une camionnette',
    other: '{active}/{n} distributeurs · achète une camionnette',
  },
  machinesDriver: {
    one: '{active}/{n} distributeur · {drivers}/1 chauffeur',
    other: '{active}/{n} distributeurs · {drivers}/1 chauffeur',
  },
  machinesDrivers: {
    one: '{active}/{n} distributeur · {drivers}/3 chauffeurs',
    other: '{active}/{n} distributeurs · {drivers}/3 chauffeurs',
  },
  share: '{pct} % du marché (objectif 50 %)',
  countries: '{have}/{n} pays · {sales} sur {goal}',
  continents: '{have}/{n} continents · {sales} sur {goal}',
  done: 'La ville est à toi.',
} satisfies Shape<typeof en>;
