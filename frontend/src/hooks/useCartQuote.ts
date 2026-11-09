import { useCallback } from 'react';
import { useAsyncResource } from './useAsyncResource';
import { orderService } from '../services/orderService';
import type { CartItem } from '../types/cart';
import type { ShippingMethod } from '../types/order';
export function useCartQuote(items: CartItem[], shipping: ShippingMethod = 'standard') {
  const load = useCallback((signal: AbortSignal) => orderService.quoteCart(items, shipping, { signal }), [items, shipping]);
  return useAsyncResource(load);
}
