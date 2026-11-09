export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export interface OrderEvent { id: string; at: string; actor: string; kind: 'status' | 'payment'; from: string; to: string; note: string }
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'cod' | 'vnpay' | 'momo';
export type ShippingMethod = 'standard' | 'express';

export interface CustomerInfo {
  fullName: string;
  email?: string;
  phone: string;
}

export interface ShippingAddress {
  address: string;
  province: string;
  district: string;
  ward: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  variantId: string;
  colorName: string;
  storage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  customerId?: string;
  revision?: number;
  completedAt?: string;
  history?: OrderEvent[];
  id: string;
  orderCode: string;
  customer: CustomerInfo;
  shippingAddress: ShippingAddress;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  createdAt: string;
}

export interface CreateOrderInput {
  customerId?: string;
  requestId?: string;
  expectedTotal?: number;
  items: { productId: string; variantId: string; colorId: string; quantity: number }[];
  customer: CustomerInfo;
  shippingAddress: ShippingAddress;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
}
