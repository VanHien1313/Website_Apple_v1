import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
export default function AccountLayout() {
  const [, tick] = useState(0); const location = useLocation(); const navigate = useNavigate();
  useEffect(() => { const timer = setInterval(() => tick((v) => v + 1), 15000); return () => clearInterval(timer); }, []);
  let user; try { user = customerService.current(); } catch (e) { return <div className="ui-container py-12"><Alert tone="danger" title="Không đọc được phiên">{(e as Error).message}<Button onClick={() => { customerService.logout(); navigate('/login'); }}>Đăng xuất</Button></Alert></div>; }
  if (!user) return <Navigate to="/login" replace />;
  return <div className="ui-container space-y-6 py-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-secondary">TÀI KHOẢN DEMO</p><p className="mt-2 text-lg font-bold">{user.fullName}</p></div><Button variant="secondary" onClick={() => { customerService.logout(); navigate('/login', { replace: true }); }}>Đăng xuất tài khoản</Button></div><nav aria-label="Tài khoản khách hàng" className="flex flex-wrap gap-3 border-b border-border-subtle pb-4">{[['/account/orders', 'Đơn hàng của tôi'], ['/account/security', 'Đổi mật khẩu']].map(([to, name]) => <Link key={to} className={`rounded-md px-4 py-3 text-sm font-semibold ${location.pathname.startsWith(to) ? 'bg-accent-light text-accent' : 'text-secondary'}`} to={to}>{name}</Link>)}</nav><Outlet /></div>;
}
