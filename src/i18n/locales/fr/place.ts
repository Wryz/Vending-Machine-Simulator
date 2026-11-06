// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  heading: {
    n: 'Face N',
    e: 'E',
    s: 'S',
    w: 'O',
  },
  section: {
    term: 'Durée',
    exclusivity: 'Exclusivité',
    facing: 'Orientation',
  },
  days: { one: '{n} jour', other: '{n} jours' },
  termNote:
    'Jours ouvrés. Plus la durée est longue, plus la commission baisse. Les contrats se renouvellent tant que le lieu est content.',
  exclusive: 'Tiens Brightvend hors de ce pâté de maisons (+{pct} de commission)',
  exclusiveA11y: 'Contrat exclusif',
  contract: {
    machine: 'Distributeur',
    commission: 'Commission du lieu',
    term: 'Durée',
    exclusive: 'Exclusif',
    yes: 'Oui',
    no: 'Non',
    price: 'Prix du distributeur',
    install: 'Installation',
  },
  disclaimer: 'Lieux issus de données cartographiques ouvertes. Aucune affiliation ni approbation.',
  total: 'Total aujourd’hui',
} satisfies Shape<typeof en>;
