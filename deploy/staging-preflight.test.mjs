import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { rootCertificates } from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateStaging, validateStagingFiles } from './staging-preflight-core.mjs';

function fixture() {
  const environment = { NODE_ENV: 'production', SERVE_FRONTEND: 'true', DB_AUTH: 'sql', DB_ENCRYPT: 'true', DB_TRUST_SERVER_CERTIFICATE: 'false', ALLOW_DEMO_SEED: 'false', DB_SERVER: 'sql.aura.test', DB_DATABASE: 'AuraStaging', DB_PORT: '1433', APP_ORIGIN: 'https://shop.aura.test', TRUST_PROXY_IPS: '172.20.0.1', NODE_EXTRA_CA_CERTS: '/run/secrets/sql_ca' };
  const common = { image: `registry.aura.test/app@sha256:${'a'.repeat(64)}`, read_only: true, cap_drop: ['ALL'], security_opt: ['no-new-privileges:true'] };
  return { name: 'aura-staging', services: {
    app: { ...common, environment: { ...environment, DB_USER: 'app', DB_PASSWORD_FILE: '/run/secrets/sql_app_password' }, secrets: [{ source: 'sql_app_password' }, { source: 'sql_ca' }], ports: [{ host_ip: '127.0.0.1', published: '4100', target: 4000 }], deploy: { replicas: 1 } },
    migrate: { ...common, environment: { ...environment, DB_USER: 'migrator', DB_PASSWORD_FILE: '/run/secrets/sql_migration_password' }, secrets: [{ source: 'sql_migration_password' }, { source: 'sql_ca' }], profiles: ['tools'], command: ['node', 'backend/dist/db/cli.js', 'migrate'] },
  }, secrets: Object.fromEntries(['sql_app_password', 'sql_migration_password', 'sql_ca'].map(name => [name, { file: `/tmp/${name}` }])) };
}

