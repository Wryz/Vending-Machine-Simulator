/** Spot Card sheet over the map (src/ui/sheets/SpotSheet.tsx): is this a good spot, and why. */
export default {
  streetCorner: 'Street corner', // marquee title for a spot with no venue
  district: 'District {n}', // marquee subtitle; {n} = district number
  venueLine: '{category} · {distance}', // marquee subtitle
  perHour: 'per hour', // small caption under an LED number (customers)
  perDay: 'per day', // small caption under an LED number (sales)
  yours: '{type} (yours)', // machine type chip for the stored machine you own
  districtLocked: 'This district unlocks in a later chapter.',
  placeMine: 'Place my machine here',
  placeType: 'Place {type}',
  nearby: 'Nearby', // plate heading
  noNearby: 'No named places within 400 m.',
  placeLine: '{category} · {distance}',
  host: 'Host', // chip: this place hosts the machine, ~6 chars
  use: 'Use', // chip: make this place the host, ~6 chars
  report: 'Report', // chip: report/hide a map place
  attribution: 'Places from open map data. No affiliation or endorsement.',
  a11y: {
    customers: '{n} customers per hour',
    sales: '{amount} sales per day',
  },
  reportAlert: {
    title: 'Report this place?',
    body: '{name} will be hidden from your game.',
    cancel: 'Cancel',
    confirm: 'Hide it',
  },
} as const;
