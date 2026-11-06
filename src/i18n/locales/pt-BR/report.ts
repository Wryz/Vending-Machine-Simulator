// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/report';

export default {
  title: 'Enquanto você estava fora…',
  nothing: 'Nada a relatar.',
  done: 'Pronto',
  soldMachine: 'Uma máquina que você vendeu',
  aMachine: 'Uma máquina',
  more: '· e mais {n}',
  line: {
    sales: 'Vendas',
    items: 'Itens vendidos',
    costs: 'Custos',
    driverRuns: 'Viagens',
    breakdowns: 'Defeitos',
    thefts: 'Furtos',
    spoiled: 'Itens estragados',
  },
  cashChange: 'Variação do caixa',
  footerCapped: 'Limite offline atingido. {time} não contado.',
  footerThanks: 'Obrigado pela preferência.',
  bestSpots: 'Melhores pontos',
  issue: {
    empty: 'Esgotaram',
    cashFull: 'Cofre cheio',
    contractsLost: 'Contratos perdidos',
    events: 'Eventos locais',
    chapters: 'Capítulos concluídos',
  },
  chapterLine: '{n}. {title}',
  lostNote: 'Máquinas de contratos perdidos voltaram ao estoque. Instale-as pelo chaveiro.',
  double: 'Dobrar · ver anúncio (+{amount})',
  doubleHint: 'Opcional. Passa um anúncio curto e adiciona o mesmo valor de novo.',
  noReward: 'Sem prêmio desta vez.',
  added: '{amount} adicionado',
} satisfies Shape<typeof en>;
