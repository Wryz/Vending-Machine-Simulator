/**
 * Text from src/services: in-app purchase names, descriptions and store
 * errors. Prices come from the store and are not translated here.
 */
export default {
  products: {
    removeAds: {
      title: 'Remove Ads + longer breaks',
      detail: 'Hides ad offers and raises the offline cap by 25%.',
    },
    starterPack: {
      title: 'Starter Pack',
      detail: 'Van upgrade, two snack machines and $2,000 cash. Offered once after chapter 1.',
    },
    doubleProfits: {
      title: 'Double Profits',
      detail: 'Every sale pays double, forever.',
    },
  },
  errors: {
    storeUnavailable: 'The store is not available in this build.',
    productNotFound: 'Product not found.',
    purchaseFailed: 'Purchase failed. You were not charged.',
    restoreFailed: 'Could not restore purchases.',
  },
} as const;
