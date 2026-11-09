import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { quoteCart } from '../services/api/quoteService';
import { clearPending, createOrder, newReceiptToken, readPending, savePending, saveReceipt, type OrderRequest } from '../services/api/orderService';
import { HttpError } from '../services/api/http';
import { Button } from '../components/common/Button';
import { Input, Radio } from '../components/common/FormControls';
import { Alert } from '../components/common/Alert';
import { AsyncState } from '../components/common/AsyncState';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';

const emptyFields = { fullName: '', phone: '', email: '', province: '', ward: '', address: '', notes: '' };
export default function ApiCheckoutPage() {
  const { items, clearCart } = useCart(), navigate = useNavigate();
  const [params] = useSearchParams();
  const [recovery] = useState(() => { try { return { pending: readPending(), error: '' }; } catch { return { pending: null, error: 'Không truy cập được dữ liệu yêu cầu đang chờ. Hãy bật lưu trữ cho trình duyệt rồi tải lại trang.' }; } });
  const [pending, setPending] = useState(recovery.pending);
  const [fields, setFields] = useState(() => recovery.pending ? { ...recovery.pending.customer, ...recovery.pending.shippingAddress } : emptyFields);
  const [shipping, setShipping] = useState<'standard' | 'express'>(recovery.pending?.shippingMethod ?? (params.get('shipping') === 'express' ? 'express' : 'standard'));
  const [busy, setBusy] = useState(false), [error, setError] = useState(recovery.error);
  const sending = useRef(false);
  const load = useCallback((signal: AbortSignal) => quoteCart(items, shipping, signal), [items, shipping]);
  const quote = useAsyncResource(load);
  const blocked = Boolean(recovery.error) || (!pending && (quote.loading || Boolean(quote.error) || !quote.data?.canCheckout));
  function field(name: keyof typeof emptyFields) {
    return { name, value: fields[name], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFields((previous) => ({ ...previous, [name]: event.target.value })) };
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current || blocked) return;
    sending.current = true; setBusy(true); setError('');
    let sent = false;
    try {
      const attempt: OrderRequest = pending ?? {
        requestId: crypto.randomUUID(), receiptToken: newReceiptToken(),
        items: items.map((item) => ({ skuId: item.variant.id, quantity: item.quantity })),
        shippingMethod: shipping, paymentMethod: 'cod', expectedTotal: quote.data!.grandTotal,
        expectedPrices: quote.data!.lines.map((line) => ({ skuId: line.skuId, price: line.price })),
        customer: { fullName: fields.fullName.trim(), phone: fields.phone.trim(), email: fields.email.trim() },
        shippingAddress: { province: fields.province.trim(), ward: fields.ward.trim(), address: fields.address.trim(), notes: fields.notes.trim() },
      };
      if (!pending && !/^(0|\+84)\d{9}$/.test(attempt.customer.phone.replace(/[\s.-]/g, ''))) {
        setError('Vui lòng nhập số điện thoại Việt Nam hợp lệ.'); return;
      }
      savePending(attempt); setPending(attempt);
      sent = true;
      const result = await createOrder(attempt);
      // Keep the pending request if receipt persistence fails: retry still resolves the same order.
      saveReceipt(result.order.id, attempt.receiptToken);
      clearPending();
      const sameCart = items.length === attempt.items.length && items.every((item) => attempt.items.some((line) => line.skuId.toLowerCase() === item.variant.id.toLowerCase() && line.quantity === item.quantity));
      if (sameCart && result.order.status !== 'CANCELLED') clearCart();
      navigate(`/order-confirmation/${result.order.id}`, { replace: true });
    } catch (cause) {
      // Only these definitive server rejections establish that no order was committed.
      if (cause instanceof HttpError && ['INVALID_ORDER', 'PRICE_CHANGED', 'STOCK_CHANGED', 'INVALID_QUOTE'].includes(cause.code)) {
        try { clearPending(); setPending(null); quote.retry(); } catch { /* Recovery must remain locked if storage is unavailable. */ }
        setError(`${cause.message} Hãy xem lại thông tin và tổng tiền trước khi xác nhận lại.`);
      } else if (!sent) setError('Không lưu được dữ liệu phục hồi trong tab này. Yêu cầu chưa được gửi. Hãy bật lưu trữ trình duyệt rồi thử lại.');
      else setError(`${cause instanceof Error ? cause.message : 'Mất kết nối.'} Chưa xác định được kết quả. Thử lại yêu cầu đang chờ; không tạo đơn mới hoặc đổi tài khoản.`);
    } finally { sending.current = false; setBusy(false); }
  }
  if (!items.length && !pending) return <div className="ui-container py-12"><h1 className="ui-page-title">Giỏ hàng đang trống.</h1>{error && <p role="alert" className="mt-6 text-danger">{error}</p>}<Link to="/search" className="mt-6 inline-block text-accent">Khám phá sản phẩm →</Link></div>;
  return <div className="ui-container py-8 sm:py-12"><Link to="/cart" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent">← Quay lại giỏ hàng</Link><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-accent">Aura · Checkout</p><h1 className="ui-page-title mt-3">Hoàn tất lựa chọn của bạn.</h1><p className="mb-8 mt-4 max-w-xl text-sm leading-6 text-secondary">Nhập thông tin nhận hàng, kiểm tra tổng tiền và thanh toán khi nhận hàng. Những trường có dấu * là bắt buộc.</p>
    <form onSubmit={submit} className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <fieldset disabled={busy || Boolean(pending)} className="min-w-0 space-y-6">
        <section className="ui-panel space-y-5 p-5 sm:p-7"><h2 className="text-lg font-bold">01. Người nhận</h2><Input {...field('fullName')} label="Họ và tên" autoComplete="name" maxLength={120} required /><div className="grid gap-5 sm:grid-cols-2"><Input {...field('phone')} label="Số điện thoại" type="tel" autoComplete="tel" maxLength={24} required /><Input {...field('email')} label="Email (không bắt buộc)" type="email" autoComplete="email" maxLength={254} /></div></section>
        <section className="ui-panel space-y-5 p-5 sm:p-7"><h2 className="text-lg font-bold">02. Địa chỉ nhận hàng</h2><div className="grid gap-5 sm:grid-cols-2"><Input {...field('province')} label="Tỉnh / thành phố" autoComplete="address-level1" maxLength={100} required /><Input {...field('ward')} label="Phường / xã" autoComplete="address-level2" maxLength={100} required /></div><Input {...field('address')} label="Số nhà, đường và địa chỉ chi tiết" autoComplete="street-address" maxLength={300} required /><Input {...field('notes')} label="Ghi chú (không bắt buộc)" maxLength={1000} /></section>
        <section className="ui-panel space-y-4 p-5 sm:p-7"><h2 className="text-lg font-bold">03. Giao hàng & thanh toán</h2><Radio name="shipping" checked={shipping === 'standard'} onChange={() => setShipping('standard')} label="Tiêu chuẩn — miễn phí trên 10 triệu, còn lại 50.000 ₫" /><Radio name="shipping" checked={shipping === 'express'} onChange={() => setShipping('express')} label="Giao nhanh — 50.000 ₫" /><div className="border-t border-border pt-4"><p className="font-semibold">Thanh toán khi nhận hàng (COD)</p><p className="mt-2 text-sm text-secondary">Đơn mới chờ cửa hàng xác nhận. Chưa thu tiền khi đặt hàng.</p></div></section>
      </fieldset>
      <aside className="ui-panel space-y-5 p-5 sm:p-7 lg:sticky lg:top-40"><h2 className="text-lg font-bold">Đơn hàng của bạn</h2>
        {pending ? <Alert title="Yêu cầu đang chờ kết quả"><p>Thông tin đã được giữ nguyên để kiểm tra lại an toàn, kể cả sau khi tải lại trang.</p><p className="mt-3 font-bold">Tổng tiền đã xác nhận: {formatCurrency(pending.expectedTotal)}</p></Alert> : quote.loading || quote.error ? <AsyncState error={quote.error} onRetry={quote.retry} /> : quote.data && <>
          <ul className="divide-y divide-border">{quote.data.lines.map((line) => <li key={line.skuId} className="py-4"><p className="font-semibold">{line.name}</p><p className="mt-1 text-sm text-secondary">{line.colorName} · {line.storage ?? 'Tiêu chuẩn'} · SL {line.quantity}</p><p className="mt-2 text-sm font-semibold">{formatCurrency(line.lineTotal)}</p></li>)}</ul>
          {quote.data.issues.length ? <Alert tone="danger" title="Giỏ hàng cần cập nhật">{quote.data.issues.map((issue) => <p key={issue.skuId}>{issue.message}</p>)}<Link to="/cart" className="underline">Chỉnh sửa giỏ hàng</Link></Alert> : <OrderTotals subtotal={quote.data.subtotal} shippingFee={quote.data.shippingFee} total={quote.data.grandTotal} />}
        </>}
        {error && <Alert tone="danger" title="Cần kiểm tra trước khi tiếp tục">{error}</Alert>}
        <Button type="submit" fullWidth loading={busy} disabled={blocked}>{pending ? 'Kiểm tra lại yêu cầu đang chờ' : 'Xác nhận đặt hàng COD'}</Button>
        <p className="text-xs leading-6 text-secondary">Bấm xác nhận đồng nghĩa với đồng ý tổng tiền hiển thị. Giá và tồn được kiểm tra lại khi tạo đơn. Dữ liệu phục hồi đơn chỉ lưu trong phiên tab này; giữ tab mở đến khi biết kết quả.</p>
      </aside>
    </form>
  </div>;
}
