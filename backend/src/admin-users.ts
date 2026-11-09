import { queryChoice, namedSorts } from './list-query.ts';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { lockTransaction, type Database, type SqlClient } from './db/database.ts';
import { requireAdmin } from './auth/admin-access.ts';
import { ApiError } from './auth/service.ts';
import { hashPassword, validPassword } from './auth/password.ts';
import type { AuthOptions } from './auth/router.ts';
import { guid } from './products-input.ts';
interface Admin extends Record<string, unknown> { id: string; email: string; name: string; role: 'owner' | 'editor'; active: boolean; revision: string }
const fields = 'id,email,name,role,active,CONVERT(varchar(16),CAST(version AS binary(8)),2) AS revision';
async function owner(tx: SqlClient, token?: string) {
  const actor = await requireAdmin(tx, token);
  const row = (await tx.query<{ role: string }>('SELECT role FROM admin_users WHERE id=@arg1', [actor.id])).rows[0];
  if (row?.role !== 'owner') throw new ApiError(403, 'OWNER_REQUIRED', 'Chỉ chủ cửa hàng được quản lý tài khoản quản trị.');
  return actor;
}
function input(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiError(422, 'INVALID_ACCOUNT', 'Thông tin tài khoản không hợp lệ.');
  const value = raw as Record<string, unknown>;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name || name.length > 120 || typeof value.role !== 'string' || !['owner', 'editor'].includes(value.role) || typeof value.active !== 'boolean') throw new ApiError(422, 'INVALID_ACCOUNT', 'Kiểm tra tên, vai trò và trạng thái tài khoản.');
  return { name, role: value.role as 'owner' | 'editor', active: value.active, revision: value.revision, email: value.email, password: value.password };
}
export function adminManagement(db: Database) {
  return {
    async resetPassword(token: string | undefined, id: string, raw: unknown) {
      await db.transaction((tx) => owner(tx, token));
      guid(id);
      const value = raw as Record<string, unknown> | null;
      if (!value || Array.isArray(value) || value.confirmed !== true || !validPassword(value.password)) throw new ApiError(422, 'INVALID_PASSWORD', 'Xác nhận đặt lại mật khẩu và nhập mật khẩu mới dài 12–128 ký tự.');
      if (typeof value.revision !== 'string' || !/^[a-f0-9]{16}$/i.test(value.revision)) throw new ApiError(422, 'INVALID_REVISION', 'Thiếu phiên bản tài khoản.');
      const hash = await hashPassword(value.password);
      return db.transaction(async (tx) => {
        await lockTransaction(tx, 'admin:accounts');
        const actor = await owner(tx, token);
        if (actor.id.toLowerCase() === id.toLowerCase()) throw new ApiError(409, 'SELF_PROTECTED', 'Hãy dùng chức năng đổi mật khẩu của tài khoản đang đăng nhập.');
        const old = (await tx.query<Admin>(`SELECT ${fields} FROM admin_users WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1`, [id])).rows[0];
        if (!old) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản.');
        if (old.revision !== String(value.revision).toUpperCase()) throw new ApiError(409, 'STALE_ACCOUNT', 'Tài khoản đã thay đổi. Hãy tải lại danh sách.');
        await tx.query('UPDATE admin_users SET password_hash=@arg1,credential_version=credential_version+1 WHERE id=@arg2', [hash, id]);
        await tx.query('UPDATE sessions SET revoked_at=SYSUTCDATETIME() WHERE admin_id=@arg1 AND revoked_at IS NULL', [id]);
        return (await tx.query<Admin>(`SELECT ${fields} FROM admin_users WHERE id=@arg1`, [id])).rows[0]!;
      });
    },
    async list(token: string | undefined, query: Record<string, unknown>) {
      const sort = queryChoice(query.sort, namedSorts, 'oldest');
      const role = queryChoice(query.role, { all: '', owner: " AND role='owner'", editor: " AND role='editor'" }, 'all');
      const active = queryChoice(query.active, { all: '', true: ' AND active=1', false: ' AND active=0' }, 'all');
      const q = query.q ?? '', page = Number(query.page ?? 1);
      if (typeof q !== 'string' || q.length > 120 || !Number.isInteger(page) || page < 1 || page > 10000) throw new ApiError(422, 'INVALID_QUERY', 'Bộ lọc tài khoản không hợp lệ.');
      return db.transaction(async (tx) => {
        const actor = await owner(tx, token);
        const where = "WHERE (@arg1='' OR CHARINDEX(@arg1,name)>0 OR CHARINDEX(@arg1,email)>0)" + role + active;
        const total = Number((await tx.query<{ total: number }>(`SELECT COUNT(*) AS total FROM admin_users ${where}`, [q.trim()])).rows[0]!.total);
        const current = Math.min(page, Math.max(1, Math.ceil(total / 20)));
        const items = (await tx.query<Admin>(`SELECT ${fields} FROM admin_users ${where} ORDER BY ${sort} OFFSET @arg2 ROWS FETCH NEXT 20 ROWS ONLY`, [q.trim(), (current - 1) * 20])).rows;
        return { items, total, page: current, pageSize: 20, actorId: actor.id };
      });
    },
    async create(token: string | undefined, raw: unknown) {
      // Reject unauthorized callers before the intentionally expensive password hash.
      await db.transaction((tx) => owner(tx, token));
      const value = input(raw), email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
      if (!validPassword(value.password) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(422, 'INVALID_ACCOUNT', 'Email hợp lệ và mật khẩu 12–128 ký tự là bắt buộc.');
      const hash = await hashPassword(value.password), id = randomUUID();
      return db.transaction(async (tx) => {
        await lockTransaction(tx, 'admin:accounts'); await owner(tx, token);
        if ((await tx.query('SELECT id FROM admin_users WHERE email=@arg1', [email])).rows.length) throw new ApiError(409, 'EMAIL_EXISTS', 'Email quản trị đã được sử dụng.');
        await tx.query('INSERT INTO admin_users(id,email,name,role,active,password_hash) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6)', [id, email, value.name, value.role, value.active, hash]);
        return (await tx.query<Admin>(`SELECT ${fields} FROM admin_users WHERE id=@arg1`, [id])).rows[0]!;
      });
    },
    async update(token: string | undefined, id: string, raw: unknown) {
      guid(id); const value = input(raw);
      if (typeof value.revision !== 'string' || !/^[a-f0-9]{16}$/i.test(value.revision)) throw new ApiError(422, 'INVALID_REVISION', 'Thiếu phiên bản tài khoản.');
      return db.transaction(async (tx) => {
        await lockTransaction(tx, 'admin:accounts'); const actor = await owner(tx, token);
        const old = (await tx.query<Admin>(`SELECT ${fields} FROM admin_users WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1`, [id])).rows[0];
        if (!old) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản.');
        if (old.revision !== String(value.revision).toUpperCase()) throw new ApiError(409, 'STALE_ACCOUNT', 'Tài khoản đã thay đổi. Hãy tải lại danh sách.');
        if (actor.id.toLowerCase() === id.toLowerCase() && (!value.active || value.role !== 'owner')) throw new ApiError(409, 'SELF_PROTECTED', 'Không thể tự khóa hoặc hạ quyền tài khoản đang đăng nhập.');
        const revoke = old.role !== value.role || old.active !== value.active;
        await tx.query('UPDATE admin_users SET name=@arg1,role=@arg2,active=@arg3,credential_version=credential_version+@arg4 WHERE id=@arg5', [value.name, value.role, value.active, revoke ? 1 : 0, id]);
        if (revoke) await tx.query('UPDATE sessions SET revoked_at=SYSUTCDATETIME() WHERE admin_id=@arg1 AND revoked_at IS NULL', [id]);
        return (await tx.query<Admin>(`SELECT ${fields} FROM admin_users WHERE id=@arg1`, [id])).rows[0]!;
      });
    },
  };
}
export function adminUsersRouter(db: Database, options: AuthOptions) {
  const router = Router(), service = adminManagement(db), cookieName = `${options.secure ? '__Host-' : ''}aura_admin`;
  const token = (header?: string) => header?.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  router.use('/admin/users', (req, _res, next) => {
    if (req.method !== 'GET' && (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1' || !req.is('application/json'))) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    next();
  });
  router.get('/admin/users', async (req, res) => { res.json(await service.list(token(req.headers.cookie), req.query)); });
  router.post('/admin/users', async (req, res) => { res.status(201).json(await service.create(token(req.headers.cookie), req.body)); });
  router.put('/admin/users/:id', async (req, res) => { res.json(await service.update(token(req.headers.cookie), req.params.id, req.body)); });
  router.post('/admin/users/:id/password', async (req, res) => { res.json(await service.resetPassword(token(req.headers.cookie), req.params.id, req.body)); });
  return router;
}
