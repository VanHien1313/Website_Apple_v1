import { useState, type FormEvent } from 'react';
import { Input } from '../common/FormControls';
import { Button } from '../common/Button';

interface UploadedImage { url: string; width: number; height: number; bytes: number }
export function ApiImageUpload() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget, file = new FormData(form).get('image');
    setError('');
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Chọn ảnh PNG, JPEG hoặc WebP không quá 5 MB.'); return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/v1/admin/media', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type, 'X-Aura-Request': '1' }, body: file });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? 'Không tải được ảnh. Hãy thử lại.');
      if (!data || typeof data.url !== 'string' || !/^\/api\/v1\/media\/[a-f0-9-]+$/.test(data.url)) throw new Error('Phản hồi ảnh không hợp lệ.');
      setUploaded(data); form.reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được ảnh.'); }
    finally { setBusy(false); }
  }
  return <section className="ui-panel space-y-5 p-6 sm:p-8" aria-labelledby="upload-title">
    <h2 id="upload-title" className="text-xl font-bold">Tải ảnh sản phẩm</h2>
    <p className="text-sm leading-6 text-secondary">PNG, JPEG hoặc WebP; tối đa 5 MB và 16 megapixel. Ảnh tải lên có đường dẫn công khai. Sao chép đường dẫn vào ô ảnh đại diện, bộ ảnh hoặc ảnh màu trong form sản phẩm.</p>
    <form onSubmit={upload} className="space-y-4" aria-busy={busy}><Input label="Chọn ảnh sản phẩm" name="image" type="file" accept="image/png,image/jpeg,image/webp" required disabled={busy} /><Button type="submit" disabled={busy}>{busy ? 'Đang tải ảnh…' : 'Tải ảnh lên'}</Button></form>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {uploaded && <div className="space-y-4"><p role="status" className="text-sm text-success">Đã lưu ảnh ({uploaded.width} × {uploaded.height}).</p><img src={uploaded.url} alt="Ảnh sản phẩm vừa tải lên" className="max-h-64 w-full rounded-lg bg-surface-subtle object-contain" /><Input label="Đường dẫn ảnh" value={uploaded.url} readOnly onFocus={(event) => event.target.select()} hint="Chọn và sao chép đường dẫn để sử dụng sau." /></div>}
  </section>;
}
