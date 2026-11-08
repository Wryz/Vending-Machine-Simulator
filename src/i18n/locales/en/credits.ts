/**
 * Credits and licenses screen. Project and license names (OpenStreetMap,
 * ODbL, MIT...) stay in English in the code; only descriptions translate.
 */
export default {
  title: 'Credits',
  subtitle: 'Coinline · Vending Machine Simulator',
  opensHint: 'Opens in your browser',
  /** Spoken label of a credit row: "{name}. {license}". */
  rowA11y: '{name}. {license}',
  sections: {
    help: 'Privacy and help',
    data: 'Data',
    software: 'Software and fonts',
  },
  privacy: {
    name: 'Privacy policy',
    detail: 'What the game sends and the choices you have.',
  },
  support: {
    name: 'Support',
    detail: 'Questions, problems, restoring purchases.',
  },
  /** Link label on the privacy/support rows, short. */
  open: 'Open',
  installId: 'Install ID (for data requests): {id}',
  placesNote: 'Places shown from open map data. No affiliation or endorsement.',
  brandsNote:
    'All products and brands in the game are invented. Use "Report this place" on a spot to hide a venue.',
  madeBy: 'Made by Coinline.',
  data: {
    osm: 'Map data, place names and building footprints.',
    openfreemap: 'Basemap vector tiles and map fonts, hosted free by OpenFreeMap.',
    openfreemapLicense: 'Free public instance; tiles from OpenStreetMap data (ODbL)',
    openmaptiles: 'Vector tile schema used by the basemap.',
    protomaps:
      'Place data from OpenStreetMap via the Protomaps planet build; self-hosted tiles option. Overture Maps Places is planned.',
    protomapsLicense: 'Built from OpenStreetMap data (ODbL)',
    populationName: 'Population',
    population: 'Estimated from OpenStreetMap buildings.',
    met: 'Live weather from the Norwegian Meteorological Institute (api.met.no), with no changes beyond mapping to game conditions. Offline, the game uses climate normals.',
    metLicense: 'CC BY 4.0 and NLOD 2.0',
    naturalEarth: "The city picker's globe (land, borders, relief) and countries for its flags.",
    timeZones: "Each city's time zone, for its real local time.",
  },
  software: {
    nunito: 'Typeface.',
    maplibre: 'Map rendering.',
    three: '3D close-ups.',
    h3: 'Hexagonal grid.',
    suncalc: 'Sun position for real daylight.',
  },
} as const;
