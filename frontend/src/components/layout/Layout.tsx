import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { Footer } from './Footer';
import { AsyncState } from '../common/AsyncState';
import { ErrorBoundary } from '../common/ErrorBoundary';

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
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<AsyncState />}><Outlet /></Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};
