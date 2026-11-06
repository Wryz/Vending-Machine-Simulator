// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/services';

export default {
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
    wrapNight: {
      title: 'Folierung Nachtschicht',
      detail: 'Eine dunkle, ruhige Automatenfolierung. Nur Optik.',
    },
    wrapLinen: {
      title: 'Folierung Leinen',
      detail: 'Warmes Cremeweiß. Nur Optik.',
    },
    lightingWarm: {
      title: 'Warmes Lichtpaket',
      detail: 'Warmes Natriumlicht für die Waren bei Nacht. Nur Optik.',
    },
  },
  errors: {
    storeUnavailable: 'Der Store ist in diesem Build nicht verfügbar.',
    productNotFound: 'Produkt nicht gefunden.',
    purchaseFailed: 'Kauf fehlgeschlagen. Dir wurde nichts berechnet.',
    restoreFailed: 'Käufe konnten nicht wiederhergestellt werden.',
  },
} satisfies Shape<typeof en>;
