/** Spot card: why a map spot is good or bad (app/(game)/spot.tsx). */
export default {
  streetCorner: 'Street corner', // title for a spot with no host venue
  ratingA11y: '{n} of 5', // star rating, read by VoiceOver
  district: 'District {n}',
  venueLine: '{category} · {distance} · District {n}',
  section: {
    machine: 'Machine',
    why: 'Why', // reasons the spot is good or bad
    nearby: 'Nearby places',
  },
  owned: '{name} (owned)', // chip: a machine you already have in storage
  stat: {
    now: 'Customers now', // small stat caption
    day: 'Per business day', // small stat caption
    sales: 'Est. sales/day', // small stat caption, abbreviation ok
  },
  perHour: '{n}/h', // customers per hour, LED-style number
  best: 'Best: {list}', // chip: best machine families here
  theft: 'Theft risk: {risk}', // chip
  risk: {
    low: 'low',
    medium: 'medium',
    high: 'high',
  },
  competitors: 'Competitors: {n}', // chip
  commission: 'Commission ask ~{pct}', // chip: commission the venue asks
  noNearby: 'No named places within 400 m.',
  host: 'Host', // chip: this place hosts the machine, ~6 chars
  use: 'Use', // chip: pick this place as host, ~6 chars
  report: 'Report', // chip: report a wrong map place, ~8 chars
  disclaimer: 'Places shown from open map data. No affiliation or endorsement.',
  districtLocked: 'This district unlocks in a later chapter.',
  placeMine: 'Place my machine here',
  placeType: 'Place a {type} here',
  reportAlert: {
    title: 'Report this place?',
    body: '{name} will be hidden from your game.',
    cancel: 'Cancel',
    hide: 'Hide it',
  },
} as const;
