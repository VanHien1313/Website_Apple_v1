import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, getAdminSession, logoutDemo } from '../../services/adminService';
import { Button } from '../common/Button';
import { Dialog } from '../common/Overlay';
import { Alert } from '../common/Alert';
export function ResetCatalog() {
  const [open, setOpen] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  if (getAdminSession()?.role !== 'owner') return null;
  return <><Button variant="secondary" onClick={() => { setError(''); setOpen(true); }}>Khôi phục catalog mẫu</Button><Dialog open={open} onClose={() => !busy && setOpen(false)} title="Khôi phục dữ liệu mẫu?" footer={<><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Giữ dữ liệu hiện tại</Button><Button loading={busy} onClick={async () => { setBusy(true); try { await adminService.resetCatalog(); logoutDemo(); navigate('/admin/login', { replace: true }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Xác nhận khôi phục</Button></>}><p>Thay toàn bộ sản phẩm, danh mục và hồ sơ admin demo bằng dữ liệu gốc, sau đó đăng xuất. Các chỉnh sửa catalog sẽ mất. Đơn đã lưu và giỏ hàng vẫn giữ; giỏ sẽ được kiểm tra lại khi mở.</p>{error && <Alert tone="danger" title="Chưa khôi phục được">{error}</Alert>}</Dialog></>;
}
