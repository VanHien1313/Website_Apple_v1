import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { FilterSidebar, FilterState } from './FilterSidebar';
import { Button } from '../common/Button';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subCategories: string[];
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalResults: number;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  subCategories,
  filters,
  onChange,
  onReset,
  totalResults,
}) => {
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white dark:bg-[#161618] border-l border-border-subtle shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <span className="font-bold text-sm text-primary">Bộ lọc tìm kiếm</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-secondary hover:bg-surface-subtle"
            aria-label="Đóng bộ lọc"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <FilterSidebar
            subCategories={subCategories}
            filters={filters}
            onChange={onChange}
            onReset={onReset}
          />
        </div>

        <div className="p-4 border-t border-border-subtle bg-surface-subtle">
          <Button fullWidth onClick={onClose}>
            Xem {totalResults} sản phẩm
          </Button>
        </div>
      </div>
    </div>
  );
};
