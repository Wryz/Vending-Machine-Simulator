// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} máquina', other: '{city} · {n} máquinas' },
  placeHint: 'Toque num ponto para instalar esta máquina',
  /** The big key that starts placing a new machine. */
  placeKey: 'Colocar máquina',
  placeKeyHint:
    'Encontra um ponto movimentado por perto e abre o cartão. Você também pode tocar em qualquer lugar do mapa.',
  placeLocked: 'Termine o capítulo 1 para comprar mais máquinas',
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: 'Armazém',
  wholesale: 'Atacadista',
  backTo: 'Voltar para {city}',
  a11y: {
    van: 'Van de entrega para {venue}',
    store: '{store}, onde sua van carrega',
    settings: 'Ajustes',
    view3d: 'Vista 3D',
    topDown: 'Vista de cima',
    busyStreets: 'Ruas movimentadas',
    myMachines: 'Minhas máquinas',
    zoomIn: 'Aproximar',
    zoomOut: 'Afastar',
  },
} satisfies Shape<typeof en>;
