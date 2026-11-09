import express from 'express';
import { randomUUID } from 'node:crypto';
import type { Database } from './db/database.ts';
import { assertSchemaReady } from './db/migrate.ts';
import { catalogRouter } from './catalog.ts';
import { authRouter, type AuthOptions } from './auth/router.ts';
import { ApiError } from './auth/service.ts';
import { mediaRouter } from './media.ts';
import { quoteRouter } from './checkout/quote.ts';
import { ordersRouter } from './checkout/orders.ts';
import { orderManagementRouter } from './checkout/management.ts';
import { reportsRouter } from './checkout/reports.ts';
import { categoriesAdminRouter } from './categories-admin.ts';
import { productsAdminRouter } from './products-admin.ts';
import { adminUsersRouter } from './admin-users.ts';
import { customersAdminRouter } from './customers-admin.ts';
import { frontendRouter } from './frontend.ts';

export function createApp(db: Database, log: (entry: Record<string, unknown>) => void = (entry) => console.log(JSON.stringify(entry)), auth: AuthOptions = { origin: 'http://127.0.0.1:3000', secure: false }, frontendDirectory?: string, trustedProxyIps: string[] = []) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustedProxyIps.length ? trustedProxyIps : false);
  app.use((req, res, next) => {
    const id = randomUUID(), start = performance.now();
    res.locals.requestId = id;
    res.set({ 'X-Request-Id': id, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.on('finish', () => log({ event: 'http_request', requestId: id, method: req.method, status: res.statusCode, durationMs: Math.round(performance.now() - start) }));
    next();
  });
  app.get('/health/live', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/health/ready', async (_req, res) => {
    try { await assertSchemaReady(db); res.json({ status: 'ready' }); }
    catch { res.status(503).json({ error: { code: 'NOT_READY', message: 'Database chưa sẵn sàng.', requestId: res.locals.requestId } }); }
  });
  app.use('/api/v1', catalogRouter(db));
  app.use('/api/v1', mediaRouter(db, auth));
  app.use('/api/v1', productsAdminRouter(db, auth));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/v1', quoteRouter(db, auth));
  app.use('/api/v1', ordersRouter(db, auth));
  app.use('/api/v1', orderManagementRouter(db, auth));
  app.use('/api/v1', reportsRouter(db, auth));
  app.use('/api/v1', categoriesAdminRouter(db, auth));
  app.use('/api/v1', adminUsersRouter(db, auth));
  app.use('/api/v1', customersAdminRouter(db, auth));
  app.use('/api/v1/auth', authRouter(db, 'customer', auth));
  app.use('/api/v1/admin/auth', authRouter(db, 'admin', auth));
  if (frontendDirectory) app.use(frontendRouter(frontendDirectory));
  app.use((_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint.', requestId: res.locals.requestId } }); });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const parseStatus = (error as {type?: string}).type === 'entity.too.large' ? 413 : (error as {type?: string}).type === 'entity.parse.failed' ? 400 : 500;
    res.status(error instanceof ApiError ? error.status : parseStatus).json({ error: { code: error instanceof ApiError ? error.code : parseStatus < 500 ? 'INVALID_BODY' : 'INTERNAL_ERROR', message: error instanceof ApiError ? error.message : 'Chưa xử lý được yêu cầu. Hãy kiểm tra dữ liệu và thử lại.', requestId: res.locals.requestId } });
  });
  return app;
}
