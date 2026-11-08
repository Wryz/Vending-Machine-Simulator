// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/companyHub';

export default {
  section: {
    hintOpen: 'Masque cette section',
    hintClosed: 'Affiche cette section',
  },
  chapter: {
    requirements: 'Conditions pour passer au niveau suivant',
    toReach: 'Pour atteindre le chapitre {n}',
    rewards: 'Débloqué en finissant ce chapitre',
    last: 'Dernier chapitre : vendez l’entreprise quand vous voulez.',
    stepsHint: 'Touchez un numéro pour voir ce chapitre',
    stepHint: 'Affiche l’objectif et les déblocages de ce chapitre',
  },
  chapterSheet: {
    title: 'Chapitre {n}',
    done: 'Fini',
    current: 'En cours',
    locked: 'À venir',
    goal: 'Objectif',
    unlocks: 'Débloque',
    unlocked: 'Débloqué',
    close: 'Fermer',
  },
  finances: {
    cash: 'Trésorerie',
    cashDesc: 'Argent disponible',
    netToday: 'Net du jour',
    netTodayDesc: 'Entrées − sorties du jour',
    inToday: 'Entrées du jour',
    inTodayDesc: 'Ventes et primes',
    outToday: 'Sorties du jour',
    outTodayDesc: 'Stock, loyer, salaires…',
    netYesterday: 'Net d’hier',
    netYesterdayDesc: 'Journée entière',
    lifetimeSales: 'Ventes totales',
    lifetimeSalesDesc: 'Depuis le début',
    lifetimeCosts: 'Coûts totaux',
    lifetimeCostsDesc: 'Depuis le début',
    unitsSold: 'Articles vendus',
    unitsSoldDesc: 'Au total',
    breakdown: 'Aujourd’hui par catégorie',
    noActivity: 'Aucune activité aujourd’hui',
  },
  more: {
    research: 'Recherche',
    rankings: 'Classement ville',
    globalRanking: 'Classement mondial',
    prestige: 'Prestige',
    trophies: 'Trophées',
  },
  trophies: {
    title: 'Trophées',
    subtitle: '{got} sur {total} débloqués',
    waiting: 'Primes en attente',
    claim: 'Encaisser {amount}',
    claimed: '{amount} encaissé',
  },
} satisfies Shape<typeof en>;
