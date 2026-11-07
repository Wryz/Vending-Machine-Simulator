import type { CurveKey } from './curves';

/**
 * Customer requests (SPEC §4.6): a passer-by from a real place near one of
 * your machines asks for something, shown as a bubble on the map. Have it in
 * stock there, or in another of your machines a short walk away, before they
 * give up, and they buy it and tip. What they ask for follows where they came
 * from (fast food → thirsty, a university → study fuel and dorm basics...).
 * Rolled only during live play. Times are real ms (1 real min ≈ 1 business hour).
 */
export const REQUESTS = {
  /** Gap between two new requests, uniformly in [min, max]. */
  gapMinMs: 90_000,
  gapMaxMs: 4 * 60_000,
  /** The first one waits this long after the tutorial is through. */
  firstAfterMs: 2 * 60_000,
  /** Most open at once (one per machine). */
  maxOpen: 3,
  /** How long a customer waits before giving up. */
  waitMs: 10 * 60_000,
  /** Customers come from named places this close to the machine, meters. */
  originRadiusM: 300,
  /** Another of your machines this close to the asked one can serve it, meters. */
  serveRadiusM: 200,
  /** Share of requests for something this machine can't carry (a hint for a new machine). */
  otherMachineShare: 0.25,
  /** The tip on top of the price, as a share of the price. */
  tipShare: 1,
  /** Residents in the machine's cell count like this many named places per 1,000 people. */
  residentsPerThousand: 0.6,
} as const;

/** Why a customer wants something (copy: `requests.reason.<key>`). */
export type RequestReason =
  | 'thirsty'
  | 'studying'
  | 'dorm'
  | 'charging'
  | 'afterSchool'
  | 'workout'
  | 'deadline'
  | 'visiting'
  | 'patient'
  | 'travel'
  | 'game'
  | 'sunny'
  | 'lateNight'
  | 'sweetTooth'
  | 'shopping'
  | 'forgot'
  | 'home';

/**
 * Who comes from each kind of place (relative odds, per place nearby) and what
 * they ask for. Product ids from src/config/products.ts. Alcohol is never asked for.
 */
export const REQUEST_WANTS: Partial<
  Record<CurveKey, { weight: number; wants: { reason: RequestReason; products: string[] }[] }>
> = {
  fastfood: {
    weight: 1.6,
    wants: [
      {
        reason: 'thirsty',
        products: ['clearpeak-water', 'northfield-cola', 'sparkline-lemon', 'harbor-tea'],
      },
    ],
  },
  university: {
    weight: 1.8,
    wants: [
      { reason: 'studying', products: ['brew-seven', 'volt-energy', 'hot-coffee', 'cup-noodles'] },
      { reason: 'dorm', products: ['toothbrush-kit', 'sanitizer', 'pain-relief', 'cup-noodles'] },
      { reason: 'charging', products: ['usb-c-cable', 'power-bank', 'wall-charger'] },
    ],
  },
  school: {
    weight: 1,
    wants: [
      {
        reason: 'afterSchool',
        products: ['lumen-gummies', 'cocoa-drift', 'volt-bar', 'capsule-critters'],
      },
    ],
  },
  gym: {
    weight: 1.4,
    wants: [
      {
        reason: 'workout',
        products: ['lift-protein', 'clearpeak-water', 'oat-ember', 'ironleaf-jerky'],
      },
    ],
  },
  office: {
    weight: 1,
    wants: [
      { reason: 'deadline', products: ['hot-coffee', 'latte', 'brew-seven', 'volt-bar'] },
      { reason: 'charging', products: ['wall-charger', 'usb-c-cable'] },
    ],
  },
  hospital: {
    weight: 1.2,
    wants: [
      { reason: 'visiting', products: ['bouquet', 'hot-coffee', 'fruit-cup', 'orchard-juice'] },
    ],
  },
  clinic: {
    weight: 1,
    wants: [
      {
        reason: 'patient',
        products: ['pain-relief', 'allergy-tabs', 'bandages', 'clearpeak-water'],
      },
    ],
  },
  station: {
    weight: 1.2,
    wants: [
      { reason: 'travel', products: ['latte', 'kettle-crisp', 'sandwich'] },
      { reason: 'charging', products: ['power-bank', 'usb-c-cable', 'earbuds'] },
    ],
  },
  airport: {
    weight: 1.2,
    wants: [
      { reason: 'travel', products: ['clearpeak-water', 'latte', 'toothbrush-kit'] },
      { reason: 'charging', products: ['power-bank', 'earbuds', 'usb-c-cable'] },
    ],
  },
  stadium: {
    weight: 1.2,
    wants: [{ reason: 'game', products: ['saltline-peanuts', 'kettle-crisp', 'northfield-cola'] }],
  },
  park: {
    weight: 0.8,
    wants: [
      { reason: 'sunny', products: ['clearpeak-water', 'sparkline-lemon', 'ice-bag', 'fruit-cup'] },
    ],
  },
  beach: {
    weight: 1.2,
    wants: [{ reason: 'sunny', products: ['clearpeak-water', 'ice-bag', 'sparkline-lemon'] }],
  },
  nightlife: {
    weight: 1,
    wants: [
      {
        reason: 'lateNight',
        products: ['clearpeak-water', 'cup-noodles', 'kettle-crisp', 'pain-relief'],
      },
    ],
  },
  cafe: {
    weight: 0.6,
    wants: [{ reason: 'sweetTooth', products: ['cocoa-drift', 'lumen-gummies', 'volt-bar'] }],
  },
  restaurant: {
    weight: 0.6,
    wants: [{ reason: 'sweetTooth', products: ['cocoa-drift', 'lumen-gummies', 'fruit-cup'] }],
  },
  shopping: {
    weight: 0.8,
    wants: [{ reason: 'shopping', products: ['orchard-juice', 'blind-box', 'capsule-minis'] }],
  },
  hotel: {
    weight: 1,
    wants: [{ reason: 'forgot', products: ['toothbrush-kit', 'wall-charger', 'clearpeak-water'] }],
  },
  convention: {
    weight: 1,
    wants: [{ reason: 'charging', products: ['power-bank', 'latte', 'card-transit'] }],
  },
  residential: {
    weight: 1,
    wants: [
      {
        reason: 'home',
        products: ['cup-noodles', 'kettle-crisp', 'northfield-cola', 'toothbrush-kit'],
      },
    ],
  },
};
