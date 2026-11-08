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
  restockLow: 'Repor máquinas baixas',
  lowRun: {
    title: { one: 'Repor {n} máquina baixa', other: 'Repor {n} máquinas baixas' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items} itens · {cost} · cerca de {time}',
    send: 'Enviar van',
    cancel: 'Agora não',
    vansOut: 'Todas as suas vans estão fora',
  },
  backTo: 'Voltar para {city}',
  areas: {
    hood: '{name}\nAbre no capítulo {n}',
    ring: 'Abre no capítulo {n}',
  },
  clockAhead: {
    title: 'O relógio do seu celular estava adiantado',
    body: 'Sua cidade espera a hora real alcançar, cerca de {time}. Depois as máquinas voltam a vender.',
  },
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
