// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/objects';

export default {
  coinTray: {
    empty: 'O cofre está vazio',
    box: 'Cofre',
    venue: 'Local',
    youKeep: 'Fica p/ você',
    a11y: {
      collected: 'Coletado {amount}',
      summary: 'Cofre {gross}, comissão do local {commission}, fica para você {net}',
    },
  },
  contract: {
    header: 'CONTRATO DE LOCAÇÃO',
    noCash: 'Dinheiro insuficiente para assinar',
    swipe: 'Deslize para assinar →',
    a11y: {
      line: 'Linha de assinatura. Deslize para assinar.',
      sign: 'Assinar',
    },
  },
  keyTag: {
    a11y: '{name} em {place}, {status}',
  },
  status: {
    ok: 'Funcionando',
    low: 'Pouco estoque',
    empty: 'Vazia',
    cashFull: 'Cofre cheio',
    broken: 'Quebrada',
    stored: 'No estoque',
    unknown: 'Sem telemetria',
  },
  permit: {
    office: 'SECRETARIA DE LICENÇAS',
    valid: 'VÁLIDA',
    notHeld: 'SEM LICENÇA',
  },
  sparkline: {
    a11y: 'Clientes por hora',
  },
} satisfies Shape<typeof en>;
