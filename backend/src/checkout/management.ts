import { completeReceivedOrder } from './receipt.ts';
import { queryChoice, datedSorts } from '../list-query.ts';
import { requireAdmin } from '../auth/admin-access.ts';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { lockTransaction, type Database, type SqlClient } from '../db/database.ts';
import { ApiError } from '../auth/service.ts';
import type { AuthOptions } from '../auth/router.ts';
import { customerId, readOrder } from './orders.ts';

type Actor = { id: string; name: string; kind: 'admin' | 'customer' };
type State = { id: string; customer_id: string | null; status: string; payment_status: string; revision: number; payment_method:string; receipt_status: string; delivered_at: Date | null; receipt_confirmed_at: Date | null };
const states = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const transitions: Record<string, string[]> = { PENDING: ['PROCESSING', 'CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: ['COMPLETED'] };
const missing = () => new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
const invalid = () => new ApiError(422, 'INVALID_ACTION', 'Cần thao tác hợp lệ, phiên bản đơn và ghi chú từ 1 đến 2000 ký tự.');
const checkId = (id: string) => { if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw missing(); };
export async function actor(tx: SqlClient, admin: boolean, token?: string): Promise<Actor> {
  if (!admin) {
    const id = await customerId(tx, token);
    if (!id) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để xem đơn hàng.');
    const profile = (await tx.query<{ full_name: string }>('SELECT full_name FROM customers WHERE id=@arg1', [id])).rows[0]!;
    return { id, name: profile.full_name, kind: 'customer' };
  }
  const row = await requireAdmin(tx, token);
  return { ...row, kind: 'admin' };
}
function allowed(order: State, admin: boolean) {
  const targets = admin ? transitions[order.status] ?? [] : order.status === 'PENDING' ? ['CANCELLED'] : [];
  const actions = targets.filter(target=>target==='CANCELLED'||order.payment_method==='cod'||order.payment_status==='PAID').filter((target) => target !== 'COMPLETED' || order.payment_status === 'PAID' && ['CONFIRMED','AUTO'].includes(order.receipt_status))
    .filter((target) => target !== 'CANCELLED' || order.payment_status === 'PENDING')
    .map((target) => ({ kind: 'status', target }));
  if (admin && order.payment_method==='cod' && order.status === 'DELIVERED' && ['PENDING', 'FAILED'].includes(order.payment_status)) actions.push({ kind: 'payment', target: 'PAID' });
  if (!admin && order.status === 'DELIVERED') {
    if (['WAITING','REPORTED'].includes(order.receipt_status)) actions.push({kind:'receipt',target:'CONFIRMED'});
    if (order.receipt_status === 'WAITING') actions.push({kind:'receipt',target:'REPORTED'});
  }
  return actions;
}
async function details(tx: SqlClient, state: State, admin: boolean) {
  const order = await readOrder(tx, state.id);
  const history = (await tx.query(`SELECT id,actor_name AS actor,kind,from_state AS [from],to_state AS [to],note,
    CONVERT(varchar(30),at,126)+'Z' AS at FROM order_events WHERE order_id=@arg1 ORDER BY at,id`, [state.id])).rows;
  return { ...order, receipt: { status:state.receipt_status, deliveredAt:state.delivered_at, confirmedAt:state.receipt_confirmed_at, deadline:state.delivered_at ? new Date(new Date(state.delivered_at).getTime()+7*86400000).toISOString() : null }, revision: state.revision, history, actions: allowed(state, admin) };
}
async function ownedState(tx: SqlClient, id: string, who: Actor, forUpdate = false) {
  const row = (await tx.query<State>(`SELECT id,customer_id,status,payment_status,payment_method,revision,receipt_status,delivered_at,receipt_confirmed_at FROM orders ${forUpdate ? 'WITH (UPDLOCK,HOLDLOCK)' : ''} WHERE id=@arg1`, [id])).rows[0];
  if (!row || (who.kind === 'customer' && row.customer_id?.toLowerCase() !== who.id.toLowerCase())) throw missing();
  return row;
}
export function orderManagement(db: Database) {
  return {
    async list(admin: boolean, token: string | undefined, query: Record<string, unknown>) {
      const sort = queryChoice(query.sort, { ...datedSorts, total_asc: 'total,id', total_desc: 'total DESC,id' }, 'newest');
      const page = Number(query.page ?? 1), status = query.status ?? '', q = query.q ?? '';
      if (!Number.isInteger(page) || page < 1 || page > 10000 || typeof status !== 'string' || (status && !states.includes(status)) || typeof q !== 'string' || q.length > 120) throw new ApiError(422, 'INVALID_QUERY', 'Bộ lọc đơn hàng không hợp lệ.');
      return db.transaction(async (tx) => {
        const who = await actor(tx, admin, token);
        const where = `WHERE (@arg1 IS NULL OR customer_id=@arg1) AND (@arg2='' OR status=@arg2)
          AND (@arg3='' OR CHARINDEX(@arg3,order_code)>0 OR CHARINDEX(@arg3,JSON_VALUE(customer_snapshot,'$.fullName'))>0 OR CHARINDEX(@arg3,JSON_VALUE(customer_snapshot,'$.phone'))>0)`;
        const params = [admin ? null : who.id, status, q.trim()];
        const total = Number((await tx.query<{ total: number }>(`SELECT COUNT(*) AS total FROM orders ${where}`, params)).rows[0]!.total);
        const currentPage = Math.min(page, Math.max(1, Math.ceil(total / 20)));
        const rows = (await tx.query(`SELECT id,order_code AS orderCode,JSON_VALUE(customer_snapshot,'$.fullName') AS customerName,
          status,payment_status AS paymentStatus,receipt_status AS receiptStatus,total,revision,CONVERT(varchar(30),created_at,126)+'Z' AS createdAt
          FROM orders ${where} ORDER BY ${sort} OFFSET @arg4 ROWS FETCH NEXT 20 ROWS ONLY`, [...params, (currentPage - 1) * 20])).rows;
        return { items: rows.map((row) => ({ ...row, total: Number(row.total) })), total, page: currentPage, pageSize: 20 };
      });
    },
    async get(admin: boolean, token: string | undefined, id: string) {
      checkId(id);
      return db.transaction(async (tx) => { const who = await actor(tx, admin, token); return details(tx, await ownedState(tx, id, who), admin); });
    },
    async update(admin: boolean, token: string | undefined, id: string, input: unknown) {
      checkId(id);
      if (!input || typeof input !== 'object') throw invalid();
      const { revision, kind, target, note } = input as Record<string, unknown>;
      if (!Number.isSafeInteger(revision) || Number(revision) < 0 || !['status', 'payment', 'receipt'].includes(String(kind)) || typeof target !== 'string' || typeof note !== 'string' || !note.trim() || note.trim().length > 2000) throw invalid();
      return db.transaction(async (tx) => {
        const who = await actor(tx, admin, token);
        await lockTransaction(tx, `order:${id.toLowerCase()}`);
        const order = await ownedState(tx, id, who, true);
        if (order.revision !== revision) throw new ApiError(409, 'STALE_ORDER', 'Đơn đã được cập nhật. Hãy tải lại và kiểm tra lịch sử trước khi thao tác.');
        if (!allowed(order, admin).some((action) => action.kind === kind && action.target === target)) throw new ApiError(409, 'INVALID_TRANSITION', 'Không thể thực hiện thao tác ở trạng thái hiện tại.');
        if (kind === 'receipt') {
          if(note.trim().length>1900) throw new ApiError(422,'INVALID_NOTE','Ghi chú nhận hàng tối đa 1900 ký tự.');
          await tx.query("UPDATE orders SET receipt_status=@arg1,receipt_confirmed_at=CASE WHEN @arg1='CONFIRMED' THEN SYSUTCDATETIME() ELSE NULL END,revision=revision+1 WHERE id=@arg2",[target,id]);
          await tx.query(`INSERT INTO order_events(id,order_id,actor_type,customer_id,actor_name,kind,from_state,to_state,note) VALUES (@arg1,@arg2,'customer',@arg3,@arg4,'status','DELIVERED','DELIVERED',@arg5)`,[randomUUID(),id,who.id,who.name,(target==='CONFIRMED'?'Khách xác nhận đã nhận hàng: ':'Khách báo chưa nhận được hàng — dừng tự xác nhận: ')+note.trim()]);
          await completeReceivedOrder(tx,id);
          return details(tx,await ownedState(tx,id,who),admin);
        }
        const held = (await tx.query<{ sku_id: string; quantity: number; overdue: boolean }>(`SELECT sku_id,quantity,
          CAST(CASE WHEN expires_at<=SYSUTCDATETIME() THEN 1 ELSE 0 END AS bit) AS overdue
          FROM reservations WHERE order_id=@arg1 AND status='HELD'`, [id])).rows;
        if (kind === 'status' && order.status === 'PENDING' && target !== 'CANCELLED' && order.payment_status!=='PAID' && held.some((line) => line.overdue)) throw new ApiError(409, 'HOLD_EXPIRED', 'Thời gian giữ hàng đã hết. Đơn cần được hủy và đặt lại.');
        if (kind === 'status' && ['CANCELLED', 'SHIPPED'].includes(target)) {
          const expected = (await tx.query<{ sku_id: string; quantity: number }>('SELECT sku_id,quantity FROM order_items WHERE order_id=@arg1', [id])).rows;
          if (expected.length !== held.length || expected.some((line) => !held.some((hold) => hold.sku_id.toLowerCase() === line.sku_id?.toLowerCase() && hold.quantity === line.quantity))) throw new ApiError(409, 'RESERVATION_MISMATCH', 'Tồn giữ của đơn không khớp. Cần kiểm tra dữ liệu trước khi xử lý.');
          for (const line of held.sort((a, b) => a.sku_id.toLowerCase().localeCompare(b.sku_id.toLowerCase()))) {
            await lockTransaction(tx, `inventory:${line.sku_id.toLowerCase()}`);
            const result = await tx.query(`UPDATE inventory_skus SET reserved=reserved-@arg1,${target === 'SHIPPED' ? 'on_hand=on_hand-@arg1,' : ''}revision=revision+1
              OUTPUT INSERTED.id WHERE id=@arg2 AND reserved>=@arg1 AND on_hand>=@arg1`, [line.quantity, line.sku_id]);
            if (!result.rows.length) throw new ApiError(409, 'RESERVATION_MISMATCH', 'Tồn kho không khớp với số lượng đã giữ.');
          }
          await tx.query('UPDATE reservations SET status=@arg1 WHERE order_id=@arg2 AND status=\'HELD\'', [target === 'SHIPPED' ? 'CONSUMED' : 'RELEASED', id]);
        }
        if (kind === 'payment') {
          const payments = await tx.query(`UPDATE payments SET status='PAID',paid_at=SYSUTCDATETIME() OUTPUT INSERTED.id WHERE order_id=@arg1 AND status IN ('PENDING','FAILED')`, [id]);
          if (payments.rows.length !== 1) throw new ApiError(409, 'PAYMENT_MISMATCH', 'Dữ liệu thanh toán không khớp.');
          await tx.query("UPDATE orders SET payment_status='PAID',revision=revision+1 WHERE id=@arg1", [id]);
        } else await tx.query(`UPDATE orders SET status=@arg1,revision=revision+1,delivered_at=CASE WHEN @arg1='DELIVERED' THEN SYSUTCDATETIME() ELSE delivered_at END,completed_at=CASE WHEN @arg1='COMPLETED' THEN SYSUTCDATETIME() ELSE NULL END WHERE id=@arg2`, [target, id]);
        await tx.query(`INSERT INTO order_events(id,order_id,actor_type,customer_id,admin_id,actor_name,kind,from_state,to_state,note)
          VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8,@arg9,@arg10)`,
        [randomUUID(), id, who.kind, admin ? null : who.id, admin ? who.id : null, who.name, kind as string, kind === 'status' ? order.status : order.payment_status, target, note.trim()]);
        await completeReceivedOrder(tx,id);
        return details(tx, await ownedState(tx, id, who), admin);
      });
    },
  };
}
export function orderManagementRouter(db: Database, options: AuthOptions) {
  const router = Router(), service = orderManagement(db);
  for (const admin of [false, true]) {
    const base = admin ? '/admin/orders' : '/account/orders';
    const cookie = `${options.secure ? '__Host-' : ''}aura_${admin ? 'admin' : 'customer'}`;
    const token = (raw?: string) => raw?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookie}=`))?.slice(cookie.length + 1);
    router.get(base, async (req, res) => { res.json(await service.list(admin, token(req.headers.cookie), req.query)); });
    router.get(`${base}/:id`, async (req, res) => { res.json(await service.get(admin, token(req.headers.cookie), req.params.id)); });
    router.post(`${base}/:id/actions`, async (req, res) => {
      if (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1' || !req.is('application/json')) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
      res.json(await service.update(admin, token(req.headers.cookie), req.params.id, req.body));
    });
  }
  return router;
}
