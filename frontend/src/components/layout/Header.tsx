import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Menu,
  X,
  ArrowRight,
  User,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Building2,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { useCart } from '../../store/CartContext';
import { productService } from '../../services/productService';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatters';
import { ThemeToggle } from '../common/ThemeToggle';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { itemCount } = useCart();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  // Dropdown states
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  const searchRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Live search query effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await productService.getProducts({ searchQuery });
      setSearchResults(results.slice(0, 5));
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside handling for search, services, account
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(event.target as Node)) {
        setIsServiceOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      setIsMobileSearchExpanded(false);
      navigate(`/iphone?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `transition-all py-1.5 px-3.5 sm:px-5 rounded-lg text-xs sm:text-[14px] font-semibold tracking-tight ${
      isActive
        ? 'text-white bg-white/15 font-bold shadow-2xs border border-white/20'
        : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#0e1726] text-white border-b border-[#1c2638] shadow-md select-none transition-colors">
      {/* ================= ROW 1: BRAND + WIDE SEARCH + ACTIONS ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Mobile Menu Trigger + Brand APR Monogram */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 focus:outline-none cursor-pointer"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group select-none">
            <span className="text-base sm:text-lg lg:text-xl font-black tracking-wider text-white uppercase font-sans">
              AURA STUDIO
            </span>
            <span className="text-white/30 text-base sm:text-lg font-light">|</span>
            <div className="flex items-center gap-1.5 text-white/90">
              <span className="text-lg sm:text-xl"></span>
              <div className="flex flex-col text-[8.5px] sm:text-[9.5px] leading-tight font-medium text-white/80 uppercase tracking-tight">
                <span>Authorised</span>
                <span>Reseller</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Wide Search Bar with High-Contrast White Capsule */}
        <div ref={searchRef} className="hidden md:block flex-1 max-w-xl mx-2 lg:mx-6 relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-500 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Bạn tìm gì..."
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 pl-11 pr-9 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Search Suggestions Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#181a20] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/10 p-2.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-1 flex items-center justify-between">
                  <span>Sản phẩm tìm thấy</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Xem tất cả</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/[0.06] mt-1">
                  {searchResults.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/[0.06] rounded-xl transition-colors group"
                    >
                      <img
                        src={p.thumbnail}
                        alt={p.name}
                        className="w-10 h-10 object-contain rounded-lg bg-gray-50 dark:bg-white/[0.04] p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                          {formatCurrency(p.basePrice)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right: Cart + Account + Flags + Theme */}
        <div className="flex items-center gap-3 sm:gap-5 text-white shrink-0">
          {/* Mobile search toggle icon */}
          <button
            type="button"
            onClick={() => setIsMobileSearchExpanded((prev) => !prev)}
            className="md:hidden p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full focus:outline-none cursor-pointer"
            aria-label="Tìm kiếm"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Giỏ hàng with live badge */}
          <Link
            to="/cart"
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors group relative py-1.5"
            aria-label="Xem giỏ hàng"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 stroke-[1.8]" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-semibold">Giỏ hàng</span>
          </Link>

          {/* Tài khoản with dropdown */}
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setIsAccountOpen((prev) => !prev)}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors py-1.5 cursor-pointer"
              aria-label="Tài khoản"
            >
              <User className="w-5 h-5 stroke-[1.8]" />
              <span className="hidden sm:inline text-xs font-semibold">Tài khoản</span>
            </button>

            {isAccountOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#181a20] text-gray-900 dark:text-white rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/10 p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2 py-1.5 border-b border-gray-100 dark:border-white/[0.08] mb-2">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">Chào mừng quý khách</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">Đăng nhập để nhận ưu đãi APR</div>
                </div>
                <div className="space-y-1">
                  <Link
                    to="/checkout"
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <span>Theo dõi đơn hàng</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <span>Giỏ hàng của tôi</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountOpen(false);
                      setIsServiceOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors text-left"
                  >
                    <span>Tra cứu bảo hành Aura Care</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/[0.08]">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 px-2 flex items-center gap-1.5">
                    <PhoneCall className="w-3 h-3 text-emerald-500" />
                    <span>Hotline: 1900.6868 (Miễn phí)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Language Flag Selector (VN / US) */}
          <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-white/20 select-none">
            <button
              type="button"
              onClick={() => setLanguage('vi')}
              title="Tiếng Việt"
              className={`text-base sm:text-lg transition-transform cursor-pointer ${
                language === 'vi' ? 'scale-115 drop-shadow' : 'opacity-40 hover:opacity-80'
              }`}
            >
              🇻🇳
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              title="English"
              className={`text-base sm:text-lg transition-transform cursor-pointer ${
                language === 'en' ? 'scale-115 drop-shadow' : 'opacity-40 hover:opacity-80'
              }`}
            >
              🇺🇸
            </button>
          </div>

          {/* Theme Toggle (Light / Dark) */}
          <ThemeToggle id="header-theme-toggle" />
        </div>
      </div>

      {/* ================= ROW 2: SUB-NAV CATEGORIES + DỊCH VỤ ================= */}
      <div className="border-t border-white/[0.08] bg-[#090f1b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-2 sm:py-2.5 gap-4">
          {/* Left: ☰ Dịch vụ button */}
          <div className="relative shrink-0" ref={serviceRef}>
            <button
              type="button"
              onClick={() => setIsServiceOpen((prev) => !prev)}
              className="bg-white/12 hover:bg-white/20 text-white px-3.5 sm:px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all border border-white/10 cursor-pointer shadow-2xs"
            >
              <Menu className="w-4 h-4" />
              <span>Dịch vụ</span>
            </button>

            {/* Dịch vụ Dropdown Menu */}
            {isServiceOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-[#181a20] text-gray-900 dark:text-white rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/10 p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">
                  Dịch vụ & Tiện ích Apple
                </div>
                <div className="space-y-1">
                  <div className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Aura Care VIP</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Trung tâm bảo hành Apple chính hãng</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Thu Cũ Đổi Mới</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Trợ giá lên đời máy đến 2.500.000₫</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Trả Góp 0% Lãi Suất</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Qua thẻ tín dụng hoặc CCCD trong 5 phút</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Doanh Nghiệp & Giáo Dục</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Chính sách chiết khấu đối tác B2B & HSSV</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center: Core 4 Apple Categories spread out and balanced */}
          <nav className="flex-1 flex items-center justify-around sm:justify-center sm:gap-14 md:gap-20 lg:gap-28 whitespace-nowrap overflow-x-auto no-scrollbar px-2 sm:px-6">
            <NavLink to="/iphone" className={subNavLinkClass}>
              iPhone
            </NavLink>
            <NavLink to="/ipad" className={subNavLinkClass}>
              iPad
            </NavLink>
            <NavLink to="/mac" className={subNavLinkClass}>
              Mac
            </NavLink>
            <NavLink to="/watch" className={subNavLinkClass}>
              Watch
            </NavLink>
          </nav>

          {/* Right: Quick service indicator for visual symmetry and balance */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-white/70 shrink-0">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Giao hàng 2H</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-white/80 font-medium">
              <span>Hotline: <strong className="text-white">1900.6868</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Row */}
      {isMobileSearchExpanded && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-white/10 bg-[#090f1b] animate-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bạn tìm gì..."
              autoFocus
              className="w-full bg-white text-gray-900 placeholder:text-gray-400 pl-9 pr-8 py-2 text-xs rounded-full border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setIsMobileSearchExpanded(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
