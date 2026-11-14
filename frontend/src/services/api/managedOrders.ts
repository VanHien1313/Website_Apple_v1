import { request } from './http';
import type { ApiOrder } from './orderService';
export const orderLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị', SHIPPED: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };
export const paymentLabels: Record<string, string> = { PENDING: 'Chưa thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thanh toán thất bại', REFUNDED: 'Đã hoàn tiền' };
export const actionLabel = (kind: string, target: string) => kind === 'receipt' ? (target === 'CONFIRMED' ? 'Tôi đã nhận hàng' : 'Tôi chưa nhận được hàng') : kind === 'payment' ? 'Ghi nhận đã thu tiền COD' : ({ PROCESSING: 'Xác nhận và chuẩn bị hàng', SHIPPED: 'Bàn giao vận chuyển', DELIVERED: 'Xác nhận đã giao', COMPLETED: 'Hoàn thành đơn', CANCELLED: 'Hủy đơn' } as Record<string, string>)[target] ?? target;
export interface ManagedOrder extends ApiOrder {
  receipt: { status:string; deliveredAt:string|null; confirmedAt:string|null; deadline:string|null };
  revision: number;
  actions: { kind: string; target: string }[];
  history: { id: string; actor: string; kind: string; from: string; to: string; note: string; at: string }[];
}
export interface OrderList { items: { id: string; orderCode: string; customerName: string; status: string; paymentStatus: string; receiptStatus:string; total: number; createdAt: string }[]; total: number; page: number; pageSize: number }
const base = (admin: boolean) => admin ? '/admin/orders' : '/account/orders';
export const listOrders = (admin: boolean, query: string, signal: AbortSignal) => request<OrderList>(`${base(admin)}?${query}`, { signal });
export const readManagedOrder = (admin: boolean, id: string, signal: AbortSignal) => request<ManagedOrder>(`${base(admin)}/${encodeURIComponent(id)}`, { signal });
export const updateOrder = (admin: boolean, id: string, body: { revision: number; kind: string; target: string; note: string }) => request<ManagedOrder>(`${base(admin)}/${encodeURIComponent(id)}/actions`, { method: 'POST', body, signal: AbortSignal.timeout(30000) });
