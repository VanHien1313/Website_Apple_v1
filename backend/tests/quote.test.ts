import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { seedDemo } from '../src/db/seed.ts';
import { parseQuote, quoteCart } from '../src/checkout/quote.ts';
import { createApp } from '../src/app.ts';

let fixture: Awaited<ReturnType<typeof isolatedDatabase>>;
const skuId = '00000000-0000-4000-8000-000000000004';
const input = (quantity = 1, shippingMethod = 'standard') => ({ items: [{ skuId, quantity }], shippingMethod });
before(async () => { fixture = await isolatedDatabase(); await migrate(fixture.db); await seedDemo(fixture.db, { ALLOW_DEMO_SEED: 'true' }); });
after(async () => { await fixture?.cleanup(); });
const quote = (value: unknown) => fixture.db.transaction((tx) => quoteCart(tx, parseQuote(value)));

test('quote validates bounded distinct SKUs and quantities before querying', () => {
  for (const value of [null, {}, { ...input(), shippingMethod: 'invalid' }, { ...input(), shippingMethod: { toString: 'standard' } }, input(0), input(1.5), input(1000),
    { ...input(), items: [{ skuId: 'bad', quantity: 1 }] }, { ...input(), items: [...input().items, ...input().items] },
    { ...input(), items: Array.from({ length: 51 }, () => input().items[0]) }]) assert.throws(() => parseQuote(value));
  assert.equal(parseQuote(input()).items[0]?.quantity, 1);
});

test('canonical SQL prices ignore supplied prices; shipping and discount match policy', async () => {
  const one = await quote({ ...input(), price: 1, grandTotal: 1 });
  assert.equal(one.subtotal, 10000000); assert.equal(one.totalDiscount, 1000000);
  assert.equal(one.shippingFee, 50000); assert.equal(one.grandTotal, 10050000); assert.equal(one.canCheckout, true);
  assert.equal(one.lines[0]?.price, 10000000);
  assert.equal((await quote(input(2))).shippingFee, 0);
  assert.equal((await quote(input(2, 'express'))).shippingFee, 50000);
  const empty = await quote({ items: [], shippingMethod: 'standard' });
  assert.equal(empty.grandTotal, 0); assert.equal(empty.canCheckout, false);
  const stock = (await fixture.db.query('SELECT on_hand,reserved FROM inventory_skus WHERE id=@arg1', [skuId])).rows[0];
  assert.equal(stock?.on_hand, 5); assert.equal(stock?.reserved, 0);
});

test('reserved inventory and unavailable products yield blocking issues without removing input silently', async () => {
  await fixture.db.query('UPDATE inventory_skus SET reserved=4 WHERE id=@arg1', [skuId]);
  const result = await quote(input(2)); assert.equal(result.canCheckout, false);
  assert.equal(result.issues[0]?.code, 'INSUFFICIENT_STOCK'); assert.equal(result.lines[0]?.availableQuantity, 1);
  await fixture.db.query('UPDATE inventory_skus SET reserved=0 WHERE id=@arg1', [skuId]);
  await fixture.db.query('UPDATE products SET active=0');
  const inactive = await quote(input()); assert.equal(inactive.issues[0]?.code, 'UNAVAILABLE'); assert.equal(inactive.lines.length, 0);
  await fixture.db.query('UPDATE products SET active=1');
  const missing = await quote({ ...input(), items: [{ skuId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', quantity: 1 }] });
  assert.equal(missing.canCheckout, false); assert.equal(missing.issues.length, 1);
});

test('quote endpoint allows guests, enforces request origin, uses current price and rejects unsafe totals', async () => {
  const server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/v1/cart/quote`;
  try {
    assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input()) })).status, 403);
    const post = () => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000', 'x-aura-request': '1' }, body: JSON.stringify(input()) });
    await fixture.db.query('UPDATE inventory_skus SET price=9000000 WHERE id=@arg1', [skuId]);
    const response = await post(); assert.equal(response.status, 200); assert.equal((await response.json()).subtotal, 9000000);
    await fixture.db.query('UPDATE inventory_skus SET price=@arg1,original_price=@arg1 WHERE id=@arg2', [Number.MAX_SAFE_INTEGER, skuId]);
    await assert.rejects(quote(input(2)), /Tổng tiền/);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});
