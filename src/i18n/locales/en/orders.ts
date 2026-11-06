/** Orders tab: today's daily orders (goals), the streak and the trophy shelf. */
export default {
  title: 'Orders',
  streakLabel: 'Streak in days',
  streakValue: { one: '{n} day', other: '{n} days' }, // small chip
  streakBonusLabel:
    'Finish all three for a streak bonus, times the streak, up to {cap}. Miss a day and it starts again.',
  streakBonusValue: '{amount} × streak', // small chip
  empty: 'New orders arrive with the day.',
  progress: '{have} / {target}',
  claimed: 'Claimed',
  done: 'Done', // small chip
  claim: 'Claim', // button: collect an order's reward
  streakToast: {
    title: 'Day {n} streak',
    subtitle: 'All of today’s orders are done.',
  },
  trophies: 'Trophies {got}/{total}',
  a11y: {
    trophyUnlocked: '{title}: {desc}, unlocked',
    trophyLocked: '{title}: {desc}, locked',
  },
} as const;
