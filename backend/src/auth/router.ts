import { randomBytes } from 'node:crypto';
import { authorizationUrl, exchangeIdentity, socialProviders, type SocialConfig } from './social-provider.ts';
import { Router } from 'express';
import type { Database } from '../db/database.ts';
import { ApiError, createAuthService, type Principal } from './service.ts';

export interface AuthOptions { origin: string; secure: boolean; social?: SocialConfig }
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
  if (kind === 'customer') {
    const checkoutPath = (value: unknown) => typeof value === 'string' && value.length <= 500 && /^\/checkout(?:\?[^\r\n]*)?$/.test(value) ? value : '';
    router.get('/social/providers', (_req, res) => res.json(socialProviders.filter(provider => options.social?.[provider])));
    for (const provider of socialProviders) {
      const callbackPath = `/api/v1/auth/social/${provider}/callback`;
      const callback = options.origin + callbackPath;
      const flowCookie = `${options.secure ? '__Host-' : ''}aura_oauth_${provider}`;

      router.post(`/social/${provider}/start`, (req, res) => {
        const config = options.social?.[provider];
        if (!config) throw new ApiError(503, 'SOCIAL_UNAVAILABLE', 'Phương thức đăng nhập chưa được cấu hình.');
        const state = randomBytes(32).toString('base64url');
        const verifier = randomBytes(32).toString('base64url');
        res.cookie(flowCookie, JSON.stringify({ state, verifier, next: checkoutPath(req.body?.next), expires: Date.now() + 600000 }), { ...cookie, maxAge: 600000 });
        res.json({ url: authorizationUrl(provider, config.clientId, callback, state, verifier) });
      });

      router.get(`/social/${provider}/callback`, async (req, res) => {
        res.set('Referrer-Policy', 'no-referrer');
        const raw = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(flowCookie + '='));
        res.clearCookie(flowCookie, cookie);
        let next = '';
        try {
          const flow = JSON.parse(decodeURIComponent(raw?.slice(flowCookie.length + 1) ?? 'null'));
          const config = options.social?.[provider];
          if (!config || !flow || typeof flow.state !== 'string' || flow.state !== req.query.state ||
              !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier) || !(flow.expires > Date.now())) throw new Error('Invalid OAuth state');
          next = checkoutPath(flow.next);
          const code = req.query.code;
          if (typeof code !== 'string' || !code || code.length > 4096) throw new Error('Missing OAuth code');
          const identity = await exchangeIdentity(provider, config, callback, code, flow.verifier);
          const result = await service.socialLogin(provider, identity, token(req.headers.cookie));
          res.cookie(cookieName, result.token, { ...cookie, maxAge: 3600000 });
          res.redirect(303, next || '/account');
        } catch (error) {
          const query = new URLSearchParams({ socialError: error instanceof ApiError && error.code === 'SOCIAL_EMAIL_EXISTS' ? 'email_exists' : 'failed' });
          if (next) query.set('next', next);
          res.redirect(303, `/login?${query}`);
        }
      });
    }
  }
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
