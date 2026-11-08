/** Downloaded city data on device (src/data/cityPack.ts). */
export const DATA_CACHE = {
  /**
   * After this long, a cached pack is downloaded again when online (fixed
   * places and roads reach players); offline, the old copy keeps working.
   */
  refreshAfterDays: 30,
} as const;
