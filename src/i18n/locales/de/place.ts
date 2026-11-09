// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  section: {
    term: 'Laufzeit',
    exclusivity: 'Exklusivität',
  },
  days: { one: '{n} Tag', other: '{n} Tage' },
  permanent: 'Unbefristet',
  permanentNote: 'Dein erster Automat bleibt hier für immer: keine Laufzeit, keine Verlängerung.',
  termChip: '{days} · {pct}',
  termNote:
    'Geschäftstage. Längere Laufzeiten senken die Provision. Verträge verlängern sich, solange der Standort zufrieden ist.',
  exclusive: 'Brightvend aus diesem Block fernhalten (+{pct} Provision)',
  exclusiveA11y: 'Exklusivvertrag',
  contract: {
    machine: 'Automat',
    commission: 'Provision an Standort',
    term: 'Laufzeit',
    exclusive: 'Exklusiv',
    yes: 'Ja',
    no: 'Nein',
    price: 'Automatenpreis',
    install: 'Aufbau',
  },
  disclaimer: 'Orte stammen aus offenen Kartendaten. Keine Verbindung oder Empfehlung.',
  total: 'Heute gesamt',
} satisfies Shape<typeof en>;
