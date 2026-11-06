// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/collections';

export default {
  title: 'Collections',
  noGame: 'Aucune entreprise ouverte.',
  subtitle: { one: '{n} objet collecté', other: '{n} objets collectés' },
  rarity: {
    common: 'Commun',
    uncommon: 'Peu commun',
    rare: 'Rare',
    ultra: 'Ultra',
  },
  reveal: {
    a11y: 'Tu as eu {item}, {rarity}',
    a11yNew: 'Tu as eu {item}, {rarity}, nouveau',
    isNew: '{rarity} · Nouveau',
    duplicate: '{rarity} · Doublon',
  },
  perkDone: 'Complète. +{pct} de ventes pour les distributeurs {family}.',
  perkGoal: 'Complète la série pour +{pct} de ventes sur les distributeurs {family}.',
  a11y: {
    owned: '{item}, {rarity}, {n} possédé(s)',
    missing: 'Numéro {n}, pas encore trouvé',
  },
  section: {
    pulls: 'Tirages',
    odds: 'Chances',
  },
  buyPull: 'Acheter un tirage · {price}',
  locked:
    'L’achat de tirages se débloque au chapitre 3 (SARL). Les distributeurs à capsules peuvent quand même offrir un tirage gratuit quand tu encaisses.',
  freePull: {
    one: 'Tirage gratuit · regarde une pub ({n} restant aujourd’hui)',
    other: 'Tirage gratuit · regarde une pub ({n} restants aujourd’hui)',
  },
  noFreePulls: 'Plus de tirage gratuit aujourd’hui',
  freePullHint: 'Facultatif. Une courte pub, puis une capsule s’ouvre.',
  capsuleDrop:
    'Les distributeurs à capsules offrent aussi un tirage gratuit {pct} du temps quand tu encaisses.',
  oddsNote:
    'Chaque tirage choisit une rareté selon ces chances, puis un objet de cette rareté au hasard. Les tirages utilisent uniquement l’argent du jeu.',
  noReward: 'Pas de récompense cette fois.',
} satisfies Shape<typeof en>;
