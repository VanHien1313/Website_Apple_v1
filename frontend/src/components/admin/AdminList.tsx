import { useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input, Select } from '../common/FormControls';
import { Pagination } from '../common/Pagination';
export function AdminList<T extends { id: string; name: string }>({ items, render, searchText, filters }: { items: T[]; render: (item: T) => ReactNode; searchText?: (item: T) => string; filters?: ReactNode }) {
  const [params, setParams] = useSearchParams(); const q = params.get('q') || ''; const sort = params.get('sort') || 'asc';
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); if (key !== 'page') next.delete('page'); setParams(next); };
  const rows = items.filter((item) => (searchText?.(item) || item.name).toLocaleLowerCase('vi').includes(q.trim().toLocaleLowerCase('vi'))).sort((a, b) => a.name.localeCompare(b.name, 'vi') * (sort === 'desc' ? -1 : 1));
  const raw = Number(params.get('page') || 1); const page = Math.min(Math.max(1, Number.isSafeInteger(raw) ? raw : 1), Math.max(1, Math.ceil(rows.length / 6)));
  useEffect(() => { if (params.has('page') && String(page) !== params.get('page')) { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next, { replace: true }); } }, [page, params, setParams]);
  return <div className="space-y-5"><div className="ui-panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Tìm kiếm" value={q} onChange={(e) => update('q', e.target.value)} /><Select label="Sắp xếp" value={sort} onChange={(e) => update('sort', e.target.value)}><option value="asc">Tên A → Z</option><option value="desc">Tên Z → A</option></Select>{filters}</div><p className="text-sm text-secondary" role="status">{rows.length} kết quả</p><div className="space-y-3">{rows.slice((page - 1) * 6, page * 6).map((item) => <div key={item.id}>{render(item)}</div>)}{!rows.length && <div className="ui-panel p-10 text-center text-secondary">Không có kết quả. Hãy thay đổi tìm kiếm hoặc bộ lọc.</div>}</div><Pagination page={page} pageSize={6} total={rows.length} onChange={(value) => update('page', String(value))} /></div>;
}
