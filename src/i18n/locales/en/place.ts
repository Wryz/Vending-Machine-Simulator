/** Place-a-machine screen: term, exclusivity, facing and the location contract (app/(game)/place.tsx). */
export default {
  section: {
    term: 'Term', // contract length
    exclusivity: 'Exclusivity',
  },
  days: { one: '{n} day', other: '{n} days' }, // chip, short
  permanent: 'Permanent',
  permanentNote: 'Your first machine stays here for good: no term, no renewals.',
  termChip: '{days} · {pct}', // term chip: length and the venue commission at that length
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
