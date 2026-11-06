/** Company tab: chapters, finances, staff, permits, research, market share, prestige. */
export default {
  title: 'Company',
  noBusiness: 'No business is open.',
  subtitle: 'Coinline · {city}', // Coinline is the app/company name, do not translate
  chapter: {
    section: 'Chapter {n}',
    prestige: 'Prestige', // title shown after the last chapter
    sales: 'Sales',
    machinesRunning: 'Machines running',
    van: 'Van',
    drivers: 'Drivers',
    share: 'Your share vs {rival}', // {rival} is the rival company name
    count: '{have} / {need}',
    unlocksNext: 'Unlocks next',
    stepDone: 'Chapter {n}, {title}, done',
    stepCurrent: 'Chapter {n}, {title}, current',
    step: 'Chapter {n}, {title}',
  },
  finances: {
    section: 'Finances',
    cash: 'Cash',
    lifetimeSales: 'Lifetime sales',
    unitsSold: 'Units sold',
    lifetimeCosts: 'Lifetime costs',
    today: 'Today', // receipt title
    yesterday: 'Yesterday', // receipt title
    noActivity: 'No activity yet',
    net: 'Net', // receipt total line
  },
  staff: {
    section: 'Staff and warehouse',
    machinesPlaced: 'Machines placed',
    inStorage: 'In storage',
    drivers: 'Drivers',
    wagesPerDay: 'Wages per day',
    routes: 'Routes',
  },
  warehouse: {
    title: 'Warehouse',
    offWholesale: 'Off wholesale',
    discount: '−{pct}', // unicode minus, small chip
    driverLoad: 'Driver load',
    rentPerDay: 'Rent per day',
    owned: 'Owned',
    yours: 'Yours', // small chip
    buy: 'Buy · {cost}',
    bought: 'Warehouse bought',
  },
  permits: {
    section: 'Permits',
    liquor: 'Liquor permit',
    notAllowed: 'Alcohol vending is not allowed in this city.',
    detail: 'Beer and wine machines. Keep 300 m from schools and youth places.',
    apply: 'Apply · {cost}',
    granted: 'Liquor permit granted',
  },
  research: {
    section: 'Research',
    perFamily: '{cost}/family', // price per machine family
    unlocksIn: 'Unlocks in chapter {n}',
    chapterShort: 'Ch. {n}', // small chip, abbreviation of "Chapter"
    researched: 'Researched',
    done: 'Done', // small chip
    buy: 'Research · {cost}',
    doneToast: 'Researched {name}',
    familyToast: '{name}: {family}',
    noMachines: 'No machines of this kind yet',
    familyDone: '{family}, researched',
    familyHint: 'Research for {family}',
    familyDoneLabel: '{family} ✓',
  },
  market: {
    section: 'Market share',
    you: 'You',
    rival: { one: '{rival} · {n} machine', other: '{rival} · {n} machines' },
  },
  prestige: {
    section: 'Prestige',
    valuation: 'Valuation',
    repFromSale: 'Reputation from a sale',
    repBanked: 'Reputation banked',
    companiesSold: 'Companies sold',
    keep: 'Keep the company',
    sell: 'Sell the company',
    restartIn: 'Restart in {city}',
    maxed: 'Maxed',
    max: 'Max', // small chip
    buyPerk: 'Buy · {cost} Reputation',
    perkToast: '{name} level {n}',
  },
  sell: {
    title: 'Sell the company?',
    body: 'You bank {rep} Reputation and restart in {target} with your perks. This business in {city} is sold.',
    bodyReplacing:
      'You bank {rep} Reputation and restart in {target} with your perks. Your saved business in {target} will be replaced. This business in {city} is sold.',
    cancel: 'Cancel',
    confirm: 'Sell',
  },
  more: {
    section: 'More',
    collections: 'Collections',
    cities: 'Cities',
    shop: 'Shop',
    settings: 'Settings',
  },
} as const;
