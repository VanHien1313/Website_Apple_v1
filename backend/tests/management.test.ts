import { confirmOverdueReceipts } from '../src/checkout/receipt.ts';
import { revenueReport } from '../src/checkout/reports.ts';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { createOrderService, expirePendingOrders } from '../src/checkout/orders.ts';
import { orderManagement } from '../src/checkout/management.ts';
import { createApp } from '../src/app.ts';

let fixture: Awaited<ReturnType<typeof isolatedDatabase>>, admin: string, customer: string, other: string;
const sku = '00000000-0000-4000-8000-000000000004';
const input = () => ({ requestId: randomUUID(), receiptToken: randomBytes(32).toString('hex'), items: [{ skuId: sku, quantity: 1 }],
  shippingMethod: 'standard', paymentMethod: 'cod', expectedTotal: 10050000, expectedPrices: [{ skuId: sku, price: 10000000 }],
  customer: { fullName: 'Khách vận hành', phone: '0901234567', email: 'customer@example.test' }, shippingAddress: { province: 'TP HCM', ward: 'Phường mẫu', address: '123 Mẫu' } });
const create = async (token: string = customer) => (await createOrderService(fixture.db).create(input(), token)).order;
const change = (id: string, revision: number, target: string, token = admin, isAdmin = true, kind = 'status') => orderManagement(fixture.db).update(isAdmin, token, id, { revision, kind, target, note: 'Kiểm thử vận hành' });
const stock = async () => (await fixture.db.query<{ on_hand: number; reserved: number }>('SELECT on_hand,reserved FROM inventory_skus WHERE id=@arg1', [sku])).rows[0]!;
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db); await seedDemo(fixture.db, { ALLOW_DEMO_SEED: 'true' });
  await fixture.db.query('UPDATE inventory_skus SET on_hand=1000 WHERE id=@arg1', [sku]);
  await bootstrapOwner(fixture.db, 'owner@example.test', 'Owner', 'Owner-test-password-123');
  const auth = createAuthService(fixture.db);
  admin = (await auth.login('admin', 'owner@example.test', 'Owner-test-password-123')).token;
  for (const email of ['customer@example.test', 'other@example.test']) await auth.register({ shippingAddress: { address: '123 Mẫu', province: 'TP HCM', ward: 'Phường mẫu' }, email, fullName: 'Khách', phone: '0901234567', password: 'Customer-test-password-123' });
  customer = (await auth.login('customer', 'customer@example.test', 'Customer-test-password-123')).token;
  other = (await auth.login('customer', 'other@example.test', 'Customer-test-password-123')).token;
});
after(async () => { await fixture?.cleanup(); });

test('order history is scoped to authenticated customer; guest and other account cannot read or cancel', async () => {
  const service = orderManagement(fixture.db), own = await create(customer), guest = await create();
  await fixture.db.query('UPDATE orders SET customer_id=NULL WHERE id=@arg1',[guest.id]);
  assert.equal((await service.list(false, customer, {})).total, 1);
  assert.equal((await service.list(false, other, {})).total, 0);
  assert.equal((await service.get(false, customer, own.id)).actions[0]?.target, 'CANCELLED');
  await assert.rejects(service.get(false, other, own.id), /Không tìm/);
  await assert.rejects(service.get(false, customer, guest.id), /Không tìm/);
  await assert.rejects(service.list(false, undefined, {}), /đăng nhập/);
  await assert.rejects(service.list(true, customer, {}), /Phiên quản trị/);
  await assert.rejects(change(own.id, 0, 'CANCELLED', other, false), /Không tìm/);
  await assert.rejects(change(own.id, 0, 'PROCESSING', customer, false), /Không thể/);
  const before = await stock();
  await change(own.id, 0, 'CANCELLED', customer, false);
  assert.equal((await stock()).reserved, before.reserved - 1);
  await assert.rejects(change(own.id, 0, 'CANCELLED', customer, false), /đã được cập nhật/);
  assert.equal((await stock()).reserved, before.reserved - 1);
});

