import { catalogRepository } from './catalogRepository';
import { filterProducts, queryCatalog } from '../../domain/catalog';
import type { ProductService } from '../contracts';

// Only adapters know the data source. Production adapters implement this same contract.
export const mockProductService: ProductService = {
  async getCategories() { return catalogRepository.read().categories; },
  async getProducts(filter, options) {
    options?.signal?.throwIfAborted();
    return filterProducts(catalogRepository.read().products, filter);
  },
  async getCatalog(filter, options) {
    options?.signal?.throwIfAborted();
    return queryCatalog(catalogRepository.read().products, filter);
  },
  async getProductBySlug(slug, options) {
    options?.signal?.throwIfAborted();
    return catalogRepository.read().products.find((product) => product.slug === slug) ?? null;
  },
  async getProductsByCategory(category, options) {
    return mockProductService.getProducts({ category }, options);
  },
  async getRelatedProducts(id, category, limit = 4, options) {
    const products = await mockProductService.getProducts({ category }, options);
    return products.filter((product) => product.id !== id).slice(0, limit);
  },
  async getFeaturedProducts(limit = 4, options) {
    options?.signal?.throwIfAborted();
    return filterProducts(catalogRepository.read().products).slice(0, limit);
  },
};
