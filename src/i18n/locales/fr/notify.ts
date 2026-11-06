// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/notify';

export default {
  machineEmpty: {
    title: 'Distributeur vide',
    body: 'Ton distributeur {type} à {venue} est en rupture.',
  },
  cashFull: {
    title: 'Caisse pleine',
    body: 'Viens encaisser à {venue}.',
  },
  event: {
    title: 'Événement local tout près',
    body: '{event} à {venue}.',
  },
} satisfies Shape<typeof en>;
