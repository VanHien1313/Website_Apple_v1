import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { catalogRepository } from '../../services/mock/catalogRepository';
import { loginDemo } from '../../services/adminService';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
const load = async () => catalogRepository.read().users.filter((u) => u.active);
export default function AdminLoginPage() {
  const { data, error, retry } = useAsyncResource(load); const [failure, setFailure] = useState(''); const navigate = useNavigate();
  return <main className="min-h-screen bg-surface-subtle px-4 py-16"><div className="ui-panel mx-auto max-w-lg space-y-7 p-6 sm:p-10"><Link to="/" className="text-3xl font-bold tracking-tighter">aura.</Link><div><p className="mb-3 text-sm text-accent">KHÔNG GIAN QUẢN TRỊ</p><h1 className="ui-page-title">Đăng nhập demo</h1><p className="mt-4 text-sm leading-relaxed text-secondary">Chọn hồ sơ để thử quy trình quản lý. Phiên hết hạn sau 60 phút. Đây không phải xác thực thật; không nhập mật khẩu thật.</p></div>{(error || failure) && <Alert tone="danger" title="Chưa đăng nhập được">{failure || error?.message}<Button onClick={retry}>Thử lại</Button></Alert>}<div className="space-y-3">{data?.map((u) => <button key={u.id} className="ui-panel w-full p-4 text-left hover:border-accent" onClick={() => { try { loginDemo(u.id); navigate('/admin', { replace: true }); } catch (e) { setFailure((e as Error).message); } }}><span className="block font-semibold">{u.name}</span><span className="mt-1 block break-all text-sm text-secondary">{u.email} · {u.role === 'owner' ? 'Chủ cửa hàng' : 'Biên tập viên'}</span></button>)}</div><Link to="/" className="text-sm text-accent">← Về cửa hàng</Link></div></main>;
}
