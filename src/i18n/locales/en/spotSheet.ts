/** Spot Card sheet over the map (src/ui/sheets/SpotSheet.tsx): is this a good spot, and why. */
export default {
  placeHere: 'Place a machine here',
  yourHost: 'Your host',
  makeHost: 'Make host',
  hostExplain: 'Your machine stands at its host: the host brings its customers and takes {pct} of sales. Pick another nearby place with Make host.',
  chooser: {
    title: 'Choose a machine',
    perDay: 'About {amount} a day here',
    install: 'Install {price}',
    chapter: 'Chapter {n}',
    cancel: 'Cancel',
    a11yOwned: 'Place your {type}',
    a11yBuy: 'Buy and place {type} for {price}',
    a11yLocked: '{type}, opens in chapter {n}',
  },
  streetCorner: 'Street corner', // marquee title for a spot with no venue
  district: 'District {n}', // marquee subtitle; {n} = district number
  venueLine: '{category} · {distance}', // marquee subtitle
  perHour: 'per hour', // small caption under an LED number (customers)
  perDay: 'per day', // small caption under an LED number (sales)
  yours: '{type} (yours)', // machine type chip for the stored machine you own
  districtLocked: 'This area opens in chapter {n}. Your open area is outlined in orange.', // {n} = chapter number
  hoodLocked: '{name} opens in chapter {n}. Your open area is outlined in orange.', // {name} = real neighbourhood
  placeMine: 'Place my machine here',
  nearby: 'Nearby', // plate heading
  noNearby: 'No named places within 400 m.',
  placeLine: '{category} · {distance}',
  report: 'Report', // chip: report/hide a map place
  attribution: 'Places from open map data. No affiliation or endorsement.',
  about: 'About this area', // plate heading: facts about the block
  passing: 'passing / hr', // caption under an LED: everyone walking past per hour, ~14 chars
  residents: 'residents', // caption under an LED: people living here
  vending: 'Vending nearby: {yours} yours · {rival} rival · {stores} shops',
  night: {
    low: 'Lively at night: safe for machines',
    medium: 'Calm at night',
    high: 'Deserted at night: machines get vandalised more',
  },
  a11y: {
    passing: '{n} people passing per hour',
    residents: '{n} residents',
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
