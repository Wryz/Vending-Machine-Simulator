// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/cities';

export default {
  title: 'Städte',
  subtitle: 'Jede Stadt hat ihr eigenes Geschäft',
  section: {
    current: 'Aktuelle Stadt',
    area: 'Deine Gegend',
    cities: 'Städte',
  },
  chapterMachines: {
    one: 'Kapitel {chapter} · {n} Automat',
    other: 'Kapitel {chapter} · {n} Automaten',
  },
  label: {
    saved: 'Gespeichert',
    current: 'Aktuell',
    newSave: 'Neu',
  },
  a11y: {
    row: '{name}, Ortszeit {time}, {label}',
    switchHint: 'Zu dieser Stadt wechseln',
  },
  openFailed: 'Diese Stadt ließ sich nicht öffnen.',
  confirm: {
    startTitle: 'In {name} starten?',
    goTitle: 'Nach {name} wechseln?',
    startBody:
      'Ein neues Geschäft mit neuem Spielstand. Dein Fortschritt in {current} bleibt gespeichert.',
    goBody: 'Dein Fortschritt in {current} wird vorher gespeichert.',
    thisCity: 'dieser Stadt',
    cancel: 'Abbrechen',
    start: 'Starten',
    go: 'Los',
  },
  footer:
    'Beim Wechsel wird dieses Geschäft zuerst gespeichert. Schließ Kapitel 5 ab, um die Firma zu verkaufen und überall mit Vorsprung neu zu starten.',
  opening: 'Stadt wird geöffnet …',
} satisfies Shape<typeof en>;
