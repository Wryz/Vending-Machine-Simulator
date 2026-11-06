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
  },
  footer:
    'Changer de ville sauvegarde d’abord cette entreprise. Termine le chapitre 5 pour vendre l’entreprise et recommencer où tu veux avec une avance.',
  opening: 'Ouverture de la ville…',
} satisfies Shape<typeof en>;
