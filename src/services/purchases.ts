import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { ENV } from '@/data/env';
import { t } from '@/i18n';
import { useProfile } from '@/store/profile';

import { track } from './analytics';

/**
 * One-time purchases via RevenueCat (SPEC §9). No subscriptions, no energy,
 * no paywalled automation. Product ids must match App Store Connect.
 * Titles and details are getters so they read the current language.
 */
export const PRODUCTS = {
  removeAds: {
    id: 'coinline.remove_ads',
    get title() {
      return t('services.products.removeAds.title');
    },
    price: '$4.99',
    get detail() {
      return t('services.products.removeAds.detail');
    },
  },
  starterPack: {
    id: 'coinline.starter_pack',
    get title() {
      return t('services.products.starterPack.title');
    },
    price: '$2.99',
    get detail() {
      return t('services.products.starterPack.detail');
    },
  },
  wrapNight: {
    id: 'coinline.wrap_night',
    get title() {
      return t('services.products.wrapNight.title');
    },
    price: '$0.99',
    get detail() {
      return t('services.products.wrapNight.detail');
    },
  },
  wrapLinen: {
    id: 'coinline.wrap_linen',
    get title() {
      return t('services.products.wrapLinen.title');
    },
    price: '$0.99',
    get detail() {
      return t('services.products.wrapLinen.detail');
    },
  },
  lightingWarm: {
    id: 'coinline.lighting_warm',
    get title() {
      return t('services.products.lightingWarm.title');
    },
    price: '$1.99',
    get detail() {
      return t('services.products.lightingWarm.detail');
    },
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

let configured = false;

export function storeAvailable(): boolean {
  return !!(Platform.OS === 'ios' ? ENV.revenueCatIosKey : ENV.revenueCatAndroidKey);
}

export async function initPurchases(): Promise<void> {
  if (configured || !storeAvailable()) return;
  try {
    Purchases.configure({
      apiKey: Platform.OS === 'ios' ? ENV.revenueCatIosKey : ENV.revenueCatAndroidKey,
      appUserID: useProfile.getState().installId,
    });
    configured = true;
    await syncEntitlements();
  } catch {
    configured = false;
  }
}

/** Apply what the store says the player owns (restores across reinstalls). */
export async function syncEntitlements(): Promise<void> {
  if (!configured) return;
  const info = await Purchases.getCustomerInfo();
  const owned = new Set(info.nonSubscriptionTransactions.map((t) => t.productIdentifier));
  useProfile.getState().update((p) => {
    if (owned.has(PRODUCTS.removeAds.id)) p.entitlements.removeAds = true;
    // Bought on another install: the pack is owed to this one (the shop delivers it).
    if (owned.has(PRODUCTS.starterPack.id) && !p.entitlements.starterPackClaimed)
      p.entitlements.starterPackOwed = true;
    for (const key of ['wrapNight', 'wrapLinen', 'lightingWarm'] as const) {
      if (owned.has(PRODUCTS[key].id) && !p.entitlements.wraps.includes(key))
        p.entitlements.wraps.push(key);
    }
  });
}

/** Buy a product. Returns true when the purchase completed. */
export async function buy(key: ProductKey): Promise<{ ok: boolean; error?: string }> {
  if (!configured) return { ok: false, error: t('services.errors.storeUnavailable') };
  try {
    const [product] = await Purchases.getProducts(
      [PRODUCTS[key].id],
      Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    if (!product) return { ok: false, error: t('services.errors.productNotFound') };
    await Purchases.purchaseStoreProduct(product);
    track('purchase', { product: key });
    useProfile.getState().update((p) => {
      if (key === 'removeAds') p.entitlements.removeAds = true;
      if (key === 'wrapNight' || key === 'wrapLinen' || key === 'lightingWarm') {
        if (!p.entitlements.wraps.includes(key)) p.entitlements.wraps.push(key);
      }
    });
    return { ok: true };
  } catch (e) {
    const cancelled =
      typeof e === 'object' &&
      e !== null &&
      'userCancelled' in e &&
      (e as { userCancelled?: boolean }).userCancelled;
    return { ok: false, error: cancelled ? undefined : t('services.errors.purchaseFailed') };
  }
}

export async function restore(): Promise<{ ok: boolean; error?: string }> {
  if (!configured) return { ok: false, error: t('services.errors.storeUnavailable') };
  try {
    await Purchases.restorePurchases();
    await syncEntitlements();
    return { ok: true };
  } catch {
    return { ok: false, error: t('services.errors.restoreFailed') };
  }
}
