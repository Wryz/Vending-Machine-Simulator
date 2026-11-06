// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/shop';

export default {
  title: 'Boutique',
  subtitle: 'Achats uniques. Pas d’abonnement.',
  products: {
    removeAds: {
      title: 'Sans pubs + pauses plus longues',
      detail: 'Masque les offres de pub et augmente le plafond hors ligne de 25 %.',
    },
    starterPack: {
      title: 'Pack de départ',
      detail:
        'Camionnette améliorée, deux distributeurs de snacks et $2,000. Proposé une seule fois après le chapitre 1.',
    },
    wrapNight: {
      title: 'Habillage Équipe de nuit',
      detail: 'Un habillage sombre et discret. Cosmétique.',
    },
    wrapLinen: {
      title: 'Habillage Lin',
      detail: 'Habillage blanc cassé chaleureux. Cosmétique.',
    },
    lightingWarm: {
      title: 'Pack éclairage chaud',
      detail: 'Éclairage chaud façon lampadaire la nuit. Cosmétique.',
    },
  },
  owned: 'Acheté',
  buy: 'Acheter · {price}',
  starterAdded: 'Pack de départ ajouté. Deux distributeurs de snacks sont en stock.',
  starterPending: 'Achat enregistré. Ouvre une ville pour recevoir le Pack de départ.',
  yours: '{title} est à toi.',
  restored: 'Achats restaurés.',
  restoreFailed: 'Impossible de restaurer les achats.',
  noReward: 'Pas de récompense cette fois.',
  doubled: {
    one: 'Gains doublés pendant {n} minute.',
    other: 'Gains doublés pendant {n} minutes.',
  },
  noStore: 'La boutique n’est pas disponible dans cette version.',
  noStoreBody: 'Tout dans le jeu peut se gagner en jouant.',
  section: {
    purchases: 'Achats',
    looks: 'Style',
    rewards: 'Récompenses gratuites',
  },
  looksNote:
    'Applique habillages et éclairages depuis la vue rapprochée d’un distributeur. Purement cosmétique.',
  doubleTitle: {
    one: 'Gains doublés pendant {n} minute',
    other: 'Gains doublés pendant {n} minutes',
  },
  doubleNote: 'Facultatif. Une courte pub ne se lance que si tu touches.',
  active: 'Actif · encore {time}',
  addMinutes: {
    one: '+{n} minute · regarde une pub',
    other: '+{n} minutes · regarde une pub',
  },
  watchAd: 'Regarder une pub',
  restore: 'Restaurer les achats',
} satisfies Shape<typeof en>;
