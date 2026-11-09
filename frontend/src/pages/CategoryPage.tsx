import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import type { ProductCategory } from '../types/product';
import { productService } from '../services/productService';
import { ProductGrid } from '../components/product/ProductGrid';
import { FilterSidebar, type FilterState } from '../components/product/FilterSidebar';
import { parseCatalogParams, PRICE_OPTIONS, type CatalogFilter } from '../domain/catalog';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { Drawer } from '../components/common/Overlay';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/FormControls';
import { Pagination } from '../components/common/Pagination';
interface Props { category?: ProductCategory; title: string; description: string }
export function CategoryPage({ category, title, description }: Props) {
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const queryString = params.toString();
  const filters = parseCatalogParams(params);
  const load = useCallback((signal: AbortSignal) => {
    const query = parseCatalogParams(new URLSearchParams(queryString));
    return productService.getCatalog({ ...query, category: category ?? query.category, pageSize: 6 }, { signal });
  }, [category, queryString]);
  const { data, loading, error, retry } = useAsyncResource(load);
  useEffect(() => {
    if (data && !loading && Number(params.get('page') || 1) !== data.page) {
      setParams((previous) => { const next = new URLSearchParams(previous); next.set('page', String(data.page)); return next; }, { replace: true });
    }
  }, [data, loading, params, setParams]);
  function setFilters(next: FilterState) {
    setParams((previous) => {
      const result = new URLSearchParams(previous);
      for (const key of ['category', 'subCategory', 'priceRange', 'sort'] as const) {
        if (next[key]) result.set(key, next[key]); else result.delete(key);
      }
      result.delete('page');
      return result;
    });
  }
  const reset = () => setFilters({ sort: filters.sort });
  const sidebar = { subCategories: data?.subCategories ?? [], filters, onChange: setFilters, onReset: reset, showCategories: !category };
  const active = [!category && filters.category, filters.subCategory, PRICE_OPTIONS.find((option) => option.id === filters.priceRange)?.label].filter(Boolean);
  return <div className="ui-container py-10 sm:py-14"><div className="border-b border-border-subtle pb-8"><p className="mb-3 text-sm text-accent">Bộ sưu tập Aura</p><h1 className="ui-page-title">{title}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">{description}</p>{filters.searchQuery && <p className="mt-4 text-sm">Kết quả cho <strong>“{filters.searchQuery}”</strong></p>}</div>
    <div className="my-6 flex flex-wrap items-end justify-between gap-4"><div className="flex items-center gap-4"><Button variant="outline" className="lg:hidden" onClick={() => setDrawer(true)} icon={<SlidersHorizontal size={17} />}>Bộ lọc</Button><p className="text-sm text-secondary" role="status">{loading ? 'Đang tìm…' : `${data?.total ?? 0} sản phẩm`}</p></div><div className="w-48"><Select label="Sắp xếp" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as CatalogFilter['sort'] })}><option value="featured">Đề xuất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="newest">Mới nhất</option></Select></div></div>
    {active.length > 0 && <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg bg-surface-subtle p-3"><p className="text-xs text-secondary">Đang lọc: {active.join(' · ')}</p><button type="button" className="min-h-9 text-xs font-semibold text-accent" onClick={reset}>Xóa bộ lọc</button></div>}
    <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="ui-panel hidden p-5 lg:block"><FilterSidebar {...sidebar} /></aside><section aria-label="Danh sách sản phẩm" className="min-w-0">{loading || error ? <AsyncState error={error} onRetry={retry} /> : <><ProductGrid products={data?.items ?? []} />{data?.total === 0 && <div className="text-center"><Button variant="outline" onClick={() => setParams({})}>Xem lại toàn bộ danh mục</Button></div>}{data && <div className="mt-8"><Pagination label="Phân trang sản phẩm" page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('page', String(page)); return next; })} /></div>}</>}</section></div>
    <Drawer open={drawer} onClose={() => setDrawer(false)} title="Bộ lọc tìm kiếm" footer={<Button fullWidth onClick={() => setDrawer(false)}>Xem {data?.total ?? 0} sản phẩm</Button>}><FilterSidebar {...sidebar} /></Drawer>
  </div>;
}
