import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import sharp from 'sharp';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { createApp } from '../src/app.ts';
import { createAuthService } from '../src/auth/service.ts';
let fixture: Awaited<ReturnType<typeof isolatedDatabase>>;
let server: ReturnType<ReturnType<typeof createApp>['listen']>, base: string;
const origin = 'http://127.0.0.1:3000';
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db);
  server = createApp(fixture.db, () => {}, { origin, secure: false }).listen(0, '127.0.0.1');
  await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}/api/v1/auth/avatar`;
});
after(async () => { server?.closeAllConnections(); if (server) await new Promise<void>(resolve => server.close(() => resolve())); await fixture?.cleanup(); });
async function customer() {
  const auth = createAuthService(fixture.db), email = `${crypto.randomUUID()}@example.test`;
  await auth.register({ email, fullName: 'Avatar QA', phone: '0901234567', password: 'Avatar!123', shippingAddress: { address: '123 Test', province: 'HCM', ward: 'Test' } });
  return `aura_customer=${(await auth.login('customer', email, 'Avatar!123')).token}`;
}
const upload = (cookie: string, body: Buffer, type = 'image/png', requestOrigin = origin) => fetch(base, { method: 'PUT', headers: { cookie, origin: requestOrigin, 'x-aura-request': '1', 'content-type': type }, body: new Uint8Array(body) });
test('avatar requires customer and same origin, is private, persists normalized square image and deletes', async () => {
  const cookie = await customer(), other = await customer();
  const png = await sharp({ create: { width: 700, height: 600, channels: 3, background: '#2854d9' } }).png().toBuffer();
  assert.equal((await upload('', png)).status, 401);
  assert.equal((await upload(cookie, png, 'image/png', 'https://foreign.test')).status, 403);
  assert.equal((await upload(cookie, png)).status, 204);
  assert.equal((await upload(cookie, png)).status, 429);
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await fetch(base, { headers: { cookie: other } })).status, 204);
  const image = await fetch(base, { headers: { cookie } }); assert.equal(image.status, 200);
  assert.equal(image.headers.get('cache-control'), 'private, no-store');
  const metadata = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 512); assert.equal(metadata.height, 512);
  await new Promise(resolve => setTimeout(resolve, 3100));
  assert.equal((await fetch(base, { method: 'DELETE', headers: { cookie, origin, 'x-aura-request': '1' } })).status, 204);
  assert.equal((await fetch(base, { headers: { cookie } })).status, 204);
  await createAuthService(fixture.db).logout('customer', cookie.split('=')[1]);
  assert.equal((await fetch(base, { headers: { cookie } })).status, 401);
});
test('avatar rejects vector, forged MIME, invalid bytes and excessive payload', async () => {
  assert.equal((await upload(await customer(), Buffer.from('<svg/>'), 'image/svg+xml')).status, 415);
  assert.equal((await upload(await customer(), Buffer.from('bad'))).status, 422);
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).png().toBuffer();
  assert.equal((await upload(await customer(), png, 'image/jpeg')).status, 422);
  assert.equal((await upload(await customer(), Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
});
