import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../store/CartContext';
import { useCartQuote } from '../hooks/useCartQuote';
import { MAX_QUANTITY } from '../domain/cart';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { EmptyState } from '../components/common/EmptyState';
import { AsyncState } from '../components/common/AsyncState';
import { Dialog } from '../components/common/Overlay';
import { ProductImage } from '../components/product/ProductImage';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';
export function CartPage() {
  const { items, updateQuantity, removeItem, refreshItems } = useCart();
  const quote = useCartQuote(items);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const navigate = useNavigate();
  const changed = Boolean(quote.data?.items.some((line, index) => line.variant.price !== items[index]?.variant.price));
  const displayed = quote.data?.items ?? items;
  const blocked = Boolean(quote.data?.issues.length);
  if (!items.length) return <div className="ui-container py-12"><h1 className="sr-only">Giỏ hàng</h1><EmptyState title="Giỏ hàng của bạn đang trống" description="Tìm thiết bị phù hợp và thêm cấu hình bạn yêu thích." actionLabel="Khám phá sản phẩm" onAction={() => navigate('/search')} /></div>;
  return <div className="ui-container py-10 sm:py-14"><p className="mb-3 text-sm text-secondary">Lựa chọn của bạn</p><h1 className="ui-page-title">Giỏ hàng</h1><p className="mt-4 text-sm text-secondary">{items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm · Kiểm tra cấu hình trước khi đặt hàng.</p>
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><section aria-label="Sản phẩm trong giỏ" className="space-y-5">
      {blocked && <Alert tone="danger" title="Cần kiểm tra giỏ hàng">{quote.data?.issues.map((issue) => <p key={issue}>{issue}</p>)}</Alert>}
      {changed && <Alert tone="warning" title="Giá sản phẩm đã thay đổi">Tổng tiền bên dưới đã được cập nhật. Hãy xác nhận giá mới để tiếp tục.<div className="mt-3"><Button variant="outline" onClick={() => quote.data && refreshItems(quote.data.items)}>Chấp nhận giá mới</Button></div></Alert>}
      <div className="ui-panel divide-y divide-border-subtle">{displayed.map((item) => <article key={item.id} className="p-4 sm:p-6"><div className="flex gap-4"><Link to={`/product/${item.product.slug}`} className="shrink-0"><ProductImage src={item.color.image} fallback={item.product.thumbnail} alt={item.product.name} className="h-20 w-20 sm:h-24 sm:w-24" /></Link><div className="min-w-0 flex-1"><Link to={`/product/${item.product.slug}`} className="text-sm font-bold hover:text-accent sm:text-base">{item.product.name}</Link><p className="mt-2 text-xs leading-5 text-secondary">{item.color.name} · {item.variant.storage || item.variant.screenSize || item.variant.connectivity || 'Tiêu chuẩn'}</p><p className="mt-2 text-sm font-semibold tabular-nums">{formatCurrency(item.variant.price)}</p></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center rounded-md border border-border-hover"><button type="button" className="ui-icon-button disabled:opacity-40" aria-label={`Giảm số lượng ${item.product.name}`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={16} /></button><span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">{item.quantity}</span><button type="button" className="ui-icon-button disabled:opacity-40" aria-label={`Tăng số lượng ${item.product.name}`} disabled={item.quantity >= MAX_QUANTITY} onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={16} /></button></div><p className="text-sm font-bold tabular-nums">{formatCurrency(item.quantity * item.variant.price)}</p><button type="button" className="ui-icon-button" aria-label={`Xóa ${item.product.name}`} onClick={() => setRemoveId(item.id)}><Trash2 size={18} /></button></div>
      </article>)}</div><Link to="/search" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent">← Tiếp tục khám phá</Link>
    </section><aside className="ui-panel space-y-6 p-6 lg:sticky lg:top-40"><h2 className="text-lg font-bold">Tổng đơn hàng</h2>{quote.loading || quote.error ? <AsyncState error={quote.error} onRetry={quote.retry} /> : quote.data && <OrderTotals subtotal={quote.data.subtotal} shippingFee={quote.data.shippingFee} total={quote.data.grandTotal} />}
      <Button fullWidth disabled={quote.loading || Boolean(quote.error) || blocked || changed} onClick={() => navigate('/checkout')}>Tiến hành đặt hàng</Button><p className="text-xs leading-6 text-secondary">Giao tiêu chuẩn miễn phí cho tổng hàng trên 10 triệu đồng; các đơn còn lại 50.000 ₫. Bạn có thể chọn giao nhanh tại bước tiếp theo.</p>
    </aside></div>
    <Dialog open={removeId !== null} onClose={() => setRemoveId(null)} title="Xóa sản phẩm khỏi giỏ?" footer={<><Button variant="outline" onClick={() => setRemoveId(null)}>Giữ lại</Button><Button variant="danger" onClick={() => { if (removeId) removeItem(removeId); setRemoveId(null); }}>Xóa sản phẩm</Button></>}><p className="text-sm text-secondary">Bạn có thể thêm lại sản phẩm bất cứ lúc nào từ trang chi tiết.</p></Dialog>
  </div>;
}
