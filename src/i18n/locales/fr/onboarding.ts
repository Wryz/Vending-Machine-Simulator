// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/onboarding';

export default {
  coldOpen: {
    subtitle: 'Vending Machine Simulator',
    clockA11y: '{city}, {time}',
    tagline: 'Un distributeur d’occasion. $250. Toute une ville.',
    insertCoin: 'Insérer une pièce',
    insertCoinHint: 'Lance ton business de distributeurs',
  },
  intro: {
    title: 'Comment jouer',
    streetsTitle: 'De vraies rues',
    streetsLine:
      'Installe des distributeurs dans de vrais lieux de vraies villes, là où les gens passent vraiment.',
    stockTitle: 'Remplir, fixer, encaisser',
    stockLine:
      'Remplis tes distributeurs, fixe des prix justes et regarde les clients venir acheter.',
    empireTitle: 'Du petit boulot à l’empire',
    empireLine:
      'Passe d’un distributeur d’occasion à des camionnettes, des chauffeurs et toute une ville.',
    next: 'Suivant',
    letsGo: 'C’est parti',
    skip: 'Passer',
  },
  location: {
    title: 'Où commencer ?',
    nearTitle: 'Tu es près de {city}',
    nearBody: 'Monte ton entreprise dans les rues autour de toi.',
    farTitle: 'Ta zone n’est pas encore sur la carte',
    farBody: 'La ville la plus proche est {city}, à {km} km. D’autres villes arrivent.',
    offTitle: 'Localisation désactivée pour Coinline',
    offBody: 'Active la localisation dans Réglages, ou choisis une ville toi-même.',
    startTitle: 'Commencer près de toi',
    approxLabel: 'Position approximative uniquement',
    approxValue: '~1 km',
    notStoredLabel: 'Ta position n’est jamais enregistrée',
    notStoredValue: 'Jamais gardée',
    onceLabel: 'Utilisée une fois, pour choisir ta ville',
    onceValue: 'Une fois',
    startIn: 'Commencer à {city}',
    openSettings: 'Ouvrir Réglages',
    useMyLocation: 'Utiliser ma position',
    useMyLocationHint:
      'Utilise une fois ta position approximative pour trouver la ville la plus proche. Elle n’est jamais enregistrée.',
    exploreCities: 'Explorer les villes',
    notFound: 'Impossible de te localiser pour l’instant. Choisis une ville pour commencer.',
    yourArea: 'Ton quartier',
    loadFailed: 'Impossible de charger cette ville.',
  },
  preview: {
    subtitle: 'Aperçu',
    localTime: 'Vraie heure locale',
    hasBusiness: 'Tu as une entreprise ici',
    freshStart: 'Un nouveau départ',
    saved: 'Sauvée',
    new: 'Nouveau',
    switchNote:
      'Tu peux changer de ville à tout moment depuis la carte. Chaque ville garde sa propre entreprise.',
    continueIn: 'Continuer à {city}',
    startIn: 'Commencer à {city}',
    back: 'Retour aux villes',
  },
  picker: {
    title: 'Explorer les villes',
    subtitle: 'Touche une ville pour y jeter un œil',
    rowA11y: '{city}, heure locale {time}',
    rowA11ySaved: '{city}, heure locale {time}, sauvegardée',
    rowHint: 'Aperçu de cette ville',
    saved: 'Sauvée',
  },
} satisfies Shape<typeof en>;
