import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { Input } from '../components/common/FormControls';
import { Alert } from '../components/common/Alert';
import { Button } from '../components/common/Button';
export default function AccountSecurityPage() {
  const [old, setOld] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  return <section className="ui-panel max-w-xl space-y-6 p-6 sm:p-8"><h1 className="ui-page-title">Đổi mật khẩu mẫu</h1><p className="text-sm leading-7 text-secondary">Chỉ dùng chuỗi mẫu. Sau khi đổi thành công, các phiên cũ bị vô hiệu và bạn cần đăng nhập lại.</p><form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); if (busy) return; setBusy(true); setError(''); try { if (password !== confirm) throw new Error('Hai mật khẩu chưa khớp.'); await customerService.changePassword(old, password); navigate('/login?changed=1', { replace: true }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{error && <Alert tone="danger" title="Chưa đổi được mật khẩu">{error}</Alert>}<fieldset disabled={busy} className="space-y-5"><Input label="Mật khẩu hiện tại" required type="password" autoComplete="current-password" value={old} onChange={(e) => setOld(e.target.value)} /><Input label="Mật khẩu mẫu mới" required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><Input label="Nhập lại mật khẩu mới" required type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /><Button type="submit" loading={busy}>Lưu mật khẩu mẫu</Button></fieldset></form></section>;
}