test('COD fulfillment consumes stock exactly once, pays after delivery, completes with atomic history', async () => {
  const order = await create(customer), before = await stock(), service = orderManagement(fixture.db);
  await assert.rejects(change(order.id, 0, 'PAID', admin, true, 'payment'), /Không thể/);
  await change(order.id, 0, 'PROCESSING');
  await assert.rejects(change(order.id, 1, 'CANCELLED', customer, false), /Không thể/);
  const shipped = await change(order.id, 1, 'SHIPPED');
  assert.equal(shipped.status, 'SHIPPED'); assert.equal((await stock()).on_hand, before.on_hand - 1); assert.equal((await stock()).reserved, before.reserved - 1);
  await assert.rejects(change(order.id, 1, 'SHIPPED'), /đã được cập nhật/);
  await assert.rejects(change(order.id, 2, 'CANCELLED'), /Không thể/);
  await change(order.id, 2, 'DELIVERED');
  await assert.rejects(change(order.id, 3, 'COMPLETED'), /Không thể/);
  await change(order.id, 3, 'PAID', admin, true, 'payment');
  await assert.rejects(change(order.id, 4, 'COMPLETED'), /Không thể/);
  const result = await change(order.id, 4, 'CONFIRMED', customer, false, 'receipt');
  assert.equal(result.status, 'COMPLETED'); assert.equal(result.paymentStatus, 'PAID'); assert.equal(result.history.length, 7);
  assert.ok((await fixture.db.query('SELECT completed_at FROM orders WHERE id=@arg1', [order.id])).rows[0]!.completed_at);
  assert.equal((await fixture.db.query('SELECT status FROM reservations WHERE order_id=@arg1', [order.id])).rows[0]!.status, 'CONSUMED');
  assert.equal((await fixture.db.query('SELECT status FROM payments WHERE order_id=@arg1', [order.id])).rows[0]!.status, 'PAID');
  assert.equal((await service.get(false, customer, order.id)).actions.length, 0);
});

