// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/tabs';

export default {
  labels: {
    map: 'Carte',
    keys: 'Clés',
    routes: 'Tournées',
    orders: 'Commandes',
    company: 'Société',
  },
  newTab: 'Nouveau : {label}',
  unlockNote: {
    keys: 'Tous tes distributeurs sur un trousseau',
    routes: 'Planifie tes tournées de réassort en camionnette',
    orders: 'Les commandes du jour rapportent des bonus',
    company: 'Ton chapitre, ton argent, tes améliorations et la boutique',
  },
} satisfies Shape<typeof en>;
