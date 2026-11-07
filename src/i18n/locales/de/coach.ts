// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Stell deinen ersten Automaten auf',
      line: 'Belebte Straßen verkaufen mehr. Die Flammen-Taste zeigt sie – oder wir suchen einen Platz für dich aus.',
      action: 'Zeig mir einen guten Platz',
      actionHint: 'Sucht einen belebten Platz in der Nähe und öffnet seine Karte',
    },
    stock: {
      title: 'Füll ihn mit Snacks',
      line: 'Dein Automat ist leer. Öffne ihn und lade Snacks aus deinem Van ein.',
      action: 'Meinen Automaten öffnen',
      actionHint: 'Öffnet die Karte deines Automaten',
    },
    delivery: {
      title: 'Dein Lieferwagen ist unterwegs',
      /** {store} = a real supermarket name from map data. */
      line: 'Er bringt deine Snacks von {store}. Sieh zu, wie er zu deinem Automaten fährt!',
      lineDepot:
        'Er bringt deine Snacks aus deinem Lager. Sieh zu, wie er zu deinem Automaten fährt!',
      action: 'Ankunft ansehen',
      actionHint: 'Zoomt die Karte auf deinen Automaten',
    },
    wait: {
      title: 'Warte auf Kunden',
      line: 'Leute, die vorbeilaufen, bleiben stehen und kaufen. Zoom rein und schau zu!',
      action: 'Automaten ansehen',
      actionHint: 'Zoomt die Karte auf deinen Automaten',
    },
    collect: {
      title: 'Kassiere deine Münzen',
      line: 'Du hast verkauft! Öffne deinen Automaten und nimm die Münzen.',
      action: 'Meinen Automaten öffnen',
      actionHint: 'Öffnet die Karte deines Automaten',
    },
    goal: {
      title: 'Dein erstes Ziel',
      line: 'Mach {amount} Umsatz, um Kapitel 1 abzuschließen. Die Anzeige oben zählt mit.',
    },
  },
  guide: {
    spotGood: 'Guter Platz! Stell deinen Automaten hier auf.',
    placeKey: 'Aufstellen',
    spotQuiet: 'Hier laufen wenige Leute. Zieh das nach unten und probier eine belebtere Straße.',
    sign: 'Scroll nach unten und wisch mit dem Finger über die Linie, um zu unterschreiben.',
    fill: 'Tippe auf Voll, um Snacks aus deinem Van zu laden.',
    restock: 'Jetzt auf Auffüllen tippen. Ein Lieferwagen bringt alles vom nächsten Markt.',
    onTheWay: 'Dein Lieferwagen ist unterwegs. Schließ das hier und sieh zu, wie er herfährt.',
    wait: 'Fertig! Schließ das und sieh zu, wie Kunden kommen.',
    collect: 'Tippe auf Kassieren, um deine Münzen zu nehmen.',
  },
  tips: {
    keys: {
      title: 'Dein Schlüsselbund',
      line: 'Alle deine Automaten sind hier. Tippe auf einen, um hinzufliegen.',
    },
    routes: {
      title: 'Dein Van und deine Fahrer',
      line: 'Ein größerer Van füllt mehr auf einmal auf. Später fahren Fahrer die Runden für dich.',
    },
    orders: {
      title: 'Tagesaufträge',
      line: 'Drei kleine Jobs am Tag für Bonusgeld. Schaffe alle drei für eine Serie.',
    },
    company: {
      title: 'Deine Firma',
      line: 'Dein Kapitelziel, Einnahmen und Ausgaben und Upgrades für alle Automaten.',
    },
    rankings: {
      title: 'Top-Betreiber',
      line: 'Sieh, wie deine Umsätze im Vergleich zu den anderen Automatenfirmen der Stadt liegen.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Verstanden',
    close: 'Tutorial schließen',
    step: 'Schritt {n} von {total}',
  },
} satisfies Shape<typeof en>;
