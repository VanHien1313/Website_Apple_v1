import { Link } from 'react-router-dom';
export default function ApiPendingPage() {
  return <section className="ui-container py-16"><div className="ui-panel mx-auto max-w-xl space-y-5 p-8"><h1 className="text-2xl font-bold">Đặt hàng đang được hoàn thiện</h1><p className="text-secondary">Bạn có thể khám phá sản phẩm và quản lý tài khoản. Giỏ hàng, thanh toán và tra cứu đơn hàng sẽ mở khi dịch vụ đặt hàng sẵn sàng.</p><Link to="/search" className="inline-flex min-h-11 items-center font-semibold text-accent">Khám phá sản phẩm →</Link></div></section>;
}
