import {startWalletWorker} from './payments/service.ts';
import { readConfig } from './config.ts';
import { createDatabase } from './db/database.ts';
import { createApp } from './app.ts';
import { startExpiryWorker } from './checkout/expiry-worker.ts';
import { fileURLToPath } from 'node:url';

try {
  const config = readConfig();
  const db = createDatabase(config.database);
  let stopWallet: (() => Promise<void>) | undefined;
  let stopExpiry: (() => Promise<void>) | undefined;
  const frontendDirectory = config.serveFrontend ? fileURLToPath(new URL('../../frontend/dist-api/', import.meta.url)) : undefined;
  const server = createApp(db, undefined, config.auth, frontendDirectory, config.trustedProxyIps,config.payments).listen(config.port, config.host, () => console.log(JSON.stringify({ event: 'server_started', host: config.host, port: config.port, serveFrontend: config.serveFrontend })));
  server.once('listening', () => { stopExpiry = startExpiryWorker(db); stopWallet=startWalletWorker(db,config.payments); });
  server.on('error', () => { console.error(JSON.stringify({ event: 'server_start_failed' })); void db.close().finally(() => { process.exitCode = 1; }); });
  let stopping = false;
  const stop = () => {
    if (stopping) return; stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000); deadline.unref();
    server.close(() => { void Promise.all([stopExpiry?.(),stopWallet?.()]).finally(() => db.close()).finally(() => { clearTimeout(deadline); }); });
  };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
} catch { console.error(JSON.stringify({ event: 'invalid_configuration', message: 'Check backend .env against .env.example.' })); process.exitCode = 1; }
