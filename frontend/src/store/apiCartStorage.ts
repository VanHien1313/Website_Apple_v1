import { decodeCart } from './cartStorage';
import type { CartItem } from '../types/cart';
export const API_CART_KEY = 'aura_api_cart_v1';
export function loadApiCart(): CartItem[] {
  try { return decodeCart(localStorage.getItem(API_CART_KEY)).slice(0, 50); } catch { return []; }
}
export function saveApiCart(items: CartItem[]) {
  try { localStorage.setItem(API_CART_KEY, JSON.stringify({ version: 2, items })); } catch { /* Keep the in-memory cart available if storage is blocked. */ }
}
