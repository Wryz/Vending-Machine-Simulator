// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/money';

export default {
  a11y: {
    panel:
      'Bargeld {cash}. Kapitel {n}, {title}: {progress}. Heute {today} Umsatz, {waiting} warten in deinen Automaten.',
    cash: 'Bargeld {amount}',
    /** Appended when Double Profits is owned. */
    doubleProfits: 'Doppelter Gewinn aktiv: Jeder Verkauf bringt das Doppelte.',
  },
} satisfies Shape<typeof en>;
