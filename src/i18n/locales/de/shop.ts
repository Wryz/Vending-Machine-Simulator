// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/shop';

export default {
  title: 'Shop',
  subtitle: 'Einmalkäufe. Keine Abos.',
  products: {
    removeAds: {
      title: 'Werbefrei + längere Pausen',
      detail: 'Blendet Werbeangebote aus und erhöht das Offline-Limit um 25 %.',
    },
    starterPack: {
      title: 'Starterpaket',
      detail:
        'Van-Upgrade, zwei Snackautomaten und $2,000 Bargeld. Einmalig nach Kapitel 1 angeboten.',
    },
    doubleProfits: {
      title: 'Doppelter Gewinn',
      detail: 'Jeder Verkauf bringt das Doppelte, für immer.',
    },
  },
  owned: 'Gekauft',
  doubleProfitsNote: 'Jeder Automat, jede Stadt. Kapitelziele zählen normale Verkäufe.',
  buy: 'Kaufen · {price}',
  starterAdded: 'Starterpaket erhalten. Zwei Snackautomaten sind im Lager.',
  starterPending: 'Kauf gespeichert. Öffne eine Stadt, um das Starterpaket zu erhalten.',
  yours: '{title} gehört dir.',
  restored: 'Käufe wiederhergestellt.',
  restoreFailed: 'Käufe konnten nicht wiederhergestellt werden.',
  noReward: 'Diesmal keine Belohnung.',
  doubled: {
    one: 'Einnahmen {n} Minute lang verdoppelt.',
    other: 'Einnahmen {n} Minuten lang verdoppelt.',
  },
  noStore: 'Der Store ist in diesem Build nicht verfügbar.',
  noStoreBody: 'Alles im Spiel lässt sich auch erspielen.',
  section: {
    purchases: 'Käufe',
    rewards: 'Gratis-Belohnungen',
  },
  doubleTitle: {
    one: 'Doppelte Einnahmen für {n} Minute',
    other: 'Doppelte Einnahmen für {n} Minuten',
  },
  doubleNote: 'Freiwillig. Werbung läuft nur, wenn du tippst.',
  active: 'Aktiv · noch {time}',
  addMinutes: {
    one: '+{n} Minute · Werbung ansehen',
    other: '+{n} Minuten · Werbung ansehen',
  },
  watchAd: 'Werbung ansehen',
  restore: 'Käufe wiederherstellen',
} satisfies Shape<typeof en>;
