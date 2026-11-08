// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  streetCorner: 'Straßenecke',
  district: 'Bezirk {n}',
  venueLine: '{category} · {distance}',
  perHour: 'pro Stunde',
  perDay: 'pro Tag',
  yours: '{type} (deiner)',
  districtLocked: 'Dieser Bezirk wird in einem späteren Kapitel freigeschaltet.',
  placeMine: 'Meinen Automaten hier aufstellen',
  placeType: '{type} aufstellen',
  nearby: 'In der Nähe',
  noNearby: 'Keine benannten Orte im Umkreis von 400 m.',
  placeLine: '{category} · {distance}',
  host: 'Partner',
  use: 'Wählen',
  report: 'Melden',
  attribution: 'Orte aus offenen Kartendaten. Keine Verbindung oder Empfehlung.',
  about: 'Über diese Gegend',
  passing: 'Passanten / Std.',
  residents: 'Anwohner',
  vending: 'Automaten in der Nähe: {yours} deine · {rival} Rivale · {stores} Läden',
  night: {
    low: 'Nachts belebt: sicher für Automaten',
    medium: 'Nachts ruhig',
    high: 'Nachts verlassen: mehr Vandalismus',
  },
  a11y: {
    passing: '{n} Passanten pro Stunde',
    residents: '{n} Anwohner',
    customers: '{n} Kunden pro Stunde',
    sales: '{amount} Umsatz pro Tag',
  },
  reportAlert: {
    title: 'Ort melden?',
    body: '{name} wird in deinem Spiel ausgeblendet.',
    cancel: 'Abbrechen',
    confirm: 'Ausblenden',
  },
} satisfies Shape<typeof en>;
