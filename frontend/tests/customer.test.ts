import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCustomerService, CUSTOMER_KEY, CUSTOMER_SESSION_KEY } from '../src/services/customerService';
import { createOrderRepository } from '../src/services/mock/orderRepository';
import { createMockOrderService } from '../src/services/mock/orderService';
import { MOCK_PRODUCTS } from '../src/data/mockProducts';
import type { CreateOrderInput } from '../src/types/order';
function memory() { const values = new Map<string, string>(); return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } }; }
const registration = { fullName: 'Khách mẫu', phone: '0901234567', email: 'sample@example.test', password: 'Sample-password-123' };
test('committed password change succeeds even when stale session cleanup fails', async () => {
  const persistent = memory(), session = memory();
  const service = createCustomerService(() => persistent, () => ({ ...session, removeItem() { throw new Error('Storage denied'); } }));
  await service.register(registration); await service.login(registration.email, registration.password);
  await service.changePassword(registration.password, 'Another-sample-password-123');
  assert.equal(service.current(), null);
  await assert.rejects(service.login(registration.email, registration.password), /không đúng/);
  await service.login(registration.email, 'Another-sample-password-123');
  assert.ok(service.current());
});
test('unavailable session storage returns an actionable localized error', () => {
  const service = createCustomerService(() => memory(), () => { throw new Error('SecurityError'); });
  assert.throws(() => service.current(), /Phiên khách hàng không đọc được/);
});
function setup() { const persistent = memory(), session = memory(), orderStorage = memory(); const orders = createOrderRepository(() => orderStorage); return { persistent, session, orders, service: createCustomerService(() => persistent, () => session, orders) }; }
const product = MOCK_PRODUCTS[0];
function input(customerId?: string): CreateOrderInput { return { customerId, customer: { fullName: registration.fullName, email: registration.email, phone: registration.phone }, shippingAddress: { address: '12 đường mẫu', ward: 'Phường mẫu', province: 'Thành phố mẫu', district: '' }, shippingMethod: 'standard', paymentMethod: 'cod', items: [{ productId: product.id, variantId: product.variants[0].id, colorId: product.colors[0].id, quantity: 1 }] }; }
test('registration validates identity, normalizes email and never stores plaintext password', async () => {
  const { service, persistent } = setup();
  await assert.rejects(service.register({ ...registration, password: 'short' }), /12/);
  await assert.rejects(service.register({ ...registration, phone: 'invalid' }), /chưa hợp lệ/);
  const profile = await service.register({ ...registration, email: ' SAMPLE@EXAMPLE.TEST ' });
  assert.equal(profile.email, registration.email); assert.equal(service.current(), null);
  assert.ok(!persistent.getItem(CUSTOMER_KEY)!.includes(registration.password));
  await assert.rejects(service.register(registration), /đã được đăng ký/);
});
test('login, expiry and password change invalidate old sessions and old passwords', async () => {
  const { service, session, persistent, orders } = setup(); await service.register(registration);
  await assert.rejects(service.login(registration.email, 'wrong'), /không đúng/);
  const user = await service.login(registration.email, registration.password); assert.equal(service.current()?.id, user.id);
  const otherSession = memory(); otherSession.setItem(CUSTOMER_SESSION_KEY, session.getItem(CUSTOMER_SESSION_KEY)!);
  const other = createCustomerService(() => persistent, () => otherSession, orders);
  await assert.rejects(service.changePassword('wrong', 'New-sample-password-123'), /hiện tại/);
  await service.changePassword(registration.password, 'New-sample-password-123');
  assert.equal(service.current(), null); assert.equal(other.current(), null);
  await assert.rejects(service.login(registration.email, registration.password), /không đúng/);
  await service.login(registration.email, 'New-sample-password-123');
  const s = JSON.parse(session.getItem(CUSTOMER_SESSION_KEY)!); s.expires = 1; session.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(s)); assert.equal(service.current(), null);
});
test('orders bind to session identity, never claim guest orders by email and prevent cross-account access', async () => {
  const { service, orders } = setup(); const owner = await service.register(registration); await service.login(registration.email, registration.password);
  const adapter = createMockOrderService(orders, MOCK_PRODUCTS, service.current);
  await assert.rejects(adapter.createOrder(input('forged')), /Phiên/);
  const mine = await adapter.createOrder(input(owner.id));
  await createMockOrderService(orders, MOCK_PRODUCTS, () => null).createOrder(input());
  assert.equal((await service.listOrders()).total, 1);
  const other = await service.register({ ...registration, email: 'other@example.test' }); await service.login(other.email, registration.password);
  assert.equal(await service.getOrder(mine.id), null); assert.equal(await adapter.getOrder(mine.id), null);
  await assert.rejects(service.cancelOrder(mine.id, 0, 'Mẫu'), /quyền/);
  assert.equal((await service.listOrders()).total, 0);
});
test('customer cancellation preserves history, rejects stale data and shipped orders', async () => {
  const { service, orders } = setup(); const user = await service.register(registration); await service.login(user.email, registration.password);
  const adapter = createMockOrderService(orders, MOCK_PRODUCTS, service.current); const order = await adapter.createOrder(input(user.id));
  await assert.rejects(service.cancelOrder(order.id, 0, ' '), /ghi chú/);
  const cancelled = await service.cancelOrder(order.id, 0, 'Đổi nhu cầu'); assert.equal(cancelled.status, 'CANCELLED'); assert.match(cancelled.history![0].actor, /Khách/);
  await assert.rejects(service.cancelOrder(order.id, 0, 'Lặp'), /đã thay đổi/);
  const shipped = await adapter.createOrder(input(user.id)); orders.update(shipped.id, 0, (o) => ({ ...o, status: 'SHIPPED', revision: 1 }));
  await assert.rejects(service.cancelOrder(shipped.id, 1, 'Mẫu'), /Không thể/);
});
test('storage failures preserve credentials and corrupt profiles fail closed', async () => {
  const { service, persistent } = setup(); await service.register(registration); await service.login(registration.email, registration.password);
  persistent.setItem = () => { throw new Error('quota'); };
  await assert.rejects(service.changePassword(registration.password, 'New-sample-password-123'), /Không lưu/);
  await service.login(registration.email, registration.password);
  persistent.values.set(CUSTOMER_KEY, '{bad'); await assert.rejects(service.login(registration.email, registration.password), /Không đọc/);
});