test('concurrent admin updates allow one revision; cancellation releases once without reducing on-hand', async () => {
  const order = await create(), before = await stock();
  const result = await Promise.allSettled([change(order.id, 0, 'PROCESSING'), change(order.id, 0, 'CANCELLED')]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  const current = await orderManagement(fixture.db).get(true, admin, order.id);
  if (current.status === 'PROCESSING') await change(order.id, 1, 'CANCELLED');
  assert.equal((await stock()).reserved, before.reserved - 1); assert.equal((await stock()).on_hand, before.on_hand);
});

test('expiry racing customer cancellation never releases stock twice; overdue orders cannot be confirmed', async () => {
  const order = await create(customer), before = await stock();
  await fixture.db.query('UPDATE reservations SET expires_at=DATEADD(second,-1,SYSUTCDATETIME()) WHERE order_id=@arg1', [order.id]);
  await assert.rejects(change(order.id, 0, 'PROCESSING'), /giữ hàng đã hết/);
  const results = await Promise.allSettled([expirePendingOrders(fixture.db), change(order.id, 0, 'CANCELLED', customer, false)]);
  assert.ok(results.some((result) => result.status === 'fulfilled'));
  assert.equal((await stock()).reserved, before.reserved - 1);
  const current = await orderManagement(fixture.db).get(true, admin, order.id);
  assert.equal(current.status, 'CANCELLED'); assert.equal(current.revision, 1); assert.equal(current.history.length, 2);
});

test('event write failure rolls back inventory, reservation and order transition together', async () => {
  const order = await create(); await change(order.id, 0, 'PROCESSING'); const before = await stock();
  await fixture.db.exec("CREATE TRIGGER dbo.test_event_failure ON dbo.order_events AFTER INSERT AS BEGIN THROW 51012, 'Injected event failure', 1; END");
  try { await assert.rejects(change(order.id, 1, 'SHIPPED')); } finally { await fixture.db.exec('DROP TRIGGER dbo.test_event_failure'); }
  assert.deepEqual(await stock(), before);
  const current = await orderManagement(fixture.db).get(true, admin, order.id);
  assert.equal(current.status, 'PROCESSING'); assert.equal(current.revision, 1); assert.equal(current.history.length, 2);
  assert.equal((await fixture.db.query('SELECT status FROM reservations WHERE order_id=@arg1', [order.id])).rows[0]!.status, 'HELD');
});

test('list filters and bounded SQL pagination; malformed updates and revoked admin are rejected', async () => {
  for (let i = 0; i < 21; i++) await create(other);
  const service = orderManagement(fixture.db);
  const page = await service.list(false, other, { page: '2', status: 'PENDING' });
  assert.equal(page.total, 21); assert.equal(page.items.length, 1); assert.equal(page.page, 2);
  assert.equal((await service.list(false, other, { q: "' OR 1=1 --" })).total, 0);
  assert.equal((await service.list(false, other, { q: '%' })).total, 0);
  await assert.rejects(service.list(true, admin, { page: -1 }), /Bộ lọc/);
  const order = await create();
  await assert.rejects(service.update(true, admin, order.id, { revision: 0, kind: 'status', target: 'CANCELLED', note: ' ' }), /ghi chú/);
  const auth = createAuthService(fixture.db), extra = await auth.login('admin', 'owner@example.test', 'Owner-test-password-123');
  await auth.logout('admin', extra.token);
  await assert.rejects(change(order.id, 0, 'CANCELLED', extra.token), /Phiên quản trị/);
});

test('management HTTP rejects cross-origin writes and guest access, accepts authenticated actions', async () => {
  const order = await create(), server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/admin/orders`;
  try {
    assert.equal((await fetch(base)).status, 401);
    const send = (origin: string) => fetch(`${base}/${order.id}/actions`, { method: 'POST', headers: { cookie: `aura_admin=${admin}`, origin, 'x-aura-request': '1', 'content-type': 'application/json' }, body: JSON.stringify({ revision: 0, kind: 'status', target: 'PROCESSING', note: 'HTTP kiểm thử' }) });
    assert.equal((await send('https://other.example')).status, 403);
    const response = await send('http://127.0.0.1:3000'); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).status, 'PROCESSING');
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});

async function deliveredOrder() {
 const order=await create(); await change(order.id,0,'PROCESSING');await change(order.id,1,'SHIPPED');return change(order.id,2,'DELIVERED');
}
test('receipt ownership, no premature actions, payment after receipt completes and counts revenue once',async()=>{
 const pending=await create();await assert.rejects(change(pending.id,0,'CONFIRMED',customer,false,'receipt'),/Không thể/);
 const order=await deliveredOrder();
 await assert.rejects(change(order.id,3,'CONFIRMED',other,false,'receipt'),/Không tìm/);
 await assert.rejects(change(order.id,3,'CONFIRMED',admin,true,'receipt'),/Không thể/);
 const confirmed=await change(order.id,3,'CONFIRMED',customer,false,'receipt');assert.equal(confirmed.status,'DELIVERED');assert.equal(confirmed.paymentStatus,'PENDING');
 const day=new Date(Date.now()+7*3600000).toISOString().slice(0,10);const query={from:day,to:day};const before=await revenueReport(fixture.db,admin,query);
 const completed=await change(order.id,4,'PAID',admin,true,'payment');assert.equal(completed.status,'COMPLETED');
 const after=await revenueReport(fixture.db,admin,query);assert.equal(after.total-before.total,order.total);assert.equal(after.count-before.count,1);
 await assert.rejects(change(order.id,4,'PAID',admin,true,'payment'),/đã được cập nhật/);
 assert.equal((await revenueReport(fixture.db,admin,query)).total,after.total);
});
test('seven-day worker is idempotent, never pays COD, and stops for customer feedback',async()=>{
 const fresh=await deliveredOrder();await confirmOverdueReceipts(fixture.db);assert.equal((await orderManagement(fixture.db).get(true,admin,fresh.id)).receipt.status,'WAITING');
 const unpaid=await deliveredOrder(),paid=await deliveredOrder(),reported=await deliveredOrder();
 await change(paid.id,3,'PAID',admin,true,'payment');await change(reported.id,3,'REPORTED',customer,false,'receipt');
 for(const id of [unpaid.id,paid.id,reported.id])await fixture.db.query('UPDATE orders SET delivered_at=DATEADD(day,-8,SYSUTCDATETIME()) WHERE id=@arg1',[id]);
 await Promise.all([confirmOverdueReceipts(fixture.db),confirmOverdueReceipts(fixture.db)]);
 const a=await orderManagement(fixture.db).get(true,admin,unpaid.id),b=await orderManagement(fixture.db).get(true,admin,paid.id),c=await orderManagement(fixture.db).get(true,admin,reported.id);
 assert.equal(a.receipt.status,'AUTO');assert.equal(a.status,'DELIVERED');assert.equal(a.paymentStatus,'PENDING');assert.equal(b.status,'COMPLETED');assert.equal(c.receipt.status,'REPORTED');assert.equal(c.status,'DELIVERED');
 assert.equal(a.history.filter(e=>String(e.note).includes('Tự xác nhận')).length,1);
 assert.equal(await confirmOverdueReceipts(fixture.db),0);
 const resolved=await change(reported.id,c.revision,'CONFIRMED',customer,false,'receipt');assert.equal(resolved.receipt.status,'CONFIRMED');
});
