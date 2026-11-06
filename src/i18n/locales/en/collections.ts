/** Collection binder screen (app/(game)/collections.tsx). Series and item names come from content.*. */
export default {
  title: 'Collections',
  noGame: 'No business is open.',
  subtitle: { one: '{n} item collected', other: '{n} items collected' },
  rarity: {
    common: 'Common', // rarity tier, short
    uncommon: 'Uncommon', // rarity tier, short
    rare: 'Rare', // rarity tier, short
    ultra: 'Ultra', // rarity tier (rarest), short
  },
  reveal: {
    a11y: 'You got {item}, {rarity}',
    a11yNew: 'You got {item}, {rarity}, new',
    isNew: '{rarity} · New', // the capsule item was not owned before
    duplicate: '{rarity} · Duplicate',
  },
  perkDone: 'Complete. +{pct} sales for {family} machines.',
  perkGoal: 'Complete the set for +{pct} sales on {family} machines.',
  a11y: {
    owned: '{item}, {rarity}, {n} owned',
    missing: 'Number {n}, not found yet',
  },
  section: {
    pulls: 'Pulls', // capsule pulls (opening a capsule)
    odds: 'Odds',
  },
  buyPull: 'Buy a pull · {price}', // button; "pull" = open one capsule
  locked:
    'Buying pulls unlocks in chapter 3 (LLC). Capsule machines can still drop a free pull when you collect their cash.',
  freePull: {
    one: 'Free pull · watch an ad ({n} left today)',
    other: 'Free pull · watch an ad ({n} left today)',
  },
  noFreePulls: 'No free pulls left today',
  freePullHint: 'Optional. Plays a short ad, then opens one capsule.',
  capsuleDrop:
    'Capsule machines also drop a free pull {pct} of the time when you collect their cash.',
  oddsNote:
    'Each pull picks a rarity with these odds, then an item of that rarity at random. Pulls use in-game money only.',
  noReward: 'No reward this time.',
} as const;
