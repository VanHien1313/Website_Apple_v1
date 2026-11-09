import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { readConfig } from '../src/config.ts';

test('database file secrets preserve password text and reject ambiguous, missing or empty inputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aura-secret-test-')), path = join(root, 'password');
  const env = { DB_SERVER: 'localhost', DB_DATABASE: 'Aura', DB_AUTH: 'sql', DB_USER: 'app', DB_PASSWORD_FILE: path };
  try {
    const password = "Quote' dollar$ and space ";
    await writeFile(path, password + '\r\n');
    assert.equal(readConfig(env).database.password, password);
    assert.throws(() => readConfig({ ...env, DB_PASSWORD: 'ambiguous' }), /Choose DB_PASSWORD/);
    assert.throws(() => readConfig({ ...env, DB_PASSWORD_FILE: join(root, 'missing') }));
    await writeFile(path, '\n'); assert.throws(() => readConfig(env), /Invalid database password file/);
    await writeFile(path, 'x'.repeat(4097)); assert.throws(() => readConfig(env), /Invalid database password file/);
    await writeFile(path, 'Only-for-test-12345');
    assert.throws(() => readConfig({ ...env, NODE_ENV: 'production', APP_ORIGIN: 'https://example.test', DB_TRUST_SERVER_CERTIFICATE: 'true' }), /verified database TLS/);
    assert.equal(readConfig({ ...env, NODE_ENV: 'production', APP_ORIGIN: 'https://example.test', DB_ENCRYPT: 'true', DB_TRUST_SERVER_CERTIFICATE: 'false' }).auth.secure, true);
  } finally { if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith('aura-secret-test-')) throw new Error('Unsafe temporary path'); await rm(root, { recursive: true, force: true }); }
});
