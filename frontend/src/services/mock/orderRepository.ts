import type { Order } from '../../types/order';
import { STATUS_LABELS, PAYMENT_LABELS } from '../../domain/orders';

export const ORDER_STORAGE_KEY = 'aura_demo_orders_v1';
export interface OrderStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface StoredOrder { order: Order; requestId?: string; fingerprint: string }
const memory = new Map<string, string>();
const memoryStorage: OrderStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, value); },
};
function storage(): OrderStorage { return typeof window === 'undefined' ? memoryStorage : window.localStorage; }
function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') return false;
  const order = value as Order;
  return typeof order.id === 'string' && typeof order.orderCode === 'string' &&
    (order.customerId === undefined || typeof order.customerId === 'string') &&
    Object.hasOwn(STATUS_LABELS, order.status) && Object.hasOwn(PAYMENT_LABELS, order.paymentStatus) &&
    (order.revision === undefined || (Number.isSafeInteger(order.revision) && order.revision >= 0)) &&
    (order.completedAt === undefined || Number.isFinite(Date.parse(order.completedAt))) &&
    (order.status !== 'COMPLETED' || !!order.completedAt) &&
    (order.history === undefined || (Array.isArray(order.history) && order.history.every((e) => typeof e.id === 'string' && typeof e.actor === 'string' && typeof e.note === 'string' && typeof e.from === 'string' && typeof e.to === 'string' && ['status', 'payment'].includes(e.kind) && Number.isFinite(Date.parse(e.at))))) &&
    (order.customer?.email === undefined || typeof order.customer.email === 'string') &&
    typeof order.customer?.fullName === 'string' && typeof order.customer?.phone === 'string' &&
    typeof order.shippingAddress?.address === 'string' && typeof order.shippingAddress?.province === 'string' &&
    typeof order.shippingAddress?.ward === 'string' && typeof order.shippingAddress?.district === 'string' &&
    (order.shippingAddress.notes === undefined || typeof order.shippingAddress.notes === 'string') &&
    typeof order.createdAt === 'string' && Number.isFinite(Date.parse(order.createdAt)) &&
    ['standard', 'express'].includes(order.shippingMethod) && ['cod', 'vnpay', 'momo'].includes(order.paymentMethod) &&
    [order.total, order.subtotal, order.shippingFee, order.discount].every((amount) => Number.isSafeInteger(amount) && amount >= 0) &&
    Array.isArray(order.items) && order.items.length > 0 && order.items.every((line) =>
      typeof line.productName === 'string' && typeof line.variantId === 'string' && typeof line.productId === 'string' &&
      typeof line.colorName === 'string' && typeof line.productImage === 'string' &&
      (line.storage === undefined || typeof line.storage === 'string') &&
      Number.isInteger(line.quantity) && line.quantity > 0 &&
      [line.unitPrice, line.totalPrice].every((amount) => Number.isSafeInteger(amount) && amount >= 0));
}
export function createOrderRepository(getStorage: () => OrderStorage = storage) {
  function read(): StoredOrder[] {
    try {
      const raw = getStorage().getItem(ORDER_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Legacy PAID was a fulfillment status. Preserve payment, migrate fulfillment explicitly.
      if (Array.isArray(parsed.orders)) for (const entry of parsed.orders) { if (entry?.order?.status === 'PAID') { entry.order.status = 'CONFIRMED'; entry.order.paymentStatus = 'PAID'; } }
      if (parsed.version !== 1 || !Array.isArray(parsed.orders) || !parsed.orders.every((entry: StoredOrder) => isOrder(entry?.order) && typeof entry.fingerprint === 'string')) throw new Error('Invalid data');
      return parsed.orders;
    } catch { throw new Error('Không đọc được đơn demo trên trình duyệt này. Kiểm tra quyền lưu trữ hoặc thử lại trên trình duyệt khác.'); }
  }
  return {
    list: () => read().map((entry) => entry.order),
    update(id: string, expectedRevision: number, transform: (order: Order) => Order) {
      const entries = read(); const index = entries.findIndex((entry) => entry.order.id === id);
      if (index < 0) throw new Error('Không tìm thấy đơn hàng.');
      if ((entries[index].order.revision ?? 0) !== expectedRevision) throw new Error('Đơn đã thay đổi. Hãy tải lại trước khi cập nhật.');
      const order = transform(entries[index].order);
      if (!isOrder(order)) throw new Error('Dữ liệu đơn cập nhật không hợp lệ.');
      entries[index] = { ...entries[index], order };
      try { getStorage().setItem(ORDER_STORAGE_KEY, JSON.stringify({ version: 1, orders: entries })); }
      catch { throw new Error('Không lưu được trạng thái. Đơn hàng chưa thay đổi; hãy thử lại.'); }
      return order;
    },
    find: (id: string) => read().find((entry) => entry.order.id === id)?.order ?? null,
    findRequest: (requestId: string) => read().find((entry) => entry.requestId === requestId),
    save(entry: StoredOrder) {
      const orders = read();
      try { getStorage().setItem(ORDER_STORAGE_KEY, JSON.stringify({ version: 1, orders: [...orders, entry] })); }
      catch { throw new Error('Không lưu được đơn demo. Hãy cho phép lưu trữ trên trình duyệt rồi thử lại. Giỏ hàng của bạn vẫn được giữ.'); }
    },
  };
}
