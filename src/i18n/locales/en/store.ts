/** Messages from the game store when an action cannot run. */
export default {
  stillCounting: 'Still counting coins.',
  noGame: 'No game loaded.',
  /** Why a city could not load (shown on onboarding / the city list). */
  load: {
    noApi: 'Data API is not configured.',
    badPack: 'Unsupported region pack.',
    /** {id} is a city id, e.g. "tokyo". */
    noPack: 'No bundled pack for {id}',
    /** {status} is an HTTP status code, e.g. 503. */
    http: 'HTTP {status}',
  },
} as const;
