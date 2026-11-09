import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { productManagement } from '../src/products-admin.ts';
import { parseProduct } from '../src/products-input.ts';
import { createOrderService } from '../src/checkout/orders.ts';
import { createApp } from '../src/app.ts';

let fixture: Awaited<ReturnType<typeof isolatedDatabase>>, token: string;
const service = () => productManagement(fixture.db);
function product() {
  const id = randomUUID(), configurationId = randomUUID(), colorId = randomUUID();
  return { id, slug: `product-${id}`, name: 'Sản phẩm quản trị', categoryId: 'demo-hardware', active: true, thumbnail: '/images/placeholder.svg',
    configurations: [{ id: configurationId, storage: '256GB' }], colors: [{ id: colorId, name: 'Đen', hex: '#000000', image: '/images/placeholder.svg' }],
    skus: [{ id: randomUUID(), configurationId, colorId, sku: `TEST-${id}`, price: 10000000, originalPrice: 11000000, onHand: 5 }] };
}
const createOrder = (skuId: string) => createOrderService(fixture.db).create({ requestId: randomUUID(), receiptToken: randomBytes(32).toString('hex'), items: [{ skuId, quantity: 1 }], shippingMethod: 'standard', paymentMethod: 'cod', expectedTotal: 10050000, expectedPrices: [{ skuId, price: 10000000 }], customer: { fullName: 'Khách', phone: '0901234567' }, shippingAddress: { province: 'HCM', ward: 'Phường mẫu', address: '123 Mẫu' } });
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db); await seedDemo(fixture.db, { ALLOW_DEMO_SEED: 'true' });
  await bootstrapOwner(fixture.db, 'products@example.test', 'Product owner', 'Product-password-12345');
  token = (await createAuthService(fixture.db).login('admin', 'products@example.test', 'Product-password-12345')).token;
});
after(async () => { await fixture?.cleanup(); });
test('aggregate product input validates references, prices, bounded arrays, image URLs and duplicate SKU pairs', () => {
  const input = product();
  for (const value of [null, { ...input, active: 'true' }, { ...input, thumbnail: 'javascript:alert(1)' }, { ...input, configurations: [] }, { ...input, skus: [...input.skus, { ...input.skus[0], id: randomUUID() }] }, { ...input, skus: [{ ...input.skus[0], colorId: randomUUID() }] }, { ...input, skus: [{ ...input.skus[0], price: 1.5 }] }, { ...input, skus: [{ ...input.skus[0], originalPrice: 1 }] }]) assert.throws(() => parseProduct(value));
  assert.equal(parseProduct(input).skus[0]!.sku, input.skus[0]!.sku.toUpperCase());
});
test('create product aggregate persists all children and safe monetary types; duplicate slug or SKU fails atomically', async () => {
  const input = product(), created = await service().save(token, input, true);
  assert.equal(created.skus.length, 1); assert.equal(created.skus[0]!.price, 10000000);
  assert.match(String(created.revision), /^[A-F0-9]{16}$/);
  await assert.rejects(service().save(token, { ...product(), slug: input.slug }, true), /Slug sản phẩm/);
  const other = product(); other.skus[0]!.sku = input.skus[0]!.sku;
  await assert.rejects(service().save(token, other, true), /SKU đã được sử dụng/);
  assert.equal((await fixture.db.query('SELECT id FROM products WHERE id=@arg1', [other.id])).rows.length, 0);
  await assert.rejects(service().save(token, { ...product(), categoryId: 'missing' }, true), /Danh mục không tồn tại/);
  await assert.rejects(service().save(token, { ...product(), thumbnail: `/api/v1/media/${randomUUID()}` }, true), /Ảnh tải lên không tồn tại/);
});
test('product update adds variants/colors/SKUs, keeps existing identity and rejects stale concurrent saves', async () => {
  const input = product(), before = await service().save(token, input, true);
  const config = { id: randomUUID(), storage: '512GB' }, color = { id: randomUUID(), name: 'Trắng', hex: '#ffffff', image: '/images/placeholder.svg' };
  const next = { ...before, name: 'Tên mới', configurations: [...before.configurations, config], colors: [...before.colors, color], skus: [...before.skus, { id: randomUUID(), configurationId: config.id, colorId: color.id, sku: `NEW-${randomUUID()}`, price: 12000000, originalPrice: 12000000, onHand: 2 }] };
  const result = await Promise.allSettled([service().save(token, next, false), service().save(token, next, false)]);
  assert.equal(result.filter((value) => value.status === 'fulfilled').length, 1);
  const updated = await service().get(token, input.id); assert.equal(updated.skus.length, 2);
  await assert.rejects(service().save(token, { ...updated, skus: updated.skus.slice(0, 1) }, false), /Không được xóa/);
  await assert.rejects(service().save(token, { ...updated, skus: updated.skus.map((sku, index) => index ? sku : { ...sku, sku: 'CHANGED' }) }, false), /không được đổi/);
});
test('checkout invalidates stale inventory, reserved units cannot be removed, and archive preserves order snapshot', async () => {
  const input = product(), before = await service().save(token, input, true);
  const order = await createOrder(input.skus[0]!.id);
  await assert.rejects(service().save(token, { ...before, name: 'Old editor' }, false), /tồn kho đã thay đổi/);
  const current = await service().get(token, input.id);
  await assert.rejects(service().save(token, { ...current, skus: current.skus.map((sku) => ({ ...sku, onHand: 0, reserved: 0 })) }, false), /lượng đang giữ/);
  await service().save(token, { ...current, name: 'Đã đổi tên', active: false }, false);
  const snapshot = (await fixture.db.query('SELECT product_name FROM order_items WHERE order_id=@arg1', [order.order.id])).rows[0];
  assert.equal(snapshot!.product_name, 'Sản phẩm quản trị');
  await assert.rejects(createOrder(input.skus[0]!.id), /Sản phẩm hoặc tồn kho/);
  assert.equal((await fixture.db.query('SELECT reserved FROM inventory_skus WHERE id=@arg1', [input.skus[0]!.id])).rows[0]!.reserved, 1);
});
test('admin stock reduction racing checkout cannot oversell or overwrite reserved stock', async () => {
  const input = product(); input.skus[0]!.onHand = 1;
  const current = await service().save(token, input, true);
  const results = await Promise.allSettled([service().save(token, { ...current, skus: current.skus.map((sku) => ({ ...sku, onHand: 0 })) }, false), createOrder(input.skus[0]!.id)]);
  assert.equal(results.filter((value) => value.status === 'fulfilled').length, 1);
  const stock = (await fixture.db.query<{ on_hand: number; reserved: number }>('SELECT on_hand,reserved FROM inventory_skus WHERE id=@arg1', [input.skus[0]!.id])).rows[0]!;
  assert.ok(stock.reserved <= stock.on_hand);
});
test('failure while inserting inventory rolls back product, configuration and color writes', async () => {
  const input = product();
  await fixture.db.exec("CREATE TRIGGER dbo.test_product_failure ON dbo.inventory_skus AFTER INSERT AS BEGIN THROW 51013, 'Injected product failure', 1; END");
  try { await assert.rejects(service().save(token, input, true)); } finally { await fixture.db.exec('DROP TRIGGER dbo.test_product_failure'); }
  for (const table of ['products', 'variants', 'colors']) assert.equal((await fixture.db.query(`SELECT id FROM ${table} WHERE ${table === 'products' ? 'id' : 'product_id'}=@arg1`, [input.id])).rows.length, 0);
});
test('HTTP admin product API protects writes, supports structured body above checkout limit and public archive behavior', async () => {
  const server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}/api/v1`;
  const input = { ...product(), description: Array.from({ length: 10 }, () => 'x'.repeat(2000)) };
  const headers = { origin: 'http://127.0.0.1:3000', 'x-aura-request': '1', 'content-type': 'application/json', cookie: `aura_admin=${token}` };
  try {
    assert.equal((await fetch(`${base}/admin/products`)).status, 401);
    assert.equal((await fetch(`${base}/admin/products`, { method: 'POST', headers: { ...headers, origin: 'https://other.example' }, body: JSON.stringify(input) })).status, 403);
    const response = await fetch(`${base}/admin/products`, { method: 'POST', headers, body: JSON.stringify(input) }); assert.equal(response.status, 201);
    const created = await response.json(); assert.equal(created.description.length, 10);
    assert.equal((await fetch(`${base}/products/by-slug/${input.slug}`)).status, 200);
    assert.equal((await fetch(`${base}/admin/products/${input.id}`, { method: 'PUT', headers, body: JSON.stringify({ ...created, active: false }) })).status, 200);
    assert.equal((await fetch(`${base}/products/by-slug/${input.slug}`)).status, 404);
    const filtered = await (await fetch(`${base}/admin/products?active=false&q=${input.slug}`, { headers })).json(); assert.equal(filtered.total, 1);
    const auth = createAuthService(fixture.db); await auth.logout('admin', token);
    assert.equal((await fetch(`${base}/admin/products`, { headers })).status, 401);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});
