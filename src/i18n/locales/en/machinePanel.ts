/** One machine's controls (src/ui/machine/MachinePanel.tsx), in the machine sheet and the 3D close-up. */
export default {
  statusLed: '● {status}', // LED line; {status} is already uppercased
  a11y: {
    status: 'Status: {status}',
    slot: 'Slot {slot}, {product}, {qty} of {cap}',
    slotEmpty: 'empty', // product name stand-in inside the slot label
    load: 'Load {product}',
    replaceWith: 'Replace {from} with {product}',
    topUp: 'Top up {product}',
    close: 'Close',
    lowerPrice: 'Lower price',
    raisePrice: 'Raise price',
    lowerPar: 'Lower driver par level',
    raisePar: 'Raise driver par level',
  },
  stats: {
    cashBox: 'Cash box',
    commission: 'Venue commission',
    contract: 'Contract',
    renewing: 'renewing', // contract time left when it is renewing now
    mood: 'Venue mood {pct}%',
    moodLabel: 'Venue mood',
    noTelemetry: 'No telemetry: stock shown from your last visit',
    techIn: 'Technician arrives in',
    suggested: 'Suggested price',
    wholesale: 'Wholesale cost',
    demand: 'Demand at this price',
    pricesLocked: 'Price changes',
    driverPar: 'Driver refills to',
    slots: 'Capacity (items it holds)',
    coils: 'Slots (of the most)',
    power: 'Power cost per day',
    breakdowns: 'Breakdown odds per day',
    theft: 'Theft risk',
    theftHigh: 'High', // theft risk level, ~5 chars
    theftMed: 'Med', // theft risk level (medium), ~5 chars
    theftLow: 'Low', // theft risk level, ~5 chars
    sold: 'Items sold, all time',
    revenue: 'Sales, all time',
    upgrade: 'Upgrade installed',
    // when this machine was placed (city local time)
    placed: 'Placed',
    // a locked stat: the chapter that opens it, ~10 chars
    chapter: 'Chapter {n}',
  },
  broken: {
    fridge: 'Fridge broken',
    coil: 'Coil jammed',
    fix: 'Fix · {cost}',
  },
  actions: {
    collect: 'Collect {amount}',
    collected: 'Collected',
    fill: 'Fill', // short button: plan a full restock
    fillHint: 'Plan a full restock from the van, up to {n} items',
    adRestock: 'Instant restock (ad)',
    adRestockHint: 'Watch an ad for an instant restock',
    restock: 'Restock {n} · {cost}', // button; {n} = units
    restockHint:
      'A van brings it from the nearest warehouse. Restocked machines sell {pct}% more for a business day',
    clear: 'Clear',
    clearHint: 'Clear the restock plan',
    more: 'More', // fold-out toggle
    less: 'Less', // fold-out toggle
    moreHint: 'Show specs and machine actions',
    pickUp: 'Pick up', // one-word chip: take the machine back to storage
  },
  /** The restock van on its way (an order is delivered from the nearest store). */
  van: {
    title: 'Van on its way',
    /** {store} = a warehouse or wholesaler name from map data. */
    from: 'From {store}',
    fromDepot: 'From the warehouse',
    eta: 'Here in {time}',
    loading: 'Loading at the warehouse',
    driverTitle: "{name}'s van on its way",
    otherStops: 'Making another stop first',
    a11y: 'Van on its way with {n} items, here in {time}',
  },
  /** Moment when the van arrives. */
  delivered: {
    label: 'Stock delivered',
    title: { one: '{n} item at {venue}', other: '{n} items at {venue}' },
    titleRun: { one: '{n} machine restocked', other: '{n} machines restocked' },
    subtitle: 'Fresh stock sells {pct}% more today',
  },
  toast: {
    pull: 'Free collectible pull found in the cash box.',
    vanFull: 'Your van holds {n} items per trip.',
    slotFull: 'That slot is full.',
    restocked: { one: 'Restocked {n} item', other: 'Restocked {n} items' },
    adRestocked: 'Restocked.',
    ordered: 'Van on its way · here in {time}',
    repaired: 'Repaired',
  },
  pickUp: {
    title: 'Pick up this machine?',
    body: 'It goes back to storage; the contract ends.',
    confirm: 'Pick up',
    cancel: 'Cancel',
  },
  /** Short durations: "45 m", "12 h", "3 d". */
  duration: {
    min: '{n} m',
    hour: '{n} h',
    day: '{n} d',
  },
  picker: {
    coil: 'COIL {code}',
    replacing: 'Replacing {product}: pick the new item',
    swapping: 'Replacing {from} with {to}',
    filling: 'Filling this coil with {product}',
    empty: 'Empty coil: pick an item',
    now: 'NOW',
    new: 'NEW',
    newBadge: 'NEW',
    inCoil: 'IN COIL',
  },
  rows: {
    add: '{n} slots · {cost}',
    addHint: 'Machine upgrade, yours for good: {n} of {max} slots',
    added: 'Machine upgraded: {n} slots',
  },
} as const;
