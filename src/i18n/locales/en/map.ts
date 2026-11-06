/** Map tab (home): floating controls, hints and the globe. */
export default {
  /** Globe pin for the current city. */
  globePin: { one: '{city} · {n} machine', other: '{city} · {n} machines' },
  placeHint: 'Tap a spot to place this machine',
  backTo: 'Back to {city}',
  a11y: {
    settings: 'Settings',
    view3d: '3D view',
    topDown: 'Top-down view',
    busyStreets: 'Busy streets',
    myMachines: 'My machines',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
  },
} as const;
