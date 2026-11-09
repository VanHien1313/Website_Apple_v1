import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { AdminList } from '../../components/admin/AdminList';
import { AsyncState } from '../../components/common/AsyncState';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/FormControls';
import { Dialog } from '../../components/common/Overlay';
import { Alert } from '../../components/common/Alert';
import { ProductImage } from '../../components/product/ProductImage';
import { formatCurrency as formatPrice } from '../../utils/formatters';
const load = () => adminService.read();
export default function AdminProductsPage() {
  const { data, error, retry } = useAsyncResource(load); const [params, setParams] = useSearchParams(); const [deleting, setDeleting] = useState<string | null>(null); const [failure, setFailure] = useState(''); const [busy, setBusy] = useState(false);
  if (!data) return <AsyncState error={error} onRetry={retry} />;
  const category = params.get('category') || '';
  return <div className="space-y-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm text-secondary">CATALOG / {data.products.length} sản phẩm</p><h1 className="ui-page-title">Sản phẩm</h1><p className="mt-3 text-sm text-secondary">Quản lý cấu hình và giá. Thay đổi được dùng ngay khi tải lại cửa hàng.</p></div><Link className="rounded-md bg-accent px-5 py-3 font-semibold text-on-accent" to="/admin/products/new">Thêm sản phẩm</Link></div><AdminList items={data.products.filter((p) => !category || p.category === category)} searchText={(p) => `${p.name} ${p.slug} ${p.variants.map((v) => v.sku).join(' ')}`} filters={<Select label="Danh mục" value={category} onChange={(e) => { const next = new URLSearchParams(params); next.set('category', e.target.value); next.delete('page'); setParams(next); }}>{[{ id: '', name: 'Tất cả' }, ...data.categories].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>} render={(p) => <article className="ui-panel grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4 p-4 sm:grid-cols-[80px_minmax(0,1fr)_auto]"><ProductImage className="h-20 w-20 shrink-0" src={p.thumbnail} alt={p.name} /><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{p.name}</h2><p className="mt-1 text-sm text-secondary">{data.categories.find((c) => c.id === p.category)?.name} · {p.variants.length} cấu hình</p><p className="mt-2 text-sm font-semibold">{formatPrice(p.basePrice)}</p></div><div className="col-span-2 flex flex-wrap items-center justify-end gap-3 sm:col-span-1"><Link className="p-3 text-sm text-accent" to={`/product/${p.slug}`}>Xem</Link><Link className="p-3 text-sm font-semibold text-accent" to={`/admin/products/${p.id}/edit`}>Sửa</Link><Button variant="secondary" onClick={() => { setFailure(''); setDeleting(p.id); }}>Xóa</Button></div></article>} /><Dialog open={!!deleting} onClose={() => !busy && setDeleting(null)} title="Xóa sản phẩm?" footer={<><Button variant="secondary" disabled={busy} onClick={() => setDeleting(null)}>Giữ lại</Button><Button loading={busy} onClick={async () => { setBusy(true); try { await adminService.deleteProduct(deleting!); setDeleting(null); retry(); } catch (e) { setFailure((e as Error).message); } finally { setBusy(false); } }}>Xác nhận xóa</Button></>}><p>Sản phẩm sẽ bị gỡ khỏi catalog demo. Giỏ có sản phẩm này sẽ cần kiểm tra lại; đơn đã lưu giữ nguyên snapshot.</p>{failure && <Alert tone="danger" title="Chưa xóa được">{failure}</Alert>}</Dialog></div>;
}
