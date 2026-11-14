import express, { Router } from 'express';
import type { Database } from '../db/database.ts';
import { ApiError, createAuthService } from './service.ts';
import type { AuthOptions } from './router.ts';
import { normalizeImage } from '../media.ts';

export function avatarRouter(db: Database, options: AuthOptions) {
  const router = Router(), auth = createAuthService(db);
  const name = `${options.secure ? '__Host-' : ''}aura_customer`;
  const token = (header?: string) => header?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1);
  const attempts = new Map<string, number>();
  let processing = 0;
  router.use('/auth/avatar', async (req, res, next) => {
    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) throw new ApiError(405, 'METHOD', 'Phương thức không hỗ trợ.');
    if (req.method !== 'GET' && (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1')) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    const profile = await auth.me('customer', token(req.headers.cookie));
    res.locals.customerId = profile.id;
    if (req.method !== 'GET') {
      const now = Date.now();
      for (const [key, until] of attempts) if (until <= now) attempts.delete(key);
      if (attempts.has(profile.id) || attempts.size >= 10000) throw new ApiError(429, 'RATE_LIMITED', 'Vui lòng chờ vài giây trước khi thay ảnh tiếp.');
      attempts.set(profile.id, now + 3000);
    }
    next();
  });
  router.get('/auth/avatar', async (_req, res) => {
    const row = (await db.query<{ content: Buffer }>('SELECT content FROM customer_avatars WHERE customer_id=@arg1', [res.locals.customerId])).rows[0];
    if (!row) { res.status(204).end(); return; }
    res.set({ 'Content-Type': 'image/webp', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'private, no-store' }).send(row.content);
  });
  router.put('/auth/avatar', (req, _res, next) => {
    if (!req.is(['image/png', 'image/jpeg', 'image/webp'])) throw new ApiError(415, 'IMAGE_TYPE', 'Chỉ nhận ảnh JPG, PNG hoặc WebP.');
    next();
  }, express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb', inflate: false }), async (req, res) => {
    if (processing >= 2) throw new ApiError(429, 'IMAGE_BUSY', 'Đang xử lý ảnh. Hãy thử lại.');
    processing++;
    try {
      let output;
      try { output = await normalizeImage(req.body, req.get('content-type')?.split(';')[0]?.trim(), 512); }
      catch { throw new ApiError(422, 'INVALID_IMAGE', 'Ảnh không hợp lệ. Chọn ảnh tĩnh JPG, PNG hoặc WebP tối đa 5 MB và 16 megapixel.'); }
      await db.transaction(async tx => {
        const profile = await createAuthService(tx as Database).me('customer', token(req.headers.cookie));
        await tx.query('DELETE FROM customer_avatars WITH (UPDLOCK,HOLDLOCK) WHERE customer_id=@arg1', [profile.id]);
        await tx.query('INSERT INTO customer_avatars(customer_id,content) VALUES (@arg1,@arg2)', [profile.id, output.data]);
      });
      res.status(204).end();
    } finally { processing--; }
  });
  router.delete('/auth/avatar', async (req, res) => {
    const profile = await auth.me('customer', token(req.headers.cookie));
    await db.query('DELETE FROM customer_avatars WHERE customer_id=@arg1', [profile.id]);
    res.status(204).end();
  });
  return router;
}
