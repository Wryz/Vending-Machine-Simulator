// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/rankings';

export default {
  title: 'Meilleurs exploitants',
  subtitle: 'Cette semaine à {city}',
  you: 'Vous',
  rivalTag: 'Rival',
  day: 'Jour {n} sur 7 · mise à jour à minuit',
  final: 'Classement final · nouvelle semaine aujourd’hui',
  preview: 'Aperçu en direct · premier classement à minuit',
  of: 'sur {n}',
  overnightUp: { one: '{n} place gagnée cette nuit', other: '{n} places gagnées cette nuit' },
  overnightDown: { one: '{n} place perdue cette nuit', other: '{n} places perdues cette nuit' },
  overnightSame: 'Même place qu’hier soir',
  climbed: 'Vous êtes passé de #{from} à #{to} cette nuit',
  thisWeek: 'Vos ventes cette semaine',
  toPass: 'Encore {amount} pour dépasser {name}',
  leading: 'Vous menez la ville. Continuez !',
  lastWeek: 'Semaine dernière : #{rank} sur {n}',
  howItWorks: 'Classement par ventes depuis lundi. Mise à jour chaque nuit à minuit, heure locale.',
  a11y: {
    row: '{rank}. {name} : {amount}',
    chip: 'Rang {rank} sur {n} en ville. Ouvre le classement.',
  },
  moment: {
    label: 'Classement',
    passed: 'Vous avez dépassé {name} !',
    top: 'Vous êtes n° 1 à {city} !',
    rank: '#{rank} à {city}',
  },
  company: {
    section: 'Classement de la ville',
    open: 'Voir le classement',
    none: 'Premier classement à minuit.',
  },
} satisfies Shape<typeof en>;
