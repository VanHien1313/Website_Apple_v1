import { createContext, useContext, useReducer, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, CartState } from '../types/cart';
import type { Product, ProductColor, ProductVariant } from '../types/product';
import { calculateTotals, cartReducer, createCartItem } from '../domain/cart';
import { loadCart, saveCart } from './cartStorage';
import { isApiMode } from '../config/dataSource';
import { loadApiCart, saveApiCart } from './apiCartStorage';

interface CartActions {
  setItemSelected: (id: string, selected: boolean) => void;
  selectItems: (ids: string[]) => void;
  completePurchase: (lines: { skuId: string; quantity: number }[]) => void;
  refreshItems: (items: CartItem[]) => void;
  addItem: (product: Product, variant: ProductVariant, color: ProductColor, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}
const CartStateContext = createContext<(CartState & { itemCount: number; selectedItems: CartItem[] }) | null>(null);
const CartActionsContext = createContext<CartActions | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, () => isApiMode ? loadApiCart() : loadCart());
  const [selection, setSelection] = useState<string[] | null>(() => {
    try { const value: unknown = JSON.parse(sessionStorage.getItem('aura-cart-selection-v1') ?? 'null'); return Array.isArray(value) && value.length <= 50 && value.every(id => typeof id === 'string') ? value : null; } catch { return null; }
  });
  useEffect(() => { try { sessionStorage.setItem('aura-cart-selection-v1', JSON.stringify(selection)); } catch { /* Selection remains usable in memory. */ } }, [selection]);
  const selectedItems = useMemo(() => selection === null ? items : items.filter(item => selection.includes(item.id)), [items, selection]);
  useEffect(() => { setSelection(previous => {
    if (previous === null) return previous;
    const retained = previous.filter(id => items.some(item => item.id === id));
    return retained.length === previous.length ? previous : retained;
  }); }, [items]);
  useEffect(() => { if (isApiMode) saveApiCart(items); else saveCart(items); }, [items]);
  const state = useMemo(() => ({ items, selectedItems, ...calculateTotals(items), itemCount: items.reduce((sum, item) => sum + item.quantity, 0) }), [items, selectedItems]);
  const actions = useMemo<CartActions>(() => ({
    selectItems: setSelection,
    setItemSelected: (id, selected) => setSelection(previous => {
      const ids = previous ?? items.map(item => item.id);
      return selected ? [...new Set([...ids, id])] : ids.filter(value => value !== id);
    }),
    completePurchase: lines => dispatch({ type: 'PURCHASED_ITEMS', payload: lines }),
    refreshItems: (items) => dispatch({ type: 'REFRESH_ITEMS', payload: items }),
    addItem: (product, variant, color, quantity = 1) => {
      const item = createCartItem(product, variant, color, quantity);
      dispatch({ type: 'ADD_ITEM', payload: item });
      setSelection(previous => previous === null ? null : [...new Set([...previous, item.id])]);
    },
    removeItem: (itemId) => dispatch({ type: 'REMOVE_ITEM', payload: { itemId } }),
    updateQuantity: (itemId, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
  }), [items]);
  return (
    <CartActionsContext.Provider value={actions}>
      <CartStateContext.Provider value={state}>{children}</CartStateContext.Provider>
    </CartActionsContext.Provider>
  );
}
export function useCartState() {
  const context = useContext(CartStateContext);
  if (!context) throw new Error('useCartState must be used within CartProvider');
  return context;
}
export function useCartActions() {
  const context = useContext(CartActionsContext);
  if (!context) throw new Error('useCartActions must be used within CartProvider');
  return context;
}
/** Convenience for screens that need both state and actions. */
export function useCart() { return { ...useCartState(), ...useCartActions() }; }
