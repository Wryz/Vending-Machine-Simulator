// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/orders';

export default {
  title: 'Aufträge',
  streakLabel: 'Serie in Tagen',
  streakValue: { one: '{n} Tag', other: '{n} Tage' },
  streakBonusLabel:
    'Erledige alle drei für einen Serienbonus mal Serienlänge, bis zu {cap}. Verpasst du einen Tag, beginnt sie neu.',
  streakBonusValue: '{amount} × Serie',
  empty: 'Neue Aufträge kommen mit dem neuen Tag.',
  progress: '{have} / {target}',
  claimed: 'Abgeholt',
  done: 'Fertig',
  claim: 'Abholen',
  streakToast: {
    title: 'Serie: Tag {n}',
    subtitle: 'Alle heutigen Aufträge sind erledigt.',
  },
  trophies: 'Trophäen {got}/{total}',
  a11y: {
    trophyUnlocked: '{title}: {desc}, freigeschaltet',
    trophyLocked: '{title}: {desc}, gesperrt',
  },
} satisfies Shape<typeof en>;
