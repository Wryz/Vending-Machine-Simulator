// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} distributeur', other: '{city} · {n} distributeurs' },
  placeHint: 'Touche un emplacement pour installer ce distributeur',
  /** The big key that starts placing a new machine. */
  placeKey: 'Placer un distributeur',
  placeKeyHint:
    'Trouve un endroit animé tout près et ouvre sa fiche. Tu peux aussi toucher n’importe où sur la carte.',
  placeLocked: 'Termine le chapitre 1 pour acheter plus de distributeurs',
  backTo: 'Retour à {city}',
  a11y: {
    van: 'Camionnette de livraison vers {venue}',
    store: '{store}, où ta camionnette charge',
    settings: 'Réglages',
    view3d: 'Vue 3D',
    topDown: 'Vue de dessus',
    busyStreets: 'Rues animées',
    myMachines: 'Mes distributeurs',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
  },
} satisfies Shape<typeof en>;
