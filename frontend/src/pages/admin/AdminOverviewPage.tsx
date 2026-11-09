import { Link } from 'react-router-dom';
import { Package, Layers, Users, ArrowUpRight } from 'lucide-react';
import { adminService, getAdminSession } from '../../services/adminService';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { AsyncState } from '../../components/common/AsyncState';
import { Alert } from '../../components/common/Alert';
import { ResetCatalog } from '../../components/admin/ResetCatalog';
import { OrderOverview } from '../../components/admin/OrderOverview';
const load = () => adminService.read();
export default function AdminOverviewPage() {
  const { data, error, retry } = useAsyncResource(load);
  if (!data) return <AsyncState error={error} onRetry={retry} />;
  const cards = [{ title: 'Sản phẩm', count: data.products.length, to: '/admin/products', icon: Package, detail: 'Cấu hình, hình ảnh và giá bán.' }, { title: 'Danh mục', count: data.categories.length, to: '/admin/categories', icon: Layers, detail: 'Tổ chức danh mục cửa hàng.' }, ...(getAdminSession()?.role === 'owner' ? [{ title: 'Tài khoản admin', count: data.users.length, to: '/admin/admin-users', icon: Users, detail: 'Hồ sơ và quyền trong phiên demo.' }] : [])];
  return <div className="space-y-8"><div><p className="mb-3 text-sm text-accent">AURA / QUẢN TRỊ CỬA HÀNG</p><h1 className="ui-page-title">Chăm chút từng trải nghiệm.</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-secondary">Từ danh mục đến từng cấu hình. Mọi thay đổi catalog được lưu trên trình duyệt này và dùng chung với cửa hàng.</p></div><OrderOverview /><section className="grid gap-5 md:grid-cols-3">{cards.map(({ title, count, to, icon: Icon, detail }) => <Link key={to} to={to} className="ui-panel p-6 transition-colors hover:border-accent"><div className="flex items-center justify-between text-accent"><Icon size={24} /><ArrowUpRight size={18} /></div><p className="my-6 text-4xl font-bold tabular-nums">{count}</p><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm text-secondary">{detail}</p></Link>)}</section><Alert title="Môi trường mô phỏng">Chỉ sử dụng dữ liệu mẫu. Phiên và phân quyền demo không thay thế xác thực backend. Đơn hàng và báo cáo dùng dữ liệu demo. Chưa có upload hoặc thanh toán thật.</Alert><section className="ui-panel flex flex-wrap items-center justify-between gap-5 p-6"><div><h2 className="font-bold">Kiểm tra trải nghiệm mua hàng</h2><p className="mt-2 text-sm text-secondary">Mở storefront để xem sản phẩm sau khi lưu thay đổi.</p></div><Link to="/search" className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-on-accent">Xem cửa hàng →</Link></section><p className="text-sm text-secondary">Tiếp theo · Nghiệm thu giao diện và bàn giao tích hợp backend (giai đoạn 6).</p><ResetCatalog /></div>;
}
