// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/notify';

export default {
  machineEmpty: {
    title: 'Automat leer',
    body: '{type} bei {venue} ist ausverkauft.',
  },
  cashFull: {
    title: 'Kasse voll',
    body: 'Kassiere bei {venue}.',
  },
  event: {
    title: 'Event in der Nähe beginnt',
    body: '{event} bei {venue}.',
  },
} satisfies Shape<typeof en>;