test('accepts explicit staging topology and rejects mutable images/placeholders', () => {
  assert.deepEqual(validateStaging(fixture()), []);
  const normalized = fixture();
  for (const service of Object.values(normalized.services)) for (const secret of service.secrets) secret.target = `/run/secrets/${secret.source}`;
  assert.deepEqual(validateStaging(normalized), []);
  for (const image of ['aura:latest', 'sha256:' + 'a'.repeat(64), 'registry.example.invalid/app@sha256:' + 'a'.repeat(64)]) {
    const config = fixture(); config.services.app.image = image;
    assert.ok(validateStaging(config).some(error => error.includes('registry reference')));
  }
});
test('rejects public app port, migration secret leakage and renamed mount targets', () => {
  const config = fixture();
  config.services.app.ports[0].host_ip = '0.0.0.0';
  config.services.app.secrets.push({ source: 'sql_migration_password' });
  config.services.migrate.secrets[0].target = 'other';
  const errors = validateStaging(config);
  assert.ok(errors.some(error => error.includes('127.0.0.1')));
  assert.ok(errors.some(error => error.includes('Runtime must receive')));
  assert.ok(errors.some(error => error.includes('mount targets')));
});
test('rejects TLS bypass, local database, shared login and blanket proxy trust', () => {
  const config = fixture();
  Object.assign(config.services.app.environment, { DB_TRUST_SERVER_CERTIFICATE: 'true', DB_DATABASE: 'AURASTOREDOCKER', DB_USER: 'migrator', TRUST_PROXY_IPS: 'true', NODE_TLS_REJECT_UNAUTHORIZED: '0' });
  const errors = validateStaging(config);
  for (const expected of ['verified SQL TLS', 'dedicated staging database', 'logins must differ', 'explicit trusted proxy', 'global TLS']) assert.ok(errors.some(error => error.includes(expected)), expected);
});
test('rejects mismatched migration target and multi-instance limiter deployment', () => {
  const config = fixture(); config.services.migrate.environment.DB_SERVER = 'other.aura.test'; config.services.app.deploy.replicas = 2;
  assert.ok(validateStaging(config).some(error => error.includes('disagree on DB_SERVER')));
  assert.ok(validateStaging(config).some(error => error.includes('one app replica')));
});
test('checks secrets and PEM CA without leaking file content in errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aura-preflight-'));
  const config = fixture();
  const privateValue = 'Never-print-this-private-value';
  try {
    for (const name of Object.keys(config.secrets)) config.secrets[name].file = join(directory, name);
    await writeFile(config.secrets.sql_app_password.file, privateValue + '\r\n');
    await writeFile(config.secrets.sql_migration_password.file, 'Different-migration-password');
    const cert = rootCertificates.find(pem => { const c = new X509Certificate(pem); return c.ca && Date.parse(c.validFrom) < Date.now() && Date.parse(c.validTo) > Date.now(); });
    assert.ok(cert); await writeFile(config.secrets.sql_ca.file, cert);
    assert.deepEqual(await validateStagingFiles(config), []);
    await writeFile(config.secrets.sql_migration_password.file, privateValue);
    assert.ok((await validateStagingFiles(config)).some(error => error.includes('must differ')));
    await writeFile(config.secrets.sql_ca.file, cert + '\n-----BEGIN PRIVATE KEY-----\n' + privateValue);
    const errors = await validateStagingFiles(config);
    assert.ok(errors.some(error => error.startsWith('sql_ca:')));
    assert.ok(!JSON.stringify(errors).includes(privateValue));
    await writeFile(config.secrets.sql_app_password.file, 'short');
    assert.ok((await validateStagingFiles(config)).some(error => error.startsWith('sql_app_password:')));
  } finally {
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('aura-preflight-')) throw new Error('Unsafe temporary path');
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI validates real Compose rendering with temporary credentials and CA', { skip: process.env.TEST_STAGING_COMPOSE !== 'true' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aura-preflight-'));
  try {
    const password = join(directory, 'app.txt'), migration = join(directory, 'migration.txt'), ca = join(directory, 'ca.pem');
    await writeFile(password, 'Temporary-app-password-123');
    await writeFile(migration, 'Temporary-migrator-password-456');
    const cert = rootCertificates.find(pem => { const c = new X509Certificate(pem); return c.ca && Date.parse(c.validFrom) < Date.now() && Date.parse(c.validTo) > Date.now(); });
    await writeFile(ca, cert);
    const values = { AURA_IMAGE: `registry.aura.test/app@sha256:${'a'.repeat(64)}`, APP_ORIGIN: 'https://shop.aura.test', TRUST_PROXY_IPS: '172.20.0.1', DB_SERVER: 'sql.aura.test', DB_PORT: '1433', DB_DATABASE: 'AuraStaging', DB_USER: 'app', DB_MIGRATION_USER: 'migrator', SQL_APP_PASSWORD_PATH: password.replaceAll('\\', '/'), SQL_MIGRATION_PASSWORD_PATH: migration.replaceAll('\\', '/'), SQL_CA_PATH: ca.replaceAll('\\', '/') };
    const envPath = join(directory, 'staging.env');
    await writeFile(envPath, Object.entries(values).map(([key, value]) => `${key}='${value}'`).join('\n'));
    const env = { ...process.env };
    for (const key of Object.keys(values)) delete env[key];
    const output = execFileSync(process.execPath, [fileURLToPath(new URL('./staging-preflight.mjs', import.meta.url)), envPath], { encoding: 'utf8', env, windowsHide: true });
    const report = JSON.parse(output);
    assert.equal(report.status, 'configuration_passed');
    assert.deepEqual(report.errors, []);
    assert.ok(!output.includes('Temporary-app-password'));
  } finally {
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('aura-preflight-')) throw new Error('Unsafe temporary path');
    await rm(directory, { recursive: true, force: true });
  }
});
