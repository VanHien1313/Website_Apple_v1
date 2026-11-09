import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Order } from '../src/types/order';
import { changeOrder, nextStatuses, queryOrders, reportRevenue, vietnamDay } from '../src/domain/orders';
import { createOrderRepository, ORDER_STORAGE_KEY } from '../src/services/mock/orderRepository';
import { createAdminOrderService } from '../src/services/adminOrderService';
const sample = (): Order => ({ id: 'order-1', orderCode: 'APL-TEST', customer: { fullName: 'Khách mẫu', phone: '0901234567' }, shippingAddress: { address: '12 đường mẫu', ward: 'Phường mẫu', district: '', province: 'Thành phố mẫu' }, shippingMethod: 'standard', paymentMethod: 'cod', status: 'PENDING', paymentStatus: 'PENDING', createdAt: '2026-10-16T16:00:00Z', subtotal: 100000, shippingFee: 50000, discount: 0, total: 150000, items: [{ productId: 'p', variantId: 'v', productName: 'Sản phẩm mẫu', productImage: '/test.png', colorName: 'Đen', quantity: 1, unitPrice: 100000, totalPrice: 100000 }] });
const at = '2026-10-16T18:00:00Z';
test('fulfillment follows allowed transitions, requires payment to complete and records immutable history', () => {
  let order = sample(); const original = structuredClone(order);
  assert.throws(() => changeOrder(order, 'status', 'DELIVERED', 'test', 'Admin', at), /Không thể/);
  for (const status of ['PROCESSING', 'SHIPPED', 'DELIVERED']) order = changeOrder(order, 'status', status, 'Mẫu', 'Admin', at);
  assert.deepEqual(nextStatuses(order), []);
  assert.throws(() => changeOrder(order, 'status', 'COMPLETED', 'test', 'Admin', at), /Không thể/);
  order = changeOrder(order, 'payment', 'PAID', 'Thu COD mẫu', 'Admin', at);
  order = changeOrder(order, 'status', 'COMPLETED', 'Xong', 'Admin', at);
  assert.equal(order.completedAt, at); assert.equal(order.history?.length, 5); assert.equal(order.revision, 5);
  assert.deepEqual(sample(), original); assert.deepEqual(nextStatuses(order), []);
  assert.throws(() => changeOrder(order, 'status', 'CANCELLED', 'test', 'Admin', at));
});
test('cancellation, blank notes and payment rules reject invalid actions', () => {
  const order = sample();
  assert.throws(() => changeOrder(order, 'status', 'PROCESSING', ' ', 'Admin', at));
  assert.throws(() => changeOrder(order, 'payment', 'PAID', 'Mẫu', 'Admin', at));
  const cancelled = changeOrder(order, 'status', 'CANCELLED', 'Khách yêu cầu', 'Admin', at);
  assert.deepEqual(nextStatuses(cancelled), []);
  assert.throws(() => changeOrder(cancelled, 'payment', 'PAID', 'Mẫu', 'Admin', at));
});
test('report uses Vietnam completion day, Monday buckets and excludes cancelled/unpaid/refunded', () => {
  const done: Order = { ...sample(), status: 'COMPLETED', paymentStatus: 'PAID', completedAt: at };
  const rows = [done, { ...done, id: '2', status: 'CANCELLED' as const }, { ...done, id: '3', paymentStatus: 'REFUNDED' as const }, { ...done, id: '4', paymentStatus: 'PENDING' as const }];
  assert.equal(vietnamDay(at), '2026-10-17');
  assert.equal(reportRevenue(rows, '2026-10-16', '2026-10-16', 'day').total, 0);
  for (const period of ['day', 'week', 'month'] as const) {
    const report = reportRevenue(rows, '2026-10-01', '2026-10-31', period);
    assert.equal(report.total, 150000); assert.equal(report.count, 1); assert.equal(report.rows.reduce((s, r) => s + r.amount, 0), report.total);
  }
  assert.equal(reportRevenue(rows, '2026-10-17', '2026-10-17', 'week').rows[0].label, '2026-10-12');
  assert.throws(() => reportRevenue(rows, '2026-02-30', '2026-03-01', 'day'));
  assert.throws(() => reportRevenue(rows, '2026-10-18', '2026-10-17', 'day'));
  assert.throws(() => reportRevenue(rows, '2020-01-01', '2026-01-01', 'day'));
});
test('order query filters dates and recipient, sorts and clamps pagination', () => {
  const orders = Array.from({ length: 19 }, (_, i) => ({ ...sample(), id: String(i), total: i + 1 }));
  assert.equal(queryOrders(orders, { q: 'KHÁCH', from: '2026-10-16', to: '2026-10-16', sort: 'total_desc' }).items[0].total, 19);
  assert.equal(queryOrders(orders, { page: 999 }).page, 3);
  assert.equal(queryOrders(orders, { status: 'CANCELLED' }).total, 0);
});
test('repository update preserves idempotency metadata, rejects stale revision and storage errors', async () => {
  const data = new Map<string, string>(); let blocked = false;
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { if (blocked) throw new Error(); data.set(k, v); } };
  const repo = createOrderRepository(() => storage); repo.save({ order: sample(), requestId: 'req', fingerprint: 'original' });
  const service = createAdminOrderService(repo, () => 'Admin mẫu', () => at);
  await service.update('order-1', 0, 'status', 'PROCESSING', 'Mẫu');
  assert.equal(repo.findRequest('req')?.fingerprint, 'original');
  await assert.rejects(service.update('order-1', 0, 'status', 'SHIPPED', 'Mẫu'), /đã thay đổi/);
  blocked = true; await assert.rejects(service.update('order-1', 1, 'status', 'SHIPPED', 'Mẫu'), /Không lưu/);
  assert.equal(repo.find('order-1')?.status, 'PROCESSING');
  await assert.rejects(createAdminOrderService(repo, () => { throw new Error('No session'); }).list(), /No session/);
  blocked = false;
  const legacy = { ...sample(), status: 'PAID' }; data.set(ORDER_STORAGE_KEY, JSON.stringify({ version: 1, orders: [{ order: legacy, fingerprint: 'old' }] }));
  assert.equal(repo.find('order-1')?.status, 'CONFIRMED'); assert.equal(repo.find('order-1')?.paymentStatus, 'PAID');
});
