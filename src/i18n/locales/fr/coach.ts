// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Installe ton premier distributeur',
      line: 'Les rues animées vendent plus. La touche flamme te les montre, ou laisse-nous choisir un endroit.',
      action: 'Montre-moi un bon endroit',
      actionHint: 'Trouve un endroit animé tout près et ouvre sa fiche',
    },
    stock: {
      title: 'Remplis-le de snacks',
      line: 'Ton distributeur est vide. Ouvre-le et charge des snacks depuis ta camionnette.',
      action: 'Ouvrir mon distributeur',
      actionHint: 'Ouvre la fiche de ton distributeur',
    },
    delivery: {
      title: 'Ta camionnette arrive',
      /** {store} = a warehouse or wholesaler name from map data. */
      line: 'Elle apporte tes snacks depuis {store}. Regarde-la rouler jusqu’à ton distributeur !',
      lineDepot:
        'Elle apporte tes snacks depuis l’entrepôt. Regarde-la rouler jusqu’à ton distributeur !',
      action: 'Voir l’arrivée',
      actionHint: 'Zoome la carte sur ton distributeur',
    },
    wait: {
      title: 'Attends les clients',
      line: 'Les passants s’arrêtent pour acheter. Zoome pour les voir !',
      action: 'Voir mon distributeur',
      actionHint: 'Zoome la carte sur ton distributeur',
    },
    collect: {
      title: 'Encaisse tes pièces',
      line: 'Tu as fait une vente ! Ouvre ton distributeur et prends les pièces.',
      action: 'Ouvrir mon distributeur',
      actionHint: 'Ouvre la fiche de ton distributeur',
    },
    goal: {
      title: 'Ton premier objectif',
      line: 'Fais {amount} de ventes pour finir le chapitre 1. La jauge en haut te suit.',
    },
  },
  guide: {
    spotGood: 'Bon endroit ! Installe ton distributeur ici.',
    placeKey: 'Installer',
    spotQuiet: 'Peu de monde passe ici. Baisse ce panneau et essaie une rue plus animée.',
    sign: 'Descends et fais glisser ton doigt sur la ligne pour signer.',
    fill: 'Touche Remplir pour charger des snacks depuis ta camionnette.',
    restock:
      'Touche maintenant Remplir. Une camionnette apporte tout depuis l’entrepôt le plus proche.',
    onTheWay: 'Ta camionnette arrive. Ferme ceci et regarde-la venir.',
    wait: 'C’est prêt ! Ferme ceci et regarde les clients arriver.',
    collect: 'Touche Encaisser pour prendre tes pièces.',
  },
  tips: {
    keys: {
      title: 'Ton trousseau',
      line: 'Tous tes distributeurs sont ici. Touches-en un pour y aller.',
    },
    routes: {
      title: 'Ta camionnette et tes chauffeurs',
      line: 'Une plus grande camionnette réapprovisionne plus d’un coup. Plus tard, des chauffeurs font les tournées pour toi.',
    },
    orders: {
      title: 'Commandes du jour',
      line: 'Trois petites missions par jour pour un bonus. Termine les trois pour enchaîner une série.',
    },
    company: {
      title: 'Ton entreprise',
      line: 'Ton objectif de chapitre, l’argent qui entre et qui sort, et des améliorations pour tous tes distributeurs.',
    },
    rankings: {
      title: 'Meilleurs exploitants',
      line: 'Compare tes ventes avec les autres entreprises de distributeurs de la ville.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Compris',
    close: 'Fermer le tutoriel',
    step: 'Étape {n} sur {total}',
  },
} satisfies Shape<typeof en>;
