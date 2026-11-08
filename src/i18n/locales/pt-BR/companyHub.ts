// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/companyHub';

export default {
  section: {
    hintOpen: 'Oculta esta seção',
    hintClosed: 'Mostra esta seção',
  },
  chapter: {
    requirements: 'Requisitos para subir de nível',
    toReach: 'Para chegar ao capítulo {n}',
    rewards: 'Liberado ao terminar este capítulo',
    last: 'Último capítulo: venda a empresa quando quiser.',
    stepsHint: 'Toque em um número para ver o capítulo',
    stepHint: 'Mostra a meta e as liberações deste capítulo',
  },
  chapterSheet: {
    title: 'Capítulo {n}',
    done: 'Feito',
    current: 'Atual',
    locked: 'Adiante',
    goal: 'Meta',
    unlocks: 'Libera',
    unlocked: 'Liberado',
    close: 'Fechar',
  },
  finances: {
    cash: 'Caixa',
    cashDesc: 'Dinheiro disponível',
    netToday: 'Líquido hoje',
    netTodayDesc: 'Entradas − saídas hoje',
    inToday: 'Entradas hoje',
    inTodayDesc: 'Vendas e prêmios',
    outToday: 'Saídas hoje',
    outTodayDesc: 'Estoque, aluguel, salários…',
    netYesterday: 'Líquido ontem',
    netYesterdayDesc: 'Dia inteiro',
    lifetimeSales: 'Vendas totais',
    lifetimeSalesDesc: 'Desde o início',
    lifetimeCosts: 'Custos totais',
    lifetimeCostsDesc: 'Desde o início',
    unitsSold: 'Itens vendidos',
    unitsSoldDesc: 'No total',
    breakdown: 'Hoje por categoria',
    noActivity: 'Nenhuma atividade hoje',
  },
  more: {
    research: 'Pesquisa',
    rankings: 'Ranking da cidade',
    globalRanking: 'Ranking global',
    prestige: 'Prestígio',
    trophies: 'Troféus',
  },
  trophies: {
    title: 'Troféus',
    subtitle: '{got} de {total} desbloqueados',
    waiting: 'Prêmios esperando',
    claim: 'Resgatar {amount}',
    claimed: '{amount} resgatado',
  },
} satisfies Shape<typeof en>;
