import express, { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Database } from './db/database.ts';
import { ApiError, createAuthService } from './auth/service.ts';
import type { AuthOptions } from './auth/router.ts';

const MAX_BYTES = 5 * 1024 * 1024;
export function mediaRouter(db: Database, options: AuthOptions) {
  const router = Router(), auth = createAuthService(db);
  const cookieName = `${options.secure ? '__Host-' : ''}aura_admin`;
  const token = (cookie?: string) => cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const attempts = new Map<string, { count: number; until: number }>();
  let processing = 0;
  router.post('/admin/media', async (req, res, next) => {
    if (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1') throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    const profile = await auth.me('admin', token(req.headers.cookie));
    if (!('role' in profile) || !['owner', 'editor'].includes(profile.role ?? '')) throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền tải ảnh.');
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const rate = attempts.get(profile.id) ?? { count: 0, until: now + 60000 };
    if (rate.count >= 10 || (!attempts.has(profile.id) && attempts.size >= 10000)) throw new ApiError(429, 'RATE_LIMITED', 'Tối đa 10 ảnh mỗi phút.');
    rate.count++; attempts.set(profile.id, rate);
    if (!req.is(['image/png', 'image/jpeg', 'image/webp'])) throw new ApiError(415, 'IMAGE_TYPE', 'Chỉ nhận PNG, JPEG hoặc WebP.');
    res.locals.mediaAdmin = profile.id;
    next();
  }, express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: MAX_BYTES, inflate: false }), async (req, res) => {
    if (processing >= 2) throw new ApiError(429, 'IMAGE_BUSY', 'Dịch vụ xử lý ảnh đang bận. Hãy thử lại.');
    processing++;
    try {
      let output: Awaited<ReturnType<typeof normalizeImage>>;
      try { output = await normalizeImage(req.body, req.get('content-type')?.split(';')[0]?.trim()); }
      catch { throw new ApiError(422, 'INVALID_IMAGE', 'Ảnh không hợp lệ, bị hỏng hoặc vượt giới hạn 16 megapixel.'); }
      // Recheck revocation after decoding; authorization also guards the insert transaction.
      const id = randomUUID();
      await db.transaction(async (tx) => {
        const allowed = (await tx.query(`SELECT a.id FROM admin_users a WITH (UPDLOCK,HOLDLOCK)
          JOIN sessions s WITH (UPDLOCK,HOLDLOCK) ON s.admin_id=a.id
          WHERE a.id=@arg1 AND a.active=1 AND a.role IN ('owner','editor')
          AND s.token_hash=@arg2 AND s.revoked_at IS NULL AND s.expires_at>SYSUTCDATETIME()
          AND s.credential_version=a.credential_version`, [res.locals.mediaAdmin, createHash('sha256').update(token(req.headers.cookie) ?? '').digest('hex')])).rows;
        if (!allowed.length) throw new ApiError(401, 'UNAUTHENTICATED', 'Phiên không hợp lệ hoặc đã hết hạn.');
        await tx.query('INSERT INTO media_images(id,created_by,content,width,height) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5)', [id, res.locals.mediaAdmin, output.data, output.info.width, output.info.height]);
      });
      res.status(201).json({ id, url: `/api/v1/media/${id}`, width: output.info.width, height: output.info.height, bytes: output.data.length });
    } finally { processing--; }
  });
  router.get('/media/:id', async (req, res) => {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(req.params.id)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy ảnh.');
    const row = (await db.query<{content: Buffer}>('SELECT content FROM media_images WHERE id=@arg1', [req.params.id])).rows[0];
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy ảnh.');
    res.set({ 'Content-Type': 'image/webp', 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'public, max-age=86400' }).send(row.content);
  });
  return router;
}

async function normalizeImage(body: unknown, mime?: string) {
  if (!Buffer.isBuffer(body) || !body.length || body.length > MAX_BYTES) throw new Error('size');
  // Reject active/vector formats before passing any input to the decoder.
  const format = body.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
    : body[0] === 255 && body[1] === 216 && body[2] === 255 ? 'jpeg'
    : body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : '';
  if (!format || mime !== `image/${format}`) throw new Error('format');
  const image = sharp(body, { limitInputPixels: 16000000, failOn: 'warning' });
  const metadata = await image.metadata();
  if ((metadata.pages ?? 1) !== 1 || metadata.format !== format) throw new Error('animated');
  const output = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).timeout({ seconds: 10 }).toBuffer({ resolveWithObject: true });
  if (output.data.length > MAX_BYTES) throw new Error('size');
  return output;
}
