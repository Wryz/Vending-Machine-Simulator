// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} máquina', other: '{city} · {n} máquinas' },
  placeHint: 'Toca un sitio para colocar esta máquina',
  /** The big key that starts placing a new machine. */
  placeKey: 'Colocar máquina',
  placeKeyHint:
    'Busca un sitio concurrido cerca y abre su ficha. También puedes tocar cualquier punto del mapa.',
  placeLocked: 'Termina el capítulo 1 para comprar más máquinas',
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: 'Almacén',
  wholesale: 'Mayorista',
  backTo: 'Volver a {city}',
  a11y: {
    van: 'Furgoneta de reparto hacia {venue}',
    store: '{store}, donde carga tu furgoneta',
    settings: 'Ajustes',
    view3d: 'Vista 3D',
    topDown: 'Vista cenital',
    busyStreets: 'Calles concurridas',
    myMachines: 'Mis máquinas',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
  },
} satisfies Shape<typeof en>;
