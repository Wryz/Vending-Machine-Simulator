// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  streetCorner: 'Coin de rue',
  district: 'Quartier {n}',
  venueLine: '{category} · {distance}',
  perHour: 'par heure',
  perDay: 'par jour',
  yours: '{type} (à toi)',
  districtLocked: 'Ce quartier se débloque dans un prochain chapitre.',
  placeMine: 'Installer mon distributeur ici',
  placeType: 'Installer {type}',
  nearby: 'À proximité',
  noNearby: 'Aucun lieu nommé à moins de 400 m.',
  placeLine: '{category} · {distance}',
  host: 'Hôte',
  use: 'Choisir',
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
