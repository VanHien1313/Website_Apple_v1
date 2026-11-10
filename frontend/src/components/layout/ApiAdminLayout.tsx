import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { request, HttpError } from '../../services/api/http';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { AsyncState } from '../common/AsyncState';
import { Drawer } from '../common/Overlay';
import { ThemeToggle } from '../common/ThemeToggle';

const links = [
  ['/admin', 'Tài khoản'], ['/admin/products', 'Sản phẩm'], ['/admin/categories', 'Danh mục'],
  ['/admin/orders', 'Đơn hàng'], ['/admin/customers', 'Khách hàng'], ['/admin/reports', 'Doanh thu'],
];
export default function ApiAdminLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const load = useCallback((signal: AbortSignal) => request<{ name: string; role: string }>('/admin/auth/me', { signal }), [location.key]);
  const { data, loading, error, retry } = useAsyncResource(load);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  if (error instanceof HttpError && error.status === 401) return <Navigate to="/admin/login" replace />;
  if (loading || error || !data) return <AsyncState error={error} onRetry={retry} />;
  const navigation = <nav aria-label="Điều hướng quản trị" className="space-y-1">{[...links, ...(data.role === 'owner' ? [['/admin/users', 'Đội ngũ quản trị']] : [])].map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setOpen(false)} className={({ isActive }) => `block rounded-xl px-4 py-3 text-sm font-semibold ${isActive ? 'bg-accent-light text-accent' : 'text-secondary hover:bg-surface-subtle hover:text-primary'}`}>{label}</NavLink>)}</nav>;
  return <div className="min-h-screen bg-background text-primary">
    <a href="#admin-content" className="ui-skip-link">Đến nội dung quản trị</a>
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-background"><div className="flex min-h-20 items-center justify-between gap-3 px-4 lg:px-8">
      <div className="flex items-center gap-3"><button className="ui-icon-button lg:hidden" aria-label="Mở menu quản trị" aria-haspopup="dialog" onClick={() => setOpen(true)}><Menu size={21} /></button><Link to="/admin" className="text-3xl font-bold tracking-tighter">aura<span className="text-accent">.</span></Link><span className="hidden border-l border-border pl-4 text-xs font-semibold uppercase tracking-widest text-secondary sm:block">Quản trị</span></div>
      <div className="flex items-center gap-2"><ThemeToggle /><Link to="/" className="rounded-lg px-3 py-3 text-sm font-semibold text-accent">Về cửa hàng</Link></div>
    </div></header>
    <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="sticky top-20 hidden h-[calc(100vh-5rem)] flex-col border-r border-border-subtle p-5 lg:flex">{navigation}<div className="mt-auto border-t border-border-subtle pt-5"><p className="break-words text-sm font-semibold">{data.name}</p><p className="mt-1 text-xs text-secondary">{data.role === 'owner' ? 'Chủ cửa hàng' : 'Biên tập viên'}</p></div></aside><div id="admin-content" tabIndex={-1} className="min-w-0"><Outlet /></div></div>
    <Drawer open={open} onClose={() => setOpen(false)} side="left" title="Quản trị Aura">{navigation}</Drawer>
  </div>;
}
