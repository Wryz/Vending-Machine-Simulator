// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Installe ton premier distributeur',
      line: 'Touche une rue animée. La touche flamme montre où les gens passent.',
    },
    stock: {
      title: 'Remplis-le',
      line: 'Touche ton distributeur, puis Remplir et Réappro.',
    },
    wait: {
      title: 'Attends les clients',
      line: 'Zoome pour voir les gens venir acheter.',
    },
    collect: {
      title: 'Encaisse ta recette',
      line: 'Touche ton distributeur et vide la caisse.',
    },
    goal: {
      title: 'Ton premier objectif',
      line: 'Fais {amount} de ventes pour finir le chapitre 1. La jauge en haut te suit.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Compris',
    close: 'Fermer le tutoriel',
  },
} satisfies Shape<typeof en>;
