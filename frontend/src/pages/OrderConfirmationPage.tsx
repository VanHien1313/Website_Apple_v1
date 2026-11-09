import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { Alert } from '../components/common/Alert';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';
import { STATUS_LABELS, PAYMENT_LABELS } from '../domain/orders';
export default function OrderConfirmationPage() {
  const { id = '' } = useParams();
  const load = useCallback((signal: AbortSignal) => orderService.getOrder(id, { signal }), [id]);
  const { data: order, loading, error, retry } = useAsyncResource(load);
  if (loading || error) return <AsyncState error={error} onRetry={retry} />;
  if (!order) return <div className="ui-container max-w-2xl py-16"><h1 className="ui-page-title">Không tìm thấy đơn demo</h1><p className="my-5 text-sm leading-7 text-secondary">Đơn chỉ được lưu trên trình duyệt đã tạo. Đường dẫn có thể sai hoặc dữ liệu đã bị xóa.</p><Link to="/search" className="text-sm font-semibold text-accent">Tiếp tục khám phá</Link></div>;
  return <div className="ui-container max-w-3xl space-y-7 py-12 sm:py-16"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success"><Check size={28} /></div><div><h1 className="ui-page-title">Đã lưu đơn hàng demo.</h1><p className="mt-4 text-sm text-secondary">Cảm ơn {order.customer.fullName}. Bạn có thể tải lại trang này để xem thông tin đơn.</p></div>
    <Alert title={`${STATUS_LABELS[order.status]} · ${PAYMENT_LABELS[order.paymentStatus]}`}>Đây là đơn mô phỏng. Các cập nhật của admin chỉ ghi nhận trạng thái demo, không giao hàng, thu tiền hoặc gửi email thật.</Alert>
    <section className="ui-panel p-6 sm:p-8"><div className="flex flex-wrap justify-between gap-4 border-b border-border-subtle pb-5"><div><p className="text-xs text-secondary">Mã đơn hàng</p><h2 className="mt-2 break-all text-lg font-bold">{order.orderCode}</h2></div><p className="text-xs text-secondary">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(order.createdAt))}</p></div><ul className="divide-y divide-border-subtle">{order.items.map((item, index) => <li key={`${item.variantId}-${index}`} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><div><p className="font-semibold">{item.productName}</p><p className="mt-1 text-xs text-secondary">{item.colorName} · {item.storage || 'Tiêu chuẩn'} · SL {item.quantity}</p></div><p className="font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</p></li>)}</ul><div className="mt-5"><OrderTotals subtotal={order.subtotal} shippingFee={order.shippingFee} total={order.total} /></div></section>
    <section className="ui-panel grid gap-6 p-6 sm:grid-cols-2 sm:p-8"><div><h2 className="font-bold">Thông tin nhận hàng</h2><p className="mt-3 break-words text-sm leading-7">{order.customer.fullName}<br />{order.customer.phone}<br />{[order.shippingAddress.address, order.shippingAddress.ward, order.shippingAddress.district, order.shippingAddress.province].filter(Boolean).join(', ')}</p>{order.customer.email && <p className="mt-2 break-all text-sm text-secondary">{order.customer.email}</p>}</div><div><h2 className="font-bold">Giao hàng & thanh toán</h2><p className="mt-3 text-sm leading-7">{order.shippingMethod === 'express' ? 'Giao nhanh' : 'Giao tiêu chuẩn'}<br />{order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : order.paymentMethod.toUpperCase()}</p>{order.shippingAddress.notes && <p className="mt-3 break-words text-sm text-secondary">Ghi chú: {order.shippingAddress.notes}</p>}</div></section>
    <Link to="/search" className="inline-flex min-h-12 items-center rounded-md bg-accent px-6 text-sm font-semibold text-on-accent">Tiếp tục khám phá</Link>
  </div>;
}
