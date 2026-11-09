import { ListOptions, listSearchParams } from '../components/admin/ListOptions';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { request, HttpError } from '../services/api/http';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { Input, Checkbox } from '../components/common/FormControls';
import { Button } from '../components/common/Button';
import { AsyncState } from '../components/common/AsyncState';
interface Category { id: string; name: string; revision: string; productCount: number }
interface CategoryList { items: Category[]; total: number; page: number; pageSize: number }
export default function ApiCategoriesPage() {
  const [params, setParams] = useSearchParams(), query = params.toString();
  const load = useCallback((signal: AbortSignal) => request<CategoryList>(`/admin/categories?${query}`, { signal }), [query]);
  const { data, loading, error, retry } = useAsyncResource(load);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [issue, setIssue] = useState(''), [locked, setLocked] = useState(false), [unauthorized, setUnauthorized] = useState(false);
  const sending = useRef(false);
  const refresh = useCallback(() => { setLocked(false); setIssue(''); retry(); }, [retry]);
  useEffect(() => { const focus = () => { if (!sending.current && document.visibilityState === 'visible') refresh(); }; window.addEventListener('focus', focus); return () => window.removeEventListener('focus', focus); }, [refresh]);
  async function mutate(path: string, body: unknown, method: 'POST' | 'PUT', message: string) {
    if (sending.current || locked) return false;
    sending.current = true; setBusy(true); setIssue(''); setNotice('');
    try { await request(path, { method, body, signal: AbortSignal.timeout(30000) }); setNotice(message); retry(); return true; }
    catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) setUnauthorized(true);
      const uncertain = !(cause instanceof HttpError) || cause.status >= 500 || ['STALE_CATEGORY', 'NOT_FOUND'].includes(cause.code);
      setLocked(uncertain);
      setIssue(`${cause instanceof HttpError ? cause.message : 'Không xác định được kết quả yêu cầu.'}${uncertain ? ' Tải lại danh sách để kiểm tra kết quả trước khi gửi thao tác khác.' : ''}`);
      return false;
    } finally { sending.current = false; setBusy(false); }
  }
  if (unauthorized || (error instanceof HttpError && error.status === 401)) return <Navigate to="/admin/login" replace />;
  return <div className="ui-container py-10"><Link to="/admin" className="text-sm font-semibold text-accent">← Tài khoản quản trị</Link><p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-accent">Aura · Danh mục</p><h1 className="ui-page-title mt-3">Quản lý danh mục</h1><p className="mt-4 text-sm leading-6 text-secondary">Tổ chức sản phẩm bằng mã danh mục cố định. Có thể đổi tên hiển thị; chỉ xóa danh mục chưa có sản phẩm.</p>
    <form className="ui-panel my-8 p-6" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget, fields = new FormData(form); if (await mutate('/admin/categories', { id: fields.get('id'), name: fields.get('name') }, 'POST', 'Đã tạo danh mục.')) form.reset(); }}><h2 className="mb-5 text-lg font-bold">Thêm danh mục</h2><fieldset disabled={busy || locked || loading || Boolean(error)} className="grid items-start gap-4 md:grid-cols-[1fr_1fr_auto]"><Input label="Mã danh mục mới" name="id" required maxLength={200} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="phu-kien" hint="Chữ thường, số và dấu gạch nối; không đổi sau khi tạo." /><Input label="Tên danh mục mới" name="name" required maxLength={120} placeholder="Phụ kiện" /><Button className="md:mt-7" type="submit" loading={busy}>Tạo danh mục</Button></fieldset></form>
    {notice && <p role="status" className="mb-5 text-success">{notice}</p>}{issue && <div role="alert" className="ui-panel mb-5 space-y-3 p-5"><p className="text-danger">{issue}</p>{locked && <Button variant="outline" onClick={refresh}>Tải lại để kiểm tra</Button>}</div>}
    <form key={`search:${query}`} className="mb-6 grid grid-cols-2 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]" onSubmit={(event) => { event.preventDefault(); setParams(listSearchParams(event.currentTarget)); }}><ListOptions kind="categories" params={params} /><div className="col-span-2 min-w-0 sm:col-span-1"><Input label="Tìm danh mục" name="q" maxLength={120} defaultValue={params.get('q') ?? ''} placeholder="Mã hoặc tên danh mục" /></div><Button type="submit">Tìm kiếm</Button><Button variant="outline" disabled={busy} onClick={refresh}>Tải lại danh sách</Button></form>
    {loading ? <AsyncState /> : error ? <div role="alert" className="space-y-3"><p>{error instanceof HttpError ? error.message : 'Không tải được danh mục.'}</p><Button onClick={refresh}>Thử lại</Button></div> : data && <><p className="mb-4 text-sm text-secondary">{data.total} danh mục</p><div className="space-y-4">{data.items.map((category) => <CategoryEditor key={`${category.id}:${category.revision}`} category={category} disabled={busy || locked} mutate={mutate} />)}{!data.items.length && <p className="ui-panel p-6 text-secondary">Không có danh mục phù hợp.</p>}</div><nav aria-label="Phân trang danh mục" className="mt-6 flex items-center justify-between gap-3"><Button variant="outline" disabled={data.page <= 1} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(data.page - 1)); setParams(next); }}>Trang trước</Button><span className="text-sm">{data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button variant="outline" disabled={data.page * data.pageSize >= data.total} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(data.page + 1)); setParams(next); }}>Trang sau</Button></nav></>}
  </div>;
}
function CategoryEditor({ category, disabled, mutate }: { category: Category; disabled: boolean; mutate: (path: string, body: unknown, method: 'POST' | 'PUT', message: string) => Promise<boolean> }) {
  const [confirmed, setConfirmed] = useState(false);
  const base = `/admin/categories/${encodeURIComponent(category.id)}`;
  return <article aria-label={`Danh mục ${category.id}`} className="ui-panel p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="break-all font-bold">{category.id}</h2><span className="text-sm text-secondary">{category.productCount} sản phẩm</span></div><form onSubmit={async (event) => { event.preventDefault(); await mutate(base, { name: new FormData(event.currentTarget).get('name'), revision: category.revision }, 'PUT', 'Đã cập nhật tên danh mục.'); }}><fieldset disabled={disabled} className="flex flex-wrap items-end gap-4"><div className="min-w-0 flex-1"><Input label={`Tên hiển thị ${category.id}`} name="name" required maxLength={120} defaultValue={category.name} /></div><Button type="submit" variant="outline">Lưu tên</Button></fieldset></form><div className="mt-5 border-t border-border pt-4">{category.productCount ? <p className="text-xs leading-6 text-secondary">Danh mục đang có sản phẩm nên không thể xóa, kể cả khi sản phẩm đã ẩn.</p> : <div className="flex flex-wrap items-center justify-between gap-4"><Checkbox disabled={disabled} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} label={`Xác nhận xóa danh mục ${category.id}`} /><Button disabled={disabled || !confirmed} variant="danger" onClick={() => { void mutate(`${base}/delete`, { revision: category.revision }, 'POST', 'Đã xóa danh mục.'); }}>Xóa danh mục</Button></div>}</div></article>;
}
