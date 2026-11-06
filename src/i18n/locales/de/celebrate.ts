// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/celebrate';

export default {
  kind: {
    chapter: 'Kapitel geschafft',
    trophy: 'Trophäe',
    order: 'Auftrag erledigt',
    streak: 'Alle Aufträge erledigt',
    event: 'Bald in der Nähe',
    info: 'Hinweis',
  },
  a11y: '{label}: {title}. Tippen zum Schließen.',
  moment: {
    chapterTitle: '{n}. {title}',
    next: 'Als Nächstes: {goal}',
    unlocked: 'Freigeschaltet: {unlock}',
    eventTitle: '{event} bei {place}',
    startsMin: 'Beginnt in {n} min',
    startsHours: 'Beginnt in {n} h',
    orderReady: 'Belohnung abholbereit',
  },
} satisfies Shape<typeof en>;
