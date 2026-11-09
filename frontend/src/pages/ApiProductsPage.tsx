import { ListOptions, listSearchParams } from '../components/admin/ListOptions';
import { useCallback } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { request, HttpError } from '../services/api/http';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { Input, Select } from '../components/common/FormControls';
import { Button } from '../components/common/Button';
import { AsyncState } from '../components/common/AsyncState';
import type { ManagedProduct } from '../services/api/managedProduct';
interface Page { items: ManagedProduct[]; total: number; page: number; pageSize: number }
export default function ApiProductsPage() {
  const [params, setParams] = useSearchParams(), query = params.toString();
  const load = useCallback((signal: AbortSignal) => request<Page>(`/admin/products?${query}`, { signal }), [query]);
  const { data, loading, error, retry } = useAsyncResource(load);
  if (error instanceof HttpError && error.status === 401) return <Navigate to="/admin/login" replace />;
  function turn(page: number) { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); }
  return <main className="ui-container py-10"><Link to="/admin" className="text-sm font-semibold text-accent">← Tài khoản quản trị</Link><header className="my-8 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Aura · Catalog</p><h1 className="ui-page-title mt-3">Quản lý sản phẩm</h1><p className="mt-3 text-secondary">Từ cấu hình đến tồn kho. Mọi phiên bản trong một nơi.</p></div><Link to="/admin/products/new" className="rounded-xl bg-accent px-5 py-3 font-semibold text-white">Thêm sản phẩm</Link></header>
    <form key={query} className="ui-panel mb-8 grid items-end gap-4 p-5 sm:grid-cols-[1fr_12rem_auto]" onSubmit={(event) => { event.preventDefault(); setParams(listSearchParams(event.currentTarget)); }}><ListOptions kind="products" params={params} /><Input label="Tìm sản phẩm" name="q" maxLength={120} defaultValue={params.get('q') ?? ''} placeholder="Tên hoặc đường dẫn sản phẩm" /><Select label="Trạng thái" name="active" defaultValue={params.get('active') ?? ''}><option value="">Tất cả</option><option value="true">Đang bán</option><option value="false">Đã ẩn</option></Select><Button type="submit">Tìm kiếm</Button></form>
    {loading ? <AsyncState /> : error ? <div role="alert"><p>{error.message}</p><Button onClick={retry}>Thử lại</Button></div> : data && <><div className="mb-4 flex items-center justify-between"><p className="text-sm text-secondary">{data.total} sản phẩm</p><Button variant="ghost" onClick={retry}>Tải lại</Button></div><div className="grid gap-4 md:grid-cols-2">{data.items.map((product) => <article key={product.id} className="ui-panel flex min-w-0 gap-4 p-5"><img src={product.thumbnail} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-surface-subtle object-contain" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-secondary">{product.active ? 'Đang bán' : 'Đã ẩn'} · {product.categoryId}</p><h2 className="mt-2 break-words font-bold">{product.name}</h2><p className="mt-1 break-all text-xs text-secondary">/{product.slug}</p><Link to={`/admin/products/${product.id}`} className="mt-3 inline-block py-2 text-sm font-semibold text-accent" aria-label={`Chỉnh sửa ${product.name}`}>Chỉnh sửa →</Link></div></article>)}</div>{!data.items.length && <p className="ui-panel p-8 text-secondary">Không có sản phẩm phù hợp.</p>}<nav aria-label="Phân trang sản phẩm" className="mt-8 flex items-center justify-between gap-3"><Button variant="outline" disabled={data.page <= 1} onClick={() => turn(data.page - 1)}>Trang trước</Button><span>{data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button variant="outline" disabled={data.page * data.pageSize >= data.total} onClick={() => turn(data.page + 1)}>Trang sau</Button></nav></>}
  </main>;
}
