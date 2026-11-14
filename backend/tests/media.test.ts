import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import sharp from 'sharp';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { createApp } from '../src/app.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';

let fixture: Awaited<ReturnType<typeof isolatedDatabase>>;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let base: string, cookie: string, png: Buffer;
const origin = 'http://127.0.0.1:3000';
before(async () => {
  fixture = await isolatedDatabase(); await migrate(fixture.db);
  await bootstrapOwner(fixture.db, 'media@example.test', 'Uploader', 'Test-image-password-123');
  const login = await createAuthService(fixture.db).login('admin', 'media@example.test', 'Test-image-password-123');
  cookie = `aura_admin=${login.token}`;
  png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#ff0000' } }).png().toBuffer();
  server = createApp(fixture.db, () => {}, { origin, secure: false }).listen(0, '127.0.0.1');
  await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); } await fixture?.cleanup(); });
const upload = (body: Buffer, type = 'image/png', auth = cookie, requestOrigin = origin) => fetch(`${base}/admin/media`, { method: 'POST', headers: { cookie: auth, origin: requestOrigin, 'x-aura-request': '1', 'content-type': type }, body: new Uint8Array(body) });

test('upload requires admin session and same-origin request; re-encodes stored bytes', async () => {
  assert.equal((await upload(png, 'image/png', '')).status, 401);
  assert.equal((await upload(png, 'image/png', cookie, 'https://other.example')).status, 403);
  const response = await upload(png); assert.equal(response.status, 201);
  const image = await response.json(); assert.equal(image.width, 20); assert.equal(image.height, 10);
  const served = await fetch(new URL(image.url, base)); assert.equal(served.status, 200);
  assert.match(served.headers.get('content-type')!, /image\/webp/);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  const bytes = Buffer.from(await served.arrayBuffer()); assert.equal((await sharp(bytes).metadata()).format, 'webp');
  assert.notDeepEqual(bytes, png);
  assert.equal((await fetch(`${base}/media/not-an-id`)).status, 404);
});

test('rejects SVG, forged MIME, corrupt image, excessive bytes and excessive pixels without storing', async () => {
  assert.equal((await upload(Buffer.from('<svg/>'), 'image/svg+xml')).status, 415);
  assert.equal((await upload(png, 'image/jpeg')).status, 422);
  assert.equal((await upload(Buffer.from('not an image'))).status, 422);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  const huge = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: '#000000' } }).png().toBuffer();
  assert.equal((await upload(huge)).status, 422);
  assert.equal((await fixture.db.query('SELECT id FROM media_images')).rows.length, 1);
});

test('editor can upload; customer, disabled admin and revoked session cannot', async () => {
  await fixture.db.query("UPDATE admin_users SET role='editor' WHERE email='media@example.test'");
  assert.equal((await upload(png)).status, 201);
  const auth = createAuthService(fixture.db);
  await auth.register({ shippingAddress: { address: '123 Mẫu', province: 'TP HCM', ward: 'Phường mẫu' }, fullName: 'Customer', email: 'customer@example.test', phone: '0901234567', password: 'Test-customer-password-123' });
  const customer = await auth.login('customer', 'customer@example.test', 'Test-customer-password-123');
  assert.equal((await upload(png, 'image/png', `aura_customer=${customer.token}`)).status, 401);
  await fixture.db.query('UPDATE admin_users SET active=0');
  assert.equal((await upload(png)).status, 401);
  await fixture.db.query('UPDATE admin_users SET active=1');
  await auth.logout('admin', cookie.split('=')[1]);
  assert.equal((await upload(png)).status, 401);
});
