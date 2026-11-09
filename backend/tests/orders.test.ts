import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { createOrderService, expirePendingOrders, parseOrder } from '../src/checkout/orders.ts';
import { createAuthService } from '../src/auth/service.ts';
import { createApp } from '../src/app.ts';

let fixture: Awaited<ReturnType<typeof isolatedDatabase>>;
const sku = '00000000-0000-4000-8000-000000000004';
const makeInput = () => ({ requestId: randomUUID(), receiptToken: randomBytes(32).toString('hex'),
  items: [{ skuId: sku, quantity: 1 }], expectedPrices: [{ skuId: sku, price: 10000000 }], expectedTotal: 10050000,
  shippingMethod: 'standard', paymentMethod: 'cod', customer: { fullName: 'Khách kiểm thử', phone: '0901234567', email: '' },
  shippingAddress: { address: '123 Đường mẫu', province: 'TP HCM', ward: 'Phường mẫu' } });
before(async () => { fixture = await isolatedDatabase(); await migrate(fixture.db); await seedDemo(fixture.db, { ALLOW_DEMO_SEED: 'true' }); });
after(async () => { await fixture?.cleanup(); });
const inventory = async () => (await fixture.db.query('SELECT on_hand,reserved FROM inventory_skus WHERE id=@arg1', [sku])).rows[0]!;
const count = async () => Number((await fixture.db.query('SELECT COUNT(*) AS total FROM orders')).rows[0]!.total);

test('order input rejects empty/invalid carts, payment, missing consent and contact; ignores forged customerId', () => {
  for (const input of [null, { ...makeInput(), items: [] }, { ...makeInput(), paymentMethod: 'momo' }, { ...makeInput(), expectedPrices: [] },
    { ...makeInput(), receiptToken: 'short' }, { ...makeInput(), customer: { fullName: 'Test', phone: 'bad' } }]) assert.throws(() => parseOrder(input));
  assert.equal('customerId' in parseOrder({ ...makeInput(), customerId: randomUUID() }), false);
});

test('concurrent retry creates one order/reservation/payment, snapshots persist and guest receipt protects access', async () => {
  const service = createOrderService(fixture.db), input = makeInput();
  const result = await Promise.all([service.create(input), service.create(input)]);
  assert.equal(result.filter((item) => item.replayed).length, 1); assert.equal(result[0]!.order.id, result[1]!.order.id);
  assert.equal(await count(), 1); assert.equal((await inventory()).reserved, 1);
  assert.equal((await fixture.db.query('SELECT id FROM payments')).rows.length, 1);
  assert.equal((await fixture.db.query('SELECT id FROM reservations')).rows.length, 1);
  const id = String(result[0]!.order.id);
  await assert.rejects(service.get(id), /Không tìm/);
  await assert.rejects(service.get(id, undefined, randomBytes(32).toString('hex')), /Không tìm/);
  const stored = await service.get(id, undefined, input.receiptToken);
  assert.equal(stored.total, 10050000); assert.equal(stored.paymentStatus, 'PENDING');
  assert.ok(!JSON.stringify(stored).includes(input.receiptToken));
  assert.equal((await fixture.db.query('SELECT guest_receipt_hash FROM orders WHERE id=@arg1', [id])).rows[0]!.guest_receipt_hash === input.receiptToken, false);
  await assert.rejects(service.create({ ...input, customer: { ...input.customer, fullName: 'Changed' } }), /nội dung khác/);
  await fixture.db.query("UPDATE products SET name=N'Tên thay đổi'");
  assert.equal((await service.get(id, undefined, input.receiptToken)).items[0]?.productName, 'Thiết bị mẫu B1');
});

test('price conflict and transaction failure leave no partial order or reserved stock', async () => {
  const service = createOrderService(fixture.db), beforeCount = await count(), beforeStock = await inventory();
  await assert.rejects(service.create({ ...makeInput(), expectedTotal: 1 }), /Giá đã thay đổi/);
  // Total alone is insufficient: require consent to each line price too.
  await assert.rejects(service.create({ ...makeInput(), expectedPrices: [{ skuId: sku, price: 9999999 }] }), /Giá đã thay đổi/);
  await fixture.db.exec("CREATE TRIGGER dbo.test_payment_failure ON dbo.payments AFTER INSERT AS BEGIN THROW 51010, 'Injected failure', 1; END");
  try { await assert.rejects(service.create(makeInput())); }
  finally { await fixture.db.exec('DROP TRIGGER dbo.test_payment_failure'); }
  assert.equal(await count(), beforeCount); assert.deepEqual(await inventory(), beforeStock);
  assert.equal((await fixture.db.query('SELECT id FROM payments')).rows.length, beforeCount);
});

