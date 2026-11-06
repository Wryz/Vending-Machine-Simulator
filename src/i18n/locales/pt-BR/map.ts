// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} máquina', other: '{city} · {n} máquinas' },
  placeHint: 'Toque num ponto para instalar esta máquina',
  backTo: 'Voltar para {city}',
  a11y: {
    settings: 'Ajustes',
    view3d: 'Vista 3D',
    topDown: 'Vista de cima',
    busyStreets: 'Ruas movimentadas',
    myMachines: 'Minhas máquinas',
    zoomIn: 'Aproximar',
    zoomOut: 'Afastar',
  },
} satisfies Shape<typeof en>;
