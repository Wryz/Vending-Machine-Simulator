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
} as const;
