import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  ChevronRight,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-[#161618] border-r border-border-subtle shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header in Midnight Blue-Black */}
        <div className="p-4 bg-[#0e1726] text-white flex items-center justify-between border-b border-[#1c2638]">
          <div className="flex items-center gap-2.5 select-none">
            <span className="text-xl font-bold text-white"></span>
            <div className="h-4 w-[1px] bg-white/20" />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white leading-tight">Aura Studio</span>
              <span className="text-[9px] text-white/70 font-medium uppercase tracking-wider">Authorised Reseller</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Apple Categories ONLY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <div className="text-[11px] font-semibold text-secondary uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Danh mục sản phẩm</span>
            <span className="text-[10px] text-accent font-bold">Chính hãng</span>
          </div>

          <Link
            to="/iphone"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-subtle text-primary font-medium text-sm transition-colors"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-accent" />
              <span>iPhone</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>

          <Link
            to="/ipad"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-subtle text-primary font-medium text-sm transition-colors"
          >
            <div className="flex items-center gap-3">
              <Tablet className="w-5 h-5 text-accent" />
              <span>iPad</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>

          <Link
            to="/mac"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-subtle text-primary font-medium text-sm transition-colors"
          >
            <div className="flex items-center gap-3">
              <Laptop className="w-5 h-5 text-accent" />
              <span>Mac</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>

          <Link
            to="/watch"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-subtle text-primary font-medium text-sm transition-colors"
          >
            <div className="flex items-center gap-3">
              <Watch className="w-5 h-5 text-accent" />
              <span>Watch</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-xs font-semibold text-secondary">Giao diện Sáng/Tối</span>
            <ThemeToggle id="mobile-theme-toggle" showLabel />
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đại lý Ủy quyền Apple (APR) chính thức</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary font-semibold">
            <PhoneCall className="w-4 h-4 text-accent shrink-0" />
            <span>Tổng đài CSKH: 1900.6868</span>
          </div>
        </div>
      </div>
    </div>
  );
};
