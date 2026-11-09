import { Link } from 'react-router-dom';
import { storeNavigation } from './navigation';
import { isApiMode } from '../../config/dataSource';
export function Footer() {
  return <footer className="mt-20 border-t border-border-subtle bg-surface-subtle">
    <div className="ui-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
      <div><Link to="/" className="text-4xl font-bold tracking-[-0.07em]">aura<span className="text-accent">.</span></Link><p className="mt-4 max-w-xs text-sm leading-relaxed text-secondary">Công nghệ bạn yêu thích.<br />Trải nghiệm được chăm chút.</p></div>
      <nav aria-label="Sản phẩm ở chân trang"><h2 className="mb-4 text-sm font-semibold">Khám phá</h2><ul className="space-y-1">{storeNavigation.map((item) => <li key={item.to}><Link to={item.to} className="inline-block py-2 text-sm text-secondary hover:text-accent">{item.label}</Link></li>)}</ul></nav>
      <div><h2 className="mb-4 text-sm font-semibold">Về Aura</h2><p className="text-sm leading-relaxed text-secondary">{isApiMode ? "Dự án thương mại điện tử phục vụ học tập. Danh mục, tài khoản và đặt hàng COD đã kết nối dịch vụ." : "Dự án thương mại điện tử phục vụ học tập. Sản phẩm, giá và thao tác đặt hàng đang được mô phỏng."}</p><Link to="/admin" className="mt-4 inline-block py-2 text-sm font-semibold text-accent">{isApiMode ? "Không gian quản trị" : "Không gian quản trị demo"}</Link></div>
    </div>
    <div className="ui-container border-t border-border-subtle py-6 text-xs leading-relaxed text-secondary">© {new Date().getFullYear()} Aura. Apple và các tên sản phẩm là nhãn hiệu của Apple Inc.</div>
  </footer>;
}
