// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  placeHere: 'Installer une machine ici',
  yourHost: 'Ton hôte',
  makeHost: 'Choisir comme hôte',
  hostExplain: 'Ta machine est chez son hôte : il amène ses clients et garde {pct} des ventes. Choisis un autre lieu proche avec Choisir comme hôte.',
  chooser: {
    title: 'Choisis une machine',
    perDay: 'Environ {amount} par jour ici',
    install: 'Installation {price}',
    chapter: 'Chapitre {n}',
    cancel: 'Annuler',
    a11yOwned: 'Installer ton {type}',
    a11yBuy: 'Acheter et installer {type} pour {price}',
    a11yLocked: '{type}, ouvre au chapitre {n}',
  },
  streetCorner: 'Coin de rue',
  district: 'Quartier {n}',
  venueLine: '{category} · {distance}',
  perHour: 'par heure',
  perDay: 'par jour',
  yours: '{type} (à toi)',
  districtLocked: 'Cette zone ouvre au chapitre {n}. Ta zone ouverte est entourée en orange.',
  hoodLocked: '{name} ouvre au chapitre {n}. Ta zone ouverte est entourée en orange.',
  placeMine: 'Installer mon distributeur ici',
  nearby: 'À proximité',
  noNearby: 'Aucun lieu nommé à moins de 400 m.',
  placeLine: '{category} · {distance}',
  report: 'Signaler',
  attribution:
    'Lieux issus de données cartographiques ouvertes. Aucune affiliation ni approbation.',
  about: 'À propos du quartier',
  passing: 'passants / h',
  residents: 'habitants',
  vending: 'Distributeurs proches : {yours} à vous · {rival} rival · {stores} boutiques',
  night: {
    low: 'Animé la nuit : sûr pour les machines',
    medium: 'Calme la nuit',
    high: 'Désert la nuit : plus de vandalisme',
  },
  a11y: {
    passing: '{n} passants par heure',
    residents: '{n} habitants',
    customers: '{n} clients par heure',
    sales: '{amount} de ventes par jour',
  },
  reportAlert: {
    title: 'Signaler ce lieu ?',
    body: '{name} sera masqué dans ton jeu.',
    cancel: 'Annuler',
    confirm: 'Masquer',
  },
} satisfies Shape<typeof en>;
