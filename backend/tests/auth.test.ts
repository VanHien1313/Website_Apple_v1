import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { isolatedDatabase } from './database.ts';
import type { Database, SqlClient } from '../src/db/database.ts';
import { migrate } from '../src/db/migrate.ts';
import { createApp } from '../src/app.ts';
import { bootstrapOwner } from '../src/auth/bootstrap.ts';
import { createAuthService } from '../src/auth/service.ts';
import { hashPassword } from '../src/auth/password.ts';

let db: Database;
let cleanup: () => Promise<void>;
const password = 'Sample-password-only-123';
const input = { shippingAddress: { address: '123 Mẫu', province: 'TP HCM', ward: 'Phường mẫu' }, email: 'sample-auth@example.test', fullName: 'Sample customer', phone: '0901234567', password };
const origin = 'http://127.0.0.1:3000';
before(async () => { const isolated = await isolatedDatabase(); db = isolated.db; cleanup = isolated.cleanup; await migrate(db); });
after(async () => { await cleanup?.(); });
async function http(work: (base: string) => Promise<void>, secure = false) {
  const server = createApp(db, () => {}, { origin, secure }).listen(0,'127.0.0.1'); await once(server,'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await work(`http://127.0.0.1:${address.port}/api/v1`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}
const send = (base: string, path: string, body: unknown, cookie = '', method = 'POST') => fetch(base + path, { method, headers: { origin, 'x-aura-request': '1', 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0]!;

test('eight-character passwords register and change; legacy credentials can still log in and rotate', async () => {
  const service = createAuthService(db), email = 'password-policy@example.test';
  for (const password of ['Aura!12', 'aura!123', 'Aura1234']) await assert.rejects(service.register({ ...input, email, password }));
  const profile = await service.register({ ...input, email, password: 'Aura!123' });
  const session = await service.login('customer', email, 'Aura!123');
  await service.changePassword('customer', session.token, 'Aura!123', 'Next!123');
  await assert.rejects(service.me('customer', session.token));
  await service.login('customer', email, 'Next!123');
  await db.query('UPDATE customers SET password_hash=@arg1 WHERE id=@arg2', [await hashPassword('legacy-password'), profile.id]);
  const legacy = await service.login('customer', email, 'legacy-password');
  await service.changePassword('customer', legacy.token, 'legacy-password', 'Fresh!12');
  await service.login('customer', email, 'Fresh!12');
});

test('customer registration, duplicate email, cookie login and logout use database sessions', async () => {
  await http(async (base) => {
    for (const missing of ['fullName', 'email', 'phone', 'shippingAddress']) {
      assert.equal((await send(base, '/auth/register', { ...input, [missing]: undefined })).status, 422);
    }
    for (const field of ['address', 'province', 'ward']) {
      assert.equal((await send(base, '/auth/register', { ...input, shippingAddress: { ...input.shippingAddress, [field]: '' } })).status, 422);
    }
    const registered = await send(base,'/auth/register',input); assert.equal(registered.status,201);
    const publicProfile = await registered.json(); assert.equal(publicProfile.fullName,input.fullName); assert.ok(!('password_hash' in publicProfile));
    assert.deepEqual(publicProfile.shippingAddress, input.shippingAddress);
    const stored = (await db.query('SELECT password_hash FROM customers WHERE email=@arg1',[input.email])).rows[0]!;
    assert.ok(String(stored.password_hash).startsWith('scrypt-v1$')); assert.ok(!String(stored.password_hash).includes(password));
    assert.equal((await send(base,'/auth/register',{ ...input, email: input.email.toUpperCase() })).status,409);
    assert.equal((await send(base,'/auth/login',{email:input.email,password:'Incorrect-password-123'})).status,401);
    const login = await send(base,'/auth/login',input); assert.equal(login.status,200);
    assert.match(login.headers.get('set-cookie')!,/HttpOnly/); assert.match(login.headers.get('set-cookie')!,/SameSite=Lax/);
    const cookie = cookieOf(login); const rawToken = cookie.split('=')[1]!;
    assert.equal((await db.query('SELECT * FROM sessions WHERE token_hash=@arg1',[rawToken])).rows.length,0);
    assert.equal((await fetch(base+'/auth/me',{headers:{cookie}})).status,200);
    assert.equal((await fetch(base+'/admin/auth/me',{headers:{cookie}})).status,401);
    assert.equal((await send(base,'/auth/logout',{},cookie)).status,204);
    assert.equal((await fetch(base+'/auth/me',{headers:{cookie}})).status,401);
  });
});
test('password change revokes every old session; old password cannot log in', async () => {
  await http(async (base) => {
    const a = cookieOf(await send(base,'/auth/login',input)); const b = cookieOf(await send(base,'/auth/login',input));
    assert.equal((await send(base,'/auth/password',{ oldPassword:'Incorrect-password-123',newPassword:'New-sample-password-123' },a,'PUT')).status,422);
    assert.equal((await send(base,'/auth/password',{oldPassword:password,newPassword:'New-sample-password-123'},a,'PUT')).status,204);
    for (const cookie of [a,b]) assert.equal((await fetch(base+'/auth/me',{headers:{cookie}})).status,401);
    assert.equal((await send(base,'/auth/login',input)).status,401);
    assert.equal((await send(base,'/auth/login',{email:input.email,password:'New-sample-password-123'})).status,200);
  });
});
test('origin/custom header checks, malformed JSON and bounded throttling reject unsafe requests', async () => {
  await http(async (base) => {
    for (const headers of ([{ origin:'https://other.example', 'x-aura-request':'1' }, { origin }] as Record<string,string>[])) {
      const response = await fetch(base+'/auth/login',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}'}); assert.equal(response.status,403);
    }
    assert.equal((await fetch(base+'/auth/login',{method:'POST',headers:{origin,'x-aura-request':'1','content-type':'application/json'},body:'{'})).status,400);
    for (let i=0;i<20;i++) assert.equal((await send(base,'/auth/login',{})).status,401);
    assert.equal((await send(base,'/auth/login',{})).status,429);
  });
});
test('owner bootstrap refuses existing admins; disabled admin and expired sessions lose access', async () => {
  await bootstrapOwner(db,'owner@example.test','Sample owner',password);
  await assert.rejects(bootstrapOwner(db,'other@example.test','Other',password),/empty admin/);
  await http(async (base) => {
    assert.equal((await send(base,'/admin/auth/login',input)).status,401);
    const login = await send(base,'/admin/auth/login',{email:'owner@example.test',password}); assert.equal(login.status,200);
    const cookie = cookieOf(login); assert.match(cookie,/^__Host-aura_admin=/); assert.match(login.headers.get('set-cookie')!,/Secure/);
    assert.equal((await fetch(base+'/admin/auth/me',{headers:{cookie}})).status,200);
    await db.query("UPDATE admin_users SET active=0 WHERE email='owner@example.test'");
    assert.equal((await fetch(base+'/admin/auth/me',{headers:{cookie}})).status,401);
    assert.equal((await send(base,'/admin/auth/login',{email:'owner@example.test',password})).status,401);
  },true);
  const service = createAuthService(db); const session = await service.login('customer',input.email,'New-sample-password-123');
  await db.query("UPDATE sessions SET created_at=DATEADD(hour,-2,SYSUTCDATETIME()),expires_at=DATEADD(hour,-1,SYSUTCDATETIME())");
  await assert.rejects(service.me('customer',session.token),/Phiên/);
});
