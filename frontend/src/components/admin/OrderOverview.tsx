import { Link } from 'react-router-dom';
import { adminOrderService } from '../../services/adminOrderService';
import { vietnamDay } from '../../domain/orders';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { AsyncState } from '../common/AsyncState';
import { formatCurrency } from '../../utils/formatters';
const load = async () => {
  const today = vietnamDay(new Date().toISOString());
  const [orders, report] = await Promise.all([adminOrderService.list(), adminOrderService.report(`${today.slice(0, 7)}-01`, today, 'month')]);
  return { orders: orders.total, revenue: report.total };
};
export function OrderOverview() {
  const { data, error, retry } = useAsyncResource(load);
  if (!data) return <AsyncState error={error} onRetry={retry} />;
  return <section className="grid gap-4 sm:grid-cols-2"><Link to="/admin/orders" className="ui-panel p-6 hover:border-accent"><h2 className="text-sm text-secondary">Đơn hàng từ checkout</h2><p className="my-4 text-3xl font-bold">{data.orders}</p><span className="text-sm text-accent">Quản lý tiến trình →</span></Link><Link to="/admin/reports" className="ui-panel p-6 hover:border-accent"><h2 className="text-sm text-secondary">Doanh thu demo tháng này</h2><p className="my-4 break-words text-2xl font-bold">{formatCurrency(data.revenue)}</p><span className="text-sm text-accent">Xem báo cáo →</span></Link></section>;
}
