import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Drawer } from '../common/Overlay';
import { ThemeToggle } from '../common/ThemeToggle';
import { storeNavigation } from './navigation';
export function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <Drawer open={isOpen} onClose={onClose} side="left" title="Khám phá Aura" footer={<ThemeToggle showLabel />}>
    <nav aria-label="Điều hướng di động" className="space-y-2">{storeNavigation.map((item) => <Link key={item.to} to={item.to} onClick={onClose} className="flex items-center justify-between rounded-lg px-3 py-4 text-lg font-semibold hover:bg-surface-subtle">{item.label}<ArrowUpRight size={18} aria-hidden="true" /></Link>)}<Link to="/cart" onClick={onClose} className="block border-t border-border-subtle px-3 py-4 text-sm">Giỏ hàng của bạn</Link></nav>
  </Drawer>;
}
