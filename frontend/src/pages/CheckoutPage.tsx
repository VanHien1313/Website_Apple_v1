import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { useCartQuote } from '../hooks/useCartQuote';
import { validateCheckout } from '../domain/checkout';
import { orderService } from '../services/orderService';
import type { CreateOrderInput, ShippingMethod } from '../types/order';
import { Button } from '../components/common/Button';
import { Input, Radio, Checkbox } from '../components/common/FormControls';
import { Alert } from '../components/common/Alert';
import { EmptyState } from '../components/common/EmptyState';
import { AsyncState } from '../components/common/AsyncState';
import { CheckoutSummary } from '../components/checkout/CheckoutSummary';
import { customerService } from '../services/customerService';
const initialFields = { fullName: '', phone: '', email: '', address: '', province: '', ward: '', notes: '' };
export function CheckoutPage() {
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const [account] = useState(() => customerService.current());
  const [fields, setFields] = useState(() => ({ ...initialFields, fullName: account?.fullName || '', phone: account?.phone || '', email: account?.email || '' }));
  const [shipping, setShipping] = useState<ShippingMethod>('standard');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedQuote, setAcceptedQuote] = useState('');
  const request = useRef<AbortController | null>(null);
  const attempt = useRef({ fingerprint: '', id: '' });
  const formRef = useRef<HTMLFormElement>(null);
  const quote = useCartQuote(items, shipping);
  useEffect(() => () => request.current?.abort(), []);
  const changed = Boolean(quote.data?.items.some((line, index) => line.variant.price !== items[index]?.variant.price));
  const quoteSignature = JSON.stringify([quote.data?.items.map((item) => [item.id, item.variant.price, item.quantity]), quote.data?.grandTotal]);
  const blocked = !quote.data || quote.loading || Boolean(quote.error) || Boolean(quote.data.issues.length) || (changed && acceptedQuote !== quoteSignature);
  function field(name: keyof typeof initialFields) {
    return { id: `checkout-${name}`, name, value: fields[name], error: errors[name], onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setFields((previous) => ({ ...previous, [name]: event.target.value }));
      setErrors((previous) => ({ ...previous, [name]: '' }));
    } };
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current || blocked || !quote.data) return;
    const input: CreateOrderInput = {
      ...(account ? { customerId: account.id } : {}),
      customer: { fullName: fields.fullName.trim(), phone: fields.phone.trim(), ...(fields.email.trim() ? { email: fields.email.trim() } : {}) },
      shippingAddress: { address: fields.address.trim(), province: fields.province.trim(), ward: fields.ward.trim(), district: '', notes: fields.notes.trim() },
      shippingMethod: shipping, paymentMethod: 'cod', expectedTotal: quote.data.grandTotal,
      items: items.map((item) => ({ productId: item.product.id, variantId: item.variant.id, colorId: item.color.id, quantity: item.quantity })),
    };
    const validation = validateCheckout(input);
    setErrors(validation);
    if (Object.keys(validation).length) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${Object.keys(validation)[0]}"]`)?.focus();
      return;
    }
    const fingerprint = JSON.stringify(input);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    const controller = new AbortController();
    request.current = controller;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await orderService.createOrder({ ...input, requestId: attempt.current.id }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      clearCart();
      navigate(`/order-confirmation/${order.id}`, { replace: true });
    } catch (error) {
      if (!controller.signal.aborted) setSubmitError(error instanceof Error ? error.message : 'Không tạo được đơn. Vui lòng thử lại.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }
  if (!items.length) return <div className="ui-container py-12"><h1 className="sr-only">Đặt hàng</h1><EmptyState title="Chưa có sản phẩm để đặt hàng" description="Thêm sản phẩm vào giỏ trước khi nhập thông tin nhận hàng." actionLabel="Khám phá sản phẩm" onAction={() => navigate('/search')} /></div>;
  return <div className="ui-container py-8 sm:py-12"><Link to="/cart" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent">← Quay lại giỏ hàng</Link><h1 className="ui-page-title mt-4">Hoàn tất lựa chọn của bạn.</h1><p className="mt-4 text-sm text-secondary">Đặt hàng nhanh, không cần tài khoản. Những trường có dấu * là bắt buộc.</p>
    <div className="my-7"><Alert title="Đặt hàng mô phỏng">Hãy dùng thông tin mẫu. Đơn demo được lưu trên trình duyệt này để xem lại; chưa gửi tới cửa hàng và không phát sinh thanh toán thực.</Alert></div>
    {account && <p className="mb-5 text-sm text-accent">Đơn sẽ gắn với hồ sơ {account.fullName}. Thông tin người nhận có thể chỉnh riêng cho đơn này.</p>}<form ref={formRef} onSubmit={submit} noValidate className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <fieldset disabled={submitting} className="min-w-0 space-y-6">
        <section className="ui-panel space-y-5 p-5 sm:p-7"><h2 className="text-lg font-bold">01. Người nhận</h2><Input {...field('fullName')} label="Họ và tên" autoComplete="name" required maxLength={120} placeholder="Nguyễn Minh An" /><div className="grid gap-5 sm:grid-cols-2"><Input {...field('phone')} label="Số điện thoại" type="tel" autoComplete="tel" required placeholder="0901 234 567" /><Input {...field('email')} label="Email (không bắt buộc)" type="email" autoComplete="email" placeholder="ban@example.com" hint="Có thể để trống khi đặt hàng nhanh." /></div></section>
        <section className="ui-panel space-y-5 p-5 sm:p-7"><h2 className="text-lg font-bold">02. Địa chỉ nhận hàng</h2><div className="grid gap-5 sm:grid-cols-2"><Input {...field('province')} label="Tỉnh / thành phố" autoComplete="address-level1" required placeholder="Thành phố Hồ Chí Minh" /><Input {...field('ward')} label="Phường / xã" autoComplete="address-level2" required placeholder="Tên phường hoặc xã" /></div><Input {...field('address')} label="Số nhà, đường và địa chỉ chi tiết" autoComplete="street-address" required maxLength={300} placeholder="12 đường số 3, tòa nhà A…" /><Input {...field('notes')} label="Ghi chú (không bắt buộc)" maxLength={500} placeholder="Hướng dẫn tìm địa chỉ, thời gian thuận tiện…" /></section>
        <section className="ui-panel space-y-4 p-5 sm:p-7"><h2 className="text-lg font-bold">03. Giao hàng</h2><Radio name="shipping" value="standard" checked={shipping === 'standard'} onChange={() => setShipping('standard')} label="Tiêu chuẩn — miễn phí trên 10 triệu đồng, còn lại 50.000 ₫" /><Radio name="shipping" value="express" checked={shipping === 'express'} onChange={() => setShipping('express')} label="Giao nhanh — 50.000 ₫" /><p className="text-xs leading-6 text-secondary">Phí là chính sách mẫu để kiểm tra tổng tiền. Chưa cam kết thời gian giao hàng thực.</p></section>
        <section className="ui-panel space-y-4 p-5 sm:p-7"><h2 className="text-lg font-bold">04. Thanh toán</h2><Radio name="payment" value="cod" defaultChecked label="Thanh toán khi nhận hàng (COD)" /><Radio name="payment" value="online" disabled label="VNPay / MoMo — chưa tích hợp" /><p className="text-xs leading-6 text-secondary">Đơn mới có trạng thái chờ xác nhận và chưa thanh toán.</p></section>
      </fieldset>
      <aside className="ui-panel space-y-5 p-5 sm:p-7 lg:sticky lg:top-40"><h2 className="text-lg font-bold">Đơn hàng của bạn</h2>
        {quote.loading || quote.error ? <AsyncState error={quote.error} onRetry={quote.retry} /> : quote.data && <CheckoutSummary items={quote.data.items} subtotal={quote.data.subtotal} shippingFee={quote.data.shippingFee} grandTotal={quote.data.grandTotal} />}
        {quote.data?.issues.map((issue) => <Alert key={issue} tone="danger" title="Sản phẩm cần kiểm tra">{issue}<Link to="/cart" className="mt-2 block underline">Quay lại giỏ hàng</Link></Alert>)}
        {changed && <Alert tone="warning" title="Giá đã được cập nhật"><Checkbox label="Tôi đồng ý với tổng tiền mới hiển thị ở trên" checked={acceptedQuote === quoteSignature} onChange={(event) => setAcceptedQuote(event.target.checked ? quoteSignature : '')} /></Alert>}
        {submitError && <Alert tone="danger" title="Chưa tạo được đơn hàng">{submitError}<Button className="mt-3" variant="outline" onClick={quote.retry}>Kiểm tra lại giá và tồn hàng</Button></Alert>}
        <Button type="submit" fullWidth loading={submitting} disabled={blocked}>Xác nhận đặt hàng demo</Button><p className="text-xs leading-6 text-secondary">Giỏ hàng chỉ được xóa sau khi đơn đã lưu thành công.</p>
      </aside>
    </form>
  </div>;
}
