import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  PackageCheck
} from 'lucide-react';
import { useCart } from '../store/CartContext';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';
import { PaymentMethod, ShippingMethod } from '../types/order';

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, grandTotal, clearCart } = useCart();
  const navigate = useNavigate();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Hà Nội');
  const [district, setDistrict] = useState('Quận Cầu Giấy');
  const [ward, setWard] = useState('Phường Dịch Vọng Hậu');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderCode: string;
    total: number;
    fullName: string;
    email: string;
  } | null>(null);

  // If cart is empty and order hasn't just succeeded, redirect back
  if (items.length === 0 && !completedOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">Giỏ hàng của bạn đang trống</h2>
        <p className="text-sm text-secondary">
          Vui lòng chọn ít nhất một sản phẩm trước khi tiến hành thanh toán.
        </p>
        <Link to="/">
          <Button size="md">Về trang chủ</Button>
        </Link>
      </div>
    );
  }

  const validate = () => {
    const err: Record<string, string> = {};
    if (!fullName.trim()) err.fullName = 'Vui lòng nhập họ và tên';
    if (!email.trim() || !email.includes('@')) err.email = 'Vui lòng nhập email hợp lệ';
    if (!phone.trim() || phone.length < 10) err.phone = 'Vui lòng nhập số điện thoại hợp lệ';
    if (!address.trim()) err.address = 'Vui lòng nhập địa chỉ nhận hàng chi tiết';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    // Simulate order placement
    setTimeout(() => {
      const generatedCode = `APL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setCompletedOrder({
        orderCode: generatedCode,
        total: grandTotal,
        fullName,
        email,
      });
      clearCart();
      setIsSubmitting(false);
    }, 800);
  };

  // SUCCESS CONFIRMATION SCREEN
  if (completedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            Đặt Hàng Thành Công!
          </h1>
          <p className="text-sm text-secondary">
            Cảm ơn quý khách <strong className="text-primary">{completedOrder.fullName}</strong> đã tin tưởng mua sắm tại Aura Apple Studio.
          </p>
        </div>

        <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6 text-left space-y-4 max-w-lg mx-auto">
          <div className="flex justify-between items-center text-xs pb-3 border-b border-border-subtle">
            <span className="text-secondary">Mã đơn hàng:</span>
            <span className="font-bold text-primary font-mono text-sm">{completedOrder.orderCode}</span>
          </div>
          <div className="flex justify-between items-center text-xs pb-3 border-b border-border-subtle">
            <span className="text-secondary">Tổng tiền:</span>
            <span className="font-bold text-accent text-base tabular-nums">
              {formatCurrency(completedOrder.total)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs pb-3 border-b border-border-subtle">
            <span className="text-secondary">Phương thức thanh toán:</span>
            <span className="font-semibold text-primary uppercase">
              {paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : paymentMethod.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary">Email nhận thông báo:</span>
            <span className="font-medium text-primary">{completedOrder.email}</span>
          </div>
        </div>

        <div className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
          Đơn hàng đang được chuẩn bị. Nhân viên CSKH sẽ liên hệ xác nhận trong vòng 15 phút.
        </div>

        <div className="pt-4 flex justify-center gap-3">
          <Button onClick={() => navigate('/')} size="md">
            Tiếp tục mua sắm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-8">
        Thông Tin Đặt Hàng & Thanh Toán
      </h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Customer info, Address, Shipping & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Customer Information */}
          <div className="bg-white dark:bg-[#161618] rounded-2xl border border-border-subtle p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-primary pb-2 border-b border-border-subtle flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-background text-xs flex items-center justify-center font-bold">1</span>
              Thông Tin Khách Hàng
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition-colors dark:bg-white/5 dark:text-white ${
                    errors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-border-subtle focus:border-accent'
                  }`}
                />
                {errors.fullName && <p className="text-[11px] text-rose-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition-colors dark:bg-white/5 dark:text-white ${
                    errors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-border-subtle focus:border-accent'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-primary mb-1">
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition-colors dark:bg-white/5 dark:text-white ${
                    errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-border-subtle focus:border-accent'
                  }`}
                />
                {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Shipping Address */}
          <div className="bg-white dark:bg-[#161618] rounded-2xl border border-border-subtle p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-primary pb-2 border-b border-border-subtle flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-background text-xs flex items-center justify-center font-bold">2</span>
              Địa Chỉ Nhận Hàng
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Tỉnh / Thành phố</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border-subtle focus:outline-none focus:border-accent bg-surface-subtle"
                >
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Quận / Huyện</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border-subtle focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Phường / Xã</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border-subtle focus:outline-none focus:border-accent"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-primary mb-1">
                  Địa chỉ số nhà, tên đường <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: Số 123 Đường Cầu Giấy"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none transition-colors ${
                    errors.address ? 'border-rose-400 bg-rose-50/20' : 'border-border-subtle focus:border-accent'
                  }`}
                />
                {errors.address && <p className="text-[11px] text-rose-500 mt-1">{errors.address}</p>}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-primary mb-1">Ghi chú giao hàng (nếu có)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border-subtle focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Delivery Method */}
          <div className="bg-white dark:bg-[#161618] rounded-2xl border border-border-subtle p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-primary pb-2 border-b border-border-subtle flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white dark:text-black text-xs flex items-center justify-center font-bold">3</span>
              Phương Thức Vận Chuyển
            </h2>

            <div className="space-y-2">
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  shippingMethod === 'standard'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border-subtle hover:border-border-hover dark:bg-[#1c1c1e]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                    className="accent-accent"
                  />
                  <div>
                    <div className="text-xs font-bold text-primary">Giao hàng tiêu chuẩn toàn quốc</div>
                    <div className="text-[11px] text-secondary">Dự kiến 1 - 3 ngày làm việc</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Miễn phí</span>
              </label>

              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  shippingMethod === 'express'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border-subtle hover:border-border-hover dark:bg-[#1c1c1e]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="accent-accent"
                  />
                  <div>
                    <div className="text-xs font-bold text-primary">Hỏa tốc nội thành (2 Giờ)</div>
                    <div className="text-[11px] text-secondary">Áp dụng cho Hà Nội & TP. HCM</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary tabular-nums">50.000₫</span>
              </label>
            </div>
          </div>

          {/* Section 4: Payment Method */}
          <div className="bg-white dark:bg-[#161618] rounded-2xl border border-border-subtle p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-primary pb-2 border-b border-border-subtle flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white dark:text-black text-xs flex items-center justify-center font-bold">4</span>
              Phương Thức Thanh Toán
            </h2>

            <div className="space-y-2.5">
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border-subtle hover:border-border-hover dark:bg-[#1c1c1e]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-accent"
                  />
                  <div className="w-8 h-8 rounded-lg bg-surface-subtle flex items-center justify-center text-primary">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary">Thanh toán khi nhận hàng (COD)</div>
                    <div className="text-[11px] text-secondary">Kiểm tra máy trước khi thanh toán tiền mặt</div>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'vnpay'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border-subtle hover:border-border-hover dark:bg-[#1c1c1e]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'vnpay'}
                    onChange={() => setPaymentMethod('vnpay')}
                    className="accent-accent"
                  />
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary">VNPay QR / Thẻ ATM & Quốc tế</div>
                    <div className="text-[11px] text-secondary">Cổng thanh toán điện tử (Sandbox integration)</div>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'momo'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border-subtle hover:border-border-hover dark:bg-[#1c1c1e]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'momo'}
                    onChange={() => setPaymentMethod('momo')}
                    className="accent-accent"
                  />
                  <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary">Ví điện tử MoMo</div>
                    <div className="text-[11px] text-secondary">Quét mã QR qua ứng dụng MoMo</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#161618] rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6 sticky top-24">
            <h2 className="text-base font-bold text-primary pb-3 border-b border-border-subtle">
              Sản Phẩm Đặt Mua ({items.length})
            </h2>

            {/* Compact items list */}
            <div className="divide-y divide-border-subtle/60 max-h-72 overflow-y-auto pr-1 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center gap-3">
                  <img
                    src={item.color.image || item.product.thumbnail}
                    alt={item.product.name}
                    className="w-12 h-12 object-contain rounded-lg bg-surface-subtle p-1 border border-border-subtle shrink-0 mix-blend-multiply dark:mix-blend-normal"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-primary truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[11px] text-secondary">
                      {item.color.name} • {item.variant.storage || item.variant.screenSize || 'Tiêu chuẩn'} • x{item.quantity}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-primary tabular-nums shrink-0">
                    {formatCurrency(item.variant.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-2.5 pt-4 border-t border-border-subtle text-xs">
              <div className="flex justify-between text-secondary">
                <span>Tạm tính</span>
                <span className="font-semibold text-primary tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>Phí vận chuyển</span>
                <span className="font-semibold text-primary tabular-nums">
                  {shippingMethod === 'express' ? '50.000₫' : 'Miễn phí'}
                </span>
              </div>
              <div className="pt-3 border-t border-border-subtle flex justify-between items-baseline">
                <span className="text-sm font-bold text-primary">Tổng thanh toán</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {formatCurrency(grandTotal + (shippingMethod === 'express' ? 50000 : 0))}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={isSubmitting}
              icon={<PackageCheck className="w-5 h-5" />}
            >
              {isSubmitting ? 'Đang tạo đơn hàng...' : 'Xác nhận đặt hàng'}
            </Button>

            <div className="text-center">
              <Link to="/cart" className="text-xs text-secondary hover:text-primary transition-colors">
                ← Quay lại giỏ hàng
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
