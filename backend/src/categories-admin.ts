import { queryChoice } from './list-query.ts';
import { Router } from 'express';
import { lockTransaction, type Database } from './db/database.ts';
import { requireAdmin } from './auth/admin-access.ts';
import { ApiError } from './auth/service.ts';
import type { AuthOptions } from './auth/router.ts';

const invalid = () => new ApiError(422, 'INVALID_CATEGORY', 'Mã danh mục dùng chữ thường, số và dấu gạch nối (tối đa 200 ký tự); tên từ 1 đến 120 ký tự.');
function categoryId(value: unknown) {
  if (typeof value !== 'string' || value.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw invalid();
  return value;
}
function categoryName(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw invalid();
  return value.trim();
}
export function categoryManagement(db: Database) {
  return {
    async list(token: string | undefined, query: Record<string, unknown>) {
      const sort = queryChoice(query.sort, { name_asc: 'c.name,c.id', name_desc: 'c.name DESC,c.id' }, 'name_asc');
      const usage = queryChoice(query.usage, { all: '', used: ' AND EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id)', empty: ' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id)' }, 'all');
      const q = query.q ?? '', page = Number(query.page ?? 1);
      if (typeof q !== 'string' || q.length > 120 || !Number.isInteger(page) || page < 1 || page > 10000) throw new ApiError(422, 'INVALID_QUERY', 'Bộ lọc danh mục không hợp lệ.');
      return db.transaction(async (tx) => {
        await requireAdmin(tx, token);
        const where = "WHERE (@arg1='' OR CHARINDEX(@arg1,c.id)>0 OR CHARINDEX(@arg1,c.name)>0)" + usage;
        const total = Number((await tx.query<{ total: number }>(`SELECT COUNT(*) AS total FROM categories c ${where}`, [q.trim()])).rows[0]!.total);
        const currentPage = Math.min(page, Math.max(1, Math.ceil(total / 20)));
        const items = (await tx.query(`SELECT c.id,c.name,CONVERT(varchar(16),CAST(c.version AS binary(8)),2) AS revision,
          (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS productCount FROM categories c ${where}
          ORDER BY ${sort} OFFSET @arg2 ROWS FETCH NEXT 20 ROWS ONLY`, [q.trim(), (currentPage - 1) * 20])).rows;
        return { items, total, page: currentPage, pageSize: 20 };
      });
    },
    async write(token: string | undefined, operation: 'create' | 'update' | 'delete', id: string, value: unknown) {
      categoryId(id);
      if (!value || typeof value !== 'object') throw invalid();
      const body = value as Record<string, unknown>, name = operation === 'delete' ? '' : categoryName(body.name);
      if (operation !== 'create' && (typeof body.revision !== 'string' || !/^[a-f0-9]{16}$/i.test(body.revision))) throw new ApiError(422, 'INVALID_REVISION', 'Thiếu phiên bản danh mục. Hãy tải lại danh sách.');
      return db.transaction(async (tx) => {
        await requireAdmin(tx, token);
        await lockTransaction(tx, 'catalog:categories');
        const row = (await tx.query<{ revision: string }>('SELECT CONVERT(varchar(16),CAST(version AS binary(8)),2) AS revision FROM categories WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1', [id])).rows[0];
        if (operation === 'create' && row) throw new ApiError(409, 'CATEGORY_EXISTS', 'Mã danh mục đã tồn tại.');
        if (operation !== 'create' && !row) throw new ApiError(404, 'NOT_FOUND', 'Danh mục không còn tồn tại.');
        if (operation !== 'create' && row!.revision !== String(body.revision).toUpperCase()) throw new ApiError(409, 'STALE_CATEGORY', 'Danh mục đã thay đổi. Hãy tải lại trước khi thao tác.');
        if (operation === 'delete') {
          if ((await tx.query('SELECT TOP (1) id FROM products WHERE category_id=@arg1', [id])).rows.length) throw new ApiError(409, 'CATEGORY_IN_USE', 'Không thể xóa danh mục đang có sản phẩm, kể cả sản phẩm đã ẩn.');
          await tx.query('DELETE FROM categories WHERE id=@arg1', [id]);
          return null;
        }
        if ((await tx.query('SELECT id FROM categories WHERE normalized_name=LOWER(TRIM(@arg1)) AND id<>@arg2', [name, id])).rows.length) throw new ApiError(409, 'CATEGORY_NAME_EXISTS', 'Tên danh mục đã tồn tại.');
        if (operation === 'create') await tx.query('INSERT INTO categories(id,name) VALUES (@arg1,@arg2)', [id, name]);
        else await tx.query('UPDATE categories SET name=@arg1 WHERE id=@arg2', [name, id]);
        return (await tx.query('SELECT id,name,CONVERT(varchar(16),CAST(version AS binary(8)),2) AS revision FROM categories WHERE id=@arg1', [id])).rows[0];
      });
    },
  };
}
export function categoriesAdminRouter(db: Database, options: AuthOptions) {
  const router = Router(), service = categoryManagement(db), cookie = `${options.secure ? '__Host-' : ''}aura_admin`;
  const token = (raw?: string) => raw?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookie}=`))?.slice(cookie.length + 1);
  router.get('/admin/categories', async (req, res) => { res.json(await service.list(token(req.headers.cookie), req.query)); });
  router.use('/admin/categories', (req, _res, next) => {
    if (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1' || !req.is('application/json')) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    next();
  });
  router.post('/admin/categories', async (req, res) => { res.status(201).json(await service.write(token(req.headers.cookie), 'create', categoryId(req.body?.id), req.body)); });
  router.put('/admin/categories/:id', async (req, res) => { res.json(await service.write(token(req.headers.cookie), 'update', req.params.id, req.body)); });
  router.post('/admin/categories/:id/delete', async (req, res) => { await service.write(token(req.headers.cookie), 'delete', req.params.id, req.body); res.status(204).end(); });
  return router;
}
