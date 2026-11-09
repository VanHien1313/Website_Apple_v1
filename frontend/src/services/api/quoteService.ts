import { request } from './http';
import type { CartItem } from '../../types/cart';
export interface ApiQuote {
  lines: { skuId: string; productId: string; name: string; slug: string; colorName: string; storage: string | null; price: number; originalPrice: number; quantity: number; availableQuantity: number; lineTotal: number }[];
  issues: { skuId: string; code: string; message: string }[];
  subtotal: number; totalDiscount: number; shippingFee: number; grandTotal: number; canCheckout: boolean;
}
export function quoteCart(items: readonly CartItem[], shippingMethod: 'standard' | 'express', signal?: AbortSignal) {
  return request<ApiQuote>('/cart/quote', { method: 'POST', signal, body: { items: items.map((item) => ({ skuId: item.variant.id, quantity: item.quantity })), shippingMethod } });
}
