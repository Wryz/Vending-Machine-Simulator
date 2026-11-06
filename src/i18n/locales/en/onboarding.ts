/** Onboarding: cold open, intro cards, location ask and the city picker. */
export default {
  coldOpen: {
    /** Marquee subtitle under the app name (Coinline stays as-is). */
    subtitle: 'Vending Machine Simulator',
    /** Spoken label of the LED clock: "{city}, {time}". */
    clockA11y: '{city}, {time}',
    tagline: 'One used machine. $250. A whole city.',
    /** Button: start the game ("insert a coin" into the vending machine). */
    insertCoin: 'Insert coin',
    insertCoinHint: 'Start your vending business',
  },
  intro: {
    /** Marquee title, ~16 chars max. */
    title: 'How it works',
    streetsTitle: 'Real streets',
    streetsLine:
      'Place vending machines at real places in real cities, where people actually walk.',
    stockTitle: 'Stock, price, collect',
    stockLine: 'Fill your machines, set fair prices, and watch customers walk up and buy.',
    empireTitle: 'Side hustle to empire',
    empireLine: 'Grow from one used machine to vans, drivers and a whole city.',
    next: 'Next',
    letsGo: "Let's go",
    skip: 'Skip',
  },
  location: {
    title: 'Where to start?',
    nearTitle: "You're near {city}",
    nearBody: 'Build your business on the streets around you.',
    farTitle: "Your area isn't on the map yet",
    /** {km} is already formatted (e.g. "1,840"). */
    farBody: 'The closest city is {city}, {km} km away. More cities are coming.',
    offTitle: 'Location is off for Coinline',
    offBody: 'Turn on location in Settings, or pick a city yourself.',
    startTitle: 'Start near you',
    /** Chips: label + short value (value ~10 chars max). */
    approxLabel: 'Approximate location only',
    approxValue: '~1 km',
    notStoredLabel: 'Your location is never stored',
    notStoredValue: 'Not stored',
    onceLabel: 'Used once, to pick your city',
    onceValue: 'Once',
    startIn: 'Start in {city}',
    openSettings: 'Open Settings',
    useMyLocation: 'Use my location',
    useMyLocationHint:
      'Uses your approximate location once to find the closest city. It is never stored.',
    exploreCities: 'Explore cities',
    notFound: "We couldn't find your location just now. Pick a city to start.",
    /** Fallback name for the player's own playable area. */
    yourArea: 'Your area',
    loadFailed: 'Could not load that city.',
  },
  preview: {
    subtitle: 'Preview',
    localTime: 'Real local time',
    hasBusiness: 'You have a business here',
    freshStart: 'A fresh start',
    /** Chip values, ~8 chars max. */
    saved: 'Saved',
    new: 'New',
    switchNote: 'You can switch cities any time from the map. Each city keeps its own business.',
    continueIn: 'Continue in {city}',
    startIn: 'Start in {city}',
    back: 'Back to cities',
  },
  picker: {
    title: 'Explore cities',
    subtitle: 'Tap a city to look around',
    /** Spoken label of a city row. */
    rowA11y: '{city}, local time {time}',
    rowA11ySaved: '{city}, local time {time}, saved',
    rowHint: 'Preview this city',
    saved: 'Saved',
  },
} as const;
