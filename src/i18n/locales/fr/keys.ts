// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/keys';

export default {
  title: 'Trousseau',
  noBusiness: 'Aucune entreprise ouverte.',
  subtitle: '{placed} installés · {stored} en stock',
  placed: 'Installés',
  nonePlaced: 'Aucun installé pour l’instant.',
  inStorage: 'En stock',
  readyToPlace: 'Prêt à installer',
  place: 'Installer',
  cashSeen: '{amount} · il y a {ago}',
  a11y: {
    placeHint: 'Choisis un emplacement sur la carte pour ce distributeur {machine}',
  },
} satisfies Shape<typeof en>;
