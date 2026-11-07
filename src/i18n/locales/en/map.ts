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
  backTo: 'Back to {city}',
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
