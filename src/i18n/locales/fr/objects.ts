// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/objects';

export default {
  coinTray: {
    empty: 'La caisse est vide',
    box: 'Caisse',
    venue: 'Lieu',
    youKeep: 'Pour toi',
    a11y: {
      collected: '{amount} encaissé',
      summary: 'Caisse {gross}, commission du lieu {commission}, pour toi {net}',
    },
  },
  contract: {
    header: 'CONTRAT D’EMPLACEMENT',
    noCash: 'Pas assez d’argent pour signer',
    swipe: 'Glisse pour signer →',
    a11y: {
      line: 'Ligne de signature. Glisse pour signer.',
      sign: 'Signer',
    },
  },
  keyTag: {
    a11y: '{name} à {place}, {status}',
  },
  status: {
    ok: 'En marche',
    low: 'Stock bas',
    empty: 'Vide',
    cashFull: 'Caisse pleine',
    broken: 'En panne',
    stored: 'En stock',
    unknown: 'Sans télémétrie',
  },
  permit: {
    office: 'SERVICE DES LICENCES',
    valid: 'VALIDE',
    notHeld: 'NON DÉTENU',
  },
  sparkline: {
    a11y: 'Clients par heure',
  },
} satisfies Shape<typeof en>;
