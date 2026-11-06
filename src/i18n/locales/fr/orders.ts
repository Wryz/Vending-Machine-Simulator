// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/orders';

export default {
  title: 'Commandes',
  streakLabel: 'Série en jours',
  streakValue: { one: '{n} jour', other: '{n} jours' },
  streakBonusLabel:
    'Termine les trois pour un bonus de série, multiplié par la série, jusqu’à {cap}. Rate un jour et tout recommence.',
  streakBonusValue: '{amount} × série',
  empty: 'De nouvelles commandes arrivent avec le jour.',
  progress: '{have} / {target}',
  claimed: 'Récupérée',
  done: 'Fait',
  claim: 'Récupérer',
  streakToast: {
    title: 'Série de {n} jours',
    subtitle: 'Toutes les commandes du jour sont faites.',
  },
  trophies: 'Trophées {got}/{total}',
  a11y: {
    trophyUnlocked: '{title} : {desc}, débloqué',
    trophyLocked: '{title} : {desc}, verrouillé',
  },
} satisfies Shape<typeof en>;
