// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spot';

export default {
  streetCorner: 'Coin de rue',
  ratingA11y: '{n} sur 5',
  district: 'Quartier {n}',
  venueLine: '{category} · {distance} · Quartier {n}',
  section: {
    machine: 'Distributeur',
    why: 'Pourquoi',
    nearby: 'Lieux proches',
  },
  owned: '{name} (à toi)',
  stat: {
    now: 'Clients maintenant',
    day: 'Par jour ouvré',
    sales: 'Ventes est./jour',
  },
  perHour: '{n}/h',
  best: 'Idéal : {list}',
  theft: 'Risque de vol : {risk}',
  risk: {
    low: 'faible',
    medium: 'moyen',
    high: 'élevé',
  },
  competitors: 'Concurrents : {n}',
  commission: 'Commission ~{pct}',
  noNearby: 'Aucun lieu nommé à moins de 400 m.',
  host: 'Hôte',
  use: 'Choisir',
  report: 'Signaler',
  disclaimer: 'Lieux issus de données cartographiques ouvertes. Aucune affiliation ni approbation.',
  districtLocked: 'Ce quartier se débloque dans un prochain chapitre.',
  placeMine: 'Installer mon distributeur ici',
  placeType: 'Installer {type} ici',
  reportAlert: {
    title: 'Signaler ce lieu ?',
    body: '{name} sera masqué dans ton jeu.',
    cancel: 'Annuler',
    hide: 'Masquer',
  },
} satisfies Shape<typeof en>;
