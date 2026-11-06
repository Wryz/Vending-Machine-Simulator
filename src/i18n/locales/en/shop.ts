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
      detail: 'Van upgrade, two snack machines and $2,000 cash. Offered once after chapter 1.',
    },
    wrapNight: {
      title: 'Night Shift wrap',
      detail: 'A dark, quiet machine wrap. Cosmetic.',
    },
    wrapLinen: {
      title: 'Linen wrap',
      detail: 'Warm off-white wrap. Cosmetic.',
    },
    lightingWarm: {
      title: 'Warm lighting pack',
      detail: 'Sodium-warm product lighting at night. Cosmetic.',
    },
  },
  owned: 'Owned',
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
    looks: 'Looks', // cosmetics (wraps, lighting)
    rewards: 'Free rewards',
  },
  looksNote: "Apply wraps and lighting from a machine's close-up. Cosmetic only.",
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
