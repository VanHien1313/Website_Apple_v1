import { Router } from 'express';
import type { Database } from '../db/database.ts';
import type { AuthOptions } from '../auth/router.ts';
import { ApiError } from '../auth/service.ts';
import { actor } from './management.ts';

const dayMs = 86400000;
export function parseReport(query: Record<string, unknown>) {
  const { from, to, period = 'day' } = query;
  const valid = (value: unknown): value is string => typeof value === 'string' && /^(20\d{2})-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to) || from > to || Date.parse(to) - Date.parse(from) > 366 * dayMs || !['day', 'week', 'month'].includes(String(period)) || typeof period !== 'string')
    throw new ApiError(422, 'INVALID_REPORT', 'Chọn ngày hợp lệ trong 2000–2099, tối đa 367 ngày, và nhóm theo ngày/tuần/tháng.');
  return { from, to, period: period as 'day' | 'week' | 'month' };
}
function bucket(day: string, period: string) {
  if (period === 'month') return day.slice(0, 7);
  if (period === 'day') return day;
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
const safe = (value: bigint) => {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new ApiError(422, 'REPORT_TOO_LARGE', 'Tổng báo cáo vượt giới hạn hiển thị chính xác. Hãy chọn khoảng ngày ngắn hơn.');
  return Number(value);
};
export async function revenueReport(db: Database, token: string | undefined, query: Record<string, unknown>) {
  const range = parseReport(query);
  return db.transaction(async (tx) => {
    await actor(tx, true, token);
    // completed_at remains bare in WHERE so the existing orders_revenue index can be used.
    // Vietnam has UTC+07:00 throughout the supported 2000–2099 range.
    const start = new Date(Date.parse(range.from) - 7 * 3600000).toISOString();
    const end = new Date(Date.parse(range.to) + dayMs - 7 * 3600000).toISOString();
    const daily = (await tx.query<{ day: string; count: string | number; amount: string | number }>(`SELECT CONVERT(char(10),DATEADD(hour,7,completed_at),23) AS day,
      COUNT_BIG(*) AS count,CONVERT(varchar(40),SUM(CAST(total AS decimal(38,0)))) AS amount
      FROM orders WHERE status='COMPLETED' AND payment_status='PAID'
      AND completed_at>=CONVERT(datetime2,@arg1,127) AND completed_at<CONVERT(datetime2,@arg2,127)
      GROUP BY CONVERT(char(10),DATEADD(hour,7,completed_at),23) ORDER BY day`, [start, end])).rows;
    const bins = new Map<string, { label: string; count: bigint; amount: bigint }>();
    for (let time = Date.parse(range.from); time <= Date.parse(range.to); time += dayMs) {
      const label = bucket(new Date(time).toISOString().slice(0, 10), range.period);
      if (!bins.has(label)) bins.set(label, { label, count: 0n, amount: 0n });
    }
    let total = 0n, count = 0n;
    for (const row of daily) {
      const bin = bins.get(bucket(row.day, range.period))!;
      const amount = BigInt(row.amount), quantity = BigInt(row.count);
      bin.amount += amount; bin.count += quantity; total += amount; count += quantity;
    }
    return { ...range, timeZone: 'Asia/Ho_Chi_Minh', total: safe(total), count: safe(count), average: safe(count ? (total + count / 2n) / count : 0n),
      rows: [...bins.values()].map((bin) => ({ label: bin.label, count: safe(bin.count), amount: safe(bin.amount) })) };
  });
}
export function reportsRouter(db: Database, options: AuthOptions) {
  const router = Router(), name = `${options.secure ? '__Host-' : ''}aura_admin`;
  router.get('/admin/reports/revenue', async (req, res) => {
    const token = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    res.json(await revenueReport(db, token, req.query));
  });
  return router;
}
