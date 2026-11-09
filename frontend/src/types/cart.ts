import { Product, ProductColor, ProductVariant } from './product';

export interface CartItem {
  id: string; // JSON tuple [productId, variantId, colorId] avoids delimiter collisions.
  product: Pick<Product, 'id' | 'slug' | 'name' | 'thumbnail'>;
  variant: ProductVariant;
  color: ProductColor;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  shippingFee: number;
  grandTotal: number;
}
