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
  restockLow: 'Reponer máquinas bajas',
  lowRun: {
    title: { one: 'Reponer {n} máquina baja', other: 'Reponer {n} máquinas bajas' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items} artículos · {cost} · unos {time}',
    send: 'Enviar furgoneta',
    cancel: 'Ahora no',
    vansOut: 'Todas tus furgonetas están fuera',
  },
  backTo: 'Volver a {city}',
  areas: {
    hood: '{name}\nSe abre en el capítulo {n}',
    ring: 'Se abre en el capítulo {n}',
  },
  clockAhead: {
    title: 'El reloj de tu móvil iba adelantado',
    body: 'Tu ciudad espera a que la hora real la alcance, unos {time}. Después las máquinas vuelven a vender.',
  },
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
