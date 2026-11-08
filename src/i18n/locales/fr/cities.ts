// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/cities';

export default {
  title: 'Villes',
  subtitle: 'Chaque ville a sa propre entreprise',
  section: {
    current: 'Ville actuelle',
    area: 'Ton quartier',
    cities: 'Villes',
  },
  chapterMachines: {
    one: 'Chapitre {chapter} · {n} distributeur',
    other: 'Chapitre {chapter} · {n} distributeurs',
  },
  label: {
    saved: 'Sauvée',
    current: 'Actuelle',
    newSave: 'Nouvelle',
  },
  a11y: {
    row: '{name}, heure locale {time}, {label}',
    switchHint: 'Aller dans cette ville',
  },
  openFailed: 'Impossible d’ouvrir cette ville.',
  confirm: {
    startTitle: 'Commencer à {name} ?',
    goTitle: 'Aller à {name} ?',
    startBody:
      'Une nouvelle entreprise, une nouvelle sauvegarde. Ta progression à {current} reste sauvegardée.',
    goBody: 'Ta progression à {current} est d’abord sauvegardée.',
    thisCity: 'cette ville',
    cancel: 'Annuler',
    start: 'Commencer',
    go: 'Y aller',
    branchTitle: 'Ouvrir une succursale à {name} ?',
    branchBody: 'L\'argent, le chapitre et la recherche de ton entreprise te suivent, et {current} continue de vendre pendant ton absence.',
    branch: 'Ouvrir la succursale',
    lockedTitle: 'Succursales au chapitre {n}',
    lockedBody: 'À partir du chapitre {n}, chaque ville ouverte est une succursale d\'une même entreprise. D\'ici là, {name} serait une affaire séparée avec son propre argent.',
    separate: 'Commencer à part',
    farTitle: '{name} ouvre au chapitre {n}',
    farBody: 'Ton entreprise s\'étend depuis ta ville d\'origine : d\'abord ta région administrative, puis ton pays, ta région du monde, ton continent et enfin le monde entier.',
    fullTitle: '{count} villes, c\'est la limite pour l\'instant',
    fullBody: 'Ton entreprise peut gérer {count} villes. Le chapitre suivant en permet plus.',
  },
  footer:
    'En changeant, cette ville est d\'abord sauvegardée. Dès le chapitre 3, tes villes sont les succursales d\'une seule entreprise, argent et progrès partagés.',
  opening: 'Ouverture de la ville…',
} satisfies Shape<typeof en>;
