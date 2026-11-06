// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/services';

export default {
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
    doubleProfits: {
      title: 'Lucro em dobro',
      detail: 'Cada venda paga o dobro, para sempre.',
    },
  },
  errors: {
    storeUnavailable: 'A loja não está disponível nesta versão.',
    productNotFound: 'Produto não encontrado.',
    purchaseFailed: 'A compra falhou. Você não foi cobrado.',
    restoreFailed: 'Não foi possível restaurar as compras.',
  },
} satisfies Shape<typeof en>;
