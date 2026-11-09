import { queryChoice, datedSorts } from './list-query.ts';
import { Router } from 'express';
import type { Database } from './db/database.ts';
import { requireAdmin } from './auth/admin-access.ts';
import { ApiError } from './auth/service.ts';
import type { AuthOptions } from './auth/router.ts';
import { guid } from './products-input.ts';
const profile = "id,email,full_name AS fullName,phone,CONVERT(varchar(30),created_at,126)+'Z' AS createdAt";
function pageNumber(value: unknown) {
  if (value !== undefined && typeof value !== 'string' && typeof value !== 'number') throw new ApiError(422, 'INVALID_QUERY', 'Trang không hợp lệ.');
  const page = Number(value ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new ApiError(422, 'INVALID_QUERY', 'Trang không hợp lệ.');
  return page;
}
export function customerManagement(db: Database) {
  return {
    async list(token: string | undefined, query: Record<string, unknown>) {
      const sort = queryChoice(query.sort, { ...datedSorts, name_asc: 'full_name,id', name_desc: 'full_name DESC,id' }, 'newest');
      const orders = queryChoice(query.orders, { all: '', placed: ' AND EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=customers.id)', none: ' AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=customers.id)' }, 'all');
      const q = query.q ?? '', page = pageNumber(query.page);
      if (typeof q !== 'string' || q.length > 120) throw new ApiError(422, 'INVALID_QUERY', 'Tìm kiếm tối đa 120 ký tự.');
      return db.transaction(async (tx) => {
        await requireAdmin(tx, token);
        const where = "WHERE (@arg1='' OR CHARINDEX(@arg1,full_name)>0 OR CHARINDEX(@arg1,email)>0 OR CHARINDEX(@arg1,phone)>0)" + orders;
        const total = Number((await tx.query<{ total: number }>(`SELECT COUNT(*) AS total FROM customers ${where}`, [q.trim()])).rows[0]!.total);
        const current = Math.min(page, Math.max(1, Math.ceil(total / 20)));
        const items = (await tx.query(`SELECT ${profile} FROM customers ${where} ORDER BY ${sort} OFFSET @arg2 ROWS FETCH NEXT 20 ROWS ONLY`, [q.trim(), (current - 1) * 20])).rows;
        return { items, total, page: current, pageSize: 20 };
      });
    },
    async get(token: string | undefined, id: string, query: Record<string, unknown>) {
      guid(id); const page = pageNumber(query.page);
      return db.transaction(async (tx) => {
        await requireAdmin(tx, token);
        const customer = (await tx.query(`SELECT ${profile} FROM customers WHERE id=@arg1`, [id])).rows[0];
        if (!customer) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng.');
        // Link exclusively by authenticated account ID, never by checkout snapshot email/phone.
        const total = Number((await tx.query<{ total: number }>('SELECT COUNT(*) AS total FROM orders WHERE customer_id=@arg1', [id])).rows[0]!.total);
        const current = Math.min(page, Math.max(1, Math.ceil(total / 20)));
        const orders = (await tx.query<Record<string, unknown> & { id: string }>(`SELECT id,order_code AS orderCode,status,payment_status AS paymentStatus,total,CONVERT(varchar(30),created_at,126)+'Z' AS createdAt
          FROM orders WHERE customer_id=@arg1 ORDER BY created_at DESC,id OFFSET @arg2 ROWS FETCH NEXT 20 ROWS ONLY`, [id, (current - 1) * 20])).rows;
        return { customer, orders: { items: orders.map((row) => ({ ...row, total: Number(row.total) })), total, page: current, pageSize: 20 } };
      });
    },
  };
}
export function customersAdminRouter(db: Database, options: AuthOptions) {
  const router = Router(), service = customerManagement(db), cookieName = `${options.secure ? '__Host-' : ''}aura_admin`;
  const token = (header?: string) => header?.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  router.get('/admin/customers', async (req, res) => { res.json(await service.list(token(req.headers.cookie), req.query)); });
  router.get('/admin/customers/:id', async (req, res) => { res.json(await service.get(token(req.headers.cookie), req.params.id, req.query)); });
  return router;
}

