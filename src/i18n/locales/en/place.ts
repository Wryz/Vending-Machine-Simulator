/** Place-a-machine screen: term, exclusivity, facing and the location contract (app/(game)/place.tsx). */
export default {
  heading: {
    n: 'Faces N', // chip: machine front faces north, ~8 chars
    e: 'E', // chip: east, 1–2 chars
    s: 'S', // chip: south, 1–2 chars
    w: 'W', // chip: west, 1–2 chars
  },
  section: {
    term: 'Term', // contract length
    exclusivity: 'Exclusivity',
    facing: 'Facing', // which way the machine front points
  },
  days: { one: '{n} day', other: '{n} days' }, // chip, short
  termNote:
    'Business days. Longer terms lower the commission. Contracts renew while the venue is happy.',
  exclusive: 'Keep Brightvend out of this block (+{pct} commission)',
  exclusiveA11y: 'Exclusive contract',
  contract: {
    machine: 'Machine',
    commission: 'Commission to venue',
    term: 'Term',
    exclusive: 'Exclusive',
    yes: 'Yes',
    no: 'No',
    price: 'Machine price',
    install: 'Install', // installation fee
  },
  disclaimer: 'Places shown from open map data. No affiliation or endorsement.',
  total: 'Total today',
} as const;
