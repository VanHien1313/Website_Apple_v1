import { Router } from 'express';
import type { Database, SqlClient } from '../db/database.ts';
import { ApiError } from '../auth/service.ts';
import type { AuthOptions } from '../auth/router.ts';

export interface QuoteInput { items: { skuId: string; quantity: number }[]; shippingMethod: 'standard' | 'express' }
const invalid = () => new ApiError(422, 'INVALID_CART', 'Giỏ hàng cần tối đa 50 SKU khác nhau, số lượng từ 1 đến 999 và phương thức giao hợp lệ.');
export function parseQuote(input: unknown): QuoteInput {
  if (!input || typeof input !== 'object') throw invalid();
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.items) || value.items.length > 50 || (value.shippingMethod !== 'standard' && value.shippingMethod !== 'express')) throw invalid();
  const seen = new Set<string>();
  const items = value.items.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw invalid();
    const line = raw as Record<string, unknown>;
    if (typeof line.skuId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(line.skuId)
      || typeof line.quantity !== 'number' || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 999) throw invalid();
    const skuId = line.skuId.toLowerCase();
    if (seen.has(skuId)) throw invalid(); seen.add(skuId);
    return { skuId, quantity: line.quantity };
  });
  return { items, shippingMethod: value.shippingMethod as QuoteInput['shippingMethod'] };
}
interface Row extends Record<string, unknown> {
  skuId: string; productId: string; name: string; slug: string; colorName: string; storage: string | null;
  configurationId: string; productImage: string;
  price: number; originalPrice: number; availableQuantity: number;
}
const safeMoney = (value: bigint) => {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new ApiError(422, 'TOTAL_TOO_LARGE', 'Tổng tiền vượt giới hạn. Hãy giảm số lượng.');
  return Number(value);
};
/** Read-only canonical quote; create-order must revalidate within its own inventory transaction. */
export async function quoteCart(tx: SqlClient, input: QuoteInput) {
  const rows = input.items.length ? (await tx.query<Row>(`SELECT LOWER(CONVERT(varchar(36),k.id)) AS skuId,
    LOWER(CONVERT(varchar(36),p.id)) AS productId,p.name,p.slug,c.name AS colorName,v.storage,
    LOWER(CONVERT(varchar(36),v.id)) AS configurationId,c.image AS productImage,
    k.price,k.original_price AS originalPrice,k.on_hand-k.reserved AS availableQuantity
    FROM OPENJSON(@arg1) WITH (skuId uniqueidentifier '$.skuId') wanted
    JOIN inventory_skus k ON k.id=wanted.skuId JOIN products p ON p.id=k.product_id
    JOIN variants v ON v.id=k.variant_id JOIN colors c ON c.id=k.color_id WHERE p.active=1`, [JSON.stringify(input.items)])).rows : [];
  const byId = new Map(rows.map((row) => [row.skuId, row]));
  const issues: { skuId: string; code: string; message: string }[] = [];
  let subtotal = 0n, original = 0n;
  const lines = input.items.flatMap((item) => {
    const row = byId.get(item.skuId);
    if (!row) { issues.push({ skuId: item.skuId, code: 'UNAVAILABLE', message: 'Sản phẩm đã ngừng bán hoặc cấu hình không tồn tại.' }); return []; }
    row.price = Number(row.price); row.originalPrice = Number(row.originalPrice);
    if (row.availableQuantity < item.quantity) issues.push({ skuId: item.skuId, code: 'INSUFFICIENT_STOCK', message: `${row.name}: chỉ còn ${row.availableQuantity} sản phẩm khả dụng.` });
    const amount = BigInt(row.price) * BigInt(item.quantity);
    subtotal += amount; original += BigInt(row.originalPrice) * BigInt(item.quantity);
    return [{ ...row, quantity: item.quantity, lineTotal: safeMoney(amount) }];
  });
  const shippingFee = !lines.length ? 0 : input.shippingMethod === 'express' || subtotal <= 10000000n ? 50000 : 0;
  return { lines, issues, shippingMethod: input.shippingMethod, subtotal: safeMoney(subtotal),
    totalDiscount: safeMoney(original - subtotal), shippingFee, grandTotal: safeMoney(subtotal + BigInt(shippingFee)),
    canCheckout: input.items.length > 0 && issues.length === 0 };
}
export function quoteRouter(db: Database, auth: AuthOptions) {
  const router = Router(), attempts = new Map<string, { count: number; until: number }>();
  router.post('/cart/quote', async (req, res) => {
    if (req.get('origin') !== auth.origin || req.get('x-aura-request') !== '1' || !req.is('application/json')) throw new ApiError(403, 'REQUEST_REJECTED', 'Nguồn yêu cầu không hợp lệ.');
    const now = Date.now(), key = req.ip ?? 'unknown';
    for (const [ip, rate] of attempts) if (rate.until <= now) attempts.delete(ip);
    const rate = attempts.get(key) ?? { count: 0, until: now + 60000 };
    if (rate.count >= 120 || (!attempts.has(key) && attempts.size >= 10000)) throw new ApiError(429, 'RATE_LIMITED', 'Quá nhiều yêu cầu báo giá. Hãy thử lại sau một phút.');
    rate.count++; attempts.set(key, rate);
    const input = parseQuote(req.body);
    res.json(await db.transaction((tx) => quoteCart(tx, input)));
  });
  return router;
}
