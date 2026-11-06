// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/notify';

export default {
  machineEmpty: {
    title: 'Máquina vacía',
    body: 'Tu {type} en {venue} se agotó.',
  },
  cashFull: {
    title: 'Caja llena',
    body: 'Recoge el dinero en {venue}.',
  },
  event: {
    title: 'Evento local cerca',
    body: '{event} en {venue}.',
  },
} satisfies Shape<typeof en>;
