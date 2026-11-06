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
        'Melhoria de van, duas máquinas de lanches e $2,000 em dinheiro. Oferecido uma vez após o capítulo 1.',
    },
    wrapNight: {
      title: 'Adesivo Turno da Noite',
      detail: 'Um adesivo escuro e discreto para a máquina. Cosmético.',
    },
    wrapLinen: {
      title: 'Adesivo Linho',
      detail: 'Adesivo branco quente. Cosmético.',
    },
    lightingWarm: {
      title: 'Pacote de luz quente',
      detail: 'Luz amarelada de rua nos produtos à noite. Cosmético.',
    },
  },
  owned: 'Adquirido',
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
    looks: 'Visuais',
    rewards: 'Prêmios grátis',
  },
  looksNote: 'Aplique adesivos e luzes no close de uma máquina. Só cosmético.',
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
