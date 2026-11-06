/** First-machine tutorial cards over the map. */
export default {
  steps: {
    place: {
      title: 'Place your first machine',
      /** "The flame key" = the map button that shows foot traffic as a heat map. */
      line: 'Tap a busy street. The flame key shows where people walk.',
    },
    stock: {
      title: 'Stock it',
      /** "Fill" and "Restock" are button names in the machine sheet. */
      line: 'Tap your machine, then Fill and Restock.',
    },
    wait: {
      title: 'Wait for customers',
      line: 'Zoom in to watch people walk up and buy.',
    },
    collect: {
      title: 'Collect your cash',
      line: 'Tap your machine and empty the cash box.',
    },
    goal: {
      title: 'Your first goal',
      line: 'Earn {amount} in sales to finish chapter 1. The meter up top tracks it.',
    },
  },
  ok: 'OK', // small key button, ~4 chars max
  a11y: {
    gotIt: 'Got it',
    close: 'Close the tutorial',
  },
} as const;
