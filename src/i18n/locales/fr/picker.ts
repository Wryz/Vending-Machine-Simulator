// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/picker';

export default {
  title: 'Où aller ?',
  subtitle: 'Fais tourner le globe ou choisis une ville',
  locate: 'Utiliser ma position',
  locateHint: 'Approximative, demandée une fois, jamais stockée',
  here: 'Ici',
  km: '{n} km',
  nearYou: 'Près de toi',
  bigCities: 'Grandes villes',
  saved: 'Sauvegardée',
  playing: 'En cours',
  start: 'Commencer à {city}',
  go: 'Aller à {city}',
  sell: 'Vendre et recommencer à {city}',
  youreHere: 'Tu joues ici',
  none: 'Pas encore de ville ici',
  nearest: 'La plus proche : {city}, {km}',
  flyNearest: 'Voir {city}',
  opening: 'Ouverture de {city}…',
  offline: 'Connecte-toi une fois à internet pour télécharger {city}.',
  failed: 'Impossible d’ouvrir {city}. Réessaie.',
  district: '{city} · {dir}',
  dir: {
    n: 'Nord',
    ne: 'Nord-Est',
    e: 'Est',
    se: 'Sud-Est',
    s: 'Sud',
    sw: 'Sud-Ouest',
    w: 'Ouest',
    nw: 'Nord-Ouest',
  },
  a11y: {
    card: '{city}, {km}',
    globe: 'Globe. Fais glisser pour tourner, pince pour zoomer.',
  },
} satisfies Shape<typeof en>;
