import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '../store/CartContext';
import { quoteCart } from '../services/api/quoteService';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/FormControls';
import { ProductImage } from '../components/product/ProductImage';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';

export default function ApiCartPage() {
  const { items, selectedItems, setItemSelected, selectItems, updateQuantity, removeItem } = useCart();
  const allCheckbox = useRef<HTMLInputElement>(null);
  useEffect(() => { if (allCheckbox.current) allCheckbox.current.indeterminate = selectedItems.length > 0 && selectedItems.length < items.length; }, [items.length, selectedItems.length]);
  const navigate = useNavigate();
  const [shipping, setShipping] = useState<'standard' | 'express'>('standard');
  const load = useCallback((signal: AbortSignal) => selectedItems.length ? quoteCart(selectedItems, shipping, signal) : Promise.resolve(null), [selectedItems, shipping]);
  const { data, loading, error, retry } = useAsyncResource(load);
  return <div className="ui-container aura-cart">
    <Link to="/search" className="cart-back"><ArrowLeft size={17} />Tiếp tục mua sắm</Link>
    <header className="cart-heading"><div><p>LỰA CHỌN CỦA BẠN</p><h1>Giỏ hàng<span>.</span></h1></div><span className="cart-count"><ShoppingBag size={17} />{items.reduce((total, item) => total + item.quantity, 0)} sản phẩm</span></header>
    {!items.length ? <div className="ui-panel cart-empty"><ShoppingBag size={40} /><h2>Giỏ hàng đang trống</h2><p>Khám phá thiết bị phù hợp và thêm vào lựa chọn của bạn.</p><Link to="/search" className="text-accent font-semibold">Khám phá sản phẩm →</Link></div> :
      <div className="cart-layout">
        <section aria-label="Sản phẩm trong giỏ" className="cart-products">
          <div className="cart-list-heading"><h2>Danh sách sản phẩm</h2><div className="cart-selection"><label><input ref={allCheckbox} type="checkbox" checked={selectedItems.length === items.length} onChange={event => selectItems(event.target.checked ? items.map(item => item.id) : [])} />Chọn tất cả</label><span>Đã chọn <strong>{selectedItems.length}/{items.length}</strong></span></div></div>
          {items.map((item) => {
            const selected = selectedItems.some(line => line.id === item.id);
            const quoted = !loading && !error ? data?.lines.find(line => line.skuId === item.variant.id.toLowerCase()) : undefined;
            const price = quoted?.price ?? item.variant.price;
            const originalPrice = quoted?.originalPrice ?? item.variant.originalPrice;
            const configuration = [quoted?.storage ?? item.variant.storage, item.variant.chip, item.variant.screenSize, item.variant.connectivity].filter(Boolean).join(' · ');
            return <article key={item.id} className={`cart-product ${selected ? 'is-selected' : ''}`}>
              <input className="cart-item-check" type="checkbox" aria-label={`Chọn mua ${item.product.name}`} checked={selected} onChange={event => setItemSelected(item.id, event.target.checked)} />
              <Link to={`/product/${item.product.slug}`} className="cart-product-image" aria-label={`Xem ${item.product.name}`}><ProductImage src={item.color.image || item.product.thumbnail} fallback={item.product.thumbnail} alt={item.product.name} className="aspect-square" /></Link>
              <div className="cart-product-info"><Link to={`/product/${item.product.slug}`}><h2>{quoted?.name ?? item.product.name}</h2></Link><p className="cart-configuration">{configuration || 'Tiêu chuẩn'}<span> / </span>{quoted?.colorName ?? item.color.name}</p><div className="cart-unit-price"><strong>{formatCurrency(price)}</strong>{originalPrice > price && <del>{formatCurrency(originalPrice)}</del>}</div>{quoted && quoted.price !== item.variant.price && <p className="cart-price-note">Đã cập nhật giá hiện tại.</p>}{!quoted && <p className="cart-price-note">Giá hiển thị sẽ được xác nhận khi chọn mua.</p>}</div>
              <button type="button" className="cart-remove" onClick={() => removeItem(item.id)} aria-label={`Xóa ${item.product.name}`} title="Xóa khỏi giỏ"><Trash2 size={18} /></button>
              <div className="cart-product-bottom"><div className="cart-quantity" role="group" aria-label={`Số lượng ${item.product.name}`}><button type="button" aria-label={`Giảm số lượng ${item.product.name}`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={16} /></button><input key={`${item.id}:${item.quantity}`} aria-label={`Số lượng ${item.product.name}`} type="number" inputMode="numeric" min={1} max={999} step={1} defaultValue={item.quantity} onBlur={event => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 999) updateQuantity(item.id, quantity); else event.target.value = String(item.quantity); }} /><button type="button" aria-label={`Tăng số lượng ${item.product.name}`} disabled={item.quantity >= 999} onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={16} /></button></div><div className="cart-line-total"><span>Thành tiền</span><strong>{formatCurrency(price * item.quantity)}</strong></div></div>
            </article>;
          })}
          <div className="cart-list-footer"><ShoppingBag size={17} /><p>Sản phẩm chưa chọn vẫn được giữ trong giỏ để bạn mua sau.</p></div>
        </section>
        <aside className="ui-panel cart-summary"><div className="cart-summary-heading"><h2>Tóm tắt đơn hàng</h2><span>{selectedItems.length} sản phẩm được chọn</span></div><Select label="Phương thức giao hàng" value={shipping} onChange={event => setShipping(event.target.value as typeof shipping)}><option value="standard">Tiêu chuẩn</option><option value="express">Giao nhanh</option></Select>
          {!selectedItems.length && <p role="status" className="cart-summary-empty">Tích chọn ít nhất một sản phẩm để xem tổng tiền và đặt hàng.</p>}
          {loading || error ? <AsyncState error={error} onRetry={retry} /> : data && (data.issues.length ? <div role="alert" className="space-y-3 text-sm text-danger">{data.issues.map(issue => <p key={issue.skuId}>{issue.message}</p>)}<p>Điều chỉnh hoặc bỏ chọn sản phẩm chưa hợp lệ.</p></div> : <OrderTotals subtotal={data.subtotal} shippingFee={data.shippingFee} total={data.grandTotal} />)}
          <Button fullWidth disabled={!selectedItems.length || loading || Boolean(error) || !data?.canCheckout} onClick={() => navigate(`/checkout?shipping=${shipping}`)}>Tiến hành đặt hàng ({selectedItems.length})<ArrowRight size={17} /></Button>
          <div className="cart-reassurance"><p><Truck size={18} /><span>Miễn phí giao tiêu chuẩn cho đơn trên 10 triệu đồng.</span></p><p><ShieldCheck size={18} /><span>Giá và tồn kho được kiểm tra lại trước khi xác nhận đơn.</span></p></div><Button variant="ghost" fullWidth onClick={retry} disabled={loading || !selectedItems.length}>Cập nhật báo giá</Button>
        </aside>
      </div>}
  </div>;
}
