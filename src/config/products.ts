/**
 * Products (SPEC §4.4). Invented brands only — no real brands, logos or packaging.
 * Money in cents. Data only.
 */

export type ProductTag =
  | 'snack'
  | 'sweet'
  | 'salty'
  | 'caffeine'
  | 'hydration'
  | 'protein'
  | 'hot'
  | 'cold'
  | 'collectible'
  | 'tech'
  | 'adult'
  | 'health'
  | 'meal'
  | 'gift'
  | 'weather';

export type ProductFamily =
  | 'snack'
  | 'drink'
  | 'coffee'
  | 'capsule'
  | 'card'
  | 'blindbox'
  | 'tech'
  | 'pharmacy'
  | 'hygiene'
  | 'noodles'
  | 'pizza'
  | 'fresh'
  | 'flowers'
  | 'umbrella'
  | 'ice'
  | 'alcohol';

export interface WeatherSensitivity {
  /** Multiplier per °C above 24 °C (e.g. 0.06 = +6%/°C). Negative = dislikes heat. */
  heat?: number;
  /** Multiplier per °C below 12 °C. */
  cold?: number;
  /** Multiplier while raining (1 = no effect). */
  rain?: number;
}

export interface Product {
  id: string;
  name: string;
  family: ProductFamily;
  tags: ProductTag[];
  wholesaleCents: number;
  suggestedCents: number;
  /** Business hours before it spoils (fresh/hot food). */
  shelfLifeHours?: number;
  weather?: WeatherSensitivity;
  /** Chapter that unlocks it. */
  unlockChapter: number;
  /** Packaging color for the low-poly product block. */
  color: string;
  /** Collection series this pull feeds (capsule/card/blind box). */
  series?: string;
}

const P = (p: Product) => p;

