import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { categoryManagement } from '../src/categories-admin.ts';
import { productManagement } from '../src/products-admin.ts';
import { customerManagement } from '../src/customers-admin.ts';
import { adminManagement } from '../src/admin-users.ts';
import { orderManagement } from '../src/checkout/management.ts';
import { createOrderService } from '../src/checkout/orders.ts';
let fixture: Awaited<ReturnType<typeof isolatedDatabase>>, token: string, customer: string;
const password = 'List-query-test-12345';
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db); await seedDemo(fixture.db, { ALLOW_DEMO_SEED: 'true' });
  await bootstrapOwner(fixture.db, 'owner@example.test', 'Owner', password);
  const auth = createAuthService(fixture.db); token = (await auth.login('admin', 'owner@example.test', password)).token;
  for (const [email, fullName] of [['alice@example.test', 'Filter Alice'], ['zulu@example.test', 'Filter Zulu']]) await auth.register({ shippingAddress: { address: '123 Mẫu', province: 'TP HCM', ward: 'Phường mẫu' }, email, fullName, phone: '0901234567', password });
  customer = (await auth.login('customer', 'alice@example.test', password)).token;
  for (const [id, name] of [['filter-alpha', 'Filter Alpha'], ['filter-zulu', 'Filter Zulu']]) await categoryManagement(fixture.db).write(token, 'create', id!, { name });
  for (const [slug, name, active] of [['filter-alpha', 'Filter Alpha', true], ['filter-zulu', 'Filter Zulu', false]] as const) await fixture.db.query("INSERT INTO products(id,category_id,slug,name,thumbnail,active) VALUES(@arg1,'filter-zulu',@arg2,@arg3,'/images/placeholder.svg',@arg4)", [randomUUID(), slug, name, active]);
  for (const [email, name, active] of [['filter-alpha@example.test', 'Filter Alpha', true], ['filter-zulu@example.test', 'Filter Zulu', false]] as const) await fixture.db.query("INSERT INTO admin_users(id,email,name,password_hash,role,active) VALUES(@arg1,@arg2,@arg3,'not-a-login-hash','editor',@arg4)", [randomUUID(), email, name, active]);
  const sku = '00000000-0000-4000-8000-000000000004';
  const input = (quantity: number) => ({ requestId: randomUUID(), receiptToken: randomBytes(32).toString('hex'), items: [{ skuId: sku, quantity }], expectedPrices: [{ skuId: sku, price: 10000000 }], expectedTotal: quantity === 1 ? 10050000 : 20000000, shippingMethod: 'standard', paymentMethod: 'cod', customer: { fullName: 'Người nhận', phone: '0901234567', email: 'zulu@example.test' }, shippingAddress: { address: '123 Đường mẫu', province: 'TP HCM', ward: 'Phường mẫu' } });
  await createOrderService(fixture.db).create(input(1), customer); const legacy = await createOrderService(fixture.db).create(input(2), customer); await fixture.db.query('UPDATE orders SET customer_id=NULL WHERE id=@arg1',[legacy.order.id]);
});
after(async () => { await fixture?.cleanup(); });
test('catalog category and account filters match counts and whitelisted name sort', async () => {
  const categories = categoryManagement(fixture.db);
  assert.equal((await categories.list(token, { q: 'Filter', sort: 'name_desc' })).items[0]!.name, 'Filter Zulu');
  assert.equal((await categories.list(token, { q: 'Filter', usage: 'empty' })).items[0]!.id, 'filter-alpha');
  assert.equal((await categories.list(token, { q: 'Filter', usage: 'used' })).total, 1);
  const products = productManagement(fixture.db);
  assert.equal((await products.list(token, { q: 'Filter', sort: 'name_desc' })).items[0]!.name, 'Filter Zulu');
  assert.equal((await products.list(token, { q: 'Filter', sort: 'name_asc', active: 'true' })).total, 1);
  const users = adminManagement(fixture.db);
  const filtered = await users.list(token, { q: 'Filter', role: 'editor', active: 'false', sort: 'name_desc' });
  assert.equal(filtered.total, 1); assert.equal(filtered.items[0]!.name, 'Filter Zulu');
  assert.equal((await users.list(token, { q: 'Filter', role: 'owner' })).total, 0);
});
test('customer order-presence uses account IDs and order total sorting preserves ownership', async () => {
  const customers = customerManagement(fixture.db);
  assert.equal((await customers.list(token, { q: 'Filter', sort: 'name_desc' })).items[0]!.fullName, 'Filter Zulu');
  const placed = await customers.list(token, { orders: 'placed' }), none = await customers.list(token, { orders: 'none' });
  assert.equal(placed.total, 1); assert.equal(placed.items[0]!.email, 'alice@example.test');
  assert.equal(none.total, 1); assert.equal(none.items[0]!.email, 'zulu@example.test');
  const orders = orderManagement(fixture.db);
  assert.deepEqual((await orders.list(true, token, { sort: 'total_desc' })).items.map((row) => row.total), [20000000, 10050000]);
  assert.deepEqual((await orders.list(true, token, { sort: 'total_asc', status: 'PENDING' })).items.map((row) => row.total), [10050000, 20000000]);
  assert.equal((await orders.list(false, customer, { sort: 'total_desc' })).total, 1);
});
test('all list sort/filter allowlists reject arrays, inherited keys and SQL-shaped values', async () => {
  const lists = [categoryManagement(fixture.db), productManagement(fixture.db), customerManagement(fixture.db), adminManagement(fixture.db)];
  for (const sort of ['constructor', '__proto__', ['newest'], 'id; DROP TABLE customers', 'unknown']) {
    for (const service of lists) await assert.rejects(service.list(token, { sort }), (e: unknown) => (e as { status: number }).status === 422);
    await assert.rejects(orderManagement(fixture.db).list(true, token, { sort }), (e: unknown) => (e as { status: number }).status === 422);
  }
  await assert.rejects(categoryManagement(fixture.db).list(token, { usage: 'bad' }));
  await assert.rejects(customerManagement(fixture.db).list(token, { orders: ['placed'] }));
  await assert.rejects(adminManagement(fixture.db).list(token, { role: '__proto__' }));
  await assert.rejects(adminManagement(fixture.db).list(token, { active: '1' }));
});
