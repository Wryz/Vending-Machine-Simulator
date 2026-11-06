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
  errors: {
    storeUnavailable: 'A loja não está disponível nesta versão.',
    productNotFound: 'Produto não encontrado.',
    purchaseFailed: 'A compra falhou. Você não foi cobrado.',
    restoreFailed: 'Não foi possível restaurar as compras.',
  },
} satisfies Shape<typeof en>;
