import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../store/CartContext';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency } from '../utils/formatters';

export const CartPage: React.FC = () => {
  const { items, subtotal, totalDiscount, shippingFee, grandTotal, updateQuantity, removeItem } =
    useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12 text-secondary stroke-[1.5]" />}
          title="Giỏ hàng của bạn đang trống"
          description="Khám phá các sản phẩm iPhone, iPad, Mac hoặc Apple Watch chính hãng để lựa chọn thiết bị phù hợp."
          actionLabel="Bắt đầu mua sắm"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-8">
        Giỏ Hàng Của Bạn ({items.length} sản phẩm)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Items List (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="divide-y divide-border-subtle border border-border-subtle rounded-2xl bg-white dark:bg-[#161618] overflow-hidden shadow-sm">
            {items.map((item) => {
              const specLabel =
                item.variant.storage ||
                item.variant.screenSize ||
                item.variant.connectivity ||
                'Tiêu chuẩn';

              return (
                <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Thumbnail */}
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface-subtle p-2 shrink-0 border border-border-subtle flex items-center justify-center"
                  >
                    <img
                      src={item.color.image || item.product.thumbnail}
                      alt={item.product.name}
                      className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                    />
                  </Link>

                  {/* Title & Variant Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.product.slug}`}
                      className="text-sm sm:text-base font-semibold text-primary hover:text-accent transition-colors"
                    >
                      {item.product.name}
                    </Link>
                    <div className="text-xs text-secondary mt-1 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: item.color.hex }}
                        />
                        {item.color.name}
                      </span>
                      <span>•</span>
                      <span className="font-medium">{specLabel}</span>
                    </div>

                    <div className="text-sm font-bold text-primary mt-2 tabular-nums">
                      {formatCurrency(item.variant.price)}
                    </div>
                  </div>

                  {/* Quantity Controls & Delete */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                    <div className="flex items-center border border-border-subtle rounded-lg bg-surface-subtle overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1.5 hover:bg-gray-200 text-secondary hover:text-primary transition-colors"
                        aria-label="Giảm số lượng"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-primary tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1.5 hover:bg-gray-200 text-secondary hover:text-primary transition-colors"
                        aria-label="Tăng số lượng"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-secondary hover:text-rose-600 transition-colors p-1"
                      aria-label="Xóa sản phẩm"
                      title="Xóa khỏi giỏ hàng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link
              to="/"
              className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
            >
              ← Tiếp tục mua sắm
            </Link>
          </div>
        </div>

        {/* Order Summary Column (4 cols on lg) */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-[#161618] rounded-2xl border border-border-subtle p-6 shadow-sm space-y-5 sticky top-24">
            <h2 className="text-base font-bold text-primary pb-3 border-b border-border-subtle">
              Tóm Tắt Đơn Hàng
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-secondary">
                <span>Tạm tính ({items.length} món)</span>
                <span className="font-semibold text-primary tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Tiết kiệm trực tiếp</span>
                  <span className="tabular-nums">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-secondary">
                <span>Phí vận chuyển</span>
                <span className="font-semibold text-primary tabular-nums">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase">Miễn phí</span>
                  ) : (
                    formatCurrency(shippingFee)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-border-subtle flex justify-between items-baseline">
                <span className="text-sm font-bold text-primary">Tổng cộng</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary tabular-nums">
                    {formatCurrency(grandTotal)}
                  </div>
                  <div className="text-[10px] text-secondary">Đã bao gồm thuế VAT</div>
                </div>
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('/checkout')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Tiến hành đặt hàng
            </Button>

            {/* Micro Trust badges */}
            <div className="pt-4 border-t border-border-subtle space-y-2 text-[11px] text-secondary">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Bảo mật thanh toán chuẩn PCI DSS</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Giao hàng an toàn, kiểm tra hàng trước khi thanh toán</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
