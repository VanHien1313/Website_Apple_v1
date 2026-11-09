import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import { migrate } from '../src/db/migrate.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { adminManagement } from '../src/admin-users.ts';
import { createApp } from '../src/app.ts';
let fixture: Awaited<ReturnType<typeof isolatedDatabase>>, token: string;
const password = 'Admin-test-password-123';
const service = () => adminManagement(fixture.db);
const create = (email: string, role = 'editor') => service().create(token, { email, name: 'Nhân viên', role, active: true, password });
before(async () => { fixture = await isolatedDatabase(); await migrate(fixture.db); await bootstrapOwner(fixture.db, 'owner@example.test', 'Chủ cửa hàng', password); token = (await createAuthService(fixture.db).login('admin', 'owner@example.test', password)).token; });
after(async () => { await fixture?.cleanup(); });
test('owner creates hashed admin; responses never contain credentials; duplicate email and validation rejected', async () => {
  const row = await create(' FIRST@example.test ');
  assert.equal(row.email, 'first@example.test'); assert.match(row.revision, /^[A-F0-9]{16}$/);
  assert.equal('password_hash' in row, false); assert.equal('credential_version' in row, false);
  const stored = (await fixture.db.query<{ password_hash: string }>('SELECT password_hash FROM admin_users WHERE id=@arg1', [row.id])).rows[0]!;
  assert.notEqual(stored.password_hash, password);
  await assert.rejects(create('first@example.test'), /đã được sử dụng/);
  await assert.rejects(create('bad-address'), /Email hợp lệ/);
  await assert.rejects(service().create(token, { name: 'X', email: 'x@example.test', role: 'owner', active: true, password: 'short' }), /12–128/);
});
test('editor, customer, anonymous and revoked callers cannot administer accounts', async () => {
  const auth = createAuthService(fixture.db);
  const editor = await auth.login('admin', 'first@example.test', password);
  await assert.rejects(service().list(editor.token, {}), /Chỉ chủ cửa hàng/);
  await assert.rejects(service().create(editor.token, {}), /Chỉ chủ cửa hàng/);
  const self = (await service().list(token, {})).items.find((r) => r.email === 'first@example.test')!;
  await assert.rejects(service().update(editor.token, self.id, { ...self, role: 'owner' }), /Chỉ chủ cửa hàng/);
  await auth.register({ email: 'customer@example.test', fullName: 'Khách', phone: '0901234567', password });
  const customer = await auth.login('customer', 'customer@example.test', password);
  await assert.rejects(service().list(customer.token, {}), /Phiên quản trị/);
  await assert.rejects(service().list(undefined, {}), /đăng nhập/);
  await auth.logout('admin', editor.token);
  await assert.rejects(service().list(editor.token, {}), /Phiên quản trị/);
});
test('role and active changes revoke sessions; reactivation does not restore old sessions', async () => {
  const row = await create('revoke@example.test'); const auth = createAuthService(fixture.db);
  const old = await auth.login('admin', row.email, password);
  const promoted = await service().update(token, row.id, { ...row, role: 'owner' });
  await assert.rejects(auth.me('admin', old.token), /Phiên không hợp lệ/);
  const promotedSession = await auth.login('admin', row.email, password);
  const disabled = await service().update(token, row.id, { ...promoted, active: false });
  await assert.rejects(auth.me('admin', promotedSession.token), /Phiên không hợp lệ/);
  await assert.rejects(auth.login('admin', row.email, password), /Email hoặc mật khẩu/);
  await service().update(token, row.id, { ...disabled, active: true });
  await assert.rejects(auth.me('admin', promotedSession.token), /Phiên không hợp lệ/);
  assert.ok((await auth.login('admin', row.email, password)).token);
});
test('self protection preserves an owner; concurrent saves reject stale versions', async () => {
  const own = (await service().list(token, { q: 'owner@example.test' })).items[0]!;
  await assert.rejects(service().update(token, own.id, { ...own, active: false }), /Không thể tự khóa/);
  await assert.rejects(service().update(token, own.id, { ...own, role: 'editor' }), /Không thể tự khóa/);
  const row = await create('race@example.test');
  const outcomes = await Promise.allSettled([service().update(token, row.id, { ...row, name: 'Một' }), service().update(token, row.id, { ...row, name: 'Hai' })]);
  assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1);
  assert.match(String((outcomes.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason), /đã thay đổi/);
});
test('owner list paginates, literal search is bounded and does not return hashes', async () => {
  // Provision test rows in SQL to keep pagination coverage independent of password hash cost.
  await fixture.db.exec("DECLARE @i int=0; WHILE @i<21 BEGIN INSERT INTO admin_users(id,email,name,password_hash,role) VALUES(NEWID(),CONCAT('page-',@i,'@example.test'),N'Phân trang','not-a-login-hash','editor'); SET @i=@i+1; END");
  const page = await service().list(token, { q: 'page-', page: 2 }); assert.equal(page.total, 21); assert.equal(page.items.length, 1);
  assert.equal((await service().list(token, { q: '%' })).total, 0);
  await assert.rejects(service().list(token, { page: 0 }), /Bộ lọc/);
  assert.equal(JSON.stringify(page).includes('password'), false);
});
test('HTTP admin users require cookie, same origin and revision', async () => {
  const server = createApp(fixture.db, () => {}).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}/api/v1/admin/users`;
  const headers = { cookie: `aura_admin=${token}`, origin: 'http://127.0.0.1:3000', 'x-aura-request': '1', 'content-type': 'application/json' };
  const body = { email: 'http@example.test', name: 'HTTP', password, role: 'editor', active: true };
  try {
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { method: 'POST', headers: { ...headers, origin: 'https://other.test' }, body: JSON.stringify(body) })).status, 403);
    const response = await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) }); assert.equal(response.status, 201); const row = await response.json();
    assert.equal((await fetch(`${base}/${row.id}`, { method: 'PUT', headers, body: JSON.stringify(body) })).status, 422);
    assert.equal((await fetch(`${base}/${row.id}`, { method: 'PUT', headers, body: JSON.stringify({ ...row, active: false }) })).status, 200);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('two owners cannot concurrently remove each other and leave no active owner', async () => {
  const a = await create('owner-a@example.test', 'owner'), b = await create('owner-b@example.test', 'owner');
  const auth = createAuthService(fixture.db);
  const aSession = await auth.login('admin', a.email, password), bSession = await auth.login('admin', b.email, password);
  const results = await Promise.allSettled([
    service().update(aSession.token, b.id, { ...b, active: false }),
    service().update(bSession.token, a.id, { ...a, active: false }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const rows = (await fixture.db.query<{ active: boolean }>('SELECT active FROM admin_users WHERE id=@arg1 OR id=@arg2', [a.id, b.id])).rows;
  assert.equal(rows.filter((r) => r.active).length, 1);
});
