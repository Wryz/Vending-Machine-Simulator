// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spot';

export default {
  streetCorner: 'Straßenecke',
  ratingA11y: '{n} von 5',
  district: 'Bezirk {n}',
  venueLine: '{category} · {distance} · Bezirk {n}',
  section: {
    machine: 'Automat',
    why: 'Warum',
    nearby: 'Orte in der Nähe',
  },
  owned: '{name} (deiner)',
  stat: {
    now: 'Kunden jetzt',
    day: 'Pro Geschäftstag',
    sales: 'Umsatz/Tag ca.',
  },
  perHour: '{n}/h',
  best: 'Top: {list}',
  theft: 'Diebstahl: {risk}',
  risk: {
    low: 'gering',
    medium: 'mittel',
    high: 'hoch',
  },
  competitors: 'Konkurrenz: {n}',
  commission: 'Provision ~{pct}',
  noNearby: 'Keine benannten Orte im Umkreis von 400 m.',
  host: 'Partner',
  use: 'Wählen',
  report: 'Melden',
  disclaimer: 'Orte stammen aus offenen Kartendaten. Keine Verbindung oder Empfehlung.',
  districtLocked: 'Dieser Bezirk wird in einem späteren Kapitel freigeschaltet.',
  placeMine: 'Meinen Automaten hier aufstellen',
  placeType: '{type} hier aufstellen',
  reportAlert: {
    title: 'Ort melden?',
    body: '{name} wird in deinem Spiel ausgeblendet.',
    cancel: 'Abbrechen',
    hide: 'Ausblenden',
  },
} satisfies Shape<typeof en>;
