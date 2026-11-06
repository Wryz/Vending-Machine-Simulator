/** Tab bar (keypad keys under the map) and the "new tab" announcements. */
export default {
  labels: {
    map: 'Map', // tab label, ~8 chars max
    keys: 'Keys', // tab label (the key ring of your machines), ~8 chars max
    routes: 'Routes', // tab label (restock routes), ~8 chars max
    orders: 'Orders', // tab label (daily orders = daily goals), ~8 chars max
    company: 'Company', // tab label, ~8 chars max
  },
  /** Toast title when a tab unlocks; {label} is the tab label. */
  newTab: 'New: {label}',
  unlockNote: {
    keys: 'All your machines on one key ring',
    routes: 'Plan restock runs with your van',
    orders: 'Daily orders pay bonus cash',
    company: 'Your chapter, money, upgrades and shop',
  },
} as const;
