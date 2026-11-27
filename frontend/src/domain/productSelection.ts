import type { Product, ProductVariant } from '../types/product';

export function selectInitialVariant(product: Product) {
  const variants = [...product.variants].sort((a,b) => a.price-b.price || a.id.localeCompare(b.id));
  return variants.find(variant => variant.inStock) ?? variants[0];
}

export const variantsForColor = (product: Product, colorId?: string) => product.variants.filter((item) => !item.colorId || item.colorId === colorId);
export function selectColorVariant(product: Product, colorId?: string, previous?: ProductVariant) {
  const variants = variantsForColor(product, colorId);
  return variants.find((item) => previous && (item.id === previous.id || (previous.configurationId && item.configurationId === previous.configurationId)))
    ?? variants.find((item) => item.inStock) ?? variants[0];
}
