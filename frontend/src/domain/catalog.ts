import type { Product, ProductFilter } from '../types/product';

export type PriceRange = 'under15' | '15to25' | '25to35' | 'above35';
export interface CatalogFilter extends ProductFilter {
  priceRange?: PriceRange;
  page?: number;
  pageSize?: number;
}
export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  categoryTotal: number;
  subCategories: string[];
}
export const PRICE_OPTIONS: { id: PriceRange; label: string }[] = [
  { id: 'under15', label: 'Dưới 15.000.000₫' },
  { id: '15to25', label: '15.000.000₫ – 25.000.000₫' },
  { id: '25to35', label: '25.000.000₫ – 35.000.000₫' },
  { id: 'above35', label: 'Trên 35.000.000₫' },
];
export function filterProducts(products: readonly Product[], filter: CatalogFilter = {}): Product[] {
  const query = filter.searchQuery?.trim().toLocaleLowerCase('vi');
  const result = products.filter((product) => {
    if (filter.category && product.category !== filter.category) return false;
    if (filter.subCategory && product.subCategory?.toLowerCase() !== filter.subCategory.toLowerCase()) return false;
    if (query && !`${product.name} ${product.tagline} ${product.category}`.toLocaleLowerCase('vi').includes(query)) return false;
    if (filter.minPrice !== undefined && product.basePrice < filter.minPrice) return false;
    if (filter.maxPrice !== undefined && product.basePrice > filter.maxPrice) return false;
    if (filter.storage && !product.variants.some((variant) => variant.storage === filter.storage)) return false;
    switch (filter.priceRange) {
      case 'under15': return product.basePrice < 15_000_000;
      case '15to25': return product.basePrice >= 15_000_000 && product.basePrice <= 25_000_000;
      case '25to35': return product.basePrice > 25_000_000 && product.basePrice <= 35_000_000;
      case 'above35': return product.basePrice > 35_000_000;
      default: return true;
    }
  });
  switch (filter.sort ?? 'price_desc') {
    case 'price_asc': result.sort((a, b) => a.basePrice - b.basePrice); break;
    case 'price_desc': result.sort((a, b) => b.basePrice - a.basePrice); break;
    case 'newest': result.sort((a, b) => Number(b.badge === 'Mới') - Number(a.badge === 'Mới')); break;
  }
  return result;
}
export function queryCatalog(products: readonly Product[], filter: CatalogFilter = {}): CatalogResult {
  const categoryProducts = filterProducts(products, { category: filter.category });
  const matches = filterProducts(categoryProducts, filter);
  const pageSize = Number.isInteger(filter.pageSize) ? Math.min(100, Math.max(1, filter.pageSize!)) : 12;
  const maxPage = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Number.isInteger(filter.page) ? Math.min(maxPage, Math.max(1, filter.page!)) : 1;
  return {
    items: matches.slice((page - 1) * pageSize, page * pageSize),
    total: matches.length, page, pageSize,
    categoryTotal: categoryProducts.length,
    subCategories: [...new Set(categoryProducts.flatMap((product) => product.subCategory ? [product.subCategory] : []))],
  };
}
export function parseCatalogParams(params: URLSearchParams): CatalogFilter {
  const sort = params.get('sort');
  const range = params.get('priceRange');
  const page = Number(params.get('page'));
  const category = params.get('category');
  return {
    category: category && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category) ? category : undefined,
    searchQuery: params.get('q')?.trim() || undefined,
    subCategory: params.get('subCategory') || undefined,
    priceRange: PRICE_OPTIONS.find((option) => option.id === range)?.id,
    sort: sort === 'price_asc' || sort === 'price_desc' || sort === 'newest' || sort === 'featured' ? sort : 'price_desc',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
