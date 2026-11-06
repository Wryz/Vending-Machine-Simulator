// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/shop';

export default {
  title: 'Loja',
  subtitle: 'Compras únicas. Sem assinaturas.',
  products: {
    removeAds: {
      title: 'Sem anúncios + pausas maiores',
      detail: 'Oculta ofertas de anúncio e aumenta o limite offline em 25%.',
    },
    starterPack: {
      title: 'Pacote Inicial',
      detail:
        'Melhoria de van, duas máquinas de lanches e {amount} em dinheiro. Oferecido uma vez após o capítulo 1.',
    },
    doubleProfits: {
      title: 'Lucro em dobro',
      detail: 'Cada venda paga o dobro, para sempre.',
    },
  },
  owned: 'Adquirido',
  doubleProfitsNote:
    'Todas as máquinas, todas as cidades. As metas de capítulo contam as vendas normais.',
  buy: 'Comprar · {price}',
  starterAdded: 'Pacote Inicial adicionado. Duas máquinas de lanches estão no estoque.',
  starterPending: 'Compra registrada. Abra uma cidade para receber o Pacote Inicial.',
  yours: '{title} é seu.',
  restored: 'Compras restauradas.',
  restoreFailed: 'Não foi possível restaurar as compras.',
  noReward: 'Sem prêmio desta vez.',
  doubled: {
    one: 'Ganhos dobrados por {n} minuto.',
    other: 'Ganhos dobrados por {n} minutos.',
  },
  noStore: 'A loja não está disponível nesta versão.',
  noStoreBody: 'Tudo no jogo pode ser conquistado jogando.',
  section: {
    purchases: 'Compras',
    rewards: 'Prêmios grátis',
  },
  doubleTitle: {
    one: 'Ganhos em dobro por {n} minuto',
    other: 'Ganhos em dobro por {n} minutos',
  },
  doubleNote: 'Opcional. Um anúncio curto só passa quando você toca.',
  active: 'Ativo · faltam {time}',
  addMinutes: {
    one: '+{n} minuto · ver um anúncio',
    other: '+{n} minutos · ver um anúncio',
  },
  watchAd: 'Ver um anúncio',
  restore: 'Restaurar compras',
} satisfies Shape<typeof en>;
