import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Blocks, LayoutDashboard, Menu } from 'lucide-react';
import { Drawer } from '../common/Overlay';
import { ThemeToggle } from '../common/ThemeToggle';
import { AsyncState } from '../common/AsyncState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { getAdminSession, logoutDemo } from '../../services/adminService';
import { Button } from '../common/Button';
const links = [{ to: '/admin', label: 'Tổng quan', icon: LayoutDashboard }, { to: '/admin/products', label: 'Sản phẩm', icon: Blocks }, { to: '/admin/categories', label: 'Danh mục', icon: Blocks }, { to: '/admin/admin-users', label: 'Tài khoản admin', icon: Blocks }, { to: '/admin/orders', label: 'Đơn hàng', icon: Blocks }, { to: '/admin/customers', label: 'Khách hàng', icon: Blocks }, { to: '/admin/reports', label: 'Doanh thu', icon: Blocks }, { to: '/admin/design-system', label: 'Thư viện giao diện', icon: Blocks }];
function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Điều hướng quản trị" className="space-y-2">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/admin'} onClick={onNavigate} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold ${isActive ? 'bg-accent-light text-accent' : 'text-secondary hover:bg-surface-subtle hover:text-primary'}`}><Icon size={19} aria-hidden="true" />{label}</NavLink>)}</nav>;
}
export default function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const title = (links.find((link) => link.to === location.pathname) ?? links.find((link) => link.to !== '/admin' && location.pathname.startsWith(link.to + '/')))?.label ?? 'Trang quản trị';
  return <div className="min-h-screen bg-surface-subtle">
    <a href="#admin-content" className="ui-skip-link">Đến nội dung quản trị</a>
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border-subtle bg-background p-6 lg:flex">
      <Link to="/admin" className="mb-12 px-4 text-3xl font-bold tracking-[-0.07em]">Aura<span className="text-accent">.</span><span className="ml-3 text-xs font-medium tracking-normal text-secondary">Quản trị</span></Link>
      <AdminNavigation /><div className="mt-auto border-t border-border-subtle pt-5"><p className="px-4 text-xs leading-relaxed text-secondary">Không gian demo<br />Chưa kết nối dữ liệu thực.</p><Link to="/" className="mt-3 flex items-center gap-2 px-4 py-3 text-sm font-semibold text-accent">Xem cửa hàng<ArrowUpRight size={16} /></Link></div>
    </aside>
    <div className="lg:pl-64"><header className="flex min-h-20 items-center justify-between gap-4 border-b border-border-subtle bg-background px-4 sm:px-8"><div className="flex items-center gap-3"><button type="button" className="ui-icon-button lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Mở menu quản trị" aria-haspopup="dialog"><Menu size={20} /></button><nav aria-label="Đường dẫn" className="text-sm text-secondary"><Link to="/admin" className="hover:text-accent">Quản trị</Link><span aria-hidden="true" className="mx-3">/</span><span aria-current="page" className="font-semibold text-primary">{title}</span></nav></div><ThemeToggle /></header>
      <main id="admin-content" tabIndex={-1} className="mx-auto max-w-7xl p-4 py-8 sm:p-8 lg:p-10"><div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-secondary"><span>{getAdminSession()?.name} · Phiên demo</span><Button variant="secondary" onClick={() => { logoutDemo(); navigate('/admin/login', { replace: true }); }}>Đăng xuất</Button></div><ErrorBoundary key={location.pathname}><Suspense fallback={<AsyncState />}><Outlet /></Suspense></ErrorBoundary></main>
    </div>
    <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" title="Quản trị Aura" footer={<Link to="/" className="text-sm font-semibold text-accent">Xem cửa hàng</Link>}><AdminNavigation onNavigate={() => setMenuOpen(false)} /></Drawer>
  </div>;
}
