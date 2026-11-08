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
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: 'Entrepôt',
  wholesale: 'Grossiste',
  restockLow: 'Remplir les distributeurs bas',
  lowRun: {
    title: { one: 'Remplir {n} distributeur bas', other: 'Remplir {n} distributeurs bas' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items} articles · {cost} · environ {time}',
    send: 'Envoyer',
    cancel: 'Pas maintenant',
    vansOut: 'Toutes tes camionnettes sont parties',
  },
  backTo: 'Retour à {city}',
  areas: {
    hood: '{name}\nOuvre au chapitre {n}',
    ring: 'Ouvre au chapitre {n}',
  },
  clockAhead: {
    title: 'L\'horloge de ton téléphone avançait',
    body: 'Ta ville attend que l\'heure réelle la rattrape, environ {time}. Ensuite les machines revendent.',
  },
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
