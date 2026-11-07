/** One machine's controls (src/ui/machine/MachinePanel.tsx), in the machine sheet and the 3D close-up. */
export default {
  statusLed: '● {status}', // LED line; {status} is already uppercased
  a11y: {
    status: 'Status: {status}',
    slot: 'Slot {slot}, {product}, {qty} of {cap}',
    slotEmpty: 'empty', // product name stand-in inside the slot label
    load: 'Load {product}',
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
    noTelemetry: 'No telemetry: stock shown from your last visit',
    techIn: 'Technician arrives in',
    suggested: 'Suggested price',
    wholesale: 'Wholesale cost',
    demand: 'Demand at this price',
    pricesLocked: 'Prices unlock after chapter 1',
    pricesLockedValue: 'Ch. 2', // short chip value, ~6 chars
    driverPar: 'Driver refills to',
    slots: 'Slots',
    power: 'Power per day',
    breakdowns: 'Breakdowns per day',
    theft: 'Theft risk',
    theftHigh: 'High', // theft risk level, ~5 chars
    theftMed: 'Med', // theft risk level (medium), ~5 chars
    theftLow: 'Low', // theft risk level, ~5 chars
    sold: 'Items sold',
    revenue: 'Revenue',
    upgrade: 'Upgrade',
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
      'A van brings it from the nearest store. Restocked machines sell {pct}% more for a business day',
    clear: 'Clear',
    clearHint: 'Clear the restock plan',
    more: 'More', // fold-out toggle
    less: 'Less', // fold-out toggle
    moreHint: 'Show specs and machine actions',
    rotate: 'Rotate', // one-word chip
    renegotiate: 'Renegotiate', // one-word chip
    pickUp: 'Pick up', // one-word chip: take the machine back to storage
  },
  emptyCoil: 'Empty coil',
  /** The restock van on its way (an order is delivered from the nearest store). */
  van: {
    title: 'Van on its way',
    /** {store} = a real supermarket name from map data. */
    from: 'From {store}',
    fromDepot: 'From your depot',
    eta: 'Here in {time}',
    loading: 'Loading at the store',
    a11y: 'Van on its way with {n} items, here in {time}',
  },
  /** Moment when the van arrives. */
  delivered: {
    label: 'Stock delivered',
    title: { one: '{n} item at {venue}', other: '{n} items at {venue}' },
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
    commission: 'Commission now {pct}',
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
} as const;
