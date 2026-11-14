import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { request, HttpError } from '../services/api/http';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { Input, Select } from '../components/common/FormControls';
import { Button } from '../components/common/Button';
import { AsyncState } from '../components/common/AsyncState';
import { formatCurrency } from '../utils/formatters';

interface Report { from: string; to: string; period: string; timeZone: string; total: number; count: number; average: number; rows: { label: string; count: number; amount: number }[] }
function todayVietnam() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((key) => parts.find((part) => part.type === key)!.value).join('-');
}
export default function ApiReportsPage() {
  const [params, setParams] = useSearchParams();
  const [today] = useState(todayVietnam);
  const from = params.get('from') ?? `${today.slice(0, 7)}-01`, to = params.get('to') ?? today, period = params.get('period') ?? 'day';
  const query = new URLSearchParams({ from, to, period }).toString();
  const load = useCallback((signal: AbortSignal) => request<Report>(`/admin/reports/revenue?${query}`, { signal }), [query]);
  const { data, loading, error, retry } = useAsyncResource(load);
  useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') retry(); }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [retry]);
  if (error instanceof HttpError && error.status === 401) return <Navigate to="/admin/login" replace />;
  return <div className="ui-container py-10"><div className="flex flex-wrap gap-5 text-sm font-semibold text-accent"><Link to="/admin">← Tài khoản quản trị</Link><Link to="/admin/orders">Quản lý đơn hàng →</Link></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-accent">Aura · Báo cáo</p><h1 className="ui-page-title mt-3">Doanh thu cửa hàng</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-secondary">Tổng tiền đơn đã hoàn thành và đã thanh toán, gồm phí giao hàng. Đơn COD mới tự hoàn thành khi cửa hàng ghi nhận thu tiền và khách xác nhận nhận hàng (hoặc hệ thống xác nhận sau 7 ngày không có phản hồi). Tính theo ngày hoàn thành tại Việt Nam; không gồm đơn hủy, chưa thu tiền hoặc đã hoàn tiền.</p>
    <form key={`filter:${query}`} onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); setParams({ from: String(fields.get('from')), to: String(fields.get('to')), period: String(fields.get('period')) }); }} className="ui-panel my-8 grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <Input label="Từ ngày" name="from" type="date" required min="2000-01-01" max="2099-12-31" defaultValue={from} /><Input label="Đến ngày" name="to" type="date" required min="2000-01-01" max="2099-12-31" defaultValue={to} /><Select label="Nhóm theo" name="period" defaultValue={period}><option value="day">Ngày</option><option value="week">Tuần (thứ Hai)</option><option value="month">Tháng</option></Select><Button type="submit">Xem báo cáo</Button>
    </form>
    {loading ? <AsyncState /> : error ? <div role="alert" className="ui-panel space-y-4 p-6"><p className="text-danger">{error instanceof HttpError ? error.message : 'Không kết nối được báo cáo. Hãy thử lại.'}</p><Button variant="outline" onClick={retry}>Thử lại</Button></div> : data && <ReportView key={`report:${query}`} report={data} refresh={retry} />}
    <p className="mt-6 text-xs leading-6 text-secondary">Khoảng báo cáo tối đa 367 ngày. Tuần bắt đầu thứ Hai; kỳ đầu/cuối chỉ tính phần nằm trong khoảng chọn. Đây là tổng doanh thu theo trạng thái hiện tại của đơn, chưa phải lợi nhuận hoặc sổ kế toán.</p>
  </div>;
}
function ReportView({ report, refresh }: { report: Report; refresh: () => void }) {
  const [page, setPage] = useState(1), pageSize = 12;
  const rows = report.rows.slice((page - 1) * pageSize, page * pageSize);
  const peak = Math.max(1, ...report.rows.map((row) => row.amount));
  return <><div className="mb-6 grid gap-4 sm:grid-cols-3">{[['Doanh thu', formatCurrency(report.total)], ['Đơn hoàn thành đã thu tiền', String(report.count)], ['Trung bình mỗi đơn', formatCurrency(report.average)]].map(([label, value]) => <section key={label} className="ui-panel p-6"><h2 className="text-sm text-secondary">{label}</h2><p className="mt-3 break-words text-2xl font-bold tracking-tight" data-testid={label === 'Doanh thu' ? 'revenue-total' : undefined}>{value}</p></section>)}</div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-secondary">{report.from} → {report.to} · Giờ Việt Nam (UTC+7)</p><Button variant="outline" onClick={refresh}>Cập nhật báo cáo</Button></div>
    {!report.count && <p role="status" className="ui-panel mb-5 p-5 text-secondary">Chưa có đơn hoàn thành đã thu tiền trong khoảng này.</p>}
    <section className="ui-panel overflow-hidden p-5 sm:p-7"><h2 className="mb-5 text-lg font-bold">Doanh thu theo kỳ</h2><p className="mb-5 text-xs text-secondary">Thanh biểu diễn dùng cùng thang đo cho toàn khoảng; bảng hiển thị 12 kỳ mỗi trang.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Số đơn và doanh thu từng kỳ, đơn vị Việt Nam đồng</caption><thead><tr className="border-b border-border"><th scope="col" className="py-3 pr-4">Kỳ</th><th scope="col" className="px-3 py-3 text-right">Số đơn</th><th scope="col" className="py-3 pl-3 text-right">Doanh thu</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label} className="border-b border-border"><th scope="row" className="min-w-28 py-4 pr-4 font-medium">{row.label}<div aria-hidden="true" className="mt-2 h-1.5 rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-accent" style={{ width: `${row.amount / peak * 100}%` }} /></div></th><td className="px-3 py-4 text-right tabular-nums">{row.count}</td><td className="py-4 pl-3 text-right font-semibold tabular-nums">{formatCurrency(row.amount)}</td></tr>)}</tbody></table></div><nav aria-label="Phân trang báo cáo" className="mt-6 flex items-center justify-between gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Trang trước</Button><span className="text-xs">{page} / {Math.ceil(report.rows.length / pageSize)}</span><Button variant="outline" disabled={page * pageSize >= report.rows.length} onClick={() => setPage((value) => value + 1)}>Trang sau</Button></nav></section>
  </>;
}
