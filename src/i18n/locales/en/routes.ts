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
    desc: 'Your own restocks: you plan them, and your vehicle loads at the warehouse and drives them to the machine.',
    levelOf: 'Level {n} of {max}', // {n} current level, {max} top level
    seeUpgrades: 'See all upgrades',
    hideUpgrades: 'Hide upgrades',
    items: '{n} items',
    runs: '{n} at once', // vans on the road at once
    current: 'Current',
    owned: 'Owned',
    section: 'Van',
    itemsPerTrip: 'Items per trip',
    chapterGoal: 'Chapter goal: buy a van',
    goal: 'Goal', // small chip
    buy: '{name} · {cost}', // button: next vehicle and its price
    buyHint: 'Upgrade: carries {n} items per trip',
    upgraded: 'Van upgraded',
  },
  drivers: {
    desc: 'Drivers run a route for you in their own van: they restock and collect each machine on their own.',
    section: 'Drivers',
    clipboard: 'Routes', // title on the clipboard
    stopsPerRoute: 'Stops per route',
    runEvery: 'Run every (business hours)',
    hours: '{n} h', // small chip
    itemsPerDriver: 'Items per driver',
    wagePerDay: 'Wage per day (owned van)',
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
    hired: 'Driver hired',
    autoAssign: 'Auto-assign',
    rentChip: 'Rent for {time}',
    rent: 'Rent · {cost}',
    rentHint: 'A driver with a van for {time}; extend any time',
    own: 'Buy van · {cost}',
    ownHint: 'A driver with a van of your own, for good (daily wage)',
    parked: 'van parked',
    owned: 'Van owned',
    rentedLeft: 'Rented · {time} left',
    rentEnded: 'Rental ended · extend to drive again',
    extend: 'Extend · {cost}',
    extendHint: 'Keep {name} driving for {time} more',
    extended: 'Rental extended',
    buyVan: 'Keep · {cost}',
    buyVanHint: "Buy {name}'s van for good",
    vanBought: 'The van is yours for good',
    autoAssignHint: 'Group nearby machines into routes',
    assigned: 'Routes assigned',
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
    desc: "Drivers normally fill every coil to the top. With this, they fill each coil only to the par level you set, so slow sellers don't tie up cash and van space.",
    title: 'Auto-reorder',
    onLabel: 'Drivers refill each coil to its par level',
    offLabel: 'Not researched yet',
    on: 'On', // small chip
    off: 'Off', // small chip
    research: 'Research · {cost}',
  },
} as const;
