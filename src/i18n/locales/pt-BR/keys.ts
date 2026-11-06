// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/keys';

export default {
  title: 'Chaveiro',
  noBusiness: 'Nenhum negócio aberto.',
  subtitle: '{placed} instaladas · {stored} no estoque',
  placed: 'Instaladas',
  nonePlaced: 'Nenhuma instalada ainda.',
  inStorage: 'No estoque',
  readyToPlace: 'Pronta p/ instalar',
  place: 'Instalar',
  cashSeen: '{amount} · há {ago}',
  a11y: {
    placeHint: 'Escolha um ponto no mapa para {machine}',
  },
} satisfies Shape<typeof en>;
