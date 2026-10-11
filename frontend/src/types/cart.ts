import { Product, ProductColor, ProductVariant } from './product';

export interface CartItem {
  id: string; // composite key: `${productId}_${variantId}_${colorId}`
  product: Product;
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
