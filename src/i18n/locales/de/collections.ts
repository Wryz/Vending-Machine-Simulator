// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/collections';

export default {
  title: 'Sammlungen',
  noGame: 'Kein Geschäft geöffnet.',
  subtitle: { one: '{n} Figur gesammelt', other: '{n} Figuren gesammelt' },
  rarity: {
    common: 'Normal',
    uncommon: 'Besonders',
    rare: 'Selten',
    ultra: 'Ultra',
  },
  reveal: {
    a11y: 'Du hast {item} bekommen, {rarity}',
    a11yNew: 'Du hast {item} bekommen, {rarity}, neu',
    isNew: '{rarity} · Neu',
    duplicate: '{rarity} · Doppelt',
  },
  perkDone: 'Komplett. +{pct} Umsatz bei {family}.',
  perkGoal: 'Vervollständige das Set für +{pct} Umsatz bei {family}.',
  a11y: {
    owned: '{item}, {rarity}, {n} im Besitz',
    missing: 'Nummer {n}, noch nicht gefunden',
  },
  section: {
    pulls: 'Ziehen',
    odds: 'Chancen',
  },
  buyPull: 'Kapsel kaufen · {price}',
  locked:
    'Kapselkauf wird in Kapitel 3 (GmbH) freigeschaltet. Kapselautomaten können dir beim Leeren der Kasse trotzdem eine Gratiskapsel geben.',
  freePull: {
    one: 'Gratiskapsel · Werbung ansehen (heute noch {n})',
    other: 'Gratiskapsel · Werbung ansehen (heute noch {n})',
  },
  noFreePulls: 'Heute keine Gratiskapseln mehr',
  freePullHint: 'Freiwillig. Zeigt kurz Werbung und öffnet dann eine Kapsel.',
  capsuleDrop: 'Kapselautomaten geben beim Leeren der Kasse in {pct} der Fälle eine Gratiskapsel.',
  oddsNote:
    'Jede Kapsel bestimmt mit diesen Chancen eine Seltenheit, dann eine zufällige Figur dieser Seltenheit. Bezahlt wird nur mit Spielgeld.',
  noReward: 'Diesmal keine Belohnung.',
} satisfies Shape<typeof en>;
