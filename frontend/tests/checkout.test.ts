import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_PRODUCTS } from '../src/data/mockProducts';
import { createCartItem, calculateTotals } from '../src/domain/cart';
import { validateCheckout } from '../src/domain/checkout';
import { createMockOrderService } from '../src/services/mock/orderService';
import { createOrderRepository, ORDER_STORAGE_KEY } from '../src/services/mock/orderRepository';
import type { CreateOrderInput } from '../src/types/order';
const product = MOCK_PRODUCTS[0];
const line = createCartItem(product, product.variants[0], product.colors[0]);
const input: CreateOrderInput = {
  customer: { fullName: 'Khách thử nghiệm', phone: '0901234567' },
  shippingAddress: { address: '12 đường mẫu', province: 'Thành phố mẫu', ward: 'Phường mẫu', district: '' },
  shippingMethod: 'standard', paymentMethod: 'cod',
  items: [{ productId: product.id, variantId: line.variant.id, colorId: line.color.id, quantity: 1 }],
};
function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  return { data, storage, service: createMockOrderService(createOrderRepository(() => storage)) };
}
test('guest checkout accepts omitted/empty email, rejects malformed email and missing address fields', () => {
  assert.deepEqual(validateCheckout(input), {});
  assert.deepEqual(validateCheckout({ ...input, customer: { ...input.customer, email: '  ' } }), {});
  assert.ok(validateCheckout({ ...input, customer: { ...input.customer, email: 'invalid' } }).email);
  assert.ok(validateCheckout({ ...input, shippingAddress: { ...input.shippingAddress, ward: '' } }).ward);
  assert.ok(validateCheckout({ ...input, shippingAddress: { ...input.shippingAddress, province: '' } }).province);
});
test('quote replaces stale prices without mutating cart and flags unavailable configurations', async () => {
  const { service } = setup();
  const stale = { ...line, variant: { ...line.variant, price: 1 } };
  const quote = await service.quoteCart([stale], 'express');
  assert.equal(quote.items[0].variant.price, line.variant.price);
  assert.equal(stale.variant.price, 1);
  assert.equal(quote.grandTotal, calculateTotals([line], 'express').grandTotal);
  const unavailable = await service.quoteCart([{ ...line, color: { ...line.color, id: 'missing' } }], 'standard');
  assert.equal(unavailable.issues.length, 1);
  const products = structuredClone(MOCK_PRODUCTS);
  products[0].variants[0].inStock = false;
  const stockService = createMockOrderService(createOrderRepository(() => setup().storage), products);
  assert.equal((await stockService.quoteCart([line], 'standard')).issues.length, 1);
  await assert.rejects(stockService.createOrder(input));
});
test('saved order survives a fresh service instance and retains unpaid state', async () => {
  const { service, storage } = setup();
  const order = await service.createOrder(input);
  const restored = await createMockOrderService(createOrderRepository(() => storage)).getOrder(order.id);
  assert.deepEqual(restored, order);
  assert.equal(restored?.paymentStatus, 'PENDING');
  assert.equal(restored?.customer.email, undefined);
  assert.equal(await service.getOrder('not-found'), null);
});
test('same request is idempotent, altered request rejected, stale expected total rejected', async () => {
  const { service, data } = setup();
  const order = await service.createOrder({ ...input, requestId: 'test-request' });
  assert.equal((await service.createOrder({ ...input, requestId: 'test-request' })).id, order.id);
  assert.equal(JSON.parse(data.get(ORDER_STORAGE_KEY)!).orders.length, 1);
  await assert.rejects(service.createOrder({ ...input, requestId: 'test-request', shippingMethod: 'express' }));
  await assert.rejects(service.createOrder({ ...input, expectedTotal: 1 }));
  await assert.rejects(service.createOrder({ ...input, items: [input.items[0], input.items[0]] }));
  assert.equal(JSON.parse(data.get(ORDER_STORAGE_KEY)!).orders.length, 1);
});
test('storage failure rejects creation; corrupt storage is not silently overwritten', async () => {
  const { storage, data } = setup();
  const service = createMockOrderService(createOrderRepository(() => ({ ...storage, setItem: () => { throw Error('quota'); } })));
  await assert.rejects(service.createOrder(input), /Không lưu được/);
  assert.equal(data.size, 0);
  data.set(ORDER_STORAGE_KEY, '{broken');
  await assert.rejects(createMockOrderService(createOrderRepository(() => storage)).createOrder(input), /Không đọc được/);
  assert.equal(data.get(ORDER_STORAGE_KEY), '{broken');
});
test('malformed saved order renders a recoverable error, abort does not persist an order', async () => {
  const { service, data } = setup();
  const controller = new AbortController(); controller.abort();
  await assert.rejects(service.createOrder(input, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(data.size, 0);
  const order = await service.createOrder(input);
  const parsed = JSON.parse(data.get(ORDER_STORAGE_KEY)!);
  parsed.orders[0].order.createdAt = 'invalid';
  data.set(ORDER_STORAGE_KEY, JSON.stringify(parsed));
  await assert.rejects(service.getOrder(order.id), /Không đọc được/);
});
