/** Shared physical UI objects (src/ui/objects): coin tray, contract, key tags, permit card, sparkline. */
export default {
  coinTray: {
    empty: 'Cash box is empty',
    box: 'Box', // LED readout label, shown uppercase, ~6 chars max
    venue: 'Venue', // LED readout label (the venue's commission), shown uppercase, ~6 chars max
    youKeep: 'You keep', // LED readout label, shown uppercase, ~10 chars max
    a11y: {
      collected: 'Collected {amount}',
      summary: 'Cash box {gross}, venue commission {commission}, you keep {net}',
    },
  },
  contract: {
    header: 'LOCATION AGREEMENT', // small monospace header on a paper contract
    noCash: 'Not enough cash to sign',
    swipe: 'Swipe across to sign →',
    a11y: {
      line: 'Signature line. Swipe across to sign.',
      sign: 'Sign',
    },
  },
  keyTag: {
    a11y: '{name} at {place}, {status}',
  },
  /** Machine status, shown on key tags and as an LED line (uppercased). Keep short, ~14 chars. */
  status: {
    ok: 'Running',
    low: 'Low stock',
    empty: 'Empty',
    cashFull: 'Cash box full',
    broken: 'Broken',
    stored: 'In storage',
    unknown: 'No telemetry',
  },
  permit: {
    office: 'CITY LICENSING OFFICE', // small monospace header on a permit card
    valid: 'VALID', // stamp, ~10 chars
    notHeld: 'NOT HELD', // stamp, ~10 chars
  },
  sparkline: {
    a11y: 'Customers by hour',
  },
} as const;
