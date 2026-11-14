import type { CartItem, CartState } from '../types/cart';
import type { Product, ProductColor, ProductVariant } from '../types/product';
import type { ShippingMethod } from '../types/order';

export const MAX_QUANTITY = 999;
export const cartItemId = (productId: string, variantId: string, colorId: string) =>
  JSON.stringify([productId, variantId, colorId]);
export const validQuantity = (quantity: number) => Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY;

export function calculateTotals(items: readonly CartItem[], shippingMethod: ShippingMethod = 'standard'): Omit<CartState, 'items'> {
  const subtotal = items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
  const original = items.reduce((sum, item) => sum + item.variant.originalPrice * item.quantity, 0);
  const shippingFee = items.length === 0 ? 0 : shippingMethod === 'express' || subtotal <= 10_000_000 ? 50_000 : 0;
  return { subtotal, totalDiscount: Math.max(0, original - subtotal), shippingFee, grandTotal: subtotal + shippingFee };
}

export function createCartItem(product: Pick<Product, 'id' | 'slug' | 'name' | 'thumbnail'>, variant: ProductVariant, color: ProductColor, quantity = 1): CartItem {
  return {
    id: cartItemId(product.id, variant.id, color.id),
    product: { id: product.id, slug: product.slug, name: product.name, thumbnail: product.thumbnail },
    variant: { ...variant }, color: { ...color }, quantity,
  };
}
export type CartAction =
  | { type: 'REFRESH_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'PURCHASED_ITEMS'; payload: { skuId: string; quantity: number }[] }
  | { type: 'CLEAR_CART' };

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'REFRESH_ITEMS': return action.payload.filter((item) => validQuantity(item.quantity));
    case 'CLEAR_CART': return [];
    case 'PURCHASED_ITEMS': return items.flatMap(item => {
      const purchased = action.payload.find(line => line.skuId.toLowerCase() === item.variant.id.toLowerCase());
      if (!purchased || !validQuantity(purchased.quantity)) return [item];
      return item.quantity > purchased.quantity ? [{ ...item, quantity: item.quantity - purchased.quantity }] : [];
    });
    case 'REMOVE_ITEM': return items.filter((item) => item.id !== action.payload.itemId);
    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      if (quantity === 0) return items.filter((item) => item.id !== itemId);
      if (!validQuantity(quantity)) return items;
      return items.map((item) => item.id === itemId ? { ...item, quantity } : item);
    }
    case 'ADD_ITEM': {
      const added = action.payload;
      if (!validQuantity(added.quantity) || !added.variant.inStock) return items;
      const existing = items.find((item) => item.id === added.id);
      if (!existing) return [...items, added];
      return items.map((item) => item.id === added.id
        ? { ...added, quantity: Math.min(MAX_QUANTITY, item.quantity + added.quantity) } : item);
    }
  }
}
