// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/map';

export default {
  globePin: { one: '{city} · {n} Automat', other: '{city} · {n} Automaten' },
  placeHint: 'Tippe auf einen Standort, um diesen Automaten aufzustellen',
  /** The big key that starts placing a new machine. */
  placeKey: 'Automat aufstellen',
  placeKeyHint:
    'Sucht einen belebten Platz in der Nähe und öffnet seine Karte. Du kannst auch irgendwo auf die Karte tippen.',
  placeLocked: 'Schließe Kapitel 1 ab, um mehr Automaten zu kaufen',
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: 'Lager',
  wholesale: 'Großhändler',
  restockLow: 'Knappe Automaten auffüllen',
  lowRun: {
    title: { one: '{n} knappen Automaten auffüllen', other: '{n} knappe Automaten auffüllen' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items} Artikel · {cost} · etwa {time}',
    send: 'Losschicken',
    cancel: 'Nicht jetzt',
    vansOut: 'Alle Lieferwagen sind unterwegs',
  },
  backTo: 'Zurück nach {city}',
  areas: {
    hood: '{name}\nAb Kapitel {n}',
    ring: 'Ab Kapitel {n} offen',
  },
  clockAhead: {
    title: 'Die Uhr deines Handys ging vor',
    body: 'Deine Stadt wartet, bis die echte Zeit aufholt, etwa {time}. Danach verkaufen die Automaten wieder.',
  },
  a11y: {
    van: 'Lieferwagen zu {venue}',
    store: '{store}, hier lädt dein Lieferwagen',
    settings: 'Einstellungen',
    view3d: '3D-Ansicht',
    topDown: 'Draufsicht',
    busyStreets: 'Belebte Straßen',
    myMachines: 'Meine Automaten',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
  },
} satisfies Shape<typeof en>;
