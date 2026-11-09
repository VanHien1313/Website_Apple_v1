import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { quoteCart } from '../services/api/quoteService';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { Button } from '../components/common/Button';
import { Select, Input } from '../components/common/FormControls';
import { OrderTotals } from '../components/checkout/OrderTotals';
import { formatCurrency } from '../utils/formatters';

export default function ApiCartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const [shipping, setShipping] = useState<'standard' | 'express'>('standard');
  const load = useCallback((signal: AbortSignal) => quoteCart(items, shipping, signal), [items, shipping]);
  const { data, loading, error, retry } = useAsyncResource(load);
  return <div className="ui-container py-12"><Link to="/search" className="text-sm font-semibold text-accent">← Tiếp tục mua sắm</Link><h1 className="mt-6 text-3xl font-bold tracking-tight">Giỏ hàng của bạn</h1>
    {!items.length ? <div className="ui-panel mt-8 space-y-4 p-8"><p>Giỏ hàng đang trống.</p><Link to="/search" className="inline-flex min-h-11 items-center font-semibold text-accent">Khám phá sản phẩm →</Link></div> :
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Sản phẩm trong giỏ" className="space-y-4">{items.map((item) => {
          const quoted = !loading && !error ? data?.lines.find((line) => line.skuId === item.variant.id.toLowerCase()) : undefined;
          return <article key={item.id} className="ui-panel space-y-4 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">{quoted?.name ?? item.product.name}</h2><p className="mt-2 text-sm text-secondary">{quoted?.colorName ?? item.color.name} · {quoted?.storage ?? item.variant.storage ?? 'Tiêu chuẩn'}</p></div><Button variant="ghost" onClick={() => removeItem(item.id)} aria-label={`Xóa ${item.product.name}`}>Xóa</Button></div>
            <div className="flex flex-wrap items-end justify-between gap-5"><div className="w-32"><Input key={`${item.id}:${item.quantity}`} label={`Số lượng ${item.product.name}`} type="number" min={1} max={999} step={1} defaultValue={item.quantity} onBlur={(event) => {
              const quantity = Number(event.target.value);
              if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 999) updateQuantity(item.id, quantity);
              else event.target.value = String(item.quantity);
            }} /></div>{quoted && <div className="text-right"><p className="text-sm text-secondary">Đơn giá {formatCurrency(quoted.price)}</p><p className="mt-1 font-bold">{formatCurrency(quoted.lineTotal)}</p></div>}</div>
            {quoted && quoted.price !== item.variant.price && <p className="text-sm text-accent">Giá đã được cập nhật theo giá hiện tại của cửa hàng.</p>}
          </article>;
        })}</section>
        <aside className="ui-panel space-y-6 p-6"><h2 className="text-xl font-bold">Báo giá giỏ hàng</h2><Select label="Giao hàng" value={shipping} onChange={(event) => setShipping(event.target.value as typeof shipping)}><option value="standard">Tiêu chuẩn</option><option value="express">Nhanh</option></Select>
          {loading || error ? <AsyncState error={error} onRetry={retry} /> : data && <>{data.issues.length ? <div role="alert" className="space-y-3 text-sm text-danger">{data.issues.map((issue) => <p key={issue.skuId}>{issue.message}</p>)}<p>Điều chỉnh hoặc xóa sản phẩm chưa hợp lệ để xem tổng tiền.</p></div> : <OrderTotals subtotal={data.subtotal} shippingFee={data.shippingFee} total={data.grandTotal} />}</>}
          <Button fullWidth disabled={loading || Boolean(error) || !data?.canCheckout} onClick={() => navigate(`/checkout?shipping=${shipping}`)}>Tiến hành đặt hàng</Button><p className="text-xs leading-6 text-secondary">Báo giá chưa giữ hàng. Giá và tồn kho sẽ được kiểm tra lại khi đặt hàng.</p><Button variant="ghost" onClick={retry} disabled={loading}>Cập nhật báo giá</Button>
        </aside>
      </div>}
  </div>;
}
