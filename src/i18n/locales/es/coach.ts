// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Coloca tu primera máquina',
      line: 'Toca una calle concurrida. La tecla de la llama muestra por dónde pasa la gente.',
    },
    stock: {
      title: 'Llénala',
      line: 'Toca tu máquina y luego Llenar y Reponer.',
    },
    wait: {
      title: 'Espera a los clientes',
      line: 'Acerca el mapa para ver a la gente llegar y comprar.',
    },
    collect: {
      title: 'Recoge tu dinero',
      line: 'Toca tu máquina y vacía la caja.',
    },
    goal: {
      title: 'Tu primera meta',
      line: 'Vende {amount} para terminar el capítulo 1. El medidor de arriba lo sigue.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Entendido',
    close: 'Cerrar el tutorial',
  },
} satisfies Shape<typeof en>;
