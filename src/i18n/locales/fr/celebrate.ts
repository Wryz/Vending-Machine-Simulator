// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/celebrate';

export default {
  kind: {
    chapter: 'Chapitre terminé',
    trophy: 'Trophée',
    order: 'Commande terminée',
    streak: 'Toutes les commandes faites',
    event: 'Bientôt dans le coin',
    info: 'Note',
    research: 'Recherche terminée',
  },
  modal: {
    title: 'Bonnes nouvelles',
    claim: 'Récupérer {amount}',
    ok: 'OK',
    waiting: 'Des récompenses t\'attendent.',
  },
  a11y: '{label} : {title}. Touche pour fermer.',
  moment: {
    chapterTitle: '{n}. {title}',
    next: 'Suite : {goal}',
    unlocked: 'Débloqué : {unlock}',
    eventTitle: '{event} à {place}',
    startsMin: 'Dans {n} min',
    startsHours: 'Dans {n} h',
    orderReady: 'Commande à récupérer',
  },
} satisfies Shape<typeof en>;
