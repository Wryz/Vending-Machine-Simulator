import { PRODUCTS } from '@/config/products';

import { PRODUCT_IMAGES } from './productImages';

describe('product art', () => {
  it('has a picture for every product, and none for unknown ids', () => {
    expect(Object.keys(PRODUCT_IMAGES).sort()).toEqual(PRODUCTS.map((p) => p.id).sort());
  });
});
