/**
 * Public pages (Cloudflare Pages project `coinline`, deployed from docs/site
 * with `npm run site:deploy`). Shown in Credits and used for
 * App Store Connect's privacy policy and support URLs.
 */
export const LINKS = {
  site: 'https://coinline.pages.dev/',
  privacy: 'https://coinline.pages.dev/privacy',
  support: 'https://coinline.pages.dev/support',
  /** Where players report problems (public issues). */
  issues: 'https://github.com/Wryz/Vending-Machine-Simulator/issues/new',
  /** Coinline on the App Store (App Store Connect app id 6831590229). */
  appStore: 'https://apps.apple.com/app/id6831590229',
  /** Apple's public lookup: the live App Store version, by bundle id (nothing about the player is sent). */
  appStoreLookup: 'https://itunes.apple.com/lookup?bundleId=app.coinline.vending',
} as const;

/** How often the app asks whether a newer version is on the App Store. */
export const UPDATE_CHECK = { everyHours: 12, timeoutMs: 8000 } as const;