test('two different requests competing for the last available unit cannot oversell', async () => {
  const service = createOrderService(fixture.db), before = await inventory();
  await fixture.db.query('UPDATE inventory_skus SET on_hand=reserved+1 WHERE id=@arg1', [sku]);
  const results = await Promise.allSettled([service.create(makeInput()), service.create(makeInput())]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.equal(rejected?.status === 'rejected' ? rejected.reason.code : undefined, 'STOCK_CHANGED');
  assert.equal((await inventory()).reserved, Number(before.reserved) + 1);
  assert.equal((await inventory()).on_hand, (await inventory()).reserved);
  await fixture.db.query('UPDATE inventory_skus SET on_hand=20 WHERE id=@arg1', [sku]);
});

test('customer ownership comes from server session, with no guest downgrade for expired cookies', async () => {
  const service = createOrderService(fixture.db), auth = createAuthService(fixture.db);
  for (const email of ['one@example.test', 'two@example.test']) await auth.register({ fullName: email, email, phone: '0901234567', password: 'Test-order-password-123' });
  const one = await auth.login('customer', 'one@example.test', 'Test-order-password-123');
  const two = await auth.login('customer', 'two@example.test', 'Test-order-password-123');
  const input = makeInput();
  const created = await service.create({ ...input, customerId: two.profile.id }, one.token);
  const id = String(created.order.id);
  assert.equal((await service.get(id, one.token)).id, created.order.id);
  await assert.rejects(service.get(id, two.token), /Không tìm/);
  await assert.rejects(service.get(id, undefined, input.receiptToken), /Không tìm/);
  const beforeCount = await count();
  await assert.rejects(service.create(input, two.token), /phiên khách khác/);
  await assert.rejects(service.create(input), /phiên khách khác/);
  assert.equal(await count(), beforeCount);
  await auth.logout('customer', one.token);
  await assert.rejects(service.create(makeInput(), one.token), /Phiên khách hàng/);
});

test('expiry releases held stock once, cancels pending order and preserves idempotent replay', async () => {
  const service = createOrderService(fixture.db), input = makeInput(), created = await service.create(input);
  const beforeStock = await inventory();
  await fixture.db.query('UPDATE reservations SET expires_at=DATEADD(second,-1,SYSUTCDATETIME()) WHERE order_id=@arg1', [created.order.id]);
  const results = await Promise.all([expirePendingOrders(fixture.db), expirePendingOrders(fixture.db)]);
  assert.equal(results.reduce((sum, value) => sum + value, 0), 1);
  assert.equal((await inventory()).reserved, Number(beforeStock.reserved) - 1);
  const replay = await service.create(input); assert.equal(replay.replayed, true); assert.equal(replay.order.status, 'CANCELLED');
  const events = (await fixture.db.query('SELECT id FROM order_events WHERE order_id=@arg1', [created.order.id])).rows;
  assert.equal(events.length, 2);
});

test('HTTP order endpoint enforces origin and returns 201 then 200; no receipt leaks in payload', async () => {
  const server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/orders`, input = makeInput();
  try {
    const send = (origin: string) => fetch(base, { method: 'POST', headers: { origin, 'x-aura-request': '1', 'content-type': 'application/json' }, body: JSON.stringify(input) });
    assert.equal((await send('https://other.example')).status, 403);
    const first = await send('http://127.0.0.1:3000'); assert.equal(first.status, 201);
    const body = await first.json(); assert.ok(!JSON.stringify(body).includes(input.receiptToken));
    assert.equal((await send('http://127.0.0.1:3000')).status, 200);
    assert.equal((await fetch(`${base}/${body.order.id}`)).status, 404);
    assert.equal((await fetch(`${base}/${body.order.id}`, { headers: { 'x-aura-receipt': input.receiptToken } })).status, 200);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('expiry does not cancel confirmed orders or pending orders already marked paid', async () => {
  const service = createOrderService(fixture.db);
  const confirmed = await service.create(makeInput()), paid = await service.create(makeInput());
  await fixture.db.query("UPDATE orders SET status='CONFIRMED' WHERE id=@arg1", [confirmed.order.id]);
  await fixture.db.query("UPDATE orders SET payment_status='PAID' WHERE id=@arg1", [paid.order.id]);
  await fixture.db.query('UPDATE reservations SET expires_at=DATEADD(second,-1,SYSUTCDATETIME()) WHERE order_id IN (@arg1,@arg2)', [confirmed.order.id, paid.order.id]);
  const beforeStock = await inventory();
  assert.equal(await expirePendingOrders(fixture.db), 0);
  assert.deepEqual(await inventory(), beforeStock);
});
