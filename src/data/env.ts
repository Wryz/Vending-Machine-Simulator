/**
 * Build-time configuration (EXPO_PUBLIC_* env vars are inlined by Metro).
 * Nothing here is secret: API keys for ads/purchases/analytics are public SDK keys.
 */
export const ENV = {
  /** Data API Worker base URL, e.g. https://data.coinline.app (no trailing slash). */
  dataApiUrl: process.env.EXPO_PUBLIC_DATA_API_URL ?? '',
  /**
   * Basemap tiles override (self-hosting). Empty = OpenFreeMap's free public
   * instance. See src/map/tiles.ts.
   */
  tilesUrl: process.env.EXPO_PUBLIC_TILES_URL ?? '',
  /** 'protomaps' (default for self-hosted URLs) or 'openmaptiles'. */
  tilesSchema: process.env.EXPO_PUBLIC_TILES_SCHEMA ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  /** AdMob rewarded unit ids; empty = Google's test ids in dev, ads disabled in release. */
  admobRewardedIos: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS ?? '',
  admobRewardedAndroid: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  /**
   * Dev builds only: a route to open at launch, for unattended QA runs, e.g.
   * `EXPO_PUBLIC_QA_ROUTE='/diagnostics?run=all' npm start`. Ignored in release.
   */
  qaRoute:
    typeof __DEV__ !== 'undefined' && __DEV__ ? (process.env.EXPO_PUBLIC_QA_ROUTE ?? '') : '',
} as const;
