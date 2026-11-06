// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/money';

export default {
  a11y: {
    panel:
      'Dinero {cash}. Capítulo {n}, {title}: {progress}. Hoy {today} en ventas, {waiting} esperando en tus máquinas.',
    cash: 'Dinero {amount}',
    /** Appended when Double Profits is owned. */
    doubleProfits: 'Ganancias dobles activas: cada venta paga el doble.',
  },
} satisfies Shape<typeof en>;
