// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/services';

export default {
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
  errors: {
    storeUnavailable: 'La boutique n’est pas disponible dans cette version.',
    productNotFound: 'Produit introuvable.',
    purchaseFailed: 'Échec de l’achat. Tu n’as pas été débité.',
    restoreFailed: 'Impossible de restaurer les achats.',
  },
} satisfies Shape<typeof en>;
