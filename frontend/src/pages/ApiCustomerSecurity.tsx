import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LockKeyhole } from 'lucide-react';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../domain/password';
import { request } from '../services/api/http';
import { Input } from '../components/common/FormControls';
import { Button } from '../components/common/Button';
export default function ApiCustomerSecurity({ admin = false }: { admin?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, data = new FormData(form);
    setError('');
    if (data.get('newPassword') !== data.get('confirm')) { setError('Mật khẩu xác nhận chưa khớp.'); return; }
    setBusy(true);
    try { await request(admin ? '/admin/auth/password' : '/auth/password', { method: 'PUT', body: { oldPassword: data.get('oldPassword'), newPassword: data.get('newPassword') } }); form.reset(); navigate(`${admin ? '/admin/login' : '/login'}?passwordChanged=1`, { replace: true }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section><header className="customer-heading"><p>AN TÂM MỖI LẦN ĐĂNG NHẬP</p><h1>Đổi mật khẩu</h1><span>Bảo vệ tài khoản bằng mật khẩu riêng, chỉ bạn biết.</span></header><div className="customer-security-grid"><form onSubmit={submit} className="customer-security-form ui-panel" aria-busy={busy}><div className="flex items-center gap-3 mb-7"><span className="customer-address-icon"><LockKeyhole size={22} /></span><h2 className="text-lg font-semibold">Cập nhật mật khẩu</h2></div>{error && <p role="alert" className="text-danger text-sm mb-5">{error}</p>}<fieldset disabled={busy} className="space-y-5"><Input label="Mật khẩu hiện tại" name="oldPassword" type="password" required maxLength={128} autoComplete="current-password" /><Input label="Mật khẩu mới" name="newPassword" type="password" required minLength={8} maxLength={128} pattern={PASSWORD_PATTERN} title={PASSWORD_HINT} hint={PASSWORD_HINT} autoComplete="new-password" /><Input label="Xác nhận mật khẩu mới" name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /><Button type="submit" disabled={busy} className="w-full">{busy ? 'Đang cập nhật…' : 'Lưu mật khẩu mới'}</Button></fieldset></form><aside className="customer-security-note"><ShieldCheck size={30} /><h2>Tài khoản được bảo vệ</h2><p>Chọn mật khẩu khác mật khẩu hiện tại và tránh dùng lại mật khẩu của các dịch vụ khác.</p><p>Sau khi đổi thành công, tất cả phiên đăng nhập sẽ kết thúc. Bạn cần đăng nhập lại bằng mật khẩu mới.</p></aside></div></section>;
}
