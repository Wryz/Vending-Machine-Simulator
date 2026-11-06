/** The bottom tab bar (keypad) and its status strip (place, time, weather). */
export default {
  /** Badge on a tab that just unlocked. */
  newBadge: 'NEW', // tiny badge, ~4 chars max
  a11y: {
    /** {badge} is a count, e.g. "2". */
    tabReady: '{label}, {badge} ready',
    tabNew: '{label}, new',
    exploreCities: 'Explore other cities',
  },
} as const;
