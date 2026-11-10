import React, { useState, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { Footer } from './Footer';
import { AsyncState } from '../common/AsyncState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { isApiMode } from '../../config/dataSource';

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Scroll to top automatically when navigating between pages
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary transition-colors duration-200">
      <a href="#main-content" className="ui-skip-link">Đến nội dung chính</a>
      <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {isApiMode && (location.pathname === '/account' || location.pathname.startsWith('/account/')) && <nav aria-label="Điều hướng tài khoản" className="ui-container flex flex-wrap gap-2 border-b border-border-subtle py-4">{[['/account', 'Hồ sơ của tôi'], ['/account/orders', 'Đơn hàng']].map(([to, label]) => <NavLink key={to} to={to} end={to === '/account'} className={({ isActive }) => `rounded-xl px-4 py-3 text-sm font-semibold ${isActive ? 'bg-accent-light text-accent' : 'text-secondary hover:bg-surface-subtle'}`}>{label}</NavLink>)}<a href="/account#security" className="rounded-xl px-4 py-3 text-sm font-semibold text-secondary hover:bg-surface-subtle">Đổi mật khẩu</a></nav>}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<AsyncState />}><Outlet /></Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};
