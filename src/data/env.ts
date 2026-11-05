/**
 * Build-time configuration (EXPO_PUBLIC_* env vars are inlined by Metro).
 * Nothing here is secret: API keys for ads/purchases/analytics are public SDK keys.
 */
export const ENV = {
  /** Data API Worker base URL, e.g. https://data.coinline.app (no trailing slash). */
  dataApiUrl: process.env.EXPO_PUBLIC_DATA_API_URL ?? '',
  /**
   * Basemap tiles. Either a PMTiles URL (native pmtiles://) or an XYZ template
   * with {name}. Defaults to the Worker's PMTiles route for the city.
   */
  tilesUrl: process.env.EXPO_PUBLIC_TILES_URL ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  /** AdMob rewarded unit ids; empty = Google's test ids in dev, ads disabled in release. */
  admobRewardedIos: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS ?? '',
  admobRewardedAndroid: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
} as const;
