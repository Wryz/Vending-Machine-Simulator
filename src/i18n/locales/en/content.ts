/**
 * Display text for config content (src/config stays English and data-only).
 * Keys mirror the ids in src/config; read them through `content.*` in
 * src/i18n/content.ts. Generated from src/config, then kept by hand:
 * src/i18n/content.test.ts fails when a config entry has no key here.
 * Brand-like names (Brightvend, Coinline) stay as they are.
 */
export default {
  // Chapter titles are short marquee names; goals are one sentence; unlocks are short list items.
  chapters: {
    c1: {
      title: 'Side Hustle',
      goal: 'Earn {amount} in sales with your used machine',
      unlocks: {
        u0: 'Second machine',
        u1: 'Price setting',
        u2: 'Contract renegotiation',
      },
    },
    c2: {
      title: 'The Route',
      goal: 'Run 5 machines and buy a van',
      unlocks: {
        u0: 'Telemetry',
        u1: 'Drinks & coffee machines',
        u2: 'District 2',
      },
    },
    c3: {
      title: 'LLC',
      goal: 'Run 15 machines and hire a driver',
      unlocks: {
        u0: 'Card readers',
        u1: 'Capsules & collectibles',
        u2: 'Warehouse',
        u3: 'Brightvend arrives',
        u4: 'Branches in up to 3 cities',
      },
    },
    c4: {
      title: 'Operator',
      goal: 'Run 40 machines with 3 drivers',
      unlocks: {
        u0: 'Smart machines',
        u1: 'Tech & essentials',
        u2: 'Hot food',
        u3: 'Events board',
        u4: 'Up to 5 cities',
      },
    },
    c5: {
      title: 'Empire',
      goal: "Become the city's top operator (beat Brightvend's share)",
      unlocks: {
        u0: 'All machine types',
        u1: 'Branches in every city',
        u2: 'Liquor permit',
      },
    },
    c6: {
      title: 'Prestige',
      goal: 'Sell the company when you are ready',
      unlocks: {
        u0: 'Reputation perks',
        u1: 'Restart with a head start',
      },
    },
  },
  // City rings around the center, unlocked by chapter (short).
  districts: {
    d1: 'Downtown',
    d2: 'Inner ring',
    d3: 'Outer ring',
    d4: 'Whole city',
  },
  // Machine type names, shown on keys and pins (~20 chars).
  machines: {
    'used-snack': 'Used Snack Machine',
    snack: 'Snack Machine',
    'cold-drinks': 'Cold Drinks',
    combo: 'Combo Machine',
    coffee: 'Coffee Machine',
    capsule: 'Capsule Toy',
    'card-pack': 'Card Pack Vendor',
    'blind-box': 'Blind Box',
    chargers: 'Chargers & Cables',
    earbuds: 'Earbuds & Accessories',
    pharmacy: 'Pharmacy Essentials',
    hygiene: 'Hygiene',
    'hot-noodles': 'Hot Noodles',
    pizza: 'Pizza Oven',
    'fresh-food': 'Fresh Food',
    flowers: 'Flowers',
    umbrellas: 'Umbrellas',
    ice: 'Ice',
    'beer-wine': 'Beer & Wine',
    'sake-soju': 'Sake & Soju',
  },
  // Machine families (product groups).
  families: {
    snacks: 'Snacks & drinks',
    drinks: 'Drinks & coffee',
    capsules: 'Capsules & collectibles',
    tech: 'Tech & essentials',
    hotFood: 'Hot food & specialty',
    alcohol: 'Beer & wine',
  },
  research: {
    telemetry: {
      name: 'Telemetry',
      desc: 'See stock and cash levels remotely.',
    },
    'card-reader': {
      name: 'Card readers',
      desc: 'Card sales deposit directly to your account.',
    },
    'bigger-coil': {
      name: 'Bigger coils',
      desc: '+50% capacity per slot.',
    },
    cooler: {
      name: 'Better cooling & heating',
      desc: 'Fewer refrigeration failures; +5% sales of hot and cold items.',
    },
    'security-cage': {
      name: 'Security cage',
      desc: 'Cuts theft risk by more than half.',
    },
    camera: {
      name: 'Camera',
      desc: 'Cuts theft risk by a third.',
    },
    'led-panel': {
      name: 'LED panel',
      desc: 'Machines stay visible at night (+12% visibility).',
    },
    technician: {
      name: 'Technician on call',
      desc: 'Breakdowns are fixed automatically within a few hours.',
    },
    'smart-pricing': {
      name: 'Smart machines',
      desc: 'Machines suggest and apply prices.',
    },
    'id-check': {
      name: 'ID check',
      desc: 'Reduces alcohol fines and incidents.',
    },
    'auto-reorder': {
      name: 'Auto-reorder rules',
      desc: 'Drivers restock to your par levels automatically.',
    },
    'cash-vault': {
      name: 'Larger cash box',
      desc: 'Doubles cash box capacity.',
    },
  },
  // Daily orders. {n} is the target, already formatted (a number or money like "$45" or "¥7,500").
  goals: {
    sales: 'Take {n} in sales',
    units: 'Sell {n} items',
    restocks: 'Restock {n} times by hand',
    collects: 'Empty {n} cash boxes',
    places: 'Place {n} new machines',
    repairs: 'Fix {n} breakdowns',
    research: 'Research {n} upgrade',
    pulls: 'Open {n} capsules',
  },
  achievements: {
    'first-sale': {
      title: 'Open for business',
      desc: 'Make your first sale.',
    },
    'units-100': {
      title: 'Regulars',
      desc: 'Sell 100 items.',
    },
    'units-10k': {
      title: 'Household name',
      desc: 'Sell 10,000 items.',
    },
    'sales-1k': {
      title: 'Side hustle',
      desc: 'Take {amount} in sales.',
    },
    'sales-100k': {
      title: 'Real business',
      desc: 'Take {amount} in sales.',
    },
    'sales-1m': {
      title: 'Seven figures',
      desc: 'Take {amount} in sales.',
    },
    'machines-5': {
      title: 'A route',
      desc: 'Run 5 machines.',
    },
    'machines-15': {
      title: 'A network',
      desc: 'Run 15 machines.',
    },
    'machines-40': {
      title: 'An operator',
      desc: 'Run 40 machines.',
    },
    'machines-100': {
      title: 'Coinline everywhere',
      desc: 'Run 100 machines.',
    },
    'first-driver': {
      title: 'Delegation',
      desc: 'Hire your first driver.',
    },
    'first-research': {
      title: 'Upgrades',
      desc: 'Research your first upgrade.',
    },
    'full-set': {
      title: 'Completionist',
      desc: 'Complete a collectible set.',
    },
    'beat-rival': {
      title: 'Top operator',
      desc: 'Beat Brightvend for the city.',
    },
    'streak-7': {
      title: 'Every day',
      desc: 'Finish your daily orders 7 days in a row.',
    },
    'sold-company': {
      title: 'Exit',
      desc: 'Sell the company.',
    },
  },
  // Capsule-toy collectible series.
  series: {
    'city-critters': {
      name: 'City Critters',
    },
    'transit-tokens': {
      name: 'Transit Tokens',
    },
    'night-market-minis': {
      name: 'Night Market Minis',
    },
    'rooftop-friends': {
      name: 'Rooftop Friends',
    },
  },
  // Collectible figures inside a series (short, ~16 chars).
  seriesItems: {
    'city-critters-1': 'Rooftop Pigeon',
    'city-critters-2': 'Alley Cat',
    'city-critters-3': 'Subway Mouse',
    'city-critters-4': 'Park Squirrel',
    'city-critters-5': 'Harbor Gull',
    'city-critters-6': 'Night Fox',
    'city-critters-7': 'Bodega Cat',
    'city-critters-8': 'Tunnel Bat',
    'city-critters-9': 'Canal Heron',
    'city-critters-10': 'Tower Falcon',
    'city-critters-11': 'Lantern Moth',
    'city-critters-12': 'Golden Koi',
    'transit-tokens-1': 'Brass Token',
    'transit-tokens-2': 'Night Bus',
    'transit-tokens-3': 'Tram Bell',
    'transit-tokens-4': 'Platform Clock',
    'transit-tokens-5': 'Ferry Horn',
    'transit-tokens-6': 'Ticket Punch',
    'transit-tokens-7': 'Signal Lamp',
    'transit-tokens-8': 'Cable Car',
    'transit-tokens-9': 'Sleeper Car',
    'transit-tokens-10': 'Monorail',
    'transit-tokens-11': 'Steam Engine',
    'transit-tokens-12': 'Airship Pass',
    'transit-tokens-13': 'Golden Turnstile',
    'transit-tokens-14': 'First Train',
    'night-market-minis-1': 'Dumpling Stall',
    'night-market-minis-2': 'Skewer Cart',
    'night-market-minis-3': 'Paper Lantern',
    'night-market-minis-4': 'Noodle Bowl',
    'night-market-minis-5': 'Bubble Tea',
    'night-market-minis-6': 'Fortune Cat',
    'night-market-minis-7': 'Neon Sign',
    'night-market-minis-8': 'Hot Pot',
    'night-market-minis-9': 'Mochi Stand',
    'night-market-minis-10': 'Dragon Kite',
    'night-market-minis-11': 'Fireworks',
    'night-market-minis-12': 'Moon Cake',
    'night-market-minis-13': 'Lucky Coin',
    'rooftop-friends-1': 'Water Tower',
    'rooftop-friends-2': 'Antenna',
    'rooftop-friends-3': 'Skylight',
    'rooftop-friends-4': 'Garden Box',
    'rooftop-friends-5': 'Satellite Dish',
    'rooftop-friends-6': 'Chimney Sweep',
    'rooftop-friends-7': 'Beehive',
    'rooftop-friends-8': 'Pool Float',
    'rooftop-friends-9': 'Helipad',
    'rooftop-friends-10': 'Rooftop Cinema',
    'rooftop-friends-11': 'Weather Vane',
    'rooftop-friends-12': 'Neon Crown',
  },
  // Local events near real places (short, also map labels).
  events: {
    'game-night': 'Game night',
    'exam-week': 'Exam week',
    festival: 'Park festival',
    expo: 'Expo',
    'summer-weekend': 'Summer weekend',
  },
  // Prestige perks bought with Reputation.
  perks: {
    'head-start': {
      name: 'Head start',
      desc: '+{amount} starting cash per level.',
    },
    'sharp-eye': {
      name: 'Sharp eye',
      desc: '+4% sales everywhere per level.',
    },
    'smooth-talker': {
      name: 'Smooth talker',
      desc: '-1% venue commission per level.',
    },
    'long-weekend': {
      name: 'Long weekend',
      desc: '+12 h offline cap per level.',
    },
    'old-van': {
      name: 'Old van',
      desc: 'Start with a level-1 van.',
    },
  },
  // City names: use the usual local exonym.
  cities: {
    'new-york': 'New York',
    'los-angeles': 'Los Angeles',
    chicago: 'Chicago',
    london: 'London',
    paris: 'Paris',
    tokyo: 'Tokyo',
    seoul: 'Seoul',
    singapore: 'Singapore',
    sydney: 'Sydney',
  },
  // One-line city descriptions in the city picker.
  cityNotes: {
    'new-york': 'Dense, 24-hour; subway stations',
    'los-angeles': 'Car-heavy; beaches; studios',
    chicago: 'Strong seasons; "L" stations',
    london: 'Tube; rain-driven umbrellas',
    paris: 'Cafés; metro',
    tokyo: 'Vending capital; beer machines allowed',
    seoul: 'Night life; soju',
    singapore: 'Hot all year; strict rules (alcohol limits)',
    sydney: 'Beaches; seasons reversed',
  },
  // Venue / place categories (map data kinds).
  places: {
    school: 'School',
    university: 'University',
    gym: 'Gym',
    office: 'Office',
    hospital: 'Hospital',
    clinic: 'Clinic',
    station: 'Station',
    stadium: 'Stadium',
    park: 'Park',
    beach: 'Beach',
    nightlife: 'Nightlife',
    cafe: 'Café',
    restaurant: 'Restaurant',
    fastfood: 'Fast food',
    shopping: 'Shopping',
    hotel: 'Hotel',
    airport: 'Airport',
    convention: 'Convention center',
    religious: 'Place of worship',
    competitor: 'Convenience store',
  },
} as const;
