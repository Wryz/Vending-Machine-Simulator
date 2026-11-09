// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/report';

export default {
  title: 'Pendant ton absence…',
  awayFor: 'Tu étais absent {time}',
  inMachines: 'En attente dans tes distributeurs',
  collect: 'Récupérer {amount}',
  collected: '{amount} récupérés',
  nothing: 'Rien à signaler.',
  done: 'OK',
  soldMachine: 'Un distributeur vendu',
  aMachine: 'Un distributeur',
  more: '· et {n} de plus',
  line: {
    sales: 'Ventes',
    items: 'Articles vendus',
    venueCut: 'Part du lieu',
    costs: 'Coûts',
    driverRuns: 'Tournées',
    breakdowns: 'Pannes',
    thefts: 'Vols',
    spoiled: 'Articles périmés',
  },
  profit: 'Bénéfice',
  footerCapped: 'Plafond hors ligne atteint. {time} non compté.',
  footerThanks: 'Merci de votre visite.',
  bestSpots: 'Meilleurs coins',
  issue: {
    empty: 'Tombés à vide',
    cashFull: 'Caisse pleine',
    contractsLost: 'Contrats perdus',
    events: 'Événements locaux',
    chapters: 'Chapitres terminés',
  },
  chapterLine: '{n}. {title}',
  lostNote:
    'Les distributeurs des contrats perdus sont de retour en stock. Installe-les depuis le trousseau.',
  double: 'Double-le · regarde une pub (+{amount})',
  doubleHint: 'Facultatif. Une courte pub, puis le même montant est ajouté encore une fois.',
  noReward: 'Pas de récompense cette fois.',
  added: '{amount} ajouté',
} satisfies Shape<typeof en>;
