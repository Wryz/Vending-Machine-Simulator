/** City switcher screen (app/(game)/cities.tsx). City names come from content.cities. */
export default {
  title: 'Cities',
  subtitle: 'Each city keeps its own business',
  section: {
    current: 'Current city',
    area: 'Your area', // the player's own local area (from location), not a fixed city
    cities: 'Cities',
  },
  chapterMachines: {
    one: 'Chapter {chapter} · {n} machine',
    other: 'Chapter {chapter} · {n} machines',
  },
  label: {
    saved: 'Saved', // small status label, ~10 chars
    current: 'Current', // small status label, ~10 chars
    newSave: 'New save', // small status label, ~10 chars
  },
  a11y: {
    row: '{name}, local time {time}, {label}',
    switchHint: 'Switch to this city',
  },
  openFailed: 'Could not open that city.',
  confirm: {
    startTitle: 'Start in {name}?',
    goTitle: 'Go to {name}?',
    startBody: 'A new business with a fresh save. Your progress in {current} stays saved.',
    goBody: 'Your progress in {current} is saved first.',
    thisCity: 'this city', // fills {current} when no city is open
    cancel: 'Cancel',
    start: 'Start', // button: start a new save
    go: 'Go', // button: travel to a saved city
    branchTitle: 'Open a branch in {name}?',
    branchBody: 'Your company\'s cash, chapter and research come with you, and {current} keeps trading while you\'re away.',
    branch: 'Open branch',
    lockedTitle: 'Branches open in chapter {n}',
    lockedBody: 'From chapter {n}, every city you open is a branch of one company. Until then, {name} would be a separate business with its own cash.',
    separate: 'Start separately',
    fullTitle: '{count} cities is the limit for now',
    fullBody: 'Your company can run {count} cities. The next chapter allows more.',
  },
  footer:
    'Switching saves this city first. From chapter 3 your cities are branches of one company, sharing cash and progress.',
  opening: 'Opening city…',
} as const;
