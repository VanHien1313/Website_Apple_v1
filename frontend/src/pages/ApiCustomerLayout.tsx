import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, LogOut, Package, ShieldCheck, UserRound } from 'lucide-react';
import { request, HttpError } from '../services/api/http';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';

export interface CustomerProfile { id: string; fullName: string; email: string; phone: string; createdAt: string; shippingAddress?: { address: string; province: string; ward: string } }
type Context = { profile: CustomerProfile; avatarVersion: number; refreshAvatar: () => void };
export const useCustomerAccount = () => useOutletContext<Context>();
export function CustomerAvatar({ name, version, large = false }: { name: string; version: number; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [version]);
  return <span className={`customer-avatar ${large ? 'customer-avatar--large' : ''}`}>
    {failed ? <span aria-label={`Ảnh đại diện của ${name}`}>{name.trim().split(/\s+/).slice(-2).map(v => v[0]).join('').toUpperCase()}</span> : <img src={`/api/v1/auth/avatar?v=${version}`} alt={`Ảnh đại diện của ${name}`} onError={() => setFailed(true)} />}
  </span>;
}
const links = [{ to: '/account', title: 'Hồ sơ của tôi', caption: 'Thông tin cá nhân', icon: UserRound }, { to: '/account/orders', title: 'Đơn hàng', caption: 'Theo dõi & quản lý', icon: Package }, { to: '/account/security', title: 'Đổi mật khẩu', caption: 'Bảo mật tài khoản', icon: ShieldCheck }];
export default function ApiCustomerLayout() {
  const load = useCallback((signal: AbortSignal) => request<CustomerProfile>('/auth/me', { signal }), []);
  const session = useAsyncResource(load), navigate = useNavigate(), location = useLocation();
  const [avatarVersion, setAvatarVersion] = useState(Date.now()), [busy, setBusy] = useState(false), [error, setError] = useState('');
  // Validate a returning session without unmounting a form or its file chooser.
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { void request('/auth/me', { signal: controller.signal }).catch(cause => {
      if (cause instanceof HttpError && cause.status === 401) navigate('/login', { replace: true });
    }); };
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.removeEventListener('focus', refresh); };
  }, [navigate]);
  if (session.error instanceof HttpError && session.error.status === 401) return <Navigate to="/login" replace />;
  if (!session.data) return <AsyncState error={session.error} onRetry={session.retry} />;
  if (location.hash === '#security') return <Navigate to="/account/security" replace />;
  const profile = session.data;
  return <div className="ui-container customer-area">
    <div className="customer-breadcrumb"><Link to="/"><ArrowLeft size={16} /> Về cửa hàng</Link><span>Tài khoản Aura</span></div>
    <div className="customer-grid">
      <aside className="customer-sidebar">
        <div className="customer-identity"><CustomerAvatar name={profile.fullName} version={avatarVersion} /><div><p className="text-xs text-secondary">Xin chào,</p><p className="mt-1 font-semibold break-words">{profile.fullName}</p></div></div>
        <nav aria-label="Điều hướng tài khoản" className="customer-nav">{links.map(({ to, title, caption, icon: Icon }) => <NavLink to={to} end={to === '/account'} key={to} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon size={20} /><span><strong>{title}</strong><small>{caption}</small></span><ArrowUpRight className="customer-nav-arrow" size={16} /></NavLink>)}</nav>
        <button type="button" className="customer-logout" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await request('/auth/logout', { method: 'POST' }); navigate('/login', { replace: true }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><LogOut size={18} />{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
        {error && <p role="alert" className="text-sm text-danger p-4">{error}</p>}
      </aside>
      <div className="customer-content"><Outlet context={{ profile, avatarVersion, refreshAvatar: () => setAvatarVersion(Date.now()) } satisfies Context} /></div>
    </div>
  </div>;
}
