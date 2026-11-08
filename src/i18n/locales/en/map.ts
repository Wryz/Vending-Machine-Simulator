/** Map tab (home): floating controls, hints and the globe. */
export default {
  /** Globe pin for the current city. */
  globePin: { one: '{city} · {n} machine', other: '{city} · {n} machines' },
  placeHint: 'Tap a spot to place this machine',
  /** The big key that starts placing a new machine. */
  placeKey: 'Place machine',
  placeKeyHint:
    'Finds a busy spot nearby and opens its card. You can also tap anywhere on the map.',
  placeLocked: 'Finish chapter 1 to buy more machines',
  /** Pin label where a delivery van loads (no name in the map data). */
  warehouse: 'Warehouse',
  wholesale: 'Wholesaler',
  restockLow: 'Restock low machines',
  lowRun: {
    title: { one: 'Restock {n} low machine', other: 'Restock {n} low machines' },
    /** {items} units, {cost} money, {time} like "1:10". */
    detail: '{items} items · {cost} · about {time}',
    send: 'Send van',
    cancel: 'Not now',
    vansOut: 'All your vans are out',
  },
  backTo: 'Back to {city}',
  areas: {
    hood: '{name}\nOpens in chapter {n}', // map tag on a locked neighbourhood: its name, then the chapter that opens it
    ring: 'Opens in chapter {n}', // map tag just outside the open ring (cities without neighbourhood names)
  },
  a11y: {
    van: 'Delivery van to {venue}',
    store: '{store}, where your van loads',
    settings: 'Settings',
    view3d: '3D view',
    topDown: 'Top-down view',
    busyStreets: 'Busy streets',
    myMachines: 'My machines',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
  },
} as const;
