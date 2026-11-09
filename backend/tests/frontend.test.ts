import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../src/app.ts';
import { frontendRouter } from '../src/frontend.ts';
import { readConfig } from '../src/config.ts';
import type { Database } from '../src/db/database.ts';
const unavailable = async (): Promise<never> => { throw new Error('No database in static serving test'); };
const db: Database = { query: unavailable, exec: unavailable, transaction: unavailable, close: async () => {} };
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'aura-web-'));
  return { root, cleanup: async () => { const path = resolve(root); if (dirname(path) !== resolve(tmpdir()) || !basename(path).startsWith('aura-web-')) throw new Error('Unsafe temporary path'); await rm(path, { recursive: true, force: true }); } };
}
test('frontend serving is opt-in and refuses missing/demo/invalid bundle markers', async () => {
  const dir = await fixture();
  try {
    assert.throws(() => frontendRouter(dir.root), /Missing API frontend build/);
    await writeFile(join(dir.root, 'index.html'), '<html>fixture</html>');
    for (const value of ['invalid', JSON.stringify({ runtime: 'demo', version: 1 }), JSON.stringify({ runtime: 'api', version: 2 })]) {
      await writeFile(join(dir.root, 'aura-runtime.json'), value); assert.throws(() => frontendRouter(dir.root));
    }
    const env = { DB_SERVER: 'localhost', DB_DATABASE: 'Aura', DB_AUTH: 'windows' };
    assert.equal(readConfig(env).serveFrontend, false); assert.equal(readConfig({ ...env, SERVE_FRONTEND: 'true' }).serveFrontend, true);
    assert.throws(() => readConfig({ ...env, SERVE_FRONTEND: 'yes' }));
  } finally { await dir.cleanup(); }
});
test('built SPA serves deep routes/assets while preserving API/health/missing-file boundaries', async () => {
  const dir = await fixture();
  await writeFile(join(dir.root, 'index.html'), '<!doctype html><html><body>API shell</body></html>');
  await writeFile(join(dir.root, 'aura-runtime.json'), JSON.stringify({ runtime: 'api', version: 1 }));
  await writeFile(join(dir.root, '.env'), 'NEVER EXPOSE');
  await mkdir(join(dir.root, 'assets')); await writeFile(join(dir.root, 'assets', 'app-abc.js'), 'console.log("asset")');
  const server = createApp(db, () => {}, undefined, dir.root).listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const path of ['/', '/admin/products/new', '/product/example', '/account/orders/example']) {
      const response = await fetch(base + path, { headers: { Accept: 'text/html' } }); assert.equal(response.status, 200); assert.match(await response.text(), /API shell/); assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.match(await (await fetch(base + '/assets/app-abc.js')).text(), /console.log/);
    for (const path of ['/api/v1/missing', '/api', '/health/missing', '/assets/missing.js', '/.env']) {
      const response = await fetch(base + path, { headers: { Accept: 'text/html' } }); assert.equal(response.status, 404); assert.equal((await response.json()).error.code, 'NOT_FOUND');
    }
    assert.equal((await fetch(base + '/admin/products', { method: 'POST' })).status, 404);
    assert.equal((await fetch(base + '/admin/products', { headers: { Accept: 'application/json' } })).status, 404);
    assert.equal((await fetch(base + '/health/live')).status, 200);
    assert.equal((await fetch(base + '/health/ready')).status, 503);
    assert.equal((await fetch(base + '/admin/products', { method: 'HEAD' })).status, 200);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); await dir.cleanup(); }
});
