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
    doubleProfits: {
      title: 'Profits doublés',
      detail: 'Chaque vente rapporte le double, pour toujours.',
    },
  },
  errors: {
    storeUnavailable: 'La boutique n’est pas disponible dans cette version.',
    productNotFound: 'Produit introuvable.',
    purchaseFailed: 'Échec de l’achat. Tu n’as pas été débité.',
    restoreFailed: 'Impossible de restaurer les achats.',
  },
} satisfies Shape<typeof en>;
