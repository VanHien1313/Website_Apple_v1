import type { Order, OrderStatus, PaymentStatus } from '../types/order';
export const STATUS_LABELS: Record<OrderStatus, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị', SHIPPED: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };
export const PAYMENT_LABELS: Record<PaymentStatus, string> = { PENDING: 'Chưa thanh toán', PAID: 'Đã thanh toán (demo)', FAILED: 'Thanh toán thất bại', REFUNDED: 'Đã hoàn tiền (demo)' };
const transitions: Record<OrderStatus, OrderStatus[]> = { PENDING: ['PROCESSING', 'CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: ['COMPLETED'], COMPLETED: [], CANCELLED: [] };
export const nextStatuses = (order: Order) => transitions[order.status].filter((s) => s !== 'COMPLETED' || order.paymentStatus === 'PAID');
export function changeOrder(order: Order, kind: 'status' | 'payment', target: string, note: string, actor: string, at: string): Order {
  if (!note.trim()) throw new Error('Nhập ghi chú để lưu lịch sử thao tác.');
  const next = structuredClone(order);
  const from = kind === 'status' ? order.status : order.paymentStatus;
  if (kind === 'status') {
    if (!nextStatuses(order).includes(target as OrderStatus)) throw new Error('Không thể chuyển sang trạng thái này. Hãy tải lại đơn.');
    next.status = target as OrderStatus;
    if (target === 'COMPLETED') next.completedAt = at;
  } else {
    const canPay = ['DELIVERED', 'COMPLETED'].includes(order.status) && ['PENDING', 'FAILED'].includes(order.paymentStatus) && target === 'PAID';
    const canRefund = order.paymentStatus === 'PAID' && target === 'REFUNDED';
    if (!canPay && !canRefund) throw new Error('Thay đổi thanh toán không hợp lệ. Chỉ ghi nhận thu tiền sau khi giao hàng.');
    next.paymentStatus = target as PaymentStatus;
  }
  next.revision = (order.revision ?? 0) + 1;
  next.history = [...(order.history ?? []), { id: crypto.randomUUID(), at, actor, kind, from, to: target, note: note.trim() }];
  return next;
}
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
export function vietnamDay(iso: string) {
  const parts = dayFormatter.formatToParts(new Date(iso));
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
}
export interface OrderQuery { q?: string; status?: string; from?: string; to?: string; sort?: string; page?: number }
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function queryOrders(orders: Order[], query: OrderQuery) {
  if ((query.from && !validDay(query.from)) || (query.to && !validDay(query.to)) || (query.from && query.to && query.from > query.to)) throw new Error('Khoảng ngày tạo đơn không hợp lệ.');
  const q = query.q?.trim().toLocaleLowerCase('vi') || '';
  const rows = orders.filter((o) => (!q || `${o.orderCode} ${o.customer.fullName} ${o.customer.phone}`.toLocaleLowerCase('vi').includes(q)) && (!query.status || o.status === query.status) && (!query.from || vietnamDay(o.createdAt) >= query.from) && (!query.to || vietnamDay(o.createdAt) <= query.to));
  rows.sort((a, b) => query.sort === 'oldest' ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : query.sort === 'total_desc' ? b.total - a.total : Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const raw = query.page ?? 1; const page = Math.min(Math.max(1, Number.isSafeInteger(raw) ? raw : 1), Math.max(1, Math.ceil(rows.length / 8)));
  return { items: rows.slice((page - 1) * 8, page * 8), total: rows.length, page, pageSize: 8 };
}
export type ReportPeriod = 'day' | 'week' | 'month';
export function reportRevenue(orders: Order[], from: string, to: string, period: ReportPeriod) {
  if (!validDay(from) || !validDay(to) || from > to) throw new Error('Chọn khoảng ngày hợp lệ, ngày bắt đầu không sau ngày kết thúc.');
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 366) throw new Error('Chọn khoảng báo cáo tối đa 367 ngày.');
  const bucket = (day: string) => {
    if (period === 'month') return day.slice(0, 7);
    if (period === 'day') return day;
    const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10);
  };
  const bins = new Map<string, { label: string; count: number; amount: number }>();
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) { const label = bucket(new Date(t).toISOString().slice(0, 10)); if (!bins.has(label)) bins.set(label, { label, count: 0, amount: 0 }); }
  const included = orders.filter((o) => o.status === 'COMPLETED' && o.paymentStatus === 'PAID' && o.completedAt && vietnamDay(o.completedAt) >= from && vietnamDay(o.completedAt) <= to);
  for (const o of included) { const bin = bins.get(bucket(vietnamDay(o.completedAt!)))!; bin.count++; bin.amount += o.total; }
  const rows = [...bins.values()];
  return { rows, count: included.length, total: rows.reduce((sum, r) => sum + r.amount, 0) };
}