export const PRODUCTS: readonly Product[] = [
  // Snacks
  P({
    id: 'kettle-crisp',
    name: 'Kettle Crisp',
    family: 'snack',
    tags: ['snack', 'salty'],
    wholesaleCents: 55,
    suggestedCents: 175,
    unlockChapter: 1,
    color: '#D9A23B',
  }),
  P({
    id: 'volt-bar',
    name: 'Volt Bar',
    family: 'snack',
    tags: ['snack', 'sweet'],
    wholesaleCents: 45,
    suggestedCents: 150,
    unlockChapter: 1,
    color: '#6B3A2A',
  }),
  P({
    id: 'ridge-pretzels',
    name: 'Ridge Pretzels',
    family: 'snack',
    tags: ['snack', 'salty'],
    wholesaleCents: 50,
    suggestedCents: 160,
    unlockChapter: 1,
    color: '#B5763A',
  }),
  P({
    id: 'oat-ember',
    name: 'Oat & Ember Bar',
    family: 'snack',
    tags: ['snack', 'sweet', 'protein', 'health'],
    wholesaleCents: 70,
    suggestedCents: 200,
    unlockChapter: 1,
    color: '#9C8A5A',
  }),
  P({
    id: 'lumen-gummies',
    name: 'Lumen Gummies',
    family: 'snack',
    tags: ['snack', 'sweet'],
    wholesaleCents: 40,
    suggestedCents: 140,
    unlockChapter: 1,
    color: '#D2557A',
  }),
  P({
    id: 'saltline-peanuts',
    name: 'Saltline Peanuts',
    family: 'snack',
    tags: ['snack', 'salty', 'protein'],
    wholesaleCents: 45,
    suggestedCents: 150,
    unlockChapter: 1,
    color: '#C79A4A',
  }),
  P({
    id: 'cocoa-drift',
    name: 'Cocoa Drift Cookies',
    family: 'snack',
    tags: ['snack', 'sweet'],
    wholesaleCents: 55,
    suggestedCents: 175,
    unlockChapter: 1,
    color: '#4A2E22',
  }),
  P({
    id: 'crunchwell',
    name: 'Crunchwell Corn Chips',
    family: 'snack',
    tags: ['snack', 'salty'],
    wholesaleCents: 50,
    suggestedCents: 165,
    unlockChapter: 2,
    color: '#E0B341',
  }),
  P({
    id: 'ironleaf-jerky',
    name: 'Ironleaf Jerky',
    family: 'snack',
    tags: ['snack', 'salty', 'protein'],
    wholesaleCents: 120,
    suggestedCents: 350,
    unlockChapter: 3,
    color: '#7A3B2A',
  }),
  // Drinks
  P({
    id: 'northfield-cola',
    name: 'Northfield Cola',
    family: 'drink',
    tags: ['cold', 'sweet', 'caffeine'],
    wholesaleCents: 50,
    suggestedCents: 200,
    unlockChapter: 1,
    color: '#9E2B25',
    weather: { heat: 0.05, cold: -0.03 },
  }),
  P({
    id: 'clearpeak-water',
    name: 'Clearpeak Water',
    family: 'drink',
    tags: ['cold', 'hydration', 'health'],
    wholesaleCents: 25,
    suggestedCents: 150,
    unlockChapter: 1,
    color: '#8FC1D9',
    weather: { heat: 0.08, cold: -0.03 },
  }),
  P({
    id: 'sparkline-lemon',
    name: 'Sparkline Lemon',
    family: 'drink',
    tags: ['cold', 'sweet'],
    wholesaleCents: 45,
    suggestedCents: 190,
    unlockChapter: 2,
    color: '#E8D44D',
    weather: { heat: 0.06, cold: -0.03 },
  }),
  P({
    id: 'volt-energy',
    name: 'Volt Energy',
    family: 'drink',
    tags: ['cold', 'caffeine', 'sweet'],
    wholesaleCents: 110,
    suggestedCents: 300,
    unlockChapter: 2,
    color: '#2E5E3A',
    weather: { heat: 0.03 },
  }),
  P({
    id: 'orchard-juice',
    name: 'Orchard Juice',
    family: 'drink',
    tags: ['cold', 'sweet', 'health'],
    wholesaleCents: 70,
    suggestedCents: 225,
    unlockChapter: 2,
    color: '#E58B2E',
    weather: { heat: 0.04 },
  }),
  P({
    id: 'harbor-tea',
    name: 'Harbor Iced Tea',
    family: 'drink',
    tags: ['cold', 'caffeine'],
    wholesaleCents: 55,
    suggestedCents: 210,
    unlockChapter: 2,
    color: '#A0632F',
    weather: { heat: 0.06 },
  }),
  P({
    id: 'brew-seven',
    name: 'Brew No.7 Cold Coffee',
    family: 'drink',
    tags: ['cold', 'caffeine'],
    wholesaleCents: 90,
    suggestedCents: 275,
    unlockChapter: 2,
    color: '#3B2A22',
    weather: { heat: 0.03 },
  }),
  P({
    id: 'lift-protein',
    name: 'Lift Protein Shake',
    family: 'drink',
    tags: ['cold', 'protein', 'health'],
    wholesaleCents: 140,
    suggestedCents: 400,
    unlockChapter: 3,
    color: '#D8D2C4',
  }),
  // Coffee (hot)
  P({
    id: 'hot-coffee',
    name: 'Corner Roast Coffee',
    family: 'coffee',
    tags: ['hot', 'caffeine'],
    wholesaleCents: 40,
    suggestedCents: 225,
    unlockChapter: 2,
    color: '#4A3326',
    weather: { cold: 0.05, heat: -0.03 },
  }),
  P({
    id: 'latte',
    name: 'Corner Roast Latte',
    family: 'coffee',
    tags: ['hot', 'caffeine', 'sweet'],
    wholesaleCents: 65,
    suggestedCents: 300,
    unlockChapter: 2,
    color: '#C8A27A',
    weather: { cold: 0.05, heat: -0.03 },
  }),
  P({
    id: 'hot-cocoa',
    name: 'Ember Hot Cocoa',
    family: 'coffee',
    tags: ['hot', 'sweet'],
    wholesaleCents: 45,
    suggestedCents: 200,
    unlockChapter: 2,
    color: '#6B3A2A',
    weather: { cold: 0.07, heat: -0.04 },
  }),
  P({
    id: 'green-tea-hot',
    name: 'Stillwater Green Tea',
    family: 'coffee',
    tags: ['hot', 'caffeine', 'health'],
    wholesaleCents: 35,
    suggestedCents: 200,
    unlockChapter: 3,
    color: '#7E9A5A',
    weather: { cold: 0.04 },
  }),
  // Capsules & collectibles
  P({
    id: 'capsule-critters',
    name: 'City Critters Capsule',
    family: 'capsule',
    tags: ['collectible'],
    wholesaleCents: 30,
    suggestedCents: 100,
    unlockChapter: 3,
    color: '#1E8C88',
    series: 'city-critters',
  }),
  P({
    id: 'capsule-minis',
    name: 'Night Market Minis Capsule',
    family: 'capsule',
    tags: ['collectible'],
    wholesaleCents: 70,
    suggestedCents: 200,
    unlockChapter: 3,
    color: '#B65F9A',
    series: 'night-market-minis',
  }),
  P({
    id: 'card-transit',
    name: 'Transit Tokens Card Pack',
    family: 'card',
    tags: ['collectible'],
    wholesaleCents: 100,
    suggestedCents: 300,
    unlockChapter: 3,
    color: '#2F4F7A',
    series: 'transit-tokens',
  }),
  P({
    id: 'blind-box',
    name: 'Rooftop Friends Blind Box',
    family: 'blindbox',
    tags: ['collectible', 'gift'],
    wholesaleCents: 240,
    suggestedCents: 600,
    unlockChapter: 3,
    color: '#E3C4A8',
    series: 'rooftop-friends',
  }),
  // Tech & essentials
  P({
    id: 'usb-c-cable',
    name: 'Pathwire USB-C Cable',
    family: 'tech',
    tags: ['tech'],
    wholesaleCents: 350,
    suggestedCents: 1_200,
    unlockChapter: 4,
    color: '#2B2E33',
  }),
  P({
    id: 'wall-charger',
    name: 'Pathwire Charger',
    family: 'tech',
    tags: ['tech'],
    wholesaleCents: 600,
    suggestedCents: 1_800,
    unlockChapter: 4,
    color: '#F0F0EE',
  }),
  P({
    id: 'power-bank',
    name: 'Reserve Power Bank',
    family: 'tech',
    tags: ['tech'],
    wholesaleCents: 900,
    suggestedCents: 2_500,
    unlockChapter: 4,
    color: '#3A3D42',
  }),
  P({
    id: 'earbuds',
    name: 'Hush Earbuds',
    family: 'tech',
    tags: ['tech'],
    wholesaleCents: 700,
    suggestedCents: 2_000,
    unlockChapter: 4,
    color: '#E8E8E4',
  }),
  P({
    id: 'pain-relief',
    name: 'Calmwell Pain Relief',
    family: 'pharmacy',
    tags: ['health'],
    wholesaleCents: 180,
    suggestedCents: 600,
    unlockChapter: 4,
    color: '#C44B4B',
  }),
  P({
    id: 'bandages',
    name: 'Mendstrip Bandages',
    family: 'pharmacy',
    tags: ['health'],
    wholesaleCents: 120,
    suggestedCents: 400,
    unlockChapter: 4,
    color: '#E6C7A8',
  }),
  P({
    id: 'allergy-tabs',
    name: 'Clearday Allergy',
    family: 'pharmacy',
    tags: ['health'],
    wholesaleCents: 200,
    suggestedCents: 700,
    unlockChapter: 4,
    color: '#5A8FC4',
  }),
  P({
    id: 'sanitizer',
    name: 'Rinsefree Sanitizer',
    family: 'hygiene',
    tags: ['health'],
    wholesaleCents: 90,
    suggestedCents: 350,
    unlockChapter: 4,
    color: '#9FD3C7',
  }),
  P({
    id: 'masks',
    name: 'Breathe Masks (5)',
    family: 'hygiene',
    tags: ['health'],
    wholesaleCents: 100,
    suggestedCents: 400,
    unlockChapter: 4,
    color: '#DDE6EC',
  }),
  P({
    id: 'toothbrush-kit',
    name: 'Brightstart Travel Kit',
    family: 'hygiene',
    tags: ['health'],
    wholesaleCents: 150,
    suggestedCents: 500,
    unlockChapter: 4,
    color: '#7FB3D5',
  }),
  // Hot food & specialty
  P({
    id: 'cup-noodles',
    name: 'Steamline Noodles',
    family: 'noodles',
    tags: ['hot', 'meal', 'salty'],
    wholesaleCents: 110,
    suggestedCents: 350,
    unlockChapter: 4,
    color: '#D9732B',
    weather: { cold: 0.06, heat: -0.03 },
  }),
  P({
    id: 'ramen-spicy',
    name: 'Steamline Spicy Ramen',
    family: 'noodles',
    tags: ['hot', 'meal', 'salty'],
    wholesaleCents: 130,
    suggestedCents: 400,
    unlockChapter: 4,
    color: '#B8402F',
    weather: { cold: 0.06 },
  }),
  P({
    id: 'pizza-slice',
    name: 'Oven Twelve Slice',
    family: 'pizza',
    tags: ['hot', 'meal'],
    wholesaleCents: 160,
    suggestedCents: 450,
    shelfLifeHours: 24,
    unlockChapter: 4,
    color: '#E0A040',
    weather: { cold: 0.03 },
  }),
  P({
    id: 'salad-bowl',
    name: 'Greenhouse Salad',
    family: 'fresh',
    tags: ['meal', 'health', 'cold'],
    wholesaleCents: 250,
    suggestedCents: 650,
    shelfLifeHours: 48,
    unlockChapter: 4,
    color: '#6E9E4A',
    weather: { heat: 0.03 },
  }),
  P({
    id: 'sandwich',
    name: 'Daybreak Sandwich',
    family: 'fresh',
    tags: ['meal'],
    wholesaleCents: 200,
    suggestedCents: 550,
    shelfLifeHours: 48,
    unlockChapter: 4,
    color: '#D8B57A',
  }),
  P({
    id: 'fruit-cup',
    name: 'Orchard Fruit Cup',
    family: 'fresh',
    tags: ['sweet', 'health', 'cold'],
    wholesaleCents: 140,
    suggestedCents: 400,
    shelfLifeHours: 36,
    unlockChapter: 4,
    color: '#E46B4A',
    weather: { heat: 0.04 },
  }),
  P({
    id: 'bouquet',
    name: 'Market Bouquet',
    family: 'flowers',
    tags: ['gift'],
    wholesaleCents: 400,
    suggestedCents: 1_200,
    shelfLifeHours: 96,
    unlockChapter: 4,
    color: '#D46A8A',
  }),
  P({
    id: 'umbrella',
    name: 'Overcast Umbrella',
    family: 'umbrella',
    tags: ['weather'],
    wholesaleCents: 350,
    suggestedCents: 1_000,
    unlockChapter: 4,
    color: '#2B3A55',
    weather: { rain: 9 },
  }),
  P({
    id: 'ice-bag',
    name: 'Polar Ice Bag',
    family: 'ice',
    tags: ['cold', 'weather'],
    wholesaleCents: 80,
    suggestedCents: 300,
    unlockChapter: 4,
    color: '#CFE6F2',
    weather: { heat: 0.12, cold: -0.06 },
  }),
  // Adult (permit)
  P({
    id: 'lager',
    name: 'Harborline Lager',
    family: 'alcohol',
    tags: ['adult', 'cold'],
    wholesaleCents: 140,
    suggestedCents: 400,
    unlockChapter: 5,
    color: '#C9A13A',
    weather: { heat: 0.04 },
  }),
  P({
    id: 'house-red',
    name: 'Hillrow House Red',
    family: 'alcohol',
    tags: ['adult', 'gift'],
    wholesaleCents: 500,
    suggestedCents: 1_200,
    unlockChapter: 5,
    color: '#5E1F24',
  }),
  P({
    id: 'soju',
    name: 'Riverstone Soju',
    family: 'alcohol',
    tags: ['adult'],
    wholesaleCents: 180,
    suggestedCents: 500,
    unlockChapter: 5,
    color: '#5FA57A',
  }),
  P({
    id: 'sake-cup',
    name: 'Moonwell Sake Cup',
    family: 'alcohol',
    tags: ['adult'],
    wholesaleCents: 200,
    suggestedCents: 500,
    unlockChapter: 5,
    color: '#E6E1D3',
  }),
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: string): Product {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown product: ${id}`);
  return p;
}
