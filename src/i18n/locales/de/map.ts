// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} Automat', other: '{city} · {n} Automaten' },
  placeHint: 'Tippe auf einen Standort, um diesen Automaten aufzustellen',
  backTo: 'Zurück nach {city}',
  a11y: {
    settings: 'Einstellungen',
    view3d: '3D-Ansicht',
    topDown: 'Draufsicht',
    busyStreets: 'Belebte Straßen',
    myMachines: 'Meine Automaten',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
  },
} satisfies Shape<typeof en>;
