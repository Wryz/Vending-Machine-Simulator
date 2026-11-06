// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/notify';

export default {
  machineEmpty: {
    title: 'Máquina vazia',
    body: 'Sua {type} em {venue} esgotou.',
  },
  cashFull: {
    title: 'Cofre cheio',
    body: 'Colete o dinheiro em {venue}.',
  },
  event: {
    title: 'Evento local começando perto',
    body: '{event} em {venue}.',
  },
} satisfies Shape<typeof en>;
