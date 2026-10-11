import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { ProductCategory, Product } from '../types/product';
import { productService } from '../services/productService';
import { ProductGrid } from '../components/product/ProductGrid';
import { FilterSidebar, FilterState } from '../components/product/FilterSidebar';
import { FilterDrawer } from '../components/product/FilterDrawer';
import { Button } from '../components/common/Button';

interface CategoryPageProps {
  category: ProductCategory;
  title: string;
  description: string;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({
  category,
  title,
  description,
}) => {
  const location = useLocation();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [, setLoading] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    sort: 'featured',
  });

  // Extract query params (e.g. from search bar ?q=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      // If search query is present, we filter by searchQuery
    }
  }, [location.search]);

  // Load products when category changes
  useEffect(() => {
    async function loadCategoryProducts() {
      setLoading(true);
      try {
        const list = await productService.getProductsByCategory(category);
        setAllProducts(list);
      } finally {
        setLoading(false);
      }
    }
    loadCategoryProducts();
    // Reset filters on category switch
    setFilters({ sort: 'featured' });
  }, [category]);

  // Unique subcategories for this category
  const subCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProducts) {
      if (p.subCategory) set.add(p.subCategory);
    }
    return Array.from(set);
  }, [allProducts]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Subcategory filter
    if (filters.subCategory) {
      result = result.filter(
        (p) => p.subCategory?.toLowerCase() === filters.subCategory?.toLowerCase()
      );
    }

    // Price bracket filter
    if (filters.priceRange) {
      switch (filters.priceRange) {
        case 'under15':
          result = result.filter((p) => p.basePrice < 15000000);
          break;
        case '15to25':
          result = result.filter((p) => p.basePrice >= 15000000 && p.basePrice <= 25000000);
          break;
        case '25to35':
          result = result.filter((p) => p.basePrice > 25000000 && p.basePrice <= 35000000);
          break;
        case 'above35':
          result = result.filter((p) => p.basePrice > 35000000);
          break;
      }
    }

    // Sorting
    switch (filters.sort) {
      case 'price_asc':
        result.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price_desc':
        result.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'newest':
        result.sort((a, b) => (b.badge === 'Mới' ? 1 : 0) - (a.badge === 'Mới' ? 1 : 0));
        break;
      case 'featured':
      default:
        break;
    }

    return result;
  }, [allProducts, filters]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Category Header with TopZone-style Sub-series Quick Pills */}
      <div className="mb-8 pb-6 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl font-bold text-primary"></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
            Apple Authorised Store
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-secondary mt-1.5 max-w-2xl">
          {description}
        </p>

        {/* Quick Series Quick Links */}
        {subCategories.length > 0 && (
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, subCategory: undefined }))}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !filters.subCategory
                  ? 'bg-primary text-background shadow-2xs'
                  : 'bg-surface-subtle text-secondary hover:text-primary hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              Tất cả ({allProducts.length})
            </button>
            {subCategories.map((sub) => {
              const isActive = filters.subCategory?.toLowerCase() === sub.toLowerCase();
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, subCategory: sub }))}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-background shadow-2xs'
                      : 'bg-surface-subtle text-secondary hover:text-primary hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Control Bar: Filter toggle on mobile + Sorting dropdown */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Mobile Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFilterDrawerOpen(true)}
          className="lg:hidden flex items-center gap-2"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Bộ lọc</span>
          {(filters.subCategory || filters.priceRange) && (
            <span className="w-2 h-2 rounded-full bg-accent" />
          )}
        </Button>

        <div className="text-xs text-secondary hidden sm:block">
          Hiển thị <strong className="text-primary font-semibold">{filteredProducts.length}</strong> sản phẩm
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-secondary hidden md:inline">Sắp xếp theo:</span>
          <select
            value={filters.sort || 'featured'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                sort: e.target.value as FilterState['sort'],
              }))
            }
            className="text-xs font-semibold text-primary bg-surface-subtle hover:bg-gray-100 dark:hover:bg-white/10 dark:bg-[#161618] border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:border-accent cursor-pointer transition-colors"
          >
            <option value="featured">Nổi bật nhất</option>
            <option value="price_asc">Giá: Thấp đến Cao</option>
            <option value="price_desc">Giá: Cao đến Thấp</option>
            <option value="newest">Mới ra mắt</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {(filters.subCategory || filters.priceRange) && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-2.5 rounded-xl bg-surface-subtle border border-border-subtle">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider pl-1">
            Đang lọc:
          </span>

          {filters.subCategory && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, subCategory: undefined }))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#161618] border border-border-subtle text-xs font-medium text-primary hover:border-border-hover hover:bg-gray-50 dark:hover:bg-[#1c1c1e] transition-all shadow-2xs"
            >
              <span>Dòng: {filters.subCategory}</span>
              <X className="w-3 h-3 text-secondary" />
            </button>
          )}

          {filters.priceRange && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, priceRange: undefined }))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#161618] border border-border-subtle text-xs font-medium text-primary hover:border-border-hover hover:bg-gray-50 dark:hover:bg-[#1c1c1e] transition-all shadow-2xs"
            >
              <span>
                {filters.priceRange === 'under15' && 'Dưới 15 triệu'}
                {filters.priceRange === '15to25' && '15 - 25 triệu'}
                {filters.priceRange === '25to35' && '25 - 35 triệu'}
                {filters.priceRange === 'above35' && 'Trên 35 triệu'}
              </span>
              <X className="w-3 h-3 text-secondary" />
            </button>
          )}

          <button
            onClick={() => setFilters({ sort: filters.sort || 'featured' })}
            className="text-xs text-secondary hover:text-primary underline ml-auto pr-1"
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {/* Main Grid + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar (1 Column) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 bg-white dark:bg-[#161618] rounded-xl border border-border-subtle p-5">
            <FilterSidebar
              subCategories={subCategories}
              filters={filters}
              onChange={(newFilters) => setFilters(newFilters)}
              onReset={() => setFilters({ sort: 'featured' })}
            />
          </div>
        </div>

        {/* Product Grid Area (3 Columns) */}
        <div className="lg:col-span-3">
          <ProductGrid products={filteredProducts} />
        </div>
      </div>

      {/* Mobile/Tablet Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        subCategories={subCategories}
        filters={filters}
        onChange={(newFilters) => setFilters(newFilters)}
        onReset={() => setFilters({ sort: 'featured' })}
        totalResults={filteredProducts.length}
      />
    </div>
  );
};
