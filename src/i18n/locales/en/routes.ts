/** Routes tab (route clipboard): van, drivers and their routes, auto-reorder. */
export default {
  title: 'Routes',
  emptyTitle: 'Route clipboard',
  noBusiness: 'No business is open.',
  /** Screen subtitle; counts of placed machines and drivers. */
  subtitle: '{machines} machines · {drivers} drivers',
  vans: {
    v0: 'Car boot', // vehicle level 0 (the trunk of your car)
    v1: 'Van',
    v2: 'Box van',
    v3: 'Truck',
  },
  vanLevel: 'Level {n}', // fallback vehicle name
  van: {
    section: 'Van',
    itemsPerTrip: 'Items per trip',
    chapterGoal: 'Chapter goal: buy a van',
    goal: 'Goal', // small chip
    buy: '{name} · {cost}', // button: next vehicle and its price
    buyHint: 'Upgrade: carries {n} items per trip',
    upgraded: 'Van upgraded',
  },
  drivers: {
    section: 'Drivers',
    clipboard: 'Routes', // title on the clipboard
    stopsPerRoute: 'Stops per route',
    runEvery: 'Run every (business hours)',
    hours: '{n} h', // small chip
    itemsPerDriver: 'Items per driver',
    wagePerDay: 'Wage per day',
    none: 'No drivers yet.',
    /** {state} is one of noRoute / nextRun / onTheRoad. */
    stops: '{stops}/{max} stops · {state}',
    noRoute: 'no route',
    nextRun: 'next run in {time}',
    onTheRoad: 'on the road',
    perDay: '{amount}/day',
    otherRoute: "on {name}'s route",
    placeFirst: 'Place machines on the map first.',
    done: 'Done',
    editRoute: 'Edit route',
    letGo: 'Let go', // button: fire a driver
    letGoHint: 'Fire {name}',
    unassigned: {
      one: '1 machine is not on a route.',
      other: '{n} machines are not on a route.',
    },
    hire: 'Hire · {cost}',
    hired: 'Driver hired',
    autoAssign: 'Auto-assign',
    autoAssignHint: 'Group nearby machines into routes',
    assigned: 'Routes assigned',
    needVan: 'Drivers need a van.',
    dailyWages: 'Daily wages {amount}',
  },
  fire: {
    title: 'Let {name} go?',
    body: 'Their route will be left without a driver.',
    confirm: 'Let {name} go',
    cancel: 'Cancel',
    done: '{name} has left',
  },
  stop: {
    a11y: '{machine} at {place}',
    a11yNote: '{machine} at {place}, {note}',
  },
  autoReorder: {
    title: 'Auto-reorder',
    onLabel: 'Drivers refill each coil to its par level',
    offLabel: 'Not researched yet',
    on: 'On', // small chip
    off: 'Off', // small chip
    research: 'Research · {cost}',
  },
} as const;
