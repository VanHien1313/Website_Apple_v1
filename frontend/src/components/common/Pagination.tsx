import { Button } from './Button';
export function Pagination({ page, pageSize, total, onChange, label = 'Phân trang' }: { page: number; pageSize: number; total: number; onChange: (page: number) => void; label?: string }) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const current = Math.max(1, Math.min(page, pages));
  if (total <= pageSize) return null;
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-5">
    <p className="text-sm text-secondary" aria-live="polite">Trang <span className="font-semibold text-primary">{current}</span> / {pages}</p>
    <div className="flex gap-2"><Button variant="outline" disabled={current === 1} onClick={() => onChange(current - 1)}>Trước</Button><Button variant="outline" disabled={current === pages} onClick={() => onChange(current + 1)}>Sau</Button></div>
  </nav>;
}
