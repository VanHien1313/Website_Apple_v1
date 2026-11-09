import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { readConfig } from '../src/config.ts';
import { createApp } from '../src/app.ts';
import type { Database } from '../src/db/database.ts';

test('proxy configuration accepts explicit IPs only and is disabled by default', () => {
  const env = { DB_SERVER: 'localhost', DB_DATABASE: 'Aura', DB_AUTH: 'windows' };
  assert.deepEqual(readConfig(env).trustedProxyIps, []);
  assert.deepEqual(readConfig({ ...env, TRUST_PROXY_IPS: '127.0.0.1, ::1' }).trustedProxyIps, ['127.0.0.1', '::1']);
  for (const invalid of ['true', '1', 'loopback', '10.0.0.0/8', '*', '127.0.0.1,', 'proxy.local']) {
    assert.throws(() => readConfig({ ...env, TRUST_PROXY_IPS: invalid }), /explicit IP/);
  }
});

test('forwarded IP cannot override untrusted peers and stops at nearest untrusted hop', async () => {
  for (const trusted of [[], ['192.0.2.20'], ['127.0.0.1']]) {
    // Probe Express's request interpretation with exactly the setting used by our app.
    const configured = createApp({} as Database, () => {}, undefined, undefined, trusted);
    const probe = express();
    probe.set('trust proxy', configured.get('trust proxy'));
    probe.get('/', (req, res) => { res.json({ ip: req.ip, protocol: req.protocol }); });
    const server = probe.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/`, { headers: { 'X-Forwarded-For': '198.51.100.66, 203.0.113.20', 'X-Forwarded-Proto': 'https' } });
      const result = await response.json() as { ip: string; protocol: string };
      assert.deepEqual(result, trusted.includes('127.0.0.1') ? { ip: '203.0.113.20', protocol: 'https' } : { ip: '127.0.0.1', protocol: 'http' });
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  }
});
