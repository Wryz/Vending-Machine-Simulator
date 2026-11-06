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
  },
  footer:
    'Switching saves this business first. Finish chapter 5 to sell the company and restart anywhere with a head start.',
  opening: 'Opening city…',
} as const;
