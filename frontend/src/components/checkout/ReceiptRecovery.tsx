import { useState, type FormEvent } from 'react';
import { KeyRound, Link2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/FormControls';
import { currentReceipt, parseRecoveryInput, recoveryLink } from '../../services/api/receiptRecovery';
import { saveReceipt } from '../../services/api/orderService';

/** Hiện sau khi đặt hàng: lưu liên kết để mở lại đơn khi đóng tab hoặc đổi thiết bị. */
export function ReceiptRecoveryPanel({ id }: { id: string }) {
  const token = currentReceipt(id);
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  if (!token) return null;
  const link = recoveryLink(window.location.origin, id, token);
  async function copy() {
    try { await navigator.clipboard.writeText(link); setState('copied'); } catch { setState('failed'); }
  }
  return <section className="ui-panel mt-6 space-y-4 p-6" aria-labelledby="receipt-recovery-title">
    <h2 id="receipt-recovery-title" className="flex items-center gap-2 text-lg font-bold"><Link2 className="h-5 w-5 text-accent" aria-hidden="true" />Lưu liên kết xem lại đơn</h2>
    <p className="text-sm leading-6 text-secondary">Dành cho khách không đăng nhập. Nếu đóng tab, bạn sẽ mất quyền xem đơn này. Hãy lưu liên kết bên dưới ở nơi an toàn. Ai có liên kết đều xem được đơn, vì vậy đừng đăng công khai.</p>
    <Input label="Liên kết khôi phục" value={link} readOnly onFocus={(event) => event.currentTarget.select()} />
    <div className="flex flex-wrap items-center gap-4"><Button variant="outline" onClick={copy}>Sao chép liên kết</Button>
      <p role="status" className="text-sm text-secondary">{state === 'copied' ? 'Đã sao chép.' : state === 'failed' ? 'Không sao chép được. Hãy chọn và sao chép thủ công trong ô trên.' : ''}</p></div>
  </section>;
}

/** Hiện khi không tải được đơn: dán liên kết hoặc mã khôi phục đã lưu để mở lại. */
export function ReceiptRestoreForm({ id, onRestored }: { id: string; onRestored: () => void }) {
  const [value, setValue] = useState(''), [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const token = parseRecoveryInput(value);
    if (!token) { setError('Liên kết hoặc mã khôi phục không hợp lệ. Mã gồm 64 ký tự 0–9 và a–f.'); return; }
    try { saveReceipt(id, token); } catch { setError('Không lưu được vào tab này. Hãy bật lưu trữ trình duyệt rồi thử lại.'); return; }
    setError(''); setValue(''); onRestored();
  }
  return <form onSubmit={submit} className="ui-panel mt-6 space-y-4 p-6" noValidate>
    <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-accent" aria-hidden="true" />Mở lại đơn bằng liên kết khôi phục</h2>
    <Input label="Liên kết hoặc mã khôi phục" value={value} onChange={(event) => setValue(event.target.value)} error={error || undefined} autoComplete="off" spellCheck={false} required />
    <Button type="submit">Mở đơn hàng</Button>
  </form>;
}
