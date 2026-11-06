// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/rankings';

export default {
  title: 'Top-Betreiber',
  subtitle: 'Diese Woche in {city}',
  you: 'Du',
  rivalTag: 'Rivale',
  day: 'Tag {n} von 7 · Update um Mitternacht',
  final: 'Endstand · heute beginnt eine neue Woche',
  preview: 'Live-Vorschau · erste Rangliste um Mitternacht',
  of: 'von {n}',
  overnightUp: { one: 'Über Nacht {n} Platz hoch', other: 'Über Nacht {n} Plätze hoch' },
  overnightDown: { one: 'Über Nacht {n} Platz runter', other: 'Über Nacht {n} Plätze runter' },
  overnightSame: 'Gleicher Platz wie gestern',
  climbed: 'Über Nacht von #{from} auf #{to} geklettert',
  thisWeek: 'Deine Umsätze diese Woche',
  toPass: 'Noch {amount}, um {name} zu überholen',
  leading: 'Du führst die Stadt an. Weiter so!',
  lastWeek: 'Letzte Woche: #{rank} von {n}',
  howItWorks: 'Rangliste nach Umsatz seit Montag. Update jede Nacht um Mitternacht, Ortszeit.',
  a11y: {
    row: '{rank}. {name}: {amount}',
    chip: 'Stadtrang {rank} von {n}. Öffnet die Rangliste.',
  },
  moment: {
    label: 'Stadtrangliste',
    passed: 'Du hast {name} überholt!',
    top: 'Du bist Nr. 1 in {city}!',
    rank: '#{rank} in {city}',
  },
  company: {
    section: 'Stadtrangliste',
    open: 'Rangliste öffnen',
    none: 'Die erste Rangliste kommt um Mitternacht.',
  },
} satisfies Shape<typeof en>;
