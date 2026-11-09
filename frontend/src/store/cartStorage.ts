import type { CartItem } from '../types/cart';
import { cartReducer, createCartItem, validQuantity } from '../domain/cart';

export const CART_STORAGE_KEY = 'aura_apple_cart_v2';
const LEGACY_KEY = 'aura_apple_cart_v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const strings = (value: Record<string, unknown>, keys: string[]) => keys.every((key) => typeof value[key] === 'string');
const money = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Treat persisted JSON as untrusted. Discard malformed lines, preserve valid legacy carts. */
export function decodeCart(raw: string | null): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    const lines = Array.isArray(parsed) ? parsed : record(parsed) && parsed.version === 2 ? parsed.items : null;
    if (!Array.isArray(lines)) return [];
    return lines.reduce<CartItem[]>((items, line: unknown) => {
      if (!record(line) || !record(line.product) || !record(line.variant) || !record(line.color)) return items;
      const { product, variant, color, quantity } = line;
      if (!strings(product, ['id', 'slug', 'name', 'thumbnail']) || !strings(variant, ['id', 'sku']) || !strings(color, ['id', 'name', 'hex', 'image'])) return items;
      if (!money(variant.price) || !money(variant.originalPrice) || typeof variant.inStock !== 'boolean') return items;
      if (typeof quantity !== 'number' || !validQuantity(quantity)) return items;
      for (const key of ['storage', 'screenSize', 'connectivity', 'chip']) {
        if (variant[key] !== undefined && typeof variant[key] !== 'string') return items;
      }
      // Select known fields only; old carts included entire product descriptions and galleries.
      const item = createCartItem(
        { id: product.id as string, slug: product.slug as string, name: product.name as string, thumbnail: product.thumbnail as string },
        { id: variant.id as string, sku: variant.sku as string, price: variant.price, originalPrice: variant.originalPrice,
          inStock: variant.inStock, storage: variant.storage as string | undefined, screenSize: variant.screenSize as string | undefined,
          connectivity: variant.connectivity as string | undefined, chip: variant.chip as string | undefined },
        { id: color.id as string, name: color.name as string, hex: color.hex as string, image: color.image as string }, quantity,
      );
      return cartReducer(items, { type: 'ADD_ITEM', payload: item });
    }, []);
  } catch { return []; }
}
export function loadCart(storage?: StoragePort): CartItem[] {
  try {
    const source = storage ?? window.localStorage;
    return decodeCart(source.getItem(CART_STORAGE_KEY) ?? source.getItem(LEGACY_KEY));
  } catch { return []; }
}
export function saveCart(items: CartItem[], storage?: StoragePort): void {
  try {
    (storage ?? window.localStorage).setItem(CART_STORAGE_KEY, JSON.stringify({ version: 2, items }));
  } catch { /* Storage may be disabled or full; keep the in-memory cart usable. */ }
}
