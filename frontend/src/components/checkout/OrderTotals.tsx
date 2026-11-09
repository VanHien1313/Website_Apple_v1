import { formatCurrency } from '../../utils/formatters';
export function OrderTotals({ subtotal, shippingFee, total }: { subtotal: number; shippingFee: number; total: number }) {
  return <dl className="space-y-4 text-sm">
    <div className="flex justify-between gap-4"><dt className="text-secondary">Tạm tính</dt><dd className="font-semibold tabular-nums">{formatCurrency(subtotal)}</dd></div>
    <div className="flex justify-between gap-4"><dt className="text-secondary">Phí vận chuyển</dt><dd className="font-semibold tabular-nums">{shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}</dd></div>
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border-subtle pt-5"><dt className="font-semibold">Tổng cộng</dt><dd className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</dd></div>
  </dl>;
}
