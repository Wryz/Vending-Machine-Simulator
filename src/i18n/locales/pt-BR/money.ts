// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/money';

export default {
  a11y: {
    panel:
      'Caixa {cash}. Capítulo {n}, {title}: {progress}. Hoje {today} em vendas, {waiting} esperando nas suas máquinas.',
    cash: 'Caixa {amount}',
    /** Appended when Double Profits is owned. */
    doubleProfits: 'Lucro em dobro ativo: cada venda paga o dobro.',
  },
} satisfies Shape<typeof en>;
