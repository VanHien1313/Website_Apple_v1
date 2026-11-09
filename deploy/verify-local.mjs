// Run via stdin: Get-Content -Raw deploy/verify-local.mjs | docker compose exec -T app node --input-type=module
// Read-only deployment checks: no demo users, products or orders are created.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readConfig } from './backend/dist/config.js';
import { createDatabase } from './backend/dist/db/database.js';
import { assertSchemaReady } from './backend/dist/db/migrate.js';
import { createRequire } from 'node:module';
const sharp = createRequire(new URL('./backend/package.json', import.meta.url))('sharp');

const config = readConfig();
assert.equal(config.database.database, 'AuraStoreDocker');
assert.equal(config.database.user, 'aura_docker_app');
assert.notEqual(process.getuid(), 0);
const db = createDatabase(config.database);
try {
  await assertSchemaReady(db);
  const { rows: [permissions] } = await db.query(`SELECT
    IS_SRVROLEMEMBER('sysadmin') AS sysadmin,
    HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'CREATE TABLE') AS create_table,
    HAS_PERMS_BY_NAME('dbo.categories', 'OBJECT', 'INSERT') AS insert_category,
    HAS_PERMS_BY_NAME('dbo.schema_migrations', 'OBJECT', 'UPDATE') AS update_migrations`);
  assert.equal(permissions.sysadmin, 0);
  assert.equal(permissions.create_table, 0);
  assert.equal(permissions.insert_category, 1);
  assert.equal(permissions.update_migrations, 0);
  const migrations = (await db.query('SELECT name, checksum FROM schema_migrations ORDER BY name')).rows;
  const counts = (await db.query(`SELECT (SELECT COUNT(*) FROM admin_users) AS admins,
    (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM orders) AS orders`)).rows[0];
  const webp = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).webp().toBuffer();
  assert.equal((await sharp(webp).metadata()).format, 'webp');
  await assert.rejects(readFile('/run/secrets/sql_sa_password'), { code: 'ENOENT' });
  for (const path of ['/health/ready', '/', '/admin/login']) {
    const response = await fetch(`http://127.0.0.1:4000${path}`, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, path);
    if (path !== '/health/ready') assert.match(response.headers.get('content-type'), /text\/html/);
  }
  const missing = await fetch('http://127.0.0.1:4000/api/not-a-route');
  assert.equal(missing.status, 404);
  console.log(JSON.stringify({ event: 'docker_local_verified', migrations, counts, permissions, uid: process.getuid(), sharp: 'webp', http: 'passed' }, null, 2));
} finally {
  await db.close();
}
