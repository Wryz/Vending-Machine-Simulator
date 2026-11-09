// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/report';

export default {
  title: 'Während du weg warst …',
  awayFor: 'Du warst {time} weg',
  inMachines: 'In deinen Automaten',
  collect: '{amount} einsammeln',
  collected: '{amount} eingesammelt',
  nothing: 'Nichts Neues.',
  done: 'Fertig',
  soldMachine: 'Ein verkaufter Automat',
  aMachine: 'Ein Automat',
  more: '· und {n} weitere',
  line: {
    sales: 'Umsatz',
    items: 'Verkauft',
    venueCut: 'Anteil Standort',
    costs: 'Kosten',
    driverRuns: 'Fahrten',
    breakdowns: 'Pannen',
    thefts: 'Diebstähle',
    spoiled: 'Verdorben',
  },
  profit: 'Gewinn',
  footerCapped: 'Offline-Limit erreicht. {time} nicht gezählt.',
  footerThanks: 'Danke für deinen Einkauf.',
  bestSpots: 'Top-Standorte',
  issue: {
    empty: 'Leer gelaufen',
    cashFull: 'Kasse voll',
    contractsLost: 'Verlorene Verträge',
    events: 'Lokale Events',
    chapters: 'Kapitel geschafft',
  },
  chapterLine: '{n}. {title}',
  lostNote:
    'Automaten aus verlorenen Verträgen sind zurück im Lager. Stell sie über den Schlüsselbund auf.',
  double: 'Verdoppeln · Werbung ansehen (+{amount})',
  doubleHint: 'Freiwillig. Zeigt kurz Werbung und gibt dir denselben Betrag noch einmal.',
  noReward: 'Diesmal keine Belohnung.',
  added: '{amount} gutgeschrieben',
} satisfies Shape<typeof en>;
