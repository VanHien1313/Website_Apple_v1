import { useRef, useState } from 'react';
import { Camera, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { CustomerAvatar, useCustomerAccount } from './ApiCustomerLayout';
import { Button } from '../components/common/Button';
export default function ApiCustomerProfile() {
  const { profile, avatarVersion, refreshAvatar } = useCustomerAccount();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function update(file?: File) {
    if (busy) return;
    setError(''); setNotice('');
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/v1/auth/avatar', { method: file ? 'PUT' : 'DELETE', credentials: 'same-origin', headers: { 'X-Aura-Request': '1', ...(file ? { 'Content-Type': file.type } : {}) }, body: file });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message ?? 'Chưa cập nhật được ảnh.'); }
      refreshAvatar(); setNotice(file ? 'Đã lưu ảnh đại diện.' : 'Đã xóa ảnh đại diện.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  const fields = [{ label: 'Họ và tên', value: profile.fullName, icon: UserRound }, { label: 'Email', value: profile.email, icon: Mail }, { label: 'Số điện thoại', value: profile.phone, icon: Phone }, { label: 'Thành viên từ', value: new Intl.DateTimeFormat('vi-VN').format(new Date(profile.createdAt)), icon: UserRound }];
  return <section>
    <header className="customer-heading"><p>KHÔNG GIAN CỦA BẠN</p><h1>Hồ sơ của tôi</h1><span>Thông tin cá nhân và địa chỉ nhận hàng của bạn tại Aura.</span></header>
    <div className="customer-profile-card">
      <div className="customer-profile-banner"><span>Aura.</span><span>THIẾT BỊ HAY. TRẢI NGHIỆM RIÊNG.</span></div>
      <div className="customer-profile-body">
        <div className="customer-avatar-editor"><CustomerAvatar name={profile.fullName} version={avatarVersion} large /><div><h2>{profile.fullName}</h2><p className="text-sm text-secondary mt-1 break-all">{profile.email}</p><div className="flex flex-wrap gap-2 mt-4"><Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}><Camera size={16} /> {busy ? 'Đang lưu…' : 'Thay ảnh đại diện'}</Button><Button variant="ghost" disabled={busy} onClick={() => update()}>Xóa ảnh</Button></div><p className="text-xs text-secondary mt-3">JPG, PNG hoặc WebP · Tối đa 5 MB · Ảnh được cắt vuông.</p><input ref={input} type="file" aria-label="Chọn ảnh đại diện" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={e => { const file = e.target.files?.[0]; if (file) void update(file); }} /></div></div>
        {error && <p role="alert" className="text-sm text-danger mt-4">{error}</p>}{notice && <p role="status" className="text-sm text-success mt-4">{notice}</p>}
        <div className="customer-section-label"><h2>Thông tin cá nhân</h2><span>Hồ sơ tài khoản</span></div>
        <dl className="customer-fields">{fields.map(({ label, value, icon: Icon }) => <div key={label}><dt><Icon size={16} />{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>
      </div>
    </div>
    <section className="customer-address"><span className="customer-address-icon"><MapPin size={22} /></span><div><h2>Địa chỉ mặc định <span>Nhận hàng</span></h2><p>{profile.shippingAddress ? [profile.shippingAddress.address, profile.shippingAddress.ward, profile.shippingAddress.province].join(', ') : 'Chưa có địa chỉ mặc định.'}</p><small>Bạn có thể chọn địa chỉ nhận hàng khác khi thanh toán.</small></div></section>
  </section>;
}
