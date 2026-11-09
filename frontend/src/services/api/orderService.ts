import { request } from './http';

export interface OrderRequest {
  requestId: string; receiptToken: string;
  items: { skuId: string; quantity: number }[];
  shippingMethod: 'standard' | 'express'; paymentMethod: 'cod';
  expectedTotal: number; expectedPrices: { skuId: string; price: number }[];
  customer: { fullName: string; phone: string; email: string };
  shippingAddress: { address: string; province: string; ward: string; notes: string };
}
export interface ApiOrder {
  id: string; orderCode: string; status: string; paymentStatus: string; createdAt: string;
  customer: OrderRequest['customer']; shippingAddress: OrderRequest['shippingAddress'];
  shippingMethod: string; subtotal: number; shippingFee: number; total: number;
  items: { skuId: string; productName: string; colorName: string; storage: string | null; quantity: number; unitPrice: number; totalPrice: number }[];
}
export const createOrder = (body: OrderRequest) => request<{ replayed: boolean; order: ApiOrder }>('/orders', { method: 'POST', body, signal: AbortSignal.timeout(30000) });
export const getOrder = (id: string, receiptToken?: string, signal?: AbortSignal) => request<ApiOrder>(`/orders/${encodeURIComponent(id)}`, { receiptToken, signal });

const pendingKey = 'aura_checkout_pending_v1';
// Tab-scoped recovery: persist BEFORE sending. Storage errors must prevent a new submission.
export function readPending(): OrderRequest | null {
  const raw = sessionStorage.getItem(pendingKey);
  if (!raw) return null;
  const value = JSON.parse(raw) as OrderRequest;
  if (!value || typeof value.requestId !== 'string' || !/^[a-f0-9]{64}$/.test(value.receiptToken) || !Array.isArray(value.items) || !value.customer || !value.shippingAddress) throw new Error('Không đọc được yêu cầu đang chờ. Không gửi đơn mới trước khi kiểm tra đơn cũ.');
  return value;
}
export function savePending(value: OrderRequest) { sessionStorage.setItem(pendingKey, JSON.stringify(value)); }
export function clearPending() { sessionStorage.removeItem(pendingKey); }
export function saveReceipt(id: string, token: string) { sessionStorage.setItem(`aura_receipt_v1:${id.toLowerCase()}`, token); }
export function readReceipt(id: string) { return sessionStorage.getItem(`aura_receipt_v1:${id.toLowerCase()}`) ?? undefined; }
export function newReceiptToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join(''); }
