import { isIP } from 'node:net';
import { X509Certificate } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';

const placeholder = value => /REPLACE|CHANGE_ME|example\.(invalid|com)|\.invalid(?:[/:]|$)/i.test(String(value ?? ''));
const sources = service => (service?.secrets ?? []).map(secret => typeof secret === 'string' ? secret : secret.source);
export function validateStaging(config) {
  const errors = [];
  const require = (ok, message) => { if (!ok) errors.push(message); };
  const app = config.services?.app, migrate = config.services?.migrate;
  if (!app || !migrate) return ['Both app and migrate services are required.'];
  require(config.name === 'aura-staging', 'Use the standalone staging Compose project.');
  require(Object.keys(config.services).sort().join(',') === 'app,migrate', 'Unexpected services: review the staging topology.');
  require(/^[^\s@]+@sha256:[a-f0-9]{64}$/.test(app.image ?? '') && !placeholder(app.image), 'App image must use a real registry reference with a SHA-256 digest.');
  require(migrate.image === app.image, 'App and migrator must use the same image.');
  require(!app.build && !migrate.build, 'Staging must use a tested image, not build on deployment.');
  for (const [name, service] of [['app', app], ['migrate', migrate]]) {
    const env = service.environment ?? {};
    require(env.NODE_ENV === 'production' && env.SERVE_FRONTEND === 'true', `${name}: production/API frontend settings required.`);
    require(env.DB_AUTH === 'sql' && env.DB_ENCRYPT === 'true' && env.DB_TRUST_SERVER_CERTIFICATE === 'false', `${name}: verified SQL TLS required.`);
    require(env.ALLOW_DEMO_SEED === 'false', `${name}: demo seed must be disabled.`);
    require(!env.DB_PASSWORD && !env.MSSQL_SA_PASSWORD, `${name}: use mounted secret files, not plaintext environment passwords.`);
    require(Boolean(env.DB_SERVER) && !placeholder(env.DB_SERVER) && !isIP(env.DB_SERVER), `${name}: use the SQL certificate DNS hostname.`);
    require(/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(env.DB_DATABASE ?? '') && !['aurastore', 'aurastoredocker', 'master', 'model', 'msdb', 'tempdb'].includes(String(env.DB_DATABASE).toLowerCase()), `${name}: use a dedicated staging database.`);
    require(Number.isInteger(Number(env.DB_PORT)) && Number(env.DB_PORT) >= 1 && Number(env.DB_PORT) <= 65535, `${name}: invalid SQL port.`);
    require(Boolean(env.DB_USER) && !/^sa$/i.test(env.DB_USER) && !placeholder(env.DB_USER), `${name}: use a dedicated SQL login.`);
    let origin;
    try { origin = new URL(env.APP_ORIGIN); } catch {}
    require(origin?.protocol === 'https:' && origin.origin === env.APP_ORIGIN && !placeholder(env.APP_ORIGIN) && !isIP(origin.hostname) && origin.hostname !== 'localhost', `${name}: replace the placeholder with the exact HTTPS origin.`);
    const ips = (env.TRUST_PROXY_IPS ?? '').split(',').map(value => value.trim());
    require(ips.length <= 16 && ips.every(value => isIP(value)), `${name}: explicit trusted proxy IPs required.`);
    require(env.NODE_EXTRA_CA_CERTS === '/run/secrets/sql_ca', `${name}: SQL CA bundle mount required.`);
    require(env.NODE_TLS_REJECT_UNAUTHORIZED !== '0', `${name}: global TLS verification cannot be disabled.`);
    require((service.secrets ?? []).every(secret => typeof secret === 'string' || !secret.target || secret.target === secret.source || secret.target === `/run/secrets/${secret.source}`), `${name}: secret mount targets must match their source names.`);
    require(service.read_only === true && service.cap_drop?.includes('ALL') && service.security_opt?.includes('no-new-privileges:true'), `${name}: container restrictions missing.`);
  }
  const a = app.environment ?? {}, m = migrate.environment ?? {};
  require(a.DB_USER !== m.DB_USER, 'Runtime and migration SQL logins must differ.');
  for (const field of ['APP_ORIGIN', 'DB_SERVER', 'DB_PORT', 'DB_DATABASE']) require(a[field] === m[field], `App and migrator disagree on ${field}.`);
  require(a.DB_PASSWORD_FILE === '/run/secrets/sql_app_password' && m.DB_PASSWORD_FILE === '/run/secrets/sql_migration_password', 'SQL password file paths do not match their service roles.');
  require(sources(app).sort().join(',') === 'sql_app_password,sql_ca', 'Runtime must receive only its password and SQL CA.');
  require(sources(migrate).sort().join(',') === 'sql_ca,sql_migration_password', 'Migrator secret mounts are incorrect.');
  require(app.ports?.length === 1 && app.ports[0].host_ip === '127.0.0.1' && Number(app.ports[0].published) === 4100 && Number(app.ports[0].target) === 4000, 'App port must be 127.0.0.1:4100:4000.');
  require(!app.network_mode && !migrate.network_mode && !(migrate.ports?.length), 'Host networking/migrator published ports are not allowed.');
  require(Number(app.deploy?.replicas) === 1, 'Only one app replica is supported by the current limiter.');
  require(migrate.profiles?.includes('tools') && migrate.command?.join(' ') === 'node backend/dist/db/cli.js migrate', 'Migrator must be an explicit tools-profile migration command.');
  for (const name of ['sql_app_password', 'sql_migration_password', 'sql_ca']) require(Boolean(config.secrets?.[name]?.file), `Missing file source for ${name}.`);
  return errors;
}

export async function validateStagingFiles(config) {
  const errors = [], passwords = [];
  for (const name of ['sql_app_password', 'sql_migration_password', 'sql_ca']) {
    try {
      const path = config.secrets?.[name]?.file;
      const info = await stat(path);
      if (!info.isFile() || info.size === 0 || info.size > (name === 'sql_ca' ? 1048576 : 4096)) throw new Error('Invalid file size');
      const value = await readFile(path, 'utf8');
      if (name !== 'sql_ca') {
        const password = value.replace(/\r?\n$/, '');
        if (password.length < 16 || password.length > 128 || /[\r\n\0]/.test(password) || placeholder(password)) throw new Error('Invalid secret');
        passwords.push(password);
      } else {
        if (/-----BEGIN .*PRIVATE KEY-----/.test(value)) throw new Error('Private key in CA file');
        const certificates = value.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
        if (!certificates?.length) throw new Error('No certificate');
        for (const pem of certificates) {
          const cert = new X509Certificate(pem), now = Date.now();
          if (!cert.ca || Date.parse(cert.validFrom) > now || Date.parse(cert.validTo) <= now) throw new Error('Invalid CA');
        }
      }
    } catch {
      // Never echo file contents, parser errors, certificates or credentials.
      errors.push(`${name}: unreadable/invalid file (password: 16-128 characters; CA: valid unexpired PEM CA certificates without private keys).`);
    }
  }
  if (passwords.length === 2 && passwords[0] === passwords[1]) errors.push('Runtime and migration passwords must differ.');
  return errors;
}
