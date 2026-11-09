import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { lockTransaction, type Database, type SqlClient } from '../db/database.ts';
import { ApiError } from '../auth/service.ts';
import type { AuthOptions } from '../auth/router.ts';
import { parseQuote, quoteCart } from './quote.ts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const secret = /^[a-f0-9]{64}$/;
const fail = (message = 'Thông tin đặt hàng không hợp lệ.') => new ApiError(422, 'INVALID_ORDER', message);
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail();
  return value as Record<string, unknown>;
};
function field(value: unknown, max: number, optional = false) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) throw fail();
  return value.trim();
}
export function parseOrder(value: unknown) {
  const input = record(value), quote = parseQuote(input);
  if (!quote.items.length || input.paymentMethod !== 'cod') throw fail('Cần giỏ hàng có sản phẩm và thanh toán COD.');
  if (typeof input.requestId !== 'string' || !uuid.test(input.requestId) || typeof input.receiptToken !== 'string' || !secret.test(input.receiptToken)) throw fail();
  if (!Number.isSafeInteger(input.expectedTotal) || (input.expectedTotal as number) < 0 || !Array.isArray(input.expectedPrices)) throw fail();
  const prices = new Map<string, number>();
  for (const raw of input.expectedPrices) {
    const item = record(raw);
    if (typeof item.skuId !== 'string' || !uuid.test(item.skuId) || !Number.isSafeInteger(item.price) || (item.price as number) < 0 || prices.has(item.skuId.toLowerCase())) throw fail();
    prices.set(item.skuId.toLowerCase(), item.price as number);
  }
  if (prices.size !== quote.items.length || quote.items.some((item) => !prices.has(item.skuId))) throw fail();
  const c = record(input.customer), address = record(input.shippingAddress);
  const customer = { fullName: field(c.fullName, 120), phone: field(c.phone, 24).replace(/[\s.-]/g, ''), email: field(c.email, 254, true).toLowerCase() };
  if (!/^(0|\+84)\d{9}$/.test(customer.phone) || (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))) throw fail();
  const shippingAddress = { address: field(address.address, 300), province: field(address.province, 100), district: field(address.district, 100, true), ward: field(address.ward, 100), notes: field(address.notes, 1000, true) };
  return { items: quote.items.sort((a, b) => a.skuId.localeCompare(b.skuId)), shippingMethod: quote.shippingMethod,
    paymentMethod: 'cod' as const, customer, shippingAddress, requestId: input.requestId.toLowerCase(), receiptToken: input.receiptToken,
    expectedTotal: input.expectedTotal as number, expectedPrices: [...prices].sort(([a], [b]) => a.localeCompare(b)) };
}
export type OrderInput = ReturnType<typeof parseOrder>;
export async function customerId(tx: SqlClient, token?: string) {
  if (token === undefined) return null;
  if (!secret.test(token)) throw new ApiError(401, 'UNAUTHENTICATED', 'Phiên khách hàng không hợp lệ.');
  const row = (await tx.query<{ id: string }>(`SELECT c.id FROM sessions s JOIN customers c ON c.id=s.customer_id
    WHERE s.token_hash=@arg1 AND s.revoked_at IS NULL AND s.expires_at>SYSUTCDATETIME() AND s.credential_version=c.credential_version`, [hash(token)])).rows[0];
  if (!row) throw new ApiError(401, 'UNAUTHENTICATED', 'Phiên khách hàng đã hết hạn. Hãy đăng nhập lại.');
  return row.id.toLowerCase();
}
export async function readOrder(tx: SqlClient, id: string) {
  const order = (await tx.query<Record<string, unknown> & { id: string; status: string; paymentStatus: string; total: number; customer: string; shippingAddress: string }>(`SELECT id,order_code AS orderCode,customer_snapshot AS customer,shipping_address AS shippingAddress,
    shipping_method AS shippingMethod,payment_method AS paymentMethod,status,payment_status AS paymentStatus,
    subtotal,discount,shipping_fee AS shippingFee,total,revision,CONVERT(varchar(30),created_at,126)+'Z' AS createdAt FROM orders WHERE id=@arg1`, [id])).rows[0];
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
  const items = (await tx.query<Record<string, unknown> & { productName: string }>(`SELECT sku_id AS skuId,product_id AS productId,variant_id AS configurationId,product_name AS productName,
    product_image AS productImage,color_name AS colorName,storage,quantity,unit_price AS unitPrice,total_price AS totalPrice
    FROM order_items WHERE order_id=@arg1 ORDER BY id`, [id])).rows;
  // SQL bigint is returned as a string by some drivers; expose safe VND integers consistently.
  return { ...order, subtotal: Number(order.subtotal), discount: Number(order.discount), shippingFee: Number(order.shippingFee), total: Number(order.total),
    customer: JSON.parse(String(order.customer)), shippingAddress: JSON.parse(String(order.shippingAddress)),
    items: items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice), totalPrice: Number(item.totalPrice) })) };
}
export function createOrderService(db: Database) {
  return {
    async create(value: unknown, sessionToken?: string) {
      const input = parseOrder(value);
      return db.transaction(async (tx) => {
        const owner = await customerId(tx, sessionToken);
        const scope = owner ? `customer:${owner}` : `guest:${hash(input.receiptToken)}`;
        const { receiptToken, requestId, ...content } = input;
        const fingerprint = hash(JSON.stringify(content));
        await lockTransaction(tx, `order-request:${requestId}`);
        // A retry after login/logout must not create a second order under a different scope.
        const otherScope = (await tx.query('SELECT request_id FROM idempotency_requests WITH (UPDLOCK,HOLDLOCK) WHERE request_id=@arg1 AND scope<>@arg2', [requestId, scope])).rows[0];
        if (otherScope) throw new ApiError(409, 'IDEMPOTENCY_SCOPE_CHANGED', 'Yêu cầu này đã được xử lý bằng phiên khách khác. Hãy trở về tài khoản đã đặt đơn.');
        const previous = (await tx.query<{ fingerprint: string; order_id: string }>('SELECT fingerprint,order_id FROM idempotency_requests WITH (UPDLOCK,HOLDLOCK) WHERE scope=@arg1 AND request_id=@arg2', [scope, requestId])).rows[0];
        if (previous) {
          if (previous.fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Mã yêu cầu đã được dùng cho nội dung khác.');
          return { replayed: true, order: await readOrder(tx, previous.order_id) };
        }
        // A stable SKU lock order serializes competing checkouts without a store-wide lock.
        for (const item of input.items) await lockTransaction(tx, `inventory:${item.skuId}`);
        const quote = await quoteCart(tx, input);
        if (!quote.canCheckout) throw new ApiError(409, 'STOCK_CHANGED', 'Sản phẩm hoặc tồn kho đã thay đổi. Hãy cập nhật giỏ hàng.');
        const prices = new Map(input.expectedPrices);
        if (input.expectedTotal !== quote.grandTotal || quote.lines.some((line) => prices.get(line.skuId) !== line.price)) throw new ApiError(409, 'PRICE_CHANGED', 'Giá đã thay đổi. Hãy xem lại báo giá trước khi đặt hàng.');
        const id = randomUUID(), code = `AURA-${id.toUpperCase()}`;
        await tx.query(`INSERT INTO orders(id,order_code,customer_id,customer_snapshot,shipping_address,shipping_method,subtotal,discount,shipping_fee,total,guest_receipt_hash)
          VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8,@arg9,@arg10,@arg11)`,
        [id, code, owner, JSON.stringify(input.customer), JSON.stringify(input.shippingAddress), input.shippingMethod, quote.subtotal, quote.totalDiscount, quote.shippingFee, quote.grandTotal, owner ? null : hash(receiptToken)]);
        for (const line of quote.lines) {
          const reserved = await tx.query(`UPDATE inventory_skus SET reserved=reserved+@arg1,revision=revision+1 OUTPUT INSERTED.id WHERE id=@arg2 AND on_hand-reserved>=@arg1`, [line.quantity, line.skuId]);
          if (!reserved.rows.length) throw new ApiError(409, 'STOCK_CHANGED', 'Số lượng tồn kho không còn đủ.');
          await tx.query(`INSERT INTO order_items(id,order_id,sku_id,product_id,variant_id,product_name,product_image,color_name,storage,quantity,unit_price,total_price)
            VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8,@arg9,@arg10,@arg11,@arg12)`,
          [randomUUID(), id, line.skuId, line.productId, line.configurationId, line.name, line.productImage, line.colorName, line.storage, line.quantity, line.price, line.lineTotal]);
          await tx.query(`INSERT INTO reservations(id,order_id,sku_id,quantity,expires_at,status) VALUES (@arg1,@arg2,@arg3,@arg4,DATEADD(hour,24,SYSUTCDATETIME()),'HELD')`, [randomUUID(), id, line.skuId, line.quantity]);
        }
        await tx.query("INSERT INTO payments(id,order_id,method,status,amount) VALUES (@arg1,@arg2,'cod','PENDING',@arg3)", [randomUUID(), id, quote.grandTotal]);
        await tx.query(`INSERT INTO order_events(id,order_id,actor_type,customer_id,actor_name,kind,from_state,to_state,note)
          VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,'status','','PENDING',N'Tạo đơn COD')`, [randomUUID(), id, owner ? 'customer' : 'system', owner, owner ? input.customer.fullName : 'Guest checkout']);
        await tx.query(`INSERT INTO idempotency_requests(scope,request_id,fingerprint,order_id,expires_at) VALUES (@arg1,@arg2,@arg3,@arg4,DATEADD(day,30,SYSUTCDATETIME()))`, [scope, requestId, fingerprint, id]);
        return { replayed: false, order: await readOrder(tx, id) };
      });
    },
    async get(id: string, sessionToken?: string, receiptToken?: string) {
      if (!uuid.test(id)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
      return db.transaction(async (tx) => {
        const owner = await customerId(tx, sessionToken);
        const row = (await tx.query<{ customer_id: string | null; guest_receipt_hash: string | null }>('SELECT customer_id,guest_receipt_hash FROM orders WHERE id=@arg1', [id])).rows[0];
        const ownOrder = row?.customer_id && owner === row.customer_id.toLowerCase();
        const guestOrder = row && !row.customer_id && row.guest_receipt_hash && receiptToken && secret.test(receiptToken)
          && timingSafeEqual(Buffer.from(row.guest_receipt_hash), Buffer.from(hash(receiptToken)));
        if (!ownOrder && !guestOrder) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
        return readOrder(tx, id);
      });
    },
  };
}

export async function expirePendingOrders(db: Database) {
  const candidates = (await db.query<{ id: string }>(`SELECT TOP (100) o.id FROM orders o WHERE o.status='PENDING' AND o.payment_status='PENDING'
    AND EXISTS(SELECT 1 FROM reservations r WHERE r.order_id=o.id AND r.status='HELD' AND r.expires_at<=SYSUTCDATETIME()) ORDER BY o.created_at,o.id`)).rows;
  let expired = 0;
  for (const { id } of candidates) expired += await db.transaction(async (tx) => {
    await lockTransaction(tx, `order:${id.toLowerCase()}`);
    const order = (await tx.query(`SELECT id FROM orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1 AND status='PENDING' AND payment_status='PENDING'`, [id])).rows[0];
    if (!order) return 0;
    const held = (await tx.query<{ sku_id: string; quantity: number; overdue: boolean }>(`SELECT sku_id,quantity,CAST(CASE WHEN expires_at<=SYSUTCDATETIME() THEN 1 ELSE 0 END AS bit) AS overdue FROM reservations WHERE order_id=@arg1 AND status='HELD' ORDER BY sku_id`, [id])).rows;
    if (!held.some((line) => line.overdue)) return 0;
    for (const line of [...held].sort((a, b) => a.sku_id.toLowerCase().localeCompare(b.sku_id.toLowerCase()))) {
      await lockTransaction(tx, `inventory:${line.sku_id.toLowerCase()}`);
      const changed = await tx.query('UPDATE inventory_skus SET reserved=reserved-@arg1,revision=revision+1 OUTPUT INSERTED.id WHERE id=@arg2 AND reserved>=@arg1', [line.quantity, line.sku_id]);
      if (!changed.rows.length) throw new Error('Reservation integrity mismatch');
    }
    await tx.query("UPDATE reservations SET status='EXPIRED' WHERE order_id=@arg1 AND status='HELD'", [id]);
    await tx.query("UPDATE orders SET status='CANCELLED',revision=revision+1 WHERE id=@arg1", [id]);
    await tx.query(`INSERT INTO order_events(id,order_id,actor_type,actor_name,kind,from_state,to_state,note)
      VALUES (@arg1,@arg2,'system','Reservation expiry','status','PENDING','CANCELLED',N'Hết hạn xác nhận đơn sau 24 giờ')`, [randomUUID(), id]);
    return 1;
  });
  return expired;
}

export function ordersRouter(db: Database, options: AuthOptions) {
  const router = Router(), service = createOrderService(db), attempts = new Map<string, { count: number; until: number }>();
  const cookieName = `${options.secure ? '__Host-' : ''}aura_customer`;
  const token = (cookie?: string) => cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  router.post('/orders', async (req, res) => {
    if (req.get('origin') !== options.origin || req.get('x-aura-request') !== '1' || !req.is('application/json')) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    const now = Date.now(), key = req.ip ?? 'unknown';
    for (const [ip, value] of attempts) if (value.until <= now) attempts.delete(ip);
    const rate = attempts.get(key) ?? { count: 0, until: now + 60000 };
    if (rate.count >= 20 || (!attempts.has(key) && attempts.size >= 10000)) throw new ApiError(429, 'RATE_LIMITED', 'Quá nhiều yêu cầu đặt hàng. Hãy thử lại sau một phút.');
    rate.count++; attempts.set(key, rate);
    const result = await service.create(req.body, token(req.headers.cookie));
    res.status(result.replayed ? 200 : 201).json(result);
  });
  router.get('/orders/:id', async (req, res) => { res.json(await service.get(req.params.id, token(req.headers.cookie), req.get('x-aura-receipt'))); });
  return router;
}
