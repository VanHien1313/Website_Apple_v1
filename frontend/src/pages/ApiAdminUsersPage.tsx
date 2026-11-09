import { ListOptions, listSearchParams } from '../components/admin/ListOptions';
import { useCallback, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { request, HttpError } from '../services/api/http';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { Input, Select, Checkbox } from '../components/common/FormControls';
import { Button } from '../components/common/Button';
import { AsyncState } from '../components/common/AsyncState';
interface Admin { id: string; email: string; name: string; role: 'owner' | 'editor'; active: boolean; revision: string }
interface Accounts { items: Admin[]; total: number; page: number; pageSize: number; actorId: string }
type Mutate = (path: string, body: unknown, method: 'POST' | 'PUT') => Promise<boolean>;
export default function ApiAdminUsersPage() {
  const [params, setParams] = useSearchParams(), query = params.toString();
  const load = useCallback((signal: AbortSignal) => request<Accounts>(`/admin/users?${query}`, { signal }), [query]);
  const { data, loading, error, retry } = useAsyncResource(load);
  const [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [issue, setIssue] = useState(''), [notice, setNotice] = useState(''), [unauthorized, setUnauthorized] = useState(false), [forbidden, setForbidden] = useState(false);
  const sending = useRef(false);
  const refresh = () => { setLocked(false); setIssue(''); retry(); };
  const mutate: Mutate = async (path, body, method) => {
    if (sending.current || locked) return false;
    sending.current = true; setBusy(true); setIssue(''); setNotice('');
    try { await request(path, { method, body, signal: AbortSignal.timeout(30000) }); setNotice(method === 'POST' ? 'Đã tạo tài khoản quản trị.' : 'Đã cập nhật tài khoản.'); retry(); return true; }
    catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) setUnauthorized(true);
      if (cause instanceof HttpError && cause.status === 403) setForbidden(true);
      const uncertain = !(cause instanceof HttpError) || cause.status >= 500 || ['STALE_ACCOUNT', 'NOT_FOUND'].includes(cause.code);
      setLocked(uncertain); setIssue(`${cause instanceof Error ? cause.message : 'Không xác định được kết quả lưu.'}${uncertain ? ' Tải lại danh sách để kiểm tra trước khi thao tác tiếp; thay đổi chưa lưu sẽ được bỏ.' : ''}`);
      return false;
    } finally { sending.current = false; setBusy(false); }
  };
  if (unauthorized || (error instanceof HttpError && error.status === 401)) return <Navigate to="/admin/login" replace />;
  function turn(page: number) { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); }
  return <main className="ui-container py-10"><Link to="/admin" className="text-sm font-semibold text-accent">← Tài khoản quản trị</Link><header className="my-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Aura · Đội ngũ</p><h1 className="ui-page-title mt-3">Tài khoản quản trị</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-secondary">Chủ cửa hàng quản lý quyền truy cập. Biên tập viên vận hành sản phẩm, đơn hàng và báo cáo. Khóa tài khoản hoặc đổi quyền sẽ yêu cầu người đó đăng nhập lại.</p></header>
    {forbidden || (error instanceof HttpError && error.status === 403) ? <div role="alert" className="ui-panel p-6">Chỉ chủ cửa hàng được quản lý tài khoản quản trị.</div> : loading ? <AsyncState /> : error ? <div role="alert" className="space-y-4"><p>{error.message}</p><Button onClick={retry}>Thử lại</Button></div> : data && <>
      <form className="ui-panel mb-8 space-y-5 p-5 sm:p-7" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget, fields = new FormData(form), email = String(fields.get('email') ?? '').trim(); const success = await mutate('/admin/users', { email, name: fields.get('name'), password: fields.get('password'), role: fields.get('role'), active: true }, 'POST'); const password = form.elements.namedItem('password'); if (password instanceof HTMLInputElement) password.value = ''; if (success) { form.reset(); setParams({ q: email }); } }}><h2 className="text-xl font-bold">Thêm thành viên</h2><fieldset disabled={busy || locked} className="grid gap-5 sm:grid-cols-2"><Input label="Tên thành viên mới" name="name" required maxLength={120} autoComplete="off" /><Input label="Email thành viên mới" name="email" type="email" required maxLength={254} autoComplete="off" /><Input label="Mật khẩu ban đầu" name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" hint="12–128 ký tự. Không lưu vào bộ nhớ trình duyệt." /><Select label="Vai trò thành viên mới" name="role" defaultValue="editor"><option value="editor">Biên tập viên</option><option value="owner">Chủ cửa hàng — quản lý tài khoản</option></Select><Button className="sm:col-span-2 sm:justify-self-start" type="submit" loading={busy}>Tạo tài khoản</Button></fieldset></form>
      {notice && <p role="status" className="mb-5 text-success">{notice}</p>}{issue && <div role="alert" className="ui-panel mb-5 space-y-4 p-5"><p className="text-danger">{issue}</p>{locked && <Button onClick={refresh}>Tải lại để kiểm tra</Button>}</div>}
      <form key={query} className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); setParams(listSearchParams(e.currentTarget)); }}><ListOptions kind="users" params={params} /><Input label="Tìm tài khoản" name="q" defaultValue={params.get('q') ?? ''} maxLength={120} placeholder="Tên hoặc email" /><Button type="submit" disabled={busy}>Tìm kiếm</Button><Button variant="outline" disabled={busy} onClick={refresh}>Tải lại danh sách</Button></form>
      <p className="mb-4 text-sm text-secondary">{data.total} tài khoản quản trị</p><div className="space-y-5">{data.items.map((account) => <Account key={`${account.id}:${account.revision}`} account={account} own={account.id.toLowerCase() === data.actorId.toLowerCase()} disabled={busy || locked} mutate={mutate} />)}{!data.items.length && <p className="ui-panel p-6">Không có tài khoản phù hợp.</p>}</div><nav aria-label="Phân trang tài khoản" className="mt-8 flex items-center justify-between gap-3"><Button variant="outline" disabled={busy || data.page <= 1} onClick={() => turn(data.page - 1)}>Trang trước</Button><span>{data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button variant="outline" disabled={busy || data.page * data.pageSize >= data.total} onClick={() => turn(data.page + 1)}>Trang sau</Button></nav>
    </>}
  </main>;
}
function Account({ account, own, disabled, mutate }: { account: Admin; own: boolean; disabled: boolean; mutate: Mutate }) {
  const [name, setName] = useState(account.name), [role, setRole] = useState(account.role), [active, setActive] = useState(account.active), [confirmed, setConfirmed] = useState(false);
  const sensitive = role !== account.role || active !== account.active;
  return <article aria-label={`Tài khoản ${account.email}`} className="ui-panel space-y-5 p-5 sm:p-7"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="break-all font-bold">{account.email}</h2><p className="mt-2 text-sm text-secondary">{account.active ? 'Đang hoạt động' : 'Đã khóa'}{own ? ' · Bạn đang đăng nhập' : ''}</p></div><span className="text-sm font-semibold text-accent">{account.role === 'owner' ? 'Chủ cửa hàng' : 'Biên tập viên'}</span></div><form onSubmit={(e) => { e.preventDefault(); if (!sensitive || confirmed) void mutate(`/admin/users/${account.id}`, { name, role, active, revision: account.revision }, 'PUT'); }}><fieldset disabled={disabled} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Input label={`Tên ${account.email}`} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /><Select label={`Vai trò ${account.email}`} value={role} disabled={own} onChange={(e) => { setRole(e.target.value as Admin['role']); setConfirmed(false); }}><option value="editor">Biên tập viên</option><option value="owner">Chủ cửa hàng</option></Select></div><Checkbox label={`Cho phép đăng nhập ${account.email}`} disabled={own} checked={active} onChange={(e) => { setActive(e.target.checked); setConfirmed(false); }} />{own && <p className="text-sm text-secondary">Không thể tự khóa hoặc hạ quyền tài khoản hiện tại.</p>}{sensitive && <Checkbox label={`Xác nhận đổi quyền hoặc trạng thái ${account.email} và thu hồi các phiên đăng nhập`} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />}<Button type="submit" variant="outline" disabled={sensitive && !confirmed}>Lưu tài khoản</Button></fieldset></form></article>;
}
