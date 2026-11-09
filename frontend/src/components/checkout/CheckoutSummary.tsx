import type { CartItem } from '../../types/cart';
import { ProductImage } from '../product/ProductImage';
import { OrderTotals } from './OrderTotals';
import { formatCurrency } from '../../utils/formatters';
export function CheckoutSummary({ items, subtotal, shippingFee, grandTotal }: { items: CartItem[]; subtotal: number; shippingFee: number; grandTotal: number }) {
  return <div className="space-y-6"><ul className="max-h-80 divide-y divide-border-subtle overflow-y-auto">{items.map((item) => <li key={item.id} className="flex gap-3 py-4"><ProductImage src={item.color.image} fallback={item.product.thumbnail} alt="" className="h-16 w-16 shrink-0" /><div className="min-w-0"><p className="text-sm font-semibold">{item.product.name}</p><p className="mt-1 text-xs text-secondary">{item.color.name} · {item.variant.storage || item.variant.screenSize || 'Tiêu chuẩn'} · SL {item.quantity}</p><p className="mt-2 text-sm font-semibold tabular-nums">{formatCurrency(item.variant.price * item.quantity)}</p></div></li>)}</ul><OrderTotals subtotal={subtotal} shippingFee={shippingFee} total={grandTotal} /></div>;
}
