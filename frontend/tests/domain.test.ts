import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_PRODUCTS } from '../src/data/mockProducts';
import { filterProducts, queryCatalog, parseCatalogParams } from '../src/domain/catalog';
import { calculateTotals, createCartItem, cartReducer, MAX_QUANTITY } from '../src/domain/cart';
import { decodeCart, loadCart, saveCart, CART_STORAGE_KEY } from '../src/store/cartStorage';
import { mockOrderService } from '../src/services/mock/orderService';
import { mockProductService } from '../src/services/mock/productService';
import type { CreateOrderInput } from '../src/types/order';

const product = MOCK_PRODUCTS[0];
const item = createCartItem(product, product.variants[0], product.colors[0]);
const input: CreateOrderInput = {
  customer: { fullName: 'Test User', email: 'test@example.com', phone: '0988776655' },
  shippingAddress: { address: '123 Test', province: 'Hà Nội', district: 'Cầu Giấy', ward: 'Test' },
  shippingMethod: 'express', paymentMethod: 'cod',
  items: [{ productId: product.id, variantId: item.variant.id, colorId: item.color.id, quantity: 2 }],
};

test('search covers every category, preserves input order and honors zero max price', () => {
  const before = MOCK_PRODUCTS.map((value) => value.id);
  const matches = filterProducts(MOCK_PRODUCTS, { searchQuery: ' MAC ', sort: 'price_asc' });
  assert.ok(matches.length > 0);
  assert.ok(matches.every((value) => value.category === 'mac'));
  assert.ok(matches.every((value, index) => !index || matches[index - 1].basePrice <= value.basePrice));
  assert.deepEqual(MOCK_PRODUCTS.map((value) => value.id), before);
  assert.equal(filterProducts(MOCK_PRODUCTS, { maxPrice: 0 }).length, 0);
});

test('price brackets include each boundary exactly once', () => {
  const products = [14_999_999, 15_000_000, 25_000_000, 25_000_001, 35_000_000, 35_000_001]
    .map((basePrice, index) => ({ ...product, id: String(index), basePrice }));
  assert.deepEqual(['under15', '15to25', '25to35', 'above35'].map((priceRange) =>
    filterProducts(products, { priceRange: priceRange as 'under15' }).length), [1, 2, 2, 1]);
});

test('pagination clamps invalid pages and returns category facets independently of filters', () => {
  const result = queryCatalog(MOCK_PRODUCTS, { category: 'iphone', page: 999, pageSize: 2, subCategory: 'Pro Series' });
  assert.equal(result.page, Math.max(1, Math.ceil(result.total / 2)));
  assert.ok(result.items.length <= 2);
  assert.ok(result.categoryTotal >= result.total);
  assert.ok(result.subCategories.length > 1);
  assert.equal(queryCatalog([], { page: -1, pageSize: 0 }).page, 1);
  assert.deepEqual(parseCatalogParams(new URLSearchParams('page=NaN&sort=bad&priceRange=bad')).sort, 'featured');
  assert.equal(parseCatalogParams(new URLSearchParams('category=mac&q=Mac')).category, 'mac');
  assert.equal(parseCatalogParams(new URLSearchParams('category=invalid!')).category, undefined);
  assert.equal(parseCatalogParams(new URLSearchParams('category=accessories')).category, 'accessories');
});

test('cart merges equal variants and keeps colors separate', () => {
  const added = cartReducer([item], { type: 'ADD_ITEM', payload: item });
  assert.equal(added[0].quantity, 2);
  assert.equal(item.quantity, 1);
  const different = createCartItem(product, product.variants[0], { ...product.colors[0], id: 'another-color' });
  assert.equal(cartReducer(added, { type: 'ADD_ITEM', payload: different }).length, 2);
});

test('cart rejects non-integer/invalid quantities and caps repeated additions', () => {
  for (const quantity of [-1, NaN, Infinity, 1.5, MAX_QUANTITY + 1]) {
    assert.deepEqual(cartReducer([item], { type: 'UPDATE_QUANTITY', payload: { itemId: item.id, quantity } }), [item]);
  }
  assert.equal(cartReducer([item], { type: 'UPDATE_QUANTITY', payload: { itemId: item.id, quantity: 0 } }).length, 0);
  assert.equal(cartReducer([{ ...item, quantity: MAX_QUANTITY }], { type: 'ADD_ITEM', payload: item })[0].quantity, MAX_QUANTITY);
});

test('one shipping policy applies to threshold, express and empty carts', () => {
  const cheap = { ...item, variant: { ...item.variant, price: 10_000_000, originalPrice: 11_000_000 } };
  assert.equal(calculateTotals([cheap]).shippingFee, 50_000);
  assert.equal(calculateTotals([{ ...cheap, quantity: 2 }]).shippingFee, 0);
  assert.equal(calculateTotals([cheap], 'express').grandTotal, 10_050_000);
  assert.equal(calculateTotals([item], 'express').shippingFee, 50_000);
  assert.equal(calculateTotals([], 'express').grandTotal, 0);
});

test('legacy carts migrate to compact snapshots and malformed lines cannot crash totals', () => {
  const decoded = decodeCart(JSON.stringify([{ ...item, product }, {}, { ...item, variant: { ...item.variant, price: 'bad' } }]));
  assert.equal(decoded.length, 1);
  assert.equal('gallery' in decoded[0].product, false);
  assert.deepEqual(decodeCart('{broken'), []);
  assert.deepEqual(decodeCart('{"version":99,"items":[]}'), []);
  assert.deepEqual(decodeCart(JSON.stringify([item, item]))[0].quantity, 2);
});

test('storage reads existing data before writes and does not resurrect legacy cart after clear', () => {
  const data = new Map<string, string>([['aura_apple_cart_v1', JSON.stringify([item])]]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const restored = loadCart(storage);
  assert.equal(restored.length, 1);
  saveCart(restored, storage);
  assert.ok(data.has(CART_STORAGE_KEY));
  saveCart([], storage);
  assert.deepEqual(loadCart(storage), []);
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  assert.deepEqual(loadCart(blocked), []);
  assert.doesNotThrow(() => saveCart([item], blocked));
});

test('order adapter resolves canonical prices and includes express fee in confirmation', async () => {
  const order = await mockOrderService.createOrder(input);
  assert.equal(order.total, calculateTotals([{ ...item, quantity: 2 }], 'express').grandTotal);
  assert.equal(order.items[0].unitPrice, product.variants[0].price);
  assert.equal(order.paymentStatus, 'PENDING');
  assert.equal(order.customer.fullName, input.customer.fullName);
  assert.notEqual(order.id, (await mockOrderService.createOrder(input)).id);
});

test('invalid orders reject without silently reporting success', async () => {
  await assert.rejects(mockOrderService.createOrder({ ...input, items: [] }));
  await assert.rejects(mockOrderService.createOrder({ ...input, items: [{ ...input.items[0], productId: 'missing' }] }));
  await assert.rejects(mockOrderService.createOrder({ ...input, items: [{ ...input.items[0], quantity: -1 }] }));
  await assert.rejects(mockOrderService.createOrder({ ...input, customer: { ...input.customer, phone: 'abcdefghij' } }));
});

test('service adapters honor aborted requests and can be called without this binding', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(mockProductService.getCatalog({}, { signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(mockOrderService.createOrder(input, { signal: controller.signal }), { name: 'AbortError' });
  const { getProductsByCategory } = mockProductService;
  assert.ok((await getProductsByCategory('mac')).length > 0);
});
