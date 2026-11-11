import { useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getOrder, readReceipt } from '../services/api/orderService';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';
import { orderLabels, paymentLabels } from '../services/api/managedOrders';
import { adoptReceiptFromHash } from '../services/api/receiptRecovery';
import { ReceiptRecoveryPanel, ReceiptRestoreForm } from '../components/checkout/ReceiptRecovery';

const statuses = orderLabels;
export default function ApiOrderConfirmationPage() {
  const { id = '' } = useParams();
  const { hash, pathname, search } = useLocation(), navigate = useNavigate();
  // Nhận token từ #receipt=… trước lần tải đầu tiên (idempotent), rồi xóa khỏi thanh địa chỉ.
  const adopted = useMemo(() => adoptReceiptFromHash(id, hash), [id, hash]);
  useEffect(() => { if (adopted) navigate(`${pathname}${search}`, { replace: true }); }, [adopted, navigate, pathname, search]);
  const load = useCallback((signal: AbortSignal) => getOrder(id, readReceipt(id), signal), [id]);
  const { data: order, loading, error, retry } = useAsyncResource(load);
  useEffect(() => { if (adopted && error) retry(); }, [adopted, error, retry]);
  return <div className="ui-container max-w-4xl py-12">
    {loading || error ? <><h1 className="ui-page-title mb-6">Thông tin đơn hàng</h1><AsyncState error={error} onRetry={retry} /><p className="mt-5 text-sm text-secondary">Đơn tài khoản cần đăng nhập đúng tài khoản. Đơn khách vãng lai cần được mở trong tab đã đặt hàng.</p><Link to="/login" className="mt-4 inline-block text-accent">Đăng nhập</Link>{error && !loading && <ReceiptRestoreForm id={id} onRestored={retry} />}</> : order && <>
      <CheckCircle2 className="mb-5 h-12 w-12 text-accent" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Aura · Đơn hàng</p><h1 className="ui-page-title mt-3">{order.status === 'CANCELLED' ? 'Đơn hàng đã hủy.' : 'Đã nhận đơn hàng của bạn.'}</h1><p className="mt-4 break-all text-sm text-secondary">Mã đơn: {order.orderCode}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2"><section className="ui-panel space-y-3 p-6"><h2 className="font-bold">Thông tin nhận hàng</h2><p>{order.customer.fullName} · {order.customer.phone}</p><p className="text-sm leading-6 text-secondary">{order.shippingAddress.address}, {order.shippingAddress.ward}, {order.shippingAddress.province}</p>{order.shippingAddress.notes && <p className="text-sm">Ghi chú: {order.shippingAddress.notes}</p>}</section><section className="ui-panel space-y-3 p-6"><h2 className="font-bold">{statuses[order.status] ?? order.status}</h2><p className="text-sm">COD · {paymentLabels[order.paymentStatus] ?? order.paymentStatus}</p><p className="text-sm text-secondary">{order.shippingMethod === 'express' ? 'Giao nhanh' : 'Giao tiêu chuẩn'}</p><p className="text-xs leading-6 text-secondary">Đơn chờ chưa thanh toán được giữ hàng tối đa 24 giờ. Lưu mã đơn để liên hệ cửa hàng.</p></section></div>
      <section className="ui-panel mt-6 space-y-5 p-6"><h2 className="text-lg font-bold">Chi tiết đơn hàng</h2><ul className="divide-y divide-border">{order.items.map((line) => <li key={line.skuId} className="flex justify-between gap-5 py-4"><div><p className="font-semibold">{line.productName}</p><p className="mt-1 text-sm text-secondary">{line.colorName} · {line.storage ?? 'Tiêu chuẩn'} · SL {line.quantity}</p></div><p className="shrink-0 text-sm font-semibold">{formatCurrency(line.totalPrice)}</p></li>)}</ul><OrderTotals subtotal={order.subtotal} shippingFee={order.shippingFee} total={order.total} /></section>
      <ReceiptRecoveryPanel id={id} /><p className="mt-5 text-xs leading-6 text-secondary">Với đơn khách vãng lai, quyền xem đơn được lưu trong phiên tab này; dùng liên kết khôi phục ở trên để mở lại sau khi đóng tab. Đường dẫn đơn thông thường không chứa khóa truy cập.</p><Link to="/search" className="mt-6 inline-flex min-h-11 items-center font-semibold text-accent">Tiếp tục khám phá →</Link>
    </>}
  </div>;
}
