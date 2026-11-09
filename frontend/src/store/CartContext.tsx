import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react';
import type { CartItem, CartState } from '../types/cart';
import type { Product, ProductColor, ProductVariant } from '../types/product';
import { calculateTotals, cartReducer, createCartItem } from '../domain/cart';
import { loadCart, saveCart } from './cartStorage';
import { isApiMode } from '../config/dataSource';
import { loadApiCart, saveApiCart } from './apiCartStorage';

interface CartActions {
  refreshItems: (items: CartItem[]) => void;
  addItem: (product: Product, variant: ProductVariant, color: ProductColor, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}
const CartStateContext = createContext<(CartState & { itemCount: number }) | null>(null);
const CartActionsContext = createContext<CartActions | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, () => isApiMode ? loadApiCart() : loadCart());
  useEffect(() => { if (isApiMode) saveApiCart(items); else saveCart(items); }, [items]);
  const state = useMemo(() => ({ items, ...calculateTotals(items), itemCount: items.reduce((sum, item) => sum + item.quantity, 0) }), [items]);
  const actions = useMemo<CartActions>(() => ({
    refreshItems: (items) => dispatch({ type: 'REFRESH_ITEMS', payload: items }),
    addItem: (product, variant, color, quantity = 1) => dispatch({ type: 'ADD_ITEM', payload: createCartItem(product, variant, color, quantity) }),
    removeItem: (itemId) => dispatch({ type: 'REMOVE_ITEM', payload: { itemId } }),
    updateQuantity: (itemId, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
  }), []);
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
