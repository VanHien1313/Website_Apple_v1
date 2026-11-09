import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { adminManagement } from '../src/admin-users.ts';
import { customerManagement } from '../src/customers-admin.ts';
import { createOrderService } from '../src/checkout/orders.ts';
import { createApp } from '../src/app.ts';
let fixture: Awaited<ReturnType<typeof isolatedDatabase>>, owner: string, editor: string, customer: string, customerId: string, other: string;
const password = 'Customer-test-123456';
const service = () => customerManagement(fixture.db);
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db); await seedDemo(fixture.db, { ALLOW_DEMO_SEED: 'true' });
  await bootstrapOwner(fixture.db, 'owner@example.test', 'Chủ', password);
  const auth = createAuthService(fixture.db); owner = (await auth.login('admin', 'owner@example.test', password)).token;
  await adminManagement(fixture.db).create(owner, { email: 'editor@example.test', name: 'Editor', password, role: 'editor', active: true });
  editor = (await auth.login('admin', 'editor@example.test', password)).token;
  for (const email of ['one@example.test', 'two@example.test']) await auth.register({ email, fullName: 'Khách hàng', phone: '0901234567', password });
  const login = await auth.login('customer', 'one@example.test', password); customer = login.token; customerId = String(login.profile.id);
  other = (await auth.login('customer', 'two@example.test', password)).token;
});
after(async () => { await fixture?.cleanup(); });
test('customer lookup exposes only allowlisted fields, literal search and bounded server pagination', async () => {
  const result = await service().list(editor, { q: 'one@example.test' }); assert.equal(result.total, 1);
  assert.deepEqual(Object.keys(result.items[0]!).sort(), ['createdAt', 'email', 'fullName', 'id', 'phone'].sort());
  assert.equal((await service().list(owner, { q: '0901234567' })).total, 2);
  for (const q of ['%', "' OR 1=1 --"]) assert.equal((await service().list(owner, { q })).total, 0);
  await fixture.db.exec("DECLARE @i int=0; WHILE @i<21 BEGIN INSERT INTO customers(id,email,full_name,phone,password_hash) VALUES(NEWID(),CONCAT('page-',@i,'@example.test'),N'Phân trang','0901234567','not-a-login-hash'); SET @i=@i+1; END");
  const page = await service().list(owner, { q: 'page-', page: 2 }); assert.equal(page.total, 21); assert.equal(page.items.length, 1);
  assert.equal((await service().list(owner, { q: 'page-', page: 999 })).page, 2);
  for (const query of [{ page: 0 }, { page: ['1'] }, { q: ['one'] }, { q: 'x'.repeat(121) }]) await assert.rejects(service().list(owner, query));
});
test('customer detail includes only account-owned orders, excludes guest with same email and other account', async () => {
  const sku = '00000000-0000-4000-8000-000000000004';
  const input = () => ({ requestId: randomUUID(), receiptToken: randomBytes(32).toString('hex'), items: [{ skuId: sku, quantity: 1 }], expectedPrices: [{ skuId: sku, price: 10000000 }], expectedTotal: 10050000, shippingMethod: 'standard', paymentMethod: 'cod', customer: { fullName: 'Người nhận khác', phone: '0901234567', email: 'one@example.test' }, shippingAddress: { address: '123 Đường mẫu', province: 'TP HCM', ward: 'Phường mẫu' } });
  const orders = createOrderService(fixture.db);
  const own = await orders.create(input(), customer); await orders.create(input()); await orders.create(input(), other);
  const detail = await service().get(editor, customerId, { page: 999 });
  assert.equal(detail.orders.total, 1); assert.equal(detail.orders.page, 1); assert.equal(detail.orders.items[0]!.id, own.order.id);
  assert.equal(detail.orders.items[0]!.total, 10050000); assert.equal(detail.customer.fullName, 'Khách hàng');
  assert.equal(JSON.stringify(detail).includes('receipt'), false); assert.equal(JSON.stringify(detail).includes('password'), false);
  const empty = (await service().list(owner, { q: 'page-0@' })).items[0]!;
  assert.equal((await service().get(owner, String(empty.id), {})).orders.total, 0);
  await assert.rejects(service().get(owner, randomUUID(), {}), /Không tìm thấy/);
});
test('customer HTTP routes are read-only, require active admin and deny customer/revoked access', async () => {
  await assert.rejects(service().list(customer, {}), /Phiên quản trị/);
  await assert.rejects(service().get(undefined, customerId, {}), /đăng nhập/);
  const server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}/api/v1/admin/customers`;
  try {
    assert.equal((await fetch(base)).status, 401);
    const response = await fetch(`${base}/${customerId}`, { headers: { cookie: `aura_admin=${editor}` } }); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(base, { method: 'POST', headers: { cookie: `aura_admin=${owner}` } })).status, 404);
    await createAuthService(fixture.db).logout('admin', editor);
    assert.equal((await fetch(base, { headers: { cookie: `aura_admin=${editor}` } })).status, 401);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});
