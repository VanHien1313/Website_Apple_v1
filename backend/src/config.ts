import type { DatabaseConfig } from './db/database.ts';
import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.NODE_ENV ?? 'development';
  const trustedProxyIps = env.TRUST_PROXY_IPS ? env.TRUST_PROXY_IPS.split(',').map(value => value.trim()) : [];
  if (trustedProxyIps.length > 16 || trustedProxyIps.some(value => !isIP(value))) throw new Error('TRUST_PROXY_IPS requires explicit IP addresses');
  if (env.SERVE_FRONTEND !== undefined && !['true', 'false'].includes(env.SERVE_FRONTEND)) throw new Error('Invalid SERVE_FRONTEND');
  if (!['development','test','production'].includes(mode)) throw new Error('Invalid NODE_ENV');
  const port = Number(env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (!env.DB_SERVER || !env.DB_DATABASE || !/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(env.DB_DATABASE)) throw new Error('DB_SERVER and valid DB_DATABASE are required');
  const authentication = env.DB_AUTH ?? 'sql';
  let password = env.DB_PASSWORD;
  if (env.DB_PASSWORD_FILE) {
    if (password) throw new Error('Choose DB_PASSWORD or DB_PASSWORD_FILE');
    password = readFileSync(env.DB_PASSWORD_FILE, 'utf8').replace(/\r?\n$/, '');
    if (!password || password.length > 4096) throw new Error('Invalid database password file');
  }
  if (authentication !== 'sql' && authentication !== 'windows') throw new Error('Invalid DB_AUTH');
  if (authentication === 'sql' && (!env.DB_USER || !password)) throw new Error('DB_USER and database password are required');
  for (const key of ['DB_ENCRYPT','DB_TRUST_SERVER_CERTIFICATE']) if (env[key] && !['true','false'].includes(env[key]!)) throw new Error('Invalid database TLS setting');
  const dbPort = env.DB_PORT ? Number(env.DB_PORT) : undefined;
  if (dbPort !== undefined && (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535)) throw new Error('Invalid DB_PORT');
  const encrypt = env.DB_ENCRYPT !== 'false', trustServerCertificate = env.DB_TRUST_SERVER_CERTIFICATE === 'true';
  if (mode === 'production' && (!encrypt || trustServerCertificate)) throw new Error('Production requires verified database TLS');
  const origin = env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
  let appUrl: URL; try { appUrl = new URL(origin); } catch { throw new Error('Invalid APP_ORIGIN'); }
  if (appUrl.origin !== origin || !['http:','https:'].includes(appUrl.protocol) || (mode === 'production' && appUrl.protocol !== 'https:')) throw new Error('Invalid APP_ORIGIN');
  const database: DatabaseConfig = { server: env.DB_SERVER, database: env.DB_DATABASE, authentication, user: env.DB_USER, password, port: dbPort, encrypt, trustServerCertificate };
  return { mode, trustedProxyIps, serveFrontend: env.SERVE_FRONTEND === 'true', host: env.HOST ?? '127.0.0.1', port, database, auth: { origin, secure: appUrl.protocol === 'https:' } };
}
