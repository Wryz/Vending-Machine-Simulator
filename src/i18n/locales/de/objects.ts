// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/objects';

export default {
  coinTray: {
    empty: 'Kasse ist leer',
    box: 'Kasse',
    venue: 'Ort',
    youKeep: 'Für dich',
    a11y: {
      collected: '{amount} kassiert',
      summary: 'Kasse {gross}, Standortprovision {commission}, für dich {net}',
    },
  },
  contract: {
    header: 'STANDORTVERTRAG',
    noCash: 'Nicht genug Geld zum Unterschreiben',
    swipe: 'Zum Unterschreiben wischen →',
    a11y: {
      line: 'Unterschriftszeile. Zum Unterschreiben wischen.',
      sign: 'Unterschreiben',
    },
  },
  keyTag: {
    a11y: '{name} bei {place}, {status}',
  },
  status: {
    ok: 'Läuft',
    low: 'Fast leer',
    empty: 'Leer',
    cashFull: 'Kasse voll',
    broken: 'Kaputt',
    stored: 'Im Lager',
    unknown: 'Keine Daten',
  },
  permit: {
    office: 'STÄDTISCHES LIZENZAMT',
    valid: 'GÜLTIG',
    notHeld: 'FEHLT',
  },
  sparkline: {
    a11y: 'Kunden pro Stunde',
  },
} satisfies Shape<typeof en>;
