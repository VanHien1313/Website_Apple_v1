import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { categoryManagement } from '../src/categories-admin.ts';
import { createApp } from '../src/app.ts';
let fixture: Awaited<ReturnType<typeof isolatedDatabase>>, token: string;
const service = () => categoryManagement(fixture.db);
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db); await seedDemo(fixture.db, { ALLOW_DEMO_SEED: 'true' });
  await bootstrapOwner(fixture.db, 'owner@example.test', 'Owner', 'Category-password-12345');
  token = (await createAuthService(fixture.db).login('admin', 'owner@example.test', 'Category-password-12345')).token;
});
after(async () => { await fixture?.cleanup(); });
test('category input and normalized uniqueness reject invalid or duplicate identities', async () => {
  assert.equal((await service().list(token, {})).total, 1);
  assert.equal((await service().list(token, { q: '   ' })).items[0]!.id, 'demo-hardware');
  for (const id of ['', 'Bad', 'a--b', '-a', 'a-', 'a b', 'x'.repeat(201)]) await assert.rejects(service().write(token, 'create', id, { name: 'Test' }), /Mã danh mục/);
  await assert.rejects(service().write(token, 'create', 'valid', { name: ' ' }), /Mã danh mục/);
  const created = await service().write(token, 'create', 'accessories', { name: ' Phụ kiện ' });
  assert.equal(created?.name, 'Phụ kiện'); assert.match(String(created?.revision), /^[A-F0-9]{16}$/);
  await assert.rejects(service().write(token, 'create', 'accessories', { name: 'Other' }), /Mã danh mục đã tồn tại/);
  await assert.rejects(service().write(token, 'create', 'other-accessories', { name: 'PHỤ KIỆN' }), /Tên danh mục đã tồn tại/);
});
test('concurrent duplicate names produce one category and no partial writes', async () => {
  const results = await Promise.allSettled([service().write(token, 'create', 'duplicate-a', { name: 'Tên chung' }), service().write(token, 'create', 'duplicate-b', { name: ' tên chung ' })]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await service().list(token, { q: 'Tên chung' })).total, 1);
});
test('rowversion guards concurrent rename and delete/recreate ABA; old versions cannot mutate replacement', async () => {
  const first = await service().write(token, 'create', 'version-test', { name: 'Phiên bản một' });
  const results = await Promise.allSettled(['Hai', 'Ba'].map((name) => service().write(token, 'update', 'version-test', { name, revision: first!.revision })));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const current = (await service().list(token, { q: 'version-test' })).items[0]!;
  await service().write(token, 'delete', 'version-test', { revision: current.revision });
  const replacement = await service().write(token, 'create', 'version-test', { name: 'Thay thế' });
  assert.notEqual(replacement!.revision, first!.revision);
  await assert.rejects(service().write(token, 'delete', 'version-test', { revision: first!.revision }), /Danh mục đã thay đổi/);
  await assert.rejects(service().write(token, 'update', 'version-test', { revision: first!.revision, name: 'Ghi đè' }), /Danh mục đã thay đổi/);
});
test('in-use category cannot be deleted even with hidden products; rename preserves IDs and products', async () => {
  const row = (await service().list(token, { q: 'demo-hardware' })).items[0]!;
  assert.equal(row.productCount, 1);
  await fixture.db.query('UPDATE products SET active=0');
  await assert.rejects(service().write(token, 'delete', 'demo-hardware', { revision: row.revision }), /kể cả sản phẩm đã ẩn/);
  await service().write(token, 'update', 'demo-hardware', { revision: row.revision, name: 'Danh mục đổi tên' });
  assert.equal((await fixture.db.query('SELECT category_id FROM products')).rows[0]!.category_id, 'demo-hardware');
  await fixture.db.query('UPDATE products SET active=1');
});
test('admin list filters literal search, paginates and validates bounds', async () => {
  for (let i = 0; i < 21; i++) await service().write(token, 'create', `page-${i}`, { name: `Phân trang ${i}` });
  const page = await service().list(token, { q: 'page-', page: 2 });
  assert.equal(page.total, 21); assert.equal(page.items.length, 1); assert.equal(page.page, 2);
  assert.equal((await service().list(token, { q: '%' })).total, 0);
  assert.equal((await service().list(token, { q: "' OR 1=1 --" })).total, 0);
  await assert.rejects(service().list(token, { page: -1 }), /Bộ lọc/);
});
test('HTTP category mutations enforce admin session, origin, revision and expose successful names publicly', async () => {
  const auth = createAuthService(fixture.db);
  await auth.register({ shippingAddress: { address: '123 Mẫu', province: 'TP HCM', ward: 'Phường mẫu' }, email: 'customer@example.test', fullName: 'Khách', phone: '0901234567', password: 'Customer-password-12345' });
  const customer = await auth.login('customer', 'customer@example.test', 'Customer-password-12345');
  await assert.rejects(service().list(customer.token, {}), /Phiên quản trị/);
  const server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const send = (path: string, body: unknown, origin = 'http://127.0.0.1:3000', method = 'POST') => fetch(`${base}${path}`, { method, headers: { origin, cookie: `aura_admin=${token}`, 'x-aura-request': '1', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(`${base}/admin/categories`)).status, 401);
    assert.equal((await send('/admin/categories', { id: 'http-test', name: 'HTTP name' }, 'https://other.example')).status, 403);
    const result = await send('/admin/categories', { id: 'http-test', name: 'HTTP name' }); assert.equal(result.status, 201);
    const created = await result.json();
    assert.equal((await send('/admin/categories/http-test', { name: 'Updated' }, undefined, 'PUT')).status, 422);
    assert.equal((await send('/admin/categories/http-test', { name: 'Updated', revision: created.revision }, undefined, 'PUT')).status, 200);
    const categories = await (await fetch(`${base}/categories`)).json(); assert.equal(categories.find((row: {id: string}) => row.id === 'http-test').name, 'Updated');
    const current = (await service().list(token, { q: 'http-test' })).items[0]!;
    assert.equal((await send('/admin/categories/http-test/delete', { revision: current.revision })).status, 204);
    await auth.logout('admin', token);
    assert.equal((await send('/admin/categories', { id: 'revoked', name: 'Revoked' })).status, 401);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});
