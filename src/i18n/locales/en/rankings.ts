/** City ranking board (app/(game)/rankings.tsx), its map chip and its moment. Operator names are proper nouns and are not translated. */
export default {
  title: 'Top operators',
  /** Marquee subtitle: the city's name. */
  subtitle: 'This week in {city}',
  you: 'You',
  rivalTag: 'Rival',
  /** Board status line. */
  day: 'Day {n} of 7 · updates at midnight',
  final: 'Final standings · new week starts today',
  preview: 'Live preview · first ranking at midnight',
  /** Under the big rank number. */
  of: 'of {n}',
  overnightUp: { one: 'Up {n} place overnight', other: 'Up {n} places overnight' },
  overnightDown: { one: 'Down {n} place overnight', other: 'Down {n} places overnight' },
  overnightSame: 'Same place as last night',
  /** "You climbed from #6 to #4 overnight". */
  climbed: 'You climbed from #{from} to #{to} overnight',
  thisWeek: 'Your sales this week',
  /** Live distance to the next operator up. */
  toPass: '{amount} more to pass {name}',
  leading: 'You lead the city. Keep it up!',
  lastWeek: 'Last week: #{rank} of {n}',
  howItWorks: 'Ranked by sales since Monday. The board updates every night at midnight, city time.',
  a11y: {
    row: '{rank}. {name}: {amount}',
    chip: 'City rank {rank} of {n}. Opens the ranking board.',
  },
  moment: {
    label: 'City ranking',
    passed: 'You passed {name}!',
    top: "You're #1 in {city}!",
    rank: '#{rank} in {city}',
  },
  company: {
    section: 'City ranking',
    open: 'Open the board',
    none: 'The first ranking comes at midnight.',
  },
} as const;
