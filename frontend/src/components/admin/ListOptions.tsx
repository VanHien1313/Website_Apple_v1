import { Select } from '../common/FormControls';
type Kind = 'products' | 'categories' | 'customers' | 'users' | 'orders';
const dates = [['newest', 'Mới nhất'], ['oldest', 'Cũ nhất']];
const names = [['name_asc', 'Tên A → Z'], ['name_desc', 'Tên Z → A']];
const sorts: Record<Kind, string[][]> = { products: [...dates, ...names], categories: names, customers: [...dates, ...names], users: [...dates, ...names], orders: [...dates, ['total_asc', 'Tổng tiền tăng dần'], ['total_desc', 'Tổng tiền giảm dần']] };
/** Shared controls only; API authorization and SQL allowlists remain server-owned. */
export function ListOptions({ kind, params }: { kind: Kind; params: URLSearchParams }) {
  return <div className="col-span-full grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Select label="Sắp xếp" name="sort" defaultValue={params.get('sort') || (kind === 'categories' ? 'name_asc' : kind === 'users' ? 'oldest' : 'newest')}>{sorts[kind].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
    {kind === 'categories' && <Select label="Sản phẩm trong danh mục" name="usage" defaultValue={params.get('usage') || 'all'}><option value="all">Tất cả</option><option value="used">Có sản phẩm (kể cả đã ẩn)</option><option value="empty">Chưa có sản phẩm</option></Select>}
    {kind === 'customers' && <Select label="Đơn hàng gắn với tài khoản" name="orders" defaultValue={params.get('orders') || 'all'}><option value="all">Tất cả</option><option value="placed">Đã đặt đơn</option><option value="none">Chưa đặt đơn</option></Select>}
    {kind === 'users' && <><Select label="Lọc vai trò" name="role" defaultValue={params.get('role') || 'all'}><option value="all">Tất cả vai trò</option><option value="owner">Chủ cửa hàng</option><option value="editor">Biên tập viên</option></Select><Select label="Lọc trạng thái tài khoản" name="active" defaultValue={params.get('active') || 'all'}><option value="all">Tất cả trạng thái</option><option value="true">Đang hoạt động</option><option value="false">Đã khóa</option></Select></>}
  </div>;
}
export function listSearchParams(form: HTMLFormElement) {
  const result = new URLSearchParams();
  for (const [key, value] of new FormData(form)) if (typeof value === 'string' && value.trim() && key !== 'page') result.set(key, value.trim());
  return result;
}
