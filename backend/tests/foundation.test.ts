import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import type { Database, SqlClient } from '../src/db/database.ts';
import { loadMigrations, migrate, assertSchemaReady } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { readConfig } from '../src/config.ts';
import { createApp } from '../src/app.ts';

let db: Database;
let cleanup: () => Promise<void>;
const ids = ['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];
before(async () => { const isolated = await isolatedDatabase(); db = isolated.db; cleanup = isolated.cleanup; });
after(async () => { await cleanup?.(); });

test('configuration validates port/database without exposing supplied secrets', () => {
  assert.equal(readConfig({ DB_SERVER: 'localhost', DB_DATABASE: 'Aura', DB_AUTH: 'windows' }).port, 4000);
  for (const env of [{}, { DB_SERVER: 'localhost', DB_DATABASE: 'bad-name' }, { DB_SERVER: 'localhost', DB_DATABASE: 'Aura', DB_AUTH: 'windows', PORT: 'NaN' }]) assert.throws(() => readConfig(env));
});
test('readiness is unavailable before migrations and live endpoint remains available', async () => {
  await assert.rejects(assertSchemaReady(db));
  const logs: unknown[] = [];
  const server = createApp(db, (entry) => logs.push(entry)).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
    const ready = await fetch(`${base}/health/ready`); assert.equal(ready.status, 503);
    assert.equal((await ready.json()).error.code, 'NOT_READY');
    const missing = await fetch(`${base}/api/v1/private?password=never-log-this`, { headers: { authorization: 'secret-token' } });
    assert.equal(missing.status, 404); assert.ok(missing.headers.get('x-request-id')); assert.equal(missing.headers.get('x-powered-by'), null);
    const body = await missing.json(); assert.equal(body.error.requestId, missing.headers.get('x-request-id'));
    assert.ok(!JSON.stringify(logs).includes('never-log-this')); assert.ok(!JSON.stringify(logs).includes('secret-token'));
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
test('migrations apply once, report ready, reject changed history and roll back partial DDL', async () => {
  assert.deepEqual(await migrate(db), ['001_initial.sql', '002_media.sql', '003_order_receipts.sql', '004_order_request_lookup.sql', '005_category_version.sql', '006_product_version.sql', '007_admin_version.sql', '008_customer_address.sql', '009_customer_avatars.sql', '010_order_receipt.sql', '011_wallet_payments.sql']); assert.deepEqual(await migrate(db), []);
  await assertSchemaReady(db);
  const migrations = await loadMigrations();
  await assert.rejects(migrate(db, [{ ...migrations[0]!, checksum: 'changed' }]), /history mismatch/);
  await assert.rejects(migrate(db, [...migrations, { name: '002_failure.sql', checksum: 'test', sql: 'CREATE TABLE rollback_probe(id int); SELECT missing_function();' }]));
  assert.equal((await db.query("SELECT OBJECT_ID('rollback_probe','U') AS name")).rows[0]?.name, null);
  await assertSchemaReady(db);
});
test('seed is opt-in, refuses production, repeatable and preserves edits', async () => {
  await assert.rejects(seedDemo(db, {})); await assert.rejects(seedDemo(db, { NODE_ENV: 'production', ALLOW_DEMO_SEED: 'true' }));
  const env = { NODE_ENV: 'test', ALLOW_DEMO_SEED: 'true' }; await seedDemo(db, env);
  await db.query("UPDATE products SET name='Edited sample' WHERE id=@arg1", [ids[0]]);
  await seedDemo(db, env);
  assert.equal((await db.query('SELECT name FROM products WHERE id=@arg1', [ids[0]])).rows[0]?.name, 'Edited sample');
  assert.equal((await db.query('SELECT count(*) AS count FROM inventory_skus')).rows[0]?.count, 1);
  assert.equal((await db.query('SELECT count(*) AS count FROM admin_users')).rows[0]?.count, 0);
});
test('foreign keys, normalized unique keys, prices and stock constraints reject invalid data', async () => {
  await assert.rejects(db.query("DELETE FROM categories WHERE id='demo-hardware'"));
  await assert.rejects(db.query("INSERT INTO categories VALUES ('duplicate',N' thiết bị mẫu B1 ')"));
  for (const assignment of ['reserved=6', 'on_hand=-1', 'price=0', 'price=12000000', 'original_price=9007199254740992']) await assert.rejects(db.query(`UPDATE inventory_skus SET ${assignment} WHERE id=@arg1`, [ids[3]]));
  await db.query("INSERT INTO products(id,category_id,slug,name,thumbnail) VALUES (@arg1,'demo-hardware','other','Other','/sample.svg')", ['10000000-0000-4000-8000-000000000001']);
  await db.query("INSERT INTO colors(id,product_id,name,hex,image) VALUES (@arg1,@arg2,'Other','#ffffff','/sample.svg')", ['10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001']);
  await assert.rejects(db.query('UPDATE inventory_skus SET color_id=@arg1 WHERE id=@arg2', ['10000000-0000-4000-8000-000000000003', ids[3]]));
});
test('transaction failure restores stock and removes partial writes', async () => {
  await assert.rejects(db.transaction(async (tx) => {
    await tx.query('UPDATE inventory_skus SET reserved=2 WHERE id=@arg1', [ids[3]]);
    await tx.query("INSERT INTO categories VALUES ('rollback-test','Rollback')");
    throw new Error('Simulated write failure');
  }));
  assert.equal((await db.query('SELECT reserved FROM inventory_skus WHERE id=@arg1', [ids[3]])).rows[0]?.reserved, 0);
  assert.equal((await db.query("SELECT * FROM categories WHERE id='rollback-test'")).rows.length, 0);
});
test('normalized customer email and session principal constraints', async () => {
  const customer = '30000000-0000-4000-8000-000000000001';
  await db.query("INSERT INTO customers(id,email,full_name,phone,password_hash) VALUES (@arg1,'sample@example.test','Sample','0901234567','not-a-login-credential')", [customer]);
  await assert.rejects(db.query("INSERT INTO customers(id,email,full_name,phone,password_hash) VALUES (@arg1,'sample@example.test','Duplicate','0901234567','not-a-login-credential')", ['30000000-0000-4000-8000-000000000002']));
  await assert.rejects(db.query("UPDATE customers SET email=' SAMPLE@EXAMPLE.TEST ' WHERE id=@arg1", [customer]));
  await assert.rejects(db.query("INSERT INTO sessions(token_hash,credential_version,expires_at) VALUES (@arg1,1,DATEADD(hour,1,SYSUTCDATETIME()))", ['b'.repeat(64)]));
  await db.query("INSERT INTO sessions(token_hash,customer_id,credential_version,expires_at) VALUES (@arg1,@arg2,1,DATEADD(hour,1,SYSUTCDATETIME()))", ['b'.repeat(64),customer]);
  await assert.rejects(db.query("UPDATE sessions SET expires_at=created_at WHERE token_hash=@arg1", ['b'.repeat(64)]));
});
test('SKU uniqueness ignores case/whitespace and preserves stock on conflicting inserts', async () => {
  const color = '40000000-0000-4000-8000-000000000001';
  await db.query("INSERT INTO colors(id,product_id,name,hex,image) VALUES (@arg1,@arg2,'Another','#ffffff','/sample.svg')", [color,ids[0]]);
  await assert.rejects(db.query(`INSERT INTO inventory_skus(id,product_id,variant_id,color_id,sku,price,original_price)
    VALUES ('40000000-0000-4000-8000-000000000002',@arg1,@arg2,@arg3,' demo-b1-128-black ',10000000,11000000)`, [ids[0],ids[1],color]));
  assert.equal((await db.query('SELECT count(*) AS count FROM inventory_skus')).rows[0]?.count, 1);
});
test('order totals, completed payment, snapshot retention, events and idempotency constraints', async () => {
  const orderId = '20000000-0000-4000-8000-000000000001';
  await db.query(`INSERT INTO orders(id,order_code,customer_snapshot,shipping_address,shipping_method,subtotal,shipping_fee,total)
    VALUES (@arg1,'SAMPLE-1','{"fullName":"Sample"}','{}','standard',10000000,50000,10050000)`, [orderId]);
  await assert.rejects(db.query('UPDATE orders SET total=1 WHERE id=@arg1', [orderId]));
  await assert.rejects(db.query("UPDATE orders SET status='COMPLETED',completed_at=SYSUTCDATETIME() WHERE id=@arg1", [orderId]));
  await db.query(`INSERT INTO order_items(id,order_id,sku_id,product_id,variant_id,product_name,product_image,color_name,quantity,unit_price,total_price)
    VALUES ('20000000-0000-4000-8000-000000000002',@arg1,@arg2,@arg3,@arg4,'Snapshot sample','/sample.svg','Black',1,10000000,10000000)`, [orderId,ids[3],ids[0],ids[1]]);
  await db.query("UPDATE products SET name='Changed again' WHERE id=@arg1", [ids[0]]);
  assert.equal((await db.query('SELECT product_name FROM order_items WHERE order_id=@arg1', [orderId])).rows[0]?.product_name, 'Snapshot sample');
  await db.query(`INSERT INTO order_events(id,order_id,actor_type,actor_name,kind,from_state,to_state,note)
    VALUES ('20000000-0000-4000-8000-000000000003',@arg1,'system','Test','status','PENDING','PROCESSING','Sample event')`, [orderId]);
  await assert.rejects(db.query('DELETE FROM order_events WHERE order_id=@arg1', [orderId]));
  await assert.rejects(db.query("UPDATE order_events SET note='changed' WHERE order_id=@arg1", [orderId]));
  const insert = "INSERT INTO idempotency_requests(scope,request_id,fingerprint,order_id,expires_at) VALUES ('sample','request-1',@arg1,@arg2,DATEADD(day,1,SYSUTCDATETIME()))";
  await db.query(insert, ['a'.repeat(64),orderId]); await assert.rejects(db.query(insert, ['a'.repeat(64),orderId]));
});
test('readiness returns 200 with applied schema and safe JSON headers', async () => {
  const server = createApp(db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try {
    const result = await fetch(`http://127.0.0.1:${address.port}/health/ready`);
    assert.equal(result.status, 200); assert.deepEqual(await result.json(), { status: 'ready' });
    assert.equal(result.headers.get('cache-control'), 'no-store');
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
test('concurrent SQL Server transactions cannot reserve the last item twice', async () => {
  await db.query('UPDATE inventory_skus SET on_hand=1,reserved=0 WHERE id=@arg1',[ids[3]]);
  const reserve = () => db.transaction(async tx => (await tx.query('UPDATE inventory_skus SET reserved=reserved+1 OUTPUT INSERTED.id WHERE id=@arg1 AND on_hand-reserved>=1',[ids[3]])).rows.length);
  assert.equal((await Promise.all([reserve(),reserve()])).reduce((a,b)=>a+b,0),1);
  await db.query('UPDATE inventory_skus SET on_hand=5,reserved=0 WHERE id=@arg1',[ids[3]]);
});
test('catalog HTTP queries SQL Server with validated search, price, pagination and safe errors', async () => {
  const server = createApp(db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  try {
    const categories = await (await fetch(`${base}/categories`)).json(); assert.ok(categories.some((c: {id: string}) => c.id === 'demo-hardware'));
    const list = await (await fetch(`${base}/products?category=demo-hardware&minPrice=0&sort=price_desc&pageSize=1`)).json();
    assert.equal(list.total, 1); assert.equal(list.items[0].basePrice, 10000000); assert.equal(list.pageSize, 1);
    const detail = await (await fetch(`${base}/products/by-slug/sample-device-b1`)).json();
    assert.equal(detail.variants[0].price,10000000); assert.equal(detail.variants[0].inStock,true);
    assert.equal(detail.colors[0].name,'Màu mẫu'); assert.ok(Array.isArray(detail.gallery)); assert.ok(detail.createdAt.endsWith('Z'));
    assert.equal((await fetch(`${base}/products/by-slug/missing`)).status,404);
    const empty = await (await fetch(`${base}/products?q=${encodeURIComponent("' OR 1=1 --")}`)).json(); assert.equal(empty.total, 0);
    const beyond = await (await fetch(`${base}/products?page=99`)).json(); assert.equal(beyond.total, 1); assert.deepEqual(beyond.items, []);
    for (const query of ['page=0','pageSize=101','sort=invalid','sort=__proto__','minPrice=-1','minPrice=10&maxPrice=2','q=a&q=b']) {
      const result = await fetch(`${base}/products?${query}`); assert.equal(result.status, 400, query);
      assert.equal((await result.json()).error.code, 'INVALID_QUERY');
    }
    await db.query('UPDATE products SET active=0 WHERE id=@arg1', [ids[0]]);
    assert.equal((await (await fetch(`${base}/products`)).json()).total, 0);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
