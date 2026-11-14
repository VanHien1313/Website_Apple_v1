import type { ProductService, RequestOptions } from '../contracts';
import type { CatalogFilter, CatalogResult } from '../../domain/catalog';
import type { Product } from '../../types/product';
import { HttpError, request } from './http';

export function catalogParams(filter: CatalogFilter = {}) {
  const params = new URLSearchParams();
  let min = filter.minPrice, max = filter.maxPrice;
  const ranges = { under15: [0, 14999999], '15to25': [15000000, 25000000], '25to35': [25000001, 35000000], above35: [35000001, Number.MAX_SAFE_INTEGER] };
  if (filter.priceRange) {
    const range = ranges[filter.priceRange];
    min = Math.max(min ?? 0, range[0]); max = Math.min(max ?? Number.MAX_SAFE_INTEGER, range[1]);
  }
  const values = { q: filter.searchQuery, category: filter.category, subCategory: filter.subCategory,
    storage: filter.storage, sort: filter.sort, minPrice: min, maxPrice: max,
    page: Math.min(1000000, Math.max(1, filter.page ?? 1)), pageSize: Math.min(100, Math.max(1, filter.pageSize ?? 12)) };
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(key, String(value));
  return params;
}
async function getCatalog(filter: CatalogFilter = {}, options?: RequestOptions): Promise<CatalogResult> {
  const params = catalogParams(filter);
  const result = await request<CatalogResult>(`/products?${params}`, options);
  // Match the UI's clamped-page contract without downloading the whole catalog.
  const last = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (result.page > last) {
    params.set('page', String(last));
    return request<CatalogResult>(`/products?${params}`, options);
  }
  return result;
}
export const apiProductService: ProductService = {
  getCategories: (options) => request('/categories', options),
  getCatalog,
  async getProducts(filter, options) { return (await getCatalog({ ...filter, pageSize: 100 }, options)).items; },
  async getProductBySlug(slug, options) {
    try { return await request<Product>(`/products/by-slug/${encodeURIComponent(slug)}`, options); }
    catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
  },
  async getProductsByCategory(category, options) { return (await getCatalog({ category, pageSize: 100 }, options)).items; },
  async getRelatedProducts(id, category, limit = 4, options) {
    return (await getCatalog({ category, pageSize: Math.min(100, limit + 1) }, options)).items.filter((item) => item.id !== id).slice(0, limit);
  },
  async getFeaturedProducts(limit = 8, options) { return (await getCatalog({ sort: 'price_desc', pageSize: limit }, options)).items; },
};
