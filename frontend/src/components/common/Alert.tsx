import { Info, CircleCheck, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
export function Alert({ title, children, tone = 'info' }: { title: string; children?: ReactNode; tone?: 'info' | 'success' | 'danger' | 'warning' }) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'info' ? Info : TriangleAlert;
  const styles = { info: 'bg-accent-light text-accent', success: 'bg-success-soft text-success', danger: 'bg-danger-soft text-danger', warning: 'bg-warning-soft text-warning' };
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg p-4 text-sm ${styles[tone]}`}>
    <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">{title}</p>{children && <div className="mt-1 leading-relaxed">{children}</div>}</div>
  </div>;
}
