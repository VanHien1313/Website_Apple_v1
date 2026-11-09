import { Link, useParams } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { AsyncState } from '../../components/common/AsyncState';
import { AdminList } from '../../components/admin/AdminList';
const load = () => customerService.adminCustomers();
export default function AdminCustomersPage() {
  const { id } = useParams(); const { data, error, retry } = useAsyncResource(load);
  if (!data) return <AsyncState error={error} onRetry={retry} />;
  if (id) { const user = data.find((u) => u.id === id); return <div className="space-y-6"><Link className="text-accent" to="/admin/customers">← Danh sách khách hàng</Link><h1 className="ui-page-title">{user ? user.fullName : 'Không tìm thấy khách hàng'}</h1>{user && <section className="ui-panel space-y-4 p-6"><h2 className="font-bold">Hồ sơ chỉ xem</h2><p className="break-all text-sm">Email: {user.email}</p><p className="text-sm">Điện thoại: {user.phone}</p><p className="text-sm text-secondary">Đăng ký: {new Date(user.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p></section>}</div>; }
  return <div className="space-y-6"><h1 className="ui-page-title">Khách hàng</h1><p className="text-sm text-secondary">Danh sách hồ sơ khách đăng ký trong demo. Chỉ xem thông tin, không sửa hoặc xóa tài khoản khách.</p><AdminList items={data.map((u) => ({ ...u, name: u.fullName }))} searchText={(u) => `${u.name} ${u.email} ${u.phone}`} render={(u) => <Link to={`/admin/customers/${u.id}`} className="ui-panel flex flex-wrap items-center justify-between gap-4 p-5 hover:border-accent"><div className="min-w-0"><h2 className="break-words font-bold">{u.name}</h2><p className="mt-2 break-all text-sm text-secondary">{u.email}</p><p className="mt-2 text-sm">{u.phone}</p></div><span className="text-sm text-accent">Xem hồ sơ →</span></Link>} /></div>;
}
