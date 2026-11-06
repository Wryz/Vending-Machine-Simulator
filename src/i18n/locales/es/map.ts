// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} máquina', other: '{city} · {n} máquinas' },
  placeHint: 'Toca un sitio para colocar esta máquina',
  backTo: 'Volver a {city}',
  a11y: {
    settings: 'Ajustes',
    view3d: 'Vista 3D',
    topDown: 'Vista cenital',
    busyStreets: 'Calles concurridas',
    myMachines: 'Mis máquinas',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
  },
} satisfies Shape<typeof en>;
