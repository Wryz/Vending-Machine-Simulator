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
    branchTitle: 'Filiale in {name} eröffnen?',
    branchBody: 'Geld, Kapitel und Forschung deiner Firma kommen mit, und {current} handelt weiter, während du weg bist.',
    branch: 'Filiale eröffnen',
    lockedTitle: 'Filialen ab Kapitel {n}',
    lockedBody: 'Ab Kapitel {n} ist jede Stadt eine Filiale derselben Firma. Bis dahin wäre {name} ein eigenes Geschäft mit eigenem Geld.',
    separate: 'Getrennt starten',
    farTitle: '{name} öffnet in Kapitel {n}',
    farBody: 'Deine Firma wächst von deiner Heimatstadt aus: erst dein Bundesland, dann dein Land, deine Region, dein Kontinent und am Ende die ganze Welt.',
    fullTitle: '{count} Städte sind vorerst das Limit',
    fullBody: 'Deine Firma kann {count} Städte führen. Das nächste Kapitel erlaubt mehr.',
  },
  footer:
    'Beim Wechsel wird diese Stadt zuerst gespeichert. Ab Kapitel 3 sind deine Städte Filialen einer Firma mit gemeinsamem Geld und Fortschritt.',
  opening: 'Stadt wird geöffnet …',
} satisfies Shape<typeof en>;
