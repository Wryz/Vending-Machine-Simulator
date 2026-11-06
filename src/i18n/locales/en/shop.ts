/** Shop screen (app/(game)/shop.tsx). Prices come from the store and are not translated. */
export default {
  title: 'Shop',
  subtitle: 'One-time purchases. No subscriptions.',
  /** Our own product copy (src/services/purchases.ts), keyed by product key. */
  products: {
    removeAds: {
      title: 'Remove Ads + longer breaks',
      detail: 'Hides ad offers and raises the offline cap by 25%.',
    },
    starterPack: {
      title: 'Starter Pack',
      detail: 'Van upgrade, two snack machines and {amount} cash. Offered once after chapter 1.',
    },
    doubleProfits: {
      title: 'Double Profits',
      detail: 'Every sale pays double, forever.',
    },
  },
  owned: 'Owned',
  doubleProfitsNote: 'Every machine, every city. Chapter goals count regular sales.',
  buy: 'Buy · {price}', // button
  starterAdded: 'Starter Pack added. Two snack machines are in storage.',
  starterPending: 'Purchase recorded. Open a city to receive the Starter Pack.',
  yours: '{title} is yours.',
  restored: 'Purchases restored.',
  restoreFailed: 'Could not restore purchases.',
  noReward: 'No reward this time.',
  doubled: {
    one: 'Earnings doubled for {n} minute.',
    other: 'Earnings doubled for {n} minutes.',
  },
  noStore: "The store isn't available in this build.",
  noStoreBody: 'Everything in the game can be earned by playing.',
  section: {
    purchases: 'Purchases',
    rewards: 'Free rewards',
  },
  doubleTitle: {
    one: 'Double earnings for {n} minute',
    other: 'Double earnings for {n} minutes',
  },
  doubleNote: 'Optional. A short ad plays only when you tap.',
  active: 'Active · {time} left',
  addMinutes: {
    one: 'Add {n} minute · watch an ad',
    other: 'Add {n} minutes · watch an ad',
  },
  watchAd: 'Watch an ad',
  restore: 'Restore purchases',
} as const;
