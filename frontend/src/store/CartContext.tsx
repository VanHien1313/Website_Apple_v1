import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem, CartState } from '../types/cart';
import { Product, ProductColor, ProductVariant } from '../types/product';

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; variant: ProductVariant; color: ProductColor; quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

interface CartContextValue extends CartState {
  addItem: (product: Product, variant: ProductVariant, color: ProductColor, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}

const STORAGE_KEY = 'aura_apple_cart_v1';

function calculateTotals(items: CartItem[]): Omit<CartState, 'items'> {
  let subtotal = 0;
  let totalOriginal = 0;

  for (const item of items) {
    subtotal += item.variant.price * item.quantity;
    totalOriginal += item.variant.originalPrice * item.quantity;
  }

  const totalDiscount = Math.max(0, totalOriginal - subtotal);
  // Free shipping for orders above 10.000.000đ, otherwise 50.000đ
  const shippingFee = subtotal > 10000000 || items.length === 0 ? 0 : 50000;
  const grandTotal = subtotal + shippingFee;

  return { subtotal, totalDiscount, shippingFee, grandTotal };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  let newItems: CartItem[];

  switch (action.type) {
    case 'LOAD_CART': {
      newItems = action.payload;
      break;
    }
    case 'ADD_ITEM': {
      const { product, variant, color, quantity = 1 } = action.payload;
      const compositeId = `${product.id}_${variant.id}_${color.id}`;
      const existingIndex = state.items.findIndex((i) => i.id === compositeId);

      if (existingIndex > -1) {
        newItems = state.items.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        newItems = [...state.items, { id: compositeId, product, variant, color, quantity }];
      }
      break;
    }
    case 'REMOVE_ITEM': {
      newItems = state.items.filter((item) => item.id !== action.payload.itemId);
      break;
    }
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        newItems = state.items.filter((item) => item.id !== action.payload.itemId);
      } else {
        newItems = state.items.map((item) =>
          item.id === action.payload.itemId ? { ...item, quantity: action.payload.quantity } : item
        );
      }
      break;
    }
    case 'CLEAR_CART': {
      newItems = [];
      break;
    }
    default:
      return state;
  }

  const totals = calculateTotals(newItems);
  return { items: newItems, ...totals };
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    subtotal: 0,
    totalDiscount: 0,
    shippingFee: 0,
    grandTotal: 0,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          dispatch({ type: 'LOAD_CART', payload: parsed });
        }
      }
    } catch {
      // Ignore parse failure
    }
  }, []);

  // Sync to localStorage on update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Ignore storage errors
    }
  }, [state.items]);

  const addItem = (product: Product, variant: ProductVariant, color: ProductColor, quantity = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, variant, color, quantity } });
  };

  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const itemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
