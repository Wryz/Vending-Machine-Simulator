/**
 * The guided first-machine tutorial (cards over the map, lines inside the
 * sheets) and one-time screen tips. Plain, short sentences for young and older
 * players; name buttons exactly as they read in the app.
 */
export default {
  steps: {
    place: {
      title: 'Place your first machine',
      /** "The flame key" = the map button that shows foot traffic as a heat map. */
      line: 'Busy streets sell more. Tap the flame key to see them, or let us pick a spot.',
      /** Key on the card: picks a good spot near the map's center and opens it. */
      action: 'Show me a good spot',
      actionHint: 'Finds a busy spot nearby and opens its card',
    },
    stock: {
      title: 'Fill it with snacks',
      line: 'Your machine is empty. Open it and load snacks from your van.',
      action: 'Open my machine',
      actionHint: 'Opens your machine’s card',
    },
    wait: {
      title: 'Wait for customers',
      line: 'People walking by will stop and buy. Zoom in to watch them!',
      action: 'Watch my machine',
      actionHint: 'Zooms the map in on your machine',
    },
    collect: {
      title: 'Collect your coins',
      line: 'You made a sale! Open your machine and take the coins.',
      action: 'Open my machine',
      actionHint: 'Opens your machine’s card',
    },
    goal: {
      title: 'Your first goal',
      line: 'Earn {amount} in sales to finish chapter 1. The meter up top tracks it.',
    },
  },
  /** Lines inside the sheets that say what to press next ("Fill", "Restock", "Collect" are button names). */
  guide: {
    spotGood: 'Good spot! Put your machine here.',
    /** Key on that line, ~8 chars max. */
    placeKey: 'Place',
    spotQuiet: 'Few people walk here. Pull this down and try a busier street.',
    sign: 'Scroll down and swipe your finger along the line to sign.',
    fill: 'Tap Fill to load snacks from your van.',
    restock: 'Now tap Restock to put them in.',
    wait: 'All set! Close this and watch customers walk up.',
    collect: 'Tap Collect to take your coins.',
  },
  /** One-time tips the first time a screen opens. */
  tips: {
    keys: {
      title: 'Your key ring',
      line: 'Every machine you own is here. Tap one to fly to it.',
    },
    routes: {
      title: 'Your van and drivers',
      line: 'A bigger van restocks more at once. Later, drivers do the rounds for you.',
    },
    orders: {
      title: 'Daily orders',
      line: 'Three small jobs a day for bonus cash. Finish all three to build a streak.',
    },
    company: {
      title: 'Your company',
      line: 'Your chapter goal, money in and out, and upgrades for all your machines.',
    },
    rankings: {
      title: 'Top operators',
      line: 'See how your sales compare with the other vending companies in town.',
    },
  },
  ok: 'OK', // small key button, ~4 chars max
  a11y: {
    gotIt: 'Got it',
    close: 'Close the tutorial',
    step: 'Step {n} of {total}',
  },
} as const;
