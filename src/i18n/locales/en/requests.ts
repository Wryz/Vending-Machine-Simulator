/**
 * Customer requests: a passer-by from a real place nearby asks one of your
 * machines for something. {place} is a real place name from map data.
 */
export default {
  /** Why they want it; one short spoken-style line. */
  reason: {
    thirsty: 'Just ate at {place}. So thirsty!',
    studying: 'Studying late at {place}. Need fuel!',
    dorm: 'Ran out of basics in the dorms by {place}.',
    charging: 'Phone’s dying near {place}!',
    afterSchool: 'School’s out at {place}. Snack time!',
    workout: 'Just worked out at {place}.',
    deadline: 'Big deadline at {place}.',
    visiting: 'Visiting someone at {place}.',
    patient: 'Just left {place}. Not feeling great.',
    travel: 'On the move at {place}.',
    game: 'Game day at {place}!',
    sunny: 'Out in the sun at {place}.',
    lateNight: 'Long night at {place}…',
    sweetTooth: 'Craving something sweet after {place}.',
    shopping: 'Shopping break from {place}.',
    forgot: 'Left mine behind at {place}!',
    home: 'Popping out from home nearby.',
  },
  /** Card in the machine sheet. */
  card: {
    label: 'Customer request',
    /** {product} = invented product name. */
    title: 'Wants {product}',
    /** Button: put the product in a coil of the restock plan. */
    load: 'Add to restock',
    // shown once the product is in the restock plan
    planned: 'In your restock plan. Order it to send a van.',
    // button: send the van now
    order: 'Order restock · {cost}',
    // a van with it is on its way; {time} like "1:05"
    coming: 'Waiting for delivery · about {time}',
    comingNote: 'They buy it as soon as the van arrives.',
    // a van without it is on its way
    vanBusy: 'A van is already on its way. Add it once it arrives.',
    // accessibility label of the X
    dismiss: 'Dismiss request',
    /** Time left before they give up, e.g. "8 min". */
    waiting: 'Waits {time}',
    tip: 'Tip {amount}',
    /** This machine can't sell it; {type} = machine type name. */
    otherMachine: 'This machine can’t sell it. Place a “{type}” within {m} m.',
    locked: 'Opens in chapter {n}.',
  },
  /** Moment when a request is served. */
  served: {
    label: 'Request served',
    title: '{product} at {venue}',
    subtitle: 'Sold, plus a tip',
  },
  a11y: {
    /** Bubble over a machine on the map. */
    bubble: 'Customer request: {product}. Tap to open the machine.',
  },
} as const;
