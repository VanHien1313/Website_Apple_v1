import { Router } from 'express';
import type { Database } from '../db/database.ts';
import { ApiError, createAuthService, type Principal } from './service.ts';

export interface AuthOptions { origin: string; secure: boolean }
export function authRouter(db: Database, kind: Principal, options: AuthOptions) {
  const router = Router(), service = createAuthService(db);
  const cookieName = `${options.secure ? '__Host-' : ''}aura_${kind}`;
  const cookie = { httpOnly: true, secure: options.secure, sameSite: 'lax' as const, path: '/' };
  const token = (header?: string) => header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  // One-process limit; use a shared limiter before deploying multiple instances.
  const attempts = new Map<string, { count: number; reset: number }>();
  router.use((req, _res, next) => {
    if (req.method === 'GET') { next(); return; }
    if (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1' || !req.is('application/json')) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    const now = Date.now();
    for (const [key, value] of attempts) if (value.reset <= now) attempts.delete(key);
    const key = req.ip ?? 'unknown';
    const value = attempts.get(key) ?? { count: 0, reset: now + 60000 };
    if (value.count >= 20 || (!attempts.has(key) && attempts.size >= 10000)) throw new ApiError(429, 'RATE_LIMITED', 'Quá nhiều yêu cầu. Hãy thử lại sau một phút.');
    value.count++; attempts.set(key, value); next();
  });
  if (kind === 'customer') router.post('/register', async (req, res) => { res.status(201).json(await service.register(req.body ?? {})); });
  router.post('/login', async (req, res) => {
    const result = await service.login(kind, req.body?.email, req.body?.password, token(req.headers.cookie));
    res.cookie(cookieName, result.token, { ...cookie, maxAge: 3600000 }); res.json(result.profile);
  });
  router.get('/me', async (req, res) => { res.json(await service.me(kind, token(req.headers.cookie))); });
  router.post('/logout', async (req, res) => { await service.logout(kind, token(req.headers.cookie)); res.clearCookie(cookieName, cookie); res.status(204).end(); });
  router.put('/password', async (req, res) => {
    await service.changePassword(kind, token(req.headers.cookie), req.body?.oldPassword, req.body?.newPassword);
    res.clearCookie(cookieName, cookie); res.status(204).end();
  });
  return router;
}
