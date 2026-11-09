import { ListOptions, listSearchParams } from '../components/admin/ListOptions';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { HttpError } from '../services/api/http';
import { actionLabel, listOrders, orderLabels, paymentLabels, readManagedOrder, updateOrder, type ManagedOrder } from '../services/api/managedOrders';
import { AsyncState } from '../components/common/AsyncState';
import { Button } from '../components/common/Button';
import { Input, Select, Checkbox } from '../components/common/FormControls';
import { Alert } from '../components/common/Alert';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';

const date = (iso: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));
function useRefreshOnFocus(retry: () => void) {
  useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') retry(); }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [retry]);
}
export default function ApiOrdersPage({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  return id ? <OrderDetail key={`${admin}:${id}`} admin={admin} id={id} /> : <OrderListing admin={admin} />;
}
function OrderListing({ admin }: { admin: boolean }) {
  const [params, setParams] = useSearchParams();
  const query = params.toString(), base = admin ? '/admin/orders' : '/account/orders';
  const load = useCallback((signal: AbortSignal) => listOrders(admin, query, signal), [admin, query]);
  const { data, loading, error, retry } = useAsyncResource(load);
  useRefreshOnFocus(retry);
  if (error instanceof HttpError && error.status === 401) return <Navigate to={admin ? '/admin/login' : '/login'} replace />;
  return <div className="ui-container py-10"><Link to={admin ? '/admin' : '/account'} className="text-sm font-semibold text-accent">← Tài khoản</Link><p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-accent">{admin ? 'Aura · Quản trị' : 'Aura · Tài khoản'}</p><h1 className="ui-page-title mt-3">{admin ? 'Quản lý đơn hàng' : 'Đơn hàng của bạn'}</h1><p className="mt-3 text-sm text-secondary">{admin ? 'Theo dõi, xử lý và kiểm tra lịch sử từng đơn.' : 'Theo dõi các đơn đã đặt bằng tài khoản này. Có thể hủy khi đơn còn chờ xác nhận.'}</p>
    <form key={query} className="ui-panel my-8 grid items-end gap-4 p-5 sm:grid-cols-[1fr_220px_auto]" onSubmit={(event) => { event.preventDefault(); setParams(listSearchParams(event.currentTarget)); }}>
      <ListOptions kind="orders" params={params} /><Input label="Tìm đơn hàng" name="q" defaultValue={params.get('q') ?? ''} maxLength={120} placeholder="Mã đơn, người nhận hoặc số điện thoại" /><Select label="Trạng thái" name="status" defaultValue={params.get('status') ?? ''}><option value="">Tất cả</option>{Object.entries(orderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Button type="submit">Lọc đơn hàng</Button>
    </form>
    {loading || error ? <AsyncState error={error} onRetry={retry} /> : data && <><div className="mb-4 flex items-center justify-between"><p className="text-sm text-secondary">{data.total} đơn hàng</p><Button variant="ghost" onClick={retry}>Tải lại danh sách</Button></div>
      {!data.items.length ? <div className="ui-panel p-8 text-secondary">Không có đơn hàng phù hợp.</div> : <ul className="space-y-4">{data.items.map((order) => <li key={order.id} className="ui-panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><Link to={`${base}/${order.id}`} className="break-all font-bold text-accent">{order.orderCode}</Link><p className="mt-2 text-sm text-secondary">{order.customerName} · {date(order.createdAt)}</p></div><p className="font-bold">{formatCurrency(order.total)}</p></div><div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-surface-subtle px-3 py-1">{orderLabels[order.status] ?? order.status}</span><span className="py-1 text-secondary">{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</span></div></li>)}</ul>}
      <nav aria-label="Phân trang đơn hàng" className="mt-6 flex items-center justify-between gap-4"><Button variant="outline" disabled={data.page <= 1} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(data.page - 1)); setParams(next); }}>Trang trước</Button><p className="text-sm">Trang {data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</p><Button variant="outline" disabled={data.page * data.pageSize >= data.total} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(data.page + 1)); setParams(next); }}>Trang sau</Button></nav>
    </>}
  </div>;
}
function OrderDetail({ admin, id }: { admin: boolean; id: string }) {
  const load = useCallback((signal: AbortSignal) => readManagedOrder(admin, id, signal), [admin, id]);
  const { data: order, loading, error, retry } = useAsyncResource(load);
  useRefreshOnFocus(retry);
  if (error instanceof HttpError && error.status === 401) return <Navigate to={admin ? '/admin/login' : '/login'} replace />;
  return <div className="ui-container max-w-5xl py-10"><Link to={admin ? '/admin/orders' : '/account/orders'} className="text-sm font-semibold text-accent">← Danh sách đơn hàng</Link><h1 className="ui-page-title mb-6 mt-6">Chi tiết đơn hàng</h1>
    {loading || error ? <AsyncState error={error} onRetry={retry} /> : order && <><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="break-all font-semibold">{order.orderCode}</p><p className="mt-2 text-sm text-secondary">{date(order.createdAt)} · {orderLabels[order.status] ?? order.status} · {paymentLabels[order.paymentStatus] ?? order.paymentStatus}</p></div><Button variant="outline" onClick={retry}>Tải lại đơn</Button></div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><section className="ui-panel space-y-5 p-6"><h2 className="text-lg font-bold">Người nhận & sản phẩm</h2><p>{order.customer.fullName} · {order.customer.phone}</p><p className="text-sm leading-6 text-secondary">{order.shippingAddress.address}, {order.shippingAddress.ward}, {order.shippingAddress.province}</p>{order.shippingAddress.notes && <p className="text-sm">Ghi chú: {order.shippingAddress.notes}</p>}<ul className="divide-y divide-border">{order.items.map((line) => <li key={line.skuId} className="py-4"><p className="font-semibold">{line.productName}</p><p className="mt-1 text-sm text-secondary">{line.colorName} · {line.storage ?? 'Tiêu chuẩn'} · SL {line.quantity}</p><p className="mt-2 text-sm font-semibold">{formatCurrency(line.totalPrice)}</p></li>)}</ul><OrderTotals subtotal={order.subtotal} shippingFee={order.shippingFee} total={order.total} /></section>
        <OrderActions key={order.revision} order={order} admin={admin} refresh={retry} />
      </div><section className="ui-panel mt-6 p-6"><h2 className="mb-5 text-lg font-bold">Lịch sử xử lý</h2><ol className="space-y-5">{order.history.map((event) => <li key={event.id} className="border-l-2 border-border pl-4"><p className="font-semibold">{(event.kind === 'status' ? orderLabels : paymentLabels)[event.to] ?? event.to}</p><p className="mt-1 text-xs text-secondary">{date(event.at)} · {event.actor}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.note}</p></li>)}</ol></section>
    </>}
  </div>;
}
function OrderActions({ order, admin, refresh }: { order: ManagedOrder; admin: boolean; refresh: () => void }) {
  const [selection, setSelection] = useState(''), [note, setNote] = useState(''), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [mustReload, setMustReload] = useState(false);
  const sending = useRef(false);
  const action = order.actions.find((value) => `${value.kind}:${value.target}` === selection);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!action || !confirmed || sending.current || mustReload) return;
    sending.current = true; setBusy(true); setError('');
    try { await updateOrder(admin, order.id, { ...action, revision: order.revision, note: note.trim() }); refresh(); }
    catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Không kết nối được dịch vụ.'} Tải lại đơn để kiểm tra kết quả; không gửi lại thao tác khi chưa kiểm tra.`); setMustReload(true); }
    finally { sending.current = false; setBusy(false); }
  }
  return <aside className="ui-panel space-y-5 p-6"><h2 className="text-lg font-bold">{admin ? 'Xử lý đơn hàng' : 'Thao tác với đơn'}</h2>{!order.actions.length ? <p className="text-sm leading-6 text-secondary">Không có thao tác khả dụng ở trạng thái này.</p> : <form onSubmit={submit} className="space-y-5"><fieldset disabled={busy || mustReload} className="space-y-5"><Select label="Thao tác" value={selection} onChange={(event) => { setSelection(event.target.value); setConfirmed(false); }}><option value="">Chọn thao tác</option>{order.actions.map((value) => <option key={`${value.kind}:${value.target}`} value={`${value.kind}:${value.target}`}>{actionLabel(value.kind, value.target)}</option>)}</Select><Input label="Ghi chú xử lý" value={note} onChange={(event) => setNote(event.target.value)} required maxLength={2000} placeholder="Lý do hoặc thông tin xác nhận" />{action && <Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} label={`Tôi xác nhận: ${actionLabel(action.kind, action.target).toLocaleLowerCase('vi')}`} />}<Button type="submit" fullWidth loading={busy} disabled={!action || !confirmed || !note.trim()} variant={action?.target === 'CANCELLED' ? 'danger' : 'primary'}>Lưu thao tác</Button></fieldset></form>}{error && <Alert tone="danger" title="Cần kiểm tra kết quả">{error}<Button className="mt-3" variant="outline" onClick={refresh}>Tải lại để kiểm tra</Button></Alert>}<p className="text-xs leading-6 text-secondary">Mỗi thao tác được lưu vào lịch sử. {admin ? 'Ghi nhận thu tiền COD chỉ thực hiện sau khi đã giao hàng; thao tác này không chuyển tiền.' : 'Hủy đơn sẽ giải phóng số lượng đang giữ.'}</p></aside>;
}
