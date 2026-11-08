/** Company tab layout: collapsible sections, chapter requirements, the finance board and the More keys. */
export default {
  section: {
    /** VoiceOver hint on a collapsible section header. */
    hintOpen: 'Hides this section',
    hintClosed: 'Shows this section',
  },
  chapter: {
    /** Heading over the current chapter's requirements. */
    requirements: 'Requirements to level up',
    toReach: 'To reach chapter {n}',
    /** Collapsible block: what finishing the chapter unlocks. */
    rewards: 'Unlocks when you finish this chapter',
    last: 'Last chapter: sell the company when you are ready.',
    /** Hint under the row of chapter numbers. */
    stepsHint: 'Tap a number to see that chapter',
    stepHint: 'Shows the goal and unlocks of this chapter',
  },
  chapterSheet: {
    title: 'Chapter {n}',
    done: 'Done', // small chip
    current: 'Current', // small chip
    locked: 'Ahead', // small chip: a chapter not reached yet
    goal: 'Goal',
    unlocks: 'Unlocks',
    unlocked: 'Unlocked',
    close: 'Close',
  },
  finances: {
    cash: 'Cash',
    cashDesc: 'Money on hand',
    netToday: 'Net today',
    netTodayDesc: 'In − out today',
    inToday: 'In today',
    inTodayDesc: 'Sales and rewards',
    outToday: 'Out today',
    outTodayDesc: 'Stock, rent, wages…',
    netYesterday: 'Net yesterday',
    netYesterdayDesc: 'Whole day',
    lifetimeSales: 'All-time sales',
    lifetimeSalesDesc: 'Since you started',
    lifetimeCosts: 'All-time costs',
    lifetimeCostsDesc: 'Since you started',
    unitsSold: 'Items sold',
    unitsSoldDesc: 'All time',
    breakdown: 'Today by category',
    noActivity: 'No activity yet today',
  },
  more: {
    research: 'Research',
    rankings: 'City ranking',
    globalRanking: 'Global ranking',
    prestige: 'Prestige',
    trophies: 'Trophies',
  },
  trophies: {
    title: 'Trophies',
    subtitle: '{got} of {total} unlocked',
    waiting: 'Rewards waiting',
    claim: 'Claim {amount}',
    claimed: 'Claimed {amount}',
  },
} as const;
