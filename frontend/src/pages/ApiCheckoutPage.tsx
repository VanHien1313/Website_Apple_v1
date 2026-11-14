import {paymentNames} from '../components/payment/WalletPayment';
import { ArrowLeft, Check, UserRound, MapPin, Truck, Banknote, ShieldCheck, ArrowRight } from 'lucide-react';
import { ProductImage } from '../components/product/ProductImage';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { quoteCart } from '../services/api/quoteService';
import { clearPending, createOrder, newReceiptToken, readPending, savePending, saveReceipt, type OrderRequest } from '../services/api/orderService';
import { HttpError, request } from '../services/api/http';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/FormControls';
import { Alert } from '../components/common/Alert';
import { AsyncState } from '../components/common/AsyncState';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';

const emptyFields = { fullName: '', phone: '', email: '', province: '', ward: '', address: '', notes: '' };
interface CheckoutProfile { id: string; fullName: string; phone: string; email: string; shippingAddress?: { province: string; ward: string; address: string } }
export default function ApiCheckoutPage() {
  const location = useLocation();
  const load = useCallback(async (signal: AbortSignal) => {
    try { return await request<CheckoutProfile>('/auth/me', { signal }); }
    catch (error) { if (error instanceof HttpError && error.status === 401) return null; throw error; }
  }, []);
  const session = useAsyncResource(load);
  if (session.loading || session.error) return <AsyncState error={session.error} onRetry={session.retry} />;
  if (!session.data) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <AuthenticatedCheckout key={session.data.id} profile={session.data} />;
}
function AuthenticatedCheckout({ profile }: { profile: CheckoutProfile }) {
  const { selectedItems: items, completePurchase } = useCart(), navigate = useNavigate();
  const [params] = useSearchParams();
  const [recovery] = useState(() => { try { return { pending: readPending(), error: '' }; } catch { return { pending: null, error: 'Không truy cập được dữ liệu yêu cầu đang chờ. Hãy bật lưu trữ cho trình duyệt rồi tải lại trang.' }; } });
  const [pending, setPending] = useState(recovery.pending);
  const [fields, setFields] = useState(() => recovery.pending ? { ...recovery.pending.customer, ...recovery.pending.shippingAddress } : { ...emptyFields, fullName: profile.fullName, phone: profile.phone, email: profile.email, ...profile.shippingAddress });
  const [shipping, setShipping] = useState<'standard' | 'express'>(recovery.pending?.shippingMethod ?? (params.get('shipping') === 'express' ? 'express' : 'standard'));
  const [busy, setBusy] = useState(false), [error, setError] = useState(recovery.error);
  const [payment,setPayment]=useState<OrderRequest['paymentMethod']>(recovery.pending?.paymentMethod??'cod');
  const loadMethods=useCallback((signal:AbortSignal)=>request<{mode:string;methods:string[]}>('/payments/methods',{signal}),[]);
  const methods=useAsyncResource(loadMethods);
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
        shippingMethod: shipping, paymentMethod: payment, expectedTotal: quote.data!.grandTotal,
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
      if (result.order.status !== 'CANCELLED') completePurchase(attempt.items);
      navigate(`/order-confirmation/${result.order.id}`, { replace: true });
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) {
        navigate('/login?next=%2Fcheckout', { replace: true }); return;
      }
      // Only these definitive server rejections establish that no order was committed.
      if (cause instanceof HttpError && ['INVALID_ORDER', 'PRICE_CHANGED', 'STOCK_CHANGED', 'INVALID_QUOTE','PAYMENT_UNAVAILABLE'].includes(cause.code)) {
        try { clearPending(); setPending(null); quote.retry(); } catch { /* Recovery must remain locked if storage is unavailable. */ }
        setError(`${cause.message} Hãy xem lại thông tin và tổng tiền trước khi xác nhận lại.`);
      } else if (!sent) setError('Không lưu được dữ liệu phục hồi trong tab này. Yêu cầu chưa được gửi. Hãy bật lưu trữ trình duyệt rồi thử lại.');
      else setError(`${cause instanceof Error ? cause.message : 'Mất kết nối.'} Chưa xác định được kết quả. Thử lại yêu cầu đang chờ; không tạo đơn mới hoặc đổi tài khoản.`);
    } finally { sending.current = false; setBusy(false); }
  }
  if (pending && pending.customer.email.toLowerCase() !== profile.email.toLowerCase()) return <div className="ui-container py-12"><Alert tone="danger" title="Yêu cầu đang chờ thuộc tài khoản khác">Hãy đăng nhập lại bằng tài khoản đã bắt đầu đặt đơn để kiểm tra kết quả. Không gửi lại bằng tài khoản hiện tại.<Link to="/account" className="block py-3 underline">Đổi tài khoản</Link></Alert></div>;
  if (!items.length && !pending) return <div className="ui-container py-12"><h1 className="ui-page-title">Chưa chọn sản phẩm để đặt hàng.</h1>{error && <p role="alert" className="mt-6 text-danger">{error}</p>}<Link to="/cart" className="mt-6 inline-block text-accent">Quay lại giỏ hàng để chọn sản phẩm →</Link></div>;
  return <div className="ui-container aura-checkout">
    <Link to="/cart" className="cart-back"><ArrowLeft size={17} />Quay lại giỏ hàng</Link>
    <header className="checkout-heading"><div><p>CHỈ CÒN MỘT BƯỚC NỮA</p><h1>Hoàn tất đơn hàng<span>.</span></h1><p className="checkout-intro">Kiểm tra thông tin nhận hàng và xác nhận lựa chọn của bạn.</p></div><ol className="checkout-progress" aria-label="Tiến trình đặt hàng"><li className="is-complete"><span><Check size={14} /></span>Giỏ hàng</li><li aria-current="step"><span>2</span>Thanh toán</li><li><span>3</span>Hoàn tất</li></ol></header>
    <form onSubmit={submit} className="checkout-layout">
      <fieldset disabled={busy || Boolean(pending)} className="checkout-fields">
        <section className="checkout-card"><header className="checkout-section-heading"><span className="checkout-section-icon"><UserRound size={21} /></span><div><p>01 / THÔNG TIN LIÊN HỆ</p><h2>Người nhận hàng</h2></div></header><div className="checkout-card-body"><Input {...field('fullName')} label="Họ và tên" autoComplete="name" maxLength={120} required /><div className="grid gap-5 sm:grid-cols-2"><Input {...field('phone')} label="Số điện thoại" type="tel" autoComplete="tel" maxLength={24} required /><Input {...field('email')} label="Email tài khoản" type="email" autoComplete="email" maxLength={254} required readOnly hint="Email của tài khoản đang đăng nhập." /></div><p className="checkout-field-note">Các trường có dấu * là thông tin bắt buộc.</p></div></section>
        <section className="checkout-card"><header className="checkout-section-heading"><span className="checkout-section-icon"><MapPin size={21} /></span><div><p>02 / ĐỊA CHỈ GIAO HÀNG</p><h2>Giao đến địa chỉ của bạn</h2></div></header><div className="checkout-card-body"><div className="grid gap-5 sm:grid-cols-2"><Input {...field('province')} label="Tỉnh / thành phố" autoComplete="address-level1" maxLength={100} required /><Input {...field('ward')} label="Phường / xã" autoComplete="address-level2" maxLength={100} required /></div><Input {...field('address')} label="Số nhà, đường và địa chỉ chi tiết" autoComplete="street-address" maxLength={300} required /><Input {...field('notes')} label="Ghi chú cho đơn hàng" placeholder="Ví dụ: gọi trước khi giao hàng" maxLength={1000} hint="Không bắt buộc." /></div></section>
        <section className="checkout-card"><header className="checkout-section-heading"><span className="checkout-section-icon"><Truck size={21} /></span><div><p>03 / PHƯƠNG THỨC NHẬN HÀNG</p><h2>Giao hàng & thanh toán</h2></div></header><div className="checkout-card-body"><div className="checkout-shipping-options">
          <label className={`checkout-shipping-option ${shipping === 'standard' ? 'is-selected' : ''}`}><input type="radio" name="shipping" value="standard" checked={shipping === 'standard'} onChange={() => setShipping('standard')} /><span><strong>Giao tiêu chuẩn</strong><small>Miễn phí cho đơn trên 10 triệu đồng; các đơn còn lại 50.000 ₫.</small></span></label>
          <label className={`checkout-shipping-option ${shipping === 'express' ? 'is-selected' : ''}`}><input type="radio" name="shipping" value="express" checked={shipping === 'express'} onChange={() => setShipping('express')} /><span><strong>Giao nhanh <b>50.000 ₫</b></strong><small>Ưu tiên phương thức giao nhanh cho đơn hàng.</small></span></label>
        </div><div className="checkout-payment"><Banknote size={24}/><div><h3>Chọn phương thức thanh toán</h3><p>COD, ví điện tử hoặc QR theo từng đơn.</p></div></div><div className="checkout-shipping-options">{(['cod','momo','zalopay'] as const).map(method=>{const enabled=method==='cod'||methods.data?.methods.includes(method);return <label key={method} className={`checkout-shipping-option ${payment===method?'is-selected':''}`}><input type="radio" name="payment" value={method} checked={payment===method} disabled={!enabled} onChange={()=>setPayment(method)}/><span><strong>{paymentNames[method]}</strong><small>{method==='cod'?'Trả tiền cho đơn vị giao hàng khi nhận sản phẩm.':enabled?'Sandbox · QR được cổng thanh toán cấp cho từng đơn.':'Chưa kích hoạt — đang chờ cấu hình tài khoản thanh toán.'}</small></span></label>;})}</div>{methods.error&&<p className="text-sm text-secondary">Chưa tải được phương thức trực tuyến. Bạn vẫn có thể chọn COD.</p>}<p className="checkout-field-note">{payment==='cod'?'Chưa thu tiền ở bước này. Đơn sẽ được cửa hàng xác nhận sau khi đặt.':'Sau khi tạo đơn, bạn mở phiên thanh toán và quét QR hoặc mở ví. Chỉ xác nhận đã thanh toán khi có kết quả hợp lệ từ cổng.'}</p></div></section>
      </fieldset>
      <aside className="checkout-summary ui-panel"><header className="checkout-summary-heading"><div><h2>Đơn hàng của bạn</h2><p>{pending ? pending.items.length : items.length} cấu hình sản phẩm</p></div>{!pending && <Link to="/cart">Chỉnh sửa</Link>}</header>
        {pending ? <Alert title="Yêu cầu đang chờ kết quả"><p>Đang kiểm tra kết quả đơn hàng. Thông tin đã được giữ nguyên để tránh đặt trùng.</p><p className="mt-3 font-bold">Tổng tiền đã xác nhận: {formatCurrency(pending.expectedTotal)}</p></Alert> : quote.loading || quote.error ? <AsyncState error={quote.error} onRetry={quote.retry} /> : quote.data && <>
          <ul className="checkout-products">{quote.data.lines.map(line => { const item = items.find(item => item.variant.id.toLowerCase() === line.skuId.toLowerCase()); return <li key={line.skuId}><div className="checkout-product-photo"><ProductImage src={item?.color.image || item?.product.thumbnail || ''} fallback={item?.product.thumbnail} alt={line.name} className="aspect-square" /><span>{line.quantity}</span></div><div className="checkout-product-details"><p>{line.name}</p><small>{line.colorName} · {line.storage ?? 'Tiêu chuẩn'}</small><strong>{formatCurrency(line.lineTotal)}</strong></div></li>; })}</ul>
          {quote.data.issues.length ? <Alert tone="danger" title="Giỏ hàng cần cập nhật">{quote.data.issues.map(issue => <p key={issue.skuId}>{issue.message}</p>)}<Link to="/cart" className="underline">Chỉnh sửa giỏ hàng</Link></Alert> : <OrderTotals subtotal={quote.data.subtotal} shippingFee={quote.data.shippingFee} total={quote.data.grandTotal} />}
        </>}
        {error && <Alert tone="danger" title="Cần kiểm tra trước khi tiếp tục">{error}</Alert>}
        <Button type="submit" fullWidth loading={busy} disabled={blocked}>{pending ? 'Kiểm tra lại yêu cầu đang chờ' : payment==='cod'?'Xác nhận đặt hàng COD':'Tạo đơn và tiếp tục thanh toán'}<ArrowRight size={17} /></Button>
        <div className="checkout-assurance"><ShieldCheck size={20} /><p>Giá và tồn kho được kiểm tra lại khi bạn xác nhận đơn hàng.</p></div><p className="checkout-consent">Vui lòng kiểm tra tổng tiền trước khi xác nhận và giữ trang mở đến khi nhận được kết quả.</p>
      </aside>
    </form>
  </div>;
}
