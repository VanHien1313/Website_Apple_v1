import { useId } from 'react';
import { PRICE_OPTIONS, type CatalogFilter } from '../../domain/catalog';
import { Radio } from '../common/FormControls';
import { productService } from '../../services/productService';
import { useAsyncResource } from '../../hooks/useAsyncResource';
const loadCategories = (signal: AbortSignal) => productService.getCategories({ signal });
export type FilterState = Pick<CatalogFilter, 'category' | 'subCategory' | 'priceRange' | 'sort'>;
interface Props { subCategories: string[]; filters: FilterState; onChange: (filters: FilterState) => void; onReset: () => void; showCategories?: boolean }
export function FilterSidebar({ subCategories, filters, onChange, onReset, showCategories = false }: Props) {
  const id = useId();
  const { data: categories, error, retry } = useAsyncResource(loadCategories);
  return <div className="space-y-6"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Bộ lọc</h2><button type="button" className="min-h-11 text-xs font-semibold text-accent" onClick={onReset}>Đặt lại</button></div>
    {showCategories && <fieldset><legend className="mb-2 text-sm font-semibold">Danh mục</legend>{error && <button type="button" onClick={retry} className="min-h-11 text-sm text-danger">Tải lại danh mục</button>}{[{ id: '', name: 'Tất cả' }, ...(categories ?? [])].map(({ id: value, name: label }) => <Radio key={value} name={`${id}-category`} label={label} checked={(filters.category ?? '') === value} onChange={() => onChange({ ...filters, category: value || undefined, subCategory: undefined })} />)}</fieldset>}
    <fieldset className="border-t border-border-subtle pt-5"><legend className="text-sm font-semibold">Mức giá</legend><Radio name={`${id}-price`} label="Tất cả mức giá" checked={!filters.priceRange} onChange={() => onChange({ ...filters, priceRange: undefined })} />{PRICE_OPTIONS.map((option) => <Radio key={option.id} name={`${id}-price`} label={option.label} checked={filters.priceRange === option.id} onChange={() => onChange({ ...filters, priceRange: option.id })} />)}</fieldset>
    {subCategories.length > 0 && <fieldset className="border-t border-border-subtle pt-5"><legend className="text-sm font-semibold">Dòng sản phẩm</legend><Radio name={`${id}-series`} label="Tất cả dòng" checked={!filters.subCategory} onChange={() => onChange({ ...filters, subCategory: undefined })} />{subCategories.map((sub) => <Radio key={sub} name={`${id}-series`} label={sub} checked={filters.subCategory === sub} onChange={() => onChange({ ...filters, subCategory: sub })} />)}</fieldset>}
  </div>;
}
