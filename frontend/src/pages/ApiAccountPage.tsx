import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { request, HttpError } from '../services/api/http';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { Input } from '../components/common/FormControls';
import { Button } from '../components/common/Button';
import { ApiImageUpload } from '../components/admin/ApiImageUpload';

interface Profile { id: string; email: string; fullName?: string; name?: string; role?: string; phone?: string; createdAt?: string }

/** Every protected entry checks the server session. Browser demo identities are never consulted. */
export default function ApiAccountPage() {
  const location = useLocation(), navigate = useNavigate();
  const admin = location.pathname.startsWith('/admin');
  const registering = location.pathname === '/register';
  const signingIn = registering || location.pathname.endsWith('/login');
  const loginPath = admin ? '/admin/login' : '/login';
  const accountPath = admin ? '/admin' : '/account';
  const base = admin ? '/admin/auth' : '/auth';
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async (signal: AbortSignal) => {
    if (signingIn) return null;
    try { return await request<Profile>(`${base}/me`, { signal }); }
    catch (cause) { if (cause instanceof HttpError && cause.status === 401) return null; throw cause; }
  }, [base, signingIn, location.key]);
  const session = useAsyncResource(load);
  useEffect(() => {
    if (!session.loading && session.data && location.hash === '#security') document.getElementById('security')?.scrollIntoView();
  }, [session.loading, session.data, location.hash]);
  useEffect(() => { setError(''); }, [location.key]);
  useEffect(() => {
    if (signingIn) return;
    const refresh = () => { if (document.visibilityState === 'visible') session.retry(); };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { window.removeEventListener('focus', refresh); clearInterval(timer); };
  }, [signingIn, session.retry]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget, fields = new FormData(form);
    const value = (key: string) => String(fields.get(key) ?? '');
    setBusy(true); setError(''); setNotice('');
    try {
      if (registering) {
        if (value('password') !== value('confirm')) throw new Error('Mật khẩu xác nhận chưa khớp.');
        await request('/auth/register', { method: 'POST', body: { fullName: value('fullName'), phone: value('phone'), email: value('email'), password: value('password') } });
        form.reset(); setNotice('Đã tạo tài khoản. Bạn có thể đăng nhập.'); navigate('/login', { replace: true });
      } else if (signingIn) {
        await request(`${base}/login`, { method: 'POST', body: { email: value('email'), password: value('password') } });
        form.reset(); navigate(accountPath, { replace: true });
      } else {
        if (value('newPassword') !== value('confirm')) throw new Error('Mật khẩu xác nhận chưa khớp.');
        await request(`${base}/password`, { method: 'PUT', body: { oldPassword: value('oldPassword'), newPassword: value('newPassword') } });
        form.reset(); setNotice('Đã đổi mật khẩu và kết thúc các phiên đăng nhập. Vui lòng đăng nhập lại.'); navigate(loginPath, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa xử lý được yêu cầu.');
      if (!signingIn && cause instanceof HttpError && cause.status === 401) session.retry();
    } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await request(`${base}/logout`, { method: 'POST' }); navigate(loginPath, { replace: true }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa đăng xuất được.'); }
    finally { setBusy(false); }
  }
  if (session.loading || session.error) return <AsyncState error={session.error} onRetry={session.retry} />;
  if (!signingIn && !session.data) return <Navigate to={loginPath} replace />;
  const title = registering ? 'Tạo tài khoản Aura' : signingIn ? (admin ? 'Đăng nhập quản trị' : 'Chào mừng trở lại') : 'Tài khoản của bạn';
  return <section className="ui-container py-12"><div className="mx-auto max-w-lg space-y-6">
    <Link to="/" className="text-sm font-semibold text-accent">← Về cửa hàng</Link>
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    {signingIn && <div className="space-y-4">
      <div role="group" aria-label="Chọn loại tài khoản" className="grid grid-cols-2 gap-1 rounded-2xl border border-border-subtle bg-surface-subtle p-1">
        {[{ isAdmin: false, label: 'Khách hàng', to: '/login' }, { isAdmin: true, label: 'Quản trị viên', to: '/admin/login' }].map((choice) => <button
          key={choice.to} type="button" disabled={busy} aria-pressed={admin === choice.isAdmin}
          onClick={() => { if (admin !== choice.isAdmin) { setError(''); setNotice(''); navigate(choice.to); } }}
          className={`min-h-12 rounded-xl px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${admin === choice.isAdmin ? 'bg-background text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}
        >{choice.label}</button>)}
      </div>
      <p className="text-sm leading-6 text-secondary">{admin ? 'Dành cho đội ngũ vận hành Aura. Sử dụng tài khoản quản trị được cấp để tiếp tục.' : 'Đăng nhập hoặc tạo tài khoản để theo dõi đơn hàng và quản lý thông tin của bạn.'}</p>
    </div>}
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {!signingIn && <div className="ui-panel space-y-3 p-6"><p className="font-semibold">{session.data?.fullName ?? session.data?.name}</p><p className="text-sm text-secondary">{session.data?.email}</p>{session.data?.role && <p className="text-sm">Vai trò: {session.data.role}</p>}<Button variant="outline" disabled={busy} onClick={logout}>Đăng xuất</Button></div>}
    {!signingIn && !admin && <dl className="ui-panel grid gap-5 p-6 sm:grid-cols-2"><div><dt className="text-sm text-secondary">Số điện thoại</dt><dd className="mt-2 font-semibold">{session.data?.phone || 'Chưa có thông tin'}</dd></div><div><dt className="text-sm text-secondary">Ngày tham gia</dt><dd className="mt-2 font-semibold">{session.data?.createdAt ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(session.data.createdAt)) : 'Chưa có thông tin'}</dd></div></dl>}
    {!signingIn && <Link to={admin ? '/admin/orders' : '/account/orders'} className="block rounded-xl border border-border p-5 font-semibold text-accent">{admin ? 'Quản lý đơn hàng →' : 'Đơn hàng của bạn →'}</Link>}
    {!signingIn && admin && <Link to="/admin/reports" className="block rounded-xl border border-border p-5 font-semibold text-accent">Báo cáo doanh thu →</Link>}
    {!signingIn && admin && <Link to="/admin/categories" className="block rounded-xl border border-border p-5 font-semibold text-accent">Quản lý danh mục →</Link>}
      {!signingIn && admin && <Link to="/admin/products" className="block rounded-xl border border-border p-5 font-semibold text-accent">Quản lý sản phẩm →</Link>}
      {!signingIn && admin && <Link to="/admin/customers" className="block rounded-xl border border-border p-5 font-semibold text-accent">Tra cứu khách hàng →</Link>}
      {!signingIn && admin && session.data?.role === 'owner' && <Link to="/admin/users" className="block rounded-xl border border-border p-5 font-semibold text-accent">Tài khoản quản trị →</Link>}
    {!signingIn && admin && <ApiImageUpload />}
    <form id={!signingIn ? 'security' : undefined} key={location.pathname} onSubmit={submit} className="ui-panel scroll-mt-40 space-y-5 p-6 sm:p-8" aria-busy={busy}>
      {!signingIn && <h2 className="text-xl font-bold">Đổi mật khẩu</h2>}
      <fieldset disabled={busy} className="space-y-5">
        {registering && <><Input label="Họ và tên" name="fullName" required maxLength={120} autoComplete="name" /><Input label="Số điện thoại" name="phone" type="tel" required autoComplete="tel" /></>}
        {signingIn ? <><Input label="Email" name="email" type="email" autoComplete="username" required maxLength={254} /><Input label="Mật khẩu" name="password" type="password" required minLength={12} maxLength={128} autoComplete={registering ? 'new-password' : 'current-password'} hint="Từ 12 đến 128 ký tự." /></> : <><Input label="Mật khẩu hiện tại" name="oldPassword" type="password" required autoComplete="current-password" /><Input label="Mật khẩu mới" name="newPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></>}
        {(registering || !signingIn) && <Input label="Xác nhận mật khẩu" name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Đang xử lý…' : registering ? 'Tạo tài khoản' : signingIn ? 'Đăng nhập' : 'Lưu mật khẩu mới'}</Button>
      </fieldset>
    </form>
    {signingIn && !admin && <Link to={registering ? '/login' : '/register'} className="block text-center text-sm font-semibold text-accent">{registering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</Link>}
  </div></section>;
}
