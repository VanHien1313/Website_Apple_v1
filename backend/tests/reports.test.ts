import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { parseReport, revenueReport } from '../src/checkout/reports.ts';
import { createApp } from '../src/app.ts';

let fixture: Awaited<ReturnType<typeof isolatedDatabase>>, token: string;
async function add(at: string, total: number, status = 'COMPLETED', payment = 'PAID') {
  await fixture.db.query(`INSERT INTO orders(id,order_code,customer_snapshot,shipping_address,shipping_method,status,payment_status,subtotal,shipping_fee,total,created_at,completed_at)
    VALUES (@arg1,@arg2,N'{"fullName":"Report fixture"}',N'{}','standard',@arg3,@arg4,@arg5,0,@arg5,'2000-01-01',CASE WHEN @arg3='COMPLETED' THEN CONVERT(datetime2,@arg6,127) ELSE NULL END)`,
  [randomUUID(), randomUUID(), status, payment, total, at]);
}
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db);
  await bootstrapOwner(fixture.db, 'report@example.test', 'Report owner', 'Report-test-password-123');
  token = (await createAuthService(fixture.db).login('admin', 'report@example.test', 'Report-test-password-123')).token;
  await add('2026-10-25T16:59:59.999Z', 100);
  await add('2026-10-25T17:00:00.000Z', 200);
  await add('2026-10-26T16:59:59.999Z', 300);
  await add('2026-10-26T17:00:00.000Z', 400);
  await add('2026-10-25T17:00:00.000Z', 500, 'COMPLETED', 'REFUNDED');
  await add('2026-10-25T17:00:00.000Z', 600, 'CANCELLED', 'PENDING');
  await add('2026-10-25T17:00:00.000Z', 700, 'DELIVERED', 'PAID');
  await add('2026-09-30T17:00:00.000Z', 50);
});
after(async () => { await fixture?.cleanup(); });

test('report validates real dates, bounded inclusive range and scalar grouping', () => {
  for (const query of [{}, { from: '2026-02-30', to: '2026-03-01' }, { from: '2026-01-02', to: '2026-01-01' },
    { from: '2025-01-01', to: '2026-01-03' }, { from: '1999-01-01', to: '1999-01-02' }, { from: '2026-01-01', to: '2026-01-02', period: ['day'] }]) assert.throws(() => parseReport(query));
  assert.equal(parseReport({ from: '2024-02-29', to: '2025-03-01' }).period, 'day');
});
test('SQL aggregation uses Vietnam midnight and excludes refunds, cancelled and uncompleted orders', async () => {
  const report = await revenueReport(fixture.db, token, { from: '2026-10-26', to: '2026-10-26' });
  assert.deepEqual(report.rows, [{ label: '2026-10-26', count: 2, amount: 500 }]);
  assert.equal(report.total, 500); assert.equal(report.count, 2); assert.equal(report.average, 250);
});
test('weekly Monday and monthly grouping include only selected days; empty buckets remain zero', async () => {
  const weekly = await revenueReport(fixture.db, token, { from: '2026-10-25', to: '2026-10-28', period: 'week' });
  assert.deepEqual(weekly.rows, [{ label: '2026-10-19', count: 1, amount: 100 }, { label: '2026-10-26', count: 3, amount: 900 }]);
  const monthly = await revenueReport(fixture.db, token, { from: '2026-09-30', to: '2026-11-01', period: 'month' });
  assert.deepEqual(monthly.rows, [{ label: '2026-09', count: 0, amount: 0 }, { label: '2026-10', count: 5, amount: 1050 }, { label: '2026-11', count: 0, amount: 0 }]);
  const empty = await revenueReport(fixture.db, token, { from: '2027-01-01', to: '2027-01-02' });
  assert.equal(empty.total, 0); assert.equal(empty.average, 0); assert.equal(empty.rows.length, 2);
});
test('aggregated VND never silently rounds beyond safe integer range', async () => {
  await add('2030-01-01T00:00:00.000Z', Number.MAX_SAFE_INTEGER);
  await add('2030-01-02T00:00:00.000Z', Number.MAX_SAFE_INTEGER);
  const one = await revenueReport(fixture.db, token, { from: '2030-01-01', to: '2030-01-01' });
  assert.equal(one.total, Number.MAX_SAFE_INTEGER);
  await assert.rejects(revenueReport(fixture.db, token, { from: '2030-01-01', to: '2030-01-02' }), /giới hạn hiển thị chính xác/);
});
test('reports require active owner/editor sessions and reject customer/revoked sessions; HTTP no-store', async () => {
  const query = { from: '2026-10-26', to: '2026-10-26' }, auth = createAuthService(fixture.db);
  await assert.rejects(revenueReport(fixture.db, undefined, query), /đăng nhập/);
  await auth.register({ shippingAddress: { address: '123 Mẫu', province: 'TP HCM', ward: 'Phường mẫu' }, fullName: 'Khách', email: 'customer@example.test', phone: '0901234567', password: 'Customer-test-password-123' });
  const customer = await auth.login('customer', 'customer@example.test', 'Customer-test-password-123');
  await assert.rejects(revenueReport(fixture.db, customer.token, query), /Phiên quản trị/);
  await fixture.db.query("UPDATE admin_users SET role='editor'");
  assert.equal((await revenueReport(fixture.db, token, query)).total, 500);
  await fixture.db.query('UPDATE admin_users SET active=0');
  await assert.rejects(revenueReport(fixture.db, token, query), /Phiên quản trị/);
  await fixture.db.query("UPDATE admin_users SET active=1,role='owner'");
  const server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/v1/admin/reports/revenue?from=2026-10-26&to=2026-10-26`;
  try {
    assert.equal((await fetch(url)).status, 401);
    const response = await fetch(url, { headers: { cookie: `aura_admin=${token}` } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = await response.json(); assert.equal(data.total, 500); assert.equal(JSON.stringify(data).includes('fullName'), false);
    await auth.logout('admin', token);
    assert.equal((await fetch(url, { headers: { cookie: `aura_admin=${token}` } })).status, 401);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});
