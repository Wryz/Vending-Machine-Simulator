// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Instale sua primeira máquina',
      line: 'Toque numa rua movimentada. A tecla da chama mostra por onde as pessoas passam.',
    },
    stock: {
      title: 'Abasteça',
      line: 'Toque na sua máquina, depois em Encher e Repor.',
    },
    wait: {
      title: 'Espere os clientes',
      line: 'Aproxime o mapa para ver as pessoas chegando e comprando.',
    },
    collect: {
      title: 'Colete o dinheiro',
      line: 'Toque na sua máquina e esvazie o cofre.',
    },
    goal: {
      title: 'Sua primeira meta',
      line: 'Fature $1,000 em vendas para concluir o capítulo 1. O medidor lá em cima acompanha.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Entendi',
    close: 'Fechar o tutorial',
  },
} satisfies Shape<typeof en>;
