import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingBag, UserRound } from 'lucide-react';
import { useCartState } from '../../store/CartContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { StoreSearch } from './StoreSearch';
import { storeNavigation } from './navigation';
export function Header({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { itemCount } = useCartState();
  return <header className="sticky top-0 z-40 border-b border-border-subtle bg-background">
    <div className="ui-container grid grid-cols-[auto_1fr] items-center gap-3 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-10">
      <div className="flex items-center gap-2"><button className="ui-icon-button lg:hidden" type="button" onClick={onOpenMobileMenu} aria-label="Mở menu" aria-haspopup="dialog"><Menu size={21} /></button>
        <Link to="/" aria-label="Aura, trang chủ" className="text-3xl font-bold tracking-[-0.07em]">aura<span className="text-accent">.</span></Link>
      </div>
      <div className="order-3 col-span-2 md:order-none md:col-span-1"><StoreSearch /></div>
      <div className="flex items-center justify-end gap-2"><ThemeToggle /><Link to="/account/orders" aria-label="Tài khoản khách hàng" className="ui-icon-button"><UserRound size={20} aria-hidden="true" /></Link><Link to="/cart" className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-surface-subtle" aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}><ShoppingBag size={20} aria-hidden="true" /><span className="hidden sm:inline">Giỏ hàng</span><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-light px-1 text-xs text-accent">{itemCount}</span></Link></div>
    </div>
    <div className="hidden border-t border-border-subtle lg:block"><div className="ui-container flex items-center justify-between">
      <nav aria-label="Danh mục sản phẩm" className="flex gap-8">{storeNavigation.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `border-b-2 py-3.5 text-sm font-semibold ${isActive ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>{item.label}</NavLink>)}</nav>
      <nav aria-label="Thông tin cửa hàng" className="flex gap-6 text-sm text-secondary"><Link to="/about" className="py-3 hover:text-accent">Về Aura</Link><Link to="/contact" className="py-3 hover:text-accent">Liên hệ</Link></nav>
    </div></div>
  </header>;
}
