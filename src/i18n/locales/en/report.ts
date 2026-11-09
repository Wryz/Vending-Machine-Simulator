/** "While you were away…" offline report receipt (app/(game)/report.tsx). */
export default {
  title: 'While you were away…',
  /** Headline; {time} like "2 h 10 min". */
  awayFor: 'You were away {time}',
  /** Label over the cash sitting in the machines' cash boxes. */
  inMachines: 'Waiting in your machines',
  /** Main button: empty every machine's cash box. */
  collect: 'Collect {amount}',
  collected: 'Collected {amount}',
  nothing: 'Nothing to report.',
  done: 'Done',
  soldMachine: 'A machine you sold',
  aMachine: 'A machine',
  more: '· and {n} more', // receipt list overflow line
  line: {
    sales: 'Sales', // receipt line, short
    items: 'Items sold', // receipt line, short
    costs: 'Costs', // receipt line, short
    driverRuns: 'Driver runs', // receipt line, short
    breakdowns: 'Breakdowns', // receipt line, short
    thefts: 'Thefts', // receipt line, short
    spoiled: 'Spoiled items', // receipt line, short
  },
  cashChange: 'Cash change', // receipt total line
  footerCapped: 'Offline cap reached. {time} not counted.',
  footerThanks: 'Thank you for your business.',
  bestSpots: 'Best spots', // receipt heading, short
  issue: {
    empty: 'Went empty', // receipt heading: machines that sold out
    cashFull: 'Cash box full', // receipt heading
    contractsLost: 'Contracts lost', // receipt heading
    events: 'Local events', // receipt heading
    chapters: 'Chapters completed', // receipt heading
  },
  chapterLine: '{n}. {title}',
  lostNote: 'Machines from lost contracts are back in storage. Place them from the key ring.',
  double: 'Double it · watch an ad (+{amount})',
  doubleHint: 'Optional. Plays a short ad, then adds the same amount again.',
  noReward: 'No reward this time.',
  added: 'Added {amount}',
} as const;
