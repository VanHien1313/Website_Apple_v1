import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LockKeyhole } from 'lucide-react';
export default function StatusPage({ status = 404, home = '/' }: { status?: 403 | 404; home?: string }) {
  const Icon = status === 403 ? LockKeyhole : Compass;
  return <section className="mx-auto max-w-xl px-5 py-20 text-center sm:py-28"><Icon size={48} strokeWidth={1.3} className="mx-auto mb-6 text-accent" aria-hidden="true" /><p className="text-sm font-semibold text-secondary">{status}</p><h1 className="mt-3 text-3xl font-bold tracking-tight">{status === 403 ? 'Bạn chưa có quyền truy cập' : 'Trang này không tồn tại'}</h1><p className="mt-4 text-sm leading-relaxed text-secondary">{status === 403 ? 'Vui lòng liên hệ người quản trị để được cấp quyền phù hợp.' : 'Đường dẫn có thể đã thay đổi. Hãy quay lại để tiếp tục khám phá.'}</p><Link to={home} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent"><ArrowLeft size={16} />Quay về trang chính</Link></section>;
}
