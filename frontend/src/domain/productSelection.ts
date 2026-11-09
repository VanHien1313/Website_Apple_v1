import type { Product, ProductVariant } from '../types/product';

export const variantsForColor = (product: Product, colorId?: string) => product.variants.filter((item) => !item.colorId || item.colorId === colorId);
export function selectColorVariant(product: Product, colorId?: string, previous?: ProductVariant) {
  const variants = variantsForColor(product, colorId);
  return variants.find((item) => previous && (item.id === previous.id || (previous.configurationId && item.configurationId === previous.configurationId)))
    ?? variants.find((item) => item.inStock) ?? variants[0];
}
