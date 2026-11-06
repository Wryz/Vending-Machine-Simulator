// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/money';

export default {
  a11y: {
    panel:
      'Argent {cash}. Chapitre {n}, {title} : {progress}. Aujourd’hui {today} de ventes, {waiting} en attente dans tes distributeurs.',
    cash: 'Argent {amount}',
    /** Appended when Double Profits is owned. */
    doubleProfits: 'Profits doublés actifs : chaque vente rapporte le double.',
  },
} satisfies Shape<typeof en>;
