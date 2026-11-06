// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/objects';

export default {
  coinTray: {
    empty: 'La caja está vacía',
    box: 'Caja',
    venue: 'Local',
    youKeep: 'Para ti',
    a11y: {
      collected: 'Recogiste {amount}',
      summary: 'Caja {gross}, comisión del local {commission}, para ti {net}',
    },
  },
  contract: {
    header: 'CONTRATO DE UBICACIÓN',
    noCash: 'No tienes dinero suficiente para firmar',
    swipe: 'Desliza para firmar →',
    a11y: {
      line: 'Línea de firma. Desliza para firmar.',
      sign: 'Firmar',
    },
  },
  keyTag: {
    a11y: '{name} en {place}, {status}',
  },
  status: {
    ok: 'Funcionando',
    low: 'Poco stock',
    empty: 'Vacía',
    cashFull: 'Caja llena',
    broken: 'Averiada',
    stored: 'En depósito',
    unknown: 'Sin telemetría',
  },
  permit: {
    office: 'OFICINA MUNICIPAL DE LICENCIAS',
    valid: 'VÁLIDO',
    notHeld: 'SIN PERMISO',
  },
  sparkline: {
    a11y: 'Clientes por hora',
  },
} satisfies Shape<typeof en>;
