// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/onboarding';

export default {
  coldOpen: {
    subtitle: 'Vending Machine Simulator',
    clockA11y: '{city}, {time}',
    tagline: 'Ein alter Automat. {amount}. Eine ganze Stadt.',
    insertCoin: 'Münze einwerfen',
    insertCoinHint: 'Starte dein Automatengeschäft',
  },
  intro: {
    title: 'So geht’s',
    streetsTitle: 'Echte Straßen',
    streetsLine:
      'Stell Automaten an echten Orten in echten Städten auf, wo wirklich Leute unterwegs sind.',
    stockTitle: 'Füllen, Preis, Kassieren',
    stockLine: 'Füll deine Automaten, setz faire Preise und sieh Kunden beim Kaufen zu.',
    empireTitle: 'Vom Nebenjob zum Imperium',
    empireLine: 'Wachse von einem alten Automaten zu Vans, Fahrern und einer ganzen Stadt.',
    next: 'Weiter',
    letsGo: 'Los geht’s',
    skip: 'Überspringen',
  },
  location: {
    title: 'Wo startest du?',
    nearTitle: 'Du bist in der Nähe von {city}',
    nearBody: 'Bau dein Geschäft in den Straßen um dich herum auf.',
    farTitle: 'Deine Gegend ist noch nicht auf der Karte',
    farBody: 'Die nächste Stadt ist {city}, {km} km entfernt. Weitere Städte kommen.',
    offTitle: 'Standortzugriff für Coinline ist aus',
    offBody: 'Aktiviere den Standort in den Einstellungen oder wähl selbst eine Stadt.',
    startTitle: 'In deiner Nähe starten',
    approxLabel: 'Nur ungefährer Standort',
    approxValue: '~1 km',
    notStoredLabel: 'Dein Standort wird nie gespeichert',
    notStoredValue: 'Nie gesp.',
    onceLabel: 'Einmal genutzt, um deine Stadt zu wählen',
    onceValue: 'Einmal',
    startIn: 'In {city} starten',
    openSettings: 'Einstellungen öffnen',
    useMyLocation: 'Meinen Standort nutzen',
    useMyLocationHint:
      'Nutzt einmalig deinen ungefähren Standort, um die nächste Stadt zu finden. Er wird nie gespeichert.',
    exploreCities: 'Städte erkunden',
    notFound: 'Wir konnten deinen Standort gerade nicht finden. Wähl eine Stadt zum Starten.',
    yourArea: 'Deine Gegend',
    loadFailed: 'Diese Stadt ließ sich nicht laden.',
  },
  preview: {
    subtitle: 'Vorschau',
    localTime: 'Echte Ortszeit',
    hasBusiness: 'Du hast hier ein Geschäft',
    freshStart: 'Ein Neuanfang',
    saved: 'Gesp.',
    new: 'Neu',
    switchNote:
      'Du kannst jederzeit über die Karte die Stadt wechseln. Jede Stadt hat ihr eigenes Geschäft.',
    continueIn: 'Weiter in {city}',
    startIn: 'In {city} starten',
    back: 'Zurück zu den Städten',
  },
  picker: {
    title: 'Städte erkunden',
    subtitle: 'Tippe auf eine Stadt, um dich umzusehen',
    rowA11y: '{city}, Ortszeit {time}',
    rowA11ySaved: '{city}, Ortszeit {time}, gespeichert',
    rowHint: 'Vorschau dieser Stadt',
    saved: 'Gespeichert',
  },
} satisfies Shape<typeof en>;
