import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { create } from 'zustand';

import { PURCHASES } from '@/config/economy';
import { ENV } from '@/data/env';
import { t } from '@/i18n';
import { useProfile } from '@/store/profile';
import { moneyWhole } from '@/ui/format';

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
    get detail() {
      return t('services.products.removeAds.detail');
    },
  },
  starterPack: {
    id: 'coinline.starter_pack',
    get title() {
      return t('services.products.starterPack.title');
    },
    get detail() {
      // In-game cash, in the city's currency (the real-money price stays as the store gives it).
      return t('services.products.starterPack.detail', {
        amount: moneyWhole(PURCHASES.starterPackCashCents),
      });
    },
  },
  doubleProfits: {
    id: 'coinline.double_profits',
    get title() {
      return t('services.products.doubleProfits.title');
    },
    get detail() {
      return t('services.products.doubleProfits.detail');
    },
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

let configured = false;

export function storeAvailable(): boolean {
  return !!(Platform.OS === 'ios' ? ENV.revenueCatIosKey : ENV.revenueCatAndroidKey);
}

/** Prices as the store gives them, in the player's own currency ("4,99 €", "¥800"). */
const usePrices = create<{ prices: Partial<Record<ProductKey, string>> }>(() => ({ prices: {} }));

/** The localized store price of a product, or null until the store has answered. */
export function useStorePrice(key: ProductKey): string | null {
  return usePrices((s) => s.prices[key] ?? null);
}

/** Ask the store for local prices (retried by the shop when it opens). */
export async function loadPrices(): Promise<void> {
  if (!configured) return;
  try {
    const keys = Object.keys(PRODUCTS) as ProductKey[];
    const products = await Purchases.getProducts(
      keys.map((k) => PRODUCTS[k].id),
      Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    const prices: Partial<Record<ProductKey, string>> = {};
    for (const k of keys) {
      const p = products.find((x) => x.identifier === PRODUCTS[k].id);
      if (p) prices[k] = p.priceString;
    }
    usePrices.setState({ prices });
  } catch {
    // Offline: the shop shows no price yet and asks again next time it opens.
  }
}

export async function initPurchases(): Promise<void> {
  if (configured || !storeAvailable()) return;
  try {
    Purchases.configure({
      apiKey: Platform.OS === 'ios' ? ENV.revenueCatIosKey : ENV.revenueCatAndroidKey,
      appUserID: useProfile.getState().installId,
    });
  } catch {
    return;
  }
  configured = true;
  // Offline at launch must not turn the store off: entitlements and prices are fetched again later.
  await syncEntitlements().catch(() => undefined);
  await loadPrices();
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
    if (owned.has(PRODUCTS.doubleProfits.id)) p.entitlements.doubleProfits = true;
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
      if (key === 'doubleProfits') p.entitlements.doubleProfits = true;
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
