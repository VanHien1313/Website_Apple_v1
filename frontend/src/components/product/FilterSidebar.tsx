import React from 'react';
import { RotateCcw, Check } from 'lucide-react';

export interface FilterState {
  subCategory?: string;
  priceRange?: string; // 'under15' | '15to25' | '25to35' | 'above35'
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'newest';
}

interface FilterSidebarProps {
  subCategories: string[];
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  subCategories,
  filters,
  onChange,
  onReset,
}) => {
  const priceOptions = [
    { id: 'under15', label: 'Dưới 15.000.000₫' },
    { id: '15to25', label: '15.000.000₫ – 25.000.000₫' },
    { id: '25to35', label: '25.000.000₫ – 35.000.000₫' },
    { id: 'above35', label: 'Trên 35.000.000₫' },
  ];

  const hasActiveFilters = Boolean(filters.subCategory || filters.priceRange);

  return (
    <div className="space-y-6">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Bộ lọc sản phẩm</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Thiết lập lại</span>
          </button>
        )}
      </div>

      {/* Subcategory Filter */}
      {subCategories.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider">Dòng sản phẩm</h4>
          <div className="space-y-1">
            {subCategories.map((sub) => {
              const isSelected = filters.subCategory === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      subCategory: isSelected ? undefined : sub,
                    })
                  }
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between group hover:bg-surface-subtle"
                >
                  <span className={isSelected ? 'text-primary font-bold' : 'text-secondary group-hover:text-primary'}>
                    {sub}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary text-white'
                        : 'border-black/20 group-hover:border-black/40'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="space-y-3 pt-2 border-t border-black/[0.04]">
        <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider">Mức giá</h4>
        <div className="space-y-1">
          {priceOptions.map((opt) => {
            const isSelected = filters.priceRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    priceRange: isSelected ? undefined : opt.id,
                  })
                }
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between group hover:bg-surface-subtle"
              >
                <span className={isSelected ? 'text-primary font-bold' : 'text-secondary group-hover:text-primary'}>
                  {opt.label}
                </span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-primary'
                      : 'border-black/20 group-hover:border-black/40'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
