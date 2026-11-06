// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} distributeur', other: '{city} · {n} distributeurs' },
  placeHint: 'Touche un emplacement pour installer ce distributeur',
  backTo: 'Retour à {city}',
  a11y: {
    settings: 'Réglages',
    view3d: 'Vue 3D',
    topDown: 'Vue de dessus',
    busyStreets: 'Rues animées',
    myMachines: 'Mes distributeurs',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
  },
} satisfies Shape<typeof en>;
