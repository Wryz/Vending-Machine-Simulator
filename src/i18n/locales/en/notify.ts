/**
 * Local notifications (src/services/notifications.ts, projected by
 * src/sim/projections.ts). Titles are short banner headlines.
 * {type} = machine type name, {venue} = a real place name (keep as is).
 */
export default {
  machineEmpty: {
    title: 'Machine empty', // notification title, short
    body: 'Your {type} at {venue} has sold out.',
  },
  cashFull: {
    title: 'Cash box full', // notification title, short
    body: 'Collect cash at {venue}.',
  },
  event: {
    title: 'Local event starting nearby', // notification title, short
    body: '{event} at {venue}.',
  },
} as const;
